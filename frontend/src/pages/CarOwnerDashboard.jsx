import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useLocale } from '../contexts/LocaleContext';
import ReceiptPreview from '../components/ReceiptPreview';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import SuccessModal from '../components/SuccessModal';
import CommissionUpgradeModal from '../components/CommissionUpgradeModal';
import CommissionLevelChangeNotification from '../components/CommissionLevelChangeNotification';
import {
  FaCar,
  FaCalendarAlt,
  FaDollarSign,
  FaChartLine,
  FaStar,
  FaEnvelope,
  FaCog,
  FaCrown,
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
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { formatCurrencyRWF } = useLocale() || {};
  const view = (searchParams.get('view') || 'overview').toLowerCase();
  const financeMode = (searchParams.get('mode') || 'expenses').toLowerCase();
  const financeFilter = (searchParams.get('filter') || 'all').toLowerCase();
  const financeRange = (searchParams.get('range') || '30').toLowerCase();

  const financeModeLabel = financeMode === 'income'
    ? 'Income & revenue'
    : financeMode === 'profit-loss'
      ? 'Profit & loss'
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
  const clientsContractsMode = (searchParams.get('mode') || 'list').toLowerCase();
  const [financeStats, setFinanceStats] = useState({
    rev30: 0,
    revYtd: 0,
    avg30: 0,
    bookings30: 0,
    bookingsYtd: 0,
  });
  // Single URL param `section` is used for several views (analytics, vehicles, bookings)
  const analyticsSection = (searchParams.get('section') || '').toLowerCase();
  const vehiclesSection = analyticsSection || 'list';
  const [bookingView, setBookingView] = useState(() => (analyticsSection === 'calendar' ? 'calendar' : 'list'));
  const bookingsRef = useRef(null);

  // Direct booking (host-side) for vehicles
  const [showDirectCarBooking, setShowDirectCarBooking] = useState(false);
  const [directCarBookingSaving, setDirectCarBookingSaving] = useState(false);
  const [directCarForm, setDirectCarForm] = useState({
    carId: '',
    pickupDate: '',
    returnDate: '',
    pickupLocation: '',
    returnLocation: '',
    guestName: '',
    guestEmail: '',
    guestPhone: '',
    paymentMethod: 'cash',
    finalPrice: '',
  });
  const createFormRef = useRef(null);
  const [fuelSummary, setFuelSummary] = useState({ totalLiters: 0, totalCost: 0 });
  const [fuelForm, setFuelForm] = useState({
    carId: '',
    date: '',
    liters: '',
    totalCost: '',
    pricePerLiter: '',
    odometerKm: '',
    stationName: '',
    note: ''
  });
  const [fuelSaving, setFuelSaving] = useState(false);
  const [fuelLogs, setFuelLogs] = useState([]);
  const [fuelLoading, setFuelLoading] = useState(false);
  const [cars, setCars] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [carTours, setCarTours] = useState([]);
  const [carTourForm, setCarTourForm] = useState({
    title: '',
    startLocation: '',
    endLocation: '',
    basePrice: '',
    primaryCar: ''
  });
  const [carTourSaving, setCarTourSaving] = useState(false);
  const [tripRoutes, setTripRoutes] = useState([]);
  const [tripRouteForm, setTripRouteForm] = useState({
    bookingId: '',
    date: '',
    distanceKm: '',
    startOdometer: '',
    endOdometer: ''
  });
  const [tripRouteSaving, setTripRouteSaving] = useState(false);
  const [bookingFilters, setBookingFilters] = useState({ status: '', from: '', to: '' });
  const [calendarMonthOffset, setCalendarMonthOffset] = useState(() => {
    try {
      const raw = searchParams.get('monthOffset');
      const parsed = raw != null ? parseInt(raw, 10) : 0;
      return Number.isNaN(parsed) ? 0 : parsed;
    } catch (_) {
      return 0;
    }
  });
  const calendarMeta = useMemo(() => {
    const today = new Date();
    const base = new Date(today.getFullYear(), today.getMonth(), 1);
    if (calendarMonthOffset) {
      base.setMonth(base.getMonth() + calendarMonthOffset);
    }

    const year = base.getFullYear();
    const month = base.getMonth();
    const label = base.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(new Date(year, month, d));
    }
    while (cells.length % 7 !== 0) cells.push(null);

    return { label, cells };
  }, [calendarMonthOffset]);
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
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
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
  const [profitLossPeriodType, setProfitLossPeriodType] = useState('monthly');
  const [profitLossYear, setProfitLossYear] = useState(() => new Date().getFullYear());
  const [profitLossMonth, setProfitLossMonth] = useState(() => new Date().getMonth());
  const [savedProfitLossReports, setSavedProfitLossReports] = useState([]);
  const [pageExpensesAll, setPageExpensesAll] = useState(1);
  const [pageExpenseCategories, setPageExpenseCategories] = useState(1);
  const [pageExpenseReports, setPageExpenseReports] = useState(1);
  const [pageRevenueSummary, setPageRevenueSummary] = useState(1);
  const [pageProfitLossSaved, setPageProfitLossSaved] = useState(1);
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
  const [carClients, setCarClients] = useState([]);
  const [carClientsLoading, setCarClientsLoading] = useState(false);
  const [carClientsSaving, setCarClientsSaving] = useState(false);
  const [carClientsError, setCarClientsError] = useState('');
  const [clientForm, setClientForm] = useState({
    name: '',
    email: '',
    phone: '',
    type: 'individual',
    companyName: '',
    notes: '',
  });
  const [carContracts, setCarContracts] = useState([]);
  const [carContractsLoading, setCarContractsLoading] = useState(false);
  const [carContractsSaving, setCarContractsSaving] = useState(false);
  const [carContractsError, setCarContractsError] = useState('');
  const [contractForm, setContractForm] = useState({
    clientId: '',
    carId: '',
    startDate: '',
    endDate: '',
    amount: '',
    status: 'draft',
    fileUrl: '',
    notes: '',
  });
  const [contractSummary, setContractSummary] = useState(null);
  const [contractSummaryLoading, setContractSummaryLoading] = useState(false);
  const [editingClientId, setEditingClientId] = useState(null);
  const [editingClientForm, setEditingClientForm] = useState({
    name: '',
    email: '',
    phone: '',
    type: 'individual',
    companyName: '',
    notes: '',
  });
  const [editingContractId, setEditingContractId] = useState(null);
  const [editingContractForm, setEditingContractForm] = useState({
    startDate: '',
    endDate: '',
    amount: '',
    status: 'draft',
    fileUrl: '',
    notes: '',
  });

  const financeBookingsTable = Array.isArray(bookings) ? bookings : [];
  const PAGE_SIZE = 10;

  // Aggregate stats and financeStats from bookings whenever bookings or filters change
  useEffect(() => {
    const list = Array.isArray(bookings) ? bookings : [];

    // Optionally scope by selectedCarId when viewing finance
    const scoped = selectedCarId
      ? list.filter(b => String(b.car?._id) === String(selectedCarId))
      : list;

    // --- General stats ---
    let totalRevenue = 0;
    let totalDays = 0;
    let totalBookings = scoped.length;
    let pending = 0;
    let active = 0;
    let completed = 0;
    let cancelled = 0;

    scoped.forEach(b => {
      const amount = Number(b.totalAmount || 0);
      const days = Number(b.numberOfDays || 0);
      const status = String(b.status || '').toLowerCase();

      totalRevenue += amount;
      totalDays += days;

      if (status === 'completed') completed++;
      else if (status === 'active' || status === 'confirmed') active++;
      else if (status === 'pending') pending++;
      else if (status === 'cancelled') cancelled++;
    });

    setStats({
      totalBookings,
      pending,
      active,
      completed,
      cancelled,
      totalRevenue,
      daysRented: totalDays,
      avgRentalLength: totalBookings ? totalDays / totalBookings : 0,
    });

    // --- Finance stats (last 30 days, year-to-date) ---
    const now = new Date();
    const start30 = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
    const startYtd = new Date(now.getFullYear(), 0, 1);

    let rev30 = 0;
    let revYtd = 0;
    let bookings30 = 0;
    let bookingsYtd = 0;

    scoped.forEach(b => {
      const amount = Number(b.totalAmount || 0);
      const pickup = b.pickupDate ? new Date(b.pickupDate) : null;
      if (!pickup) return;

      if (pickup >= start30) {
        rev30 += amount;
        bookings30++;
      }
      if (pickup >= startYtd) {
        revYtd += amount;
        bookingsYtd++;
      }
    });

    setFinanceStats({
      rev30,
      revYtd,
      avg30: bookings30 ? rev30 / bookings30 : 0,
      bookings30,
      bookingsYtd,
    });
  }, [bookings, selectedCarId]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem('carProfitLossReports');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setSavedProfitLossReports(parsed);
      }
    } catch (_) {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem('carProfitLossReports', JSON.stringify(savedProfitLossReports || []));
    } catch (_) {
      // ignore
    }
  }, [savedProfitLossReports]);

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
      const vehiclesList = carsData.cars || [];
      setCars(vehiclesList);
      setBookings(bookingsData.bookings || []);

      // Ensure a selected car without redirecting away from the dashboard
      const carParam = searchParams.get('car');
      if (vehiclesList.length === 0) {
        // No vehicles - send host to vehicle upload flow
        navigate('/upload-property?type=vehicle', { replace: true });
        return;
      }

      const firstCarId = String(vehiclesList[0]._id || vehiclesList[0].id || '');

      if (!carParam) {
        // Has vehicles but no specific car selected - default to the first one
        if (firstCarId) {
          setSelectedCarId(firstCarId);
          const params = new URLSearchParams(location.search || '');
          params.set('car', firstCarId);
          navigate(`/owner/cars?${params.toString()}`, { replace: true });
        }
      } else {
        // Has car param - validate it against loaded vehicles
        const carExists = vehiclesList.find(c => String(c._id) === String(carParam));
        if (carExists) {
          setSelectedCarId(String(carParam));
        } else if (firstCarId) {
          // Fallback to first car if the one in the URL no longer exists
          setSelectedCarId(firstCarId);
          const params = new URLSearchParams(location.search || '');
          params.set('car', firstCarId);
          navigate(`/owner/cars?${params.toString()}`, { replace: true });
        }
      }
    } catch (e) {
      console.error('[Vehicles][loadData] error', e);
      // Show empty state silently
      setCars([]);
      setBookings([]);
    } finally { setLoading(false); }
  }

  // Load data on mount and when search params change
  useEffect(() => {
    loadData();
  }, [location.search]);

  // Load car clients and contracts lazily when their views are opened
  useEffect(() => {
    if (view === 'clients') {
      if (!carClientsLoading && carClients.length === 0 && !carClientsError) {
        loadCarClients();
      }
    }
    if (view === 'contracts') {
      if (!carContractsLoading && carContracts.length === 0 && !carContractsError) {
        loadCarContracts();
      }
      if (clientsContractsMode === 'reports' && !contractSummary && !contractSummaryLoading) {
        loadContractSummary();
      }
    }
  }, [view, clientsContractsMode]);

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

  async function loadCarClients() {
    try {
      setCarClientsLoading(true);
      setCarClientsError('');
      const res = await fetch(`${API_URL}/api/car-clients`, {
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || 'Failed to load clients');
      }
      const list = Array.isArray(data.clients) ? data.clients : [];
      setCarClients(list);
    } catch (err) {
      console.error('[Vehicles][clients][load]', err);
      setCarClientsError(err.message || 'Failed to load clients');
      setCarClients([]);
      toast.error(err.message || 'Failed to load clients');
    } finally {
      setCarClientsLoading(false);
    }
  }

  async function saveClient(e) {
    e?.preventDefault?.();
    if (!clientForm.name.trim()) {
      toast.error('Client name is required');
      return;
    }
    try {
      setCarClientsSaving(true);
      const payload = {
        name: clientForm.name,
        email: clientForm.email || undefined,
        phone: clientForm.phone || undefined,
        type: clientForm.type || undefined,
        companyName: clientForm.companyName || undefined,
        notes: clientForm.notes || undefined,
      };
      const res = await fetch(`${API_URL}/api/car-clients`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || 'Failed to create client');
      }
      const created = data.client || data;
      setCarClients(list => [created, ...list]);
      setClientForm({ name: '', email: '', phone: '', type: 'individual', companyName: '', notes: '' });
      toast.success('Client saved');
    } catch (err) {
      console.error('[Vehicles][clients][save]', err);
      toast.error(err.message || 'Failed to save client');
    } finally {
      setCarClientsSaving(false);
    }
  }

  async function updateClient(id, patch) {
    if (!id) return;
    try {
      const res = await fetch(`${API_URL}/api/car-clients/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch || {}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || 'Failed to update client');
      }
      const updated = data.client || data;
      setCarClients(list => list.map(c => c._id === updated._id ? updated : c));
      toast.success('Client updated');
    } catch (err) {
      console.error('[Vehicles][clients][update]', err);
      toast.error(err.message || 'Failed to update client');
    }
  }

  async function deleteClient(id) {
    if (!id) return;
    if (!confirm('Delete this client?')) return;
    try {
      const res = await fetch(`${API_URL}/api/car-clients/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || 'Failed to delete client');
      }
      setCarClients(list => list.filter(c => c._id !== id));
      toast.success('Client deleted');
    } catch (err) {
      console.error('[Vehicles][clients][delete]', err);
      toast.error(err.message || 'Failed to delete client');
    }
  }

  async function loadCarContracts() {
    try {
      setCarContractsLoading(true);
      setCarContractsError('');
      const params = new URLSearchParams();
      if (selectedCarId) params.set('car', selectedCarId);
      const qs = params.toString();
      const url = qs ? `${API_URL}/api/car-contracts?${qs}` : `${API_URL}/api/car-contracts`;
      const res = await fetch(url, { credentials: 'include' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || 'Failed to load contracts');
      }
      const list = Array.isArray(data.contracts) ? data.contracts : [];
      setCarContracts(list);
    } catch (err) {
      console.error('[Vehicles][contracts][load]', err);
      setCarContractsError(err.message || 'Failed to load contracts');
      setCarContracts([]);
      toast.error(err.message || 'Failed to load contracts');
    } finally {
      setCarContractsLoading(false);
    }
  }

  async function loadContractSummary() {
    try {
      setContractSummaryLoading(true);
      const params = new URLSearchParams();
      if (selectedCarId) params.set('car', selectedCarId);
      const qs = params.toString();
      const url = qs ? `${API_URL}/api/car-contracts/summary?${qs}` : `${API_URL}/api/car-contracts/summary`;
      const res = await fetch(url, { credentials: 'include' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || 'Failed to load contract summary');
      }
      setContractSummary(data);
    } catch (err) {
      console.error('[Vehicles][contracts][summary]', err);
      toast.error(err.message || 'Failed to load contract summary');
      setContractSummary(null);
    } finally {
      setContractSummaryLoading(false);
    }
  }

  async function saveContract(e) {
    e?.preventDefault?.();
    if (!contractForm.clientId || !contractForm.startDate || !contractForm.endDate || contractForm.amount === '') {
      toast.error('Client, start date, end date and amount are required');
      return;
    }
    try {
      setCarContractsSaving(true);
      const payload = {
        client: contractForm.clientId,
        car: contractForm.carId || undefined,
        startDate: contractForm.startDate,
        endDate: contractForm.endDate,
        amount: Number(contractForm.amount),
        status: contractForm.status || undefined,
        fileUrl: contractForm.fileUrl || undefined,
        notes: contractForm.notes || undefined,
      };
      const res = await fetch(`${API_URL}/api/car-contracts`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || 'Failed to create contract');
      }
      const created = data.contract || data;
      setCarContracts(list => [created, ...list]);
      setContractForm({
        clientId: '',
        carId: '',
        startDate: '',
        endDate: '',
        amount: '',
        status: 'draft',
        fileUrl: '',
        notes: '',
      });
      toast.success('Contract saved');
    } catch (err) {
      console.error('[Vehicles][contracts][save]', err);
      toast.error(err.message || 'Failed to save contract');
    } finally {
      setCarContractsSaving(false);
    }
  }

  async function updateContract(id, patch) {
    if (!id) return;
    try {
      const res = await fetch(`${API_URL}/api/car-contracts/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch || {}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || 'Failed to update contract');
      }
      const updated = data.contract || data;
      setCarContracts(list => list.map(ct => ct._id === updated._id ? updated : ct));
      toast.success('Contract updated');
    } catch (err) {
      console.error('[Vehicles][contracts][update]', err);
      toast.error(err.message || 'Failed to update contract');
    }
  }

  async function deleteContract(id) {
    if (!id) return;
    if (!confirm('Delete this contract?')) return;
    try {
      const res = await fetch(`${API_URL}/api/car-contracts/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || 'Failed to delete contract');
      }
      setCarContracts(list => list.filter(ct => ct._id !== id));
      toast.success('Contract deleted');
    } catch (err) {
      console.error('[Vehicles][contracts][delete]', err);
      toast.error(err.message || 'Failed to delete contract');
    }
  }

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

        {/* Overview dashboard: grouped homepage for vehicles */}
        {view === 'overview' && (
        <>
          {/* Top summary tiles */}
          <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-2xl bg-white shadow-sm border border-gray-100 px-3 py-2.5">
              <div className="text-[11px] text-gray-500">Total vehicles</div>
              <div className="text-lg font-semibold text-gray-900">{Array.isArray(cars) ? cars.length : 0}</div>
            </div>
            <div className="rounded-2xl bg-white shadow-sm border border-gray-100 px-3 py-2.5">
              <div className="text-[11px] text-gray-500">Active / upcoming bookings</div>
              <div className="text-lg font-semibold text-emerald-700">
                {Array.isArray(bookings)
                  ? bookings.filter(b => {
                      const s = String(b.status || '').toLowerCase();
                      return s === 'active' || s === 'confirmed' || s === 'pending';
                    }).length
                  : 0}
              </div>
            </div>
            <div className="rounded-2xl bg-white shadow-sm border border-gray-100 px-3 py-2.5">
              <div className="text-[11px] text-gray-500">Completed bookings</div>
              <div className="text-lg font-semibold text-blue-700">{stats.completed}</div>
            </div>
            <div className="rounded-2xl bg-white shadow-sm border border-gray-100 px-3 py-2.5">
              <div className="text-[11px] text-gray-500">Revenue to date</div>
              <div className="text-sm font-semibold text-gray-900">
                {formatCurrencyRWF
                  ? formatCurrencyRWF(stats.totalRevenue || 0)
                  : `RWF ${Number(stats.totalRevenue || 0).toLocaleString()}`}
              </div>
            </div>
          </div>

          {/* Fleet grouped by category & availability */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl bg-white shadow-sm border border-gray-100 px-4 py-4">
              <h2 className="text-sm font-semibold text-[#4b2a00] mb-1">Your fleet by category</h2>
              <p className="text-[11px] text-gray-600 mb-2">Quick view of vehicles grouped by type.</p>
              {(() => {
                const list = Array.isArray(cars) ? cars : [];
                const categories = ['car', 'motorcycle', 'bicycle'];
                const counts = categories.map(cat => ({
                  key: cat,
                  label: cat.charAt(0).toUpperCase() + cat.slice(1),
                  count: list.filter(c => String(c.category || 'car') === cat).length
                }));
                const total = list.length;
                if (!total) {
                  return (
                    <div className="text-[11px] text-gray-600 mt-1">
                      No vehicles listed yet. Use the Vehicles tab to create your first listing.
                    </div>
                  );
                }
                return (
                  <div className="mt-2 space-y-2 text-xs">
                    {counts.map(c => (
                      <div key={c.key} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="inline-block w-2 h-2 rounded-full bg-[#a06b42]"></span>
                          <span className="text-gray-800">{c.label}</span>
                        </div>
                        <span className="font-semibold text-gray-900">{c.count}</span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            <div className="rounded-2xl bg-white shadow-sm border border-gray-100 px-4 py-4">
              <h2 className="text-sm font-semibold text-[#4b2a00] mb-1">Availability status</h2>
              <p className="text-[11px] text-gray-600 mb-2">How many vehicles are currently bookable.</p>
              {(() => {
                const list = Array.isArray(cars) ? cars : [];
                const available = list.filter(c => c.isAvailable).length;
                const unavailable = list.length - available;
                if (!list.length) {
                  return (
                    <div className="text-[11px] text-gray-600 mt-1">
                      No vehicles yet to track availability.
                    </div>
                  );
                }
                return (
                  <div className="mt-2 space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700">Available</span>
                      <span className="font-semibold text-emerald-700">{available}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700">Unavailable</span>
                      <span className="font-semibold text-gray-700">{unavailable}</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Revenue summary */}
          <div className="mb-6 rounded-2xl bg-white shadow-sm border border-gray-100 px-4 py-4">
            <h2 className="text-sm font-semibold text-[#4b2a00] mb-1">Revenue summary</h2>
            <p className="text-[11px] text-gray-600 mb-1">
              High-level view of your vehicle revenue based on recent bookings.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2 text-xs">
              <div>
                <div className="text-[11px] text-gray-500 mb-0.5">Last 30 days (bookings)</div>
                <div className="font-semibold text-gray-900">{financeStats.bookings30}</div>
              </div>
              <div>
                <div className="text-[11px] text-gray-500 mb-0.5">Last 30 days revenue</div>
                <div className="font-semibold text-gray-900">
                  {formatCurrencyRWF
                    ? formatCurrencyRWF(financeStats.rev30 || 0)
                    : `RWF ${Number(financeStats.rev30 || 0).toLocaleString()}`}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-gray-500 mb-0.5">Year-to-date revenue</div>
                <div className="font-semibold text-gray-900">
                  {formatCurrencyRWF
                    ? formatCurrencyRWF(financeStats.revYtd || 0)
                    : `RWF ${Number(financeStats.revYtd || 0).toLocaleString()}`}
                </div>
              </div>
            </div>
          </div>

          {/* Vehicles group home - list all vehicles with quick manage actions */}
          <div className="mb-6 rounded-2xl bg-white shadow-sm border border-gray-100 px-4 py-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
              <div>
                <h2 className="text-sm font-semibold text-[#4b2a00] mb-0.5">Your vehicles</h2>
                <p className="text-[11px] text-gray-600">
                  Start from this list to choose which vehicle you want to manage. Each vehicle opens in its own tab.
                </p>
              </div>
              {Array.isArray(cars) && cars.length > 0 && (
                <div className="text-[11px] text-gray-500">
                  {cars.length} vehicle{cars.length === 1 ? '' : 's'}
                </div>
              )}
            </div>

            {(!Array.isArray(cars) || cars.length === 0) ? (
              <div className="py-3 text-[11px] text-gray-600">
                You don't have any vehicles listed yet. Use the Vehicles tab or the upload wizard to create your first listing.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-[11px]">
                  <thead className="bg-[#f5ebe0] text-gray-600 uppercase tracking-wide">
                    <tr>
                      <th className="px-3 py-2 text-left">Vehicle</th>
                      <th className="px-3 py-2 text-left">Category</th>
                      <th className="px-3 py-2 text-left">Status</th>
                      <th className="px-3 py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f1e4d4] bg-white">
                    {cars.map((c) => {
                      const id = String(c._id || '');
                      const name = c.vehicleName || `${c.brand || ''} ${c.model || ''}`.trim() || 'Untitled vehicle';
                      const cat = String(c.category || 'car');
                      const isAvailable = !!c.isAvailable;
                      const handleManage = () => {
                        try {
                          const basePath = '/owner/cars';
                          const params = new URLSearchParams();
                          params.set('view', 'vehicles');
                          params.set('section', 'details');
                          params.set('car', id);
                          const url = `${basePath}?${params.toString()}`;
                          if (typeof window !== 'undefined') {
                            window.open(url, '_blank', 'noopener,noreferrer');
                          }
                        } catch (_) {}
                      };
                      return (
                        <tr key={id} className="hover:bg-[#fdf7ee] transition-colors">
                          <td className="px-3 py-2 align-top">
                            <button
                              type="button"
                              onClick={handleManage}
                              className="text-left text-[#4b2a00] font-semibold hover:underline"
                            >
                              {name}
                            </button>
                          </td>
                          <td className="px-3 py-2 align-top text-gray-700 capitalize">{cat}</td>
                          <td className="px-3 py-2 align-top">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] ${
                                isAvailable
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                  : 'bg-gray-50 border-gray-200 text-gray-700'
                              }`}
                            >
                              {isAvailable ? 'Available' : 'Unavailable'}
                            </span>
                          </td>
                          <td className="px-3 py-2 align-top text-right">
                            <button
                              type="button"
                              onClick={handleManage}
                              className="inline-flex items-center px-2 py-1 rounded-md bg-[#a06b42] hover:bg-[#8f5a32] text-white text-[10px] font-medium"
                            >
                              Manage
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                      <div className="flex items-center justify-between px-3 py-2 text-[11px] text-gray-600">
                        <div>
                          Page {safePage} of {totalPages}
                        </div>
                        <div className="space-x-2">
                          <button
                            type="button"
                            onClick={() => setPageRevenueSummary(p => Math.max(1, p - 1))}
                            disabled={safePage <= 1}
                            className="px-2 py-0.5 border border-[#d4c4b0] rounded disabled:opacity-50"
                          >
                            Previous
                          </button>
                          <button
                            type="button"
                            onClick={() => setPageRevenueSummary(p => Math.min(totalPages, p + 1))}
                            disabled={safePage >= totalPages}
                            className="px-2 py-0.5 border border-[#d4c4b0] rounded disabled:opacity-50"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Upcoming bookings / recent activity */}
          <div className="mb-6 rounded-2xl bg-white shadow-sm border border-gray-100 px-4 py-4">
            <h2 className="text-sm font-semibold text-[#4b2a00] mb-1">Upcoming & recent bookings</h2>
            <p className="text-[11px] text-gray-600 mb-3">
              Snapshot of bookings across your vehicles.
            </p>
            <ul className="divide-y divide-[#f1e4d4] text-xs">
              {(() => {
                const list = Array.isArray(bookings) ? [...bookings] : [];
                list.sort((a, b) => {
                  const da = a.pickupDate ? new Date(a.pickupDate).getTime() : 0;
                  const db = b.pickupDate ? new Date(b.pickupDate).getTime() : 0;
                  return da - db;
                });
                const top = list.slice(0, 5);
                if (top.length === 0) {
                  return (
                    <li className="py-2 text-[11px] text-gray-600">
                      No bookings yet. When you receive reservations, they will appear here.
                    </li>
                  );
                }
                return top.map(b => {
                  const pickup = b.pickupDate ? new Date(b.pickupDate) : null;
                  const status = String(b.status || '').toLowerCase();
                  const vehicleLabel = (b.car?.vehicleName || `${b.car?.brand || ''} ${b.car?.model || ''}`.trim() || 'Vehicle').replace(/,/g, ' ');
                  return (
                    <li key={b._id} className="py-2 flex items-start gap-2">
                      <span
                        className={`mt-1 inline-block w-2 h-2 rounded-full ${
                          status === 'completed'
                            ? 'bg-emerald-500'
                            : status === 'cancelled'
                              ? 'bg-red-500'
                              : 'bg-amber-400'
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-semibold text-[#4b2a00] truncate text-[11px]">
                            {vehicleLabel}
                          </div>
                          {pickup && (
                            <span className="text-[10px] text-gray-500 whitespace-nowrap">
                              {pickup.toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-gray-700 mt-0.5">
                          Status: <span className="font-semibold">{status || 'n/a'}</span>
                        </div>
                      </div>
                    </li>
                  );
                });
              })()}
            </ul>
          </div>
        </>
      )}

        {view === 'revenue' && (
        <>
          <div className="mb-6 rounded-2xl bg-white border border-[#e0d5c7] px-4 py-4 shadow-sm">
            <h2 className="text-lg font-semibold mb-1 text-[#4b2a00]">Revenue summary</h2>
            <p className="text-xs text-gray-600 mb-3">
              High-level revenue overview for your vehicles.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <div className="text-[11px] text-gray-500 mb-0.5">Total revenue to date</div>
                <div className="font-semibold text-gray-900">
                  {formatCurrencyRWF
                    ? formatCurrencyRWF(stats.totalRevenue || 0)
                    : `RWF ${Number(stats.totalRevenue || 0).toLocaleString()}`}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-gray-500 mb-0.5">Last 30 days revenue</div>
                <div className="font-semibold text-gray-900">
                  {formatCurrencyRWF
                    ? formatCurrencyRWF(financeStats.rev30 || 0)
                    : `RWF ${Number(financeStats.rev30 || 0).toLocaleString()}`}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-gray-500 mb-0.5">Year-to-date revenue</div>
                <div className="font-semibold text-gray-900">
                  {formatCurrencyRWF
                    ? formatCurrencyRWF(financeStats.revYtd || 0)
                    : `RWF ${Number(financeStats.revYtd || 0).toLocaleString()}`}
                </div>
              </div>
            </div>
          </div>

          <div className="mb-6 rounded-2xl bg-white border border-[#e0d5c7] shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-[#e0d5c7] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-[#4b2a00]">Revenue summary table</h3>
                <p className="text-[11px] text-gray-600 mt-0.5">
                  All trips contributing to your revenue for this account.
                </p>
              </div>
              <div className="text-[11px] text-gray-500">
                {financeBookingsTable.length} trips
              </div>
            </div>
            {financeBookingsTable.length === 0 ? (
            <div className="px-4 py-6 text-xs text-gray-600">
              No bookings found for the current filters.
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
                    const status = String(b.status || '').toLowerCase();
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

        {view === 'activities' && (
        <div className="mb-6 rounded-2xl bg-white border border-[#e0d5c7] px-4 py-4 shadow-sm">
          <h2 className="text-lg font-semibold mb-1 text-[#4b2a00]">Recent activities</h2>
          <p className="text-xs text-gray-600 mb-3">
            Latest booking activity across your vehicles.
          </p>
          <ul className="divide-y divide-[#f1e4d4] text-xs">
            {(() => {
              const list = Array.isArray(bookings) ? [...bookings] : [];
              list.sort((a, b) => {
                const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return db - da;
              });
              const top = list.slice(0, 10);
              if (top.length === 0) {
                return (
                  <li className="py-2 text-[11px] text-gray-600">
                    No recent booking activity yet.
                  </li>
                );
              }
              return top.map(b => {
                const created = b.createdAt ? new Date(b.createdAt) : null;
                const status = String(b.status || '').toLowerCase();
                const vehicleLabel = (b.car?.vehicleName || `${b.car?.brand || ''} ${b.car?.model || ''}`.trim() || 'Vehicle').replace(/,/g, ' ');
                return (
                  <li key={b._id} className="py-2 flex items-start gap-2">
                    <span
                      className={`mt-1 inline-block w-2 h-2 rounded-full ${
                        status === 'completed'
                          ? 'bg-emerald-500'
                          : status === 'cancelled'
                            ? 'bg-red-500'
                            : 'bg-amber-400'
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-semibold text-[#4b2a00] truncate text-[11px]">
                          {vehicleLabel}
                        </div>
                        {created && (
                          <span className="text-[10px] text-gray-500 whitespace-nowrap">
                            {created.toLocaleDateString()}{' '}
                            {created.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-gray-700 mt-0.5">
                        Status: <span className="font-semibold">{status || 'n/a'}</span>
                      </div>
                    </div>
                  </li>
                );
              });
            })()}
          </ul>
        </div>
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

          {/* Expenses / income sub-panels based on financeMode */}
          {financeMode === 'expenses-all' && (
          <div className="mb-4 rounded-2xl bg-white border border-[#e0d5c7] px-4 py-4 text-xs text-gray-700 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-[#4b2a00] mb-0.5">All expenses</h3>
                <p className="text-[11px] text-gray-600">
                  Expenses recorded for your vehicles. Use the category filter above to narrow down.
                </p>
              </div>
              <div className="text-[11px] text-gray-600">
                Total: {formatCurrencyRWF
                  ? formatCurrencyRWF(carExpensesTotal || 0)
                  : `RWF ${Number(carExpensesTotal || 0).toLocaleString()}`}
              </div>
            </div>

            {(!Array.isArray(carExpenses) || carExpenses.length === 0) ? (
            <div className="py-4 text-[11px] text-gray-600">
              No expenses recorded yet for the current filters.
            </div>
            ) : (
            <div className="overflow-x-auto">
              {(() => {
                const rows = Array.isArray(carExpenses) ? carExpenses : [];
                const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
                const safePage = Math.min(pageExpensesAll, totalPages);
                const start = (safePage - 1) * PAGE_SIZE;
                const end = start + PAGE_SIZE;
                const pageRows = rows.slice(start, end);
                return (
                  <>
                    <table className="min-w-full text-[11px]">
                <thead className="bg-[#f5ebe0] uppercase tracking-wide text-gray-600">
                  <tr>
                    <th className="px-3 py-2 text-left">Date</th>
                    <th className="px-3 py-2 text-left">Vehicle</th>
                    <th className="px-3 py-2 text-left">Category</th>
                    <th className="px-3 py-2 text-left">Note</th>
                    <th className="px-3 py-2 text-right">Amount (RWF)</th>
                    <th className="px-3 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1e4d4] bg-white">
                  {pageRows.map(exp => {
                    const d = exp.date ? new Date(exp.date) : null;
                    const vehicleLabel = (exp.car?.vehicleName || `${exp.car?.brand || ''} ${exp.car?.model || ''}`.trim() || 'Vehicle').replace(/,/g, ' ');
                    const isEditing = editingExpenseId === exp._id;

                    const handleStartEdit = () => {
                      setEditingExpenseId(exp._id);
                      setEditingExpenseForm({
                        date: exp.date ? new Date(exp.date).toISOString().slice(0, 10) : '',
                        amount: String(exp.amount || ''),
                        category: exp.category || '',
                        note: exp.note || '',
                      });
                    };

                    const handleSaveEdit = () => {
                      if (!editingExpenseId) return;
                      const patch = {
                        date: editingExpenseForm.date || undefined,
                        amount: editingExpenseForm.amount !== '' ? Number(editingExpenseForm.amount) : undefined,
                        category: editingExpenseForm.category || undefined,
                        note: editingExpenseForm.note || undefined,
                      };
                      updateExpense(editingExpenseId, patch);
                    };

                    const handleCancelEdit = () => {
                      setEditingExpenseId(null);
                      setEditingExpenseForm({ date: '', amount: '', category: '', note: '' });
                    };

                    return (
                      <tr key={exp._id} className="hover:bg-[#fdf7ee]">
                        <td className="px-3 py-2 text-gray-700">
                          {isEditing ? (
                            <input
                              type="date"
                              className="w-full border border-[#e0d5c7] rounded px-2 py-1 bg-white"
                              value={editingExpenseForm.date}
                              onChange={e => setEditingExpenseForm(f => ({ ...f, date: e.target.value }))}
                            />
                          ) : (
                            d ? d.toLocaleDateString() : '-'
                          )}
                        </td>
                        <td className="px-3 py-2 text-gray-700">{vehicleLabel}</td>
                        <td className="px-3 py-2 text-gray-700">
                          {isEditing ? (
                            <input
                              type="text"
                              className="w-full border border-[#e0d5c7] rounded px-2 py-1 bg-white"
                              value={editingExpenseForm.category}
                              onChange={e => setEditingExpenseForm(f => ({ ...f, category: e.target.value }))}
                            />
                          ) : (
                            exp.category || 'general'
                          )}
                        </td>
                        <td className="px-3 py-2 text-gray-700 max-w-[200px]">
                          {isEditing ? (
                            <input
                              type="text"
                              className="w-full border border-[#e0d5c7] rounded px-2 py-1 bg-white"
                              value={editingExpenseForm.note}
                              onChange={e => setEditingExpenseForm(f => ({ ...f, note: e.target.value }))}
                            />
                          ) : (
                            <span className="truncate block">{exp.note || ''}</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right font-semibold text-gray-900">
                          {isEditing ? (
                            <input
                              type="number"
                              step="1"
                              className="w-full border border-[#e0d5c7] rounded px-2 py-1 bg-white text-right"
                              value={editingExpenseForm.amount}
                              onChange={e => setEditingExpenseForm(f => ({ ...f, amount: e.target.value }))}
                            />
                          ) : (
                            formatCurrencyRWF
                              ? formatCurrencyRWF(Number(exp.amount || 0))
                              : `RWF ${Number(exp.amount || 0).toLocaleString()}`
                          )}
                        </td>
                        <td className="px-3 py-2 text-right space-x-1">
                          {isEditing ? (
                            <>
                              <button
                                type="button"
                                onClick={handleSaveEdit}
                                className="inline-flex items-center px-2 py-0.5 rounded border border-emerald-200 text-[10px] text-emerald-700 hover:bg-emerald-50"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={handleCancelEdit}
                                className="inline-flex items-center px-2 py-0.5 rounded border border-gray-200 text-[10px] text-gray-700 hover:bg-gray-50"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={handleStartEdit}
                                className="inline-flex items-center px-2 py-0.5 rounded border border-[#d4c4b0] text-[10px] text-[#4b2a00] hover:bg-[#f5ebe0]"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteExpense(exp._id)}
                                className="inline-flex items-center px-2 py-0.5 rounded border border-red-200 text-[10px] text-red-700 hover:bg-red-50"
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
                    <div className="flex items-center justify-between px-3 py-2 text-[11px] text-gray-600">
                      <div>
                        Page {safePage} of {totalPages}
                      </div>
                      <div className="space-x-2">
                        <button
                          type="button"
                          onClick={() => setPageExpensesAll(p => Math.max(1, p - 1))}
                          disabled={safePage <= 1}
                          className="px-2 py-0.5 border border-[#d4c4b0] rounded disabled:opacity-50"
                        >
                          Previous
                        </button>
                        <button
                          type="button"
                          onClick={() => setPageExpensesAll(p => Math.min(totalPages, p + 1))}
                          disabled={safePage >= totalPages}
                          className="px-2 py-0.5 border border-[#d4c4b0] rounded disabled:opacity-50"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
            )}
          </div>
          )}

          {financeMode === 'profit-loss' && (
          <div className="mb-4 rounded-2xl bg-white border border-[#e0d5c7] px-4 py-4 text-sm text-gray-700 shadow-sm print:border-0 print:shadow-none">
            <h3 className="text-sm font-semibold text-[#4b2a00] mb-1">Profit &amp; loss</h3>
            <p className="text-xs text-gray-600 mb-3">
              Compare revenue from bookings with your recorded vehicle expenses for a selected month or year. Use the
              controls below to change the period and optionally scope to a specific vehicle.
            </p>

            {(() => {
              const scopedBookings = Array.isArray(bookings)
                ? (selectedCarId
                  ? bookings.filter(b => String(b.car?._id) === String(selectedCarId))
                  : bookings)
                : [];
              const scopedExpenses = Array.isArray(carExpenses)
                ? (selectedCarId
                  ? carExpenses.filter(exp => String(exp.car?._id) === String(selectedCarId))
                  : carExpenses)
                : [];

              const year = Number(profitLossYear) || new Date().getFullYear();
              const monthIndex = Number(profitLossMonth) || 0;

              let revenue = 0;
              let expensesTotal = 0;
              let commissionTotal = 0;

              scopedBookings.forEach(b => {
                if (!b.pickupDate) return;
                const d = new Date(b.pickupDate);
                if (Number.isNaN(d.getTime())) return;
                if (profitLossPeriodType === 'annual') {
                  if (d.getFullYear() !== year) return;
                } else {
                  if (d.getFullYear() !== year || d.getMonth() !== monthIndex) return;
                }
                revenue += Number(b.totalAmount || 0);
                commissionTotal += Number(b.commissionAmount || 0);
              });

              scopedExpenses.forEach(exp => {
                if (!exp.date) return;
                const d = new Date(exp.date);
                if (Number.isNaN(d.getTime())) return;
                if (profitLossPeriodType === 'annual') {
                  if (d.getFullYear() !== year) return;
                } else {
                  if (d.getFullYear() !== year || d.getMonth() !== monthIndex) return;
                }
                expensesTotal += Number(exp.amount || 0);
              });

              const profit = revenue - expensesTotal;
              const netAfterCommission = profit - commissionTotal;
              const periodLabel = profitLossPeriodType === 'annual'
                ? `${year}`
                : new Date(year, monthIndex, 1).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });

              const handleSaveReport = () => {
                const vehicleLabel = selectedCarId
                  ? (() => {
                      const car = Array.isArray(cars)
                        ? cars.find(c => String(c._id) === String(selectedCarId))
                        : null;
                      return (car?.vehicleName || `${car?.brand || ''} ${car?.model || ''}`.trim() || 'Vehicle').replace(/,/g, ' ');
                    })()
                  : 'All vehicles';
                const now = new Date();
                const entry = {
                  id: `${profitLossPeriodType}-${year}-${profitLossPeriodType === 'annual' ? 'all' : monthIndex}-${selectedCarId || 'all'}-${now.getTime()}`,
                  periodType: profitLossPeriodType,
                  year,
                  monthIndex: profitLossPeriodType === 'annual' ? null : monthIndex,
                  periodLabel,
                  vehicleScope: vehicleLabel,
                  selectedCarId: selectedCarId || '',
                  revenue,
                  expenses: expensesTotal,
                  profit,
                  commissionTotal,
                  netAfterCommission,
                  createdAt: now.toISOString(),
                };
                setSavedProfitLossReports(prev => [entry, ...prev]);
                toast.success('Profit & loss report saved');
              };

              return (
                <>
                  <div className="flex flex-wrap items-end gap-3 mb-4 text-xs">
                    <div>
                      <label className="block mb-1 text-[11px] text-gray-600">Period type</label>
                      <select
                        className="px-2 py-1.5 border border-[#d4c4b0] rounded-lg bg-white"
                        value={profitLossPeriodType}
                        onChange={e => setProfitLossPeriodType(e.target.value)}
                      >
                        <option value="monthly">Monthly</option>
                        <option value="annual">Annual</option>
                      </select>
                    </div>
                    <div>
                      <label className="block mb-1 text-[11px] text-gray-600">Year</label>
                      <input
                        type="number"
                        className="w-24 px-2 py-1.5 border border-[#d4c4b0] rounded-lg"
                        value={profitLossYear}
                        onChange={e => setProfitLossYear(e.target.value)}
                      />
                    </div>
                    {profitLossPeriodType === 'monthly' && (
                    <div>
                      <label className="block mb-1 text-[11px] text-gray-600">Month</label>
                      <select
                        className="px-2 py-1.5 border border-[#d4c4b0] rounded-lg bg-white"
                        value={profitLossMonth}
                        onChange={e => setProfitLossMonth(Number(e.target.value))}
                      >
                        {Array.from({ length: 12 }).map((_, idx) => (
                          <option key={idx} value={idx}>{new Date(2000, idx, 1).toLocaleDateString(undefined, { month: 'long' })}</option>
                        ))}
                      </select>
                    </div>
                    )}
                    <div className="ml-auto flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSaveReport}
                        className="inline-flex items-center px-3 py-1.5 rounded-lg bg-[#a06b42] hover:bg-[#8f5a32] text-white text-xs font-medium"
                      >
                        Save this report
                      </button>
                      <button
                        type="button"
                        onClick={() => window.print()}
                        className="inline-flex items-center px-3 py-1.5 rounded-lg border border-[#d4c4b0] text-[#4b2a00] text-xs font-medium hover:bg-[#f5ebe0]"
                      >
                        Print
                      </button>
                    </div>
                  </div>

                  <div className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                    <div className="rounded-2xl bg-white shadow-sm border border-gray-100 px-3 py-2.5">
                      <div className="text-[11px] text-gray-500">Period</div>
                      <div className="text-sm font-semibold text-gray-900">{periodLabel}</div>
                    </div>
                    <div className="rounded-2xl bg-white shadow-sm border border-gray-100 px-3 py-2.5">
                      <div className="text-[11px] text-gray-500">Revenue</div>
                      <div className="text-sm font-semibold text-emerald-700">
                        {formatCurrencyRWF
                          ? formatCurrencyRWF(revenue)
                          : `RWF ${Number(revenue || 0).toLocaleString()}`}
                      </div>
                    </div>
                    <div className="rounded-2xl bg-white shadow-sm border border-gray-100 px-3 py-2.5">
                      <div className="text-[11px] text-gray-500">Expenses</div>
                      <div className="text-sm font-semibold text-red-700">
                        {formatCurrencyRWF
                          ? formatCurrencyRWF(expensesTotal)
                          : `RWF ${Number(expensesTotal || 0).toLocaleString()}`}
                      </div>
                    </div>
                    <div className="rounded-2xl bg-white shadow-sm border border-gray-100 px-3 py-2.5">
                      <div className="text-[11px] text-gray-500">Commission</div>
                      <div className="text-sm font-semibold text-amber-700">
                        {formatCurrencyRWF
                          ? formatCurrencyRWF(commissionTotal)
                          : `RWF ${Number(commissionTotal || 0).toLocaleString()}`}
                      </div>
                    </div>
                  </div>

                  <div className="mb-6 rounded-2xl bg-white shadow-sm border border-gray-100 px-3 py-2.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-[11px] text-gray-500">Net profit</div>
                        <div className={`text-base font-semibold ${profit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                          {formatCurrencyRWF
                            ? formatCurrencyRWF(profit)
                            : `RWF ${Number(profit || 0).toLocaleString()}`}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[11px] text-gray-500">Net after commission</div>
                        <div className={`text-base font-semibold ${netAfterCommission >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                          {formatCurrencyRWF
                            ? formatCurrencyRWF(netAfterCommission)
                            : `RWF ${Number(netAfterCommission || 0).toLocaleString()}`}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 border-t border-[#f1e4d4] pt-4">
                    <h4 className="text-xs font-semibold text-[#4b2a00] mb-2">Saved profit &amp; loss reports</h4>
                    {(!Array.isArray(savedProfitLossReports) || savedProfitLossReports.length === 0) ? (
                      <div className="text-[11px] text-gray-600">
                        You have not saved any P&amp;L reports yet. Use the <span className="font-semibold">Save this report</span> button
                        to keep a snapshot that you can compare later.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        {(() => {
                          const rows = Array.isArray(savedProfitLossReports) ? savedProfitLossReports : [];
                          const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
                          const safePage = Math.min(pageProfitLossSaved, totalPages);
                          const start = (safePage - 1) * PAGE_SIZE;
                          const end = start + PAGE_SIZE;
                          const pageRows = rows.slice(start, end);
                          return (
                            <>
                              <table className="min-w-full text-[11px]">
                          <thead className="bg-[#f5ebe0] text-gray-700 uppercase tracking-wide">
                            <tr>
                              <th className="px-3 py-2 text-left">Period</th>
                              <th className="px-3 py-2 text-left">Type</th>
                              <th className="px-3 py-2 text-left">Vehicle scope</th>
                              <th className="px-3 py-2 text-right">Revenue</th>
                              <th className="px-3 py-2 text-right">Expenses</th>
                              <th className="px-3 py-2 text-right">Commission</th>
                              <th className="px-3 py-2 text-right">Net after commission</th>
                              <th className="px-3 py-2 text-right">Saved on</th>
                              <th className="px-3 py-2 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#f1e4d4] bg-white">
                            {pageRows.map(r => {
                              const created = r.createdAt ? new Date(r.createdAt) : null;
                              return (
                                <tr key={r.id} className="hover:bg-[#fdf7ee]">
                                  <td className="px-3 py-2 text-gray-800">{r.periodLabel}</td>
                                  <td className="px-3 py-2 text-gray-700 capitalize">{r.periodType}</td>
                                  <td className="px-3 py-2 text-gray-700">{r.vehicleScope || 'All vehicles'}</td>
                                  <td className="px-3 py-2 text-right text-gray-900 font-semibold">
                                    {formatCurrencyRWF
                                      ? formatCurrencyRWF(r.revenue || 0)
                                      : `RWF ${Number(r.revenue || 0).toLocaleString()}`}
                                  </td>
                                  <td className="px-3 py-2 text-right text-gray-900 font-semibold">
                                    {formatCurrencyRWF
                                      ? formatCurrencyRWF(r.expenses || 0)
                                      : `RWF ${Number(r.expenses || 0).toLocaleString()}`}
                                  </td>
                                  <td className="px-3 py-2 text-right text-gray-900 font-semibold">
                                    {formatCurrencyRWF
                                      ? formatCurrencyRWF(r.commissionTotal || 0)
                                      : `RWF ${Number(r.commissionTotal || 0).toLocaleString()}`}
                                  </td>
                                  <td
                                    className={`px-3 py-2 text-right font-semibold ${Number((r.netAfterCommission ?? r.profit) || 0) >= 0 ? 'text-emerald-700' : 'text-red-700'}`}
                                  >
                                    {formatCurrencyRWF
                                      ? formatCurrencyRWF((r.netAfterCommission ?? r.profit) || 0)
                                      : `RWF ${Number((r.netAfterCommission ?? r.profit) || 0).toLocaleString()}`}
                                  </td>
                                  <td className="px-3 py-2 text-right text-gray-700">
                                    {created ? created.toLocaleDateString() : ''}
                                  </td>
                                  <td className="px-3 py-2 text-right">
                                    <button
                                      type="button"
                                      onClick={() => setSavedProfitLossReports(list => list.filter(x => x.id !== r.id))}
                                      className="inline-flex items-center px-2 py-0.5 rounded border border-red-200 text-[10px] text-red-700 hover:bg-red-50"
                                    >
                                      Delete
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                              <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-[11px] text-gray-600">
                                <div>
                                  Page {safePage} of {totalPages}
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setPageProfitLossSaved(p => Math.max(1, p - 1))}
                                    disabled={safePage <= 1}
                                    className="px-2 py-0.5 border border-[#d4c4b0] rounded disabled:opacity-50"
                                  >
                                    Previous
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setPageProfitLossSaved(p => Math.min(totalPages, p + 1))}
                                    disabled={safePage >= totalPages}
                                    className="px-2 py-0.5 border border-[#d4c4b0] rounded disabled:opacity-50"
                                  >
                                    Next
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (!window.confirm('Clear all saved profit & loss reports?')) return;
                                      setSavedProfitLossReports([]);
                                    }}
                                    className="px-2 py-0.5 border border-red-200 text-red-700 rounded hover:bg-red-50"
                                  >
                                    Clear all
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      try {
                                        const rowsForCsv = rows && rows.length ? rows : [];
                                        if (!rowsForCsv.length) {
                                          toast.error('No saved reports to export');
                                          return;
                                        }
                                        const header = ['period','type','vehicleScope','revenue','expenses','commission','netAfterCommission','savedOn'];
                                        const lines = [header.join(',')];
                                        rowsForCsv.forEach(r => {
                                          const createdDate = r.createdAt ? new Date(r.createdAt) : null;
                                          const savedOn = createdDate ? createdDate.toISOString() : '';
                                          const line = [
                                            JSON.stringify(r.periodLabel || ''),
                                            JSON.stringify(r.periodType || ''),
                                            JSON.stringify(r.vehicleScope || 'All vehicles'),
                                            String(r.revenue || 0),
                                            String(r.expenses || 0),
                                            String(r.commissionTotal || 0),
                                            String((r.netAfterCommission ?? r.profit) || 0),
                                            JSON.stringify(savedOn),
                                          ].join(',');
                                          lines.push(line);
                                        });
                                        const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
                                        const url = URL.createObjectURL(blob);
                                        const a = document.createElement('a');
                                        a.href = url;
                                        a.download = 'car-profit-loss-reports.csv';
                                        document.body.appendChild(a);
                                        a.click();
                                        document.body.removeChild(a);
                                        URL.revokeObjectURL(url);
                                      } catch (err) {
                                        console.error('Export P&L CSV failed', err);
                                        toast.error('Failed to export reports');
                                      }
                                    }}
                                    className="px-2 py-0.5 border border-[#d4c4b0] text-[#4b2a00] rounded hover:bg-[#f5ebe0]"
                                  >
                                    Export CSV
                                  </button>
                                </div>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
          )}

          {financeMode === 'expenses-add' && (
          <div className="mb-4 rounded-2xl bg-white border border-[#e0d5c7] px-4 py-4 text-xs text-gray-700 shadow-sm">
            <h3 className="text-sm font-semibold text-[#4b2a00] mb-2">Add expense</h3>
            <form onSubmit={createExpense} className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <div>
                <label className="block mb-1 text-[11px] text-gray-600">Vehicle *</label>
                <select
                  className="w-full px-2 py-1.5 border border-[#d4c4b0] rounded-lg bg-white"
                  value={expenseForm.carId}
                  onChange={e => setExpenseForm(f => ({ ...f, carId: e.target.value }))}
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
                  value={expenseForm.date}
                  onChange={e => setExpenseForm(f => ({ ...f, date: e.target.value }))}
                />
              </div>
              <div>
                <label className="block mb-1 text-[11px] text-gray-600">Amount (RWF) *</label>
                <input
                  type="number"
                  className="w-full px-2 py-1.5 border border-[#d4c4b0] rounded-lg"
                  value={expenseForm.amount}
                  onChange={e => setExpenseForm(f => ({ ...f, amount: e.target.value }))}
                />
              </div>
              <div>
                <label className="block mb-1 text-[11px] text-gray-600">Category</label>
                <input
                  className="w-full px-2 py-1.5 border border-[#d4c4b0] rounded-lg"
                  placeholder="e.g. fuel, maintenance"
                  value={expenseForm.category}
                  onChange={e => setExpenseForm(f => ({ ...f, category: e.target.value }))}
                />
              </div>
              <div>
                <label className="block mb-1 text-[11px] text-gray-600">Note</label>
                <input
                  className="w-full px-2 py-1.5 border border-[#d4c4b0] rounded-lg"
                  placeholder="Optional description"
                  value={expenseForm.note}
                  onChange={e => setExpenseForm(f => ({ ...f, note: e.target.value }))}
                />
              </div>
              <div className="md:col-span-5 flex justify-end mt-1">
                <button
                  type="submit"
                  disabled={expenseSaving}
                  className="inline-flex items-center px-3 py-1.5 rounded-lg bg-[#a06b42] hover:bg-[#8f5a32] text-white text-xs font-medium disabled:opacity-60"
                >
                  {expenseSaving ? 'Saving...' : 'Save expense'}
                </button>
              </div>
            </form>
          </div>
          )}

          {financeMode === 'expenses-categories' && (
          <div className="mb-4 rounded-2xl bg-white border border-[#e0d5c7] px-4 py-4 text-sm text-gray-700 shadow-sm">
            <h3 className="text-sm font-semibold text-[#4b2a00] mb-1">Expense categories</h3>
            <p className="text-xs text-gray-600 mb-3">
              Overview of the categories used in your vehicle expenses, with total amounts for each.
            </p>

            {(!Array.isArray(carExpenses) || carExpenses.length === 0) ? (
              <div className="py-2 text-[11px] text-gray-600">
                No expenses recorded yet. Once you start logging fuel, maintenance and other costs, they will
                appear here grouped by category.
              </div>
            ) : (
              <div className="overflow-x-auto">
                {(() => {
                  const map = new Map();
                  carExpenses.forEach(exp => {
                    const key = String(exp.category || 'general');
                    const prev = map.get(key) || { count: 0, total: 0 };
                    map.set(key, {
                      count: prev.count + 1,
                      total: prev.total + Number(exp.amount || 0),
                    });
                  });
                  const entries = Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
                  const totalPages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));
                  const safePage = Math.min(pageExpenseCategories, totalPages);
                  const start = (safePage - 1) * PAGE_SIZE;
                  const end = start + PAGE_SIZE;
                  const pageEntries = entries.slice(start, end);
                  return (
                    <>
                      <table className="min-w-full text-[11px]">
                  <thead className="bg-[#f5ebe0] text-gray-700 uppercase tracking-wide">
                    <tr>
                      <th className="px-3 py-2 text-left">Category</th>
                      <th className="px-3 py-2 text-right">Number of expenses</th>
                      <th className="px-3 py-2 text-right">Total amount (RWF)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f1e4d4] bg-white">
                    {pageEntries.map(([cat, info]) => (
                        <tr key={cat} className="hover:bg-[#fdf7ee]">
                          <td className="px-3 py-2 text-gray-800 capitalize">{cat}</td>
                          <td className="px-3 py-2 text-right text-gray-700">{info.count}</td>
                          <td className="px-3 py-2 text-right font-semibold text-gray-900">
                            {formatCurrencyRWF
                              ? formatCurrencyRWF(info.total)
                              : `RWF ${Number(info.total || 0).toLocaleString()}`}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                      <div className="flex items-center justify-between px-3 py-2 text-[11px] text-gray-600">
                        <div>
                          Page {safePage} of {totalPages}
                        </div>
                        <div className="space-x-2">
                          <button
                            type="button"
                            onClick={() => setPageExpenseCategories(p => Math.max(1, p - 1))}
                            disabled={safePage <= 1}
                            className="px-2 py-0.5 border border-[#d4c4b0] rounded disabled:opacity-50"
                          >
                            Previous
                          </button>
                          <button
                            type="button"
                            onClick={() => setPageExpenseCategories(p => Math.min(totalPages, p + 1))}
                            disabled={safePage >= totalPages}
                            className="px-2 py-0.5 border border-[#d4c4b0] rounded disabled:opacity-50"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </div>
          )}

          {financeMode === 'expenses-reports' && (
          <div className="mb-4 rounded-2xl bg-white border border-[#e0d5c7] px-4 py-4 text-sm text-gray-700 shadow-sm">
            <h3 className="text-sm font-semibold text-[#4b2a00] mb-1">Expense reports</h3>
            <p className="text-xs text-gray-600 mb-3">
              Breakdown of expenses by vehicle and recent period based on your recorded expense data.
            </p>

            {(!Array.isArray(carExpenses) || carExpenses.length === 0) ? (
              <div className="py-2 text-[11px] text-gray-600">
                No expenses recorded yet for your vehicles, so there is nothing to report.
              </div>
            ) : (
              <>
                <div className="mb-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  {(() => {
                    const now = new Date();
                    const start30 = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
                    const startYtd = new Date(now.getFullYear(), 0, 1);

                    let totalAll = 0;
                    let total30 = 0;
                    let totalYtd = 0;

                    carExpenses.forEach(exp => {
                      const amt = Number(exp.amount || 0);
                      totalAll += amt;
                      const d = exp.date ? new Date(exp.date) : null;
                      if (!d) return;
                      if (d >= start30) total30 += amt;
                      if (d >= startYtd) totalYtd += amt;
                    });

                    return (
                      <>
                        <div className="rounded-2xl bg-white shadow-sm border border-gray-100 px-3 py-2.5">
                          <div className="text-[11px] text-gray-500">Total expenses (all time)</div>
                          <div className="text-sm font-semibold text-gray-900">
                            {formatCurrencyRWF
                              ? formatCurrencyRWF(totalAll)
                              : `RWF ${Number(totalAll || 0).toLocaleString()}`}
                          </div>
                        </div>
                        <div className="rounded-2xl bg-white shadow-sm border border-gray-100 px-3 py-2.5">
                          <div className="text-[11px] text-gray-500">Last 30 days expenses</div>
                          <div className="text-sm font-semibold text-gray-900">
                            {formatCurrencyRWF
                              ? formatCurrencyRWF(total30)
                              : `RWF ${Number(total30 || 0).toLocaleString()}`}
                          </div>
                        </div>
                        <div className="rounded-2xl bg-white shadow-sm border border-gray-100 px-3 py-2.5">
                          <div className="text-[11px] text-gray-500">Year-to-date expenses</div>
                          <div className="text-sm font-semibold text-gray-900">
                            {formatCurrencyRWF
                              ? formatCurrencyRWF(totalYtd)
                              : `RWF ${Number(totalYtd || 0).toLocaleString()}`}
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>

                <div className="overflow-x-auto mt-2">
                  {(() => {
                    const map = new Map();
                    carExpenses.forEach(exp => {
                      const vehicleLabel = (exp.car?.vehicleName || `${exp.car?.brand || ''} ${exp.car?.model || ''}`.trim() || 'Vehicle').replace(/,/g, ' ');
                      const cat = String(exp.category || 'general');
                      const key = `${vehicleLabel}__${cat}`;
                      const prev = map.get(key) || { vehicleLabel, category: cat, count: 0, total: 0 };
                      map.set(key, {
                        vehicleLabel,
                        category: cat,
                        count: prev.count + 1,
                        total: prev.total + Number(exp.amount || 0),
                      });
                    });
                    const rows = Array.from(map.values()).sort((a, b) => {
                      const v = a.vehicleLabel.localeCompare(b.vehicleLabel);
                      if (v !== 0) return v;
                      return a.category.localeCompare(b.category);
                    });
                    const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
                    const safePage = Math.min(pageExpenseReports, totalPages);
                    const start = (safePage - 1) * PAGE_SIZE;
                    const end = start + PAGE_SIZE;
                    const pageRows = rows.slice(start, end);
                    return (
                      <>
                        <table className="min-w-full text-[11px]">
                    <thead className="bg-[#f5ebe0] text-gray-700 uppercase tracking-wide">
                      <tr>
                        <th className="px-3 py-2 text-left">Vehicle</th>
                        <th className="px-3 py-2 text-left">Category</th>
                        <th className="px-3 py-2 text-right">Number of expenses</th>
                        <th className="px-3 py-2 text-right">Total amount (RWF)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f1e4d4] bg-white">
                      {pageRows.map(row => (
                          <tr key={`${row.vehicleLabel}__${row.category}`} className="hover:bg-[#fdf7ee]">
                            <td className="px-3 py-2 text-gray-800">{row.vehicleLabel}</td>
                            <td className="px-3 py-2 text-gray-700 capitalize">{row.category}</td>
                            <td className="px-3 py-2 text-right text-gray-700">{row.count}</td>
                            <td className="px-3 py-2 text-right font-semibold text-gray-900">
                              {formatCurrencyRWF
                                ? formatCurrencyRWF(row.total)
                                : `RWF ${Number(row.total || 0).toLocaleString()}`}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                        <div className="flex items-center justify-between px-3 py-2 text-[11px] text-gray-600">
                          <div>
                            Page {safePage} of {totalPages}
                          </div>
                          <div className="space-x-2">
                            <button
                              type="button"
                              onClick={() => setPageExpenseReports(p => Math.max(1, p - 1))}
                              disabled={safePage <= 1}
                              className="px-2 py-0.5 border border-[#d4c4b0] rounded disabled:opacity-50"
                            >
                              Previous
                            </button>
                            <button
                              type="button"
                              onClick={() => setPageExpenseReports(p => Math.min(totalPages, p + 1))}
                              disabled={safePage >= totalPages}
                              className="px-2 py-0.5 border border-[#d4c4b0] rounded disabled:opacity-50"
                            >
                              Next
                            </button>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </>
            )}
          </div>
          )}

          {financeMode === 'distance-log' && (
          <div className="mb-4 rounded-2xl bg-white border border-[#e0d5c7] px-4 py-4 text-sm text-gray-700 shadow-sm">
            <h3 className="text-sm font-semibold text-[#4b2a00] mb-1">Distance & earnings log</h3>
            <p className="text-xs text-gray-600 mb-2">
              A combined log of distance travelled and earnings per trip will be shown here in the future.
              This panel is currently a placeholder linked from the Trips & routes menu.
            </p>
          </div>
          )}

          {financeMode === 'income-all' && (
          <div className="mb-4 rounded-2xl bg-white border border-[#e0d5c7] px-4 py-4 text-sm text-gray-700 shadow-sm">
            <h3 className="text-sm font-semibold text-[#4b2a00] mb-1">All income</h3>
            <p className="text-xs text-gray-600 mb-2">
              A detailed income ledger (payments received, pending and refunded) will be implemented here.
            </p>
          </div>
          )}

          {financeMode === 'income-add' && (
          <div className="mb-4 rounded-2xl bg-white border border-[#e0d5c7] px-4 py-4 text-sm text-gray-700 shadow-sm">
            <h3 className="text-sm font-semibold text-[#4b2a00] mb-1">Add income</h3>
            <p className="text-xs text-gray-600 mb-2">
              A form for manually recording income entries (e.g. offline payments) will be added here. For
              now it serves as a distinct destination for the "Add income" link.
            </p>
          </div>
          )}

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
                {(() => {
                  const rows = Array.isArray(financeBookingsTable) ? financeBookingsTable : [];
                  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
                  const safePage = Math.min(pageRevenueSummary, totalPages);
                  const start = (safePage - 1) * PAGE_SIZE;
                  const end = start + PAGE_SIZE;
                  const pageRows = rows.slice(start, end);
                  return (
                    <>
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
                    {pageRows.map(b => {
                      const vehicleLabel = (b.car?.vehicleName || `${b.car?.brand || ''} ${b.car?.model || ''}`.trim() || 'Vehicle').replace(/,/g, ' ');
                      const pickup = b.pickupDate ? new Date(b.pickupDate) : null;
                      const ret = b.returnDate ? new Date(b.returnDate) : null;
                      const status = String(b.status || '').toLowerCase();
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
        {view === 'analytics'
        && analyticsSection !== 'fuel-logs'
        && analyticsSection !== 'fuel-add'
        && analyticsSection !== 'fuel-report'
        && analyticsSection !== 'fuel-cost'
        && (
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
        {view === 'analytics'
        && (analyticsSection === 'fuel-logs'
          || analyticsSection === 'fuel-add'
          || analyticsSection === 'fuel-report'
          || analyticsSection === 'fuel-cost') && (
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

          {/* Add fuel record panel (fuel-add) */}
          {analyticsSection === 'fuel-add' && (
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
          )}

          {/* Fuel logs panel (fuel-logs) */}
          {analyticsSection === 'fuel-logs' && (
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
          )}

          {/* Fuel consumption report (fuel-report) */}
          {analyticsSection === 'fuel-report' && (
          <div className="mt-4 rounded-2xl bg-white shadow-sm border border-[#e0d5c7] px-4 py-4 text-sm text-gray-700">
            <h3 className="text-sm font-semibold text-[#4b2a00] mb-2">Fuel consumption report</h3>
            <p className="text-xs text-gray-600 mb-2">
              Detailed charts and per-vehicle consumption breakdown will be implemented here. For now you
              can use the summary cards above and fuel logs to understand usage.
            </p>
          </div>
          )}

          {/* Fuel cost analysis (fuel-cost) */}
          {analyticsSection === 'fuel-cost' && (
          <div className="mt-4 rounded-2xl bg-white shadow-sm border border-[#e0d5c7] px-4 py-4 text-sm text-gray-700">
            <h3 className="text-sm font-semibold text-[#4b2a00] mb-2">Fuel cost analysis</h3>
            <p className="text-xs text-gray-600 mb-2">
              Cost per kilometer, per vehicle and per period will be implemented here. Currently the
              summary cards above show total cost for the selected filters.
            </p>
          </div>
          )}
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
                  const allowedTypes = new Set([
                    'booking_created',
                    'booking_paid',
                    'booking_confirmed',
                    'booking_status_updated',
                    'booking_cancelled',
                    'commission_due',
                    'commission_paid',
                    'account_blocked',
                    'account_reactivated',
                    'fine_added',
                    'new_message',
                    'commission_level_changed',
                    'property_locked',
                    'property_unlocked',
                    'vehicle_locked',
                    'vehicle_unlocked',
                  ]);

                  const filtered = ownerNotifications.filter(n => {
                    const t = String(n.type || 'other');
                    // Only show host/vehicle-relevant notifications
                    if (!allowedTypes.has(t)) return false;
                    if (ownerNotifShowUnreadOnly && n.isRead) return false;
                    if (ownerNotifTypeFilter !== 'all' && t !== ownerNotifTypeFilter) return false;
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

        {view === 'clients' && (
        <div className="mb-6 rounded-2xl bg-white border border-[#e0d5c7] px-4 py-4 text-sm text-gray-700 shadow-sm">
          <h2 className="text-lg font-semibold mb-1 text-[#4b2a00]">
            {clientsContractsMode === 'add' ? 'Add client' : 'Clients'}
          </h2>

          {clientsContractsMode === 'add' ? (
            <form onSubmit={saveClient} className="mt-2 space-y-3 max-w-xl text-xs">
              <p className="text-[11px] text-gray-600">
                Save repeat clients here to quickly reuse their details when creating direct bookings or contracts.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                <div>
                  <label className="block text-[11px] font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    className="w-full px-3 py-2 border border-[#d4c4b0] rounded-lg text-xs"
                    value={clientForm.name}
                    onChange={e => setClientForm(f => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-700 mb-1">Type</label>
                  <select
                    className="w-full px-3 py-2 border border-[#d4c4b0] rounded-lg text-xs bg-white"
                    value={clientForm.type}
                    onChange={e => setClientForm(f => ({ ...f, type: e.target.value }))}
                  >
                    <option value="individual">Individual</option>
                    <option value="company">Company</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    className="w-full px-3 py-2 border border-[#d4c4b0] rounded-lg text-xs"
                    value={clientForm.email}
                    onChange={e => setClientForm(f => ({ ...f, email: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    className="w-full px-3 py-2 border border-[#d4c4b0] rounded-lg text-xs"
                    value={clientForm.phone}
                    onChange={e => setClientForm(f => ({ ...f, phone: e.target.value }))}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[11px] font-medium text-gray-700 mb-1">Company name (for corporate clients)</label>
                  <input
                    className="w-full px-3 py-2 border border-[#d4c4b0] rounded-lg text-xs"
                    value={clientForm.companyName}
                    onChange={e => setClientForm(f => ({ ...f, companyName: e.target.value }))}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[11px] font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    rows={2}
                    className="w-full px-3 py-2 border border-[#d4c4b0] rounded-lg text-xs resize-none"
                    value={clientForm.notes}
                    onChange={e => setClientForm(f => ({ ...f, notes: e.target.value }))}
                  />
                </div>
              </div>
              <div className="pt-1 flex justify-end">
                <button
                  type="submit"
                  disabled={carClientsSaving}
                  className="inline-flex items-center px-4 py-1.5 rounded-lg bg-[#a06b42] hover:bg-[#8f5a32] text-white text-xs font-medium disabled:opacity-60"
                >
                  {carClientsSaving ? 'Saving...' : 'Save client'}
                </button>
              </div>
            </form>
          ) : (
            <>
              <p className="text-xs text-gray-600 mb-3">
                These clients are stored in your account and can be linked to contracts and direct bookings.
              </p>

              {carClientsLoading ? (
                <div className="py-2 text-[11px] text-gray-600">Loading clients...</div>
              ) : (!Array.isArray(carClients) || carClients.length === 0) ? (
                <div className="py-2 text-[11px] text-gray-600">
                  You have not added any dedicated clients yet. Use the <span className="font-semibold">Add client</span>
                  {' '}mode to create your first record.
                </div>
              ) : (
                <div className="overflow-x-auto mt-2">
                  <table className="min-w-full text-[11px]">
                    <thead className="bg-[#f5ebe0] text-gray-700 uppercase tracking-wide">
                      <tr>
                        <th className="px-3 py-2 text-left">Client</th>
                        <th className="px-3 py-2 text-left">Type</th>
                        <th className="px-3 py-2 text-left">Contact</th>
                        <th className="px-3 py-2 text-left">Company</th>
                        <th className="px-3 py-2 text-right">Created</th>
                        <th className="px-3 py-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f1e4d4] bg-white">
                      {carClients.map(c => {
                        const created = c.createdAt ? new Date(c.createdAt) : null;
                        const handleEdit = () => {
                          const name = window.prompt('Client name', c.name || '');
                          if (name == null || !name.trim()) return;
                          const email = window.prompt('Email (optional)', c.email || '');
                          if (email == null) return;
                          const phone = window.prompt('Phone (optional)', c.phone || '');
                          if (phone == null) return;
                          updateClient(c._id, {
                            name: name.trim(),
                            email: email || undefined,
                            phone: phone || undefined,
                          });
                        };
                        return (
                          <tr key={c._id} className="hover:bg-[#fdf7ee]">
                            <td className="px-3 py-2 text-gray-800">
                              <div className="font-semibold text-[12px] truncate">{c.name}</div>
                            </td>
                            <td className="px-3 py-2 text-gray-700 capitalize">{c.type || 'individual'}</td>
                            <td className="px-3 py-2 text-gray-700">
                              <div className="text-[11px] truncate">{c.email || '—'}</div>
                              <div className="text-[11px] text-gray-500 truncate">{c.phone || ''}</div>
                            </td>
                            <td className="px-3 py-2 text-gray-700">
                              <div className="text-[11px] truncate">{c.companyName || '—'}</div>
                            </td>
                            <td className="px-3 py-2 text-right text-gray-700">
                              {created ? created.toLocaleDateString() : '—'}
                            </td>
                            <td className="px-3 py-2 text-right text-gray-700">
                              <button
                                type="button"
                                onClick={handleEdit}
                                className="inline-flex items-center px-2 py-0.5 mr-1 rounded border border-[#d4c4b0] text-[10px] text-[#4b2a00] hover:bg-[#f5ebe0]"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteClient(c._id)}
                                className="inline-flex items-center px-2 py-0.5 rounded border border-red-200 text-[10px] text-red-700 hover:bg-red-50"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      )}

        {view === 'contracts' && (
        <div className="mb-6 rounded-2xl bg-white border border-[#e0d5c7] px-4 py-4 text-sm text-gray-700 shadow-sm">
          <h2 className="text-lg font-semibold mb-1 text-[#4b2a00]">
            {clientsContractsMode === 'add'
              ? 'Add contract'
              : clientsContractsMode === 'reports'
                ? 'Contract reports'
                : 'Contracts'}
          </h2>

          {clientsContractsMode === 'add' && (
            <form onSubmit={saveContract} className="mt-2 space-y-3 max-w-xl text-xs">
              <p className="text-[11px] text-gray-600">
                Record long-term or corporate contracts linked to your vehicles and saved clients.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                <div>
                  <label className="block text-[11px] font-medium text-gray-700 mb-1">Client *</label>
                  <select
                    className="w-full px-3 py-2 border border-[#d4c4b0] rounded-lg text-xs bg-white"
                    value={contractForm.clientId}
                    onChange={e => setContractForm(f => ({ ...f, clientId: e.target.value }))}
                  >
                    <option value="">Select client</option>
                    {carClients.map(c => (
                      <option key={c._id} value={c._id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-700 mb-1">Vehicle</label>
                  <select
                    className="w-full px-3 py-2 border border-[#d4c4b0] rounded-lg text-xs bg-white"
                    value={contractForm.carId || selectedCarId || ''}
                    onChange={e => setContractForm(f => ({ ...f, carId: e.target.value }))}
                  >
                    <option value="">Optional vehicle</option>
                    {cars.map(c => (
                      <option key={c._id} value={c._id}>
                        {c.vehicleName || `${c.brand || ''} ${c.model || ''}`.trim() || 'Untitled vehicle'}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-700 mb-1">Start date *</label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border border-[#d4c4b0] rounded-lg text-xs"
                    value={contractForm.startDate}
                    onChange={e => setContractForm(f => ({ ...f, startDate: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-700 mb-1">End date *</label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border border-[#d4c4b0] rounded-lg text-xs"
                    value={contractForm.endDate}
                    onChange={e => setContractForm(f => ({ ...f, endDate: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-700 mb-1">Amount (RWF) *</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-[#d4c4b0] rounded-lg text-xs"
                    value={contractForm.amount}
                    onChange={e => setContractForm(f => ({ ...f, amount: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-700 mb-1">Status</label>
                  <select
                    className="w-full px-3 py-2 border border-[#d4c4b0] rounded-lg text-xs bg-white"
                    value={contractForm.status}
                    onChange={e => setContractForm(f => ({ ...f, status: e.target.value }))}
                  >
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[11px] font-medium text-gray-700 mb-1">File URL (optional)</label>
                  <input
                    className="w-full px-3 py-2 border border-[#d4c4b0] rounded-lg text-xs"
                    value={contractForm.fileUrl}
                    onChange={e => setContractForm(f => ({ ...f, fileUrl: e.target.value }))}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[11px] font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    rows={2}
                    className="w-full px-3 py-2 border border-[#d4c4b0] rounded-lg text-xs resize-none"
                    value={contractForm.notes}
                    onChange={e => setContractForm(f => ({ ...f, notes: e.target.value }))}
                  />
                </div>
              </div>
              <div className="pt-1 flex justify-end">
                <button
                  type="submit"
                  disabled={carContractsSaving}
                  className="inline-flex items-center px-4 py-1.5 rounded-lg bg-[#a06b42] hover:bg-[#8f5a32] text-white text-xs font-medium disabled:opacity-60"
                >
                  {carContractsSaving ? 'Saving...' : 'Save contract'}
                </button>
              </div>
            </form>
          )}

          {clientsContractsMode === 'reports' && (
            <div className="mt-4 text-xs">
              <p className="text-[11px] text-gray-600 mb-3">
                High-level summary of your contracts by status and total amount.
              </p>
              {contractSummaryLoading ? (
                <div className="text-[11px] text-gray-600">Loading contract summary...</div>
              ) : !contractSummary ? (
                <div className="text-[11px] text-gray-600">No contract summary is available yet.</div>
              ) : (
                <>
                  <div className="mb-3 grid grid-cols-2 md:grid-cols-4 gap-2">
                    <div className="rounded-xl border border-[#e0d5c7] bg-[#fdf7ee] px-3 py-2">
                      <div className="text-[10px] text-gray-500">Total contracts</div>
                      <div className="text-sm font-semibold text-gray-900">{contractSummary.totalContracts || 0}</div>
                    </div>
                    <div className="rounded-xl border border-[#e0d5c7] bg-[#fdf7ee] px-3 py-2">
                      <div className="text-[10px] text-gray-500">Total amount</div>
                      <div className="text-sm font-semibold text-gray-900">
                        {formatCurrencyRWF
                          ? formatCurrencyRWF(contractSummary.totalAmount || 0)
                          : `RWF ${Number(contractSummary.totalAmount || 0).toLocaleString()}`}
                      </div>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-[11px]">
                      <thead className="bg-[#f5ebe0] text-gray-700 uppercase tracking-wide">
                        <tr>
                          <th className="px-3 py-2 text-left">Status</th>
                          <th className="px-3 py-2 text-right">Contracts</th>
                          <th className="px-3 py-2 text-right">Total amount (RWF)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#f1e4d4] bg-white">
                        {Object.entries(contractSummary.byStatus || {}).map(([statusKey, row]) => (
                          <tr key={statusKey} className="hover:bg-[#fdf7ee]">
                            <td className="px-3 py-2 capitalize text-gray-800">{statusKey}</td>
                            <td className="px-3 py-2 text-right text-gray-700">{row.count || 0}</td>
                            <td className="px-3 py-2 text-right text-gray-900 font-semibold">
                              {formatCurrencyRWF
                                ? formatCurrencyRWF(row.totalAmount || 0)
                                : `RWF ${Number(row.totalAmount || 0).toLocaleString()}`}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}

          {clientsContractsMode === 'list' && (
            <div className="mt-4">
              <p className="text-[11px] text-gray-600 mb-3">
                List of your saved contracts. Newest contracts appear first.
              </p>
              {carContractsLoading ? (
                <div className="text-[11px] text-gray-600">Loading contracts...</div>
              ) : (!Array.isArray(carContracts) || carContracts.length === 0) ? (
                <div className="text-[11px] text-gray-600">
                  You have not recorded any contracts yet. Use the <span className="font-semibold">Add contract</span> mode
                  to create your first one.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-[11px]">
                    <thead className="bg-[#f5ebe0] text-gray-700 uppercase tracking-wide">
                      <tr>
                        <th className="px-3 py-2 text-left">Client</th>
                        <th className="px-3 py-2 text-left">Vehicle</th>
                        <th className="px-3 py-2 text-left">Period</th>
                        <th className="px-3 py-2 text-right">Amount (RWF)</th>
                        <th className="px-3 py-2 text-right">Status</th>
                        <th className="px-3 py-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f1e4d4] bg-white">
                      {carContracts.map(ct => {
                        const start = ct.startDate ? new Date(ct.startDate) : null;
                        const end = ct.endDate ? new Date(ct.endDate) : null;
                        const amount = Number(ct.amount || 0);
                        const handleEdit = () => {
                          const status = window.prompt('Status (draft, active, completed, cancelled)', ct.status || 'draft');
                          if (status == null || !status.trim()) return;
                          const amountStr = window.prompt('Amount (RWF)', String(ct.amount || ''));
                          if (amountStr == null) return;
                          const nextAmount = Number(amountStr);
                          if (!Number.isFinite(nextAmount) || nextAmount <= 0) {
                            toast.error('Enter a valid amount');
                            return;
                          }
                          updateContract(ct._id, {
                            status: status.trim(),
                            amount: nextAmount,
                          });
                        };
                        return (
                          <tr key={ct._id} className="hover:bg-[#fdf7ee]">
                            <td className="px-3 py-2 text-gray-800">
                              <div className="font-semibold text-[12px] truncate">{ct.client?.name || 'Client'}</div>
                              <div className="text-[10px] text-gray-500 truncate">{ct.client?.email || ''}</div>
                            </td>
                            <td className="px-3 py-2 text-gray-700">
                              <div className="text-[11px] truncate">
                                {ct.car
                                  ? (ct.car.vehicleName || `${ct.car.brand || ''} ${ct.car.model || ''}`.trim() || 'Vehicle')
                                  : '—'}
                              </div>
                            </td>
                            <td className="px-3 py-2 text-gray-700">
                              <div className="text-[11px]">
                                {start ? start.toLocaleDateString() : '—'} - {end ? end.toLocaleDateString() : '—'}
                              </div>
                            </td>
                            <td className="px-3 py-2 text-right text-gray-900 font-semibold">
                              {formatCurrencyRWF
                                ? formatCurrencyRWF(amount)
                                : `RWF ${amount.toLocaleString()}`}
                            </td>
                            <td className="px-3 py-2 text-right text-gray-700 capitalize">{ct.status || 'draft'}</td>
                            <td className="px-3 py-2 text-right text-gray-700">
                              <button
                                type="button"
                                onClick={handleEdit}
                                className="inline-flex items-center px-2 py-0.5 mr-1 rounded border border-[#d4c4b0] text-[10px] text-[#4b2a00] hover:bg-[#f5ebe0]"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteContract(ct._id)}
                                className="inline-flex items-center px-2 py-0.5 rounded border border-red-200 text-[10px] text-red-700 hover:bg-red-50"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

        {view === 'vehicles' && vehiclesSection === 'insurance' && (
        <div className="mb-6 rounded-2xl bg-white border border-[#e0d5c7] px-4 py-4 text-sm text-gray-700 shadow-sm">
          <h2 className="text-lg font-semibold mb-2 text-[#4b2a00]">Insurance & registration</h2>
          <p className="text-xs text-gray-600 mb-4">
            Manage insurance policy and registration details for your vehicles.
          </p>

          <form onSubmit={saveInsurance} className="space-y-4 max-w-xl">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Vehicle *</label>
              <select
                className="w-full px-3 py-2 border border-[#d4c4b0] rounded-lg bg-white text-sm"
                value={selectedCarId || ''}
                onChange={e => setSelectedCarId(e.target.value)}
              >
                <option value="">Select vehicle</option>
                {cars.map(c => (
                  <option key={c._id} value={c._id}>
                    {c.vehicleName || `${c.brand || ''} ${c.model || ''}`.trim() || 'Untitled vehicle'}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Insurance provider</label>
                <input
                  className="w-full px-3 py-2 border border-[#d4c4b0] rounded-lg text-sm"
                  value={insuranceForm.insuranceProvider}
                  onChange={e => setInsuranceForm(f => ({ ...f, insuranceProvider: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Policy number</label>
                <input
                  className="w-full px-3 py-2 border border-[#d4c4b0] rounded-lg text-sm"
                  value={insuranceForm.insurancePolicyNumber}
                  onChange={e => setInsuranceForm(f => ({ ...f, insurancePolicyNumber: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Insurance expiry date</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-[#d4c4b0] rounded-lg text-sm"
                  value={insuranceForm.insuranceExpiryDate}
                  onChange={e => setInsuranceForm(f => ({ ...f, insuranceExpiryDate: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Registration number</label>
                <input
                  className="w-full px-3 py-2 border border-[#d4c4b0] rounded-lg text-sm"
                  value={insuranceForm.registrationNumber}
                  onChange={e => setInsuranceForm(f => ({ ...f, registrationNumber: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Registration expiry date</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-[#d4c4b0] rounded-lg text-sm"
                  value={insuranceForm.registrationExpiryDate}
                  onChange={e => setInsuranceForm(f => ({ ...f, registrationExpiryDate: e.target.value }))}
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={insuranceSaving || !selectedCarId}
                className="inline-flex items-center px-4 py-2 rounded-lg bg-[#a06b42] hover:bg-[#8f5a32] text-white text-xs font-medium disabled:opacity-60"
              >
                {insuranceSaving ? 'Saving...' : 'Save insurance details'}
              </button>
            </div>
          </form>
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

                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                    <label className="text-sm">Upload Images:</label>
                    <input type="file" multiple disabled={uploadingId === car._id} onChange={e => uploadImages(car._id, e.target.files)} />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedVehicle(car);
                        setShowUpgradeModal(true);
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-[#a06b42] hover:bg-[#8f5a32] rounded text-sm transition-colors"
                      title="Upgrade commission level"
                    >
                      <FaCrown className="w-3 h-3" />
                      Upgrade Commission
                    </button>
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
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedVehicle(car);
                              setShowUpgradeModal(true);
                            }}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-[#a06b42] hover:bg-[#8f5a32] rounded transition-colors"
                            title="Upgrade commission level"
                          >
                            <FaCrown className="w-3 h-3" />
                            Upgrade
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); deleteCar(car._id); }} className="px-3 py-1 bg-red-600 text-white rounded text-xs">Delete</button>
                        </div>
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
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowDirectCarBooking(true)}
              className="inline-flex items-center px-3 py-1.5 rounded-full bg-[#a06b42] hover:bg-[#8f5a32] text-white text-xs font-medium shadow-sm"
            >
              New direct booking
            </button>
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
                    <td className="px-4 py-3 text-sm font-medium text-[#3b2a18]">
                      <div className="flex items-center gap-2">
                        <span>{b.car?.vehicleName || 'Vehicle'}</span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          b.channel === 'direct'
                            ? 'bg-[#f5e6d5] text-[#4b2a00] border border-[#e0d5c7]'
                            : 'bg-blue-50 text-blue-700 border border-blue-100'
                        }`}>
                          {b.channel === 'direct' ? 'Direct' : 'Online'}
                        </span>
                      </div>
                    </td>
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
                      <button
                        onClick={() => {
                          try {
                            if (typeof window !== 'undefined') {
                              window.open(`${API_URL}/api/car-bookings/${b._id}/invoice`, '_blank', 'noopener,noreferrer');
                            }
                          } catch (_) {}
                        }}
                        className="px-2 py-1 rounded-full border border-blue-200 bg-white text-[11px] text-blue-700 hover:bg-blue-50"
                      >
                        Invoice
                      </button>
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

      {showDirectCarBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-[#e0d5c7]">
            <div className="px-5 py-4 border-b border-[#f0e6d9] flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[#4b2a00]">New direct booking</h2>
                <p className="text-xs text-gray-600 mt-0.5">
                  Record an offline/negotiated reservation for one of your vehicles. The final agreed price will be used for commission.
                </p>
                {(() => {
                  try {
                    if (!directCarForm.carId || !Array.isArray(cars) || cars.length === 0) return null;
                    const selected = cars.find(c => String(c._id) === String(directCarForm.carId));
                    if (!selected) return null;
                    const name = selected.vehicleName || `${selected.brand || ''} ${selected.model || ''}`.trim() || 'Untitled vehicle';
                    return (
                      <p className="mt-1 inline-flex items-center px-2 py-0.5 rounded-full bg-[#fdf7ee] border border-[#e0d5c7] text-[11px] text-[#4b2a00] font-medium">
                        Selected vehicle:&nbsp;
                        <span className="font-semibold">{name}</span>
                      </p>
                    );
                  } catch (_) {
                    return null;
                  }
                })()}
              </div>
              <button
                type="button"
                onClick={() => setShowDirectCarBooking(false)}
                className="px-3 py-1.5 rounded-lg bg-white border border-[#d4c4b0] text-[#4b2a00] text-xs font-medium hover:bg-[#f9f1e7]"
              >
                Close
              </button>
            </div>

            <form onSubmit={submitDirectCarBooking} className="px-5 py-4 space-y-4 text-sm text-gray-800">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-gray-600 mb-1">Vehicle *</label>
                  <select
                    className="w-full px-3 py-2 border border-[#d4c4b0] rounded-lg bg-white text-sm"
                    value={directCarForm.carId}
                    onChange={e => setDirectCarForm(f => ({ ...f, carId: e.target.value }))}
                  >
                    <option value="">Select vehicle</option>
                    {Array.isArray(cars) && cars.map(c => (
                      <option key={c._id} value={c._id}>
                        {c.vehicleName || `${c.brand || ''} ${c.model || ''}`.trim() || 'Untitled vehicle'}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-gray-600 mb-1">Payment method</label>
                  <select
                    className="w-full px-3 py-2 border border-[#d4c4b0] rounded-lg bg-white text-sm"
                    value={directCarForm.paymentMethod}
                    onChange={e => setDirectCarForm(f => ({ ...f, paymentMethod: e.target.value }))}
                  >
                    <option value="cash">Cash</option>
                    <option value="mobile_money">Mobile money</option>
                    <option value="card">Card</option>
                    <option value="bank_transfer">Bank transfer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-gray-600 mb-1">Pickup date *</label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border border-[#d4c4b0] rounded-lg text-sm"
                    value={directCarForm.pickupDate}
                    onChange={e => setDirectCarForm(f => ({ ...f, pickupDate: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-600 mb-1">Return date *</label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border border-[#d4c4b0] rounded-lg text-sm"
                    value={directCarForm.returnDate}
                    onChange={e => setDirectCarForm(f => ({ ...f, returnDate: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-gray-600 mb-1">Pickup location *</label>
                  <input
                    className="w-full px-3 py-2 border border-[#d4c4b0] rounded-lg text-sm"
                    value={directCarForm.pickupLocation}
                    onChange={e => setDirectCarForm(f => ({ ...f, pickupLocation: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-600 mb-1">Return location</label>
                  <input
                    className="w-full px-3 py-2 border border-[#d4c4b0] rounded-lg text-sm"
                    value={directCarForm.returnLocation}
                    onChange={e => setDirectCarForm(f => ({ ...f, returnLocation: e.target.value }))}
                    placeholder="Defaults to pickup location"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-gray-600 mb-1">Guest name</label>
                  <input
                    className="w-full px-3 py-2 border border-[#d4c4b0] rounded-lg text-sm"
                    value={directCarForm.guestName}
                    onChange={e => setDirectCarForm(f => ({ ...f, guestName: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] text-gray-600 mb-1">Guest phone</label>
                    <input
                      className="w-full px-3 py-2 border border-[#d4c4b0] rounded-lg text-sm"
                      value={directCarForm.guestPhone}
                      onChange={e => setDirectCarForm(f => ({ ...f, guestPhone: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-gray-600 mb-1">Guest email</label>
                    <input
                      type="email"
                      className="w-full px-3 py-2 border border-[#d4c4b0] rounded-lg text-sm"
                      value={directCarForm.guestEmail}
                      onChange={e => setDirectCarForm(f => ({ ...f, guestEmail: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
                  <div>
                    <label className="block text-[11px] text-gray-600 mb-1">Suggested price (system)</label>
                    <div className="px-3 py-2 border border-dashed border-[#d4c4b0] rounded-lg text-xs text-gray-700 bg-[#fdf7ee]">
                      {(() => {
                        const suggested = suggestDirectPrice();
                        if (!suggested) return 'Select vehicle and dates to see suggested price.';
                        return formatCurrencyRWF
                          ? formatCurrencyRWF(suggested)
                          : `RWF ${Number(suggested || 0).toLocaleString()}`;
                      })()}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] text-gray-600 mb-1">Final agreed price *</label>
                    <input
                      type="number"
                      className="w-full px-3 py-2 border border-[#d4c4b0] rounded-lg text-sm"
                      value={directCarForm.finalPrice}
                      onChange={e => setDirectCarForm(f => ({ ...f, finalPrice: e.target.value }))}
                      placeholder="Enter final agreed total"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-[#f0e6d9] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowDirectCarBooking(false)}
                  className="px-4 py-2 rounded-lg bg-white border border-[#d4c4b0] text-[#4b2a00] text-xs font-medium hover:bg-[#f9f1e7]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={directCarBookingSaving}
                  className="px-4 py-2 rounded-lg bg-[#a06b42] hover:bg-[#8f5a32] text-white text-xs font-medium disabled:opacity-60"
                >
                  {directCarBookingSaving ? 'Saving...' : 'Save direct booking'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <SuccessModal open={successOpen} title={successTitle} message={successMsg} onClose={() => setSuccessOpen(false)} />
      
      {/* Commission Upgrade Modal */}
      {selectedVehicle && (
        <CommissionUpgradeModal
          isOpen={showUpgradeModal}
          onClose={() => {
            setShowUpgradeModal(false);
            setSelectedVehicle(null);
          }}
          itemId={selectedVehicle._id}
          itemType="vehicle"
          currentLevel={selectedVehicle.commissionLevel}
          onUpgradeSuccess={(updatedVehicle) => {
            // Refresh vehicles list
            setCars(prev => prev.map(c => 
              String(c._id) === String(updatedVehicle._id) 
                ? { ...c, commissionLevel: updatedVehicle.commissionLevel }
                : c
            ));
            toast.success('Commission level upgraded successfully!');
          }}
        />
      )}
      </div>
    </div>
  );
}
