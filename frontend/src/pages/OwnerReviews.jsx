import React, { useEffect, useState } from 'react';
import { FaStar, FaReply } from 'react-icons/fa';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function OwnerReviews() {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState({ average: 0, count: 0 });

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_URL}/api/properties/my-reviews/summary`, { credentials: 'include' });
        const data = await res.json();
        if (res.ok) setSummary(data.summary || { average: 0, count: 0 });
      } catch (_) {}
      finally { setLoading(false); }
    })();
  }, []);

  const Card = ({ title, value, color }) => (
    <div className="bg-white rounded-xl shadow p-6">
      <div className="text-sm text-gray-600">{title}</div>
      <div className={`text-3xl font-bold ${color}`}>{value}</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Reviews</h1>
          <p className="text-gray-600">Manage guest reviews and your responses.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card title="Average rating" value={`${summary.average?.toFixed?.(1) || 0} / 5`} color="text-blue-700" />
          <Card title="Total reviews" value={`${summary.count || 0}`} color="text-gray-900" />
          <Card title="Reviews with replies" value="—" color="text-green-700" />
        </div>

        <div className="bg-white rounded-xl shadow divide-y">
          {[].map((r) => (
            <div key={r._id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FaStar className="text-yellow-500" />
                  <div className="font-semibold text-gray-900">{r.title || 'Review'}</div>
                </div>
                <div className="text-sm text-gray-500">{new Date(r.createdAt).toLocaleDateString()}</div>
              </div>
              <div className="mt-2 text-sm text-gray-700">{r.comment}</div>
              <div className="mt-2">
                <button className="inline-flex items-center gap-2 px-3 py-2 border rounded text-sm text-gray-700 hover:bg-gray-50">
                  <FaReply /> Reply
                </button>
              </div>
            </div>
          ))}
          {loading && (
            <div className="p-6 text-sm text-gray-500">Loading reviews…</div>
          )}
          {!loading && (
            <div className="p-6 text-sm text-gray-500">
              Reviews listing coming soon. Your page is ready and styled to match.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
