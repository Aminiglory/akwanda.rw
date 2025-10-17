import React, { useEffect, useState } from 'react';
import { FaCalendarAlt, FaMoneyBill, FaMapMarkerAlt, FaStar, FaExternalLinkAlt } from 'react-icons/fa';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { safeApiGet, apiPost } from '../utils/apiUtils';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const MyBookings = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ratingBusy, setRatingBusy] = useState({});

  const loadBookings = async () => {
    setLoading(true);
    try {
      const data = await safeApiGet('/api/bookings/mine', {
        fallback: { bookings: [] },
        timeout: 15000
      });
      setBookings(data.bookings || []);
    } catch (e) {
      console.error('Failed to load bookings:', e);
      toast.error(e.message || 'Failed to load bookings');
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  const canReview = (b) => {
    if (!b?.checkOut) return false;
    const now = new Date();
    const co = new Date(b.checkOut);
    return now > co && !b?.rating;
  };

  const submitQuickReview = async (b, rating) => {
    try {
      setRatingBusy(prev => ({ ...prev, [b._id]: true }));
      const data = await apiPost(`/api/bookings/${b._id}/review`, { rating });
      toast.success('Thanks for your rating!');
      // Refresh item in list
      setBookings(prev => prev.map(x => x._id === b._id ? { ...x, rating } : x));
    } catch (e) {
      console.error('Failed to submit review:', e);
      toast.error(e.message || 'Failed to submit review');
    } finally {
      setRatingBusy(prev => ({ ...prev, [b._id]: false }));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">My Bookings</h1>
        </div>

        {loading ? (
          <div className="text-center text-gray-600 py-16">Loading your bookings...</div>
        ) : bookings.length === 0 ? (
          <div className="text-center text-gray-600 py-16">
            You have no bookings yet.
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map(b => (
              <div key={b._id} className="bg-white rounded-xl shadow p-5 border border-gray-100">
                <div className="flex items-start gap-4">
                  <img
                    src={(b.property?.images?.[0] || '').startsWith('http') ? b.property?.images?.[0] : `${API_URL}${b.property?.images?.[0] || ''}`}
                    alt={b.property?.title}
                    className="w-28 h-24 object-cover rounded-lg"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-lg font-semibold text-gray-900">{b.property?.title || 'Property'}</div>
                        <div className="text-sm text-gray-600 flex items-center gap-2">
                          <FaMapMarkerAlt /> {b.property?.city || ''} {b.property?.address ? `• ${b.property.address}` : ''}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-xs inline-block px-2 py-1 rounded ${
                          b.status === 'confirmed' ? 'bg-green-100 text-green-700' : 
                          b.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 
                          b.status === 'awaiting' ? 'bg-orange-100 text-orange-700' :
                          b.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                          b.status === 'ended' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>{b.status}</div>
                        <div className="text-xs text-gray-500">{b.paymentStatus}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                      <div className="flex items-center gap-2 text-gray-700"><FaCalendarAlt /> Check-in: {new Date(b.checkIn).toLocaleDateString()}</div>
                      <div className="flex items-center gap-2 text-gray-700"><FaCalendarAlt /> Check-out: {new Date(b.checkOut).toLocaleDateString()}</div>
                      <div className="flex items-center gap-2 text-gray-700"><FaMoneyBill /> Total: RWF {(b.totalAmount || 0).toLocaleString()}</div>
                    </div>

                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center gap-2">
                        {b.rating ? (
                          <div className="flex items-center gap-1 text-yellow-600"><FaStar /> {b.rating} / 5</div>
                        ) : canReview(b) ? (
                          <div className="flex items-center gap-1">
                            {[1,2,3,4,5].map(n => (
                              <button
                                key={n}
                                disabled={!!ratingBusy[b._id]}
                                onClick={() => submitQuickReview(b, n)}
                                className={`text-xl ${n <= 3 ? 'text-yellow-500' : 'text-yellow-600'} ${ratingBusy[b._id] ? 'opacity-50' : ''}`}
                                aria-label={`Rate ${n}`}
                              >
                                ★
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500">Rating available after checkout</div>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <Link to={`/booking-confirmation/${b._id}`} className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1">
                          View details <FaExternalLinkAlt className="text-xs" />
                        </Link>
                        <Link
                          to={`/booking/${b.property?._id || b.property}?checkIn=${encodeURIComponent(b.checkIn)}&checkOut=${encodeURIComponent(b.checkOut)}&guests=${encodeURIComponent(b.guests || 1)}${b.room ? `&roomId=${encodeURIComponent(b.room)}` : ''}`}
                          className="text-sm px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800"
                          title="Rebook this stay"
                        >
                          Rebook
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyBookings;
