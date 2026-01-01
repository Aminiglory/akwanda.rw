import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FaPlane, FaCalendarAlt, FaDollarSign, FaChartLine, FaBell, FaFileExport, FaEdit, FaTrash, FaEye, FaCog, FaFilter, FaCrown } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import ListProperty from './ListProperty';
import AddFlightInlineForm from '../components/AddFlightInlineForm';
import CommissionUpgradeModal from '../components/CommissionUpgradeModal';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function FlightsDashboard() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [loadingExpenses, setLoadingExpenses] = useState(false);

  const tab = (searchParams.get('tab') || 'overview').toLowerCase();
  const range = (searchParams.get('range') || '').toLowerCase();
  const statusFilter = (searchParams.get('status') || '').toLowerCase();
  const bookingFilter = (searchParams.get('filter') || '').toLowerCase();
  const bookingGroup = (searchParams.get('group') || '').toLowerCase();
  const analyticsView = (searchParams.get('view') || '').toLowerCase();
  const typeFilter = (searchParams.get('type') || '').toLowerCase();

  const [bookings, setBookings] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [expensesSummary, setExpensesSummary] = useState(null);
  const [dailyPage, setDailyPage] = useState(1);
  const [monthlyPage, setMonthlyPage] = useState(1);
   const [bookingsPage, setBookingsPage] = useState(1);
  const [expensesLog, setExpensesLog] = useState([]);
  const [expensesPage, setExpensesPage] = useState(1);
  const [expensesTotalPages, setExpensesTotalPages] = useState(1);
  const [loadingExpensesLog, setLoadingExpensesLog] = useState(false);
  const [newExpense, setNewExpense] = useState({ date: '', amount: '', category: 'general', note: '' });
  const [savingExpense, setSavingExpense] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);

  const filteredBookings = useMemo(() => {
    let list = [...bookings];

    if (statusFilter) {
      list = list.filter((b) => b.status.toLowerCase() === statusFilter);
    }

    if (bookingFilter === 'high-value') {
      const avg = list.length
        ? list.reduce((sum, b) => sum + (b.price || 0), 0) / Math.max(list.length, 1)
        : 0;
      list = list.filter((b) => (b.price || 0) >= avg);
    }

    // bookingGroup is primarily for future grouped views; for now we just
    // keep the list as-is so the table still works.
    return list;
  }, [bookings, statusFilter, bookingFilter, bookingGroup]);

  const metrics = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const daysAgo = (n) => {
      const d = new Date(now);
      d.setDate(d.getDate() - n);
      return d;
    };

    let totalBookings = bookings.length;
    let upcoming = 0;
    let completed = 0;
    let revenue = 0;

    bookings.forEach((b) => {
      if (b.status === 'completed') {
        completed += 1;
        revenue += b.price || 0;
      }
      const dep = new Date(b.departure);
      if (dep > now) upcoming += 1;
    });
    let rangeLabel = 'All time';
    if (range === 'today') {
      rangeLabel = 'Today';
    } else if (range === '30') {
      rangeLabel = 'Last 30 days';
    } else if (range === 'ytd') {
      rangeLabel = 'Year to date';
    }

    let rangeRevenue = revenue;
    if (range === 'today') {
      rangeRevenue = bookings
        .filter((b) => b.status === 'completed')
        .filter((b) => {
          const a = new Date(b.arrival);
          return a >= startOfToday && a <= now;
        })
        .reduce((sum, b) => sum + (b.price || 0), 0);
    } else if (range === '30') {
      const from = daysAgo(30);
      rangeRevenue = bookings
        .filter((b) => b.status === 'completed')
        .filter((b) => {
          const a = new Date(b.arrival);
          return a >= from && a <= now;
        })
        .reduce((sum, b) => sum + (b.price || 0), 0);
    } else if (range === 'ytd') {
      rangeRevenue = bookings
        .filter((b) => b.status === 'completed')
        .filter((b) => {
          const a = new Date(b.arrival);
          return a >= startOfYear && a <= now;
        })
        .reduce((sum, b) => sum + (b.price || 0), 0);
    }

    return {
      totalBookings,
      upcoming,
      completed,
      revenue,
      rangeRevenue,
      rangeLabel,
    };
  }, [bookings, range]);

  useEffect(() => {
    if (!user) return;

    const loadBookings = async () => {
      try {
        setLoadingBookings(true);
        const url = new URL(`${API_URL}/api/flights/owner/bookings`);
        const params = url.searchParams;
        if (statusFilter) params.set('status', statusFilter);
        if (bookingFilter) params.set('filter', bookingFilter);
        const res = await fetch(url.toString(), { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to load bookings');
        const data = await res.json();
        const list = (data.bookings || []).map((b) => ({
          id: String(b._id || b.id),
          airline: b.airline,
          flightNumber: b.flightNumber,
          from: b.from,
          to: b.to,
          departure: b.departure,
          arrival: b.arrival,
          duration: b.duration,
          price: b.price,
          status: b.status || 'upcoming',
          channel: b.channel,
          commissionLevel: b.commissionLevel,
          commissionRate: b.commissionRate,
          commissionAmount: b.commissionAmount,
          commissionPaid: b.commissionPaid,
        }));
        setBookings(list);
      } catch (_) {
        // Keep existing state on error
      } finally {
        setLoadingBookings(false);
      }
    };

    const loadAnalytics = async () => {
      try {
        setLoadingAnalytics(true);
        const url = new URL(`${API_URL}/api/flights/owner/analytics`);
        if (range === 'today') url.searchParams.set('range', 'day');
        else if (range === 'ytd') url.searchParams.set('range', 'year');
        else if (range === '30') url.searchParams.set('range', 'month');
        const res = await fetch(url.toString(), { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to load analytics');
        const data = await res.json();
        setAnalytics(data || null);
      } catch (_) {
        setAnalytics(null);
      } finally {
        setLoadingAnalytics(false);
      }
    };

    const loadExpenses = async () => {
      try {
        setLoadingExpenses(true);
        const url = new URL(`${API_URL}/api/flights/owner/expenses`);
        if (range === 'today') url.searchParams.set('range', 'day');
        else if (range === 'ytd') url.searchParams.set('range', 'year');
        else if (range === '30') url.searchParams.set('range', 'month');
        const res = await fetch(url.toString(), { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to load expenses');
        const data = await res.json();
        setExpensesSummary(data.summary || null);
      } catch (_) {
        setExpensesSummary(null);
      } finally {
        setLoadingExpenses(false);
      }
    };

    const loadExpensesLog = async (page = 1) => {
      try {
        setLoadingExpensesLog(true);
        const url = new URL(`${API_URL}/api/flights/owner/expenses-log`);
        url.searchParams.set('page', String(page));
        url.searchParams.set('limit', '10');
        const res = await fetch(url.toString(), { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to load expenses log');
        const data = await res.json();
        setExpensesLog(data.expenses || []);
        setExpensesPage(data.page || 1);
        setExpensesTotalPages(Math.max(1, Number(data.totalPages || 1)));
      } catch (_) {
        setExpensesLog([]);
      } finally {
        setLoadingExpensesLog(false);
      }
    };

    loadBookings();
    loadAnalytics();
    loadExpenses();
    loadExpensesLog(1);
    setDailyPage(1);
    setMonthlyPage(1);
    setBookingsPage(1);
  }, [user?.id, statusFilter, bookingFilter, range]);

  const handleExpensesPageChange = (nextPage) => {
    const page = Math.min(Math.max(1, nextPage), expensesTotalPages || 1);
    if (page === expensesPage) return;
    (async () => {
      try {
        setLoadingExpensesLog(true);
        const url = new URL(`${API_URL}/api/flights/owner/expenses-log`);
        url.searchParams.set('page', String(page));
        url.searchParams.set('limit', '10');
        const res = await fetch(url.toString(), { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to load expenses log');
        const data = await res.json();
        setExpensesLog(data.expenses || []);
        setExpensesPage(data.page || page);
        setExpensesTotalPages(Math.max(1, Number(data.totalPages || 1)));
      } catch (_) {
        // keep old data on failure
      } finally {
        setLoadingExpensesLog(false);
      }
    })();
  };

  const handleNewExpenseChange = (field, value) => {
    setNewExpense((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreateExpense = async (e) => {
    e.preventDefault();
    if (!newExpense.date || !newExpense.amount) return;
    try {
      setSavingExpense(true);
      const res = await fetch(`${API_URL}/api/flights/owner/expenses-log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          date: newExpense.date,
          amount: Number(newExpense.amount),
          category: newExpense.category || 'general',
          note: newExpense.note || '',
        }),
      });
      if (!res.ok) throw new Error('Failed to create expense');
      setNewExpense({ date: '', amount: '', category: 'general', note: '' });
      // reload first page so new item appears
      handleExpensesPageChange(1);
    } catch (_) {
      // keep form values, maybe show toast in future
    } finally {
      setSavingExpense(false);
    }
  };

  const handleBookingsPageChange = (nextPage) => {
    const totalPages = Math.max(1, Math.ceil((filteredBookings.length || 0) / 10));
    const page = Math.min(Math.max(1, nextPage), totalPages);
    setBookingsPage(page);
  };

  const handleDeleteExpense = async (id) => {
    if (!id) return;
    try {
      const res = await fetch(`${API_URL}/api/flights/owner/expenses-log/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to delete expense');
      // reload current page (may shrink if last item removed)
      handleExpensesPageChange(expensesPage);
    } catch (_) {
      // ignore errors for now
    }
  };

  useEffect(() => {
    if (!user) return;
    setLoadingNotifications(true);
    fetch(`${API_URL}/api/user/notifications`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        setNotifications(data.notifications || []);
      })
      .catch(() => {})
      .finally(() => setLoadingNotifications(false));
  }, [user?.id]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-lg text-red-600">
        You must be logged in to view the Flights Dashboard.
      </div>
    );
  }

  // Show listing form if action=list
  if (action === 'list') {
    return <ListProperty forceType="flight" hideListingTypeSelector={true} />;
  }

  const setTab = (nextTab) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', nextTab);
    setSearchParams(next, { replace: true });
  };

  const formatPrice = (value) => {
    try {
      return new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF', maximumFractionDigits: 0 }).format(
        value || 0,
      );
    } catch {
      return `RWF ${Number(value || 0).toLocaleString()}`;
    }
  };

  const hasAnyFlights = bookings && bookings.length > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Flights Dashboard</h1>
            <p className="text-gray-600 mt-1 text-sm md:text-base">
              Track your flight bookings, revenue, and notifications in one place.
            </p>
          </div>
          {hasAnyFlights && (
            <a
              href="/owner/flights?action=list"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm md:text-base"
            >
              <FaPlane />
              List New Flight
            </a>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {!loadingBookings && !hasAnyFlights && (
          <div className="bg-white border border-dashed border-blue-200 rounded-2xl p-6 text-center space-y-4">
            <h2 className="text-lg md:text-xl font-semibold text-gray-900">No flights listed yet</h2>
            <p className="text-gray-600 text-sm md:text-base max-w-2xl mx-auto">
              To start using the Flights dashboard, you must first list at least one flight. You can either seed demo data for testing or list a real flight.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={async () => {
                  if (!confirm('This will create 8 demo flight bookings for testing. Continue?')) return;
                  try {
                    setLoadingBookings(true);
                    const res = await fetch(`${API_URL}/api/flights/owner/seed-demo`, {
                      method: 'POST',
                      credentials: 'include',
                      headers: { 'Content-Type': 'application/json' },
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.message || 'Failed to seed demo flights');
                    toast.success(`Successfully created ${data.count || 8} demo flight bookings!`);
                    // Reload bookings
                    const url = new URL(`${API_URL}/api/flights/owner/bookings`);
                    const res2 = await fetch(url.toString(), { credentials: 'include' });
                    if (res2.ok) {
                      const data2 = await res2.json();
                      const list = (data2.bookings || []).map((b) => ({
                        id: String(b._id || b.id),
                        airline: b.airline,
                        flightNumber: b.flightNumber,
                        from: b.from,
                        to: b.to,
                        departure: b.departure,
                        arrival: b.arrival,
                        duration: b.duration,
                        price: b.price,
                        status: b.status || 'upcoming',
                        channel: b.channel,
                        commissionLevel: b.commissionLevel,
                        commissionRate: b.commissionRate,
                        commissionAmount: b.commissionAmount,
                        commissionPaid: b.commissionPaid,
                      }));
                      setBookings(list);
                    }
                  } catch (error) {
                    toast.error(error.message || 'Failed to seed demo flights');
                  } finally {
                    setLoadingBookings(false);
                  }
                }}
                className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <FaPlane />
                Seed Demo Flights (Testing)
              </button>
              <a
                href="/upload-property?type=flight"
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <FaPlane />
                List Your First Flight
              </a>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Demo flights include a mix of upcoming and completed bookings with different airlines and routes for testing purposes.
            </p>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="rounded-2xl p-5 bg-gradient-to-b from-blue-50 to-white border border-blue-100 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-xl">
              <FaPlane className="text-blue-600 text-xl" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total flight bookings</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.totalBookings}</p>
            </div>
          </div>
          <div className="rounded-2xl p-5 bg-gradient-to-b from-emerald-50 to-white border border-emerald-100 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-emerald-100 rounded-xl">
              <FaCalendarAlt className="text-emerald-600 text-xl" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Upcoming trips</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.upcoming}</p>
            </div>
          </div>
          <div className="rounded-2xl p-5 bg-gradient-to-b from-amber-50 to-white border border-amber-100 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-amber-100 rounded-xl">
              <FaDollarSign className="text-amber-600 text-xl" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Completed revenue</p>
              <p className="text-2xl font-bold text-gray-900">{formatPrice(metrics.revenue)}</p>
            </div>
          </div>
          <div className="rounded-2xl p-5 bg-gradient-to-b from-indigo-50 to-white border border-indigo-100 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-indigo-100 rounded-xl">
              <FaChartLine className="text-indigo-600 text-xl" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Completed flights</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.completed}</p>
            </div>
          </div>
        </div>

        {hasAnyFlights && (
          <div className="bg-white rounded-2xl shadow-lg">
          <div className="border-b border-gray-200">
            <nav className="flex flex-wrap gap-4 px-6">
              <button
                type="button"
                onClick={() => setTab('overview')}
                className={`py-4 px-1 border-b-2 font-medium text-sm md:text-base transition-colors ${
                  tab === 'overview'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Overview
              </button>
              <button
                type="button"
                onClick={() => setTab('bookings')}
                className={`py-4 px-1 border-b-2 font-medium text-sm md:text-base transition-colors ${
                  tab === 'bookings'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Flight bookings
              </button>
              <button
                type="button"
                onClick={() => setTab('analytics')}
                className={`py-4 px-1 border-b-2 font-medium text-sm md:text-base transition-colors ${
                  tab === 'analytics'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Analytics
              </button>
              <button
                type="button"
                onClick={() => setTab('expenses')}
                className={`py-4 px-1 border-b-2 font-medium text-sm md:text-base transition-colors ${
                  tab === 'expenses'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Expenses
              </button>
              <button
                type="button"
                onClick={() => setTab('notifications')}
                className={`py-4 px-1 border-b-2 font-medium text-sm md:text-base transition-colors flex items-center gap-2 ${
                  tab === 'notifications'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <FaBell className="text-sm" />
                Notifications
              </button>
              <button
                type="button"
                onClick={() => setTab('reports')}
                className={`py-4 px-1 border-b-2 font-medium text-sm md:text-base transition-colors ${
                  tab === 'reports'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Reports
              </button>
              <button
                type="button"
                onClick={() => setTab('finance')}
                className={`py-4 px-1 border-b-2 font-medium text-sm md:text-base transition-colors ${
                  tab === 'finance'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Finance
              </button>
              <button
                type="button"
                onClick={() => setTab('settings')}
                className={`py-4 px-1 border-b-2 font-medium text-sm md:text-base transition-colors flex items-center gap-2 ${
                  tab === 'settings'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <FaCog className="text-sm" />
                Settings
              </button>
            </nav>
          </div>

          <div className="p-6">
            {tab === 'overview' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                <h2 className="text-lg md:text-xl font-semibold text-gray-900">
                  Overview
                  {metrics.rangeLabel ? (
                    <span className="ml-2 text-sm font-normal text-gray-600">({metrics.rangeLabel})</span>
                  ) : null}
                </h2>
                    <p className="text-gray-600 text-sm md:text-base mt-1">
                  This section summarizes your recent flight activity based on your stored flight bookings in the
                  backend.
                </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-700">Range:</label>
                    <select
                      value={range}
                      onChange={(e) => {
                        const next = new URLSearchParams(searchParams);
                        if (e.target.value) next.set('range', e.target.value);
                        else next.delete('range');
                        setSearchParams(next, { replace: true });
                      }}
                      className="border border-gray-300 rounded-md px-3 py-1 text-sm"
                    >
                      <option value="">All time</option>
                      <option value="today">Today</option>
                      <option value="30">Last 30 days</option>
                      <option value="ytd">Year to date</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="border border-gray-100 rounded-xl p-4 bg-gray-50">
                    <h3 className="font-semibold text-gray-900 mb-2 text-sm md:text-base">Next upcoming flight</h3>
                    {bookings.filter((b) => b.status === 'upcoming').length === 0 ? (
                      <p className="text-gray-500 text-sm">No upcoming flights yet.</p>
                    ) : (
                      <ul className="space-y-3 text-sm">
                        {bookings
                          .filter((b) => b.status === 'upcoming')
                          .slice(0, 3)
                          .map((b) => (
                            <li key={b.id} className="flex justify-between">
                              <div>
                                <p className="font-medium text-gray-900">
                                  {b.airline} {b.flightNumber}
                                </p>
                                <p className="text-gray-600">
                                  {b.from} → {b.to}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-gray-700 font-semibold">{formatPrice(b.price)}</p>
                              </div>
                            </li>
                          ))}
                      </ul>
                    )}
                  </div>
                  <div className="border border-gray-100 rounded-xl p-4 bg-gray-50">
                    <h3 className="font-semibold text-gray-900 mb-2 text-sm md:text-base">Recent notifications</h3>
                    {loadingNotifications ? (
                      <p className="text-gray-500 text-sm">Loading notifications…</p>
                    ) : notifications.length === 0 ? (
                      <p className="text-gray-500 text-sm">No notifications yet.</p>
                    ) : (
                      <ul className="space-y-3 text-sm max-h-40 overflow-y-auto">
                        {notifications
                          .slice()
                          .sort(
                            (a, b) => new Date(b.createdAt || b.timestamp) - new Date(a.createdAt || a.timestamp),
                          )
                          .slice(0, 5)
                          .map((n) => (
                            <li key={n._id} className="flex justify-between gap-3">
                              <div>
                                <p className="font-medium text-gray-900">{n.title}</p>
                                {n.message && (
                                  <p className="text-gray-600 truncate max-w-xs" title={n.message}>
                                    {n.message}
                                  </p>
                                )}
                              </div>
                              <span className="text-xs text-gray-500 whitespace-nowrap">
                                {n.createdAt ? new Date(n.createdAt).toLocaleString() : ''}
                              </span>
                            </li>
                          ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            )}

            {tab === 'bookings' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                <h2 className="text-lg md:text-xl font-semibold text-gray-900">Flight bookings</h2>
                  <button
                    type="button"
                    onClick={() => {
                      const csv = [
                        ['Flight', 'Route', 'Duration', 'Price', 'Status', 'Departure', 'Arrival'].join(','),
                        ...filteredBookings.map(b => [
                          `"${b.airline} ${b.flightNumber}"`,
                          `"${b.from} → ${b.to}"`,
                          `"${b.duration || ''}"`,
                          b.price || 0,
                          b.status,
                          b.departure ? new Date(b.departure).toLocaleString() : '',
                          b.arrival ? new Date(b.arrival).toLocaleString() : ''
                        ].join(','))
                      ].join('\n');
                      const blob = new Blob([csv], { type: 'text/csv' });
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `flight-bookings-${new Date().toISOString().split('T')[0]}.csv`;
                      a.click();
                      window.URL.revokeObjectURL(url);
                      toast.success('Bookings exported to CSV');
                    }}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                  >
                    <FaFileExport />
                    Export CSV
                  </button>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center gap-4 mb-4 flex-wrap">
                    <div className="flex items-center gap-2">
                      <FaFilter className="text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">Filters:</span>
                    </div>
                    <select
                      value={statusFilter}
                      onChange={(e) => {
                        const next = new URLSearchParams(searchParams);
                        if (e.target.value) next.set('status', e.target.value);
                        else next.delete('status');
                        setSearchParams(next, { replace: true });
                      }}
                      className="border border-gray-300 rounded-md px-3 py-1 text-sm"
                    >
                      <option value="">All statuses</option>
                      <option value="upcoming">Upcoming</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                    <select
                      value={bookingFilter}
                      onChange={(e) => {
                        const next = new URLSearchParams(searchParams);
                        if (e.target.value) next.set('filter', e.target.value);
                        else next.delete('filter');
                        setSearchParams(next, { replace: true });
                      }}
                      className="border border-gray-300 rounded-md px-3 py-1 text-sm"
                    >
                      <option value="">All bookings</option>
                      <option value="high-value">High value</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        const next = new URLSearchParams(searchParams);
                        next.delete('status');
                        next.delete('filter');
                        setSearchParams(next, { replace: true });
                      }}
                      className="text-sm text-gray-600 hover:text-gray-900"
                    >
                      Clear filters
                    </button>
                  </div>
                </div>
                <div className="border border-gray-100 rounded-xl p-4 bg-white">
                  <h3 className="font-semibold text-gray-900 text-sm md:text-base mb-3">Add flight (owner-side)</h3>
                  <p className="text-gray-600 text-xs md:text-sm mb-3">
                    Use this form to record additional flights after your first one has been created via the external
                    endpoint. These flights will appear in your bookings list and analytics.
                  </p>
                  <AddFlightInlineForm apiUrl={API_URL} onCreated={() => {
                    const loadBookings = async () => {
                      try {
                        setLoadingBookings(true);
                        const url = new URL(`${API_URL}/api/flights/owner/bookings`);
                        const params = url.searchParams;
                        if (statusFilter) params.set('status', statusFilter);
                        if (bookingFilter) params.set('filter', bookingFilter);
                        const res = await fetch(url.toString(), { credentials: 'include' });
                        if (!res.ok) throw new Error('Failed to load bookings');
                        const data = await res.json();
                        const list = (data.bookings || []).map((b) => ({
                          id: String(b._id || b.id),
                          airline: b.airline,
                          flightNumber: b.flightNumber,
                          from: b.from,
                          to: b.to,
                          departure: b.departure,
                          arrival: b.arrival,
                          duration: b.duration,
                          price: b.price,
                          status: b.status || 'upcoming',
                          channel: b.channel,
                          commissionLevel: b.commissionLevel,
                          commissionRate: b.commissionRate,
                          commissionAmount: b.commissionAmount,
                          commissionPaid: b.commissionPaid,
                        }));
                        setBookings(list);
                      } catch (_) {
                      } finally {
                        setLoadingBookings(false);
                      }
                    };
                    loadBookings();
                  }} />
                </div>
                {loadingBookings && (
                  <p className="text-gray-500 text-sm mb-2">Loading bookings…</p>
                )}
                <div className="overflow-x-auto border border-gray-100 rounded-xl">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Flight</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Route</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Duration</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Price</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Commission</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Status</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {filteredBookings
                        .slice((bookingsPage - 1) * 10, bookingsPage * 10)
                        .map((b) => (
                        <tr key={b.id}>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="font-medium text-gray-900">
                              {b.airline} {b.flightNumber}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-gray-700">
                              {b.from} → {b.to}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{b.duration || 'N/A'}</td>
                          <td className="px-4 py-3 text-gray-900 font-semibold whitespace-nowrap">
                            {formatPrice(b.price)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm">
                              <div className="font-medium text-gray-900">
                                {formatPrice(b.commissionAmount || 0)}
                              </div>
                              {b.commissionRate && (
                                <div className="text-xs text-gray-500">
                                  {b.commissionRate}% ({b.channel || 'direct'})
                                </div>
                              )}
                              {b.commissionPaid ? (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                  Paid
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                  Unpaid
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                                b.status === 'completed'
                                  ? 'bg-green-100 text-green-800'
                                  : b.status === 'cancelled'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {b.status.charAt(0).toUpperCase() + b.status.slice(1)}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedBooking(b);
                                  setShowUpgradeModal(true);
                                }}
                                className="p-1.5 text-yellow-600 hover:bg-yellow-50 rounded"
                                title="Upgrade commission level"
                              >
                                <FaCrown className="text-sm" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const details = `Flight: ${b.airline} ${b.flightNumber}\nRoute: ${b.from} → ${b.to}\nDeparture: ${b.departure ? new Date(b.departure).toLocaleString() : 'N/A'}\nArrival: ${b.arrival ? new Date(b.arrival).toLocaleString() : 'N/A'}\nPrice: ${formatPrice(b.price)}\nStatus: ${b.status}`;
                                  alert(details);
                                }}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                                title="View details"
                              >
                                <FaEye className="text-sm" />
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  if (!confirm('Are you sure you want to delete this flight booking?')) return;
                                  try {
                                    const res = await fetch(`${API_URL}/api/flights/owner/bookings/${b.id}`, {
                                      method: 'DELETE',
                                      credentials: 'include',
                                    });
                                    if (!res.ok) {
                                      const data = await res.json();
                                      throw new Error(data.message || 'Failed to delete');
                                    }
                                    toast.success('Flight booking deleted');
                                    // Reload bookings
                                    const url = new URL(`${API_URL}/api/flights/owner/bookings`);
                                    const params = url.searchParams;
                                    if (statusFilter) params.set('status', statusFilter);
                                    if (bookingFilter) params.set('filter', bookingFilter);
                                    const res2 = await fetch(url.toString(), { credentials: 'include' });
                                    if (res2.ok) {
                                      const data = await res2.json();
                                      const list = (data.bookings || []).map((b) => ({
                                        id: String(b._id || b.id),
                                        airline: b.airline,
                                        flightNumber: b.flightNumber,
                                        from: b.from,
                                        to: b.to,
                                        departure: b.departure,
                                        arrival: b.arrival,
                                        duration: b.duration,
                                        price: b.price,
                                        status: b.status || 'upcoming',
                                      }));
                                      setBookings(list);
                                    }
                                  } catch (error) {
                                    toast.error(error.message || 'Failed to delete booking');
                                  }
                                }}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                                title="Delete"
                              >
                                <FaTrash className="text-sm" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredBookings.length === 0 && !loadingBookings && (
                        <tr>
                          <td className="px-4 py-4 text-center text-gray-500 text-sm" colSpan={7}>
                            No flight bookings yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-between text-xs md:text-sm text-gray-600">
                  <span>
                    Page {bookingsPage} of {Math.max(1, Math.ceil((filteredBookings.length || 0) / 10))}
                  </span>
                  <div className="space-x-2">
                    <button
                      type="button"
                      className="px-2 py-1 border rounded disabled:opacity-50"
                      disabled={bookingsPage <= 1}
                      onClick={() => handleBookingsPageChange(1)}
                    >
                      First
                    </button>
                    <button
                      type="button"
                      className="px-2 py-1 border rounded disabled:opacity-50"
                      disabled={bookingsPage <= 1}
                      onClick={() => handleBookingsPageChange(bookingsPage - 1)}
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      className="px-2 py-1 border rounded disabled:opacity-50"
                      disabled={
                        bookingsPage >= Math.max(1, Math.ceil((filteredBookings.length || 0) / 10))
                      }
                      onClick={() => handleBookingsPageChange(bookingsPage + 1)}
                    >
                      Next
                    </button>
                    <button
                      type="button"
                      className="px-2 py-1 border rounded disabled:opacity-50"
                      disabled={
                        bookingsPage >= Math.max(1, Math.ceil((filteredBookings.length || 0) / 10))
                      }
                      onClick={() =>
                        handleBookingsPageChange(Math.max(1, Math.ceil((filteredBookings.length || 0) / 10)))
                      }
                    >
                      Last
                    </button>
                  </div>
                </div>
              </div>
            )}

            {tab === 'analytics' && (
              <div className="space-y-4">
                <h2 className="text-lg md:text-xl font-semibold text-gray-900">Analytics</h2>
                <p className="text-gray-600 text-sm md:text-base">
                  High-level analytics based on your stored flight bookings. Different views (routes, airlines, booking
                  window, completion) are controlled by the links in the Flights navigation.
                </p>
                {loadingAnalytics && (
                  <p className="text-gray-500 text-sm">Loading analytics…</p>
                )}
                {(!analyticsView || analyticsView === '') && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="border border-gray-100 rounded-xl p-4 bg-gray-50">
                      <p className="text-sm text-gray-600 mb-1">Average ticket price</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {formatPrice(
                          analytics?.totals && analytics.totals.completed
                            ? analytics.totals.revenueTotal / Math.max(analytics.totals.completed, 1)
                            : 0,
                        )}
                      </p>
                    </div>
                    <div className="border border-gray-100 rounded-xl p-4 bg-gray-50">
                      <p className="text-sm text-gray-600 mb-1">Completion rate</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {analytics?.totals && analytics.totals.totalBookings
                          ? `${Math.round(
                              (analytics.totals.completed / Math.max(analytics.totals.totalBookings, 1)) * 100,
                            )}%`
                          : '0%'}
                      </p>
                    </div>
                    <div className="border border-gray-100 rounded-xl p-4 bg-gray-50">
                      <p className="text-sm text-gray-600 mb-1">Upcoming share</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {analytics?.totals && analytics.totals.totalBookings
                          ? `${Math.round(
                              (analytics.totals.upcoming / Math.max(analytics.totals.totalBookings, 1)) * 100,
                            )}%`
                          : '0%'}
                      </p>
                    </div>
                  </div>
                )}

                {analyticsView === 'routes' && (
                  <div className="border border-gray-100 rounded-xl p-4 bg-gray-50">
                    <h3 className="font-semibold text-gray-900 mb-2 text-sm md:text-base">Revenue by route</h3>
                    <ul className="space-y-2 text-sm">
                      {(analytics?.routes || []).map((r) => (
                        <li key={r.route} className="flex justify-between">
                          <span className="text-gray-700">{r.route}</span>
                          <span className="text-gray-600">
                            {r.count} flights ·{' '}
                            <span className="font-semibold text-gray-900">{formatPrice(r.revenue)}</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {analyticsView === 'airlines' && (
                  <div className="border border-gray-100 rounded-xl p-4 bg-gray-50">
                    <h3 className="font-semibold text-gray-900 mb-2 text-sm md:text-base">Airline performance</h3>
                    <ul className="space-y-2 text-sm">
                      {(analytics?.airlines || []).map((a) => (
                        <li key={a.airline} className="flex justify-between">
                          <span className="text-gray-700">{a.airline}</span>
                          <span className="text-gray-600">
                            {a.count} flights ·{' '}
                            <span className="font-semibold">{formatPrice(a.revenue)}</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {analyticsView === 'bookwindow' && (
                  <div className="border border-gray-100 rounded-xl p-4 bg-gray-50">
                    <h3 className="font-semibold text-gray-900 mb-2 text-sm md:text-base">Booking window</h3>
                    <p className="text-gray-600 text-sm">
                      Distribution of how many days in advance guests book their flights, based on your stored
                      bookings.
                    </p>
                    <ul className="mt-3 space-y-1 text-sm">
                      {(analytics?.bookingWindow || []).map((b) => (
                        <li key={b.bucket} className="flex justify-between">
                          <span className="text-gray-700">{b.bucket} days</span>
                          <span className="font-semibold text-gray-900">{b.count}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {analyticsView === 'completion' && (
                  <div className="border border-gray-100 rounded-xl p-4 bg-gray-50">
                    <h3 className="font-semibold text-gray-900 mb-2 text-sm md:text-base">Completion vs cancellation</h3>
                    <p className="text-gray-700 text-sm mb-2">
                      Completed flights:{' '}
                      <span className="font-semibold">{analytics?.completion?.completed || 0}</span>
                    </p>
                    <p className="text-gray-700 text-sm">
                      Cancelled flights:{' '}
                      <span className="font-semibold">{analytics?.completion?.cancelled || 0}</span>
                    </p>
                  </div>
                )}

                {analyticsView === 'reports' && (
                  <div className="space-y-6">
                    <div className="border border-gray-100 rounded-xl p-4 bg-gray-50 overflow-x-auto">
                      <h3 className="font-semibold text-gray-900 mb-3 text-sm md:text-base">Daily report</h3>
                      <table className="min-w-full text-xs md:text-sm">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium text-gray-700">Date</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-700">Bookings</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-700">Completed</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-700">Cancelled</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-700">Revenue</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                          {(analytics?.daily || [])
                            .slice((dailyPage - 1) * 10, dailyPage * 10)
                            .map((row) => (
                            <tr key={row.date}>
                              <td className="px-3 py-2 whitespace-nowrap text-gray-800">{row.date}</td>
                              <td className="px-3 py-2 text-gray-800">{row.bookings}</td>
                              <td className="px-3 py-2 text-gray-800">{row.completed}</td>
                              <td className="px-3 py-2 text-gray-800">{row.cancelled}</td>
                              <td className="px-3 py-2 whitespace-nowrap font-semibold text-gray-900">
                                {formatPrice(row.revenue)}
                              </td>
                            </tr>
                          ))}
                          {!analytics?.daily?.length && (
                            <tr>
                              <td className="px-3 py-3 text-center text-gray-500 text-sm" colSpan={5}>
                                No data for this period yet.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                      <div className="mt-3 flex items-center justify-between text-xs md:text-sm text-gray-600">
                        <span>
                          Page {dailyPage} of {Math.max(1, Math.ceil((analytics?.daily?.length || 0) / 10))}
                        </span>
                        <div className="space-x-2">
                          <button
                            type="button"
                            className="px-2 py-1 border rounded disabled:opacity-50"
                            disabled={dailyPage <= 1}
                            onClick={() => setDailyPage(1)}
                          >
                            First
                          </button>
                          <button
                            type="button"
                            className="px-2 py-1 border rounded disabled:opacity-50"
                            disabled={dailyPage <= 1}
                            onClick={() => setDailyPage((p) => Math.max(1, p - 1))}
                          >
                            Previous
                          </button>
                          <button
                            type="button"
                            className="px-2 py-1 border rounded disabled:opacity-50"
                            disabled={dailyPage >= Math.max(1, Math.ceil((analytics?.daily?.length || 0) / 10))}
                            onClick={() =>
                              setDailyPage((p) =>
                                Math.min(p + 1, Math.max(1, Math.ceil((analytics?.daily?.length || 0) / 10))),
                              )
                            }
                          >
                            Next
                          </button>
                          <button
                            type="button"
                            className="px-2 py-1 border rounded disabled:opacity-50"
                            disabled={
                              dailyPage >= Math.max(1, Math.ceil((analytics?.daily?.length || 0) / 10))
                            }
                            onClick={() =>
                              setDailyPage(Math.max(1, Math.ceil((analytics?.daily?.length || 0) / 10)))
                            }
                          >
                            Last
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="border border-gray-100 rounded-xl p-4 bg-gray-50 overflow-x-auto">
                      <h3 className="font-semibold text-gray-900 mb-3 text-sm md:text-base">Monthly summary</h3>
                      <table className="min-w-full text-xs md:text-sm">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium text-gray-700">Month</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-700">Bookings</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-700">Completed</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-700">Cancelled</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-700">Revenue</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                          {(analytics?.monthly || [])
                            .slice((monthlyPage - 1) * 10, monthlyPage * 10)
                            .map((row) => (
                            <tr key={row.month}>
                              <td className="px-3 py-2 whitespace-nowrap text-gray-800">{row.month}</td>
                              <td className="px-3 py-2 text-gray-800">{row.bookings}</td>
                              <td className="px-3 py-2 text-gray-800">{row.completed}</td>
                              <td className="px-3 py-2 text-gray-800">{row.cancelled}</td>
                              <td className="px-3 py-2 whitespace-nowrap font-semibold text-gray-900">
                                {formatPrice(row.revenue)}
                              </td>
                            </tr>
                          ))}
                          {!analytics?.monthly?.length && (
                            <tr>
                              <td className="px-3 py-3 text-center text-gray-500 text-sm" colSpan={5}>
                                No monthly data summarised for this period yet.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                      <div className="mt-3 flex items-center justify-between text-xs md:text-sm text-gray-600">
                        <span>
                          Page {monthlyPage} of {Math.max(1, Math.ceil((analytics?.monthly?.length || 0) / 10))}
                        </span>
                        <div className="space-x-2">
                          <button
                            type="button"
                            className="px-2 py-1 border rounded disabled:opacity-50"
                            disabled={monthlyPage <= 1}
                            onClick={() => setMonthlyPage(1)}
                          >
                            First
                          </button>
                          <button
                            type="button"
                            className="px-2 py-1 border rounded disabled:opacity-50"
                            disabled={monthlyPage <= 1}
                            onClick={() => setMonthlyPage((p) => Math.max(1, p - 1))}
                          >
                            Previous
                          </button>
                          <button
                            type="button"
                            className="px-2 py-1 border rounded disabled:opacity-50"
                            disabled={
                              monthlyPage >= Math.max(1, Math.ceil((analytics?.monthly?.length || 0) / 10))
                            }
                            onClick={() =>
                              setMonthlyPage((p) =>
                                Math.min(p + 1, Math.max(1, Math.ceil((analytics?.monthly?.length || 0) / 10))),
                              )
                            }
                          >
                            Next
                          </button>
                          <button
                            type="button"
                            className="px-2 py-1 border rounded disabled:opacity-50"
                            disabled={
                              monthlyPage >= Math.max(1, Math.ceil((analytics?.monthly?.length || 0) / 10))
                            }
                            onClick={() =>
                              setMonthlyPage(Math.max(1, Math.ceil((analytics?.monthly?.length || 0) / 10)))
                            }
                          >
                            Last
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {tab === 'expenses' && (
              <div className="space-y-4">
                <h2 className="text-lg md:text-xl font-semibold text-gray-900">Expenses</h2>
                <p className="text-gray-600 text-sm md:text-base">
                  Simple derived overview of flight-related expenses (commissions, service fees, marketing) based on your
                  completed flight bookings.
                </p>
                {loadingExpenses && (
                  <p className="text-gray-500 text-sm">Loading expenses…</p>
                )}
                <div className="border border-gray-100 rounded-xl overflow-hidden">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Category</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Description</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {(!typeFilter || typeFilter === 'commission') && (
                        <tr>
                          <td className="px-4 py-3 whitespace-nowrap">Airline commission</td>
                          <td className="px-4 py-3">Estimated commission for completed bookings.</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {formatPrice(expensesSummary?.commission || 0)}
                          </td>
                        </tr>
                      )}
                      {(!typeFilter || typeFilter === 'processing') && (
                        <tr>
                          <td className="px-4 py-3 whitespace-nowrap">Service fees</td>
                          <td className="px-4 py-3">Platform fees and payment processing.</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {formatPrice(expensesSummary?.processing || 0)}
                          </td>
                        </tr>
                      )}
                      {(!typeFilter || typeFilter === 'marketing') && (
                        <tr>
                          <td className="px-4 py-3 whitespace-nowrap">Marketing & promos</td>
                          <td className="px-4 py-3">Discounts, vouchers, and promotional campaigns.</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {formatPrice(expensesSummary?.marketing || 0)}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="border border-gray-100 rounded-xl p-4 bg-white space-y-4">
                  <h3 className="font-semibold text-gray-900 text-sm md:text-base">Recorded expenses</h3>
                  <form className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end" onSubmit={handleCreateExpense}>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Date</label>
                      <input
                        type="date"
                        value={newExpense.date}
                        onChange={(e) => handleNewExpenseChange('date', e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Amount</label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={newExpense.amount}
                        onChange={(e) => handleNewExpenseChange('amount', e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
                      <input
                        type="text"
                        value={newExpense.category}
                        onChange={(e) => handleNewExpenseChange('category', e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">Note</label>
                      <input
                        type="text"
                        value={newExpense.note}
                        onChange={(e) => handleNewExpenseChange('note', e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                        placeholder="Optional description"
                      />
                    </div>
                    <div className="md:col-span-5 flex justify-end">
                      <button
                        type="submit"
                        disabled={savingExpense || !newExpense.date || !newExpense.amount}
                        className="inline-flex items-center px-3 py-1.5 rounded-md bg-blue-600 text-white text-xs md:text-sm font-medium disabled:opacity-50"
                      >
                        {savingExpense ? 'Saving…' : 'Add expense'}
                      </button>
                    </div>
                  </form>

                  <div className="border border-gray-100 rounded-xl overflow-x-auto">
                    <table className="min-w-full text-xs md:text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-gray-700">Date</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-700">Category</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-700">Amount</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-700">Note</th>
                          <th className="px-3 py-2 text-right font-medium text-gray-700">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white">
                        {loadingExpensesLog ? (
                          <tr>
                            <td className="px-3 py-3 text-center text-gray-500 text-sm" colSpan={5}>
                              Loading expenses…
                            </td>
                          </tr>
                        ) : expensesLog.length === 0 ? (
                          <tr>
                            <td className="px-3 py-3 text-center text-gray-500 text-sm" colSpan={5}>
                              No recorded expenses yet.
                            </td>
                          </tr>
                        ) : (
                          expensesLog.map((exp) => (
                            <tr key={exp._id}>
                              <td className="px-3 py-2 whitespace-nowrap text-gray-800">
                                {exp.date ? new Date(exp.date).toLocaleDateString() : ''}
                              </td>
                              <td className="px-3 py-2 text-gray-800">{exp.category || 'general'}</td>
                              <td className="px-3 py-2 whitespace-nowrap font-semibold text-gray-900">
                                {formatPrice(exp.amount)}
                              </td>
                              <td className="px-3 py-2 text-gray-700 max-w-xs truncate" title={exp.note || ''}>
                                {exp.note || ''}
                              </td>
                              <td className="px-3 py-2 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteExpense(exp._id)}
                                  className="inline-flex items-center px-2 py-1 rounded border border-red-200 text-red-600 text-xs hover:bg-red-50"
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs md:text-sm text-gray-600">
                    <span>
                      Page {expensesPage} of {expensesTotalPages}
                    </span>
                    <div className="space-x-2">
                      <button
                        type="button"
                        className="px-2 py-1 border rounded disabled:opacity-50"
                        disabled={expensesPage <= 1}
                        onClick={() => handleExpensesPageChange(1)}
                      >
                        First
                      </button>
                      <button
                        type="button"
                        className="px-2 py-1 border rounded disabled:opacity-50"
                        disabled={expensesPage <= 1}
                        onClick={() => handleExpensesPageChange(expensesPage - 1)}
                      >
                        Previous
                      </button>
                      <button
                        type="button"
                        className="px-2 py-1 border rounded disabled:opacity-50"
                        disabled={expensesPage >= expensesTotalPages}
                        onClick={() => handleExpensesPageChange(expensesPage + 1)}
                      >
                        Next
                      </button>
                      <button
                        type="button"
                        className="px-2 py-1 border rounded disabled:opacity-50"
                        disabled={expensesPage >= expensesTotalPages}
                        onClick={() => handleExpensesPageChange(expensesTotalPages)}
                      >
                        Last
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {tab === 'notifications' && (
              <div className="space-y-4">
                <h2 className="text-lg md:text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <FaBell />
                  Notifications
                </h2>
                {loadingNotifications ? (
                  <p className="text-gray-500 text-sm">Loading notifications…</p>
                ) : notifications.length === 0 ? (
                  <p className="text-gray-500 text-sm">No notifications yet.</p>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {notifications
                      .slice()
                      .filter((n) => {
                        if (!typeFilter) return true;
                        const t = String(n.type || '').toLowerCase();
                        if (typeFilter === 'status') return t.includes('status') || t.includes('flight');
                        if (typeFilter === 'payments') return t.includes('payment') || t.includes('payout');
                        if (typeFilter === 'system') return !t || t === 'system';
                        return true;
                      })
                      .sort((a, b) => new Date(b.createdAt || b.timestamp) - new Date(a.createdAt || a.timestamp))
                      .map((n) => (
                        <div
                          key={n._id}
                          className={`p-4 rounded-xl border text-sm flex flex-col md:flex-row md:items-center md:justify-between gap-3 ${
                            !n.isRead ? 'bg-blue-50 border-blue-300' : 'bg-gray-50 border-gray-200'
                          }`}
                        >
                          <div>
                            <p className="font-semibold text-gray-900">{n.title}</p>
                            {n.message && <p className="text-gray-700 mt-1 whitespace-pre-line">{n.message}</p>}
                          </div>
                          <div className="flex items-center gap-2 md:ml-4">
                            <span className="text-xs text-gray-500" title={n.createdAt}>
                              {n.createdAt ? new Date(n.createdAt).toLocaleString() : ''}
                            </span>
                            {!n.isRead && (
                              <span className="px-2 py-1 rounded-full bg-blue-600 text-white text-xs">New</span>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}

            {tab === 'reports' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg md:text-xl font-semibold text-gray-900">Reports & Analytics</h2>
                  <div className="flex items-center gap-2">
                    <select
                      value={analyticsView}
                      onChange={(e) => {
                        const next = new URLSearchParams(searchParams);
                        if (e.target.value) next.set('view', e.target.value);
                        else next.delete('view');
                        setSearchParams(next, { replace: true });
                      }}
                      className="border border-gray-300 rounded-md px-3 py-1 text-sm"
                    >
                      <option value="">Summary</option>
                      <option value="routes">Revenue by Route</option>
                      <option value="airlines">Airline Performance</option>
                      <option value="bookwindow">Booking Window</option>
                      <option value="completion">Completion vs Cancellation</option>
                      <option value="reports">Daily & Monthly Reports</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        const csv = analytics?.daily ? [
                          ['Date', 'Bookings', 'Completed', 'Cancelled', 'Revenue'].join(','),
                          ...analytics.daily.map(r => [
                            r.date,
                            r.bookings,
                            r.completed,
                            r.cancelled,
                            r.revenue
                          ].join(','))
                        ].join('\n') : '';
                        if (csv) {
                          const blob = new Blob([csv], { type: 'text/csv' });
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `flight-reports-${new Date().toISOString().split('T')[0]}.csv`;
                          a.click();
                          window.URL.revokeObjectURL(url);
                          toast.success('Reports exported to CSV');
                        }
                      }}
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                    >
                      <FaFileExport />
                      Export
                    </button>
          </div>
        </div>
                {loadingAnalytics && (
                  <p className="text-gray-500 text-sm">Loading reports…</p>
                )}
                {(!analyticsView || analyticsView === '') && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="border border-gray-100 rounded-xl p-4 bg-gray-50">
                      <p className="text-sm text-gray-600 mb-1">Average ticket price</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {formatPrice(
                          analytics?.totals && analytics.totals.completed
                            ? analytics.totals.revenueTotal / Math.max(analytics.totals.completed, 1)
                            : 0,
                        )}
                      </p>
                    </div>
                    <div className="border border-gray-100 rounded-xl p-4 bg-gray-50">
                      <p className="text-sm text-gray-600 mb-1">Completion rate</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {analytics?.totals && analytics.totals.totalBookings
                          ? `${Math.round(
                              (analytics.totals.completed / Math.max(analytics.totals.totalBookings, 1)) * 100,
                            )}%`
                          : '0%'}
                      </p>
                    </div>
                    <div className="border border-gray-100 rounded-xl p-4 bg-gray-50">
                      <p className="text-sm text-gray-600 mb-1">Upcoming share</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {analytics?.totals && analytics.totals.totalBookings
                          ? `${Math.round(
                              (analytics.totals.upcoming / Math.max(analytics.totals.totalBookings, 1)) * 100,
                            )}%`
                          : '0%'}
                      </p>
                    </div>
                  </div>
                )}
                {analyticsView === 'routes' && (
                  <div className="border border-gray-100 rounded-xl p-4 bg-gray-50">
                    <h3 className="font-semibold text-gray-900 mb-2 text-sm md:text-base">Revenue by route</h3>
                    <ul className="space-y-2 text-sm">
                      {(analytics?.routes || []).map((r) => (
                        <li key={r.route} className="flex justify-between">
                          <span className="text-gray-700">{r.route}</span>
                          <span className="text-gray-600">
                            {r.count} flights ·{' '}
                            <span className="font-semibold text-gray-900">{formatPrice(r.revenue)}</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {analyticsView === 'airlines' && (
                  <div className="border border-gray-100 rounded-xl p-4 bg-gray-50">
                    <h3 className="font-semibold text-gray-900 mb-2 text-sm md:text-base">Airline performance</h3>
                    <ul className="space-y-2 text-sm">
                      {(analytics?.airlines || []).map((a) => (
                        <li key={a.airline} className="flex justify-between">
                          <span className="text-gray-700">{a.airline}</span>
                          <span className="text-gray-600">
                            {a.count} flights ·{' '}
                            <span className="font-semibold">{formatPrice(a.revenue)}</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {analyticsView === 'bookwindow' && (
                  <div className="border border-gray-100 rounded-xl p-4 bg-gray-50">
                    <h3 className="font-semibold text-gray-900 mb-2 text-sm md:text-base">Booking window</h3>
                    <p className="text-gray-600 text-sm mb-3">
                      Distribution of how many days in advance guests book their flights.
                    </p>
                    <ul className="mt-3 space-y-1 text-sm">
                      {(analytics?.bookingWindow || []).map((b) => (
                        <li key={b.bucket} className="flex justify-between">
                          <span className="text-gray-700">{b.bucket} days</span>
                          <span className="font-semibold text-gray-900">{b.count}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {analyticsView === 'completion' && (
                  <div className="border border-gray-100 rounded-xl p-4 bg-gray-50">
                    <h3 className="font-semibold text-gray-900 mb-2 text-sm md:text-base">Completion vs cancellation</h3>
                    <p className="text-gray-700 text-sm mb-2">
                      Completed flights:{' '}
                      <span className="font-semibold">{analytics?.completion?.completed || 0}</span>
                    </p>
                    <p className="text-gray-700 text-sm">
                      Cancelled flights:{' '}
                      <span className="font-semibold">{analytics?.completion?.cancelled || 0}</span>
                    </p>
                  </div>
                )}
                {analyticsView === 'reports' && (
                  <div className="space-y-6">
                    <div className="border border-gray-100 rounded-xl p-4 bg-gray-50 overflow-x-auto">
                      <h3 className="font-semibold text-gray-900 mb-3 text-sm md:text-base">Daily report</h3>
                      <table className="min-w-full text-xs md:text-sm">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium text-gray-700">Date</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-700">Bookings</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-700">Completed</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-700">Cancelled</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-700">Revenue</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                          {(analytics?.daily || [])
                            .slice((dailyPage - 1) * 10, dailyPage * 10)
                            .map((row) => (
                            <tr key={row.date}>
                              <td className="px-3 py-2 whitespace-nowrap text-gray-800">{row.date}</td>
                              <td className="px-3 py-2 text-gray-800">{row.bookings}</td>
                              <td className="px-3 py-2 text-gray-800">{row.completed}</td>
                              <td className="px-3 py-2 text-gray-800">{row.cancelled}</td>
                              <td className="px-3 py-2 whitespace-nowrap font-semibold text-gray-900">
                                {formatPrice(row.revenue)}
                              </td>
                            </tr>
                          ))}
                          {!analytics?.daily?.length && (
                            <tr>
                              <td className="px-3 py-3 text-center text-gray-500 text-sm" colSpan={5}>
                                No data for this period yet.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    <div className="border border-gray-100 rounded-xl p-4 bg-gray-50 overflow-x-auto">
                      <h3 className="font-semibold text-gray-900 mb-3 text-sm md:text-base">Monthly summary</h3>
                      <table className="min-w-full text-xs md:text-sm">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium text-gray-700">Month</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-700">Bookings</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-700">Completed</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-700">Cancelled</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-700">Revenue</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                          {(analytics?.monthly || [])
                            .slice((monthlyPage - 1) * 10, monthlyPage * 10)
                            .map((row) => (
                            <tr key={row.month}>
                              <td className="px-3 py-2 whitespace-nowrap text-gray-800">{row.month}</td>
                              <td className="px-3 py-2 text-gray-800">{row.bookings}</td>
                              <td className="px-3 py-2 text-gray-800">{row.completed}</td>
                              <td className="px-3 py-2 text-gray-800">{row.cancelled}</td>
                              <td className="px-3 py-2 whitespace-nowrap font-semibold text-gray-900">
                                {formatPrice(row.revenue)}
                              </td>
                            </tr>
                          ))}
                          {!analytics?.monthly?.length && (
                            <tr>
                              <td className="px-3 py-3 text-center text-gray-500 text-sm" colSpan={5}>
                                No monthly data summarised for this period yet.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {tab === 'finance' && (
              <div className="space-y-4">
                <h2 className="text-lg md:text-xl font-semibold text-gray-900">Finance & Profit & Loss</h2>
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Revenue Summary</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="border border-gray-200 rounded-lg p-4">
                      <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
                      <p className="text-2xl font-bold text-gray-900">{formatPrice(metrics.revenue)}</p>
                    </div>
                    <div className="border border-gray-200 rounded-lg p-4">
                      <p className="text-sm text-gray-600 mb-1">Total Commission</p>
                      <p className="text-2xl font-bold text-red-600">
                        {formatPrice(bookings.reduce((sum, b) => sum + (b.commissionAmount || 0), 0))}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {bookings.length > 0 
                          ? `${((bookings.reduce((sum, b) => sum + (b.commissionAmount || 0), 0) / Math.max(metrics.revenue, 1)) * 100).toFixed(1)}% of revenue`
                          : 'No bookings yet'}
                      </p>
                    </div>
                    <div className="border border-gray-200 rounded-lg p-4">
                      <p className="text-sm text-gray-600 mb-1">Net After Commission</p>
                      <p className="text-2xl font-bold text-emerald-600">
                        {formatPrice(metrics.revenue - bookings.reduce((sum, b) => sum + (b.commissionAmount || 0), 0))}
                      </p>
                    </div>
                  </div>
                  <div className="mt-6 border-t border-gray-200 pt-6">
                    <h4 className="font-semibold text-gray-900 mb-3">Commission Breakdown</h4>
                    <div className="overflow-x-auto border border-gray-200 rounded-lg">
                      <table className="min-w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left font-medium text-gray-700">Flight</th>
                            <th className="px-4 py-2 text-left font-medium text-gray-700">Price</th>
                            <th className="px-4 py-2 text-left font-medium text-gray-700">Channel</th>
                            <th className="px-4 py-2 text-left font-medium text-gray-700">Commission Rate</th>
                            <th className="px-4 py-2 text-left font-medium text-gray-700">Commission Amount</th>
                            <th className="px-4 py-2 text-left font-medium text-gray-700">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                          {bookings.filter(b => b.status === 'completed').slice(0, 10).map((b) => (
                            <tr key={b.id}>
                              <td className="px-4 py-2">
                                <div className="font-medium text-gray-900">{b.airline} {b.flightNumber}</div>
                                <div className="text-xs text-gray-500">{b.from} → {b.to}</div>
                              </td>
                              <td className="px-4 py-2 font-semibold">{formatPrice(b.price)}</td>
                              <td className="px-4 py-2">
                                <span className={`px-2 py-1 rounded text-xs ${
                                  b.channel === 'online' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                                }`}>
                                  {b.channel || 'direct'}
                                </span>
                              </td>
                              <td className="px-4 py-2">{b.commissionRate ? `${b.commissionRate}%` : 'N/A'}</td>
                              <td className="px-4 py-2 font-semibold text-red-600">{formatPrice(b.commissionAmount || 0)}</td>
                              <td className="px-4 py-2">
                                {b.commissionPaid ? (
                                  <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-800">Paid</span>
                                ) : (
                                  <span className="px-2 py-1 rounded text-xs bg-red-100 text-red-800">Unpaid</span>
                                )}
                              </td>
                            </tr>
                          ))}
                          {bookings.filter(b => b.status === 'completed').length === 0 && (
                            <tr>
                              <td className="px-4 py-4 text-center text-gray-500 text-sm" colSpan={6}>
                                No completed bookings yet.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="mt-6">
                    <p className="text-sm text-gray-600 mb-2">For detailed profit & loss analysis, please use the Expenses tab to track all costs.</p>
                    <button
                      type="button"
                      onClick={() => {
                        const csv = [
                          ['Category', 'Amount'].join(','),
                          ['Revenue', metrics.revenue].join(','),
                          ['Total Commission', bookings.reduce((sum, b) => sum + (b.commissionAmount || 0), 0)].join(','),
                          ['Processing Fees', expensesSummary?.processing || 0].join(','),
                          ['Marketing', expensesSummary?.marketing || 0].join(','),
                          ['Total Expenses', bookings.reduce((sum, b) => sum + (b.commissionAmount || 0), 0) + (expensesSummary?.processing || 0) + (expensesSummary?.marketing || 0)].join(','),
                          ['Net After Commission', metrics.revenue - bookings.reduce((sum, b) => sum + (b.commissionAmount || 0), 0)].join(',')
                        ].join('\n');
                        const blob = new Blob([csv], { type: 'text/csv' });
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `flight-finance-${new Date().toISOString().split('T')[0]}.csv`;
                        a.click();
                        window.URL.revokeObjectURL(url);
                        toast.success('Finance report exported to CSV');
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                    >
                      <FaFileExport />
                      Export Finance Report
                    </button>
                  </div>
                </div>
              </div>
            )}

            {tab === 'settings' && (
              <div className="space-y-4">
                <h2 className="text-lg md:text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <FaCog />
                  Settings
                </h2>
                <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-6">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Flight Management Settings</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Configure your flight booking preferences and notification settings.
                    </p>
                    <div className="space-y-3">
                      <label className="flex items-center gap-2">
                        <input type="checkbox" className="rounded" defaultChecked />
                        <span className="text-sm text-gray-700">Email notifications for new bookings</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" className="rounded" defaultChecked />
                        <span className="text-sm text-gray-700">SMS notifications for urgent updates</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" className="rounded" />
                        <span className="text-sm text-gray-700">Auto-approve bookings</span>
                      </label>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Default Settings</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Default Channel</label>
                        <select className="w-full max-w-xs border border-gray-300 rounded-md px-3 py-2 text-sm">
                          <option value="direct">Direct</option>
                          <option value="online">Online</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Default Status</label>
                        <select className="w-full max-w-xs border border-gray-300 rounded-md px-3 py-2 text-sm">
                          <option value="upcoming">Upcoming</option>
                          <option value="completed">Completed</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-gray-200">
                    <button
                      type="button"
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
                    >
                      Save Settings
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        )}
      </div>

      {/* Commission Upgrade Modal */}
      {selectedBooking && (
        <CommissionUpgradeModal
          isOpen={showUpgradeModal}
          onClose={() => {
            setShowUpgradeModal(false);
            setSelectedBooking(null);
          }}
          itemId={selectedBooking.id}
          itemType="flight"
          currentLevel={selectedBooking.commissionLevel}
          onUpgradeSuccess={async (updatedBooking) => {
            // Reload bookings to get updated commission data
            try {
              const url = new URL(`${API_URL}/api/flights/owner/bookings`);
              const params = url.searchParams;
              if (statusFilter) params.set('status', statusFilter);
              if (bookingFilter) params.set('filter', bookingFilter);
              const res = await fetch(url.toString(), { credentials: 'include' });
              if (res.ok) {
                const data = await res.json();
                const list = (data.bookings || []).map((b) => ({
                  id: String(b._id || b.id),
                  airline: b.airline,
                  flightNumber: b.flightNumber,
                  from: b.from,
                  to: b.to,
                  departure: b.departure,
                  arrival: b.arrival,
                  duration: b.duration,
                  price: b.price,
                  status: b.status || 'upcoming',
                  channel: b.channel,
                  commissionLevel: b.commissionLevel,
                  commissionRate: b.commissionRate,
                  commissionAmount: b.commissionAmount,
                  commissionPaid: b.commissionPaid,
                }));
                setBookings(list);
              }
            } catch (error) {
              console.error('Failed to reload bookings:', error);
            }
            toast.success('Commission level upgraded successfully!');
          }}
        />
      )}

      {/* Commission Upgrade Modal */}
      {selectedBooking && (
        <CommissionUpgradeModal
          isOpen={showUpgradeModal}
          onClose={() => {
            setShowUpgradeModal(false);
            setSelectedBooking(null);
          }}
          itemId={selectedBooking.id}
          itemType="flight"
          currentLevel={selectedBooking.commissionLevel}
          onUpgradeSuccess={async (updatedBooking) => {
            // Reload bookings to get updated commission data
            try {
              const url = new URL(`${API_URL}/api/flights/owner/bookings`);
              const params = url.searchParams;
              if (statusFilter) params.set('status', statusFilter);
              if (bookingFilter) params.set('filter', bookingFilter);
              const res = await fetch(url.toString(), { credentials: 'include' });
              if (res.ok) {
                const data = await res.json();
                const list = (data.bookings || []).map((b) => ({
                  id: String(b._id || b.id),
                  airline: b.airline,
                  flightNumber: b.flightNumber,
                  from: b.from,
                  to: b.to,
                  departure: b.departure,
                  arrival: b.arrival,
                  duration: b.duration,
                  price: b.price,
                  status: b.status || 'upcoming',
                  channel: b.channel,
                  commissionLevel: b.commissionLevel,
                  commissionRate: b.commissionRate,
                  commissionAmount: b.commissionAmount,
                  commissionPaid: b.commissionPaid,
                }));
                setBookings(list);
              }
            } catch (error) {
              console.error('Failed to reload bookings:', error);
            }
            toast.success('Commission level upgraded successfully!');
          }}
        />
      )}
    </div>
  );
}

export default FlightsDashboard;
