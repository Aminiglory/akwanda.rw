import React, { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import LoadingIndicator from './LoadingIndicator';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const FinancePanel = ({ propertyOptions = [], activeSection = 'ledger' }) => {
  const [loading, setLoading] = useState(false);
  const [ledger, setLedger] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [filters, setFilters] = useState({ propertyId: '', month: '' });
  const [section, setSection] = useState(activeSection || 'ledger');

  const [expenseForm, setExpenseForm] = useState({ date: '', amount: '', category: '', note: '' });
  const [savingExpense, setSavingExpense] = useState(false);
  const [expenses, setExpenses] = useState([]);
  const [expensesTotal, setExpensesTotal] = useState(0);
  const [expenseFilters, setExpenseFilters] = useState({ from: '', to: '' });
  const [editingExpenseId, setEditingExpenseId] = useState(null);

  const [summaryRange, setSummaryRange] = useState('monthly'); // weekly | monthly | annual
  const [summaryDate, setSummaryDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [summary, setSummary] = useState(null);

  const ledgerRef = useRef(null);
  const invoicesRef = useRef(null);
  const payoutsRef = useRef(null);
  const expensesRef = useRef(null);

  useEffect(() => {
    try {
      const search = typeof window !== 'undefined' ? window.location.search : '';
      const params = new URLSearchParams(search || '');
      const urlProperty = params.get('property');
      if (urlProperty) {
        setFilters(prev => ({ ...prev, propertyId: urlProperty }));
        return;
      }
      const stored = localStorage.getItem('financeSelectedPropertyId');
      if (stored && !filters.propertyId) {
        setFilters(prev => ({ ...prev, propertyId: stored }));
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    setSection(activeSection || 'ledger');
  }, [activeSection]);

  const formatCurrency = (n) => `RWF ${Number(n || 0).toLocaleString()}`;

  const formatPeriod = (p) => {
    if (!p) return '';
    if (typeof p === 'string') return p;
    if (typeof p === 'object') {
      const month = p.month != null ? String(p.month).padStart(2, '0') : '';
      const year = p.year != null ? String(p.year) : '';
      if (year || month) {
        return year && month ? `${year}-${month}` : (year || month);
      }
      try {
        return JSON.stringify(p);
      } catch (_) {
        return String(p);
      }
    }
    return String(p);
  };

  const scrollToSection = (target) => {
    const map = {
      ledger: ledgerRef,
      invoices: invoicesRef,
      payouts: payoutsRef,
      expenses: expensesRef,
    };
    const ref = map[target];
    if (ref && ref.current) {
      try {
        ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } catch (_) {}
    }
  };

  useEffect(() => {
    scrollToSection(section);
  }, [section]);

  const loadCoreFinance = async () => {
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
      setLedger(lData.entries || lData.ledger || []);
      setInvoices(iData.invoices || []);
      setPayouts(pData.payouts || []);
    } catch (e) { toast.error(e.message); } finally { setLoading(false); }
  };

  useEffect(() => { loadCoreFinance(); /* eslint-disable-line */ }, [filters.propertyId, filters.month]);

  const loadExpenses = async () => {
    if (!filters.propertyId) {
      setExpenses([]);
      setExpensesTotal(0);
      return;
    }
    try {
      const q = new URLSearchParams();
      q.set('property', filters.propertyId);
      if (expenseFilters.from) q.set('from', expenseFilters.from);
      if (expenseFilters.to) q.set('to', expenseFilters.to);
      const res = await fetch(`${API_URL}/api/finance/expenses?${q.toString()}`, { credentials: 'include' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Failed to load expenses');
      setExpenses(Array.isArray(data.expenses) ? data.expenses : []);
      setExpensesTotal(Number(data.total || 0));
    } catch (e) {
      toast.error(e.message || 'Failed to load expenses');
    }
  };

  const loadSummary = async () => {
    if (!filters.propertyId) {
      setSummary(null);
      return;
    }
    try {
      const q = new URLSearchParams();
      q.set('property', filters.propertyId);
      q.set('range', summaryRange);
      if (summaryDate) q.set('date', summaryDate);
      const res = await fetch(`${API_URL}/api/finance/summary?${q.toString()}`, { credentials: 'include' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Failed to load summary');
      setSummary(data);
    } catch (e) {
      toast.error(e.message || 'Failed to load summary');
      setSummary(null);
    }
  };

  useEffect(() => {
    loadExpenses();
    loadSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.propertyId, summaryRange, summaryDate]);

  const handleSaveExpense = async (e) => {
    e.preventDefault();
    if (!filters.propertyId) {
      toast.error('Select a property first');
      return;
    }
    const amountNumber = Number(expenseForm.amount || 0);
    if (!amountNumber || amountNumber <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    const date = expenseForm.date || new Date().toISOString().slice(0, 10);
    try {
      setSavingExpense(true);

      const isEditing = !!editingExpenseId;
      const url = isEditing
        ? `${API_URL}/api/finance/expenses/${editingExpenseId}`
        : `${API_URL}/api/finance/expenses`;
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          property: filters.propertyId,
          date,
          amount: amountNumber,
          category: expenseForm.category || 'general',
          note: expenseForm.note || '',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || (isEditing ? 'Failed to update expense' : 'Failed to record expense'));
      toast.success(isEditing ? 'Expense updated' : 'Expense recorded');
      setExpenseForm({ date: '', amount: '', category: '', note: '' });
      setEditingExpenseId(null);
      await loadExpenses();
      await loadSummary();
    } catch (err) {
      toast.error(err.message || 'Failed to record expense');
    } finally {
      setSavingExpense(false);
    }
  };

  const handleEditExpense = (exp) => {
    setExpenseForm({
      date: exp.date ? new Date(exp.date).toISOString().slice(0, 10) : '',
      amount: exp.amount != null ? String(exp.amount) : '',
      category: exp.category || '',
      note: exp.note || '',
    });
    setEditingExpenseId(exp._id || null);
  };

  const handleDeleteExpense = async (id) => {
    if (!id) return;
    if (!filters.propertyId) {
      toast.error('Select a property first');
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/finance/expenses/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Failed to delete expense');
      toast.success('Expense deleted');
      if (editingExpenseId === id) {
        setEditingExpenseId(null);
        setExpenseForm({ date: '', amount: '', category: '', note: '' });
      }
      await loadExpenses();
      await loadSummary();
    } catch (e) {
      toast.error(e.message || 'Failed to delete expense');
    }
  };

  const totals = useMemo(() => {
    const commission = ledger.reduce((s, r) => s + (r.commissionAmount || 0), 0);
    const earnings = ledger.reduce((s, r) => s + ((r.amountBeforeTax || r.totalAmount || 0) - (r.commissionAmount || 0)), 0);
    return { commission, earnings };
  }, [ledger]);

  const downloadInvoice = async (id, fileLabel) => {
    try {
      const res = await fetch(`${API_URL}/api/finance/invoices/${id}/download`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to download invoice');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const base = (fileLabel || 'invoice').toString().trim() || 'invoice';
      const safeBase = base.replace(/[^a-z0-9\-]+/gi, '-');
      a.download = `${safeBase}.txt`;
      a.click();
    } catch (e) { toast.error(e.message); }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Finance</h2>
        {loading && (
          <div className="ml-4">
            <LoadingIndicator label="Loading finance data" />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
        <select className="border rounded-lg px-3 py-2" value={filters.propertyId} onChange={e=>{
          const value = e.target.value;
          setFilters(prev=>({...prev, propertyId:value}));
          try {
            localStorage.setItem('financeSelectedPropertyId', value || '');
          } catch (_) {}
          try {
            if (typeof window !== 'undefined') {
              const url = new URL(window.location.href);
              if (value) {
                url.searchParams.set('property', value);
              } else {
                url.searchParams.delete('property');
              }
              window.history.replaceState(null, '', url.toString());
            }
          } catch (_) {}
        }}>
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

      {/* Profit / Loss Summary */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Profit &amp; Loss</h3>
            <p className="text-xs text-gray-500">Compare your revenue and expenses for a selected period.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden text-xs">
              {[{id:'weekly',label:'Weekly'},{id:'monthly',label:'Monthly'},{id:'annual',label:'Annual'}].map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSummaryRange(opt.id)}
                  className={`px-3 py-1.5 ${summaryRange === opt.id ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <input
              type="date"
              className="border rounded-lg px-3 py-1.5 text-xs"
              value={summaryDate}
              onChange={e => setSummaryDate(e.target.value)}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border rounded-lg px-4 py-3">
            <div className="text-xs text-gray-500 mb-1">Total Revenue</div>
            <div className="text-lg font-semibold text-gray-900">{formatCurrency(summary?.revenueTotal || 0)}</div>
          </div>
          <div className="bg-white border rounded-lg px-4 py-3">
            <div className="text-xs text-gray-500 mb-1">Total Expenses</div>
            <div className="text-lg font-semibold text-gray-900">{formatCurrency(summary?.expensesTotal || 0)}</div>
          </div>
          <div className="bg-white border rounded-lg px-4 py-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-500">Net Profit</span>
              {summary && (
                <span className={`text-[11px] px-2 py-0.5 rounded-full ${
                  (summary.netProfit || 0) >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {(summary.netProfit || 0) >= 0 ? 'Profit' : 'Loss'}
                </span>
              )}
            </div>
            <div className={`text-lg font-semibold ${(summary?.netProfit || 0) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              {formatCurrency(summary?.netProfit || 0)}
            </div>
            <div className="text-[11px] text-gray-500 mt-1">
              Gross profit: {formatCurrency(summary?.grossProfit || 0)}
            </div>
          </div>
        </div>
      </div>

      {/* Ledger */}
      <div className="mb-8" ref={ledgerRef}>
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
        <div ref={invoicesRef}>
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
                  {invoices.map(inv => {
                    const periodLabel = formatPeriod(inv.period);
                    const friendlyName = `${inv.property?.title || 'Invoice'}${periodLabel ? `-${periodLabel}` : ''}`;
                    return (
                    <tr key={inv._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">{inv.code || inv._id}<div className="text-xs text-gray-600">{periodLabel}</div></td>
                      <td className="px-4 py-3">{formatCurrency(inv.amount)}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => downloadInvoice(inv._id, friendlyName)} className="px-3 py-1 border rounded">Download</button>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div ref={payoutsRef}>
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

      {/* Expenses */}
      <div className="mt-8 border-t pt-6" ref={expensesRef}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Expenses</h3>
            <p className="text-xs text-gray-500">Record your day-to-day costs to understand your real profit.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <input
              type="date"
              className="border rounded-lg px-2 py-1"
              value={expenseFilters.from}
              onChange={e => setExpenseFilters(prev => ({ ...prev, from: e.target.value }))}
            />
            <span className="text-gray-400">to</span>
            <input
              type="date"
              className="border rounded-lg px-2 py-1"
              value={expenseFilters.to}
              onChange={e => setExpenseFilters(prev => ({ ...prev, to: e.target.value }))}
            />
            <button
              type="button"
              onClick={loadExpenses}
              className="px-3 py-1 rounded-lg border text-gray-700 hover:bg-gray-50"
            >
              Apply
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <form onSubmit={handleSaveExpense} className="bg-gray-50 rounded-lg p-4 border lg:col-span-1">
            <div className="mb-3">
              <label className="block text-xs font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={expenseForm.date}
                onChange={e => setExpenseForm(prev => ({ ...prev, date: e.target.value }))}
              />
            </div>
            <div className="mb-3">
              <label className="block text-xs font-medium text-gray-700 mb-1">Amount (RWF)</label>
              <input
                type="number"
                min="0"
                step="any"
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={expenseForm.amount}
                onChange={e => setExpenseForm(prev => ({ ...prev, amount: e.target.value }))}
              />
            </div>
            <div className="mb-3">
              <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
              <input
                type="text"
                placeholder="e.g. Cleaning, Staff, Utilities"
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={expenseForm.category}
                onChange={e => setExpenseForm(prev => ({ ...prev, category: e.target.value }))}
              />
            </div>
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-700 mb-1">Note</label>
              <textarea
                rows={2}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={expenseForm.note}
                onChange={e => setExpenseForm(prev => ({ ...prev, note: e.target.value }))}
              />
            </div>
            <button
              type="submit"
              disabled={savingExpense}
              className={`w-full inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium text-white ${
                savingExpense ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {savingExpense
                ? 'Saving…'
                : (editingExpenseId ? 'Update Expense' : 'Add Expense')}
            </button>
            {editingExpenseId && (
              <button
                type="button"
                onClick={() => {
                  setEditingExpenseId(null);
                  setExpenseForm({ date: '', amount: '', category: '', note: '' });
                }}
                className="mt-2 w-full inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium text-gray-700 border border-gray-300 hover:bg-gray-50"
              >
                Cancel edit
              </button>
            )}
          </form>

          <div className="lg:col-span-2 bg-white rounded-lg border p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold text-gray-900">Recent Expenses</div>
              <div className="text-xs text-gray-600">Total: {formatCurrency(expensesTotal)}</div>
            </div>
            {expenses.length === 0 ? (
              <div className="text-sm text-gray-500">No expenses recorded for the selected period.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Note</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {expenses.map(exp => (
                      <tr key={exp._id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-xs text-gray-700">
                          {exp.date ? new Date(exp.date).toLocaleDateString() : ''}
                        </td>
                        <td className="px-4 py-2 text-xs text-gray-800">
                          {exp.category || 'general'}
                        </td>
                        <td className="px-4 py-2 text-xs text-gray-600">
                          {exp.note || '-'}
                        </td>
                        <td className="px-4 py-2 text-xs text-right font-semibold text-gray-900">
                          {formatCurrency(exp.amount)}
                        </td>
                        <td className="px-4 py-2 text-xs text-right space-x-2">
                          <button
                            type="button"
                            onClick={() => handleEditExpense(exp)}
                            className="inline-flex items-center px-2 py-1 border rounded text-[11px] text-gray-700 hover:bg-gray-50"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteExpense(exp._id)}
                            className="inline-flex items-center px-2 py-1 border rounded text-[11px] text-red-600 hover:bg-red-50"
                          >
                            Delete
                          </button>
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
    </div>
  );
};

export default FinancePanel;
