import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const FinancePanel = ({ propertyOptions = [] }) => {
  const [loading, setLoading] = useState(false);
  const [ledger, setLedger] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [filters, setFilters] = useState({ propertyId: '', month: '' });

  const formatCurrency = (n) => `RWF ${Number(n || 0).toLocaleString()}`;

  const load = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (filters.propertyId) q.set('property', filters.propertyId);
      if (filters.month) q.set('month', filters.month);
      const [lRes, iRes, pRes] = await Promise.all([
        fetch(`${API_URL}/api/finance/ledger?${q.toString()}`, { credentials: 'include' }),
        fetch(`${API_URL}/api/finance/invoices?${q.toString()}`, { credentials: 'include' }),
        fetch(`${API_URL}/api/finance/payouts?${q.toString()}`, { credentials: 'include' })
      ]);
      const [lData, iData, pData] = await Promise.all([lRes.json(), iRes.json(), pRes.json()]);
      if (!lRes.ok) throw new Error(lData.message || 'Failed to load ledger');
      if (!iRes.ok) throw new Error(iData.message || 'Failed to load invoices');
      if (!pRes.ok) throw new Error(pData.message || 'Failed to load payouts');
      setLedger(lData.ledger || []);
      setInvoices(iData.invoices || []);
      setPayouts(pData.payouts || []);
    } catch (e) { toast.error(e.message); } finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-line */ }, [filters.propertyId, filters.month]);

  const totals = useMemo(() => {
    const commission = ledger.reduce((s, r) => s + (r.commissionAmount || 0), 0);
    const earnings = ledger.reduce((s, r) => s + ((r.amountBeforeTax || r.totalAmount || 0) - (r.commissionAmount || 0)), 0);
    return { commission, earnings };
  }, [ledger]);

  const downloadInvoice = async (id, code) => {
    try {
      const res = await fetch(`${API_URL}/api/finance/invoices/${id}/download`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to download invoice');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `invoice-${code || id}.pdf`; a.click();
    } catch (e) { toast.error(e.message); }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Finance</h2>
        {loading && <div className="text-sm text-gray-500">Loading...</div>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
        <select className="border rounded-lg px-3 py-2" value={filters.propertyId} onChange={e=>setFilters(prev=>({...prev, propertyId:e.target.value}))}>
          <option value="">All Properties</option>
          {propertyOptions.map(p => <option key={p._id} value={p._id}>{p.title}</option>)}
        </select>
        <input type="month" className="border rounded-lg px-3 py-2" value={filters.month} onChange={e=>setFilters(prev=>({...prev, month:e.target.value}))} />
        <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-green-800">
          <div className="text-xs">Your Earnings</div>
          <div className="font-semibold">{formatCurrency(totals.earnings)}</div>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 text-yellow-800">
          <div className="text-xs">Commission Owed</div>
          <div className="font-semibold">{formatCurrency(totals.commission)}</div>
        </div>
      </div>

      {/* Ledger */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Commission Ledger</h3>
        {ledger.length === 0 ? (
          <div className="text-sm text-gray-600">No ledger entries.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Booking</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Commission</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {ledger.map(row => (
                  <tr key={row._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{row.property?.title || '-'}</div>
                      <div className="text-xs text-gray-600">{row.confirmationCode}</div>
                    </td>
                    <td className="px-4 py-3">{formatCurrency(row.totalAmount)}</td>
                    <td className="px-4 py-3">{formatCurrency(row.commissionAmount)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${row.commissionPaid ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {row.commissionPaid ? 'Paid' : 'Pending'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invoices & Payouts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Invoices</h3>
          {invoices.length === 0 ? (
            <div className="text-sm text-gray-600">No invoices.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {invoices.map(inv => (
                    <tr key={inv._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">{inv.code || inv._id}<div className="text-xs text-gray-600">{inv.period || ''}</div></td>
                      <td className="px-4 py-3">{formatCurrency(inv.amount)}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => downloadInvoice(inv._id, inv.code)} className="px-3 py-1 border rounded">Download</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Payouts</h3>
          {payouts.length === 0 ? (
            <div className="text-sm text-gray-600">No payouts.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {payouts.map(p => (
                    <tr key={p._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">{p.date ? new Date(p.date).toLocaleDateString() : ''}</td>
                      <td className="px-4 py-3">{formatCurrency(p.amount)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${p.status==='paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{p.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FinancePanel;
