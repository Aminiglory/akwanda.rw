import React, { useState, useEffect, useRef } from 'react';
import { FaCheckCircle, FaCalendarAlt, FaUsers, FaBed, FaMapMarkerAlt, FaPhone, FaEnvelope, FaDownload, FaPrint, FaShare, FaHome, FaFileInvoice, FaFileAlt } from 'react-icons/fa';
import { useParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import ReceiptComponent from '../components/ReceiptComponent';
import RRAReceiptComponent from '../components/RRAReceiptComponent';
// Optional live chat if socket.io-client is available
let ioClient = null;
try {
  // Dynamically require to avoid build error if not installed yet
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  ioClient = (await import('socket.io-client')).io;
} catch (_) {}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const BookingConfirmation = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [booking, setBooking] = useState(null);
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showRRAReceipt, setShowRRAReceipt] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [sending, setSending] = useState(false);
  const socketRef = useRef(null);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeout = useRef(null);

  useEffect(() => {
    fetchBookingDetails();
  }, [id]);

  useEffect(() => {
    if (showChat && booking?._id) {
      fetchMessages();
      markMessagesAsRead();
      if (ioClient && !socketRef.current) {
        socketRef.current = ioClient(API_URL, { withCredentials: true });
        socketRef.current.on('connect', () => {
          socketRef.current.emit('join_booking', { bookingId: booking._id });
        });
        socketRef.current.on('message:new', (payload) => {
          if (payload?.bookingId === String(booking._id)) {
            setMessages(prev => [...prev, payload.message]);
          }
        });
        socketRef.current.on('typing', ({ bookingId, typing }) => {
          if (String(bookingId) === String(booking._id)) setIsTyping(!!typing);
        });
        socketRef.current.on('message:read', ({ bookingId }) => {
          if (String(bookingId) === String(booking._id)) fetchMessages();
        });
      } else if (ioClient && socketRef.current) {
        socketRef.current.emit('join_booking', { bookingId: booking._id });
      }
    }
  }, [showChat, booking?._id]);

  const fetchBookingDetails = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/bookings/${id}`, { credentials: 'include' });
      
      // Check if response is JSON
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server returned an invalid response. Please check if you are logged in.');
      }
      
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.message || 'Failed to fetch booking');
      
      setBooking(data.booking);
      
      // Fetch property details
      if (data.booking.property) {
        const propertyRes = await fetch(`${API_URL}/api/properties/${data.booking.property}`, { credentials: 'include' });
        
        const propertyContentType = propertyRes.headers.get('content-type');
        if (propertyContentType && propertyContentType.includes('application/json')) {
          const propertyData = await propertyRes.json();
          
          if (propertyRes.ok) {
            setProperty(propertyData.property);
          }
        }
      }
    } catch (error) {
      console.error('Booking fetch error:', error);
      toast.error(error.message || 'Failed to load booking details');
      // Don't navigate away immediately, give user a chance to see the error
      setTimeout(() => {
        navigate('/apartments');
      }, 2000);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    try {
      const res = await fetch(`${API_URL}/api/messages/booking/${id}`, { credentials: 'include' });
      const data = await res.json();
      if (res.ok) setMessages(data.messages || []);
    } catch (e) {
      console.error('Fetch messages error:', e);
    }
  };

  const markMessagesAsRead = async () => {
    try {
      await fetch(`${API_URL}/api/messages/booking/${id}/read`, { method: 'PATCH', credentials: 'include' });
    } catch (e) {
      console.error('Mark as read error:', e);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() && !attachment) return toast.error('Type a message or attach a file');
    try {
      setSending(true);
      let res, data;
      if (attachment) {
        const form = new FormData();
        if (newMessage.trim()) form.append('message', newMessage.trim());
        form.append('file', attachment);
        res = await fetch(`${API_URL}/api/messages/booking/${id}`, {
          method: 'POST',
          credentials: 'include',
          body: form
        });
        data = await res.json();
      } else {
        res = await fetch(`${API_URL}/api/messages/booking/${id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ message: newMessage })
        });
        data = await res.json();
      }
      if (!res.ok) throw new Error(data.message || 'Failed to send');
      setMessages(prev => [...prev, data.message]);
      setNewMessage('');
      setAttachment(null);
      if (socketRef.current) socketRef.current.emit('typing', { bookingId: booking._id, typing: false });
      toast.success('Message sent');
    } catch (e) {
      toast.error(e.message);
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
          title: 'Booking Confirmation - AKWANDA.rw',
          text: `Your booking confirmation code: ${booking.confirmationCode}`,
          url: window.location.href
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      toast.success('Booking link copied to clipboard!');
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

  const calculateNights = () => {
    if (!booking?.checkIn || !booking?.checkOut) return 0;
    const checkIn = new Date(booking.checkIn);
    const checkOut = new Date(booking.checkOut);
    return Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading booking confirmation...</p>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Booking Not Found</h1>
          <Link
            to="/apartments"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Back to Properties
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Success Header */}
        <div className="neu-card p-8 mb-8 text-center animate-fade-in-up">
          <div className="w-24 h-24 neu-card-inset flex items-center justify-center mx-auto mb-6">
            <FaCheckCircle className="text-5xl text-green-600 animate-bounce-gentle" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2 uppercase tracking-wide">BOOKING CONFIRMED!</h1>
          <p className="text-xl text-gray-600 mb-6 font-medium">
            Your Reservation Has Been Successfully Created
          </p>
          <div className="neu-card-inset p-6 inline-block">
            <p className="text-sm text-blue-800 font-semibold uppercase tracking-wide">CONFIRMATION CODE</p>
            <p className="text-3xl font-bold text-blue-900 tracking-wider">{booking.confirmationCode}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Booking Details */}
            <div className="neu-card p-6 animate-fade-in-up-delayed">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 uppercase tracking-wide">BOOKING DETAILS</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 neu-card-inset flex items-center justify-center">
                      <FaCalendarAlt className="text-blue-600 text-lg" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 font-semibold uppercase tracking-wide">CHECK-IN DATE</p>
                      <p className="font-bold text-gray-900 text-lg">{formatDate(booking.checkIn)}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 neu-card-inset flex items-center justify-center">
                      <FaCalendarAlt className="text-blue-600 text-lg" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 font-semibold uppercase tracking-wide">CHECK-OUT DATE</p>
                      <p className="font-bold text-gray-900 text-lg">{formatDate(booking.checkOut)}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 neu-card-inset flex items-center justify-center">
                      <FaUsers className="text-blue-600 text-lg" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 font-semibold uppercase tracking-wide">NUMBER OF GUESTS</p>
                      <p className="font-bold text-gray-900 text-lg">{booking.numberOfGuests}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 neu-card-inset flex items-center justify-center">
                      <FaBed className="text-blue-600 text-lg" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 font-semibold uppercase tracking-wide">DURATION</p>
                      <p className="font-bold text-gray-900 text-lg">{calculateNights()} NIGHTS</p>
                    </div>
                  </div>
                </div>
              </div>

              {booking.specialRequests && (
                <div className="mt-6 p-6 neu-card-inset">
                  <h3 className="font-bold text-gray-900 mb-3 uppercase tracking-wide">SPECIAL REQUESTS</h3>
                  <p className="text-gray-700 font-medium">{booking.specialRequests}</p>
                </div>
              )}
            </div>

            {/* Property Information */}
            {property && (
              <div className="neu-card p-6 animate-fade-in-up-slow">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 uppercase tracking-wide">PROPERTY INFORMATION</h2>
                
                <div className="flex items-start space-x-4">
                  <img
                    src={(property?.images && property.images[0]) ? ((String(property.images[0]).startsWith('http')) ? property.images[0] : `${API_URL}${String(property.images[0]).replace(/\\/g, '/')}`) : 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=200&h=150&fit=crop'}
                    alt={property.title}
                    className="w-32 h-24 object-cover rounded-lg"
                    onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=200&h=150&fit=crop'; }}
                  />
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{property.title}</h3>
                    <div className="flex items-center text-gray-600 mb-2">
                      <FaMapMarkerAlt className="mr-2" />
                      <span>{property.address}, {property.city}</span>
                    </div>
                    <p className="text-gray-700 text-sm">{property.description}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Your Contact Information */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Your Contact Information</h2>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <FaEnvelope className="text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="font-semibold text-gray-900">{booking.guestContact?.email || 'Not provided'}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <FaPhone className="text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Phone</p>
                    <p className="font-semibold text-gray-900">{booking.guestContact?.phone || booking.contactPhone || 'Not provided'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Property Owner Contact Information */}
            {property?.host && (
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Property Owner Contact</h2>
                
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <FaUsers className="text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Owner Name</p>
                      <p className="font-semibold text-gray-900">{property.host.firstName} {property.host.lastName}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <FaEnvelope className="text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Email</p>
                      <p className="font-semibold text-gray-900">{property.host.email}</p>
                    </div>
                  </div>
                  
                  {property.host.phone && (
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <FaPhone className="text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Phone</p>
                        <p className="font-semibold text-gray-900">{property.host.phone}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-medium text-blue-900 mb-2">Important Note</h3>
                  <p className="text-sm text-blue-800">
                    You can now contact the property owner directly using the information above. 
                    Save these details for your stay and any questions you may have.
                  </p>
                </div>
              </div>
            )}

            {/* Important Information */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6">
              <h2 className="text-xl font-bold text-yellow-900 mb-4">Important Information</h2>
              <ul className="space-y-2 text-yellow-800">
                <li className="flex items-start">
                  <span className="text-yellow-600 mr-2">•</span>
                  <span>Please arrive at the property during check-in hours</span>
                </li>
                <li className="flex items-start">
                  <span className="text-yellow-600 mr-2">•</span>
                  <span>Bring a valid ID for verification</span>
                </li>
                <li className="flex items-start">
                  <span className="text-yellow-600 mr-2">•</span>
                  <span>Contact the property directly for any special arrangements</span>
                </li>
                <li className="flex items-start">
                  <span className="text-yellow-600 mr-2">•</span>
                  <span>Keep this confirmation code for your records</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="neu-card p-6 sticky top-8 animate-fade-in-up-slower">
              <h3 className="text-xl font-bold text-gray-900 mb-6 uppercase tracking-wide">BOOKING SUMMARY</h3>
              
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 font-semibold uppercase tracking-wide">TOTAL AMOUNT:</span>
                  <span className="font-bold text-gray-900 text-lg">RWF {booking.totalAmount?.toLocaleString()}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 font-semibold uppercase tracking-wide">STATUS:</span>
                  <span className={`px-4 py-2 rounded-full text-sm font-bold uppercase tracking-wide ${
                    booking.status === 'confirmed' ? 'neu-card-inset bg-green-100 text-green-800' :
                    booking.status === 'pending' ? 'neu-card-inset bg-yellow-100 text-yellow-800 animate-pulse' :
                    'neu-card-inset bg-gray-100 text-gray-800'
                  }`}>
                    {booking.status?.toUpperCase()}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 font-semibold uppercase tracking-wide">PAYMENT:</span>
                  <span className="text-gray-900 font-bold">{booking.paymentMethod?.replace('_', ' ').toUpperCase()}</span>
                </div>
              </div>

              <div className="mt-8 space-y-4">
                <button
                  onClick={() => setShowChat(true)}
                  className="w-full flex items-center justify-center space-x-3 btn-primary font-semibold tracking-wide"
                >
                  <FaComments />
                  <span>MESSAGE PROPERTY OWNER</span>
                </button>
                <div className="grid grid-cols-1 gap-3">
                  <a
                    href={`${API_URL}/api/bookings/${id}/receipt.csv`}
                    className="w-full text-center neu-btn font-semibold tracking-wide"
                  >
                    DOWNLOAD OWNER RECEIPT CSV
                  </a>
                  <a
                    href={`${API_URL}/api/bookings/${id}/rra-receipt.csv`}
                    className="w-full text-center neu-btn font-semibold tracking-wide"
                  >
                    DOWNLOAD RRA RECEIPT CSV
                  </a>
                </div>
                <button
                  onClick={() => setShowRRAReceipt(!showRRAReceipt)}
                  className="w-full flex items-center justify-center space-x-3 neu-btn font-semibold tracking-wide"
                >
                  <FaFileAlt />
                  <span>{showRRAReceipt ? 'HIDE RRA RECEIPT' : 'VIEW RRA TAX RECEIPT'}</span>
                </button>
                
                <button
                  onClick={() => setShowReceipt(!showReceipt)}
                  className="w-full flex items-center justify-center space-x-3 neu-btn font-semibold tracking-wide"
                >
                  <FaFileInvoice />
                  <span>{showReceipt ? 'HIDE RECEIPT' : 'VIEW BOOKING RECEIPT'}</span>
                </button>
                
                <button
                  onClick={handlePrint}
                  className="w-full flex items-center justify-center space-x-3 neu-btn font-semibold tracking-wide"
                >
                  <FaPrint />
                  <span>PRINT CONFIRMATION</span>
                </button>
                
                <button
                  onClick={handleShare}
                  className="w-full flex items-center justify-center space-x-3 neu-btn font-semibold tracking-wide"
                >
                  <FaShare />
                  <span>SHARE BOOKING</span>
                </button>
                
                <Link
                  to="/apartments"
                  className="w-full flex items-center justify-center space-x-3 btn-primary font-semibold tracking-wide"
                >
                  <FaHome />
                  <span>BROWSE MORE PROPERTIES</span>
                </Link>
              </div>

              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Need Help?</h4>
                <p className="text-sm text-blue-800 mb-3">
                  If you have any questions about your booking, please contact our support team.
                </p>
                <div className="text-sm text-blue-700">
                  <p>Email: support@akwanda.rw</p>
                  <p>Phone: +250 788 123 456</p>
                </div>
              </div>

              {/* Customer Support Section */}
              <div className="mt-6 p-4 bg-red-50 rounded-lg">
                <h4 className="font-medium text-red-900 mb-2">Report a Problem</h4>
                <p className="text-sm text-red-800 mb-3">
                  Having issues with your booking? Use your booking ID to report problems.
                </p>
                <div className="text-sm text-red-700">
                  <p><strong>Booking ID:</strong> {booking.confirmationCode}</p>
                  <p><strong>Support Email:</strong> support@akwanda.rw</p>
                  <p><strong>Emergency:</strong> +250 788 123 456</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RRA Receipt Modal */}
      {showRRAReceipt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">RRA Tax Receipt</h2>
              <button
                onClick={() => setShowRRAReceipt(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="p-4">
              <RRAReceiptComponent bookingId={id} />
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {showReceipt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Booking Receipt</h2>
              <button
                onClick={() => setShowReceipt(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="p-4">
              <ReceiptComponent bookingId={id} />
            </div>
          </div>
        </div>
      )}
      {/* Chat Modal */}
      {showChat && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col neu-card animate-fade-in-up">
            <div className="sticky top-0 bg-white/80 backdrop-blur border-b p-4 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold">{(property?.host?.firstName?.[0] || 'O').toUpperCase()}</div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 leading-tight">Chat with Property Owner</h2>
                  <div className="text-xs text-gray-500">Booking {booking?.confirmationCode}</div>
                </div>
              </div>
              <button onClick={() => setShowChat(false)} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
            </div>
            <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
              {messages.length === 0 ? (
                <div className="text-center text-gray-500 py-10">No messages yet. Start the conversation.</div>
              ) : (
                <div className="space-y-3">
                  {messages.map((m) => {
                    const isGuest = String(m.sender?._id || m.sender) === String(booking.guest);
                    const time = new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    return (
                      <div key={m._id} className={`flex items-end gap-2 ${isGuest ? 'justify-end' : 'justify-start'} animate-fade-in-up`}>
                        {!isGuest && (
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-xs">H</div>
                        )}
                        <div className={`max-w-[75%] rounded-2xl px-4 py-2 shadow-sm ${isGuest ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-white border rounded-bl-sm'}`}>
                          <div className={`text-[10px] mb-1 ${isGuest ? 'text-blue-100' : 'text-gray-500'}`}>{time}</div>
                          <div className={isGuest ? 'text-white' : 'text-gray-800'}>{m.message}</div>
                        </div>
                        {isGuest && (
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs">You</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {isTyping && <div className="mt-2 text-xs text-gray-500">Owner is typing...</div>}
            </div>
            <div className="p-4 border-t flex items-center gap-2 bg-white/60">
              <input
                value={newMessage}
                onChange={(e) => {
                  setNewMessage(e.target.value);
                  if (socketRef.current && booking?._id) {
                    socketRef.current.emit('typing', { bookingId: booking._id, typing: true });
                    if (typingTimeout.current) clearTimeout(typingTimeout.current);
                    typingTimeout.current = setTimeout(() => {
                      socketRef.current?.emit('typing', { bookingId: booking._id, typing: false });
                    }, 1200);
                  }
                }}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Type your message"
                className="flex-1 px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 bg-white neu-card"
              />
              <div className="relative">
                <input id="chat-attachment" type="file" className="hidden" onChange={(e)=> setAttachment(e.target.files && e.target.files[0] ? e.target.files[0] : null)} />
                <label htmlFor="chat-attachment" className="cursor-pointer px-3 py-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700">+
                </label>
              </div>
              {attachment && (
                <div className="text-xs text-gray-600 px-2 py-1 bg-gray-100 rounded">{attachment.name}</div>
              )}
              <button
                onClick={sendMessage}
                disabled={sending || (!newMessage.trim() && !attachment)}
                className="neu-btn px-5 py-3 disabled:opacity-50"
              >Send</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingConfirmation;
