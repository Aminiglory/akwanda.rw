import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useSearchParams, Link } from 'react-router-dom';
import { useLocale } from '../contexts/LocaleContext';
import ReceiptPreview from '../components/ReceiptPreview';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import SuccessModal from '../components/SuccessModal';
import {
  FaCar,
  FaCalendarAlt,
  FaDollarSign,
  FaChartLine,
  FaStar,
  FaEnvelope,
  FaCog,
} from 'react-icons/fa';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const makeAbsolute = (u) => {
  if (!u) return null;
  let s = String(u).trim().replace(/\\+/g, '/');
  if (/^https?:\/\//i.test(s)) return s;
  if (!s.startsWith('/')) s = `/${s}`;
  return `${API_URL}${s}`;
};

export default function CarOwnerDashboard() {
  const { user } = useAuth();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { formatCurrencyRWF } = useLocale() || {};
  const view = (searchParams.get('view') || 'overview').toLowerCase();
  const financeMode = (searchParams.get('mode') || 'expenses').toLowerCase();
  const financeFilter = (searchParams.get('filter') || 'all').toLowerCase();
  const financeRange = (searchParams.get('range') || '30').toLowerCase();

  const financeModeLabel = financeMode === 'income'
    ? 'Income & revenue'
    : 'Expenses';

  const financeFilterLabel =
    financeFilter === 'paid' ? 'Paid'
    : financeFilter === 'pending' ? 'Pending'
    : financeFilter === 'unpaid' ? 'Unpaid'
    : 'All payments';

  const financeRangeLabel =
    financeRange === 'mtd' ? 'Month to date'
    : financeRange === 'ytd' ? 'Year to date'
    : financeRange === '90' ? 'Last 90 days'
    : 'Last 30 days';
  const financeStats = {
    rev30: 0,
    revYtd: 0,
    avg30: 0,
    bookings30: 0,
    bookingsYtd: 0,
  };
  const [cars, setCars] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [bookingFilters, setBookingFilters] = useState({ status: '', from: '', to: '' });
  const [receiptBooking, setReceiptBooking] = useState(null);
  const [tripsTab, setTripsTab] = useState(() => {
    const t = (searchParams.get('tripsTab') || '').toLowerCase();
    return t === 'tours' || t === 'routes' ? t : 'trips';
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [category, setCategory] = useState('car'); // 'car' | 'motorcycle' | 'bicycle'
  const [successOpen, setSuccessOpen] = useState(false);
  const [successTitle, setSuccessTitle] = useState('Success');
  const [successMsg, setSuccessMsg] = useState('Action completed successfully.');
  const [selectedCarId, setSelectedCarId] = useState('');
  const [stats, setStats] = useState({
    totalBookings: 0,
    pending: 0,
    active: 0,
    completed: 0,
    cancelled: 0,
    totalRevenue: 0,
    daysRented: 0,
    avgRentalLength: 0
  });
  const [carExpenses, setCarExpenses] = useState([]);
  const [carExpensesTotal, setCarExpensesTotal] = useState(0);
  const [carFinanceSummary, setCarFinanceSummary] = useState(null);
  const [carFinanceLoading, setCarFinanceLoading] = useState(false);
  const [insuranceForm, setInsuranceForm] = useState({
    insuranceProvider: '',
    insurancePolicyNumber: '',
    insuranceExpiryDate: '',
    registrationNumber: '',
    registrationExpiryDate: ''
  });
  const [insuranceSaving, setInsuranceSaving] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    carId: '',
    date: '',
    amount: '',
    category: '',
    note: ''
  });
  const [expenseSaving, setExpenseSaving] = useState(false);
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState('');
  const [editingExpenseId, setEditingExpenseId] = useState(null);
  const [editingExpenseForm, setEditingExpenseForm] = useState({
    date: '',
    amount: '',
    category: '',
    note: ''
  });
  const [ownerNotifications, setOwnerNotifications] = useState([]);
  const [ownerNotificationsLoading, setOwnerNotificationsLoading] = useState(false);
  const [ownerNotifShowUnreadOnly, setOwnerNotifShowUnreadOnly] = useState(false);
  const [ownerNotifTypeFilter, setOwnerNotifTypeFilter] = useState('all');

  async function loadData() {
    try {
      setLoading(true);
      console.log('[Vehicles][loadData] fetching mine & bookings');
      const [carsRes, bookingsRes] = await Promise.all([
        fetch(`${API_URL}/api/cars/mine`, { credentials: 'include' }),
        fetch(`${API_URL}/api/car-bookings/for-my-cars`, { credentials: 'include' })
      ]);
      const carsData = await carsRes.json();
      const bookingsData = await bookingsRes.json();
      console.log('[Vehicles][loadData] responses', { carsStatus: carsRes.status, bookingsStatus: bookingsRes.status, carsCount: (carsData?.cars||[]).length, bookingsCount: (bookingsData?.bookings||[]).length });
      if (!carsRes.ok) throw new Error(carsData.message || '');
      if (!bookingsRes.ok) throw new Error(bookingsData.message || '');
      setCars(carsData.cars || []);
      setBookings(bookingsData.bookings || []);
    } catch (e) {
      console.error('[Vehicles][loadData] error', e);
      // Show empty state silently
      setCars([]);
      setBookings([]);
    } finally { setLoading(false); }
  }

  async function loadOwnerNotifications() {
    try {
      setOwnerNotificationsLoading(true);
      const res = await fetch(`${API_URL}/api/user/notifications`, {
        credentials: 'include'
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || 'Failed to load notifications');
      }
      const list = Array.isArray(data.notifications) ? data.notifications : [];
      setOwnerNotifications(list);
    } catch (err) {
      console.error('[Vehicles][alerts][notifications][load]', err);
      setOwnerNotifications([]);
    } finally {
      setOwnerNotificationsLoading(false);
    }
  }

  async function markOwnerNotificationRead(id) {
    if (!id) return;
    try {
      const res = await fetch(`${API_URL}/api/user/notifications/${id}/read`, {
        method: 'POST',
        credentials: 'include'
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || 'Failed to mark notification as read');
      }
      setOwnerNotifications(list => list.map(n => n._id === id ? { ...n, isRead: true } : n));
    } catch (err) {
      console.error('[Vehicles][alerts][notifications][read]', err);
      toast.error(err.message || 'Failed to mark notification as read');
    }
  }

  useEffect(() => {
    if (view !== 'alerts') return;
    loadOwnerNotifications();
  }, [view]);

  async function createTour(e) {
    e.preventDefault();
    if (!carTourForm.title || !carTourForm.startLocation || !carTourForm.endLocation || !carTourForm.basePrice) {
      toast.error('Title, start, end and base price are required');
      return;
    }
    try {
      setCarTourSaving(true);
      const payload = {
        title: carTourForm.title,
        startLocation: carTourForm.startLocation,
        endLocation: carTourForm.endLocation,
        basePrice: Number(carTourForm.basePrice),
        primaryCar: carTourForm.primaryCar || undefined
      };
      const res = await fetch(`${API_URL}/api/car-tours`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to create tour');
      }
      setCarTours(list => [data.tour, ...list]);
      setCarTourForm({ title: '', startLocation: '', endLocation: '', basePrice: '', primaryCar: '' });
      toast.success('Tour created');
    } catch (err) {
      console.error('[Vehicles][carTours][create] error', err);
      toast.error(err.message || 'Failed to create tour');
    } finally {
      setCarTourSaving(false);
    }
  }

  async function saveTripRoute(e) {
    e.preventDefault();
    if (!tripRouteForm.bookingId) {
      toast.error('Select a booking to log distance for');
      return;
    }
    try {
      setTripRouteSaving(true);
      const payload = {
        booking: tripRouteForm.bookingId,
        date: tripRouteForm.date || undefined,
        distanceKm: tripRouteForm.distanceKm !== '' ? Number(tripRouteForm.distanceKm) : undefined,
        startOdometer: tripRouteForm.startOdometer !== '' ? Number(tripRouteForm.startOdometer) : undefined,
        endOdometer: tripRouteForm.endOdometer !== '' ? Number(tripRouteForm.endOdometer) : undefined
      };
      const res = await fetch(`${API_URL}/api/car-trip-routes`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to save trip route');
      }
      setTripRoutes(list => {
        const existingIndex = list.findIndex(r => r._id === data.route._id || String(r.booking?._id) === String(data.route.booking?._id));
        if (existingIndex === -1) return [data.route, ...list];
        const next = [...list];
        next[existingIndex] = data.route;
        return next;
      });
      toast.success('Trip route saved');
    } catch (err) {
      console.error('[Vehicles][tripRoutes][save] error', err);
      toast.error(err.message || 'Failed to save trip route');
    } finally {
      setTripRouteSaving(false);
    }
  }

  async function createFuelRecord(e) {
    e.preventDefault();
    if (!fuelForm.carId || !fuelForm.date || fuelForm.liters === '' || fuelForm.totalCost === '') {
      toast.error('Car, date, liters and total cost are required');
      return;
    }
    try {
      setFuelSaving(true);
      const payload = {
        car: fuelForm.carId,
        date: fuelForm.date,
        liters: Number(fuelForm.liters),
        totalCost: Number(fuelForm.totalCost),
        pricePerLiter: fuelForm.pricePerLiter !== '' ? Number(fuelForm.pricePerLiter) : undefined,
        odometerKm: fuelForm.odometerKm !== '' ? Number(fuelForm.odometerKm) : undefined,
        stationName: fuelForm.stationName || undefined,
        note: fuelForm.note || undefined
      };
      const res = await fetch(`${API_URL}/api/car-fuel-logs`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to save fuel record');
      }
      const log = data.log;
      setFuelLogs(list => [log, ...list]);
      setFuelSummary(prev => ({
        totalLiters: Number(prev.totalLiters || 0) + Number(log.liters || 0),
        totalCost: Number(prev.totalCost || 0) + Number(log.totalCost || 0)
      }));
      setFuelForm({
        carId: '',
        date: '',
        liters: '',
        totalCost: '',
        pricePerLiter: '',
        odometerKm: '',
        stationName: '',
        note: ''
      });
      toast.success('Fuel record saved');
    } catch (err) {
      console.error('[Vehicles][fuelLogs][create]', err);
      toast.error(err.message || 'Failed to save fuel record');
    } finally {
      setFuelSaving(false);
    }
  }

  async function createExpense(e) {
    e.preventDefault();
    if (!expenseForm.carId || !expenseForm.date || expenseForm.amount === '') {
      toast.error('Vehicle, date and amount are required');
      return;
    }
    try {
      setExpenseSaving(true);
      const payload = {
        car: expenseForm.carId,
        date: expenseForm.date,
        amount: Number(expenseForm.amount),
        category: expenseForm.category || undefined,
        note: expenseForm.note || undefined
      };
      const res = await fetch(`${API_URL}/api/car-finance/expenses`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to save expense');
      }
      const exp = data.expense;
      setCarExpenses(list => [exp, ...list]);
      setCarExpensesTotal(t => Number(t || 0) + Number(exp.amount || 0));
      setExpenseForm({ carId: '', date: '', amount: '', category: '', note: '' });
      toast.success('Expense saved');
    } catch (err) {
      console.error('[Vehicles][expenses][create]', err);
      toast.error(err.message || 'Failed to save expense');
    } finally {
      setExpenseSaving(false);
    }
  }

  async function deleteExpense(id) {
    if (!id) return;
    if (!confirm('Delete this expense?')) return;
    try {
      const res = await fetch(`${API_URL}/api/car-finance/expenses/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || 'Failed to delete expense');
      }
      setCarExpenses(list => list.filter(e => e._id !== id));
      // Recompute total from remaining list to avoid drift
      setCarExpensesTotal(prev => {
        const remaining = carExpenses.filter(e => e._id !== id);
        return remaining.reduce((s, x) => s + Number(x.amount || 0), 0);
      });
      toast.success('Expense deleted');
    } catch (err) {
      console.error('[Vehicles][expenses][delete]', err);
      toast.error(err.message || 'Failed to delete expense');
    }
  }

  async function saveInsurance(e) {
    e.preventDefault();
    if (!selectedCarId) return;
    try {
      setInsuranceSaving(true);
      const patch = {
        insuranceProvider: insuranceForm.insuranceProvider || undefined,
        insurancePolicyNumber: insuranceForm.insurancePolicyNumber || undefined,
        insuranceExpiryDate: insuranceForm.insuranceExpiryDate
          ? new Date(insuranceForm.insuranceExpiryDate)
          : undefined,
        registrationNumber: insuranceForm.registrationNumber || undefined,
        registrationExpiryDate: insuranceForm.registrationExpiryDate
          ? new Date(insuranceForm.registrationExpiryDate)
          : undefined
      };
      await updateCar(selectedCarId, patch);
    } finally {
      setInsuranceSaving(false);
    }
  }

  async function updateExpense(id, patch) {
    try {
      const res = await fetch(`${API_URL}/api/car-finance/expenses/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || 'Failed to update expense');
      }
      const updated = data.expense;
      setCarExpenses(list => list.map(x => x._id === updated._id ? updated : x));
      setCarExpensesTotal(() => {
        return carExpenses.reduce((s, x) => {
          const amt = x._id === updated._id ? Number(updated.amount || 0) : Number(x.amount || 0);
          return s + amt;
        }, 0);
      });
      setEditingExpenseId(null);
      toast.success('Expense updated');
    } catch (err) {
      console.error('[Vehicles][expenses][update]', err);
      toast.error(err.message || 'Failed to update expense');
    }
  }

  // ... rest of the code remains the same ...

  return (
    <div className="min-h-screen bg-[#f9f5ef] py-4">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ... rest of the code remains the same ... */}
        {financeMode === 'expenses' && (
          <>
            {Array.isArray(carExpenses) && carExpenses.length > 0 && (
              <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
                <label className="text-[11px] text-gray-600">Filter by category:</label>
                <select
                  className="px-2 py-1.5 border border-[#d4c4b0] rounded-lg bg-white"
                  value={expenseCategoryFilter}
                  onChange={e => setExpenseCategoryFilter(e.target.value)}
                >
                  <option value="">All categories</option>
                  {Array.from(new Set(carExpenses.map(e => String(e.category || 'general')))).map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            )}
          </>
        )}
        {/* Finance view: focus on revenue stats for vehicles */}
        {view === 'finance' && (
        <>
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-900">{financeModeLabel} - {financeFilterLabel}</h2>
            <p className="text-xs text-gray-600 mt-1">
              Revenue and payments for your vehicles based on car bookings data.
              <span className="ml-1 font-semibold">Range: {financeRangeLabel}</span>
            </p>
          </div>

          <div className="mb-4 max-w-xs">
            {Array.isArray(cars) && cars.length > 0 && (
              <>
                <label className="block text-xs text-gray-600 mb-1">Vehicle scope</label>
                <select
                  className="w-full px-3 py-2 border border-[#e0d5c7] rounded-lg bg-white text-sm focus:outline-none focus:ring-1 focus:ring-[#a06b42] focus:border-[#a06b42]"
                  value={selectedCarId || ''}
                  onChange={e => setSelectedCarId(e.target.value)}
                >
                  <option value="">All vehicles</option>
                  {cars.map(c => (
                    <option key={c._id} value={c._id}>
                      {c.vehicleName || `${c.brand || ''} ${c.model || ''}`.trim() || 'Untitled vehicle'}
                    </option>
                  ))}
                </select>
              </>
            )}
          </div>

          <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-2xl bg-white shadow-sm border border-gray-100 px-3 py-2.5">
              <div className="text-[11px] text-gray-500">Last 30 days revenue</div>
              <div className="text-sm font-semibold text-gray-900">
                {formatCurrencyRWF ? formatCurrencyRWF(financeStats.rev30 || 0) : `RWF ${Number(financeStats.rev30 || 0).toLocaleString()}`}
              </div>
              <div className="mt-0.5 text-[11px] text-gray-500">{financeStats.bookings30} bookings</div>
            </div>
            <div className="rounded-2xl bg-white shadow-sm border border-gray-100 px-3 py-2.5">
              <div className="text-[11px] text-gray-500">Year-to-date revenue</div>
              <div className="text-sm font-semibold text-gray-900">
                {formatCurrencyRWF ? formatCurrencyRWF(financeStats.revYtd || 0) : `RWF ${Number(financeStats.revYtd || 0).toLocaleString()}`}
              </div>
              <div className="mt-0.5 text-[11px] text-gray-500">{financeStats.bookingsYtd} bookings</div>
            </div>
            <div className="rounded-2xl bg-white shadow-sm border border-gray-100 px-3 py-2.5">
              <div className="text-[11px] text-gray-500">Avg revenue / booking (30d)</div>
              <div className="text-sm font-semibold text-gray-900">
                {formatCurrencyRWF ? formatCurrencyRWF(financeStats.avg30 || 0) : `RWF ${Number(financeStats.avg30 || 0).toLocaleString()}`}
              </div>
              <div className="mt-0.5 text-[11px] text-gray-500">Based on last 30 days</div>
            </div>
          </div>

          <div className="mb-4">
            <button
              type="button"
              onClick={exportBookingsCsv}
              className="inline-flex items-center px-3 py-1.5 rounded-md bg-[#a06b42] hover:bg-[#8f5a32] text-white text-xs font-medium shadow-sm"
            >
              Export bookings as CSV
            </button>
          </div>

          <div className="mb-6 rounded-2xl bg-white border border-[#e0d5c7] shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-[#e0d5c7] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-[#4b2a00]">Revenue summary table</h3>
                <p className="text-[11px] text-gray-600 mt-0.5">
                  All trips contributing to your revenue in this scope.
                </p>
              </div>
              <div className="text-[11px] text-gray-500">
                {financeBookingsTable.length} trips
              </div>
            </div>
            {financeBookingsTable.length === 0 ? (
              <div className="px-4 py-6 text-xs text-gray-600">
                No bookings found for the current vehicle and payment filter.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead className="bg-[#f5ebe0] text-[11px] uppercase tracking-wide text-gray-600">
                    <tr>
                      <th className="px-3 py-2 text-left">Vehicle</th>
                      <th className="px-3 py-2 text-left">Pickup</th>
                      <th className="px-3 py-2 text-left">Return</th>
                      <th className="px-3 py-2 text-right">Days</th>
                      <th className="px-3 py-2 text-right">Amount (RWF)</th>
                      <th className="px-3 py-2 text-right">Payment status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f1e4d4] bg-white">
                    {financeBookingsTable.map(b => {
                      const vehicleLabel = (b.car?.vehicleName || `${b.car?.brand || ''} ${b.car?.model || ''}`.trim() || 'Vehicle').replace(/,/g, ' ');
                      const pickup = b.pickupDate ? new Date(b.pickupDate) : null;
                      const ret = b.returnDate ? new Date(b.returnDate) : null;
                      const status = String(b.paymentStatus || b.status || '').toLowerCase();
                      const amount = Number(b.totalAmount || 0);
                      return (
                        <tr key={b._id} className="hover:bg-[#fdf7ee] transition-colors">
                          <td className="px-3 py-2 align-top max-w-[180px]">
                            <div className="text-[11px] font-medium text-gray-900 truncate">{vehicleLabel}</div>
                            <div className="text-[10px] text-gray-500 truncate">{b._id}</div>
                          </td>
                          <td className="px-3 py-2 align-top text-[11px] text-gray-700">
                            {pickup ? pickup.toLocaleDateString() : '-'}
                          </td>
                          <td className="px-3 py-2 align-top text-[11px] text-gray-700">
                            {ret ? ret.toLocaleDateString() : '-'}
                          </td>
                          <td className="px-3 py-2 align-top text-right text-[11px] text-gray-700">
                            {b.numberOfDays || ''}
                          </td>
                          <td className="px-3 py-2 align-top text-right text-[11px] font-semibold text-gray-900">
                            {formatCurrencyRWF
                              ? formatCurrencyRWF(amount)
                              : `RWF ${amount.toLocaleString()}`}
                          </td>
                          <td className="px-3 py-2 align-top text-right text-[11px]">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] ${
                                status === 'paid' || status === 'completed'
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                  : status === 'pending'
                                    ? 'bg-amber-50 border-amber-200 text-amber-700'
                                    : status === 'cancelled'
                                      ? 'bg-red-50 border-red-200 text-red-700'
                                      : 'bg-gray-50 border-gray-200 text-gray-700'
                              }`}
                            >
                              {status || 'n/a'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

        {/* Analytics view: default performance analytics */}
        {view === 'analytics' && analyticsSection !== 'fuel' && analyticsSection !== 'fuel-add' && (
        <>
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Performance analytics</h2>
            <p className="text-xs text-gray-600 mt-1">
              High-level performance metrics for your vehicles based on bookings.
              <span className="ml-1 font-semibold">Range: {financeRangeLabel}</span>
            </p>
          </div>

          <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-2xl bg-white shadow-sm border border-gray-100 px-3 py-2.5">
              <div className="text-[11px] text-gray-500">Total bookings</div>
              <div className="text-lg font-semibold text-gray-900">{stats.totalBookings}</div>
            </div>
            <div className="rounded-2xl bg-white shadow-sm border border-gray-100 px-3 py-2.5">
              <div className="text-[11px] text-gray-500">Active</div>
              <div className="text-lg font-semibold text-emerald-700">{stats.active}</div>
            </div>
            <div className="rounded-2xl bg-white shadow-sm border border-gray-100 px-3 py-2.5">
              <div className="text-[11px] text-gray-500">Completed</div>
              <div className="text-lg font-semibold text-blue-700">{stats.completed}</div>
            </div>
            <div className="rounded-2xl bg-white shadow-sm border border-gray-100 px-3 py-2.5">
              <div className="text-[11px] text-gray-500">Avg rental length</div>
              <div className="text-lg font-semibold text-gray-900">{stats.avgRentalLength.toFixed(1)} days</div>
            </div>
          </div>

          <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-2xl bg-white shadow-sm border border-gray-100 px-3 py-2.5">
              <div className="text-[11px] text-gray-500">Last 30 days revenue</div>
              <div className="text-sm font-semibold text-gray-900">
                {formatCurrencyRWF ? formatCurrencyRWF(financeStats.rev30 || 0) : `RWF ${Number(financeStats.rev30 || 0).toLocaleString()}`}
              </div>
            </div>
            <div className="rounded-2xl bg-white shadow-sm border border-gray-100 px-3 py-2.5">
              <div className="text-[11px] text-gray-500">Year-to-date revenue</div>
              <div className="text-sm font-semibold text-gray-900">
                {formatCurrencyRWF ? formatCurrencyRWF(financeStats.revYtd || 0) : `RWF ${Number(financeStats.revYtd || 0).toLocaleString()}`}
              </div>
            </div>
            <div className="rounded-2xl bg-white shadow-sm border border-gray-100 px-3 py-2.5">
              <div className="text-[11px] text-gray-500">Avg revenue / booking (30d)</div>
              <div className="text-sm font-semibold text-gray-900">
                {formatCurrencyRWF ? formatCurrencyRWF(financeStats.avg30 || 0) : `RWF ${Number(financeStats.avg30 || 0).toLocaleString()}`}
              </div>
            </div>
          </div>
        </>
      )}

        {/* Analytics fuel management section */}
        {view === 'analytics' && (analyticsSection === 'fuel' || analyticsSection === 'fuel-add') && (
        <>
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Fuel management</h2>
            <p className="text-xs text-gray-600 mt-1">
              Track fuel usage and costs for your vehicles.
            </p>
          </div>

          <div className="mb-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-2xl bg-white shadow-sm border border-gray-100 px-3 py-2.5">
              <div className="text-[11px] text-gray-500">Total liters (filtered)</div>
              <div className="text-lg font-semibold text-gray-900">{fuelSummary.totalLiters.toFixed(1)}</div>
            </div>
            <div className="rounded-2xl bg-white shadow-sm border border-gray-100 px-3 py-2.5">
              <div className="text-[11px] text-gray-500">Total cost (filtered)</div>
              <div className="text-sm font-semibold text-gray-900">
                {formatCurrencyRWF
                  ? formatCurrencyRWF(fuelSummary.totalCost || 0)
                  : `RWF ${Number(fuelSummary.totalCost || 0).toLocaleString()}`}
              </div>
            </div>
          </div>

          <div className="mb-4 bg-white rounded-xl shadow-sm border border-[#e0d5c7] px-4 py-4">
            <h3 className="text-sm font-semibold text-[#4b2a00] mb-3">Add fuel record</h3>
            <form onSubmit={createFuelRecord} className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block mb-1 text-[11px] text-gray-600">Vehicle *</label>
                <select
                  className="w-full px-2 py-1.5 border border-[#d4c4b0] rounded-lg bg-white"
                  value={fuelForm.carId}
                  onChange={e => setFuelForm(f => ({ ...f, carId: e.target.value }))}
                >
                  <option value="">Select vehicle</option>
                  {cars.map(c => (
                    <option key={c._id} value={c._id}>
                      {c.vehicleName || `${c.brand || ''} ${c.model || ''}`.trim() || 'Untitled vehicle'}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block mb-1 text-[11px] text-gray-600">Date *</label>
                <input
                  type="date"
                  className="w-full px-2 py-1.5 border border-[#d4c4b0] rounded-lg"
                  value={fuelForm.date}
                  onChange={e => setFuelForm(f => ({ ...f, date: e.target.value }))}
                />
              </div>
              <div>
                <label className="block mb-1 text-[11px] text-gray-600">Liters *</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full px-2 py-1.5 border border-[#d4c4b0] rounded-lg"
                  value={fuelForm.liters}
                  onChange={e => setFuelForm(f => ({ ...f, liters: e.target.value }))}
                />
              </div>
              <div>
                <label className="block mb-1 text-[11px] text-gray-600">Total cost (RWF) *</label>
                <input
                  type="number"
                  className="w-full px-2 py-1.5 border border-[#d4c4b0] rounded-lg"
                  value={fuelForm.totalCost}
                  onChange={e => setFuelForm(f => ({ ...f, totalCost: e.target.value }))}
                />
              </div>
              <div>
                <label className="block mb-1 text-[11px] text-gray-600">Price per liter</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full px-2 py-1.5 border border-[#d4c4b0] rounded-lg"
                  value={fuelForm.pricePerLiter}
                  onChange={e => setFuelForm(f => ({ ...f, pricePerLiter: e.target.value }))}
                />
              </div>
              <div>
                <label className="block mb-1 text-[11px] text-gray-600">Odometer (km)</label>
                <input
                  type="number"
                  className="w-full px-2 py-1.5 border border-[#d4c4b0] rounded-lg"
                  value={fuelForm.odometerKm}
                  onChange={e => setFuelForm(f => ({ ...f, odometerKm: e.target.value }))}
                />
              </div>
              <div>
                <label className="block mb-1 text-[11px] text-gray-600">Station</label>
                <input
                  className="w-full px-2 py-1.5 border border-[#d4c4b0] rounded-lg"
                  value={fuelForm.stationName}
                  onChange={e => setFuelForm(f => ({ ...f, stationName: e.target.value }))}
                />
              </div>
              <div>
                <label className="block mb-1 text-[11px] text-gray-600">Note</label>
                <input
                  className="w-full px-2 py-1.5 border border-[#d4c4b0] rounded-lg"
                  value={fuelForm.note}
                  onChange={e => setFuelForm(f => ({ ...f, note: e.target.value }))}
                />
              </div>
              <div className="md:col-span-4 flex justify-end mt-1">
                <button
                  type="submit"
                  disabled={fuelSaving}
                  className="inline-flex items-center px-3 py-1.5 rounded-lg bg-[#a06b42] hover:bg-[#8f5a32] text-white text-xs font-medium disabled:opacity-60"
                >
                  {fuelSaving ? 'Saving...' : 'Save fuel record'}
                </button>
              </div>
            </form>
          </div>

          <div className="rounded-2xl bg-white shadow-sm border border-[#e0d5c7] overflow-x-auto">
            <div className="px-4 py-3 border-b border-[#e0d5c7] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-[#4b2a00]">Fuel logs</h3>
                <p className="text-[11px] text-gray-600 mt-0.5">
                  All fuel records matching the current filters.
                </p>
              </div>
              <div className="text-[11px] text-gray-500">
                {fuelLogs.length} records
              </div>
            </div>
            {fuelLoading ? (
              <div className="px-4 py-6 text-xs text-gray-600">Loading fuel logs...</div>
            ) : fuelLogs.length === 0 ? (
              <div className="px-4 py-6 text-xs text-gray-600">No fuel records found for the current filters.</div>
            ) : (
              <table className="min-w-full text-xs">
                <thead className="bg-[#f5ebe0] text-[11px] uppercase tracking-wide text-gray-600">
                  <tr>
                    <th className="px-3 py-2 text-left">Date</th>
                    <th className="px-3 py-2 text-left">Vehicle</th>
                    <th className="px-3 py-2 text-right">Liters</th>
                    <th className="px-3 py-2 text-right">Total cost (RWF)</th>
                    <th className="px-3 py-2 text-right">Odometer</th>
                    <th className="px-3 py-2 text-left">Station</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1e4d4] bg-white">
                  {fuelLogs.map(log => {
                    const d = log.date ? new Date(log.date) : null;
                    const carLabel = (log.car?.vehicleName || `${log.car?.brand || ''} ${log.car?.model || ''}`.trim() || 'Vehicle').replace(/,/g, ' ');
                    return (
                      <tr key={log._id} className="hover:bg-[#fdf7ee]">
                        <td className="px-3 py-2 text-[11px] text-gray-700">{d ? d.toLocaleDateString() : '-'}</td>
                        <td className="px-3 py-2 text-[11px] text-gray-700">{carLabel}</td>
                        <td className="px-3 py-2 text-right text-[11px] text-gray-900">{log.liters}</td>
                        <td className="px-3 py-2 text-right text-[11px] text-gray-900">
                          {formatCurrencyRWF
                            ? formatCurrencyRWF(log.totalCost || 0)
                            : `RWF ${Number(log.totalCost || 0).toLocaleString()}`}
                        </td>
                        <td className="px-3 py-2 text-right text-[11px] text-gray-900">{log.odometerKm || ''}</td>
                        <td className="px-3 py-2 text-[11px] text-gray-700">{log.stationName || ''}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

        {/* Simple panels for alerts/reviews/messages/settings views to keep navigation working */}
        {view === 'alerts' && (
        <div className="mb-6 space-y-4">
          <div className="rounded-2xl bg-white border border-[#e0d5c7] px-4 py-4 text-sm text-gray-700 shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg font-semibold text-[#4b2a00]">Notifications & alerts</h2>
              {(() => {
                const unreadCount = ownerNotifications.filter(n => !n.isRead).length;
                if (!unreadCount) return null;
                return (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#a06b42] text-white text-[10px] font-semibold">
                    {unreadCount} unread
                  </span>
                );
              })()}
            </div>
            <p className="text-[11px] text-gray-600 mb-3">
              Recent notifications related to your account and vehicle activity.
            </p>

            <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px] text-gray-700">
              <label className="inline-flex items-center gap-1">
                <input
                  type="checkbox"
                  className="rounded border-[#d4c4b0] text-[#a06b42] focus:ring-[#a06b42]"
                  checked={ownerNotifShowUnreadOnly}
                  onChange={e => setOwnerNotifShowUnreadOnly(e.target.checked)}
                />
                <span>Show unread only</span>
              </label>
              <div className="flex items-center gap-1">
                <span>Type:</span>
                <select
                  className="px-2 py-1 border border-[#d4c4b0] rounded-lg bg-white text-[11px]"
                  value={ownerNotifTypeFilter}
                  onChange={e => setOwnerNotifTypeFilter(e.target.value)}
                >
                  <option value="all">All</option>
                  {Array.from(new Set(ownerNotifications.map(n => String(n.type || 'other')))).map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>

            {ownerNotificationsLoading ? (
              <div className="text-xs text-gray-600">Loading notifications...</div>
            ) : ownerNotifications.length === 0 ? (
              <div className="text-xs text-gray-600">You have no recent notifications.</div>
            ) : (
              <ul className="divide-y divide-[#f1e4d4] text-xs">
                {(() => {
                  const filtered = ownerNotifications.filter(n => {
                    if (ownerNotifShowUnreadOnly && n.isRead) return false;
                    if (ownerNotifTypeFilter !== 'all' && String(n.type || 'other') !== ownerNotifTypeFilter) return false;
                    return true;
                  });

                  if (filtered.length === 0) {
                    return (
                      <li className="py-2 text-[11px] text-gray-600">
                        No notifications match the current filters.
                      </li>
                    );
                  }

                  return filtered.map(n => {
                    const created = n.createdAt ? new Date(n.createdAt) : null;
                    return (
                      <li key={n._id} className="py-2 flex items-start gap-2">
                        <span className={`mt-1 inline-block w-2 h-2 rounded-full ${n.isRead ? 'bg-gray-300' : 'bg-[#a06b42]'}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div className="font-semibold text-[#4b2a00] truncate text-[11px]">{n.title || 'Notification'}</div>
                            {created && (
                              <span className="text-[10px] text-gray-500 whitespace-nowrap">
                                {created.toLocaleDateString()} {created.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-gray-700 mt-0.5 break-words">{n.message}</div>
                          {!n.isRead && (
                            <button
                              type="button"
                              onClick={() => markOwnerNotificationRead(n._id)}
                              className="mt-1 inline-flex items-center px-2 py-0.5 rounded-full border border-[#a06b42] text-[10px] text-[#a06b42] hover:bg-[#a06b42] hover:text-white"
                            >
                              Mark as read
                            </button>
                          )}
                        </div>
                      </li>
                    );
                  });
                })()}
              </ul>
            )}
          </div>

          <div className="rounded-2xl bg-white border border-[#e0d5c7] px-4 py-4 text-sm text-gray-700 shadow-sm">
            <h2 className="text-lg font-semibold mb-1 text-[#4b2a00]">Booking-based alerts</h2>
            <p className="text-[11px] text-gray-600 mb-3">
              Key items that may need your attention for your vehicles and trips.
            </p>
            <ul className="space-y-2 text-xs">
              {(() => {
                const list = [];
                const baseBookings = Array.isArray(bookings) ? bookings : [];
                const now = new Date();
                const threeDaysAhead = new Date();
                threeDaysAhead.setDate(now.getDate() + 3);

                // Upcoming pickups in next 3 days
                baseBookings.forEach(b => {
                  if (selectedCarId && String(b.car?._id) !== String(selectedCarId)) return;
                  if (!b.pickupDate) return;
                  const d = new Date(b.pickupDate);
                  const status = String(b.status || '').toLowerCase();
                  if (d >= now && d <= threeDaysAhead && (status === 'confirmed' || status === 'active' || status === 'pending')) {
                    list.push({
                      type: 'upcoming',
                      key: `upcoming-${b._id}`,
                      label: `Upcoming pickup ${d.toLocaleDateString()} for ${(b.car?.vehicleName || b.car?.model || 'vehicle')}`,
                    });
                  }
                });

                // Overdue returns
                baseBookings.forEach(b => {
                  if (selectedCarId && String(b.car?._id) !== String(selectedCarId)) return;
                  if (!b.returnDate) return;
                  const d = new Date(b.returnDate);
                  const status = String(b.status || '').toLowerCase();
                  if (d < now && status !== 'completed' && status !== 'cancelled') {
                    list.push({
                      type: 'overdue',
                      key: `overdue-${b._id}`,
                      label: `Return overdue since ${d.toLocaleDateString()} for ${(b.car?.vehicleName || b.car?.model || 'vehicle')}`,
                    });
                  }
                });

                if (list.length === 0) {
                  return (
                    <li className="text-gray-600">
                      You have no time-sensitive booking alerts right now. Keep an eye on your bookings and vehicle status.
                    </li>
                  );
                }

                return list.map(a => (
                  <li key={a.key} className="flex items-start gap-2">
                    <span className={`mt-0.5 inline-block w-2 h-2 rounded-full ${
                      a.type === 'overdue' ? 'bg-red-500' : 'bg-amber-400'
                    }`} />
                    <span className="text-gray-800">{a.label}</span>
                  </li>
                ));
              })()}
            </ul>
          </div>
        </div>
      )}

        {view === 'reviews' && (
        <div className="mb-6 rounded-2xl bg-white border border-[#e0d5c7] px-4 py-4 text-sm text-gray-700 shadow-sm">
          <h2 className="text-lg font-semibold mb-1 text-[#4b2a00]">Vehicle reviews</h2>
          <p className="text-xs text-gray-600">
            Detailed reviews are currently managed from the main reviews page. Use the navigation link
            to <span className="font-semibold">Reviews</span> in the owner navbar to open
            <span className="font-mono"> /owner/reviews</span> in a full page.
          </p>
        </div>
      )}

        {view === 'messages' && (
        <div className="mb-6 rounded-2xl bg-white border border-[#e0d5c7] px-4 py-4 text-sm text-gray-700 shadow-sm">
          <h2 className="text-lg font-semibold mb-1 text-[#4b2a00]">Messages</h2>
          <p className="text-xs text-gray-600">
            Vehicle reservation messages are handled in your main inbox. Use the Messages item in the top
            navigation to open the full messaging interface with reservation filters.
          </p>
        </div>
      )}

        {view === 'settings' && (
        <div className="mb-6 rounded-2xl bg-white border border-[#e0d5c7] px-4 py-4 text-sm text-gray-700 shadow-sm">
          <h2 className="text-lg font-semibold mb-1 text-[#4b2a00]">Settings</h2>
          <p className="text-xs text-gray-600">
            Vehicle-specific settings will appear here in the future. For now you can manage notification
            and account settings from the main Settings section of your profile.
          </p>
        </div>
      )}

        {/* Vehicles management: create + list, shown on Vehicles view */}
        {view === 'vehicles' && showCreateForm && (
      <form ref={createFormRef} onSubmit={createCar} className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 md:p-8 mb-8">
        <div className="mb-6 pb-4 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">List a New Vehicle</h2>
          <p className="text-sm text-gray-600">Fill in the details below to add your vehicle to the platform</p>
        </div>
        
        {/* Category Selection */}
        <div className="mb-8">
          <label className="block text-sm font-semibold text-gray-700 mb-3">Vehicle Category *</label>
          <div className="grid grid-cols-3 gap-3">
            {['car', 'motorcycle', 'bicycle'].map(x => (
              <button
                key={x}
                type="button"
                onClick={() => {
                  setCategory(x);
                  setForm(prev => ({ ...prev, vehicleType: x === 'car' ? (prev.vehicleType && !['motorcycle','bicycle'].includes(prev.vehicleType) ? prev.vehicleType : 'economy') : x }));
                }}
                className={`px-4 py-3 rounded-xl border-2 transition-all duration-200 font-medium ${
                  category === x
                    ? 'border-[#a06b42] bg-[#a06b42]/10 text-[#a06b42]'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                }`}
              >
                {x.charAt(0).toUpperCase() + x.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Basic Information Section */}
          <div className="md:col-span-3">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100">Basic Information</h3>
          </div>
          
        <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Vehicle Name *</label>
            <input 
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#a06b42] focus:border-transparent transition-all" 
              placeholder="e.g., Toyota RAV4" 
              value={form.vehicleName} 
              onChange={e => setForm({ ...form, vehicleName: e.target.value })} 
            />
        </div>
          {category === 'car' && (
          <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Vehicle Type *</label>
              <select 
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#a06b42] focus:border-transparent transition-all bg-white" 
                value={form.vehicleType} 
                onChange={e => setForm({ ...form, vehicleType: e.target.value })}
              >
                {['economy','compact','mid-size','full-size','luxury','suv','minivan'].map(x => (
                  <option key={x} value={x}>{x.charAt(0).toUpperCase() + x.slice(1)}</option>
                ))}
            </select>
          </div>
        )}
          
        <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Brand *</label>
            <input 
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#a06b42] focus:border-transparent transition-all" 
              placeholder="e.g., Toyota" 
              value={form.brand} 
              onChange={e => setForm({ ...form, brand: e.target.value })} 
            />
        </div>
        <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Model *</label>
            <input 
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#a06b42] focus:border-transparent transition-all" 
              placeholder="e.g., RAV4" 
              value={form.model} 
              onChange={e => setForm({ ...form, model: e.target.value })} 
            />
        </div>
        <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Year</label>
            <input 
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#a06b42] focus:border-transparent transition-all" 
              type="number" 
              placeholder="e.g., 2022" 
              value={form.year} 
              onChange={e => setForm({ ...form, year: Number(e.target.value) })} 
            />
        </div>
          {/* Pricing & Location Section */}
          <div className="md:col-span-3 mt-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100">Pricing & Location</h3>
        </div>
          
        <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              License Plate{category === 'car' ? ' *' : ''}
            </label>
            <input 
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#a06b42] focus:border-transparent transition-all" 
              placeholder="e.g., RAD 123 A" 
              value={form.licensePlate} 
              onChange={e => setForm({ ...form, licensePlate: e.target.value })} 
            />
        </div>
        <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Capacity (Seats) *</label>
            <input 
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#a06b42] focus:border-transparent transition-all" 
              type="number" 
              placeholder="e.g., 5" 
              value={form.capacity} 
              onChange={e => setForm({ ...form, capacity: Number(e.target.value) })} 
            />
        </div>
        <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Price per Day (RWF) *</label>
            <input 
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#a06b42] focus:border-transparent transition-all" 
              type="number" 
              placeholder="e.g., 85000" 
              value={form.pricePerDay} 
              onChange={e => setForm({ ...form, pricePerDay: Number(e.target.value) })} 
            />
        </div>
        <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Location *</label>
            <input 
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#a06b42] focus:border-transparent transition-all" 
              placeholder="e.g., Kigali" 
              value={form.location} 
              onChange={e => setForm({ ...form, location: e.target.value })} 
            />
        </div>
          {/* Policies Section */}
          <div className="md:col-span-3 mt-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100">Policies & Details</h3>
        </div>
          
        <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Fuel Policy</label>
            <input 
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#a06b42] focus:border-transparent transition-all" 
              placeholder="e.g., Same-to-same" 
              value={form.fuelPolicy} 
              onChange={e => setForm({ ...form, fuelPolicy: e.target.value })} 
            />
        </div>
        <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Mileage Limit per Day (km)</label>
            <input 
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#a06b42] focus:border-transparent transition-all" 
              type="number" 
              placeholder="e.g., 150" 
              value={form.mileageLimitPerDayKm} 
              onChange={e => setForm({ ...form, mileageLimitPerDayKm: e.target.value })} 
            />
        </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Cancellation Policy</label>
            <textarea 
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#a06b42] focus:border-transparent transition-all resize-none" 
              rows="2"
              placeholder="Short description shown to guests" 
              value={form.cancellationPolicy} 
              onChange={e => setForm({ ...form, cancellationPolicy: e.target.value })} 
            />
          </div>
          <div className="md:col-span-3">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Deposit Information</label>
            <input 
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#a06b42] focus:border-transparent transition-all" 
              placeholder="e.g., No deposit required" 
              value={form.depositInfo} 
              onChange={e => setForm({ ...form, depositInfo: e.target.value })} 
            />
          </div>
          {/* Car-Specific Features */}
        {category === 'car' && (
          <>
              <div className="md:col-span-3 mt-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100">Car Specifications</h3>
              </div>
              
            <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Transmission *</label>
                <select 
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#a06b42] focus:border-transparent transition-all bg-white" 
                  value={form.transmission} 
                  onChange={e => setForm({ ...form, transmission: e.target.value })}
                >
                  {['automatic','manual'].map(x => (
                    <option key={x} value={x}>{x.charAt(0).toUpperCase() + x.slice(1)}</option>
                  ))}
              </select>
            </div>
            <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Fuel Type *</label>
                <select 
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#a06b42] focus:border-transparent transition-all bg-white" 
                  value={form.fuelType} 
                  onChange={e => setForm({ ...form, fuelType: e.target.value })}
                >
                  {['petrol','diesel','hybrid','electric'].map(x => (
                    <option key={x} value={x}>{x.charAt(0).toUpperCase() + x.slice(1)}</option>
                  ))}
              </select>
            </div>
            <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Number of Doors *</label>
                <input 
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#a06b42] focus:border-transparent transition-all" 
                  type="number" 
                  placeholder="e.g., 4" 
                  value={form.doors} 
                  onChange={e => setForm({ ...form, doors: Number(e.target.value) })} 
                />
            </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Luggage Capacity</label>
                <input 
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#a06b42] focus:border-transparent transition-all" 
                  type="number" 
                  placeholder="e.g., 2" 
                  value={form.luggageCapacity} 
                  onChange={e => setForm({ ...form, luggageCapacity: Number(e.target.value) })} 
                />
            </div>
              
              <div className="md:col-span-3">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Features</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors">
                    <input 
                      type="checkbox" 
                      checked={!!form.airConditioning} 
                      onChange={e => setForm({ ...form, airConditioning: !!e.target.checked })} 
                      className="w-5 h-5 text-[#a06b42] border-gray-300 rounded focus:ring-[#a06b42]"
                    />
                    <span className="text-sm font-medium text-gray-700">Air Conditioning</span>
                  </label>
                  <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors">
                    <input 
                      type="checkbox" 
                      checked={!!form.abs} 
                      onChange={e => setForm({ ...form, abs: !!e.target.checked })} 
                      className="w-5 h-5 text-[#a06b42] border-gray-300 rounded focus:ring-[#a06b42]"
                    />
                    <span className="text-sm font-medium text-gray-700">ABS</span>
                  </label>
            </div>
            </div>
          </>
        )}
          {/* Motorcycle-Specific Features */}
        {category === 'motorcycle' && (
          <>
              <div className="md:col-span-3 mt-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100">Motorcycle Specifications</h3>
              </div>
              
            <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Engine Capacity (cc) *</label>
                <input 
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#a06b42] focus:border-transparent transition-all" 
                  type="number" 
                  placeholder="e.g., 150" 
                  value={form.engineCapacityCc} 
                  onChange={e => setForm({ ...form, engineCapacityCc: e.target.value })} 
                />
            </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Transmission</label>
                <input 
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-gray-600" 
                  value="Manual" 
                  readOnly 
                />
            </div>
              
              <div className="md:col-span-3">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Features</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors">
                    <input 
                      type="checkbox" 
                      checked={!!form.helmetIncluded} 
                      onChange={e => setForm({ ...form, helmetIncluded: !!e.target.checked })} 
                      className="w-5 h-5 text-[#a06b42] border-gray-300 rounded focus:ring-[#a06b42]"
                    />
                    <span className="text-sm font-medium text-gray-700">Helmet Included</span>
                  </label>
                  <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors">
                    <input 
                      type="checkbox" 
                      checked={!!form.abs} 
                      onChange={e => setForm({ ...form, abs: !!e.target.checked })} 
                      className="w-5 h-5 text-[#a06b42] border-gray-300 rounded focus:ring-[#a06b42]"
                    />
                    <span className="text-sm font-medium text-gray-700">ABS</span>
                  </label>
            </div>
            </div>
          </>
        )}
          {/* Bicycle-Specific Features */}
        {category === 'bicycle' && (
          <>
              <div className="md:col-span-3 mt-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100">Bicycle Specifications</h3>
              </div>
              
            <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Frame Size *</label>
                <input 
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#a06b42] focus:border-transparent transition-all" 
                  placeholder="e.g., M / 54cm" 
                  value={form.frameSize} 
                  onChange={e => setForm({ ...form, frameSize: e.target.value })} 
                />
            </div>
            <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Gear Count *</label>
                <input 
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#a06b42] focus:border-transparent transition-all" 
                  type="number" 
                  placeholder="e.g., 21" 
                  value={form.gearCount} 
                  onChange={e => setForm({ ...form, gearCount: e.target.value })} 
                />
            </div>
            <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Bicycle Type</label>
                <select 
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#a06b42] focus:border-transparent transition-all bg-white" 
                  value={form.bicycleType} 
                  onChange={e => setForm({ ...form, bicycleType: e.target.value })}
                >
                <option value="">Select type</option>
                  {['mountain','road','hybrid','city'].map(x => (
                    <option key={x} value={x}>{x.charAt(0).toUpperCase() + x.slice(1)}</option>
                  ))}
              </select>
            </div>
              
              <div className="md:col-span-3">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Features</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors">
                    <input 
                      type="checkbox" 
                      checked={!!form.helmetIncluded} 
                      onChange={e => setForm({ ...form, helmetIncluded: !!e.target.checked })} 
                      className="w-5 h-5 text-[#a06b42] border-gray-300 rounded focus:ring-[#a06b42]"
                    />
                    <span className="text-sm font-medium text-gray-700">Helmet Included</span>
                  </label>
                </div>
            </div>
          </>
        )}
          
          {/* Availability */}
          <div className="md:col-span-3 mt-4">
            <label className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors">
              <input 
                type="checkbox" 
                checked={!!form.isAvailable} 
                onChange={e => setForm({ ...form, isAvailable: !!e.target.checked })} 
                className="w-5 h-5 text-[#a06b42] border-gray-300 rounded focus:ring-[#a06b42]"
              />
              <span className="text-sm font-semibold text-gray-700">Make this vehicle available for booking</span>
            </label>
        </div>
          {/* Images Section */}
          <div className="md:col-span-3 mt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100">Vehicle Images *</h3>
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 hover:border-[#a06b42] transition-colors">
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={e => {
              const files = Array.from(e.target.files || []);
              if (!files.length) return;
              setCreateImages(files);
              const urls = files.map(f => URL.createObjectURL(f));
              setCreatePreviews(urls);
            }}
                className="hidden"
                id="vehicle-images"
              />
              <label 
                htmlFor="vehicle-images" 
                className="flex flex-col items-center justify-center cursor-pointer"
              >
                <svg className="w-12 h-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-sm font-medium text-gray-700 mb-1">Click to upload images</span>
                <span className="text-xs text-gray-500">PNG, JPG up to 10MB each</span>
              </label>
            </div>
          {createPreviews?.length > 0 && (
              <div className="mt-4 grid grid-cols-3 md:grid-cols-5 gap-3">
              {createPreviews.map((src, i) => (
                  <div key={i} className="relative group">
                    <div className="w-full h-24 bg-gray-100 rounded-lg overflow-hidden">
                      <img src={src} className="w-full h-full object-cover" alt={`Preview ${i + 1}`} />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const newFiles = createImages.filter((_, idx) => idx !== i);
                        const newPreviews = createPreviews.filter((_, idx) => idx !== i);
                        setCreateImages(newFiles);
                        setCreatePreviews(newPreviews);
                      }}
                      className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                    >
                      ×
                    </button>
                </div>
              ))}
            </div>
          )}
        </div>
          
          {/* Submit Button */}
          <div className="md:col-span-3 mt-6 flex items-center justify-end gap-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => {
                setShowCreateForm(false);
                resetForm();
                setCreateImages([]);
                setCreatePreviews([]);
              }}
              className="px-6 py-3 text-gray-700 font-medium border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={saving || user?.isBlocked} 
              className="px-8 py-3 bg-[#a06b42] hover:bg-[#8f5a32] text-white font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              {saving ? 'Creating...' : 'Create Vehicle Listing'}
            </button>
          </div>
        </div>
      </form>
      )}

        {/* Cars List & vehicle-level sections */}
        {view === 'vehicles' && vehiclesSection === 'list' && (
        <>
          {loading ? (
            <div className="bg-white rounded-2xl border border-[#e0d5c7] p-6 text-center text-sm text-gray-600 shadow-sm">
              Loading your vehicles...
            </div>
          ) : (!Array.isArray(cars) || cars.length === 0) ? (
            <div className="bg-white rounded-2xl border border-[#e0d5c7] p-6 text-center text-sm text-gray-600 shadow-sm">
              <p className="mb-3">You haven't listed any vehicles yet.</p>
              <button
                type="button"
                onClick={() => setShowCreateForm(true)}
                className="inline-flex items-center px-4 py-2 rounded-lg bg-[#a06b42] hover:bg-[#8f5a32] text-white text-sm font-medium"
                disabled={user?.isBlocked}
              >
                List your first vehicle
              </button>
            </div>
          ) : viewMode === 'cards' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {cars.map(car => (
                <button
                  key={car._id}
                  type="button"
                  onClick={() => setSelectedCarId(String(car._id))}
                  className={`text-left bg-white rounded-lg shadow p-4 w-full border transition ${String(selectedCarId) === String(car._id) ? 'border-[#a06b42] ring-1 ring-[#a06b42]/50' : 'border-transparent hover:border-gray-300'}`}
                >
                  <div className="flex gap-4">
                    <div className="w-32 h-24 bg-gray-100 rounded overflow-hidden">
                      {car.images?.[0] ? <img src={makeAbsolute(car.images[0])} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-400">No image</div>}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {String(selectedCarId) === String(car._id) && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#a06b42]/10 text-[#a06b42] text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap">
                              Selected
                            </span>
                          )}
                          <h3 className="font-semibold truncate">{car.vehicleName} • {car.brand} {car.model}</h3>
                        </div>
                        <button onClick={() => updateCar(car._id, { isAvailable: !car.isAvailable })} className={`px-2 py-1 rounded text-sm ${car.isAvailable ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'}`}>{car.isAvailable ? 'Available' : 'Unavailable'}</button>
                      </div>
                      <p className="text-sm text-gray-600">{car.location} • {car.vehicleType} • {car.transmission}</p>
                      <p className="text-sm font-medium mt-1">{formatCurrencyRWF ? formatCurrencyRWF(car.pricePerDay || 0) : `RWF ${Number(car.pricePerDay || 0).toLocaleString()}`} / day</p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <label className="text-sm">Upload Images:</label>
                    <input type="file" multiple disabled={uploadingId === car._id} onChange={e => uploadImages(car._id, e.target.files)} />
                    <button onClick={() => deleteCar(car._id)} className="ml-auto px-3 py-1 bg-red-600 text-white rounded text-sm">Delete</button>
                  </div>

                  {car.images?.length > 0 && (
                    <div className="mt-3 grid grid-cols-4 gap-2">
                      {car.images.map((img, i) => (
                        <img key={i} src={makeAbsolute(img)} className="w-full h-20 object-cover rounded" />
                      ))}
                    </div>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-[#e0d5c7] overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left">
                    <th className="p-3">Vehicle</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Location</th>
                    <th className="p-3">Price/Day</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {cars.map(car => (
                    <tr
                      key={car._id}
                      className={`border-t cursor-pointer ${String(selectedCarId) === String(car._id) ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                      onClick={() => setSelectedCarId(String(car._id))}
                    >
                      <td className="p-3 font-medium">
                        <div className="flex items-center gap-2">
                          {String(selectedCarId) === String(car._id) && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-semibold uppercase tracking-wide">
                              Selected
                            </span>
                          )}
                          <span>{car.vehicleName} • {car.brand} {car.model}</span>
                        </div>
                      </td>
                      <td className="p-3">{car.vehicleType}</td>
                      <td className="p-3">{car.location}</td>
                      <td className="p-3">{formatCurrencyRWF ? formatCurrencyRWF(car.pricePerDay || 0) : `RWF ${Number(car.pricePerDay || 0).toLocaleString()}`}</td>
                      <td className="p-3">
                        <button onClick={() => updateCar(car._id, { isAvailable: !car.isAvailable })} className={`px-2 py-1 rounded text-xs ${car.isAvailable ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'}`}>{car.isAvailable ? 'Available' : 'Unavailable'}</button>
                      </td>
                      <td className="p-3">
                        <button onClick={() => deleteCar(car._id)} className="px-3 py-1 bg-red-600 text-white rounded text-xs">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
        )}

        {/* Bookings */}
        {view === 'bookings' && (
      <div className="mt-8" ref={bookingsRef}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Bookings</h2>
            <p className="text-xs text-gray-500 mt-0.5">View and manage all reservations for your vehicles.</p>
          </div>
          <div className="inline-flex rounded-full overflow-hidden border border-[#d4c4b0] bg-white">
            <button
              type="button"
              onClick={() => {
                setBookingView('list');
                const params = new URLSearchParams(location.search || '');
                params.set('section', 'reservations');
                setSearchParams(params);
              }}
              className={`px-3 py-1.5 text-xs font-medium ${bookingView === 'list' ? 'bg-[#a06b42] text-white' : 'text-[#4b2a00] hover:bg-[#f5e6d5]'}`}
            >
              List
            </button>
            <button
              type="button"
              onClick={() => {
                setBookingView('calendar');
                const params = new URLSearchParams(location.search || '');
                params.set('section', 'calendar');
                setSearchParams(params);
              }}
              className={`px-3 py-1.5 text-xs font-medium ${bookingView === 'calendar' ? 'bg-[#a06b42] text-white' : 'text-[#4b2a00] hover:bg-[#f5e6d5]'}`}
            >
              Calendar
            </button>
          </div>
        </div>
        <div className="mb-4 bg-white rounded-xl shadow-sm border border-[#e0d5c7] px-3 py-3 flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-[11px] text-gray-600 mb-1">Status</label>
            <select
              value={bookingFilters.status}
              onChange={e => {
                const value = e.target.value;
                setBookingFilters({ ...bookingFilters, status: value });
                const params = new URLSearchParams(location.search || '');
                if (value) params.set('status', value); else params.delete('status');
                setSearchParams(params);
              }}
              className="px-3 py-2 border border-[#d4c4b0] rounded-lg text-sm"
            >
              <option value="">All</option>
              {['pending','confirmed','active','completed','cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-gray-600 mb-1">From</label>
            <input type="date" value={bookingFilters.from} onChange={e => setBookingFilters({ ...bookingFilters, from: e.target.value })} className="px-3 py-2 border border-[#d4c4b0] rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-[11px] text-gray-600 mb-1">To</label>
            <input type="date" value={bookingFilters.to} onChange={e => setBookingFilters({ ...bookingFilters, to: e.target.value })} className="px-3 py-2 border border-[#d4c4b0] rounded-lg text-sm" />
          </div>
          <button onClick={exportBookingsCsv} className="ml-auto inline-flex items-center justify-center px-3 py-2 rounded-lg bg-[#a06b42] hover:bg-[#8f5a32] text-white text-xs font-medium shadow-sm">Export CSV</button>
        </div>
        {bookingView === 'list' ? (
          <div className="bg-white rounded-xl shadow-sm border border-[#e0d5c7] overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-[#f7efe4] text-left text-[11px] uppercase tracking-wide text-[#6b5744]">
                  <th className="px-4 py-2">Vehicle</th>
                  <th className="px-4 py-2">Renter</th>
                  <th className="px-4 py-2">Dates</th>
                  <th className="px-4 py-2">Amount</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.filter(b => {
                  if (selectedCarId && String(b.car?._id) !== String(selectedCarId)) return false;
                  if (bookingFilters.status && b.status !== bookingFilters.status) return false;
                  if (bookingFilters.from) {
                    const from = new Date(bookingFilters.from);
                    if (new Date(b.pickupDate) < from) return false;
                  }
                  if (bookingFilters.to) {
                    const to = new Date(bookingFilters.to);
                    if (new Date(b.returnDate) > to) return false;
                  }
                  return true;
                }).map(b => (
                  <tr key={b._id} className="border-t border-[#f0e6d9] hover:bg-[#fffaf4]">
                    <td className="px-4 py-3 text-sm font-medium text-[#3b2a18]">{b.car?.vehicleName}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{b.guest?.firstName} {b.guest?.lastName}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">{new Date(b.pickupDate).toLocaleDateString()} <span className="mx-1">→</span> {new Date(b.returnDate).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-[#4b2a00]">{formatCurrencyRWF ? formatCurrencyRWF(b.totalAmount || 0) : `RWF ${Number(b.totalAmount || 0).toLocaleString()}`}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${
                        b.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        b.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                        b.status === 'active' ? 'bg-emerald-100 text-emerald-800' :
                        b.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 flex flex-wrap items-center gap-1.5">
                      {['pending','confirmed','active','completed','cancelled'].map(s => (
                        <button key={s} onClick={async () => {
                          const res = await fetch(`${API_URL}/api/car-bookings/${b._id}/status`, { method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: s }) });
                          const data = await res.json();
                          if (!res.ok) return toast.error(data.message || 'Failed');
                          setBookings(list => list.map(x => x._id === b._id ? data.booking : x));
                          toast.success('Status updated');
                        }} className="px-2 py-1 rounded-full border border-[#d4c4b0] bg-white text-[11px] text-[#4b2a00] hover:bg-[#f5e6d5]">{s}</button>
                      ))}
                      <button onClick={() => setReceiptBooking(b)} className="px-2 py-1 rounded-full bg-emerald-600 text-white text-[11px] hover:bg-emerald-700">Receipt</button>
                      <Link
                        to={`/messages?to=${b.guest?._id || ''}&booking=${b._id}`}
                        className="px-2 py-1 rounded-full bg-[#4b2a00] text-white text-[11px] hover:bg-[#2f1905]"
                      >
                        Message
                      </Link>
                    </td>
                  </tr>
                ))}
                {bookings.filter(b => {
                  if (selectedCarId && String(b.car?._id) !== String(selectedCarId)) return false;
                  if (bookingFilters.status && b.status !== bookingFilters.status) return false;
                  if (bookingFilters.from) {
                    const from = new Date(bookingFilters.from);
                    if (new Date(b.pickupDate) < from) return false;
                  }
                  if (bookingFilters.to) {
                    const to = new Date(bookingFilters.to);
                    if (new Date(b.returnDate) > to) return false;
                  }
                  return true;
                }).length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-xs text-gray-500">
                      No bookings match your current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-4 overflow-x-auto">
            <div className="mb-3 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  setCalendarMonthOffset(o => {
                    const next = o - 1;
                    const params = new URLSearchParams(location.search || '');
                    params.set('monthOffset', String(next));
                    setSearchParams(params);
                    return next;
                  });
                }}
                className="px-2 py-1 text-xs rounded border bg-white hover:bg-gray-50"
              >
                ◀
              </button>
              <div className="text-sm font-semibold text-gray-800">{calendarMeta.label}</div>
              <button
                type="button"
                onClick={() => {
                  setCalendarMonthOffset(o => {
                    const next = o + 1;
                    const params = new URLSearchParams(location.search || '');
                    params.set('monthOffset', String(next));
                    setSearchParams(params);
                    return next;
                  });
                }}
                className="px-2 py-1 text-xs rounded border bg-white hover:bg-gray-50"
              >
                ▶
              </button>
            </div>
            <div className="grid grid-cols-7 text-[11px] text-gray-500 mb-1">
              {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
                <div key={d} className="px-1 py-1 text-center">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-px text-xs">
              {calendarMeta.cells.map((day, idx) => {
                if (!day) {
                  return <div key={idx} className="h-20 bg-gray-50 border" />;
                }
                const dayBookings = bookings.filter(b => {
                  if (selectedCarId && String(b.car?._id) !== String(selectedCarId)) return false;
                  if (bookingFilters.status && b.status !== bookingFilters.status) return false;
                  if (bookingFilters.from) {
                    const from = new Date(bookingFilters.from);
                    if (new Date(b.pickupDate) < from) return false;
                  }
                  if (bookingFilters.to) {
                    const to = new Date(bookingFilters.to);
                    if (new Date(b.returnDate) > to) return false;
                  }
                  const start = new Date(b.pickupDate);
                  const end = new Date(b.returnDate);
                  return start <= day && end >= day;
                });
                const count = dayBookings.length;
                return (
                  <div key={idx} className="h-20 border bg-white flex flex-col px-1 py-1">
                    <div className="text-[11px] font-semibold text-gray-800">{day.getDate()}</div>
                    {count > 0 && (
                      <div className="mt-auto text-[10px] font-medium text-[#a06b42]">
                        {count} booking{count > 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
      )}

        {receiptBooking && (
          <ReceiptPreview
          title="Vehicle Rental Receipt"
          lines={[
            { label: 'Receipt', value: `#${String(receiptBooking._id).slice(-8)}` },
            { label: 'Date', value: new Date().toLocaleString() },
            '---',
            { label: 'Vehicle', value: receiptBooking.car?.vehicleName || '' },
            { label: 'Renter', value: `${receiptBooking.guest?.firstName || ''} ${receiptBooking.guest?.lastName || ''}`.trim() },
            { label: 'Pickup', value: new Date(receiptBooking.pickupDate).toLocaleDateString() },
            { label: 'Return', value: new Date(receiptBooking.returnDate).toLocaleDateString() },
            { label: 'Days', value: String(receiptBooking.numberOfDays || 0) },
            { label: 'Amount', value: formatCurrencyRWF ? formatCurrencyRWF(receiptBooking.totalAmount || 0) : `RWF ${Number(receiptBooking.totalAmount || 0).toLocaleString()}` },
            { label: 'Status', value: receiptBooking.status || '' },
          ]}
          onPrint={() => window.print()}
          onClose={() => setReceiptBooking(null)}
        />
      )}
      <SuccessModal open={successOpen} title={successTitle} message={successMsg} onClose={() => setSuccessOpen(false)} />
      </div>
    </div>
  );
}
