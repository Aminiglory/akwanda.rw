import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function CarDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [car, setCar] = useState(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [booking, setBooking] = useState(false);
  const today = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [form, setForm] = useState({
    pickupDate: '',
    returnDate: '',
    pickupLocation: '',
    returnLocation: ''
  });
  const [available, setAvailable] = useState(null);
  const [otherCars, setOtherCars] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_URL}/api/cars/${id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to load car');
        setCar(data.car);
        setForm(f => ({ ...f, pickupLocation: data.car?.location || '', returnLocation: data.car?.location || '' }));
        // Load other cars
        const others = await fetch(`${API_URL}/api/cars?location=${encodeURIComponent(data.car.location || '')}&type=${encodeURIComponent(data.car.vehicleType || '')}`);
        const othersData = await others.json();
        if (others.ok) setOtherCars((othersData.cars || []).filter(c => c._id !== id).slice(0, 6));
      } catch (e) {
        toast.error(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

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
      if (data.available) toast.success('Available for selected dates'); else toast.error('Not available');
    } catch (e) { toast.error(e.message); } finally { setChecking(false); }
  }

  async function createBooking() {
    if (!form.pickupDate || !form.returnDate || !form.pickupLocation) return toast.error('Fill booking fields');
    try {
      setBooking(true);
      const res = await fetch(`${API_URL}/api/car-bookings`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ carId: id, ...form })
      });
      if (res.status === 401) {
        toast.error('Please login to book');
        navigate('/login');
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Booking failed');
      toast.success('Booking created');
      // Open chat with the owner, passing booking context
      if (car?.owner && data?.booking?._id) {
        navigate(`/messages?to=${car.owner}&bookingId=${data.booking._id}`);
      } else {
        navigate('/user-dashboard');
      }
    } catch (e) { toast.error(e.message); } finally { setBooking(false); }
  }

  if (loading) return <div className="max-w-6xl mx-auto px-4 py-6">Loading...</div>;
  if (!car) return <div className="max-w-6xl mx-auto px-4 py-6">Car not found</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {/* Gallery */}
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-3 h-64 bg-gray-100 rounded overflow-hidden">
              {car.images?.[0] && (
                <img src={`${API_URL}${car.images[0]}`} className="w-full h-full object-cover" />
              )}
            </div>
            {car.images?.slice(1, 7).map((img, i) => (
              <div key={i} className="h-28 bg-gray-100 rounded overflow-hidden">
                <img src={`${API_URL}${img}`} className="w-full h-full object-cover" />
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
          </div>
        </div>

        {/* Booking card */}
        <div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-xl font-semibold">{car.pricePerDay} {car.currency}/day</div>
            <div className="grid grid-cols-1 gap-3 mt-3">
              <div>
                <label className="text-sm text-gray-700">Pickup date</label>
                <input type="date" min={today} value={form.pickupDate} onChange={e => setForm({ ...form, pickupDate: e.target.value })} className="w-full px-3 py-2 border rounded" />
              </div>
              <div>
                <label className="text-sm text-gray-700">Return date</label>
                <input type="date" min={form.pickupDate || today} value={form.returnDate} onChange={e => setForm({ ...form, returnDate: e.target.value })} className="w-full px-3 py-2 border rounded" />
              </div>
              <div>
                <label className="text-sm text-gray-700">Pickup location</label>
                <input value={form.pickupLocation} onChange={e => setForm({ ...form, pickupLocation: e.target.value })} className="w-full px-3 py-2 border rounded" />
              </div>
              <div>
                <label className="text-sm text-gray-700">Return location</label>
                <input value={form.returnLocation} onChange={e => setForm({ ...form, returnLocation: e.target.value })} className="w-full px-3 py-2 border rounded" />
              </div>
              <div className="flex items-center gap-2">
                <button disabled={checking} onClick={checkAvailability} className="px-3 py-2 bg-gray-800 text-white rounded">{checking ? 'Checking...' : 'Check availability'}</button>
                {available !== null && (
                  <span className={`text-sm ${available ? 'text-green-600' : 'text-red-600'}`}>{available ? 'Available' : 'Not available'}</span>
                )}
              </div>
              <button disabled={booking} onClick={createBooking} className="px-4 py-2 bg-blue-600 text-white rounded">{booking ? 'Booking...' : 'Book now'}</button>
            </div>
          </div>
        </div>
      </div>

      {/* Other cars */}
      {otherCars.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-3">Other cars you might like</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {otherCars.map(c => (
              <a key={c._id} href={`/cars/${c._id}`} className="bg-white rounded-lg shadow p-3">
                <div className="w-full h-28 bg-gray-100 rounded overflow-hidden">
                  {c.images?.[0] ? <img src={`${API_URL}${c.images[0]}`} className="w-full h-full object-cover" /> : null}
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
