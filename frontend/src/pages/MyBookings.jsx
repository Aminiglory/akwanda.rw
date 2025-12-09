import React, { useEffect, useState } from 'react';
import { FaCalendarAlt, FaMoneyBill, FaMapMarkerAlt, FaExternalLinkAlt } from 'react-icons/fa';
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
  const [reviewDraft, setReviewDraft] = useState({
    rating: 0,          // legacy 1-5 stars
    overallScore10: 0,  // 0-10 scale for new review API
    title: '',
    comment: '',
    staff: 0,
    cleanliness: 0,
    locationScore: 0,
    facilities: 0,
    comfort: 0,
    valueForMoney: 0,
    highlightsText: '', // comma-separated highlights
  });

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

  const canCancel = (b) => {
    if (!b || !b.checkIn) return false;
    if (b.status === 'cancelled' || b.status === 'ended') return false;
    const now = new Date();
    const ci = new Date(b.checkIn);
    return now < ci;
  };

  const cancelBooking = async (b) => {
    if (!b || !b._id) return;
    try {
      const confirmed = window.confirm('Are you sure you want to cancel this booking?');
      if (!confirmed) return;
      const res = await fetch(`${API_URL}/api/bookings/${b._id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || 'Failed to cancel booking');
      }
      toast.success('Booking cancelled');
      setBookings((prev) => prev.map((x) => (x._id === b._id ? { ...x, status: 'cancelled' } : x)));
    } catch (e) {
      console.error('Failed to cancel booking:', e);
      toast.error(e.message || 'Failed to cancel booking');
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
      // Map 1-5 stars to 0-10 overall score
      const overallScore10 = Math.max(0, Math.min(10, Number(rating) * 2));
      await apiPost('/api/reviews', {
        bookingId: b._id,
        propertyId: b.property?._id || b.property,
        overallScore10,
        // keep categories empty for quick rating; owner will still see legacy 1-5
      });
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
    const existing = Number(b.rating || 0);
    setReviewDraft({
      rating: existing || 0,
      overallScore10: existing ? existing * 2 : 0,
      title: '',
      comment: '',
      staff: 0,
      cleanliness: 0,
      locationScore: 0,
      facilities: 0,
      comfort: 0,
      valueForMoney: 0,
      highlightsText: '',
    });
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
      const overallScore10 = Math.max(0, Math.min(10, Number(reviewDraft.overallScore10 || (reviewDraft.rating * 2))));
      const clamp10 = (v) => {
        const n = Number(v);
        if (Number.isNaN(n)) return 0;
        return Math.max(0, Math.min(10, n));
      };
      const highlights = String(reviewDraft.highlightsText || '')
        .split(',')
        .map(h => h.trim())
        .filter(Boolean);
      await apiPost('/api/reviews', {
        bookingId: activeBooking._id,
        propertyId: activeBooking.property?._id || activeBooking.property,
        overallScore10,
        staff: clamp10(reviewDraft.staff),
        cleanliness: clamp10(reviewDraft.cleanliness),
        locationScore: clamp10(reviewDraft.locationScore),
        facilities: clamp10(reviewDraft.facilities),
        comfort: clamp10(reviewDraft.comfort),
        valueForMoney: clamp10(reviewDraft.valueForMoney),
        title: reviewDraft.title,
        comment: reviewDraft.comment,
        highlights,
      });
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
                          (() => {
                            const score10 = Math.max(0, Math.min(10, Number(b.rating || 0) * 2));
                            return (
                              <div className="inline-flex items-center gap-2 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">
                                <div className="flex items-center justify-center w-7 h-7 rounded-md bg-blue-600 text-white text-sm font-bold">
                                  {score10.toFixed(1)}
                                </div>
                                <span className="text-[11px] font-semibold text-gray-900">Guest rating</span>
                              </div>
                            );
                          })()
                        ) : canReview(b) ? (
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="flex items-center gap-1">
                              {[1,2,3,4,5].map(n => (
                                <button
                                  key={n}
                                  disabled={!!ratingBusy[b._id]}
                                  onClick={() => submitQuickReview(b, n)}
                                  className={`px-2 py-1 text-xs rounded border ${ratingBusy[b._id] ? 'opacity-50' : ''} ${n === b.rating ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                                  aria-label={`Rate ${n} out of 5`}
                                >
                                  {n}
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
                        {canCancel(b) && (
                          <button
                            type="button"
                            onClick={() => cancelBooking(b)}
                            className="text-sm px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700"
                          >
                            Cancel booking
                          </button>
                        )}
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
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {[1,2,3,4,5].map(n => (
                    <button
                      key={n}
                      onClick={() => setReviewDraft(rd => ({ ...rd, rating: n, overallScore10: n * 2 }))}
                      className={`px-3 py-1 rounded text-sm border ${reviewDraft.rating === n ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                      aria-label={`Rate ${n} out of 5`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <div className="text-xs text-gray-600">
                  Overall score: <span className="font-semibold">{reviewDraft.overallScore10 || 0}</span> / 10
                </div>
              </div>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="Headline for your stay (optional)"
                value={reviewDraft.title}
                onChange={(e) => setReviewDraft(rd => ({ ...rd, title: e.target.value }))}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-gray-700">
                {[{
                  key: 'staff', label: 'Staff'
                }, {
                  key: 'cleanliness', label: 'Cleanliness'
                }, {
                  key: 'locationScore', label: 'Location'
                }, {
                  key: 'facilities', label: 'Facilities'
                }, {
                  key: 'comfort', label: 'Comfort'
                }, {
                  key: 'valueForMoney', label: 'Value for money'
                }].map((row) => (
                  <div key={row.key} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span>{row.label}</span>
                      <span className="font-semibold">{reviewDraft[row.key] || 0} / 10</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      step="1"
                      value={reviewDraft[row.key] || 0}
                      onChange={(e) => setReviewDraft(rd => ({ ...rd, [row.key]: Number(e.target.value) }))}
                      className="w-full accent-blue-600"
                    />
                  </div>
                ))}
              </div>
              <textarea
                className="w-full border border-gray-300 rounded-lg p-3"
                rows={4}
                placeholder="Share more about your stay (optional)"
                value={reviewDraft.comment}
                onChange={(e) => setReviewDraft(rd => ({ ...rd, comment: e.target.value }))}
              />
              <input
                type="text"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-700"
                placeholder="Highlights (comma separated, e.g. Very friendly staff, Clean rooms, Good breakfast)"
                value={reviewDraft.highlightsText}
                onChange={(e) => setReviewDraft(rd => ({ ...rd, highlightsText: e.target.value }))}
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
