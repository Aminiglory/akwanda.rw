import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useLocale } from '../contexts/LocaleContext';
import ReceiptPreview from '../components/ReceiptPreview';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import SuccessModal from '../components/SuccessModal';

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
  const [view, setView] = useState('overview'); // 'overview' | 'vehicles' | 'bookings'
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

  useEffect(() => { loadData(); }, []);

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
  }, [bookings, selectedCarId]);

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
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Owner section label */}
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="inline-flex rounded-lg overflow-hidden border border-[#d4c4b0] bg-[#a06b42] text-white px-3 py-2 text-sm">
          Vehicles
        </div>
      </div>
      {propertyContextId && (
        <div className="mb-2 text-xs text-gray-600">
          You are managing property context: <span className="font-semibold">{propertyContextLabel || propertyContextId}</span>
        </div>
      )}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-gray-900">My Vehicles</h1>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setShowCreateForm(prev => {
                const next = !prev;
                if (!prev && next) {
                  // Open form then scroll it into view
                  setTimeout(() => {
                    if (createFormRef.current) {
                      createFormRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }, 50);
                }
                return next;
              });
            }}
            className="px-4 py-2 rounded-lg bg-[#a06b42] hover:bg-[#8f5a32] text-white text-sm font-medium"
            disabled={user?.isBlocked}
          >
            {showCreateForm ? 'Close form' : 'List a vehicle'}
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
      {user?.isBlocked && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          Your account is deactivated. Vehicle management is disabled until reactivated.
        </div>
      )}
      {/* View selector to mirror PropertyManagement layout */}
      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        <button
          type="button"
          onClick={() => setView('overview')}
          className={`px-3 py-1.5 rounded-full border ${view === 'overview' ? 'bg-[#a06b42] text-white border-[#a06b42]' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
        >
          Overview
        </button>
        <button
          type="button"
          onClick={() => setView('vehicles')}
          className={`px-3 py-1.5 rounded-full border ${view === 'vehicles' ? 'bg-[#a06b42] text-white border-[#a06b42]' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
        >
          Vehicles
        </button>
        <button
          type="button"
          onClick={() => setView('bookings')}
          className={`px-3 py-1.5 rounded-full border ${view === 'bookings' ? 'bg-[#a06b42] text-white border-[#a06b42]' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
        >
          Bookings
        </button>
      </div>

      {/* Overview section (stats, quick links, finance) */}
      {Array.isArray(cars) && cars.length > 0 && view === 'overview' && (
        <>
          <div className="mb-4 max-w-xs">
            <label className="block text-xs text-gray-600 mb-1">Selected vehicle</label>
            <select
              className="w-full px-3 py-2 border rounded text-sm"
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

          <div className="mb-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-xl bg-white shadow-sm border border-gray-100 px-3 py-2">
              <div className="text-[11px] text-gray-500">Total bookings</div>
              <div className="text-lg font-semibold text-gray-900">{stats.totalBookings}</div>
            </div>
            <div className="rounded-xl bg-white shadow-sm border border-gray-100 px-3 py-2">
              <div className="text-[11px] text-gray-500">Active</div>
              <div className="text-lg font-semibold text-emerald-700">{stats.active}</div>
            </div>
            <div className="rounded-xl bg-white shadow-sm border border-gray-100 px-3 py-2">
              <div className="text-[11px] text-gray-500">Completed</div>
              <div className="text-lg font-semibold text-blue-700">{stats.completed}</div>
            </div>
            <div className="rounded-xl bg-white shadow-sm border border-gray-100 px-3 py-2">
              <div className="text-[11px] text-gray-500">Revenue (RWF)</div>
              <div className="text-lg font-semibold text-gray-900">
                {formatCurrencyRWF ? formatCurrencyRWF(stats.totalRevenue || 0) : `RWF ${Number(stats.totalRevenue || 0).toLocaleString()}`}
              </div>
            </div>
          </div>

          <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-3">
            <button
              type="button"
              onClick={() => {
                setView('bookings');
                if (bookingsRef.current) bookingsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className="text-left rounded-xl bg-white shadow-sm border border-gray-100 px-3 py-2 hover:border-[#a06b42] hover:shadow-md transition"
            >
              <div className="text-[11px] text-gray-500">Bookings</div>
              <div className="text-sm font-semibold text-gray-900">Manage reservations</div>
              <div className="mt-0.5 text-[11px] text-gray-500">View and update all vehicle bookings</div>
            </button>
            <a
              href="/transactions"
              className="rounded-xl bg-white shadow-sm border border-gray-100 px-3 py-2 hover:border-[#a06b42] hover:shadow-md transition"
            >
              <div className="text-[11px] text-gray-500">Finance</div>
              <div className="text-sm font-semibold text-gray-900">Payments & transactions</div>
              <div className="mt-0.5 text-[11px] text-gray-500">Track payouts and charges</div>
            </a>
            <a
              href="/analytics"
              className="rounded-xl bg-white shadow-sm border border-gray-100 px-3 py-2 hover:border-[#a06b42] hover:shadow-md transition"
            >
              <div className="text-[11px] text-gray-500">Analytics</div>
              <div className="text-sm font-semibold text-gray-900">Performance overview</div>
              <div className="mt-0.5 text-[11px] text-gray-500">See trends across your listings</div>
            </a>
            <a
              href="/owner/promotions"
              className="rounded-xl bg-white shadow-sm border border-gray-100 px-3 py-2 hover:border-[#a06b42] hover:shadow-md transition"
            >
              <div className="text-[11px] text-gray-500">Promotions</div>
              <div className="text-sm font-semibold text-gray-900">Discounts & offers</div>
              <div className="mt-0.5 text-[11px] text-gray-500">Manage deals for your listings</div>
            </a>
            <a
              href="/owner/reviews"
              className="rounded-xl bg-white shadow-sm border border-gray-100 px-3 py-2 hover:border-[#a06b42] hover:shadow-md transition"
            >
              <div className="text-[11px] text-gray-500">Reviews</div>
              <div className="text-sm font-semibold text-gray-900">Guest reviews</div>
              <div className="mt-0.5 text-[11px] text-gray-500">Read and reply to feedback</div>
            </a>
            <a
              href="/messages?category=reservations"
              className="rounded-xl bg-white shadow-sm border border-gray-100 px-3 py-2 hover:border-[#a06b42] hover:shadow-md transition"
            >
              <div className="text-[11px] text-gray-500">Messages</div>
              <div className="text-sm font-semibold text-gray-900">Guest communication</div>
              <div className="mt-0.5 text-[11px] text-gray-500">Open inbox with reservation auto-replies</div>
            </a>
            <a
              href="/settings?tab=notifications"
              className="rounded-xl bg-white shadow-sm border border-gray-100 px-3 py-2 hover:border-[#a06b42] hover:shadow-md transition"
            >
              <div className="text-[11px] text-gray-500">Settings</div>
              <div className="text-sm font-semibold text-gray-900">Notifications & messaging</div>
              <div className="mt-0.5 text-[11px] text-gray-500">Control how guests contact you</div>
            </a>
          </div>

          <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-xl bg-white shadow-sm border border-gray-100 px-3 py-2">
              <div className="text-[11px] text-gray-500">Last 30 days revenue</div>
              <div className="text-sm font-semibold text-gray-900">
                {formatCurrencyRWF ? formatCurrencyRWF(financeStats.rev30 || 0) : `RWF ${Number(financeStats.rev30 || 0).toLocaleString()}`}
              </div>
              <div className="mt-0.5 text-[11px] text-gray-500">{financeStats.bookings30} bookings</div>
            </div>
            <div className="rounded-xl bg-white shadow-sm border border-gray-100 px-3 py-2">
              <div className="text-[11px] text-gray-500">Year-to-date revenue</div>
              <div className="text-sm font-semibold text-gray-900">
                {formatCurrencyRWF ? formatCurrencyRWF(financeStats.revYtd || 0) : `RWF ${Number(financeStats.revYtd || 0).toLocaleString()}`}
              </div>
              <div className="mt-0.5 text-[11px] text-gray-500">{financeStats.bookingsYtd} bookings</div>
            </div>
            <div className="rounded-xl bg-white shadow-sm border border-gray-100 px-3 py-2">
              <div className="text-[11px] text-gray-500">Avg revenue / booking (30d)</div>
              <div className="text-sm font-semibold text-gray-900">
                {formatCurrencyRWF ? formatCurrencyRWF(financeStats.avg30 || 0) : `RWF ${Number(financeStats.avg30 || 0).toLocaleString()}`}
              </div>
              <div className="mt-0.5 text-[11px] text-gray-500">Based on last 30 days</div>
            </div>
          </div>
        </>
      )}

      {/* Vehicles management: create + list, shown on Vehicles view */}
      {view === 'vehicles' && showCreateForm && (
      <form ref={createFormRef} onSubmit={createCar} className="bg-white rounded-lg shadow p-4 mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs text-gray-700 mb-1">Listing category</label>
          <select className="w-full px-3 py-2 border rounded" value={category} onChange={e => {
            const v = e.target.value; setCategory(v);
            setForm(prev => ({ ...prev, vehicleType: v === 'car' ? (prev.vehicleType && !['motorcycle','bicycle'].includes(prev.vehicleType) ? prev.vehicleType : 'economy') : v }));
          }}>
            {['car','motorcycle','bicycle'].map(x => <option key={x} value={x}>{x}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-700 mb-1">Vehicle name</label>
          <input className="w-full px-3 py-2 border rounded" placeholder="e.g., Toyota RAV4" value={form.vehicleName} onChange={e => setForm({ ...form, vehicleName: e.target.value })} />
        </div>
        {category === 'car' ? (
          <div>
            <label className="block text-xs text-gray-700 mb-1">Vehicle type</label>
            <select className="w-full px-3 py-2 border rounded" value={form.vehicleType} onChange={e => setForm({ ...form, vehicleType: e.target.value })}>
              {['economy','compact','mid-size','full-size','luxury','suv','minivan'].map(x => <option key={x} value={x}>{x}</option>)}
            </select>
          </div>
        ) : (
          <div>
            <label className="block text-xs text-gray-700 mb-1">Vehicle type</label>
            <input className="w-full px-3 py-2 border rounded bg-gray-100" value={category} readOnly />
          </div>
        )}
        <div>
          <label className="block text-xs text-gray-700 mb-1">Brand</label>
          <input className="w-full px-3 py-2 border rounded" placeholder="e.g., Toyota" value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} />
        </div>
        <div>
          <label className="block text-xs text-gray-700 mb-1">Model</label>
          <input className="w-full px-3 py-2 border rounded" placeholder="e.g., RAV4" value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} />
        </div>
        <div>
          <label className="block text-xs text-gray-700 mb-1">Year</label>
          <input className="w-full px-3 py-2 border rounded" type="number" placeholder="e.g., 2022" value={form.year} onChange={e => setForm({ ...form, year: Number(e.target.value) })} />
        </div>
        {/* License plate & capacity / seats */}
        <div>
          <label className="block text-xs text-gray-700 mb-1">License plate{category==='car' ? ' (required)':''}</label>
          <input className="w-full px-3 py-2 border rounded" placeholder="e.g., RAD 123 A" value={form.licensePlate} onChange={e => setForm({ ...form, licensePlate: e.target.value })} />
        </div>
        <div>
          <label className="block text-xs text-gray-700 mb-1">Capacity (seats)</label>
          <input className="w-full px-3 py-2 border rounded" type="number" placeholder="e.g., 5" value={form.capacity} onChange={e => setForm({ ...form, capacity: Number(e.target.value) })} />
        </div>
        <div>
          <label className="block text-xs text-gray-700 mb-1">Price per day</label>
          <input className="w-full px-3 py-2 border rounded" type="number" placeholder="e.g., 85000" value={form.pricePerDay} onChange={e => setForm({ ...form, pricePerDay: Number(e.target.value) })} />
        </div>
        <div>
          <label className="block text-xs text-gray-700 mb-1">Location</label>
          <input className="w-full px-3 py-2 border rounded" placeholder="e.g., Kigali" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
        </div>
        <div>
          <label className="block text-xs text-gray-700 mb-1">Fuel policy</label>
          <input className="w-full px-3 py-2 border rounded" placeholder="e.g., Same-to-same" value={form.fuelPolicy} onChange={e => setForm({ ...form, fuelPolicy: e.target.value })} />
        </div>
        <div>
          <label className="block text-xs text-gray-700 mb-1">Mileage limit per day (km)</label>
          <input className="w-full px-3 py-2 border rounded" type="number" placeholder="e.g., 150" value={form.mileageLimitPerDayKm} onChange={e => setForm({ ...form, mileageLimitPerDayKm: e.target.value })} />
        </div>
        <div>
          <label className="block text-xs text-gray-700 mb-1">Cancellation policy</label>
          <input className="w-full px-3 py-2 border rounded" placeholder="Short description shown to guests" value={form.cancellationPolicy} onChange={e => setForm({ ...form, cancellationPolicy: e.target.value })} />
        </div>
        <div>
          <label className="block text-xs text-gray-700 mb-1">Deposit information</label>
          <input className="w-full px-3 py-2 border rounded" placeholder="e.g., No deposit required" value={form.depositInfo} onChange={e => setForm({ ...form, depositInfo: e.target.value })} />
        </div>
        {category === 'car' && (
          <>
            <div>
              <label className="block text-xs text-gray-700 mb-1">Transmission</label>
              <select className="w-full px-3 py-2 border rounded" value={form.transmission} onChange={e => setForm({ ...form, transmission: e.target.value })}>
                {['automatic','manual'].map(x => <option key={x} value={x}>{x}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-700 mb-1">Fuel type</label>
              <select className="w-full px-3 py-2 border rounded" value={form.fuelType} onChange={e => setForm({ ...form, fuelType: e.target.value })}>
                {['petrol','diesel','hybrid','electric'].map(x => <option key={x} value={x}>{x}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-700 mb-1">Doors</label>
              <input className="w-full px-3 py-2 border rounded" type="number" placeholder="e.g., 4" value={form.doors} onChange={e => setForm({ ...form, doors: Number(e.target.value) })} />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm">Air conditioning</label>
              <input type="checkbox" checked={!!form.airConditioning} onChange={e => setForm({ ...form, airConditioning: !!e.target.checked })} />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm">ABS (Anti-lock Braking System)</label>
              <input type="checkbox" checked={!!form.abs} onChange={e => setForm({ ...form, abs: !!e.target.checked })} />
            </div>
            <div>
              <label className="block text-xs text-gray-700 mb-1">Luggage capacity</label>
              <input className="w-full px-3 py-2 border rounded" type="number" placeholder="e.g., 2" value={form.luggageCapacity} onChange={e => setForm({ ...form, luggageCapacity: Number(e.target.value) })} />
            </div>
          </>
        )}
        {category === 'motorcycle' && (
          <>
            <div>
              <label className="block text-xs text-gray-700 mb-1">Engine capacity (cc)</label>
              <input className="w-full px-3 py-2 border rounded" type="number" placeholder="e.g., 150" value={form.engineCapacityCc} onChange={e => setForm({ ...form, engineCapacityCc: e.target.value })} />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm">Helmet included</label>
              <input type="checkbox" checked={!!form.helmetIncluded} onChange={e => setForm({ ...form, helmetIncluded: !!e.target.checked })} />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm">ABS (Anti-lock Braking System)</label>
              <input type="checkbox" checked={!!form.abs} onChange={e => setForm({ ...form, abs: !!e.target.checked })} />
            </div>
            <div>
              <label className="block text-xs text-gray-700 mb-1">Transmission</label>
              <input className="w-full px-3 py-2 border rounded bg-gray-100" value="manual" readOnly />
            </div>
          </>
        )}
        {category === 'bicycle' && (
          <>
            <div>
              <label className="block text-xs text-gray-700 mb-1">Frame size</label>
              <input className="w-full px-3 py-2 border rounded" placeholder="e.g., M / 54cm" value={form.frameSize} onChange={e => setForm({ ...form, frameSize: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs text-gray-700 mb-1">Gear count</label>
              <input className="w-full px-3 py-2 border rounded" type="number" placeholder="e.g., 21" value={form.gearCount} onChange={e => setForm({ ...form, gearCount: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs text-gray-700 mb-1">Type</label>
              <select className="w-full px-3 py-2 border rounded" value={form.bicycleType} onChange={e => setForm({ ...form, bicycleType: e.target.value })}>
                <option value="">Select type</option>
                {['mountain','road','hybrid','city'].map(x => <option key={x} value={x}>{x}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm">Helmet included</label>
              <input type="checkbox" checked={!!form.helmetIncluded} onChange={e => setForm({ ...form, helmetIncluded: !!e.target.checked })} />
            </div>
          </>
        )}
        <div className="flex items-center gap-2">
          <label className="text-sm">Available</label>
          <input type="checkbox" checked={!!form.isAvailable} onChange={e => setForm({ ...form, isAvailable: !!e.target.checked })} />
        </div>
        <div className="md:col-span-3">
          <label className="block text-xs text-gray-700 mb-1">Images</label>
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
            className="w-full px-3 py-2 border rounded"
          />
          {createPreviews?.length > 0 && (
            <div className="mt-2 grid grid-cols-3 md:grid-cols-5 gap-2">
              {createPreviews.map((src, i) => (
                <div key={i} className="w-full h-20 bg-gray-100 rounded overflow-hidden">
                  <img src={src} className="w-full h-full object-cover" alt="Preview" />
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="md:col-span-3">
          <button disabled={saving || user?.isBlocked} className="px-4 py-2 bg-[#a06b42] hover:bg-[#8f5a32] text-white rounded disabled:opacity-50">{saving ? 'Saving...' : 'Add Vehicle'}</button>
        </div>
      </form>
      )}

      {/* Cars List */}
      {view === 'vehicles' && (
        <>
          {loading ? (
            <div>Loading...</div>
          ) : (!Array.isArray(cars) || cars.length === 0) ? (
            <div className="bg-white rounded-lg shadow p-6 text-center text-sm text-gray-600">
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
            <div className="bg-white rounded-lg shadow overflow-x-auto">
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
                      <a
                        href={`/messages?to=${b.guest?._id || ''}&booking=${b._id}`}
                        className="px-2 py-1 rounded-full bg-[#4b2a00] text-white text-[11px] hover:bg-[#2f1905]"
                      >
                        Message
                      </a>
                    </td>
                  </tr>
                ))}
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
  );
}
