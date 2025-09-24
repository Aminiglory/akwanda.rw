import React, { useEffect, useState } from 'react';
import { FaUsersCog, FaMoneyBill, FaCheckCircle, FaClock } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const AdminDashboard = () => {
  const [metrics, setMetrics] = useState({ totalBookings: 0, pendingCommissions: 0, confirmed: 0 });
  const [ratePercent, setRatePercent] = useState('');
  const [pending, setPending] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [monthly, setMonthly] = useState({ months: [], bookings: [], confirmed: [], cancelled: [] });
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
        const n = await fetch(`${API_URL}/api/admin/notifications`, { credentials: 'include' });
        const nData = await n.json();
        if (n.ok) setNotifications(nData.notifications || []);
        const m = await fetch(`${API_URL}/api/admin/stats/monthly`, { credentials: 'include' });
        const mData = await m.json();
        if (m.ok) setMonthly(mData);
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
          <div className="rounded-2xl p-6 bg-gradient-to-b from-blue-50 to-white border border-blue-100 shadow-sm flex items-center gap-4">
            <FaUsersCog className="text-blue-600 text-3xl" />
            <div>
              <p className="text-sm text-gray-600">Total Bookings</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.totalBookings}</p>
            </div>
          </div>
          <div className="rounded-2xl p-6 bg-gradient-to-b from-blue-50/60 to-white border border-blue-100 shadow-sm flex items-center gap-4">
            <FaClock className="text-blue-600 text-3xl" />
            <div>
              <p className="text-sm text-gray-600">Commission Pending</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.pendingCommissions}</p>
            </div>
          </div>
          <div className="rounded-2xl p-6 bg-gradient-to-b from-blue-50/60 to-white border border-blue-100 shadow-sm flex items-center gap-4">
            <FaCheckCircle className="text-blue-600 text-3xl" />
            <div>
              <p className="text-sm text-gray-600">Confirmed Bookings</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.confirmed}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-blue-100">
          <h2 className="text-xl font-semibold mb-4">Activity Overview</h2>
          <div className="w-full overflow-x-auto">
            {(() => {
              const months = monthly.months || [];
              const series = [
                { key: 'bookings', label: 'Bookings', values: monthly.bookings || [], color: 'stroke-blue-500', fill: 'fill-blue-500/20' },
                { key: 'confirmed', label: 'Confirmed', values: monthly.confirmed || [], color: 'stroke-green-500', fill: 'fill-green-500/20' },
                { key: 'cancelled', label: 'Cancelled', values: monthly.cancelled || [], color: 'stroke-red-500', fill: 'fill-red-500/20' }
              ];
              const max = Math.max(1, ...series.flatMap(s => s.values));
              const height = 220;
              const width = Math.max(360, months.length * 80 + 60);
              const xStep = (width - 60) / Math.max(1, months.length - 1);
              const yScale = v => height - 30 - (v / max) * (height - 60);
              const xScale = i => 30 + i * xStep;
              const areaPath = vals => vals.map((v,i) => `${i===0?'M':'L'} ${xScale(i)} ${yScale(v)}`).join(' ') + ` L ${xScale(vals.length-1)} ${height-30} L ${xScale(0)} ${height-30} Z`;
              const linePath = vals => vals.map((v,i) => `${i===0?'M':'L'} ${xScale(i)} ${yScale(v)}`).join(' ');
              return (
                <svg width={width} height={height} role="img" aria-label="Monthly bookings chart">
                  {/* axes */}
                  <line x1="30" y1={height-30} x2={width-20} y2={height-30} className="stroke-gray-200" />
                  <line x1="30" y1="20" x2="30" y2={height-30} className="stroke-gray-200" />
                  {months.map((m,i) => (
                    <text key={m} x={xScale(i)} y={height-10} textAnchor="middle" className="fill-gray-600 text-xs">{m}</text>
                  ))}
                  {series.map(s => (
                    <g key={s.key}>
                      <path d={areaPath(s.values)} className={s.fill} />
                      <path d={linePath(s.values)} fill="none" className={`${s.color} stroke-2`} />
                    </g>
                  ))}
                  {/* legend */}
                  {series.map((s, i) => (
                    <g key={s.key}>
                      <rect x={40 + i*120} y={10} width="12" height="12" className={s.fill.replace('20','60')} />
                      <text x={58 + i*120} y={20} className="fill-gray-700 text-xs">{s.label}</text>
                    </g>
                  ))}
                </svg>
              );
            })()}
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
        <div className="mt-8 bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Notifications</h2>
          <div className="space-y-3">
            {notifications.map(n => (
              <div key={n._id} className={`p-4 rounded-xl border ${!n.isRead ? 'bg-blue-50 border-blue-300' : 'bg-gray-50 border-gray-200'} flex items-start justify-between`}>
                <div>
                  <div className="font-semibold text-gray-800">{n.title}</div>
                  <div className="text-gray-600 text-sm whitespace-pre-line">{n.message}</div>
                  {n.booking && n.booking.guest && (
                    <div className="mt-2 text-sm text-gray-700">
                      <span className="font-medium">Guest:</span> {n.booking.guest.firstName} {n.booking.guest.lastName}
                      {n.booking.guest.phone && <span className="ml-4 font-medium">Phone:</span>} {n.booking.guest.phone}
                    </div>
                  )}
                  {n.property && (
                    <div className="text-sm text-gray-700"><span className="font-medium">Property:</span> {n.property.title}</div>
                  )}
                </div>
                <div className="flex items-center gap-3 ml-4">
                  {(() => {
                    const ts = n.createdAt ? new Date(n.createdAt) : null;
                    const diff = ts ? (Date.now() - ts.getTime()) : 0;
                    const mins = Math.floor(diff / 60000);
                    const hours = Math.floor(mins / 60);
                    const days = Math.floor(hours / 24);
                    const rel = ts ? (days > 0 ? `${days}d ago` : hours > 0 ? `${hours}h ago` : mins > 0 ? `${mins}m ago` : 'just now') : '';
                    const showNew = !n.isRead && diff < 24*60*60*1000;
                    return (
                      <>
                        <span className="text-xs text-gray-500" title={ts ? ts.toLocaleString() : ''}>{rel}</span>
                        {showNew && <span className="px-2 py-1 bg-blue-600 text-white rounded-full text-xs">New</span>}
                      </>
                    );
                  })()}
                  {!n.isRead && (
                    <button
                      className="text-blue-600 text-xs hover:underline"
                      onClick={async () => {
                        try {
                          await fetch(`${API_URL}/api/admin/notifications/${n._id}/read`, { method: 'POST', credentials: 'include' });
                          setNotifications(prev => prev.map(x => x._id === n._id ? { ...x, isRead: true } : x));
                        } catch (_) {}
                      }}
                    >
                      Mark as read
                    </button>
                  )}
                </div>
              </div>
            ))}
            {notifications.length === 0 && (
              <div className="text-gray-500">No notifications.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;


