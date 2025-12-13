import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FaStar, FaReply, FaCheckCircle, FaExclamationCircle, FaFilter, FaThumbsUp, FaThumbsDown } from 'react-icons/fa';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function OwnerReviews() {
  const [searchParams] = useSearchParams();
  const filter = searchParams.get('filter') || 'all';
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ totalReviews: 0, averageRating: 0, unrepliedCount: 0, fiveStarCount: 0, lowRatingCount: 0, pendingCount: 0, approvedCount: 0, rejectedCount: 0 });
  const [reviews, setReviews] = useState([]);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchReviews();
  }, [filter]);

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_URL}/api/reviews/stats`, { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      setStats(data.stats || {});
    } catch (e) {
      console.error('Failed to fetch stats:', e);
    }
  };

  const handleApprove = async (review) => {
    try {
      const res = await fetch(`${API_URL}/api/reviews/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ propertyId: review.property._id, ratingId: review._id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Failed to approve review');
      toast.success('Review approved');
      fetchReviews();
      fetchStats();
    } catch (e) {
      toast.error(e.message || 'Failed to approve review');
    }
  };

  const handleReject = async (review) => {
    try {
      const res = await fetch(`${API_URL}/api/reviews/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ propertyId: review.property._id, ratingId: review._id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Failed to reject review');
      toast.success('Review rejected');
      fetchReviews();
      fetchStats();
    } catch (e) {
      toast.error(e.message || 'Failed to reject review');
    }
  };

  const fetchReviews = async () => {
    try {
      setLoading(true);
      let url = `${API_URL}/api/reviews/my-reviews`;
      if (filter && filter !== 'all') {
        url += `?filter=${filter}`;
      }
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch reviews');
      const data = await res.json();
      setReviews(data.reviews || []);
    } catch (e) {
      toast.error(e.message);
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async (propertyId, ratingId) => {
    if (!replyText.trim()) {
      toast.error('Please enter a reply');
      return;
    }
    try {
      setSubmitting(true);
      const res = await fetch(`${API_URL}/api/reviews/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          propertyId,
          ratingId,
          reply: replyText
        })
      });
      if (!res.ok) throw new Error('Failed to post reply');
      toast.success('Reply posted successfully');
      setReplyingTo(null);
      setReplyText('');
      fetchReviews();
      fetchStats();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const renderRatingBadge = (review) => {
    const hasOverall10 = typeof review.overallScore10 === 'number' && !Number.isNaN(review.overallScore10);
    const score10 = hasOverall10 ? review.overallScore10 : (Number(review.rating) || 0) * 2;
    if (!score10) return null;

    let label;
    if (score10 >= 8) {
      label = 'Very good';
    } else if (score10 >= 5) {
      label = 'Super';
    } else if (score10 >= 1) {
      label = 'Good';
    } else {
      label = 'Guest rating';
    }

    return (
      <span className="inline-flex items-center gap-2 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">
        <div className="flex items-center justify-center w-7 h-7 rounded-md bg-blue-600 text-white text-sm font-bold">
          {score10.toFixed(1)}
        </div>
        <span className="text-[11px] font-semibold text-gray-900">{label}</span>
      </span>
    );
  };

  const getFilteredCount = () => {
    switch(filter) {
      case 'unreplied': return stats.unrepliedCount;
      case '5-star': return stats.fiveStarCount;
      case 'low': return stats.lowRatingCount;
      default: return stats.totalReviews;
    }
  };

  const StatCard = ({ title, value, color, icon: Icon }) => (
    <div className="bg-white rounded-xl shadow p-6">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm text-gray-600">{title}</div>
        {Icon && <Icon className={`text-xl ${color}`} />}
      </div>
      <div className={`text-3xl font-bold ${color}`}>{value}</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Guest Reviews</h1>
          <p className="text-gray-600">Manage guest reviews and your responses.</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <StatCard 
            title="Average Rating" 
            value={`${((Number(stats.averageRating) || 0) * 2).toFixed(1)} / 10`} 
            color="text-blue-700" 
            icon={FaStar}
          />
          <StatCard 
            title="Total Reviews" 
            value={stats.totalReviews || 0} 
            color="text-gray-900"
          />
          <StatCard 
            title="Unreplied" 
            value={stats.unrepliedCount || 0} 
            color="text-orange-600"
            icon={FaExclamationCircle}
          />
          <StatCard 
            title="5-Star Reviews" 
            value={stats.fiveStarCount || 0} 
            color="text-green-600"
            icon={FaCheckCircle}
          />
        </div>

        {/* Filter Tabs */}
        <div className="bg-white rounded-xl shadow mb-6">
          <div className="flex items-center gap-2 p-4 border-b overflow-x-auto">
            <FaFilter className="text-gray-500" />
            <a 
              href="/owner/reviews?filter=all"
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
                filter === 'all' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              All Reviews ({stats.totalReviews || 0})
            </a>
            <a 
              href="/owner/reviews?filter=unreplied"
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
                filter === 'unreplied' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Unreplied ({stats.unrepliedCount || 0})
            </a>
            <a 
              href="/owner/reviews?filter=5-star"
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
                filter === '5-star' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              5-Star ({stats.fiveStarCount || 0})
            </a>
            <a 
              href="/owner/reviews?filter=low"
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
                filter === 'low' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Low Ratings ({stats.lowRatingCount || 0})
            </a>
            <a 
              href="/owner/reviews?filter=pending"
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
                filter === 'pending' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Pending ({stats.pendingCount || 0})
            </a>
            <a 
              href="/owner/reviews?filter=approved"
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
                filter === 'approved' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Approved ({stats.approvedCount || 0})
            </a>
            <a 
              href="/owner/reviews?filter=rejected"
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
                filter === 'rejected' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Rejected ({stats.rejectedCount || 0})
            </a>
          </div>
        </div>

        {/* Reviews List */}
        <div className="bg-white rounded-xl shadow divide-y">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading reviews…</div>
          ) : reviews.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No reviews found for this filter.
            </div>
          ) : (
            reviews.map((review) => (
              <div key={review._id} className="p-6">
                {/* Review Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4">
                    <img 
                      src={review.guest?.profilePicture || 'https://via.placeholder.com/50'}
                      alt={review.guest?.fullName}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <div>
                      <div className="font-semibold text-gray-900">
                        {review.guest?.fullName || 'Anonymous'}
                      </div>
                      <div className="text-sm text-gray-600">
                        {review.property?.title}
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        {renderRatingBadge(review)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right text-sm text-gray-500 space-y-1">
                    <div>{new Date(review.createdAt).toLocaleDateString()}</div>
                    <div>
                      {review.status === 'approved' && (
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">Approved</span>
                      )}
                      {review.status === 'pending' && (
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-yellow-100 text-yellow-800">Pending approval</span>
                      )}
                      {review.status === 'rejected' && (
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700">Rejected</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Review Comment */}
                <div className="ml-16 mb-4 space-y-3">
                  <p className="text-gray-700">{review.comment}</p>

                  {(() => {
                    const hasAspects = [
                      review.staff,
                      review.cleanliness,
                      review.locationScore,
                      review.facilities,
                      review.comfort,
                      review.valueForMoney,
                    ].some(v => typeof v === 'number' && !Number.isNaN(v));

                    if (!hasAspects) return null;

                    const rows = [
                      { key: 'staff', label: 'Staff', value: review.staff },
                      { key: 'cleanliness', label: 'Cleanliness', value: review.cleanliness },
                      { key: 'locationScore', label: 'Location', value: review.locationScore },
                      { key: 'facilities', label: 'Facilities', value: review.facilities },
                      { key: 'comfort', label: 'Comfort', value: review.comfort },
                      { key: 'valueForMoney', label: 'Value for money', value: review.valueForMoney },
                    ].filter(r => typeof r.value === 'number' && !Number.isNaN(r.value));

                    if (!rows.length) return null;

                    return (
                      <div className="mt-1 pt-3 border-t border-gray-100">
                        <p className="text-xs font-semibold text-gray-500 mb-2">Aspect scores</p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-gray-700">
                          {rows.map(row => (
                            <div key={row.key} className="flex items-center justify-between">
                              <span>{row.label}</span>
                              <span className="font-semibold">{Number(row.value).toFixed(1)} / 10</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Approval controls for pending reviews */}
                {review.status === 'pending' && (
                  <div className="ml-16 mb-3 flex items-center gap-2">
                    <button
                      onClick={() => handleApprove(review)}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs hover:bg-green-700"
                    >
                      <FaThumbsUp className="text-xs" /> Approve
                    </button>
                    <button
                      onClick={() => handleReject(review)}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs hover:bg-red-700"
                    >
                      <FaThumbsDown className="text-xs" /> Reject
                    </button>
                  </div>
                )}

                {/* Reply Section */}
                {review.replied ? (
                  <div className="ml-16 bg-blue-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <FaReply className="text-blue-600" />
                      <span className="font-semibold text-blue-900">Your Reply</span>
                    </div>
                    <p className="text-gray-700">{review.reply}</p>
                  </div>
                ) : replyingTo === review._id ? (
                  <div className="ml-16 space-y-3">
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Write your reply..."
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      rows="3"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleReply(review.property._id, review._id)}
                        disabled={submitting}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                      >
                        {submitting ? 'Posting...' : 'Post Reply'}
                      </button>
                      <button
                        onClick={() => {
                          setReplyingTo(null);
                          setReplyText('');
                        }}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="ml-16">
                    <button
                      onClick={() => setReplyingTo(review._id)}
                      className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <FaReply /> Reply to Review
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
