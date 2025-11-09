import React, { useEffect, useMemo, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function Transactions() {
  const [carBookings, setCarBookings] = useState([]);
  const [attrBookings, setAttrBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ type: 'all', from: '', to: '' });

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [carRes, attrRes] = await Promise.all([
          fetch(`${API_URL}/api/car-bookings/for-my-cars`, { credentials: 'include' }),
          fetch(`${API_URL}/api/attraction-bookings/for-my-attractions`, { credentials: 'include' })
        ]);
        const [carData, attrData] = await Promise.all([carRes.json(), attrRes.json()]);
        setCarBookings(carRes.ok ? (carData.bookings || []) : []);
        setAttrBookings(attrRes.ok ? (attrData.bookings || []) : []);
      } catch (_) {
        setCarBookings([]); setAttrBookings([]);
      } finally { setLoading(false); }
    })();
  }, []);

  const rows = useMemo(() => {
    const all = [];
    if (filters.type === 'all' || filters.type === 'car') {
      for (const b of carBookings) {
        all.push({
          kind: 'car',
          date: new Date(b.pickupDate),
          amount: Number(b.totalAmount || 0),
          title: b.car?.vehicleName || 'Car',
          code: String(b._id).slice(-8),
          status: b.status,
        });
      }
    }
    if (filters.type === 'all' || filters.type === 'attraction') {
      for (const b of attrBookings) {
        all.push({
          kind: 'attraction',
          date: new Date(b.visitDate),
          amount: Number(b.totalAmount || 0),
          title: b.attraction?.name || 'Attraction',
          code: String(b._id).slice(-8),
          status: b.status,
        });
      }
    }
    return all
      .filter(r => {
        if (filters.from) { const f = new Date(filters.from); if (r.date < f) return false; }
        if (filters.to) { const t = new Date(filters.to); if (r.date > t) return false; }
        return true;
      })
      .sort((a,b) => b.date - a.date);
  }, [carBookings, attrBookings, filters]);

  const totals = useMemo(() => {
    const sum = rows.reduce((s, r) => s + r.amount, 0);
    return { sum };
  }, [rows]);

  function exportCsv() {
    const header = ['Type','Date','Code','Title','Amount','Status'];
    const data = rows.map(r => [r.kind, r.date.toLocaleDateString(), r.code, r.title.replace(/,/g,' '), String(r.amount), r.status]);
    const csv = [header, ...data].map(line => line.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'transactions.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Transactions</h1>

      <div className="bg-white rounded-lg shadow p-4 mb-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs text-gray-600">Type</label>
          <select value={filters.type} onChange={e=>setFilters({ ...filters, type: e.target.value })} className="px-3 py-2 border rounded w-full">
            <option value="all">All</option>
            <option value="car">Car bookings</option>
            <option value="attraction">Attraction bookings</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-600">From</label>
          <input type="date" value={filters.from} onChange={e=>setFilters({ ...filters, from: e.target.value })} className="px-3 py-2 border rounded w-full" />
        </div>
        <div>
          <label className="block text-xs text-gray-600">To</label>
          <input type="date" value={filters.to} onChange={e=>setFilters({ ...filters, to: e.target.value })} className="px-3 py-2 border rounded w-full" />
        </div>
        <div className="flex items-end gap-2">
          <button onClick={exportCsv} className="px-3 py-2 bg-[#a06b42] hover:bg-[#8f5a32] text-white rounded">Export CSV</button>
          <button onClick={() => window.print()} className="px-3 py-2 bg-gray-100 rounded border">Print</button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <div className="text-sm text-gray-700">Total amount: <span className="font-semibold">RWF {totals.sum.toLocaleString()}</span></div>
        <div className="mt-2 text-xs text-gray-500">Tip: Keep confirmations on schedule to maintain high visibility and avoid fines.</div>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="p-3">Type</th>
                <th className="p-3">Date</th>
                <th className="p-3">Code</th>
                <th className="p-3">Title</th>
                <th className="p-3">Amount</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr key={idx} className="border-t">
                  <td className="p-3 capitalize">{r.kind}</td>
                  <td className="p-3">{r.date.toLocaleDateString()}</td>
                  <td className="p-3">{r.code}</td>
                  <td className="p-3">{r.title}</td>
                  <td className="p-3">RWF {r.amount.toLocaleString()}</td>
                  <td className="p-3">{r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
