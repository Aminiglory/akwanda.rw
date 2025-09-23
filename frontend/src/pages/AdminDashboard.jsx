import React, { useEffect, useState } from 'react';
import { FaUsersCog, FaMoneyBill, FaCheckCircle, FaClock } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const AdminDashboard = () => {
  const [metrics, setMetrics] = useState({ totalBookings: 0, pendingCommissions: 0, confirmed: 0 });
  const [ratePercent, setRatePercent] = useState('');
  const [pending, setPending] = useState([]);
  const { user } = useAuth();

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/admin/overview`, { credentials: 'include' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to load overview');
        setMetrics(data.metrics);
        const p = await fetch(`${API_URL}/api/admin/bookings/pending-commission`, { credentials: 'include' });
        const pData = await p.json();
        if (p.ok) setPending(pData.bookings || []);
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
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <div className="flex items-center gap-4">
            {user?.avatar ? (
              <img src={user.avatar} alt={user?.name} className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center text-lg font-bold">
                {(user?.name?.[0] || user?.email?.[0] || 'A').toUpperCase()}
              </div>
            )}
          </div>
        </div>
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

        <div className="mt-8 bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Pending Commissions</h2>
          <div className="space-y-4">
            {pending.map(b => (
              <div key={b._id} className="flex items-center justify-between border border-gray-100 rounded-xl p-4">
                <div>
                  <div className="font-medium text-gray-900">{b.property?.title}</div>
                  <div className="text-sm text-gray-600">Commission: RWF {b.commissionAmount?.toLocaleString()}</div>
                </div>
                <button onClick={async () => {
                  try {
                    const res = await fetch(`${API_URL}/api/bookings/${b._id}/commission/confirm`, {
                      method: 'POST', credentials: 'include'
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.message || 'Failed to confirm');
                    toast.success('Commission confirmed');
                    setPending(pending.filter(x => x._id !== b._id));
                  } catch (e) { toast.error(e.message); }
                }} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">Confirm</button>
              </div>
            ))}
            {pending.length === 0 && (
              <div className="text-gray-500">No pending commissions.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;


