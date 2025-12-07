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
  const [submittingReview, setSubmittingReview] = useState(false);
  const [review, setReview] = useState({ rating: 0, comment: '' });

  // Defaults for resilient rendering
  const fallbackProperty = {
    images: ['https://via.placeholder.com/800x600?text=Property'],
    name: 'Your Property',
    location: '',
    address: '',
    amenities: []
  };

  const canCancel = () => {
    if (!booking) return false;
    const now = new Date();
    const ci = new Date(booking.checkIn);
    const beforeCheckIn = !isNaN(ci) ? now < ci : true;
    const notEndedOrCancelled = booking.status !== 'cancelled' && booking.status !== 'ended';
    // Guest who owns the booking or property owner can cancel before check-in; admin can always cancel
    const hostId = property?.host?._id || property?.host;
    const isOwner = hostId && user && String(hostId) === String(user._id);
    const isGuest = booking?.guest && (booking.guest._id ? String(booking.guest._id) === String(user?._id) : false);
    const isAdmin = user?.userType === 'admin';
    return notEndedOrCancelled && (isAdmin || (beforeCheckIn && (isGuest || isOwner)));
  };

  const cancelBooking = async () => {
    if (!booking?._id) return;
    try {
      const confirmMsg = 'Are you sure you want to cancel this booking?';
      if (!window.confirm(confirmMsg)) return;
      const res = await fetch(`${API_URL}/api/bookings/${booking._id}/cancel`, {
        method: 'POST',
        credentials: 'include'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Failed to cancel booking');
      toast.success('Booking cancelled');
      setBooking(prev => ({ ...prev, status: 'cancelled' }));
    } catch (e) {
      toast.error(e.message);
    }
  };

  const confirmAsOwner = async () => {
    if (!booking?._id) return;
    try {
      const res = await fetch(`${API_URL}/api/bookings/${booking._id}/confirm`, {
        method: 'POST',
        credentials: 'include'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Failed to confirm booking');
      toast.success('Booking confirmed');
      setBooking(prev => ({ ...prev, status: 'confirmed' }));
    } catch (e) {
      toast.error(e.message);
    }
  };

  const canReview = () => {
    if (!booking) return false;
    const now = new Date();
    const co = new Date(booking.checkOut);
    return now > co && !booking?.rating;
  };

  const submitReview = async () => {
    if (!review.rating || review.rating < 1 || review.rating > 5) {
      toast.error('Please select a rating between 1 and 5');
      return;
    }
    try {
      setSubmittingReview(true);
      const res = await fetch(`${API_URL}/api/bookings/${id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ rating: review.rating, comment: review.comment })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Failed to submit review');
      toast.success('Thank you for your review!');
      setBooking(prev => ({ ...prev, rating: review.rating, comment: review.comment }));
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSubmittingReview(false);
    }
  };

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
      const res = await fetch(`${API_URL}/api/bookings/${id}`, { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Failed to fetch booking');

      const b = data.booking;
      setBooking({
        _id: b._id,
        property: b.property,
        guest: {
          name: [b.guest?.firstName, b.guest?.lastName].filter(Boolean).join(' ') || 'Guest',
          email: b.guest?.email || '',
          phone: b.guest?.phone || ''
        },
        checkIn: b.checkIn,
        checkOut: b.checkOut,
        guests: b.numberOfGuests || 1,
        totalAmount: b.totalAmount || 0,
        status: b.status,
        paymentStatus: b.paymentStatus,
        bookingDate: b.createdAt,
        confirmationCode: b.confirmationCode,
        specialRequests: b.specialRequests || '',
        host: {
          name: '',
          email: '',
          phone: ''
        }
      });
      setProperty({
        images: (b.property?.images || []).map(u => (String(u).startsWith('http') ? u : `${API_URL}${u}`)),
        name: b.property?.title || 'Property',
        location: b.property?.city || '',
        address: b.property?.address || '',
        amenities: b.property?.amenities || [],
        rating: b.property?.rating || 0,
        reviews: b.property?.reviewsCount || 0,
        host: b.property?.host
      });
      setMessages([]);
    } catch (error) {
      toast.error(error.message || 'Failed to load booking details');
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

  // Final render when booking exists
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-blue-600 hover:text-blue-700 mb-4"
        >
          <FaArrowLeft className="mr-2" />
          Back
        </button>

        <div className="text-center">
          {booking.status === 'confirmed' ? (
            <>
              <FaCheckCircle className="text-6xl text-green-500 mx-auto mb-4" />
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Booking Confirmed!</h1>
              <p className="text-gray-600">Your reservation has been confirmed by the property owner.</p>
              <div className="mt-3 flex items-center justify-center gap-2 flex-wrap">
                <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-700 capitalize">{booking.status}</span>
                <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 capitalize">{booking.paymentStatus}</span>
                {booking.paymentMethod && (
                  <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700 capitalize">{booking.paymentMethod.replace(/_/g,' ')}</span>
                )}
                {booking.directBooking && (
                  <span className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-700">Direct booking</span>
                )}
              </div>
            </>
          ) : (
            <>
              <FaClock className="text-6xl text-yellow-500 mx-auto mb-4" />
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Awaiting Confirmation</h1>
              <p className="text-gray-600">Your booking is paid and pending owner confirmation. You'll be notified once the owner confirms.</p>
              <div className="mt-3 flex items-center justify-center gap-2 flex-wrap">
                <span className="text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-700 capitalize">{booking.status}</span>
                <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 capitalize">{booking.paymentStatus}</span>
                {booking.paymentMethod && (
                  <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700 capitalize">{booking.paymentMethod.replace(/_/g,' ')}</span>
                )}
                {booking.directBooking && (
                  <span className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-700">Direct booking</span>
                )}
              </div>
              {/* Owner quick confirm button */}
              {(() => {
                const hostId = property?.host?._id || property?.host;
                const isOwner = hostId && user && String(hostId) === String(user._id);
                return isOwner ? (
                  <button
                    onClick={confirmAsOwner}
                    className="mt-4 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                  >
                    Confirm this booking
                  </button>
                ) : null;
              })()}
            </>
          )}
        </div>

        {/* Actions row */}
        <div className="flex items-center justify-center gap-3 mt-4">
          {canCancel() && (
            <button onClick={cancelBooking} className="px-5 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg">
              Cancel booking
            </button>
          )}
        </div>

        {canReview() && (
          <div className="modern-card-elevated p-6 mt-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Rate your stay</h2>
            <p className="text-gray-600 mb-4">Share your experience to help the host improve.</p>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {[1,2,3,4,5].map(n => (
                <button
                  key={n}
                  onClick={() => setReview(r => ({ ...r, rating: n }))}
                  className={`px-3 py-1 rounded text-sm border ${review.rating === n ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                  aria-label={`Rate ${n} out of 5`}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="text-xs text-gray-600 mb-4">
              Overall score: <span className="font-semibold">{(review.rating ? review.rating * 2 : 0)}</span> / 10
            </div>
            <textarea
              className="w-full border border-gray-300 rounded-lg p-3 mb-4"
              placeholder="Write a comment (optional)"
              rows={4}
              value={review.comment}
              onChange={(e) => setReview(r => ({ ...r, comment: e.target.value }))}
            />
            <button
              onClick={submitReview}
              disabled={submittingReview || review.rating === 0}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
            >
              {submittingReview ? 'Submitting...' : 'Submit review'}
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="modern-card-elevated p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Property Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <img
                    loading="lazy"
                    src={(property?.images && property.images[0]) ? property.images[0] : fallbackProperty.images[0]}
                    alt={(property?.name || fallbackProperty.name)}
                    className="w-full h-48 object-cover rounded-lg mb-4"
                    onError={(e) => { e.currentTarget.src = fallbackProperty.images[0]; }}
                  />
                  <h3 className="text-xl font-semibold text-gray-900">{property?.name}</h3>
                  <p className="text-gray-600 flex items-center mt-2">
                    <FaMapMarkerAlt className="mr-2" />
                    {property?.location}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">{property?.address}</p>
                </div>
                <div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-sm text-gray-500">Check-in</div>
                      <div className="font-semibold">{formatDate(booking.checkIn)}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-sm text-gray-500">Check-out</div>
                      <div className="font-semibold">{formatDate(booking.checkOut)}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-sm text-gray-500">Guests</div>
                      <div className="font-semibold">{booking.guests}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-sm text-gray-500">Total</div>
                      <div className="font-semibold">RWF {(booking.totalAmount || 0).toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="modern-card-elevated p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Booking Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-gray-600">Status</div>
                  <div className="font-semibold capitalize">{booking.status}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-gray-600">Payment</div>
                  <div className="font-semibold capitalize">{booking.paymentStatus}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-gray-600">Confirmation code</div>
                  <div className="font-semibold">{booking.confirmationCode || '—'}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-gray-600">Booked on</div>
                  <div className="font-semibold">{booking.bookingDate ? new Date(booking.bookingDate).toLocaleString() : '—'}</div>
                </div>
              </div>
            </div>
          </div>
          <div>
            <div className="modern-card-elevated p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Booking Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-600">Status</span><span className="font-medium">{booking.status}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Payment</span><span className="font-medium">{booking.paymentStatus}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Code</span><span className="font-medium">{booking.confirmationCode || '—'}</span></div>
              </div>
              <a href="/my-bookings" className="mt-4 inline-block text-blue-600 hover:text-blue-700 text-sm">Go to My Bookings</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingConfirmation;