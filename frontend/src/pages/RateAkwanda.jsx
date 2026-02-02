import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FaStar } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const RateAkwanda = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth() || {};

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  const canSubmit = useMemo(() => rating >= 1 && rating <= 5 && !saving, [rating, saving]);

  useEffect(() => {
    (async () => {
      if (!isAuthenticated) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`${API_URL}/api/platform-ratings/me`, { credentials: 'include' });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data?.rating) {
          setRating(Number(data.rating.rating || 0));
          setComment(String(data.rating.comment || ''));
        }
      } catch (_) {
      } finally {
        setLoading(false);
      }
    })();
  }, [isAuthenticated]);

  const submit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    try {
      setSaving(true);
      const res = await fetch(`${API_URL}/api/platform-ratings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ rating, comment })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || 'Failed to submit rating');
      toast.success('Thank you for rating Akwanda');
      navigate('/');
    } catch (e2) {
      toast.error(e2.message);
    } finally {
      setSaving(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="modern-card p-6 max-w-lg w-full text-center">
          <h1 className="text-2xl font-bold text-gray-900">Rate Akwanda</h1>
          <p className="text-gray-600 mt-2">Please sign in to rate your experience.</p>
          <button
            onClick={() => navigate('/login')}
            className="mt-4 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="modern-card p-6">
          <h1 className="text-2xl font-bold text-gray-900">Rate Akwanda</h1>
          <p className="text-gray-600 mt-1">
            Your feedback helps improve the platform for both hosts and guests.
          </p>

          {loading ? (
            <div className="mt-6 text-gray-600">Loading…</div>
          ) : (
            <form onSubmit={submit} className="mt-6 space-y-4">
              <div>
                <div className="text-sm font-semibold text-gray-800 mb-2">Overall rating</div>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      type="button"
                      key={n}
                      onClick={() => setRating(n)}
                      className="p-1"
                      aria-label={`Rate ${n} star`}
                    >
                      <FaStar className={(rating >= n ? 'text-yellow-400' : 'text-gray-300') + ' text-2xl'} />
                    </button>
                  ))}
                  <span className="ml-2 text-sm text-gray-700">{rating ? `${rating}/5` : 'Select'}</span>
                </div>
              </div>

              <div>
                <div className="text-sm font-semibold text-gray-800 mb-2">Comment (optional)</div>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={4}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Tell us what you liked or what we can improve"
                />
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
                >
                  {saving ? 'Submitting…' : 'Submit'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default RateAkwanda;
