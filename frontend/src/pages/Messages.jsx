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
import { ListItemSkeleton, ChatBubbleSkeleton } from '../components/Skeletons';

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
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [overlayReady, setOverlayReady] = useState(false); // mobile overlay animation
  const [isRefreshing, setIsRefreshing] = useState(false);
  const sidebarRef = useRef(null);
  const touchStartYRef = useRef(0);
  const pulledRef = useRef(false);
  const typingTimersRef = useRef({}); // per-thread typing timers
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, message: null });
  const longPressTimerRef = useRef(null);

  const extractSenderId = (val) => {
    if (!val) return '';
    if (typeof val === 'object') return String(val._id || val.id || '');
    return String(val);
  };

  const extractMessageId = (val) => {
    if (!val) return '';
    if (typeof val === 'object') return String(val._id || val.id || val.messageId || val.msgId || '');
    return String(val);
  };

  const isServerId = (id) => /^[a-fA-F0-9]{24}$/.test(String(id || ''));

  const extractTypingUserId = (data) => {
    return String(
      data?.userId ||
      data?.from ||
      data?.sender ||
      data?.senderId ||
      ''
    );
  };

  const extractTypingBookingId = (data) => {
    return String(
      data?.bookingId ||
      data?.roomId ||
      data?.booking ||
      ''
    );
  };

  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Placeholder avatar if backend doesn't return one
  const placeholderAvatar = 'https://ui-avatars.com/api/?name=A&background=0D8ABC&color=fff&size=64';

  // Determine if an attachment should be treated as an image
  const isImageAttachment = (att) => {
    if (!att) return false;
    const mime = String(att.type || att.mime || '');
    if (mime.toLowerCase().startsWith('image/')) return true;
    const url = String(att.url || att.path || att.src || '');
    return /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(url);
  };

  useEffect(() => {
    loadThreads();
  }, []);

  useEffect(() => {
    if (activeThread) {
      loadMessages(activeThread.id);
    }
  }, [activeThread]);

  // Pull-to-refresh for threads (mobile)
  useEffect(() => {
    const el = sidebarRef.current;
    if (!el) return;
    let pulling = false;
    const onStart = (e) => {
      if (el.scrollTop === 0) {
        touchStartYRef.current = e.touches?.[0]?.clientY || 0;
        pulling = true;
        pulledRef.current = false;
      }
    };
    const onMove = (e) => {
      if (!pulling) return;
      const y = e.touches?.[0]?.clientY || 0;
      const delta = y - touchStartYRef.current;
      if (delta > 70 && !pulledRef.current) {
        pulledRef.current = true;
        setIsRefreshing(true);
        loadThreads().finally(() => setTimeout(() => setIsRefreshing(false), 400));
        if (navigator?.vibrate) try { navigator.vibrate(10); } catch (_) {}
      }
    };
    const onEnd = () => { pulling = false; };
    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: true });
    el.addEventListener('touchend', onEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
    };
  }, [sidebarRef.current]);

  useEffect(() => {
    if (!socket) return;
    socket.on('message:new', handleNewMessage);
    socket.on('typing', handleTyping);
    socket.on('userTyping', handleTyping);
    socket.on('typing_status', handleTyping);
    socket.on('typing:start', (d) => handleTyping({ ...d, typing: true }));
    socket.on('typing:stop', (d) => handleTyping({ ...d, typing: false }));
    socket.on('message:read', handleMessageRead);

    // Socket lifecycle hooks to keep presence accurate
    const onConnect = () => {
      try {
        const uid = String(user?._id || user?.id || '');
        if (uid) {
          socket.emit('presence:here', { userId: uid });
        }
        socket.emit('presence:query');
      } catch (_) {}
    };
    const onDisconnect = () => {
      // Avoid stale green dots when transport drops
      setOnlineUsers(new Set());
    };
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    // Presence listeners (compat across event names)
    const handleOnline = (d) => {
      const uid = String(d?.userId || d?.id || d?.user || d);
      if (!uid) return;
      setOnlineUsers(prev => {
        const next = new Set(prev);
        next.add(uid);
        return next;
      });
    };
    const handleOffline = (d) => {
      const uid = String(d?.userId || d?.id || d?.user || d);
      if (!uid) return;
      setOnlineUsers(prev => {
        const next = new Set(prev);
        next.delete(uid);
        return next;
      });
    };
    const handlePresenceList = (list) => {
      const arr = Array.isArray(list?.users) ? list.users : Array.isArray(list) ? list : [];
      const set = new Set(arr.map(u => String(u?.userId || u?.id || u)));
      setOnlineUsers(set);
    };

    socket.on('user:online', handleOnline);
    socket.on('user:offline', handleOffline);
    socket.on('presence', handlePresenceList);
    socket.on('presence:list', handlePresenceList);

    // Announce presence and request current list (best-effort)
    try {
      const uid = String(user?._id || user?.id || '');
      if (uid) {
        socket.emit('presence:here', { userId: uid });
        socket.emit('presence:query');
      }
    } catch (_) {}

    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('typing', handleTyping);
      socket.off('userTyping', handleTyping);
      socket.off('typing_status', handleTyping);
      socket.off('typing:start');
      socket.off('typing:stop');
      socket.off('message:read', handleMessageRead);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('user:online', handleOnline);
      socket.off('user:offline', handleOffline);
      socket.off('presence', handlePresenceList);
      socket.off('presence:list', handlePresenceList);
    };
  }, [socket, activeThread, user]);

  // Re-announce presence if the authenticated user changes
  useEffect(() => {
    if (!socket) return;
    const uid = String(user?._id || user?.id || '');
    if (uid) {
      try {
        socket.emit('presence:here', { userId: uid });
      } catch (_) {}
    }
  }, [socket, user]);

  // Best-effort: on tab close, notify away
  useEffect(() => {
    const handler = () => {
      try {
        const uid = String(user?._id || user?.id || '');
        if (socket && uid) socket.emit('presence:away', { userId: uid });
      } catch (_) {}
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [socket, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (otherTyping) {
      scrollToBottom();
      const t = setTimeout(() => setOtherTyping(false), 4000);
      return () => clearTimeout(t);
    }
  }, [otherTyping]);

  // Lock body scroll on mobile when chat overlay is open
  useEffect(() => {
    try {
      const isMobile = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(max-width: 1023.5px)').matches;
      if (activeThread && isMobile) {
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        // trigger slide-in after mount
        const t = setTimeout(() => setOverlayReady(true), 0);
        const onKey = (e) => { if (e.key === 'Escape') setActiveThread(null); };
        window.addEventListener('keydown', onKey);
        return () => { clearTimeout(t); window.removeEventListener('keydown', onKey); setOverlayReady(false); document.body.style.overflow = prevOverflow; };
      }
    } catch (_) {}
  }, [activeThread]);

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
      const sorted = mapped.sort((a, b) => new Date(b.lastMessageTime || 0) - new Date(a.lastMessageTime || 0));
      setThreads(sorted);
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
      setMessagesLoading(true);
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
        id: extractMessageId(m) || String(Math.random()),
        senderId: extractSenderId(m.sender || m.senderId),
        senderName: m.senderName || (extractSenderId(m.sender) === String(user?._id || user?.id || '') ? (user?.name || 'You') : thread.userName),
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
    } finally {
      setMessagesLoading(false);
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
      if (extractSenderId(m.sender) === myId) return;
      
      if (thread && thread.context?.bookingId && String(thread.context.bookingId) === String(payload.bookingId)) {
        // Resolve reply reference from existing messages if available
        const ref = payload.replyTo ? messages.find(x => String(x.id) === String(payload.replyTo)) : null;
        // Dedupe by server id if exists
        if (m._id && messages.some(x => String(x.id) === String(m._id))) return;
        setMessages(prev => [...prev, {
          id: extractMessageId(m) || String(Math.random()),
          senderId: extractSenderId(m.sender),
          senderName: extractSenderId(m.sender) === String(user?._id || user?.id || '') ? (user?.name || 'You') : thread.userName,
          content: m.message,
          attachments: m.attachments || [],
          timestamp: m.createdAt,
          type: (m.attachments && m.attachments.length) ? 'file' : 'text',
          status: 'delivered',
          reply: ref ? { id: ref.id, senderName: ref.senderName, text: ref.content } : null
        }]);
      } else {
        // Update unread count and bump thread to top for threads not currently active
        setThreads(prev => {
          const updated = prev.map(t => 
            t.context?.bookingId && String(t.context.bookingId) === String(payload.bookingId) && String(m.sender) !== myId
              ? { ...t, unreadCount: (t.unreadCount || 0) + 1, lastMessage: m.message, lastMessageTime: m.createdAt }
              : t
          );
          updated.sort((a, b) => new Date(b.lastMessageTime || 0) - new Date(a.lastMessageTime || 0));
          return updated;
        });
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
        if (payload.senderId && String(payload.senderId) === myId) return;
        // bump unread and preview for this user thread and reorder
        setThreads(prev => {
          const updated = prev.map(t => 
            (String(t.userId) === senderId || String(t.userId) === String(payload.to))
              ? { ...t, unreadCount: (t.unreadCount || 0) + 1, lastMessage: payload.message || '', lastMessageTime: payload.createdAt || new Date().toISOString() }
              : t
          );
          updated.sort((a, b) => new Date(b.lastMessageTime || 0) - new Date(a.lastMessageTime || 0));
          return updated;
        });
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
    const myId = String(user?._id || user?.id || '');
    const typingUserId = extractTypingUserId(data);
    const bookingIdInData = extractTypingBookingId(data);
    const recipientId = String(data?.to || data?.recipientId || '');
    const isFromOther = typingUserId && typingUserId !== myId;

    // Booking-scoped typing: match across possible keys
    if (thread.context?.bookingId) {
      if (String(bookingIdInData) === String(thread.context.bookingId)) {
        if (isFromOther || !extractTypingUserId(data)) {
          setOtherTyping(!!data.typing);
        }
      }
      return;
    }
    // Direct typing: prefer targeted events, but also handle broadcast events with only sender info
    if (!bookingIdInData) {
      if ((recipientId === myId && String(thread.userId) === typingUserId) ||
          (!recipientId && typingUserId && String(thread.userId) === typingUserId && typingUserId !== myId)) {
        setOtherTyping(!!data.typing);
      }
    }

    // Update typing badge in thread list (best-effort)
    if (typingUserId) {
      setThreads(prev => prev.map(t => (
        String(t.userId) === String(typingUserId)
          ? { ...t, isTyping: !!data.typing }
          : t
      )));
      // auto-clear after 4s
      const key = String(typingUserId);
      if (typingTimersRef.current[key]) clearTimeout(typingTimersRef.current[key]);
      typingTimersRef.current[key] = setTimeout(() => {
        setThreads(prev => prev.map(t => (
          String(t.userId) === key ? { ...t, isTyping: false } : t
        )));
      }, 4000);
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
        // Normalize server attachments to include url/name/isImage
        uploaded = (upJson.attachments || []).map(a => ({
          ...a,
          url: a.url || a.path || a.src,
          name: a.name || a.filename || a.originalname,
          isImage: isImageAttachment(a)
        }));
      }

      const payload = {
        to: activeThread.userId,
        text: newMessage,
        bookingId: activeThread?.context?.bookingId,
        attachments: uploaded
      };
      if (replyTarget?.id && isServerId(replyTarget.id)) {
        payload.replyTo = replyTarget.id;
      }
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
        senderId: extractSenderId(data.message.sender),
        senderName: user?.name || 'You',
        content: data.message.message,
        attachments: data.message.attachments || [],
        timestamp: data.message.createdAt,
        type: (data.message.attachments && data.message.attachments.length) ? 'file' : 'text',
        status: 'delivered',
        reply: optimistic.reply || null
      } : m));
      if (navigator?.vibrate) try { navigator.vibrate(15); } catch (_) {}
    } catch (error) {
      toast.error(error.message || 'Failed to send message');
      // Mark optimistic as failed for retry
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: 'failed' } : m));
    } finally {
      setNewMessage('');
      setAttachments([]);
      setReplyTarget(null);
    }
  };

  const resendMessage = async (failedMessage) => {
    if (!failedMessage) return;
    // Reset status to sending
    setMessages(prev => prev.map(m => m.id === failedMessage.id ? { ...m, status: 'sending' } : m));
    try {
      let uploaded = [];
      if (failedMessage.attachments && failedMessage.attachments.length) {
        const form = new FormData();
        failedMessage.attachments.forEach(a => { if (a.file) form.append('files', a.file); });
        if (form.has && !form.has('files')) { /* no-op */ }
        if ([...form.keys()].length) {
          const up = await fetch(`${API_URL}/api/messages/upload`, { method: 'POST', credentials: 'include', body: form });
          const upJson = await up.json();
          if (!up.ok) throw new Error(upJson.message || 'Upload failed');
          uploaded = upJson.attachments || [];
        }
      }
      const payload = {
        to: activeThread?.userId || failedMessage.senderId,
        text: failedMessage.content,
        bookingId: activeThread?.context?.bookingId,
        attachments: uploaded
      };
      const res = await fetch(`${API_URL}/api/messages/send`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Send failed');
      // Replace local failed with server
      setMessages(prev => prev.map(m => m.id === failedMessage.id ? {
        id: String(data.message._id),
        senderId: extractSenderId(data.message.sender),
        senderName: user?.name || 'You',
        content: data.message.message,
        attachments: data.message.attachments || [],
        timestamp: data.message.createdAt,
        type: (data.message.attachments && data.message.attachments.length) ? 'file' : 'text',
        status: 'delivered',
        reply: failedMessage.reply || null
      } : m));
    } catch (e) {
      toast.error(e.message || 'Retry failed');
      setMessages(prev => prev.map(m => m.id === failedMessage.id ? { ...m, status: 'failed' } : m));
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
    if (navigator?.vibrate) try { navigator.vibrate(8); } catch (_) {}
  };

  const handleTypingStart = () => {
    if (!isTyping) {
      setIsTyping(true);
      if (socket) {
        const uid = String(user?._id || user?.id || '');
        if (activeThread?.context?.bookingId) {
          const bid = String(activeThread.context.bookingId);
          socket.emit('typing', { bookingId: bid, roomId: bid, typing: true, userId: uid, from: uid });
        } else if (activeThread?.userId) {
          const rid = String(activeThread.userId);
          socket.emit('typing', { to: rid, recipientId: rid, typing: true, userId: uid, from: uid });
        }
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
    if (socket) {
      const uid = String(user?._id || user?.id || '');
      if (activeThread?.context?.bookingId) {
        const bid = String(activeThread.context.bookingId);
        socket.emit('typing', { bookingId: bid, roomId: bid, typing: false, userId: uid, from: uid });
      } else if (activeThread?.userId) {
        const rid = String(activeThread.userId);
        socket.emit('typing', { to: rid, recipientId: rid, typing: false, userId: uid, from: uid });
      }
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
      <div
        key={message.id}
        className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4`}
        onContextMenu={(e) => { e.preventDefault(); setContextMenu({ visible: true, x: e.clientX, y: e.clientY, message }); }}
        onTouchStart={() => { if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current); longPressTimerRef.current = setTimeout(() => setContextMenu({ visible: true, x: window.innerWidth/2, y: window.innerHeight/2, message }), 500); }}
        onTouchEnd={() => { if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current); }}
      >
        <div className={`max-w-[92%] sm:max-w-[75%] lg:max-w-[60%] ${isOwn ? 'order-2' : 'order-1'}`}>
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
          <div className={`rounded-2xl px-3 sm:px-4 py-2 ${
            isOwn 
              ? 'bg-blue-600 text-white' 
              : 'bg-white text-gray-800 border border-gray-200'
          }`}>
            {message.type === 'file' && message.attachments ? (
              <div className="space-y-2">
                {message.attachments.map(attachment => {
                  const isImg = attachment.isImage ?? isImageAttachment(attachment);
                  const url = attachment.url || attachment.path || attachment.src;
                  return (
                    <div key={attachment.id || url} className="flex items-center space-x-2">
                      {isImg ? (
                        <a href={url} target="_blank" rel="noreferrer">
                          <img
                            src={url}
                            alt={attachment.name || 'image'}
                            className="max-w-full h-auto rounded-lg"
                          />
                        </a>
                      ) : (
                        <a href={url} target="_blank" rel="noreferrer" className="flex items-center space-x-2 p-2 bg-gray-100 rounded-lg">
                          <FaFile className="text-gray-600" />
                          <span className="text-sm">{attachment.name || 'file'}</span>
                        </a>
                      )}
                    </div>
                  );
                })}
                {message.content && <p className="mt-2 break-words">{message.content}</p>}
              </div>
            ) : (
              <p className="break-words">{message.content}</p>
            )}
          </div>
          
          <div className={`flex items-center mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
            <span className="text-xs text-gray-500">{formatTime(message.timestamp)}</span>
            {isOwn && (
              <div className="ml-2 flex items-center gap-2">
                {message.status === 'sending' && <FaClock className="text-gray-400 text-xs" />}
                {message.status === 'delivered' && <FaCheck className="text-gray-400 text-xs" />}
                {message.status === 'read' && <FaCheckDouble className="text-blue-500 text-xs" />}
                {message.status === 'failed' && (
                  <button
                    className="text-xs text-rose-600 underline"
                    onClick={() => resendMessage(message)}
                    title="Retry send"
                  >Retry</button>
                )}
              </div>
            )}
            <div className={`mt-1 ${isOwn ? 'text-right' : 'text-left'}`}></div>
          </div>
          <div className={`mt-1 ${isOwn ? 'text-right' : 'text-left'}`}>
            <button
              className="text-xs text-gray-500 hover:text-blue-600 inline-flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!isServerId(message.id)}
              title={!isServerId(message.id) ? 'Reply unavailable for unsynced message' : 'Reply'}
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
            <span className={`absolute bottom-0 right-0 block w-3 h-3 rounded-full border-2 border-white ${onlineUsers.has(String(thread.userId)) ? 'bg-green-500' : 'bg-gray-300'}`}></span>
            {thread.unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {thread.unreadCount}
              </span>
            )}
            {thread.isTyping && (
              <span className="absolute -bottom-1 -left-1 bg-blue-600 text-white text-[10px] rounded px-1">typing…</span>
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
      {contextMenu.visible && contextMenu.message && (
        <div className="fixed inset-0 z-50" onClick={() => setContextMenu({ visible: false, x: 0, y: 0, message: null })}>
          <div
            className="absolute bg-white border border-gray-200 rounded-lg shadow-lg text-sm"
            style={{ top: contextMenu.y, left: contextMenu.x, transform: 'translate(-50%, 0)' }}
          >
            <button
              className="block w-full text-left px-4 py-2 hover:bg-gray-50"
              onClick={async () => {
                try { await navigator.clipboard.writeText(contextMenu.message.content || ''); } catch (_) {}
                setContextMenu({ visible: false, x: 0, y: 0, message: null });
              }}
            >Copy</button>
            <button
              className="block w-full text-left px-4 py-2 hover:bg-gray-50"
              onClick={() => {
                setMessages(prev => prev.filter(m => m.id !== contextMenu.message.id));
                setContextMenu({ visible: false, x: 0, y: 0, message: null });
              }}
            >Remove for me</button>
          </div>
        </div>
      )}
      <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Threads Sidebar */}
        <div className={`lg:col-span-1 modern-card-elevated p-6 flex flex-col h-[60vh] md:h-[70vh] lg:h-[78vh] ${activeThread ? 'hidden lg:flex' : 'flex'}`}>
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
          
          <div ref={sidebarRef} className="space-y-1 overflow-y-auto flex-1">
            {isRefreshing && (
              <div className="sticky top-0 z-10 flex items-center justify-center py-1 text-xs text-blue-600">Refreshing…</div>
            )}
            {loading ? (
              <ListItemSkeleton rows={8} />
            ) : (() => {
              const filtered = threads
                .filter(thread => {
                  const name = (thread.userName || '').toLowerCase();
                  const last = (thread.lastMessage || '').toLowerCase();
                  const q = (searchTerm || '').toLowerCase();
                  return name.includes(q) || last.includes(q);
                });
              if (filtered.length === 0) {
                return (
                  <div className="flex flex-col items-center justify-center text-center text-gray-600 py-10">
                    <FaComments className="text-4xl text-gray-300 mb-2" />
                    <div className="mb-3">No conversations yet</div>
                    <button
                      onClick={() => setShowUserSearch(true)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >Start New Conversation</button>
                  </div>
                );
              }
              return filtered.map(renderThread);
            })()}
          </div>
        </div>

        {/* Chat Area */}
        <div
          className={`lg:col-span-3 modern-card-elevated flex flex-col 
            ${!activeThread ? 'hidden lg:flex' : 'flex'}
            ${activeThread ? 'fixed inset-0 z-40 bg-white/95 lg:relative lg:inset-auto lg:z-auto lg:bg-transparent' : ''}
            ${activeThread ? (overlayReady ? 'opacity-100' : 'opacity-0') : ''}
            transition-opacity duration-200 ease-out
            h-[100vh] md:h-[80vh] lg:h-[78vh]
          `}
          role="region"
          aria-label="Chat Area"
          aria-modal={activeThread ? true : undefined}
        >
          {activeThread ? (
            <>
              {/* Chat Header */}
              <div className={`p-4 border-b border-gray-200 sticky top-0 bg-white z-10 ${activeThread ? 'lg:p-4' : ''}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {/* Mobile back button */}
                    <button
                      className="lg:hidden mr-1 p-2 rounded-lg hover:bg-gray-100 text-gray-700"
                      onClick={() => setActiveThread(null)}
                      aria-label="Back"
                    >
                      <FaTimes />
                    </button>
                    <img
                      src={activeThread.userAvatar}
                      alt={activeThread.userName}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <span className={`block w-3 h-3 rounded-full ${onlineUsers.has(String(activeThread.userId)) ? 'bg-green-500' : 'bg-gray-300'}`}></span>
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
              <div className={`flex-1 p-4 overflow-y-auto transform transition-transform duration-300 ease-out lg:transform-none ${overlayReady ? 'translate-y-0' : 'translate-y-full lg:translate-y-0'}`}>
                {messagesLoading ? (
                  <ChatBubbleSkeleton rows={8} />
                ) : (
                  messages.map(renderMessage)
                )}
                {otherTyping && (
                  <div className="flex justify-start mb-4">
                    <div className="bg-white border border-gray-200 rounded-2xl px-4 py-2">
                      <span className="text-sm text-gray-600 italic">typing...</span>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Attachments Preview */}
              {attachments.length > 0 && (
                <div className="p-3 sm:p-4 border-t border-gray-200">
                  <div className="flex flex-wrap gap-2">
                    {attachments.map(attachment => (
                      <div key={attachment.id} className="relative">
                        {attachment.isImage ? (
                          <img
                            src={attachment.url}
                            alt={attachment.name}
                            className="w-14 h-14 sm:w-16 sm:h-16 object-cover rounded-lg"
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
              <div className="p-3 sm:p-4 border-t border-gray-200 relative sticky bottom-0 bg-white">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-1 bg-gray-100 rounded-full px-2.5 sm:px-3 py-1.5 sm:py-2">
                    <button
                      onClick={() => imageInputRef.current?.click()}
                      className="shrink-0 p-1.5 sm:p-2 text-gray-600 hover:text-blue-600 hover:bg-gray-200 rounded-full"
                      title="Add image"
                    >
                      <FaImage />
                    </button>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="shrink-0 p-1.5 sm:p-2 text-gray-600 hover:text-blue-600 hover:bg-gray-200 rounded-full"
                      title="Attach file"
                    >
                      <FaFile />
                    </button>
                    <button
                      onClick={() => setShowEmojiPicker(v => !v)}
                      className="shrink-0 p-1.5 sm:p-2 text-gray-600 hover:text-blue-600 hover:bg-gray-200 rounded-full"
                      title="Emoji"
                    >
                      <FaSmile />
                    </button>
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => {
                        const val = e.target.value.slice(0, MAX_MESSAGE_LEN);
                        setNewMessage(val);
                        handleTypingStart();
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                      placeholder="Message..."
                      className="bg-transparent flex-1 min-w-0 text-xs sm:text-sm placeholder-gray-500 focus:outline-none"
                    />
                  </div>
                  <button
                    onClick={sendMessage}
                    disabled={(!newMessage.trim() && attachments.length === 0) || newMessage.length > MAX_MESSAGE_LEN}
                    className="p-2.5 sm:p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Send"
                  >
                    <FaPaperPlane />
                  </button>
                </div>
                {/* Emoji Picker Popover */}
                {showEmojiPicker && (
                  <div className="absolute bottom-14 sm:bottom-16 left-3 sm:left-4 right-3 sm:right-4 bg-white border border-gray-200 rounded-xl p-2 shadow-lg grid grid-cols-8 gap-1 z-10">
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
                <div className="mt-4 lg:hidden">
                  <button
                    onClick={() => setShowUserSearch(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >Start New Conversation</button>
                </div>
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