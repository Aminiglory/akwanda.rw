import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const AnalyticsPanel = ({ propertyOptions = [] }) => {
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState({
    occupancyDaily: [], // [{date, occupancyPercent}]
    adrDaily: [],       // [{date, value}]
    revparDaily: [],    // [{date, value}]
    totals: { occupancyAvg: 0, adrAvg: 0, revparAvg: 0, conversions: 0, cancellations: 0 }
  });
  const [filters, setFilters] = useState({ propertyId: '', from: '', to: '' });

  const load = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (filters.propertyId) q.set('property', filters.propertyId);
      if (filters.from) q.set('from', new Date(filters.from).toISOString());
      if (filters.to) q.set('to', new Date(filters.to).toISOString());
      const res = await fetch(`${API_URL}/api/analytics/owner?${q.toString()}`, { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to load analytics');
      setMetrics({
        occupancyDaily: data.occupancyDaily || [],
        adrDaily: data.adrDaily || [],
        revparDaily: data.revparDaily || [],
        totals: data.totals || { occupancyAvg: 0, adrAvg: 0, revparAvg: 0, conversions: 0, cancellations: 0 }
      });
    } catch (e) { toast.error(e.message); } finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-line */ }, [filters.propertyId, filters.from, filters.to]);

  const exportCSV = () => {
    const rows = [['Date','Occupancy%','ADR','RevPAR']];
    const byDate = new Map();
    metrics.occupancyDaily.forEach(d => byDate.set(d.date, { date: d.date, occ: d.occupancyPercent, adr: '', rev: '' }));
    metrics.adrDaily.forEach(d => byDate.set(d.date, { ...(byDate.get(d.date)||{ date: d.date }), adr: d.value, occ: (byDate.get(d.date)||{}).occ || '', rev: (byDate.get(d.date)||{}).rev || '' }));
    metrics.revparDaily.forEach(d => byDate.set(d.date, { ...(byDate.get(d.date)||{ date: d.date }), rev: d.value, adr: (byDate.get(d.date)||{}).adr || '', occ: (byDate.get(d.date)||{}).occ || '' }));
    Array.from(byDate.values()).forEach(r => rows.push([r.date, r.occ, r.adr, r.rev]));
    const csv = rows.map(r=>r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'analytics.csv'; a.click();
  };

  const BarChart = ({ data = [], label = '', color = 'bg-blue-600' }) => {
    const max = Math.max(1, ...data.map(d => Number(d.value || d.occupancyPercent || 0)));
    return (
      <div className="bg-white rounded-xl border p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold text-gray-900">{label}</div>
          <button onClick={exportCSV} className="text-sm px-3 py-1 border rounded">Export</button>
        </div>
        <div className="h-32 flex items-end gap-1">
          {data.slice(-30).map((d, i) => (
            <div key={i} className={`${color}`} style={{ height: `${(Number(d.value || d.occupancyPercent || 0)/max)*100}%`, width: '3.2%' }} title={`${d.date}: ${Number(d.value || d.occupancyPercent || 0)}`} />
          ))}
        </div>
        <div className="text-xs text-gray-500 mt-2">Last {Math.min(30, data.length)} days</div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Analytics</h2>
        {loading && <div className="text-sm text-gray-500">Loading...</div>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
        <select className="border rounded-lg px-3 py-2" value={filters.propertyId} onChange={e=>setFilters(prev=>({...prev, propertyId:e.target.value}))}>
          <option value="">All Properties</option>
          {propertyOptions.map(p => <option key={p._id} value={p._id}>{p.title}</option>)}
        </select>
        <input type="date" className="border rounded-lg px-3 py-2" value={filters.from} onChange={e=>setFilters(prev=>({...prev, from:e.target.value}))} />
        <input type="date" className="border rounded-lg px-3 py-2" value={filters.to} onChange={e=>setFilters(prev=>({...prev, to:e.target.value}))} />
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-blue-800">
            <div className="text-xs">Avg Occupancy</div>
            <div className="font-semibold">{(metrics.totals.occupancyAvg || 0).toFixed(1)}%</div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-green-800">
            <div className="text-xs">Avg ADR</div>
            <div className="font-semibold">RWF {(metrics.totals.adrAvg || 0).toLocaleString()}</div>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-lg px-3 py-2 text-purple-800">
            <div className="text-xs">Avg RevPAR</div>
            <div className="font-semibold">RWF {(metrics.totals.revparAvg || 0).toLocaleString()}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <BarChart data={metrics.occupancyDaily.map(d=>({date:d.date, value:d.occupancyPercent}))} label="Occupancy %" color="bg-blue-600" />
        <BarChart data={metrics.adrDaily} label="ADR" color="bg-green-600" />
        <BarChart data={metrics.revparDaily} label="RevPAR" color="bg-purple-600" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        <div className="bg-white rounded-xl border p-4">
          <div className="font-semibold text-gray-900">Conversions</div>
          <div className="text-3xl font-bold text-green-700">{metrics.totals.conversions || 0}</div>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="font-semibold text-gray-900">Cancellations</div>
          <div className="text-3xl font-bold text-red-700">{metrics.totals.cancellations || 0}</div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPanel;
