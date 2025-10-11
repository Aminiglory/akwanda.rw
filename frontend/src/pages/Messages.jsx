import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import {
  FaPaperPlane, FaImage, FaFile, FaSmile, FaPhone, FaVideo,
  FaEllipsisV, FaSearch, FaFilter, FaDownload, FaTrash,
  FaCheck, FaCheckDouble, FaClock, FaUser, FaCalendarAlt,
  FaMapMarkerAlt, FaBed, FaMoneyBillWave, FaStar
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
  
  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Mock data for demonstration
  const mockThreads = [
    {
      id: '1',
      userId: 'guest1',
      userName: 'John Doe',
      userAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
      lastMessage: 'Thank you for the great stay!',
      lastMessageTime: '2024-01-15T10:30:00Z',
      unreadCount: 2,
      booking: {
        id: 'booking1',
        propertyName: 'Luxury Apartment Kigali',
        checkIn: '2024-01-15',
        checkOut: '2024-01-18',
        totalAmount: 450000,
        status: 'paid'
      }
    },
    {
      id: '2',
      userId: 'guest2',
      userName: 'Jane Smith',
      userAvatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face',
      lastMessage: 'Can I get a late check-in?',
      lastMessageTime: '2024-01-14T15:45:00Z',
      unreadCount: 0,
      booking: {
        id: 'booking2',
        propertyName: 'Cozy Studio Musanze',
        checkIn: '2024-01-20',
        checkOut: '2024-01-22',
        totalAmount: 180000,
        status: 'pending'
      }
    }
  ];

  const mockMessages = {
    '1': [
      {
        id: 'msg1',
        senderId: 'guest1',
        senderName: 'John Doe',
        content: 'Hi! I\'m checking in today. What time is best?',
        timestamp: '2024-01-15T09:00:00Z',
        type: 'text',
        status: 'read'
      },
      {
        id: 'msg2',
        senderId: user?._id,
        senderName: user?.name,
        content: 'Hello John! Check-in is at 3 PM. I\'ll send you the key location details.',
        timestamp: '2024-01-15T09:15:00Z',
        type: 'text',
        status: 'read'
      },
      {
        id: 'msg3',
        senderId: 'guest1',
        senderName: 'John Doe',
        content: 'Perfect! Thank you so much.',
        timestamp: '2024-01-15T09:20:00Z',
        type: 'text',
        status: 'read'
      },
      {
        id: 'msg4',
        senderId: 'guest1',
        senderName: 'John Doe',
        content: 'Thank you for the great stay!',
        timestamp: '2024-01-15T10:30:00Z',
        type: 'text',
        status: 'delivered'
      }
    ],
    '2': [
      {
        id: 'msg5',
        senderId: 'guest2',
        senderName: 'Jane Smith',
        content: 'Hi! Can I get a late check-in around 8 PM?',
        timestamp: '2024-01-14T15:30:00Z',
        type: 'text',
        status: 'read'
      },
      {
        id: 'msg6',
        senderId: user?._id,
        senderName: user?.name,
        content: 'Of course! I\'ll arrange for a late check-in. The key will be in the lockbox.',
        timestamp: '2024-01-14T15:45:00Z',
        type: 'text',
        status: 'read'
      }
    ]
  };

  useEffect(() => {
    loadThreads();
  }, []);

  useEffect(() => {
    if (activeThread) {
      loadMessages(activeThread.id);
    }
  }, [activeThread]);

  useEffect(() => {
    if (socket) {
      socket.on('message:new', handleNewMessage);
      socket.on('typing', handleTyping);
      socket.on('message:read', handleMessageRead);

      return () => {
        socket.off('message:new', handleNewMessage);
        socket.off('typing', handleTyping);
        socket.off('message:read', handleMessageRead);
      };
    }
  }, [socket, activeThread]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadThreads = async () => {
    setLoading(true);
    try {
      // In a real app, this would be an API call
      setThreads(mockThreads);
    } catch (error) {
      toast.error('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (threadId) => {
    try {
      // In a real app, this would be an API call
      setMessages(mockMessages[threadId] || []);
    } catch (error) {
      toast.error('Failed to load messages');
    }
  };

  const handleNewMessage = (message) => {
    if (activeThread && message.threadId === activeThread.id) {
      setMessages(prev => [...prev, message]);
    }
  };

  const handleTyping = (data) => {
    if (activeThread && data.userId !== user?._id) {
      setOtherTyping(data.isTyping);
    }
  };

  const handleMessageRead = (data) => {
    setMessages(prev => prev.map(msg => 
      msg.id === data.messageId ? { ...msg, status: 'read' } : msg
    ));
  };

  const sendMessage = async () => {
    if (!newMessage.trim() && attachments.length === 0) return;

    const message = {
      id: Date.now().toString(),
      threadId: activeThread.id,
      senderId: user?._id,
      senderName: user?.name,
      content: newMessage,
      attachments: attachments,
      timestamp: new Date().toISOString(),
      type: attachments.length > 0 ? 'file' : 'text',
      status: 'sending'
    };

    setMessages(prev => [...prev, message]);
    setNewMessage('');
    setAttachments([]);

    try {
      // In a real app, this would be an API call
      if (socket) {
        socket.emit('message:send', message);
      }
      
      // Update message status
      setTimeout(() => {
        setMessages(prev => prev.map(msg => 
          msg.id === message.id ? { ...msg, status: 'delivered' } : msg
        ));
      }, 1000);
    } catch (error) {
      toast.error('Failed to send message');
      setMessages(prev => prev.filter(msg => msg.id !== message.id));
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
      if (socket && activeThread) {
        socket.emit('typing', { 
          threadId: activeThread.id, 
          isTyping: true 
        });
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
    if (socket && activeThread) {
      socket.emit('typing', { 
        threadId: activeThread.id, 
        isTyping: false 
      });
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

  const renderMessage = (message) => {
    const isOwn = message.senderId === user?._id;
    
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
        </div>
      </div>
    );
  };

  const renderThread = (thread) => (
    <div
      key={thread.id}
      onClick={() => setActiveThread(thread)}
      className={`p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors ${
        activeThread?.id === thread.id ? 'bg-blue-50 border-blue-200' : ''
      }`}
    >
      <div className="flex items-center space-x-3">
        <div className="relative">
          <img
            src={thread.userAvatar}
            alt={thread.userName}
            className="w-12 h-12 rounded-full object-cover"
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
            {thread.lastMessage}
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-120px)]">
        {/* Threads Sidebar */}
        <div className="lg:col-span-1 modern-card-elevated p-6">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Messages</h2>
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="modern-input pl-10 w-full"
              />
            </div>
          </div>
          
          <div className="space-y-1 overflow-y-auto max-h-[calc(100vh-200px)]">
            {threads
              .filter(thread => 
                thread.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                thread.lastMessage.toLowerCase().includes(searchTerm.toLowerCase())
              )
              .map(renderThread)}
          </div>
        </div>

        {/* Chat Area */}
        <div className="lg:col-span-3 modern-card-elevated flex flex-col">
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
                    <button className="p-2 text-gray-600 hover:text-blue-600 hover:bg-gray-100 rounded-lg">
                      <FaPhone />
                    </button>
                    <button className="p-2 text-gray-600 hover:text-blue-600 hover:bg-gray-100 rounded-lg">
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

              {/* Message Input */}
              <div className="p-4 border-t border-gray-200">
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
                  <div className="flex-1">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => {
                        setNewMessage(e.target.value);
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
                    disabled={!newMessage.trim() && attachments.length === 0}
                    className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FaPaperPlane />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <FaMessage className="text-6xl text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">Select a conversation</h3>
                <p className="text-gray-500">Choose a conversation from the sidebar to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </div>

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