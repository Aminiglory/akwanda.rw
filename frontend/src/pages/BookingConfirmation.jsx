import React, { useState, useEffect } from 'react';
import { 
  FaCheckCircle, FaCalendarAlt, FaUsers, FaBed, FaMapMarkerAlt, 
  FaPhone, FaEnvelope, FaDownload, FaPrint, FaShare, FaHome, 
  FaFileInvoice, FaFileAlt, FaStar, FaWifi, FaCar, FaSwimmingPool,
  FaUtensils, FaTv, FaSnowflake, FaPaw, FaSmokingBan,
  FaArrowLeft, FaComments, FaClock, FaCreditCard, FaShieldAlt,
  FaQuestionCircle, FaExclamationTriangle, FaCheck, FaTimes
} from 'react-icons/fa';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const BookingConfirmation = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket } = useSocket();
  
  const [booking, setBooking] = useState(null);
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);

  // Mock data for demonstration
  const mockBooking = {
    _id: id || 'booking123',
    property: {
      _id: 'prop123',
      name: 'Luxury Apartment Kigali',
      location: 'Kigali, Rwanda',
      address: 'KG 123 St, Kacyiru, Kigali',
      images: [
        'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1560448204-603b3fc33ddc?w=800&h=600&fit=crop'
      ],
      amenities: ['WiFi', 'Parking', 'Pool', 'Kitchen', 'AC', 'TV', 'Washing Machine'],
      rating: 4.8,
      reviews: 127
    },
    guest: {
      name: user?.name || 'John Doe',
      email: user?.email || 'john@example.com',
      phone: '+250788123456'
    },
    checkIn: '2024-01-15',
    checkOut: '2024-01-18',
    guests: 2,
    totalAmount: 450000,
    status: 'confirmed',
    paymentStatus: 'paid',
    bookingDate: '2024-01-10',
    confirmationCode: 'AKW-2024-001',
    specialRequests: 'Late check-in requested',
    host: {
      name: 'Marie K.',
      email: 'marie@example.com',
      phone: '+250788654321'
    }
  };

  const mockMessages = [
    {
      id: 'msg1',
      senderId: mockBooking.host._id,
      senderName: mockBooking.host.name,
      content: 'Welcome! Your booking is confirmed. Check-in is at 3 PM.',
      timestamp: '2024-01-10T10:00:00Z',
      type: 'text'
    },
    {
      id: 'msg2',
      senderId: user?._id,
      senderName: user?.name,
      content: 'Thank you! Can I get a late check-in around 6 PM?',
      timestamp: '2024-01-10T10:15:00Z',
      type: 'text'
    },
    {
      id: 'msg3',
      senderId: mockBooking.host._id,
      senderName: mockBooking.host.name,
      content: 'Of course! I\'ll arrange that for you. The key will be in the lockbox.',
      timestamp: '2024-01-10T10:20:00Z',
      type: 'text'
    }
  ];

  useEffect(() => {
    loadBookingDetails();
  }, [id]);

  useEffect(() => {
    if (socket && booking) {
      socket.emit('join_booking', { bookingId: booking._id });
      
      socket.on('message:new', (message) => {
        if (message.bookingId === booking._id) {
          setMessages(prev => [...prev, message]);
        }
      });

      return () => {
        socket.off('message:new');
      };
    }
  }, [socket, booking]);

  const loadBookingDetails = async () => {
    setLoading(true);
    try {
      // In a real app, this would be an API call
      setBooking(mockBooking);
      setProperty(mockBooking.property);
      setMessages(mockMessages);
    } catch (error) {
      toast.error('Failed to load booking details');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    const message = {
      id: Date.now().toString(),
      bookingId: booking._id,
      senderId: user?._id,
      senderName: user?.name,
      content: newMessage,
      timestamp: new Date().toISOString(),
      type: 'text'
    };

    setSending(true);
    try {
      if (socket) {
        socket.emit('message:send', message);
      }
      setMessages(prev => [...prev, message]);
      setNewMessage('');
    } catch (error) {
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Booking Confirmation',
          text: `Your booking at ${property?.name} is confirmed!`,
          url: window.location.href
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading booking details...</p>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FaExclamationTriangle className="text-6xl text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Booking Not Found</h2>
          <p className="text-gray-600 mb-4">The booking you're looking for doesn't exist.</p>
          <Link
            to="/dashboard"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-blue-600 hover:text-blue-700 mb-4"
          >
            <FaArrowLeft className="mr-2" />
            Back
          </button>
          <div className="text-center">
            <FaCheckCircle className="text-6xl text-green-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Booking Confirmed!</h1>
            <p className="text-gray-600">Your reservation has been successfully confirmed</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Property Details */}
            <div className="modern-card-elevated p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Property Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <img
                    src={property.images[0]}
                    alt={property.name}
                    className="w-full h-48 object-cover rounded-lg mb-4"
                  />
                  <h3 className="text-xl font-semibold text-gray-900">{property.name}</h3>
                  <p className="text-gray-600 flex items-center mt-2">
                    <FaMapMarkerAlt className="mr-2" />
                    {property.location}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">{property.address}</p>
                </div>
                <div>
                  <div className="flex items-center mb-4">
                    <FaStar className="text-yellow-400 mr-1" />
                    <span className="font-semibold">{property.rating}</span>
                    <span className="text-gray-500 ml-2">({property.reviews} reviews)</span>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <FaCalendarAlt className="text-blue-600 mr-3" />
                      <div>
                        <p className="font-medium">Check-in</p>
                        <p className="text-gray-600">{formatDate(booking.checkIn)}</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <FaCalendarAlt className="text-blue-600 mr-3" />
                      <div>
                        <p className="font-medium">Check-out</p>
                        <p className="text-gray-600">{formatDate(booking.checkOut)}</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <FaUsers className="text-blue-600 mr-3" />
                      <div>
                        <p className="font-medium">Guests</p>
                        <p className="text-gray-600">{booking.guests} guest{booking.guests > 1 ? 's' : ''}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Amenities */}
              <div className="mt-6">
                <h4 className="font-semibold text-gray-900 mb-3">Amenities</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {property.amenities.map((amenity, index) => (
                    <div key={index} className="flex items-center text-sm text-gray-600">
                      <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                      {amenity}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Booking Information */}
            <div className="modern-card-elevated p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Booking Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Guest Information</h4>
                  <div className="space-y-2">
                    <p><span className="font-medium">Name:</span> {booking.guest.name}</p>
                    <p><span className="font-medium">Email:</span> {booking.guest.email}</p>
                    <p><span className="font-medium">Phone:</span> {booking.guest.phone}</p>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Booking Details</h4>
                  <div className="space-y-2">
                    <p><span className="font-medium">Confirmation Code:</span> {booking.confirmationCode}</p>
                    <p><span className="font-medium">Booking Date:</span> {formatDate(booking.bookingDate)}</p>
                    <p><span className="font-medium">Status:</span> 
                      <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                        booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                        booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {booking.status}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {booking.specialRequests && (
                <div className="mt-6">
                  <h4 className="font-semibold text-gray-900 mb-2">Special Requests</h4>
                  <p className="text-gray-600 bg-gray-50 p-3 rounded-lg">{booking.specialRequests}</p>
                </div>
              )}
            </div>

            {/* Host Information */}
            <div className="modern-card-elevated p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Host Information</h2>
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <FaUser className="text-2xl text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{booking.host.name}</h3>
                  <p className="text-gray-600">{booking.host.email}</p>
                  <p className="text-gray-600">{booking.host.phone}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Payment Summary */}
            <div className="modern-card-elevated p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Total Amount</span>
                  <span className="font-semibold">RWF {booking.totalAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Payment Status</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    booking.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' :
                    booking.paymentStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {booking.paymentStatus}
                  </span>
                </div>
                <hr />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total Paid</span>
                  <span className="text-green-600">RWF {booking.totalAmount.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="modern-card-elevated p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>
              <div className="space-y-3">
                <button
                  onClick={() => setShowReceipt(true)}
                  className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
                >
                  <FaFileInvoice className="mr-2" />
                  View Receipt
                </button>
                <button
                  onClick={handlePrint}
                  className="w-full bg-gray-600 text-white px-4 py-3 rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center"
                >
                  <FaPrint className="mr-2" />
                  Print Confirmation
                </button>
                <button
                  onClick={handleShare}
                  className="w-full bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center"
                >
                  <FaShare className="mr-2" />
                  Share
                </button>
                <button
                  onClick={() => setShowChat(true)}
                  className="w-full bg-purple-600 text-white px-4 py-3 rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center"
                >
                  <FaMessage className="mr-2" />
                  Message Host
                </button>
              </div>
            </div>

            {/* Support */}
            <div className="modern-card-elevated p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Need Help?</h3>
              <div className="space-y-3">
                <button className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <FaQuestionCircle className="inline mr-2 text-blue-600" />
                  FAQ
                </button>
                <button className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <FaPhone className="inline mr-2 text-blue-600" />
                  Contact Support
                </button>
                <button className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <FaShieldAlt className="inline mr-2 text-blue-600" />
                  Safety Center
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Receipt Modal */}
      {showReceipt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Booking Receipt</h2>
                <button
                  onClick={() => setShowReceipt(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <FaTimes className="text-xl" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold">AKWANDA.rw</h3>
                <p className="text-gray-600">Booking Receipt</p>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span>Confirmation Code:</span>
                  <span className="font-medium">{booking.confirmationCode}</span>
                </div>
                <div className="flex justify-between">
                  <span>Property:</span>
                  <span className="font-medium">{property.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Guest:</span>
                  <span className="font-medium">{booking.guest.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Check-in:</span>
                  <span className="font-medium">{formatDate(booking.checkIn)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Check-out:</span>
                  <span className="font-medium">{formatDate(booking.checkOut)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Guests:</span>
                  <span className="font-medium">{booking.guests}</span>
                </div>
                <hr />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total Amount:</span>
                  <span className="text-blue-600">RWF {booking.totalAmount.toLocaleString()}</span>
                </div>
              </div>
              <div className="mt-6 flex space-x-4">
                <button
                  onClick={handlePrint}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Print Receipt
                </button>
                <button
                  onClick={() => setShowReceipt(false)}
                  className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chat Modal */}
      {showChat && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Message Host</h2>
                <button
                  onClick={() => setShowChat(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <FaTimes className="text-xl" />
                </button>
              </div>
            </div>
            <div className="flex-1 p-4 overflow-y-auto">
              <div className="space-y-4">
                {messages.map(message => (
                  <div key={message.id} className={`flex ${message.senderId === user?._id ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs px-4 py-2 rounded-lg ${
                      message.senderId === user?._id 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      <p className="text-sm">{message.content}</p>
                      <p className="text-xs opacity-75 mt-1">{formatTime(message.timestamp)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-4 border-t border-gray-200">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !sending) {
                      sendMessage();
                    }
                  }}
                  placeholder="Type a message..."
                  className="flex-1 modern-input"
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || sending}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FaMessage />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingConfirmation;