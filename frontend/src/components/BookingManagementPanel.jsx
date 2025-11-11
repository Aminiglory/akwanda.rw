import React, { useState, useEffect, useRef } from 'react';
import { 
  FaCalendarAlt, FaUser, FaEnvelope, FaPhone, FaMapMarkerAlt, 
  FaCheckCircle, FaClock, FaBan, FaComments, FaPaperPlane, FaTimes,
  FaMoneyBillWave, FaFileInvoice, FaExclamationCircle
} from 'react-icons/fa';
import toast from 'react-hot-toast';
 import { useSocket } from '../contexts/SocketContext';
import { safeApiGet, apiGet, apiPost, apiPatch } from '../utils/apiUtils';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const BookingManagementPanel = ({ booking, onClose, onUpdate }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('details'); // details, messages
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeout = useRef(null);
  const { socket } = useSocket();

  useEffect(() => {
    if (activeTab === 'messages') {
      fetchMessages();
      markMessagesAsRead();

      // Join room and register listeners on shared socket
      if (socket && booking?._id) {
        try {
          socket.emit('join_booking', { bookingId: booking._id });
        } catch (_) {}

        const onNewMessage = (payload) => {
          if (payload?.bookingId === String(booking._id)) {
            setMessages((prev) => [...prev, payload.message || payload]);
          }
        };
        const onTyping = ({ bookingId, typing }) => {
          if (String(bookingId) === String(booking._id)) {
            setIsTyping(!!typing);
          }
        };
        const onRead = ({ bookingId }) => {
          if (String(bookingId) === String(booking._id)) {
            fetchMessages();
          }
        };

        socket.on('message:new', onNewMessage);
        socket.on('typing', onTyping);
        socket.on('message:read', onRead);

        return () => {
          if (socket) {
            socket.off('message:new', onNewMessage);
            socket.off('typing', onTyping);
            socket.off('message:read', onRead);
          }
        };
      }
    }

    return () => {
      // cleanup handled above when socket is present
    };
  }, [activeTab, socket, booking?._id]);

  const fetchMessages = async () => {
    try {
      const data = await safeApiGet(`/api/messages/booking/${booking._id}`, {
        fallback: { messages: [] },
        timeout: 10000
      });
      setMessages(data.messages || []);
    } catch (error) {
      console.error('Fetch messages error:', error);
      setMessages([]);
    }
  };

  const markMessagesAsRead = async () => {
    try {
      await apiPatch(`/api/messages/booking/${booking._id}/read`, {});
    } catch (error) {
      console.error('Mark as read error:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) {
      toast.error('Please enter a message');
      return;
    }

    try {
      setLoading(true);
      const data = await apiPost(`/api/messages/booking/${booking._id}`, {
        message: newMessage
      });

      setMessages([...messages, data.message]);
      setNewMessage('');
      // After sending, also emit typing false
      if (socket) {
        try { socket.emit('typing', { bookingId: booking._id, typing: false }); } catch (_) {}
      }
      toast.success('Message sent successfully');
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error(error.message || 'Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  const updateBookingStatus = async (newStatus) => {
    if (!window.confirm(`Are you sure you want to ${newStatus} this booking?`)) {
      return;
    }

    try {
      const data = await apiPatch(`/api/bookings/${booking._id}/status`, {
        status: newStatus
      });

      toast.success(`Booking ${newStatus} successfully`);
      if (onUpdate) onUpdate();
      if (onClose) onClose();
    } catch (error) {
      console.error(`Failed to ${newStatus} booking:`, error);
      toast.error(error.message || `Failed to ${newStatus} booking`);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    return `RWF ${amount.toLocaleString()}`;
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      awaiting: 'bg-orange-100 text-orange-800 border-orange-300',
      confirmed: 'bg-green-100 text-green-800 border-green-300',
      cancelled: 'bg-red-100 text-red-800 border-red-300',
      ended: 'bg-blue-100 text-blue-800 border-blue-300'
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const getPaymentStatusColor = (status) => {
    const colors = {
      paid: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      unpaid: 'bg-red-100 text-red-800',
      failed: 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Booking Management</h2>
            <p className="text-blue-100 mt-1">Confirmation: {booking.confirmationCode}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-colors"
          >
            <FaTimes className="text-2xl" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b bg-gray-50">
          <div className="flex space-x-4 px-6">
            <button
              onClick={() => setActiveTab('details')}
              className={`py-4 px-4 border-b-2 font-medium transition-colors ${
                activeTab === 'details'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <FaCalendarAlt className="inline mr-2" />
              Booking Details
            </button>
            <button
              onClick={() => setActiveTab('messages')}
              className={`py-4 px-4 border-b-2 font-medium transition-colors ${
                activeTab === 'messages'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <FaComments className="inline mr-2" />
              Messages
              {messages.filter(m => !m.isRead && m.recipient._id !== booking.property?.host).length > 0 && (
                <span className="ml-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                  {messages.filter(m => !m.isRead).length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'details' && (
            <div className="space-y-6">
              {/* Status Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-xl p-4 border-l-4 border-blue-600">
                  <p className="text-sm text-gray-600 mb-1">Booking Status</p>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(booking.status)}`}>
                    {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                  </span>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 border-l-4 border-green-600">
                  <p className="text-sm text-gray-600 mb-1">Payment Status</p>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getPaymentStatusColor(booking.paymentStatus)}`}>
                    {booking.paymentStatus.charAt(0).toUpperCase() + booking.paymentStatus.slice(1)}
                  </span>
                </div>
              </div>

              {/* Guest Information */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center">
                  <FaUser className="mr-2" />
                  Guest Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-blue-700 font-medium">Name</p>
                    <p className="text-blue-900">{booking.guest?.firstName} {booking.guest?.lastName}</p>
                  </div>
                  <div>
                    <p className="text-blue-700 font-medium">Email</p>
                    <p className="text-blue-900 flex items-center">
                      <FaEnvelope className="mr-2" />
                      {booking.guest?.email}
                    </p>
                  </div>
                  {booking.guestContact?.phone && (
                    <div>
                      <p className="text-blue-700 font-medium">Phone</p>
                      <p className="text-blue-900 flex items-center">
                        <FaPhone className="mr-2" />
                        {booking.guestContact.phone}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-blue-700 font-medium">Number of Guests</p>
                    <p className="text-blue-900">{booking.numberOfGuests} guests</p>
                  </div>
                </div>
              </div>

              {/* Booking Details */}
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <FaCalendarAlt className="mr-2 text-blue-600" />
                  Stay Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600 font-medium">Check-in</p>
                    <p className="text-gray-900 font-semibold">{formatDate(booking.checkIn)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 font-medium">Check-out</p>
                    <p className="text-gray-900 font-semibold">{formatDate(booking.checkOut)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 font-medium">Duration</p>
                    <p className="text-gray-900">
                      {Math.ceil((new Date(booking.checkOut) - new Date(booking.checkIn)) / (1000 * 60 * 60 * 24))} nights
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 font-medium">Property</p>
                    <p className="text-gray-900 flex items-center">
                      <FaMapMarkerAlt className="mr-2 text-blue-600" />
                      {booking.property?.title}
                    </p>
                  </div>
                </div>
              </div>

              {/* Financial Details */}
              <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-green-900 mb-4 flex items-center">
                  <FaMoneyBillWave className="mr-2" />
                  Financial Details
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-green-700">Amount Before Tax</span>
                    <span className="text-green-900 font-semibold">{formatCurrency(booking.amountBeforeTax || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-700">Tax (3%)</span>
                    <span className="text-green-900 font-semibold">{formatCurrency(booking.taxAmount || 0)}</span>
                  </div>
                  <div className="flex justify-between border-t border-green-300 pt-2">
                    <span className="text-green-900 font-semibold">Total Amount</span>
                    <span className="text-green-900 font-bold text-lg">{formatCurrency(booking.totalAmount)}</span>
                  </div>
                  <div className="flex justify-between text-red-700">
                    <span>Platform Commission</span>
                    <span className="font-semibold">-{formatCurrency(booking.commissionAmount || 0)}</span>
                  </div>
                  <div className="flex justify-between border-t border-green-300 pt-2">
                    <span className="text-green-900 font-bold">Your Earnings</span>
                    <span className="text-green-900 font-bold text-lg">
                      {formatCurrency((booking.amountBeforeTax || booking.totalAmount) - (booking.commissionAmount || 0))}
                    </span>
                  </div>
                </div>
              </div>

              {/* Special Requests */}
              {booking.specialRequests && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-yellow-900 mb-2 flex items-center">
                    <FaExclamationCircle className="mr-2" />
                    Special Requests
                  </h3>
                  <p className="text-yellow-800">{booking.specialRequests}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'messages' && (
            <div className="space-y-4">
              {/* Messages List */}
              <div className="bg-gray-50 rounded-xl p-4 min-h-[300px] max-h-[400px] overflow-y-auto">
                {messages.length === 0 ? (
                  <div className="text-center py-12">
                    <FaComments className="text-4xl text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600">No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((msg) => {
                      const isOwner = msg.sender._id === booking.property?.host;
                      return (
                        <div
                          key={msg._id}
                          className={`flex ${isOwner ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`max-w-[70%] ${isOwner ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200'} rounded-lg p-4`}>
                            <div className="flex items-center space-x-2 mb-2">
                              <span className={`font-semibold text-sm ${isOwner ? 'text-blue-100' : 'text-gray-900'}`}>
                                {msg.sender.firstName} {msg.sender.lastName}
                              </span>
                              <span className={`text-xs ${isOwner ? 'text-blue-200' : 'text-gray-500'}`}>
                                {new Date(msg.createdAt).toLocaleTimeString()}
                              </span>
                            </div>
                            <p className={isOwner ? 'text-white' : 'text-gray-800'}>{msg.message}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {isTyping && (
                  <div className="mt-2 text-xs text-gray-500">Typing...</div>
                )}
              </div>

              {/* Message Input */}
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    if (activeTab === 'messages' && socketRef.current) {
                      socketRef.current.emit('typing', { bookingId: booking._id, typing: true });
                      if (typingTimeout.current) clearTimeout(typingTimeout.current);
                      typingTimeout.current = setTimeout(() => {
                        socketRef.current.emit('typing', { bookingId: booking._id, typing: false });
                      }, 1200);
                    }
                  }}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Type your message..."
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={sendMessage}
                  disabled={loading || !newMessage.trim()}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  <FaPaperPlane />
                  <span>Send</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t bg-gray-50 p-6 flex items-center justify-between">
          <div className="flex space-x-2">
            {(booking.status === 'pending' || booking.status === 'awaiting') && (
              <>
                <button
                  onClick={() => updateBookingStatus('confirmed')}
                  className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  <FaCheckCircle />
                  <span>Confirm Booking</span>
                </button>
                <button
                  onClick={() => updateBookingStatus('cancelled')}
                  className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  <FaBan />
                  <span>Cancel Booking</span>
                </button>
              </>
            )}
            {booking.status === 'confirmed' && (
              <button
                onClick={() => updateBookingStatus('ended')}
                className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                <FaCheckCircle />
                <span>Mark as Completed</span>
              </button>
            )}
          </div>
          <button
            onClick={() => window.open(`/booking-confirmation/${booking._id}`, '_blank')}
            className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <FaFileInvoice />
            <span>View Receipt</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookingManagementPanel;
