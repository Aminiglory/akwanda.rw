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
  const [monthlyLoading, setMonthlyLoading] = useState(true);
  const [monthlyError, setMonthlyError] = useState('');
  const { user } = useAuth();

  const loadMonthly = async () => {
    try {
      setMonthlyLoading(true);
      setMonthlyError('');
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
        if (m.ok && Array.isArray(mData.months) && mData.months.length > 0) {
          setMonthly(mData);
        } else {
          // Fallback: last 6 months with zeros so chart is visible
          const end = new Date();
          const labels = [];
          for (let i = 5; i >= 0; i--) {
            const d = new Date(end.getFullYear(), end.getMonth() - i, 1);
            labels.push(d.toLocaleString('en', { month: 'short' }));
          }
          setMonthly({ months: labels, bookings: [0,0,0,0,0,0], confirmed: [0,0,0,0,0,0], cancelled: [0,0,0,0,0,0] });
        }
      } catch (e) {
        setMonthlyError(e.message || 'Failed to load chart');
        // Fallback labels to ensure chart area renders
        const end = new Date();
        const labels = [];
        for (let i = 5; i >= 0; i--) {
          const d = new Date(end.getFullYear(), end.getMonth() - i, 1);
          labels.push(d.toLocaleString('en', { month: 'short' }));
        }
        setMonthly({ months: labels, bookings: [0,0,0,0,0,0], confirmed: [0,0,0,0,0,0], cancelled: [0,0,0,0,0,0] });
      } finally {
        setMonthlyLoading(false);
      }
  };

  useEffect(() => { loadMonthly(); }, []);

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

        {/* Welcome + Chart (top of page) */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-blue-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold">Welcome, {user?.name || 'Admin'}</h2>
              <p className="text-sm text-gray-600">Here is the latest activity overview</p>
            </div>
            <div className="flex items-center gap-2">
              {monthlyLoading && <span className="text-sm text-gray-500">Loading…</span>}
              {monthlyError && <span className="text-sm text-red-600">{monthlyError}</span>}
              <button onClick={loadMonthly} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Refresh</button>
            </div>
          </div>
          <div className="w-full overflow-x-auto">
            {(() => {
              const months = monthly.months || [];
              const series = [
                { key: 'bookings', label: 'Bookings', values: monthly.bookings || [], color: 'stroke-blue-600', dot: 'fill-blue-600', fill: 'fill-blue-500/12' },
                { key: 'confirmed', label: 'Confirmed', values: monthly.confirmed || [], color: 'stroke-indigo-600', dot: 'fill-indigo-600', fill: 'fill-indigo-500/12' },
                { key: 'cancelled', label: 'Cancelled', values: monthly.cancelled || [], color: 'stroke-rose-600', dot: 'fill-rose-600', fill: 'fill-rose-500/12' }
              ];
              const rawMax = Math.max(1, ...series.flatMap(s => s.values));
              const niceMax = (m) => {
                if (m <= 5) return 5;
                const pow = Math.pow(10, Math.floor(Math.log10(m)) - 1);
                return Math.ceil(m / pow) * pow;
              };
              const max = niceMax(rawMax);
              const ticks = [0, Math.round(max * 0.5), max];
              const height = 260;
              const width = Math.max(520, months.length * 90 + 80);
              const chartTop = 24;
              const chartBottom = height - 42;
              const chartLeft = 44;
              const chartRight = width - 24;
              const xStep = months.length > 1 ? (chartRight - chartLeft) / (months.length - 1) : 0;
              const yScale = v => chartBottom - (v / max) * (chartBottom - chartTop);
              const xScale = i => chartLeft + i * xStep;
              const areaPath = vals => vals.map((v,i) => `${i===0?'M':'L'} ${xScale(i)} ${yScale(v)}`).join(' ') + ` L ${xScale(vals.length-1)} ${chartBottom} L ${xScale(0)} ${chartBottom} Z`;
              const linePath = vals => vals.map((v,i) => `${i===0?'M':'L'} ${xScale(i)} ${yScale(v)}`).join(' ');
              const lastIdx = Math.max(0, months.length - 1);
              return (
                <svg width={width} height={height} role="img" aria-label="Monthly bookings chart">
                  {/* grid */}
                  {ticks.map(t => (
                    <g key={`grid-${t}`}>
                      <line x1={chartLeft} y1={yScale(t)} x2={chartRight} y2={yScale(t)} className="stroke-gray-100" />
                      <text x={chartLeft - 8} y={yScale(t)+4} textAnchor="end" className="fill-gray-500 text-xs">{t}</text>
                    </g>
                  ))}
                  {/* axis */}
                  <line x1={chartLeft} y1={chartBottom} x2={chartRight} y2={chartBottom} className="stroke-gray-200" />
                  {months.map((m,i) => (
                    <text key={m} x={xScale(i)} y={height-10} textAnchor="middle" className="fill-gray-600 text-xs">{m}</text>
                  ))}
                  {/* series */}
                  {series.map(s => (
                    <g key={s.key}>
                      <path d={areaPath(s.values)} className={s.fill} />
                      <path d={linePath(s.values)} fill="none" className={`${s.color} stroke-2`} />
                      {s.values.map((v,i) => (
                        <g key={`${s.key}-pt-${i}`}>
                          <circle cx={xScale(i)} cy={yScale(v)} r="3.5" className={s.dot}>
                            <title>{`${s.label} – ${months[i]}: ${v}`}</title>
                          </circle>
                        </g>
                      ))}
                    </g>
                  ))}
                  {/* legend with latest values */}
                  {series.map((s, i) => (
                    <g key={s.key}>
                      <rect x={chartLeft + i*170} y={6} width="12" height="12" className={s.dot} />
                      <text x={chartLeft + 16 + i*170} y={16} className="fill-gray-700 text-xs">{s.label}: {s.values[lastIdx] ?? 0}</text>
                    </g>
                  ))}
                  {/* axis labels */}
                  <text x={chartLeft} y={12} className="fill-gray-500 text-xs">Monthly Trends</text>
                  <text x={chartRight} y={height-2} textAnchor="end" className="fill-gray-400 text-[10px]">Last {months.length} months</text>
                </svg>
              );
            })()}
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

        {/* Chart moved to top */}

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


