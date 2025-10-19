import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import {
  FaPaperPlane, FaImage, FaFile, FaSmile, FaPhone, FaVideo,
  FaEllipsisV, FaSearch, FaFilter, FaDownload, FaTrash,
  FaCheck, FaCheckDouble, FaClock, FaUser, FaCalendarAlt,
  FaMapMarkerAlt, FaBed, FaMoneyBillWave, FaStar, FaComments, FaTimes, FaReply, FaLink
} from 'react-icons/fa';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function Messages() {
  const [searchParams] = useSearchParams();
  const { socket } = useSocket();
  const { user } = useAuth();
  const prefillTo = searchParams.get('to') || '';
  const prefillBookingId = searchParams.get('booking') || '';

  const [threads, setThreads] = useState([]);
  const [activeThread, setActiveThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showFilePicker, setShowFilePicker] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [replyTarget, setReplyTarget] = useState(null); // { id, senderName, text }
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const MAX_MESSAGE_LEN = 2000;

  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Placeholder avatar if backend doesn't return one
  const placeholderAvatar = 'https://ui-avatars.com/api/?name=A&background=0D8ABC&color=fff&size=64';

  useEffect(() => {
    loadThreads();
  }, []);

  useEffect(() => {
    if (activeThread) {
      loadMessages(activeThread.id);
    }
  }, [activeThread]);

  useEffect(() => {
    if (!socket) return;
    socket.on('message:new', handleNewMessage);
    socket.on('typing', handleTyping);
    socket.on('message:read', handleMessageRead);
    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('typing', handleTyping);
      socket.off('message:read', handleMessageRead);
    };
  }, [socket, activeThread]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadThreads = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/messages/threads`, { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to load threads');
      const mapped = (data.threads || []).map((t) => ({
        id: t.userId,
        userId: t.userId,
        userName: t.name || 'User',
        userAvatar: placeholderAvatar,
        lastMessage: t.lastMessage?.text || '',
        lastMessageTime: t.lastMessage?.createdAt || null,
        unreadCount: t.unreadCount || 0,
        booking: t.context?.bookingId ? { id: t.context.bookingId, propertyName: 'Booking', status: '' } : null,
        context: t.context || {}
      }));
      setThreads(mapped);
      // Preselect thread via query: by userId or bookingId
      let preset = null;
      if (prefillTo) preset = mapped.find(x => String(x.userId) === String(prefillTo)) || null;
      if (!preset && prefillBookingId) preset = mapped.find(x => x.context?.bookingId && String(x.context.bookingId) === String(prefillBookingId)) || null;
      if (preset) setActiveThread(preset);
    } catch (error) {
      toast.error('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (threadId) => {
    try {
      const thread = threads.find(t => t.id === threadId);
      const params = new URLSearchParams({ userId: thread.userId });
      if (thread?.context?.bookingId) params.set('bookingId', thread.context.bookingId);
      const res = await fetch(`${API_URL}/api/messages/history?${params.toString()}`, { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to load messages');
      const mapped = (data.messages || []).map(m => {
        const replied = m.replyTo ? {
          id: String(m.replyTo._id || m.replyTo),
          senderName: m.replyTo.sender ? `${m.replyTo.sender.firstName || ''} ${m.replyTo.sender.lastName || ''}`.trim() : 'User',
          text: m.replyTo.message
        } : null;
        return {
        id: String(m._id || m.id || Math.random()),
        senderId: String(m.sender || m.senderId),
        senderName: m.senderName || (String(m.sender) === String(user?._id) ? (user?.name || 'You') : thread.userName),
        content: m.message || m.text || '',
        attachments: m.attachments || [],
        timestamp: m.createdAt,
        type: (m.attachments && m.attachments.length) ? 'file' : 'text',
        status: m.isRead ? 'read' : 'delivered',
        reply: replied
      };
      });
      setMessages(mapped);
      // Join booking room for typing/real-time if applicable
      if (socket && thread?.context?.bookingId) {
        socket.emit('join_booking', { bookingId: thread.context.bookingId });
        // Mark as read
        try { await fetch(`${API_URL}/api/messages/booking/${thread.context.bookingId}/read`, { method: 'PATCH', credentials: 'include' }); } catch (_) {}
      }
      
      // Mark all messages from this user as read
      try {
        await fetch(`${API_URL}/api/messages/mark-read`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ senderId: thread.userId })
        });
      } catch (_) {}
      
      // Update thread unread count locally
      setThreads(prev => prev.map(t => 
        t.id === threadId ? { ...t, unreadCount: 0 } : t
      ));
    } catch (error) {
      toast.error('Failed to load messages');
    }
  };

  const handleNewMessage = (payload) => {
    // Handle both generic payload from /send and booking payload from /messages booking route
    const thread = activeThread;
    const myId = String(user?._id || user?.id || '');
    
    // Case 1: booking payload: { bookingId, message: {...} }
    if (payload && payload.message && payload.bookingId) {
      const m = payload.message;
      // Ignore own echoes
      if (String(m.sender) === myId) return;
      
      if (thread && thread.context?.bookingId && String(thread.context.bookingId) === String(payload.bookingId)) {
        // Resolve reply reference from existing messages if available
        const ref = payload.replyTo ? messages.find(x => String(x.id) === String(payload.replyTo)) : null;
        // Dedupe by server id if exists
        if (m._id && messages.some(x => String(x.id) === String(m._id))) return;
        setMessages(prev => [...prev, {
          id: String(m._id || Math.random()),
          senderId: String(m.sender),
          senderName: String(m.sender) === String(user?._id) ? (user?.name || 'You') : thread.userName,
          content: m.message,
          attachments: m.attachments || [],
          timestamp: m.createdAt,
          type: (m.attachments && m.attachments.length) ? 'file' : 'text',
          status: 'delivered',
          reply: ref ? { id: ref.id, senderName: ref.senderName, text: ref.content } : null
        }]);
      } else {
        // Update unread count for threads not currently active
        setThreads(prev => prev.map(t => 
          t.context?.bookingId && String(t.context.bookingId) === String(payload.bookingId) && String(m.sender) !== myId
            ? { ...t, unreadCount: (t.unreadCount || 0) + 1, lastMessage: m.message, lastMessageTime: m.createdAt }
            : t
        ));
      }
      return;
    }
    
    // Case 2: flattened payload from /send
    if (payload && payload.from && payload.to) {
      const senderId = String(payload.from);
      const isMine = senderId === myId;
      const isForMe = String(payload.to) === myId;
      
      if (!isMine && !isForMe) return; // Not relevant to current user
      
      if (thread && (String(thread.userId) === senderId || String(thread.userId) === String(payload.to))) {
        // If this flattened payload is also scoped to the same booking as the active thread,
        // skip it because the booking-room handler above already handled it.
        if (thread.context?.bookingId && payload.bookingId && String(payload.bookingId) === String(thread.context.bookingId)) {
          return;
        }
        // Ignore own echoes
        if (isMine) return;
        
        const ref = payload.replyTo ? messages.find(x => String(x.id) === String(payload.replyTo)) : null;
        setMessages(prev => [...prev, {
          id: String(Math.random()),
          senderId: senderId,
          senderName: isMine ? (user?.name || 'You') : thread.userName,
          content: payload.text || '',
          attachments: payload.attachments || [],
          timestamp: payload.createdAt,
          type: (payload.attachments && payload.attachments.length) ? 'file' : 'text',
          status: 'delivered',
          reply: ref ? { id: ref.id, senderName: ref.senderName, text: ref.content } : null
        }]);
      } else if (!isMine && isForMe) {
        // Update unread count for threads not currently active
        setThreads(prev => prev.map(t => 
          String(t.userId) === senderId
            ? { ...t, unreadCount: (t.unreadCount || 0) + 1, lastMessage: payload.text || '', lastMessageTime: payload.createdAt }
            : t
        ));
      }
    }
  };

  const handleTyping = (data) => {
    const thread = activeThread;
    if (!thread) return;
    // Server emits { bookingId, userId, typing }
    if (thread.context?.bookingId && String(data.bookingId) === String(thread.context.bookingId) && String(data.userId) !== String(user?._id)) {
      setOtherTyping(!!data.typing);
    }
  };

  const handleMessageRead = (data) => {
    const thread = activeThread;
    if (!thread) return;
    // Server sends { bookingId, userId } when that user has read messages in the booking
    if (thread.context?.bookingId && String(data.bookingId) === String(thread.context.bookingId)) {
      setMessages(prev => prev.map(m => (
        // Mark messages SENT BY the notified user as read on our side
        String(m.senderId) === String(data.userId) ? { ...m, status: 'read' } : m
      )));
    }
  };

  const sendMessage = async () => {
    if (!activeThread) return;
    if (!newMessage.trim() && attachments.length === 0) return;

    // Optimistic render
    const tempId = String(Date.now());
    const optimistic = {
      id: tempId,
      senderId: String(user?._id || user?.id || ''),
      senderName: user?.name || 'You',
      content: newMessage,
      attachments: attachments,
      timestamp: new Date().toISOString(),
      type: attachments.length > 0 ? 'file' : 'text',
      status: 'sending',
      reply: replyTarget ? { id: replyTarget.id, senderName: replyTarget.senderName, text: replyTarget.text } : null
    };
    setMessages(prev => [...prev, optimistic]);

    try {
      // Upload attachments first if any
      let uploaded = [];
      if (attachments.length) {
        const form = new FormData();
        attachments.forEach(a => form.append('files', a.file));
        const up = await fetch(`${API_URL}/api/messages/upload`, { method: 'POST', credentials: 'include', body: form });
        const upJson = await up.json();
        if (!up.ok) throw new Error(upJson.message || 'Upload failed');
        uploaded = upJson.attachments || [];
      }

      const payload = {
        to: activeThread.userId,
        text: newMessage,
        bookingId: activeThread?.context?.bookingId,
        attachments: uploaded,
        replyTo: replyTarget?.id
      };
      const res = await fetch(`${API_URL}/api/messages/send`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Send failed');
      // Replace optimistic with server message
      setMessages(prev => prev.map(m => m.id === tempId ? {
        id: String(data.message._id),
        senderId: String(data.message.sender),
        senderName: user?.name || 'You',
        content: data.message.message,
        attachments: data.message.attachments || [],
        timestamp: data.message.createdAt,
        type: (data.message.attachments && data.message.attachments.length) ? 'file' : 'text',
        status: 'delivered',
        reply: optimistic.reply || null
      } : m));
    } catch (error) {
      toast.error(error.message || 'Failed to send message');
      setMessages(prev => prev.filter(m => m.id !== tempId));
    } finally {
      setNewMessage('');
      setAttachments([]);
      setReplyTarget(null);
    }
  };

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    const newAttachments = files.map(file => ({
      id: Date.now() + Math.random(),
      name: file.name,
      size: file.size,
      type: file.type,
      file: file,
      url: URL.createObjectURL(file)
    }));
    setAttachments(prev => [...prev, ...newAttachments]);
  };

  const handleImageSelect = (event) => {
    const files = Array.from(event.target.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    const newAttachments = imageFiles.map(file => ({
      id: Date.now() + Math.random(),
      name: file.name,
      size: file.size,
      type: file.type,
      file: file,
      url: URL.createObjectURL(file),
      isImage: true
    }));
    setAttachments(prev => [...prev, ...newAttachments]);
  };

  const removeAttachment = (attachmentId) => {
    setAttachments(prev => prev.filter(att => att.id !== attachmentId));
  };

  const handleTypingStart = () => {
    if (!isTyping) {
      setIsTyping(true);
      if (socket && activeThread?.context?.bookingId) {
        socket.emit('typing', { bookingId: activeThread.context.bookingId, typing: true });
      }
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      handleTypingStop();
    }, 3000);
  };

  const handleTypingStop = () => {
    setIsTyping(false);
    if (socket && activeThread?.context?.bookingId) {
      socket.emit('typing', { bookingId: activeThread.context.bookingId, typing: false });
    }
  };

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  // User search functionality
  const searchUsers = async (searchTerm) => {
    if (!searchTerm || searchTerm.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/user/search?q=${encodeURIComponent(searchTerm)}`, {
        credentials: 'include'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to search users');
      setSearchResults(data.users || []);
    } catch (error) {
      toast.error('Failed to search users');
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const startConversationWithUser = async (selectedUser) => {
    try {
      // Check if conversation already exists
      const existingThread = threads.find(t => String(t.userId) === String(selectedUser.id));
      
      if (existingThread) {
        // Switch to existing conversation
        setActiveThread(existingThread);
        setShowUserSearch(false);
        setUserSearchTerm('');
        setSearchResults([]);
        toast.success(`Switched to conversation with ${selectedUser.name}`);
        return;
      }

      // Create new thread locally
      const newThread = {
        id: selectedUser.id,
        userId: selectedUser.id,
        userName: selectedUser.name,
        userAvatar: selectedUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedUser.name)}&background=0D8ABC&color=fff&size=64`,
        lastMessage: '',
        lastMessageTime: null,
        unreadCount: 0,
        booking: null,
        context: {}
      };

      // Add to threads and set as active
      setThreads(prev => [newThread, ...prev]);
      setActiveThread(newThread);
      setMessages([]);
      
      // Close search modal
      setShowUserSearch(false);
      setUserSearchTerm('');
      setSearchResults([]);
      
      toast.success(`Started conversation with ${selectedUser.name}`);
    } catch (error) {
      toast.error('Failed to start conversation');
    }
  };

  // Debounced user search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (userSearchTerm) {
        searchUsers(userSearchTerm);
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [userSearchTerm]);

  const renderMessage = (message) => {
    const myId = String(user?._id || user?.id || '');
    const isOwn = String(message.senderId) === myId;
    
    return (
      <div key={message.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4`}>
        <div className={`max-w-xs lg:max-w-md ${isOwn ? 'order-2' : 'order-1'}`}>
          {!isOwn && (
            <div className="flex items-center mb-1">
              <img
                src={activeThread.userAvatar}
                alt={message.senderName}
                className="w-6 h-6 rounded-full mr-2"
              />
              <span className="text-sm font-medium text-gray-700">{message.senderName}</span>
            </div>
          )}
          {message.reply && (
            <div className={`mb-1 text-xs border-l-4 pl-2 ${isOwn ? 'border-blue-300' : 'border-gray-300'} text-gray-600`}>
              <div className="font-medium">Replying to {message.reply.senderName}</div>
              <div className="truncate max-w-[240px]">{message.reply.text}</div>
            </div>
          )}
          <div className={`rounded-2xl px-4 py-2 ${
            isOwn 
              ? 'bg-blue-600 text-white' 
              : 'bg-white text-gray-800 border border-gray-200'
          }`}>
            {message.type === 'file' && message.attachments ? (
              <div className="space-y-2">
                {message.attachments.map(attachment => (
                  <div key={attachment.id} className="flex items-center space-x-2">
                    {attachment.isImage ? (
                      <img
                        src={attachment.url}
                        alt={attachment.name}
                        className="w-32 h-32 object-cover rounded-lg"
                      />
                    ) : (
                      <div className="flex items-center space-x-2 p-2 bg-gray-100 rounded-lg">
                        <FaFile className="text-gray-600" />
                        <span className="text-sm">{attachment.name}</span>
                      </div>
                    )}
                  </div>
                ))}
                {message.content && <p className="mt-2">{message.content}</p>}
              </div>
            ) : (
              <p>{message.content}</p>
            )}
          </div>
          
          <div className={`flex items-center mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
            <span className="text-xs text-gray-500">{formatTime(message.timestamp)}</span>
            {isOwn && (
              <div className="ml-2">
                {message.status === 'sending' && <FaClock className="text-gray-400 text-xs" />}
                {message.status === 'delivered' && <FaCheck className="text-gray-400 text-xs" />}
                {message.status === 'read' && <FaCheckDouble className="text-blue-500 text-xs" />}
              </div>
            )}
          </div>
          <div className={`mt-1 ${isOwn ? 'text-right' : 'text-left'}`}>
            <button
              className="text-xs text-gray-500 hover:text-blue-600 inline-flex items-center gap-1"
              onClick={() => setReplyTarget({ id: message.id, senderName: message.senderName, text: message.content })}
            >
              <FaReply /> Reply
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderThread = (thread) => {
    const preview = String(thread.lastMessage || '').slice(0, 60);
    return (
      <div
        key={thread.id}
        onClick={() => setActiveThread(thread)}
        className={`p-3 md:p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors ${
          activeThread?.id === thread.id ? 'bg-blue-50 border-blue-200' : ''
        }`}
      >
        <div className="flex items-center space-x-3">
          <div className="relative">
            <img
              src={thread.userAvatar}
              alt={thread.userName}
              className="w-10 h-10 md:w-12 md:h-12 rounded-full object-cover"
            />
            {thread.unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {thread.unreadCount}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-900 truncate">
                {thread.userName}
              </h3>
              <span className="text-xs text-gray-500">
                {formatTime(thread.lastMessageTime)}
              </span>
            </div>
            <p className="text-sm text-gray-600 truncate">
              {preview}{thread.lastMessage && thread.lastMessage.length > 60 ? '…' : ''}
            </p>
            {thread.booking && (
              <div className="flex items-center space-x-2 mt-1">
                <span className="text-xs text-blue-600 font-medium">
                  {thread.booking.propertyName}
                </span>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  thread.booking.status === 'paid' ? 'bg-green-100 text-green-800' :
                  thread.booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {thread.booking.status}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Threads Sidebar */}
        <div className="lg:col-span-1 modern-card-elevated p-6 flex flex-col h-[60vh] md:h-[70vh] lg:h-[78vh]">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-gray-900 mb-1">AKWANDA Chat</h2>
            <p className="text-sm text-gray-500 mb-3 animate-pulse">Fast, simple and reliable messaging</p>
            <div className="relative">
              <FaSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="modern-input w-full h-10 pl-10 pr-3"
              />
            </div>
            <button
              onClick={() => setShowUserSearch(true)}
              className="mt-3 w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <FaUser />
              <span>New Conversation</span>
            </button>
          </div>
          
          <div className="space-y-1 overflow-y-auto flex-1">
            {threads
              .filter(thread => {
                const name = (thread.userName || '').toLowerCase();
                const last = (thread.lastMessage || '').toLowerCase();
                const q = (searchTerm || '').toLowerCase();
                return name.includes(q) || last.includes(q);
              })
              .map(renderThread)}
          </div>
        </div>

        {/* Chat Area */}
        <div className="lg:col-span-3 modern-card-elevated flex flex-col h-[60vh] md:h-[70vh] lg:h-[78vh]">
          {activeThread ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <img
                      src={activeThread.userAvatar}
                      alt={activeThread.userName}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div>
                      <h3 className="font-semibold text-gray-900">{activeThread.userName}</h3>
                      {activeThread.booking && (
                        <p className="text-sm text-gray-600">{activeThread.booking.propertyName}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button className="p-2 text-gray-600 hover:text-blue-600 hover:bg-gray-100 rounded-lg" title="Voice call (coming soon)">
                      <FaPhone />
                    </button>
                    <button className="p-2 text-gray-600 hover:text-blue-600 hover:bg-gray-100 rounded-lg" title="Video call (coming soon)">
                      <FaVideo />
                    </button>
                    <button className="p-2 text-gray-600 hover:text-blue-600 hover:bg-gray-100 rounded-lg">
                      <FaEllipsisV />
                    </button>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 p-4 overflow-y-auto">
                {messages.map(renderMessage)}
                {otherTyping && (
                  <div className="flex justify-start mb-4">
                    <div className="bg-white border border-gray-200 rounded-2xl px-4 py-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Attachments Preview */}
              {attachments.length > 0 && (
                <div className="p-4 border-t border-gray-200">
                  <div className="flex flex-wrap gap-2">
                    {attachments.map(attachment => (
                      <div key={attachment.id} className="relative">
                        {attachment.isImage ? (
                          <img
                            src={attachment.url}
                            alt={attachment.name}
                            className="w-16 h-16 object-cover rounded-lg"
                          />
                        ) : (
                          <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                            <FaFile className="text-gray-600" />
                          </div>
                        )}
                        <button
                          onClick={() => removeAttachment(attachment.id)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                        >
                          <FaTimes />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Reply banner */}
              {replyTarget && (
                <div className="px-4 py-2 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
                  <div className="text-sm">
                    <span className="font-medium">Replying to {replyTarget.senderName}:</span>
                    <span className="ml-2 text-gray-600 truncate inline-block max-w-[60vw]">{replyTarget.text}</span>
                  </div>
                  <button className="text-gray-500 hover:text-gray-700" onClick={() => setReplyTarget(null)}>
                    <FaTimes />
                  </button>
                </div>
              )}

              {/* Message Input */}
              <div className="p-4 border-t border-gray-200 relative">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => imageInputRef.current?.click()}
                    className="p-2 text-gray-600 hover:text-blue-600 hover:bg-gray-100 rounded-lg"
                  >
                    <FaImage />
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 text-gray-600 hover:text-blue-600 hover:bg-gray-100 rounded-lg"
                  >
                    <FaFile />
                  </button>
                  <button
                    onClick={() => setShowEmojiPicker(v => !v)}
                    className="p-2 text-gray-600 hover:text-blue-600 hover:bg-gray-100 rounded-lg"
                    title="Emoji"
                  >
                    <FaSmile />
                  </button>
                  <button
                    onClick={() => setNewMessage(prev => prev + (prev && !prev.endsWith(' ') ? ' 🔗' : '🔗'))}
                    className="hidden md:inline p-2 text-gray-600 hover:text-blue-600 hover:bg-gray-100 rounded-lg"
                    title="Quick action"
                  >
                    <FaLink />
                  </button>
                  <div className="flex-1">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => {
                        const val = e.target.value.slice(0, MAX_MESSAGE_LEN);
                        setNewMessage(val);
                        handleTypingStart();
                      }}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                      placeholder="Type a message..."
                      className="modern-input w-full"
                    />
                  </div>
                  <button
                    onClick={sendMessage}
                    disabled={(!newMessage.trim() && attachments.length === 0) || newMessage.length > MAX_MESSAGE_LEN}
                    className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FaPaperPlane />
                  </button>
                </div>
                {/* Emoji Picker Popover */}
                {showEmojiPicker && (
                  <div className="absolute bottom-16 left-4 bg-white border border-gray-200 rounded-xl p-2 shadow-lg grid grid-cols-8 gap-1 z-10">
                    {['😀','😁','😂','🤣','😊','😍','😘','🤩','👍','🙏','🔥','🎉','🏡','🛏️','🛁','📅','📍','💬','✨','💯','📎','📷'].map((em)=> (
                      <button key={em} className="p-1 hover:bg-gray-100 rounded" onClick={() => setNewMessage(s => (s || '') + em)}>{em}</button>
                    ))}
                  </div>
                )}
                {/* Length Counter */}
                <div className={`mt-1 text-right text-xs ${newMessage.length > MAX_MESSAGE_LEN - 200 ? 'text-orange-500' : 'text-gray-400'} ${newMessage.length >= MAX_MESSAGE_LEN ? 'text-red-500' : ''}`}>
                  {newMessage.length}/{MAX_MESSAGE_LEN}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <FaComments className="text-6xl text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">Select a conversation</h3>
                <p className="text-gray-500">Choose a conversation from the sidebar to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* User Search Modal */}
      {showUserSearch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Start New Conversation</h2>
              <button
                onClick={() => {
                  setShowUserSearch(false);
                  setUserSearchTerm('');
                  setSearchResults([]);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <FaTimes />
              </button>
            </div>
            
            <div className="mb-4">
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search users by name or email..."
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto">
              {searchLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : searchResults.length > 0 ? (
                <div className="space-y-2">
                  {searchResults.map((user) => (
                    <div
                      key={user.id}
                      onClick={() => startConversationWithUser(user)}
                      className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                    >
                      <img
                        src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=0D8ABC&color=fff&size=64`}
                        alt={user.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{user.name}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                        <div className="text-xs text-blue-600 capitalize">{user.userType}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : userSearchTerm.length >= 2 ? (
                <div className="text-center py-8 text-gray-500">
                  <FaUser className="text-4xl mx-auto mb-2 text-gray-300" />
                  <p>No users found matching "{userSearchTerm}"</p>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FaSearch className="text-4xl mx-auto mb-2 text-gray-300" />
                  <p>Type at least 2 characters to search for users</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileSelect}
        className="hidden"
        accept=".pdf,.doc,.docx,.txt,.zip,.rar"
      />
      <input
        ref={imageInputRef}
        type="file"
        multiple
        onChange={handleImageSelect}
        className="hidden"
        accept="image/*"
      />
    </div>
  );
}