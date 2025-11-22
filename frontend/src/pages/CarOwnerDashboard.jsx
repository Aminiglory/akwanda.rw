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
      {/* Owner tabs */}
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="inline-flex rounded-lg overflow-hidden border border-[#d4c4b0]">
          <a href="/owner/cars" className={`px-3 py-2 text-sm ${location.pathname.startsWith('/owner/cars') ? 'bg-[#a06b42] text-white' : 'bg-[#f6e9d8] text-[#4b2a00] hover:bg-[#e8dcc8]'}`}>Vehicles</a>
          <a href="/owner/attractions" className={`px-3 py-2 text-sm ${location.pathname.startsWith('/owner/attractions') ? 'bg-[#a06b42] text-white' : 'bg-[#f6e9d8] text-[#4b2a00] hover:bg-[#e8dcc8]'}`}>Attractions</a>
        </div>
      </div>
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
      <h1 className="text-2xl font-bold text-gray-900 mb-4">My Vehicles</h1>

      {/* Create Vehicle */}
      {showCreateForm && (
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
      {loading ? <div>Loading...</div> : (
        viewMode === 'cards' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cars.map(car => (
              <div key={car._id} className="bg-white rounded-lg shadow p-4">
                <div className="flex gap-4">
                  <div className="w-32 h-24 bg-gray-100 rounded overflow-hidden">
                    {car.images?.[0] ? <img src={makeAbsolute(car.images[0])} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-400">No image</div>}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">{car.vehicleName} • {car.brand} {car.model}</h3>
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
              </div>
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
                  <tr key={car._id} className="border-t">
                    <td className="p-3 font-medium">{car.vehicleName} • {car.brand} {car.model}</td>
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
        )
      )}

      {/* Bookings */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-2">Bookings</h2>
        {/* Filters */}
        <div className="mb-3 flex flex-wrap items-end gap-2">
          <div>
            <label className="block text-xs text-gray-600">Status</label>
            <select value={bookingFilters.status} onChange={e => setBookingFilters({ ...bookingFilters, status: e.target.value })} className="px-3 py-2 border rounded">
              <option value="">All</option>
              {['pending','confirmed','active','completed','cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-600">From</label>
            <input type="date" value={bookingFilters.from} onChange={e => setBookingFilters({ ...bookingFilters, from: e.target.value })} className="px-3 py-2 border rounded" />
          </div>
          <div>
            <label className="block text-xs text-gray-600">To</label>
            <input type="date" value={bookingFilters.to} onChange={e => setBookingFilters({ ...bookingFilters, to: e.target.value })} className="px-3 py-2 border rounded" />
          </div>
          <button onClick={exportBookingsCsv} className="ml-auto px-3 py-2 bg-[#a06b42] hover:bg-[#8f5a32] text-white rounded">Export CSV</button>
        </div>
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="p-3">Vehicle</th>
                <th className="p-3">Renter</th>
                <th className="p-3">Dates</th>
                <th className="p-3">Amount</th>
                <th className="p-3">Status</th>
                <th className="p-3">Actions</th>
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
                <tr key={b._id} className="border-t">
                  <td className="p-3">{b.car?.vehicleName}</td>
                  <td className="p-3">{b.guest?.firstName} {b.guest?.lastName}</td>
                  <td className="p-3">{new Date(b.pickupDate).toLocaleDateString()} → {new Date(b.returnDate).toLocaleDateString()}</td>
                  <td className="p-3">{formatCurrencyRWF ? formatCurrencyRWF(b.totalAmount || 0) : `RWF ${Number(b.totalAmount || 0).toLocaleString()}`}</td>
                  <td className="p-3"><span className="px-2 py-1 rounded bg-gray-100">{b.status}</span></td>
                  <td className="p-3 flex items-center gap-2">
                    {['pending','confirmed','active','completed','cancelled'].map(s => (
                      <button key={s} onClick={async () => {
                        const res = await fetch(`${API_URL}/api/car-bookings/${b._id}/status`, { method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: s }) });
                        const data = await res.json();
                        if (!res.ok) return toast.error(data.message || 'Failed');
                        setBookings(list => list.map(x => x._id === b._id ? data.booking : x));
                        toast.success('Status updated');
                      }} className="px-2 py-1 bg-blue-600 text-white rounded text-xs">{s}</button>
                    ))}
                    <button onClick={() => setReceiptBooking(b)} className="px-2 py-1 bg-green-600 text-white rounded text-xs">Receipt</button>
                    <a
                      href={`/messages?to=${b.guest?._id || ''}&bookingId=${b._id}`}
                      className="px-2 py-1 bg-gray-800 text-white rounded text-xs"
                    >
                      Message
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

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
