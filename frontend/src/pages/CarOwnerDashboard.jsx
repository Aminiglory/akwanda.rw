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
  const [cars, setCars] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [bookingFilters, setBookingFilters] = useState({ status: '', from: '', to: '' });
  const [receiptBooking, setReceiptBooking] = useState(null);
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
  const emptyCar = useMemo(() => ({
    vehicleName: '', vehicleType: 'economy', brand: '', model: '', year: new Date().getFullYear(),
    licensePlate: '', capacity: 4, pricePerDay: 0, pricePerWeek: '', pricePerMonth: '',
    currency: 'RWF', isAvailable: true, location: '', images: [], features: [], fuelType: 'petrol', transmission: 'automatic', mileage: '',
    // Car-specific
    doors: 4, airConditioning: true, luggageCapacity: 2,
    // Motorcycle-specific
    engineCapacityCc: '', helmetIncluded: false,
    // Bicycle-specific
    frameSize: '', gearCount: '', bicycleType: '',
    // Safety
    abs: false,
    fuelPolicy: '', mileageLimitPerDayKm: '', cancellationPolicy: '', depositInfo: ''
  }), []);
  const [form, setForm] = useState(emptyCar);
  const [uploadingId, setUploadingId] = useState(null);
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'table'
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createImages, setCreateImages] = useState([]);
  const [createPreviews, setCreatePreviews] = useState([]);
  const createFormRef = useRef(null);
  const bookingsRef = useRef(null);
  const [bookingView, setBookingView] = useState(() => {
    const section = searchParams.get('section');
    return section === 'calendar' ? 'calendar' : 'list';
  });
  const [calendarMonthOffset, setCalendarMonthOffset] = useState(() => {
    const mo = parseInt(searchParams.get('monthOffset') || '0', 10);
    return Number.isNaN(mo) ? 0 : mo;
  });
  const [view, setView] = useState('overview'); // 'overview' | 'vehicles' | 'bookings' | 'finance' | 'analytics' | 'reviews' | 'messages' | 'settings'
  const propertyContextId = searchParams.get('property') || '';
  const [propertyContextLabel, setPropertyContextLabel] = useState('');

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

  // Load human-readable property context label when propertyContextId is present
  useEffect(() => {
    if (!propertyContextId) {
      setPropertyContextLabel('');
      return;
    }
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/properties/${propertyContextId}`, { credentials: 'include' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to load property');
        const p = data.property || data;
        const id = String(p._id || propertyContextId);
        const code = p.propertyNumber || id.slice(-6) || 'N/A';
        const name = p.title || p.name || 'Property';
        setPropertyContextLabel(`#${code} - ${name}`);
      } catch (e) {
        console.error('[Vehicles][propertyContext] error', e);
        setPropertyContextLabel(propertyContextId);
      }
    })();
  }, [propertyContextId]);

  function exportBookingsCsv() {
    const rows = [['Vehicle','Renter','Pickup','Return','Days','Amount','Status']];
    const filtered = bookings.filter(b => {
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
    });
    filtered.forEach(b => {
      rows.push([
        (b.car?.vehicleName || '').replace(/,/g,' '),
        `${b.guest?.firstName || ''} ${b.guest?.lastName || ''}`.trim().replace(/,/g,' '),
        new Date(b.pickupDate).toLocaleDateString(),
        new Date(b.returnDate).toLocaleDateString(),
        String(b.numberOfDays || ''),
        String(b.totalAmount || ''),
        b.status || ''
      ]);
    });
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'vehicle-bookings.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  function exportExpensesCsv() {
    const rows = [['Date','Vehicle','Category','Amount','Note']];
    const list = Array.isArray(carExpenses) ? carExpenses : [];
    list.forEach(e => {
      const d = e.date ? new Date(e.date) : null;
      const dateStr = d ? d.toLocaleDateString() : '';
      const vehicleName = (e.car?.vehicleName || `${e.car?.brand || ''} ${e.car?.model || ''}`.trim() || '').replace(/,/g,' ');
      rows.push([
        dateStr,
        vehicleName,
        String(e.category || '').replace(/,/g,' '),
        String(e.amount || ''),
        String(e.note || '').replace(/\r?\n/g,' ').replace(/,/g,' ')
      ]);
    });
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'vehicle-expenses.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  useEffect(() => { loadData(); }, []);

  // Sync high-level view with ?view= from URL used by owner navbar
  useEffect(() => {
    const v = (searchParams.get('view') || '').toLowerCase();
    switch (v) {
      case 'dashboard':
      case '':
        if (view !== 'overview') setView('overview');
        break;
      case 'vehicles':
        if (view !== 'vehicles') setView('vehicles');
        break;
      case 'reservations':
      case 'bookings':
        if (view !== 'bookings') setView('bookings');
        // keep list view for reservations; calendar handled separately below
        if (bookingView !== 'list') setBookingView('list');
        break;
      case 'calendar':
        if (view !== 'bookings') setView('bookings');
        if (bookingView !== 'calendar') setBookingView('calendar');
        break;
      case 'finance':
        if (view !== 'finance') setView('finance');
        break;
      case 'analytics':
        if (view !== 'analytics') setView('analytics');
        break;
      case 'reviews':
        if (view !== 'reviews') setView('reviews');
        break;
      case 'messages':
        if (view !== 'messages') setView('messages');
        break;
      case 'settings':
        if (view !== 'settings') setView('settings');
        break;
      default:
        break;
    }
  }, [searchParams, view, bookingView]);

  useEffect(() => {
    if (!Array.isArray(cars) || cars.length === 0) return;
    let initialId = '';
    try {
      const urlCar = searchParams.get('car');
      if (urlCar && cars.some(c => String(c._id) === String(urlCar))) {
        initialId = String(urlCar);
      }
    } catch (_) {}
    if (!initialId) {
      initialId = String(cars[0]._id);
    }
    if (String(selectedCarId) !== String(initialId)) {
      setSelectedCarId(initialId);
    }
  }, [cars, searchParams, selectedCarId]);

  useEffect(() => {
    if (!selectedCarId) return;
    try {
      const params = new URLSearchParams(location.search || '');
      if (String(params.get('car')) === String(selectedCarId)) return;
      params.set('car', String(selectedCarId));
      setSearchParams(params);
    } catch (_) {}
  }, [selectedCarId, location.search, setSearchParams]);

  useEffect(() => {
    const baseList = Array.isArray(bookings) ? bookings : [];
    const vehicleFiltered = selectedCarId
      ? baseList.filter(b => String(b.car?._id) === String(selectedCarId))
      : baseList;

    let total = vehicleFiltered.length;
    let pending = 0;
    let active = 0;
    let completed = 0;
    let cancelled = 0;
    let totalRevenue = 0;
    let daysRented = 0;

    vehicleFiltered.forEach(b => {
      const s = b.status || '';
      if (s === 'pending') pending += 1;
      if (s === 'confirmed' || s === 'active') active += 1;
      if (s === 'completed') completed += 1;
      if (s === 'cancelled') cancelled += 1;
      totalRevenue += Number(b.totalAmount || 0);
      daysRented += Number(b.numberOfDays || 0);
    });

    const avgRentalLength = total > 0 ? daysRented / total : 0;

    setStats({
      totalBookings: total,
      pending,
      active,
      completed,
      cancelled,
      totalRevenue,
      daysRented,
      avgRentalLength
    });
  }, [bookings, selectedCarId]);

  // Keep filters and views in sync with URL query params (section, status, monthOffset)
  useEffect(() => {
    const section = searchParams.get('section');
    const status = searchParams.get('status') || '';
    const mo = parseInt(searchParams.get('monthOffset') || '0', 10);

    if (section === 'calendar' && bookingView !== 'calendar') {
      setBookingView('calendar');
    } else if (section === 'reservations' && bookingView !== 'list') {
      setBookingView('list');
    }

    setBookingFilters(prev => ({
      ...prev,
      status,
    }));

    if (!Number.isNaN(mo) && mo !== calendarMonthOffset) {
      setCalendarMonthOffset(mo);
    }
  }, [searchParams, bookingView, calendarMonthOffset]);

  const financeStats = useMemo(() => {
    const baseList = Array.isArray(bookings) ? bookings : [];
    const filter = (searchParams.get('filter') || 'all').toLowerCase();
    const now = new Date();
    const start30 = new Date(now);
    start30.setDate(start30.getDate() - 30);
    const startYear = new Date(now.getFullYear(), 0, 1);

    let rev30 = 0;
    let revYtd = 0;
    let bookings30 = 0;
    let bookingsYtd = 0;

    baseList.forEach(b => {
      if (selectedCarId && String(b.car?._id) !== String(selectedCarId)) return;

      const status = String(b.paymentStatus || b.status || '').toLowerCase();
      if (filter === 'paid' && status !== 'paid') return;
      if (filter === 'pending' && status !== 'pending') return;
      if (filter === 'unpaid' && status !== 'unpaid') return;
      const amount = Number(b.totalAmount || 0);
      const start = new Date(b.pickupDate);
      if (start >= start30 && start <= now) {
        rev30 += amount;
        bookings30 += 1;
      }
      if (start >= startYear && start <= now) {
        revYtd += amount;
        bookingsYtd += 1;
      }
    });

    const avg30 = bookings30 > 0 ? rev30 / bookings30 : 0;
    return { rev30, revYtd, bookings30, bookingsYtd, avg30 };
  }, [bookings, selectedCarId, searchParams]);

  const rangeParam = (searchParams.get('range') || '').toLowerCase();
  const financeRangeLabel = rangeParam === '30'
    ? 'Last 30 days'
    : rangeParam === 'ytd'
      ? 'Year to date'
      : 'All time';

  const financeFilter = (searchParams.get('filter') || 'all').toLowerCase();
  const financeMode = (searchParams.get('mode') || 'overview').toLowerCase();

  const financeFilterLabel = (() => {
    switch (financeFilter) {
      case 'paid': return 'Paid payments';
      case 'pending': return 'Pending payments';
      case 'unpaid': return 'Unpaid payments';
      default: return 'All payments';
    }
  })();

  const financeModeLabel = financeMode === 'expenses' ? 'Expenses & profit' : 'Overview';

  // Load vehicle-level finance data (expenses + summary) when viewing finance/analytics
  useEffect(() => {
    const v = view;
    const mode = financeMode;
    if (v !== 'finance' && v !== 'analytics') return;
    if (v === 'finance' && mode !== 'expenses') return;

    (async () => {
      try {
        setCarFinanceLoading(true);
        const params = new URLSearchParams();
        if (selectedCarId) params.set('car', String(selectedCarId));

        const query = params.toString();
        const [expRes, sumRes] = await Promise.all([
          fetch(`${API_URL}/api/car-finance/expenses${query ? `?${query}` : ''}`, { credentials: 'include' }),
          fetch(`${API_URL}/api/car-finance/summary${query ? `?${query}` : ''}`, { credentials: 'include' })
        ]);

        const expData = await expRes.json().catch(() => ({}));
        const sumData = await sumRes.json().catch(() => ({}));

        if (expRes.ok) {
          setCarExpenses(Array.isArray(expData.expenses) ? expData.expenses : []);
          setCarExpensesTotal(Number(expData.total || 0));
        } else {
          setCarExpenses([]);
          setCarExpensesTotal(0);
        }

        if (sumRes.ok) {
          setCarFinanceSummary(sumData || null);
        } else {
          setCarFinanceSummary(null);
        }
      } catch (e) {
        console.error('[Vehicles][carFinance] error', e);
        setCarExpenses([]);
        setCarExpensesTotal(0);
        setCarFinanceSummary(null);
      } finally {
        setCarFinanceLoading(false);
      }
    })();
  }, [view, financeMode, selectedCarId, searchParams]);

  const calendarMeta = useMemo(() => {
    const base = new Date();
    const monthDate = new Date(base.getFullYear(), base.getMonth() + calendarMonthOffset, 1);
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const label = monthDate.toLocaleString(undefined, { month: 'long', year: 'numeric' });
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < firstWeekday; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(new Date(year, month, d));
    }
    return { label, cells };
  }, [calendarMonthOffset]);

  function resetForm() { setForm(emptyCar); }

  async function createCar(e) {
    e.preventDefault();
    try {
      console.log('[Vehicles][create] payload', form);
      if (user?.isBlocked) { toast.error('Your account is deactivated. Creating cars is disabled.'); return; }
      if (!createImages || createImages.length === 0) { toast.error('Please add at least one image'); return; }
      // Build payload per category with validation
      if (!form.vehicleName) { toast.error('Vehicle name is required'); return; }
      if (!form.location) { toast.error('Location is required'); return; }
      if (!form.pricePerDay || Number(form.pricePerDay) <= 0) { toast.error('Enter a valid price per day'); return; }

      let payload;
      if (category === 'car') {
        // Validation
        if (!form.brand || !form.model) { toast.error('Brand and model are required for cars'); return; }
        if (!form.licensePlate) { toast.error('License plate is required for cars'); return; }
        if (!form.transmission) { toast.error('Transmission is required for cars'); return; }
        if (!form.fuelType) { toast.error('Fuel type is required for cars'); return; }
        if (!form.capacity || Number(form.capacity) <= 0) { toast.error('Seats must be a positive number'); return; }
        if (!form.doors || Number(form.doors) <= 0) { toast.error('Doors must be a positive number'); return; }
        // Map payload
        payload = {
          vehicleName: form.vehicleName,
          vehicleType: form.vehicleType,
          brand: form.brand,
          model: form.model,
          year: form.year,
          licensePlate: form.licensePlate,
          capacity: Number(form.capacity), // seats
          doors: Number(form.doors),
          airConditioning: !!form.airConditioning,
          luggageCapacity: form.luggageCapacity !== '' ? Number(form.luggageCapacity) : undefined,
          abs: !!form.abs,
          pricePerDay: Number(form.pricePerDay),
          pricePerWeek: form.pricePerWeek,
          pricePerMonth: form.pricePerMonth,
          currency: form.currency,
          isAvailable: !!form.isAvailable,
          location: form.location,
          features: form.features,
          fuelType: form.fuelType,
          transmission: form.transmission,
          mileage: form.mileage,
          fuelPolicy: form.fuelPolicy || undefined,
          mileageLimitPerDayKm: form.mileageLimitPerDayKm !== '' ? Number(form.mileageLimitPerDayKm) : undefined,
          cancellationPolicy: form.cancellationPolicy || undefined,
          depositInfo: form.depositInfo || undefined
        };
      } else if (category === 'motorcycle') {
        // Validation
        if (!form.brand || !form.model) { toast.error('Brand and model are required for motorcycles'); return; }
        if (!form.engineCapacityCc || Number(form.engineCapacityCc) <= 0) { toast.error('Engine capacity (cc) is required for motorcycles'); return; }
        // Map payload, enforce transmission manual and vehicleType
        payload = {
          vehicleName: form.vehicleName,
          vehicleType: 'motorcycle',
          brand: form.brand,
          model: form.model,
          year: form.year,
          pricePerDay: Number(form.pricePerDay),
          currency: form.currency,
          isAvailable: !!form.isAvailable,
          location: form.location,
          capacity: Number(form.capacity || 2),
          engineCapacityCc: Number(form.engineCapacityCc),
          helmetIncluded: !!form.helmetIncluded,
          abs: !!form.abs,
          transmission: 'manual',
          fuelPolicy: form.fuelPolicy || undefined,
          mileageLimitPerDayKm: form.mileageLimitPerDayKm !== '' ? Number(form.mileageLimitPerDayKm) : undefined,
          cancellationPolicy: form.cancellationPolicy || undefined,
          depositInfo: form.depositInfo || undefined
        };
      } else {
        // Bicycle
        if (!form.brand || !form.model) { toast.error('Brand and model are required for bicycles'); return; }
        if (!form.frameSize) { toast.error('Frame size is required for bicycles'); return; }
        if (!form.gearCount || Number(form.gearCount) <= 0) { toast.error('Gear count is required for bicycles'); return; }
        payload = {
          vehicleName: form.vehicleName,
          vehicleType: 'bicycle',
          brand: form.brand,
          model: form.model,
          year: form.year,
          pricePerDay: Number(form.pricePerDay),
          currency: form.currency,
          isAvailable: !!form.isAvailable,
          location: form.location,
          capacity: Number(form.capacity || 1),
          frameSize: String(form.frameSize),
          gearCount: Number(form.gearCount),
          helmetIncluded: !!form.helmetIncluded,
          bicycleType: form.bicycleType || undefined,
          fuelPolicy: form.fuelPolicy || undefined,
          mileageLimitPerDayKm: form.mileageLimitPerDayKm !== '' ? Number(form.mileageLimitPerDayKm) : undefined,
          cancellationPolicy: form.cancellationPolicy || undefined,
          depositInfo: form.depositInfo || undefined
        };
      }
      setSaving(true);
      const res = await fetch(`${API_URL}/api/cars`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      const data = await res.json();
      console.log('[Vehicles][create] result', { status: res.status, id: data?.car?._id });
      if (!res.ok) throw new Error(data.message || 'Failed to create');
      setCars(c => [data.car, ...c]);
      toast.success('Car created');
      setSuccessTitle('Vehicle Created');
      setSuccessMsg('Your vehicle was created successfully.');
      setSuccessOpen(true);
      await uploadImages(data.car._id, createImages);
      resetForm();
      setCreateImages([]);
    } catch (e) { console.error('[Vehicles][create] error', e); toast.error(e.message); } finally { setSaving(false); }
  }

  async function updateCar(id, patch) {
    try {
      console.log('[Vehicles][update] id', id, 'patch', patch);
      if (user?.isBlocked) { toast.error('Your account is deactivated. Updates are disabled.'); return; }
      const res = await fetch(`${API_URL}/api/cars/${id}`, {
        method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch)
      });
      const data = await res.json();
      console.log('[Vehicles][update] result', { status: res.status });
      if (!res.ok) throw new Error(data.message || 'Update failed');
      setCars(list => list.map(c => c._id === id ? data.car : c));
      toast.success('Car updated');
      setSuccessTitle('Vehicle Updated');
      setSuccessMsg('Your vehicle was updated successfully.');
      setSuccessOpen(true);
    } catch (e) { console.error('[Vehicles][update] error', e); toast.error(e.message); }
  }

  async function deleteCar(id) {
    if (!confirm('Delete this car?')) return;
    try {
      console.log('[Vehicles][delete] id', id);
      if (user?.isBlocked) { toast.error('Your account is deactivated. Delete is disabled.'); return; }
      const res = await fetch(`${API_URL}/api/cars/${id}`, { method: 'DELETE', credentials: 'include' });
      const data = await res.json();
      console.log('[Vehicles][delete] result', { status: res.status });
      if (!res.ok) throw new Error(data.message || 'Delete failed');
      setCars(list => list.filter(c => c._id !== id));
      toast.success('Car deleted');
      setSuccessTitle('Vehicle Deleted');
      setSuccessMsg('Your vehicle was deleted successfully.');
      setSuccessOpen(true);
    } catch (e) { console.error('[Vehicles][delete] error', e); toast.error(e.message); }
  }

  async function uploadImages(id, files) {
    if (!files?.length) return;
    try {
      console.log('[Vehicles][uploadImages] id', id, 'files', files?.length);
      if (user?.isBlocked) { toast.error('Your account is deactivated. Uploads are disabled.'); return; }
      setUploadingId(id);
      const formData = new FormData();
      Array.from(files).forEach(f => formData.append('images', f));
      const res = await fetch(`${API_URL}/api/cars/${id}/images`, { method: 'POST', credentials: 'include', body: formData });
      const data = await res.json();
      console.log('[Vehicles][uploadImages] result', { status: res.status, imageCount: (data?.car?.images||[]).length });
      if (!res.ok) throw new Error(data.message || 'Upload failed');
      setCars(list => list.map(c => c._id === id ? data.car : c));
      toast.success('Images uploaded');
      setSuccessTitle('Images Uploaded');
      setSuccessMsg('Your vehicle images were uploaded successfully.');
      setSuccessOpen(true);
    } catch (e) { console.error('[Vehicles][uploadImages] error', e); toast.error(e.message); } finally { setUploadingId(null); }
  }

  return (
    <div className="min-h-screen bg-[#f9f5ef] py-4">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-3 flex justify-between items-center">
          {/* Back to main listing options (optional, safe to keep) */}
          <button
            type="button"
            onClick={() => window.location.assign('/choose-listing-type')}
            className="inline-flex items-center px-3 py-1.5 rounded-full bg-white/70 hover:bg-white text-xs font-medium text-[#4b2a00] border border-[#e0d5c7] shadow-sm transition-colors"
          >
            <span className="mr-1">←</span>
            Back to listing options
          </button>

          {/* Create vehicle + view mode toggle (original controls) */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => window.location.assign('/upload-property?type=rental')}
              className="px-4 py-2 rounded-lg bg-[#a06b42] hover:bg-[#8f5a32] text-white text-sm font-medium"
              disabled={user?.isBlocked}
            >
              List a vehicle
            </button>

            <div className="inline-flex rounded-lg overflow-hidden border">
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`px-3 py-2 text-sm ${viewMode==='cards' ? 'bg-[#a06b42] text-white' : 'bg-white text-gray-700'}`}
              >
                Cards
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`px-3 py-2 text-sm ${viewMode==='table' ? 'bg-[#a06b42] text-white' : 'bg-white text-gray-700'}`}
              >
                Table
              </button>
            </div>
          </div>
        </div>

        {/* View selector to mirror PropertyManagement layout */}
        <div className="mb-4 flex flex-wrap gap-2 text-sm">
          <button
            type="button"
            onClick={() => {
              setView('overview');
              try {
                const next = new URLSearchParams(searchParams.toString());
                next.delete('view');
                setSearchParams(next, { replace: true });
              } catch (_) {}
            }}
            className={`px-3 py-1.5 rounded-full border ${view === 'overview' ? 'bg-[#a06b42] text-white border-[#a06b42]' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
          >
            Overview
          </button>
          <button
            type="button"
            onClick={() => {
              setView('vehicles');
              try {
                const next = new URLSearchParams(searchParams.toString());
                next.set('view', 'vehicles');
                setSearchParams(next, { replace: true });
              } catch (_) {}
            }}
            className={`px-3 py-1.5 rounded-full border ${view === 'vehicles' ? 'bg-[#a06b42] text-white border-[#a06b42]' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
          >
            Vehicles
          </button>
          <button
            type="button"
            onClick={() => {
              setView('bookings');
              try {
                const next = new URLSearchParams(searchParams.toString());
                next.set('view', 'bookings');
                setSearchParams(next, { replace: true });
              } catch (_) {}
            }}
            className={`px-3 py-1.5 rounded-full border ${view === 'bookings' ? 'bg-[#a06b42] text-white border-[#a06b42]' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
          >
            Bookings
          </button>
          <button
            type="button"
            onClick={() => {
              setView('finance');
              try {
                const next = new URLSearchParams(searchParams.toString());
                next.set('view', 'finance');
                setSearchParams(next, { replace: true });
              } catch (_) {}
            }}
            className={`px-3 py-1.5 rounded-full border ${view === 'finance' ? 'bg-[#a06b42] text-white border-[#a06b42]' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
          >
            Finance
          </button>
          <button
            type="button"
            onClick={() => {
              setView('analytics');
              try {
                const next = new URLSearchParams(searchParams.toString());
                next.set('view', 'analytics');
                setSearchParams(next, { replace: true });
              } catch (_) {}
            }}
            className={`px-3 py-1.5 rounded-full border ${view === 'analytics' ? 'bg-[#a06b42] text-white border-[#a06b42]' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
          >
            Analytics
          </button>
          <button
            type="button"
            onClick={() => {
              setView('reviews');
              try {
                const next = new URLSearchParams(searchParams.toString());
                next.set('view', 'reviews');
                setSearchParams(next, { replace: true });
              } catch (_) {}
            }}
            className={`px-3 py-1.5 rounded-full border ${view === 'reviews' ? 'bg-[#a06b42] text-white border-[#a06b42]' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
          >
            Reviews
          </button>
          <button
            type="button"
            onClick={() => {
              setView('messages');
              try {
                const next = new URLSearchParams(searchParams.toString());
                next.set('view', 'messages');
                setSearchParams(next, { replace: true });
              } catch (_) {}
            }}
            className={`px-3 py-1.5 rounded-full border ${view === 'messages' ? 'bg-[#a06b42] text-white border-[#a06b42]' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
          >
            Messages
          </button>
          <button
            type="button"
            onClick={() => {
              setView('settings');
              try {
                const next = new URLSearchParams(searchParams.toString());
                next.set('view', 'settings');
                setSearchParams(next, { replace: true });
              } catch (_) {}
            }}
            className={`px-3 py-1.5 rounded-full border ${view === 'settings' ? 'bg-[#a06b42] text-white border-[#a06b42]' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
          >
            Settings
          </button>
        </div>

        {user?.isBlocked && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            Your account is deactivated. Vehicle management is disabled until reactivated.
          </div>
        )}

        {/* Overview section (stats, quick links, finance snapshot) */}
        {view === 'overview' && (
        <>
          {/* Vehicle context selector */}
          {Array.isArray(cars) && cars.length > 0 ? (
            <div className="mb-4 max-w-sm bg-white border border-[#e0d5c7] rounded-xl px-3 py-2 shadow-sm flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#f5ebe0] flex items-center justify-center text-[#a06b42]">
                <FaCar className="text-sm" />
              </div>
              <div className="flex-1 min-w-0">
                <label className="block text-[11px] text-gray-500">Vehicle focus</label>
                <select
                  className="mt-0.5 w-full px-2 py-1.5 border border-[#e0d5c7] rounded-md text-xs bg-[#faf6f0] focus:outline-none focus:ring-1 focus:ring-[#a06b42] focus:border-[#a06b42]"
                  value={selectedCarId || ''}
                  onChange={e => setSelectedCarId(e.target.value)}
                >
                  {cars.map(c => (
                    <option key={c._id} value={c._id}>
                      {c.vehicleName || `${c.brand || ''} ${c.model || ''}`.trim() || 'Untitled vehicle'}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div className="mb-4 text-xs text-gray-700 bg-white border border-[#e0d5c7] rounded-xl px-3 py-3">
              <div className="font-semibold text-gray-900 mb-0.5">No vehicles listed yet</div>
              <p className="text-[11px] text-gray-600">
                Once you list vehicles, you'll see per-vehicle stats here. For now, the summary cards show overall bookings and revenue for your account.
              </p>
            </div>
          )}

          {/* High-level stats */}
          <div className="mb-5 grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-2xl bg-white shadow-sm border border-gray-100 px-3 py-2.5 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#e9f2ff] flex items-center justify-center text-[#2563eb]">
                <FaCalendarAlt className="text-xs" />
              </div>
              <div>
                <div className="text-[11px] text-gray-500">Total bookings</div>
                <div className="text-lg font-semibold text-gray-900 leading-snug">{stats.totalBookings}</div>
              </div>
            </div>

            <div className="rounded-2xl bg-white shadow-sm border border-gray-100 px-3 py-2.5 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#ecfdf3] flex items-center justify-center text-emerald-700">
                <FaCar className="text-xs" />
              </div>
              <div>
                <div className="text-[11px] text-gray-500">Active</div>
                <div className="text-lg font-semibold text-emerald-700 leading-snug">{stats.active}</div>
              </div>
            </div>

            <div className="rounded-2xl bg-white shadow-sm border border-gray-100 px-3 py-2.5 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#eff6ff] flex items-center justify-center text-blue-700">
                <FaCalendarAlt className="text-xs" />
              </div>
              <div>
                <div className="text-[11px] text-gray-500">Completed</div>
                <div className="text-lg font-semibold text-blue-700 leading-snug">{stats.completed}</div>
              </div>
            </div>

            <div className="rounded-2xl bg-white shadow-sm border border-gray-100 px-3 py-2.5 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#fff7ed] flex items-center justify-center text-[#a06b42]">
                <FaDollarSign className="text-xs" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] text-gray-500">Revenue (RWF)</div>
                <div className="text-sm font-semibold text-gray-900 truncate">
                  {formatCurrencyRWF ? formatCurrencyRWF(stats.totalRevenue || 0) : `RWF ${Number(stats.totalRevenue || 0).toLocaleString()}`}
                </div>
              </div>
            </div>
          </div>

          {/* Quick management links removed; management is handled via navbar for vehicles dashboard */}

          {/* Finance snapshot */}
          <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-3">
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

          {financeMode === 'expenses' && (
            <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-2xl bg-white shadow-sm border border-gray-100 px-3 py-2.5">
                <div className="text-[11px] text-gray-500">Total expenses (period)</div>
                <div className="text-sm font-semibold text-gray-900">
                  {carFinanceLoading
                    ? 'Loading...'
                    : formatCurrencyRWF
                      ? formatCurrencyRWF(carExpensesTotal || 0)
                      : `RWF ${Number(carExpensesTotal || 0).toLocaleString()}`}
                </div>
                <div className="mt-0.5 text-[11px] text-gray-500">
                  {Array.isArray(carExpenses) ? carExpenses.length : 0} expense entries
                </div>
              </div>

              <div className="rounded-2xl bg-white shadow-sm border border-gray-100 px-3 py-2.5">
                <div className="text-[11px] text-gray-500">Revenue (period)</div>
                <div className="text-sm font-semibold text-gray-900">
                  {carFinanceLoading
                    ? 'Loading...'
                    : formatCurrencyRWF
                      ? formatCurrencyRWF(carFinanceSummary?.revenueTotal || 0)
                      : `RWF ${Number(carFinanceSummary?.revenueTotal || 0).toLocaleString()}`}
                </div>
                <div className="mt-0.5 text-[11px] text-gray-500">
                  {(carFinanceSummary?.counts?.bookings || 0)} bookings in range
                </div>
              </div>

              <div className="rounded-2xl bg-white shadow-sm border border-gray-100 px-3 py-2.5">
                <div className="text-[11px] text-gray-500">Profit (revenue - expenses)</div>
                <div className={`text-sm font-semibold ${
                  (carFinanceSummary?.profit || 0) >= 0 ? 'text-emerald-700' : 'text-red-600'
                }`}>
                  {carFinanceLoading
                    ? 'Loading...'
                    : formatCurrencyRWF
                      ? formatCurrencyRWF(carFinanceSummary?.profit || 0)
                      : `RWF ${Number(carFinanceSummary?.profit || 0).toLocaleString()}`}
                </div>
                <div className="mt-0.5 text-[11px] text-gray-500">Based on selected period and vehicle scope</div>
              </div>
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
        </>
      )}

        {/* Analytics view: reuse finance stats but framed as performance */}
        {view === 'analytics' && (
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

        {/* Simple placeholder panels for reviews/messages/settings views to keep navigation working */}
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

        {/* Cars List */}
        {view === 'vehicles' && (
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
