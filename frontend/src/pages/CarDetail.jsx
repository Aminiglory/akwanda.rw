import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FaMapMarkerAlt, FaCalendarAlt, FaHeart, FaClock } from 'react-icons/fa';
import { useLocale } from '../contexts/LocaleContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const makeAbsolute = (u) => {
  if (!u) return null;
  let s = String(u).trim().replace(/\\+/g, '/');
  if (/^https?:\/\//i.test(s)) return s;
  if (!s.startsWith('/')) s = `/${s}`;
  return `${API_URL}${s}`;
};

export default function CarDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, formatCurrencyRWF } = useLocale() || {};
  const [car, setCar] = useState(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [booking, setBooking] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash'); // 'cash' | 'mtn_mobile_money'
  const today = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [form, setForm] = useState({
    pickupDate: '',
    returnDate: '',
    pickupLocation: '',
    returnLocation: '',
    pickupTime: '',
    returnTime: '',
    withDriver: false,
    driverAge: '',
    contactPhone: '',
    specialRequests: ''
  });
  const [available, setAvailable] = useState(null);
  const [otherCars, setOtherCars] = useState([]);
  const [favIds, setFavIds] = useState([]);

  const tripSummary = useMemo(() => {
    if (!form.pickupDate || !form.returnDate) return { days: 0, total: 0 };
    const start = new Date(form.pickupDate);
    const end = new Date(form.returnDate);
    const ms = end - start;
    if (!Number.isFinite(ms) || ms <= 0) return { days: 0, total: 0 };
    const days = Math.ceil(ms / (24 * 60 * 60 * 1000));
    const daily = Number(car?.pricePerDay || 0);
    const total = days * daily;
    return { days, total };
  }, [form.pickupDate, form.returnDate, car?.pricePerDay]);

  useEffect(() => {
    try {
      const usp = new URLSearchParams(window.location.search);
      const pickupLocation = usp.get('pickupLocation') || '';
      const returnLocation = usp.get('returnLocation') || '';
      const pickupDate = usp.get('pickupDate') || '';
      const returnDate = usp.get('returnDate') || '';
      const pickupTime = usp.get('pickupTime') || '';
      const returnTime = usp.get('returnTime') || '';
      if (pickupLocation || returnLocation || pickupDate || returnDate || pickupTime || returnTime) {
        setForm(prev => ({
          ...prev,
          pickupLocation: pickupLocation || prev.pickupLocation,
          returnLocation: returnLocation || prev.returnLocation || pickupLocation || prev.returnLocation,
          pickupDate: pickupDate || prev.pickupDate,
          returnDate: returnDate || prev.returnDate,
          pickupTime: pickupTime || prev.pickupTime,
          returnTime: returnTime || prev.returnTime
        }));
      }
    } catch {}
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_URL}/api/cars/${id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || '');
        setCar(data.car);
        setForm(f => ({
          ...f,
          pickupLocation: f.pickupLocation || data.car?.location || '',
          returnLocation: f.returnLocation || data.car?.location || ''
        }));
        // Load other cars
        const others = await fetch(`${API_URL}/api/cars?location=${encodeURIComponent(data.car.location || '')}&type=${encodeURIComponent(data.car.vehicleType || '')}`);
        const othersData = await others.json();
        if (others.ok) setOtherCars((othersData.cars || []).filter(c => c._id !== id).slice(0, 6));
      } catch (e) {
        // Silent empty state
        setCar(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('car-favorites');
      const list = raw ? JSON.parse(raw) : [];
      setFavIds(Array.isArray(list) ? list : []);
    } catch { setFavIds([]); }
  }, []);

  function toggleFavorite() {
    const pid = String(id);
    const set = new Set(favIds);
    if (set.has(pid)) set.delete(pid); else set.add(pid);
    const next = Array.from(set);
    setFavIds(next);
    localStorage.setItem('car-favorites', JSON.stringify(next));
  }

  async function checkAvailability() {
    if (!form.pickupDate || !form.returnDate) return toast.error('Select pickup and return dates');
    try {
      setChecking(true);
      const res = await fetch(`${API_URL}/api/cars/${id}/availability`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pickupDate: form.pickupDate, returnDate: form.returnDate })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to check');
      setAvailable(!!data.available);
      if (data.available) toast.success(t ? t('vehicleDetail.available') : 'Available'); else toast.error(t ? t('vehicleDetail.notAvailable') : 'Not available');
    } catch (e) { toast.error(e.message); } finally { setChecking(false); }
  }

  async function createBooking() {
    if (!form.pickupDate || !form.returnDate || !form.pickupLocation) return toast.error('Fill booking fields');
    try {
      setBooking(true);
      const payload = { carId: id, ...form, paymentMethod };
      if (payload.driverAge) {
        payload.driverAge = Number(payload.driverAge);
      }
      const res = await fetch(`${API_URL}/api/car-bookings`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.status === 401) {
        toast.error('Please login to book');
        navigate('/login');
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Booking failed');
      // If MTN selected, go to payment page
      if (paymentMethod === 'mtn_mobile_money' && data?.booking?._id) {
        toast.success('Redirecting to payment...');
        navigate('/mtn-payment', {
          state: {
            bookingId: data.booking._id,
            amount: Number(data.booking.totalAmount || 0),
            description: `Vehicle rental for ${car?.vehicleName || 'your trip'}`,
            customerName: data.booking?.guestName || '',
            customerEmail: data.booking?.guestEmail || '',
            phoneNumber: data.booking?.guestPhone || ''
          }
        });
        return;
      }
      toast.success('Booking created');
      if (car?.owner && data?.booking?._id) {
        navigate(`/messages?to=${car.owner}&bookingId=${data.booking._id}`);
      } else {
        navigate('/user-dashboard');
      }
    } catch (e) { toast.error(e.message); } finally { setBooking(false); }
  }

  if (loading) return <div className="max-w-6xl mx-auto px-4 py-6">Loading...</div>;
  if (!car) return <div className="max-w-6xl mx-auto px-4 py-6">Vehicle not found</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {/* Gallery */}
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-3 h-64 bg-gray-100 rounded overflow-hidden">
              {car.images?.[0] && (
                <div className="relative w-full h-full">
                  <img src={makeAbsolute(car.images[0])} className="w-full h-full object-cover" />
                  <button onClick={toggleFavorite} title="Add to favorites" className={`absolute top-3 right-3 p-2 rounded-full shadow ${favIds.includes(String(id)) ? 'bg-red-600 text-white' : 'bg-white text-red-600'}`}>
                    <FaHeart />
                  </button>
                </div>
              )}
            </div>
            {car.images?.slice(1, 7).map((img, i) => (
              <div key={i} className="h-28 bg-gray-100 rounded overflow-hidden">
                <img src={makeAbsolute(img)} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>

          {/* Details */}
          <div className="mt-4 bg-white rounded-lg shadow p-4">
            <h1 className="text-2xl font-bold">{car.vehicleName} • {car.brand} {car.model}</h1>
            <p className="text-gray-600 mt-1">{car.location} • {car.vehicleType} • {car.transmission} • {car.fuelType}</p>
            <div className="mt-3 text-sm text-gray-700">Capacity: {car.capacity} • Year: {car.year} • Mileage: {car.mileage || '—'}</div>
            {car.features?.length > 0 && (
              <div className="mt-3">
                <div className="font-semibold">Features</div>
                <div className="flex flex-wrap gap-2 mt-1">
                  {car.features.map((f, i) => (
                    <span key={i} className="px-2 py-1 text-xs rounded bg-gray-100">{f}</span>
                  ))}
                </div>
              </div>
            )}
            {(car.fuelPolicy || car.mileageLimitPerDayKm || car.cancellationPolicy || car.depositInfo) && (
              <div className="mt-4">
                <div className="font-semibold">Rental policies</div>
                <div className="mt-1 text-sm text-gray-700 space-y-1">
                  {car.fuelPolicy && <div>Fuel: {car.fuelPolicy}</div>}
                  {typeof car.mileageLimitPerDayKm === 'number' && car.mileageLimitPerDayKm > 0 && (
                    <div>Mileage: {car.mileageLimitPerDayKm} km per day included</div>
                  )}
                  {car.cancellationPolicy && <div>Cancellation: {car.cancellationPolicy}</div>}
                  {car.depositInfo && <div>Deposit: {car.depositInfo}</div>}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Booking card */}
        <div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-xl font-semibold">{formatCurrencyRWF ? formatCurrencyRWF(car.pricePerDay) : `RWF ${Number(car.pricePerDay || 0).toLocaleString()}`} / {t ? t('vehicleDetail.pricePerDay') : 'per day'}</div>
            {tripSummary.days > 0 && (
              <div className="mt-1 text-sm text-gray-700">
                Trip: {tripSummary.days} {tripSummary.days === 1 ? 'day' : 'days'} • {formatCurrencyRWF ? formatCurrencyRWF(tripSummary.total || 0) : `RWF ${Number(tripSummary.total || 0).toLocaleString()}`}
              </div>
            )}
            <div className="grid grid-cols-1 gap-3 mt-3">
              <div>
                <label className="text-sm text-gray-700">{t ? t('vehicleDetail.pickupDate') : 'Pickup date'}</label>
                <div className="relative">
                  <FaCalendarAlt className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input id="pickupDate" type="date" min={today} value={form.pickupDate} onChange={e => setForm({ ...form, pickupDate: e.target.value })} className="w-full pl-10 px-3 py-2 border rounded" />
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-700">{t ? t('vehicleDetail.returnDate') : 'Return date'}</label>
                <div className="relative">
                  <FaCalendarAlt className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input id="returnDate" type="date" min={form.pickupDate || today} value={form.returnDate} onChange={e => setForm({ ...form, returnDate: e.target.value })} className="w-full pl-10 px-3 py-2 border rounded" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-gray-700">{t ? t('vehicleDetail.pickupTime') : 'Pickup time'}</label>
                  <div className="relative">
                    <FaClock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="time" value={form.pickupTime} onChange={e => setForm({ ...form, pickupTime: e.target.value })} className="w-full pl-10 px-3 py-2 border rounded" />
                  </div>
                </div>
                <div>
                  <label className="text-sm text-gray-700">{t ? t('vehicleDetail.returnTime') : 'Return time'}</label>
                  <div className="relative">
                    <FaClock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="time" value={form.returnTime} onChange={e => setForm({ ...form, returnTime: e.target.value })} className="w-full pl-10 px-3 py-2 border rounded" />
                  </div>
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-700">{t ? t('vehicleDetail.pickupLocation') : 'Pickup location'}</label>
                <input value={form.pickupLocation} onChange={e => setForm({ ...form, pickupLocation: e.target.value })} className="w-full px-3 py-2 border rounded" />
              </div>
              <div>
                <label className="text-sm text-gray-700">{t ? t('vehicleDetail.returnLocation') : 'Return location'}</label>
                <input value={form.returnLocation} onChange={e => setForm({ ...form, returnLocation: e.target.value })} className="w-full px-3 py-2 border rounded" />
              </div>
              <div>
                <label className="text-sm text-gray-700">Trip type</label>
                <div className="mt-1 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, withDriver: false })}
                    className={`px-3 py-2 rounded border text-sm ${!form.withDriver ? 'bg-[#a06b42] text-white border-[#a06b42]' : 'bg-[#f6e9d8] text-[#4b2a00] border-[#d4c4b0]'}`}
                  >
                    Self-drive
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, withDriver: true })}
                    className={`px-3 py-2 rounded border text-sm ${form.withDriver ? 'bg-[#a06b42] text-white border-[#a06b42]' : 'bg-[#f6e9d8] text-[#4b2a00] border-[#d4c4b0]'}`}
                  >
                    With driver
                  </button>
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-700">Main driver age</label>
                <input
                  type="number"
                  min={18}
                  max={80}
                  value={form.driverAge}
                  onChange={e => setForm({ ...form, driverAge: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              <div>
                <label className="text-sm text-gray-700">Contact phone</label>
                <input
                  value={form.contactPhone}
                  onChange={e => setForm({ ...form, contactPhone: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              <div>
                <label className="text-sm text-gray-700">Notes for the host</label>
                <textarea
                  rows={2}
                  value={form.specialRequests}
                  onChange={e => setForm({ ...form, specialRequests: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              <div className="flex items-center gap-2">
                <button disabled={checking} onClick={checkAvailability} className="px-3 py-2 bg-[#a06b42] hover:bg-[#8f5a32] text-white rounded">{checking ? 'Checking...' : (t ? t('vehicleDetail.checkAvailability') : 'Check availability')}</button>
                {available !== null && (
                  <span className={`text-sm ${available ? 'text-green-600' : 'text-red-600'}`}>{available ? (t ? t('vehicleDetail.available') : 'Available') : (t ? t('vehicleDetail.notAvailable') : 'Not available')}</span>
                )}
              </div>
              {/* Payment choice */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  className={`px-3 py-2 rounded border ${paymentMethod==='cash' ? 'bg-[#a06b42] text-white border-[#a06b42]' : 'bg-[#f6e9d8] text-[#4b2a00] border-[#d4c4b0] hover:bg-[#e8dcc8]'}`}
                >
                  {t ? t('vehicleDetail.payOnPickup') : 'Pay on Pickup'}
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('mtn_mobile_money')}
                  className={`px-3 py-2 rounded border ${paymentMethod==='mtn_mobile_money' ? 'bg-[#a06b42] text-white border-[#a06b42]' : 'bg-[#f6e9d8] text-[#4b2a00] border-[#d4c4b0] hover:bg-[#e8dcc8]'}`}
                >
                  {t ? t('vehicleDetail.payWithMTN') : 'MTN Mobile Money'}
                </button>
              </div>
              <button disabled={booking} onClick={createBooking} className="px-4 py-2 bg-[#a06b42] hover:bg-[#8f5a32] text-white rounded">{booking ? 'Booking...' : (t ? t('vehicleDetail.bookNow') : 'Book now')}</button>
            </div>
          </div>
        </div>
      </div>

      {/* Other cars */}
      {otherCars.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-3">{t ? t('vehicleDetail.otherYouMightLike') : 'Other vehicles you might like'}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {otherCars.map(c => (
              <a key={c._id} href={`/cars/${c._id}`} className="bg-white rounded-lg shadow p-3">
                <div className="w-full h-28 bg-gray-100 rounded overflow-hidden">
                  {c.images?.[0] ? <img src={makeAbsolute(c.images[0])} className="w-full h-full object-cover" /> : null}
                </div>
                <div className="mt-2 text-sm font-medium">{c.vehicleName}</div>
                <div className="text-xs text-gray-600">{c.location} • {c.vehicleType}</div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
