import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FaPlane, FaCalendarAlt, FaDollarSign, FaChartLine, FaBell } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function FlightsDashboard() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  const tab = (searchParams.get('tab') || 'overview').toLowerCase();

  const [bookings, setBookings] = useState([
    {
      id: 'F001',
      airline: 'RwandAir',
      flightNumber: 'WB 101',
      from: 'Kigali (KGL)',
      to: 'Nairobi (NBO)',
      departure: '2025-01-10T08:30:00Z',
      arrival: '2025-01-10T10:00:00Z',
      duration: '1h 30m',
      price: 450000,
      status: 'upcoming',
    },
    {
      id: 'F002',
      airline: 'Kenya Airways',
      flightNumber: 'KQ 230',
      from: 'Kigali (KGL)',
      to: 'Kampala (EBB)',
      departure: '2025-01-15T11:15:00Z',
      arrival: '2025-01-15T13:00:00Z',
      duration: '1h 45m',
      price: 380000,
      status: 'upcoming',
    },
    {
      id: 'F003',
      airline: 'Ethiopian Airlines',
      flightNumber: 'ET 346',
      from: 'Kigali (KGL)',
      to: 'Addis Ababa (ADD)',
      departure: '2024-12-01T14:20:00Z',
      arrival: '2024-12-01T16:35:00Z',
      duration: '2h 15m',
      price: 520000,
      status: 'completed',
    },
  ]);

  const metrics = useMemo(() => {
    const now = new Date();
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

    return {
      totalBookings,
      upcoming,
      completed,
      revenue,
    };
  }, [bookings]);

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
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
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
            </nav>
          </div>

          <div className="p-6">
            {tab === 'overview' && (
              <div className="space-y-6">
                <h2 className="text-lg md:text-xl font-semibold text-gray-900">Overview</h2>
                <p className="text-gray-600 text-sm md:text-base">
                  This section summarizes your recent flight activity. In a future iteration, this will connect to live
                  airline APIs and your own flight booking data.
                </p>
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
                <h2 className="text-lg md:text-xl font-semibold text-gray-900">Flight bookings</h2>
                <div className="overflow-x-auto border border-gray-100 rounded-xl">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Flight</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Route</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Duration</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Price</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {bookings.map((b) => (
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
                          <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{b.duration}</td>
                          <td className="px-4 py-3 text-gray-900 font-semibold whitespace-nowrap">
                            {formatPrice(b.price)}
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
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {tab === 'analytics' && (
              <div className="space-y-4">
                <h2 className="text-lg md:text-xl font-semibold text-gray-900">Analytics</h2>
                <p className="text-gray-600 text-sm md:text-base">
                  High-level analytics based on your current mock flight bookings. When real flight APIs are connected, this
                  section will use live data.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="border border-gray-100 rounded-xl p-4 bg-gray-50">
                    <p className="text-sm text-gray-600 mb-1">Average ticket price</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatPrice(
                        bookings.length
                          ? bookings.reduce((sum, b) => sum + (b.price || 0), 0) / Math.max(bookings.length, 1)
                          : 0,
                      )}
                    </p>
                  </div>
                  <div className="border border-gray-100 rounded-xl p-4 bg-gray-50">
                    <p className="text-sm text-gray-600 mb-1">Completion rate</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {bookings.length
                        ? `${Math.round((metrics.completed / Math.max(bookings.length, 1)) * 100)}%`
                        : '0%'}
                    </p>
                  </div>
                  <div className="border border-gray-100 rounded-xl p-4 bg-gray-50">
                    <p className="text-sm text-gray-600 mb-1">Upcoming share</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {bookings.length
                        ? `${Math.round((metrics.upcoming / Math.max(bookings.length, 1)) * 100)}%`
                        : '0%'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {tab === 'expenses' && (
              <div className="space-y-4">
                <h2 className="text-lg md:text-xl font-semibold text-gray-900">Expenses</h2>
                <p className="text-gray-600 text-sm md:text-base">
                  This is a simple placeholder for flight-related expenses (commissions, service fees). You can align this
                  later with your car and property finance modules.
                </p>
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
                      <tr>
                        <td className="px-4 py-3 whitespace-nowrap">Airline commission</td>
                        <td className="px-4 py-3">Estimated commission for completed bookings.</td>
                        <td className="px-4 py-3 whitespace-nowrap">{formatPrice(metrics.revenue * 0.15)}</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 whitespace-nowrap">Service fees</td>
                        <td className="px-4 py-3">Platform fees and payment processing.</td>
                        <td className="px-4 py-3 whitespace-nowrap">{formatPrice(metrics.revenue * 0.05)}</td>
                      </tr>
                    </tbody>
                  </table>
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
                      .sort(
                        (a, b) => new Date(b.createdAt || b.timestamp) - new Date(a.createdAt || a.timestamp),
                      )
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
          </div>
        </div>
      </div>
    </div>
  );
}

export default FlightsDashboard;
