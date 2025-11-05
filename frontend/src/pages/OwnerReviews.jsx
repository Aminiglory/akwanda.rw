import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FaStar, FaReply, FaCheckCircle, FaExclamationCircle, FaFilter } from 'react-icons/fa';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function OwnerReviews() {
  const [searchParams] = useSearchParams();
  const filter = searchParams.get('filter') || 'all';
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ totalReviews: 0, averageRating: 0, unrepliedCount: 0, fiveStarCount: 0, lowRatingCount: 0 });
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

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <FaStar
        key={i}
        className={`${i < rating ? 'text-yellow-400' : 'text-gray-300'}`}
      />
    ));
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
            value={`${stats.averageRating || 0} / 5`} 
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
                        {renderStars(review.rating)}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    {new Date(review.createdAt).toLocaleDateString()}
                  </div>
                </div>

                {/* Review Comment */}
                <div className="ml-16 mb-4">
                  <p className="text-gray-700">{review.comment}</p>
                </div>

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
