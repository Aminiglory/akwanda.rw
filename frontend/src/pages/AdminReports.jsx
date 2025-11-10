import React, { useEffect, useMemo, useState } from 'react';
import { useLocale } from '../contexts/LocaleContext';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function AdminReports() {
  const { formatCurrencyRWF } = useLocale() || {};
  const [type, setType] = useState('revenue');
  const [period, setPeriod] = useState('monthly');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  const loadPreview = async () => {
    try {
      setLoading(true);
      const qs = new URLSearchParams({ type, period }).toString();
      const res = await fetch(`${API_URL}/api/reports/generate?${qs}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to generate report');
      const json = await res.json();
      setData(json.data || {});
    } catch (e) {
      toast.error(e.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const downloadFile = async (url, filename) => {
    try {
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) {
        const d = await res.json().catch(()=>({}));
        throw new Error(d.message || 'Download failed');
      }
      const blob = await res.blob();
      const link = document.createElement('a');
      const objUrl = window.URL.createObjectURL(blob);
      link.href = objUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(objUrl);
      toast.success('Download started');
    } catch (e) { toast.error(e.message || 'Failed to download'); }
  };

  const downloadPdf = async () => {
    const qs = new URLSearchParams({ type, period }).toString();
    await downloadFile(`${API_URL}/api/reports/generate-pdf?${qs}`, `${type}-${period}-report.pdf`);
  };
  const downloadCsv = async () => {
    const qs = new URLSearchParams({ type, period }).toString();
    await downloadFile(`${API_URL}/api/reports/generate-csv?${qs}`, `${type}-${period}-report.csv`);
  };

  const renderTable = () => {
    if (!data) return null;
    if (type === 'revenue') {
      const rows = data.byProperty || [];
      return (
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Property</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bookings</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Net</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {rows.map(r => (
                <tr key={r.propertyId} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-sm">{r.propertyName}</td>
                  <td className="px-4 py-2 text-sm">{r.bookingsCount}</td>
                  <td className="px-4 py-2 text-sm">{formatCurrencyRWF ? formatCurrencyRWF(r.totalRevenue || 0) : `RWF ${(r.totalRevenue || 0).toLocaleString()}`}</td>
                  <td className="px-4 py-2 text-sm">{formatCurrencyRWF ? formatCurrencyRWF(r.netRevenue || 0) : `RWF ${(r.netRevenue || 0).toLocaleString()}`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    if (type === 'bookings') {
      const rows = data.byProperty || [];
      const breakdown = data.summary?.statusBreakdown || {};
      return (
        <>
          <div className="bg-white rounded-lg shadow p-4 mb-4">
            <div className="text-sm font-medium text-gray-700">Status Breakdown</div>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              {Object.entries(breakdown).map(([k,v]) => (
                <span key={k} className="px-2 py-1 rounded bg-gray-100 text-gray-700 border">{k}: {v}</span>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto bg-white rounded-lg shadow">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Property</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bookings</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Value</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {rows.map(r => (
                  <tr key={r.propertyId} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm">{r.propertyName}</td>
                    <td className="px-4 py-2 text-sm">{r.bookingsCount}</td>
                    <td className="px-4 py-2 text-sm">{formatCurrencyRWF ? formatCurrencyRWF(r.averageBookingValue || 0) : `RWF ${(r.averageBookingValue || 0).toLocaleString()}`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      );
    }
    if (type === 'performance') {
      const rows = data.occupancyData || [];
      return (
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Property</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Occupancy</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Stay</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {rows.map(r => (
                <tr key={r.propertyId} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-sm">{r.propertyName}</td>
                  <td className="px-4 py-2 text-sm">{Number(r.occupancyRate||0)}%</td>
                  <td className="px-4 py-2 text-sm">{Number(r.averageStay||0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    if (type === 'tax' && data) {
      return (
        <div className="bg-white rounded-lg shadow p-4 text-sm">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div><span className="text-gray-600">Year:</span> <span className="font-semibold">{data.year}</span></div>
            <div><span className="text-gray-600">Taxable Income:</span> <span className="font-semibold">{formatCurrencyRWF ? formatCurrencyRWF(data.taxableIncome || 0) : `RWF ${(data.taxableIncome || 0).toLocaleString()}`}</span></div>
            <div><span className="text-gray-600">Commissions:</span> <span className="font-semibold">{formatCurrencyRWF ? formatCurrencyRWF(data.commissionsPaid || 0) : `RWF ${(data.commissionsPaid || 0).toLocaleString()}`}</span></div>
            <div><span className="text-gray-600">Net Income:</span> <span className="font-semibold">{formatCurrencyRWF ? formatCurrencyRWF(data.netIncome || 0) : `RWF ${(data.netIncome || 0).toLocaleString()}`}</span></div>
            <div><span className="text-gray-600">Estimated Tax:</span> <span className="font-semibold">{formatCurrencyRWF ? formatCurrencyRWF(data.estimatedTax || 0) : `RWF ${(data.estimatedTax || 0).toLocaleString()}`}</span></div>
            <div><span className="text-gray-600">Properties:</span> <span className="font-semibold">{data.properties}</span></div>
            <div><span className="text-gray-600">Total Bookings:</span> <span className="font-semibold">{data.totalBookings}</span></div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Type</label>
            <select value={type} onChange={e=>setType(e.target.value)} className="px-3 py-2 border rounded-lg text-sm">
              <option value="revenue">Revenue</option>
              <option value="bookings">Bookings</option>
              <option value="performance">Performance</option>
              <option value="tax">Tax</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Period</label>
            <select value={period} onChange={e=>setPeriod(e.target.value)} className="px-3 py-2 border rounded-lg text-sm">
              <option value="daily">Daily</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadPreview} className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Generate Preview</button>
            <button onClick={downloadPdf} className="px-3 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">Download PDF</button>
            <button onClick={downloadCsv} className="px-3 py-2 text-sm bg-gray-800 text-white rounded-lg hover:bg-black">Download CSV</button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-lg shadow p-6 text-center text-gray-600">Generating report…</div>
      ) : (
        renderTable()
      )}
    </div>
  );
}
