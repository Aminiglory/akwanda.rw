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
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [activeBooking, setActiveBooking] = useState(null);
  const [reviewDraft, setReviewDraft] = useState({ rating: 0, comment: '' });

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
      await apiPost(`/api/bookings/${b._id}/review`, { rating });
      toast.success('Thanks for your rating!');
      setBookings(prev => prev.map(x => x._id === b._id ? { ...x, rating } : x));
    } catch (e) {
      console.error('Failed to submit review:', e);
      toast.error(e.message || 'Failed to submit review');
    } finally {
      setRatingBusy(prev => ({ ...prev, [b._id]: false }));
    }
  };

  const openReviewModal = (b) => {
    setActiveBooking(b);
    setReviewDraft({ rating: b.rating || 0, comment: '' });
    setShowReviewModal(true);
  };

  const submitReviewWithComment = async () => {
    if (!activeBooking) return;
    if (!(reviewDraft.rating >= 1 && reviewDraft.rating <= 5)) {
      toast.error('Please choose a rating 1-5');
      return;
    }
    try {
      setRatingBusy(prev => ({ ...prev, [activeBooking._id]: true }));
      await apiPost(`/api/bookings/${activeBooking._id}/review`, { rating: reviewDraft.rating, comment: reviewDraft.comment });
      toast.success('Review submitted');
      setBookings(prev => prev.map(x => x._id === activeBooking._id ? { ...x, rating: reviewDraft.rating } : x));
      setShowReviewModal(false);
      setActiveBooking(null);
    } catch (e) {
      toast.error(e.message || 'Failed to submit review');
    } finally {
      setRatingBusy(prev => ({ ...prev, [activeBooking?._id]: false }));
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
                          <div className="flex items-center gap-2 flex-wrap">
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
                            <button
                              onClick={() => openReviewModal(b)}
                              className="text-xs px-2 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100"
                            >
                              Write review
                            </button>
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
      {/* Review Modal (responsive) */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowReviewModal(false)} />
          <div className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <div className="font-semibold">Write a review</div>
              <button className="p-2 rounded hover:bg-gray-100" onClick={() => setShowReviewModal(false)} aria-label="Close">✕</button>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex items-center gap-2">
                {[1,2,3,4,5].map(n => (
                  <button
                    key={n}
                    onClick={() => setReviewDraft(rd => ({ ...rd, rating: n }))}
                    className={`text-2xl ${reviewDraft.rating >= n ? 'text-yellow-500' : 'text-gray-300'}`}
                    aria-label={`Rate ${n}`}
                  >
                    ★
                  </button>
                ))}
              </div>
              <textarea
                className="w-full border border-gray-300 rounded-lg p-3"
                rows={4}
                placeholder="Share more about your stay (optional)"
                value={reviewDraft.comment}
                onChange={(e) => setReviewDraft(rd => ({ ...rd, comment: e.target.value }))}
              />
            </div>
            <div className="p-4 border-t flex flex-col sm:flex-row gap-2">
              <button className="px-4 py-2 rounded-lg border" onClick={() => setShowReviewModal(false)}>Cancel</button>
              <button
                className="px-4 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-50"
                disabled={ratingBusy[activeBooking?._id] || reviewDraft.rating === 0}
                onClick={submitReviewWithComment}
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyBookings;
