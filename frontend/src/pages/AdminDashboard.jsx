import React, { useEffect, useState } from 'react';
import { FaUsersCog, FaMoneyBill, FaCheckCircle, FaClock } from 'react-icons/fa';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const AdminDashboard = () => {
  const [metrics, setMetrics] = useState({ totalBookings: 0, pendingCommissions: 0, confirmed: 0 });
  const [ratePercent, setRatePercent] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/admin/overview`, { credentials: 'include' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to load overview');
        setMetrics(data.metrics);
      } catch (e) { toast.error(e.message); }
    })();
  }, []);

  const updateRate = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/api/admin/commission`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ratePercent: Number(ratePercent) })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update rate');
      toast.success('Commission rate updated');
      setRatePercent('');
    } catch (e) { toast.error(e.message); }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Admin Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-6 flex items-center gap-4">
            <FaUsersCog className="text-blue-600 text-3xl" />
            <div>
              <p className="text-sm text-gray-600">Total Bookings</p>
              <p className="text-2xl font-bold">{metrics.totalBookings}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6 flex items-center gap-4">
            <FaClock className="text-yellow-600 text-3xl" />
            <div>
              <p className="text-sm text-gray-600">Commission Pending</p>
              <p className="text-2xl font-bold">{metrics.pendingCommissions}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6 flex items-center gap-4">
            <FaCheckCircle className="text-green-600 text-3xl" />
            <div>
              <p className="text-sm text-gray-600">Confirmed Bookings</p>
              <p className="text-2xl font-bold">{metrics.confirmed}</p>
            </div>
          </div>
        </div>

        <form onSubmit={updateRate} className="bg-white rounded-2xl shadow-lg p-6 max-w-xl">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><FaMoneyBill className="text-green-600" /> Update Commission Rate</h2>
          <div className="flex gap-3">
            <input type="number" min="1" max="99" value={ratePercent} onChange={e => setRatePercent(e.target.value)} placeholder="Rate %" className="flex-1 border border-gray-300 rounded-lg px-4 py-3" />
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold">Save</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminDashboard;


