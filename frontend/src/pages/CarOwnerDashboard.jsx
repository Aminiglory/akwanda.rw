import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function CarOwnerDashboard() {
  const { user } = useAuth();
  const [cars, setCars] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const emptyCar = useMemo(() => ({
    vehicleName: '', vehicleType: 'economy', brand: '', model: '', year: new Date().getFullYear(),
    licensePlate: '', capacity: 4, pricePerDay: 0, pricePerWeek: '', pricePerMonth: '',
    currency: 'RWF', isAvailable: true, location: '', images: [], features: [], fuelType: 'petrol', transmission: 'automatic', mileage: ''
  }), []);
  const [form, setForm] = useState(emptyCar);
  const [uploadingId, setUploadingId] = useState(null);

  async function loadData() {
    try {
      setLoading(true);
      const [carsRes, bookingsRes] = await Promise.all([
        fetch(`${API_URL}/api/cars/mine`, { credentials: 'include' }),
        fetch(`${API_URL}/api/car-bookings/for-my-cars`, { credentials: 'include' })
      ]);
      const carsData = await carsRes.json();
      const bookingsData = await bookingsRes.json();
      if (!carsRes.ok) throw new Error(carsData.message || 'Failed to load cars');
      if (!bookingsRes.ok) throw new Error(bookingsData.message || 'Failed to load bookings');
      setCars(carsData.cars || []);
      setBookings(bookingsData.bookings || []);
    } catch (e) { toast.error(e.message); } finally { setLoading(false); }
  }

  useEffect(() => { loadData(); }, []);

  function resetForm() { setForm(emptyCar); }

  async function createCar(e) {
    e.preventDefault();
    try {
      if (user?.isBlocked) { toast.error('Your account is deactivated. Creating cars is disabled.'); return; }
      setSaving(true);
      const res = await fetch(`${API_URL}/api/cars`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create');
      setCars(c => [data.car, ...c]);
      toast.success('Car created');
      resetForm();
    } catch (e) { toast.error(e.message); } finally { setSaving(false); }
  }

  async function updateCar(id, patch) {
    try {
      if (user?.isBlocked) { toast.error('Your account is deactivated. Updates are disabled.'); return; }
      const res = await fetch(`${API_URL}/api/cars/${id}`, {
        method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Update failed');
      setCars(list => list.map(c => c._id === id ? data.car : c));
      toast.success('Car updated');
    } catch (e) { toast.error(e.message); }
  }

  async function deleteCar(id) {
    if (!confirm('Delete this car?')) return;
    try {
      if (user?.isBlocked) { toast.error('Your account is deactivated. Delete is disabled.'); return; }
      const res = await fetch(`${API_URL}/api/cars/${id}`, { method: 'DELETE', credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Delete failed');
      setCars(list => list.filter(c => c._id !== id));
      toast.success('Car deleted');
    } catch (e) { toast.error(e.message); }
  }

  async function uploadImages(id, files) {
    if (!files?.length) return;
    try {
      if (user?.isBlocked) { toast.error('Your account is deactivated. Uploads are disabled.'); return; }
      setUploadingId(id);
      const formData = new FormData();
      Array.from(files).forEach(f => formData.append('images', f));
      const res = await fetch(`${API_URL}/api/cars/${id}/images`, { method: 'POST', credentials: 'include', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Upload failed');
      setCars(list => list.map(c => c._id === id ? data.car : c));
      toast.success('Images uploaded');
    } catch (e) { toast.error(e.message); } finally { setUploadingId(null); }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {user?.isBlocked && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          Your account is deactivated. Car management is disabled until reactivated.
        </div>
      )}
      <h1 className="text-2xl font-bold text-gray-900 mb-4">My Cars</h1>

      {/* Create Car */}
      <form onSubmit={createCar} className="bg-white rounded-lg shadow p-4 mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <input className="px-3 py-2 border rounded" placeholder="Vehicle Name" value={form.vehicleName} onChange={e => setForm({ ...form, vehicleName: e.target.value })} />
        <select className="px-3 py-2 border rounded" value={form.vehicleType} onChange={e => setForm({ ...form, vehicleType: e.target.value })}>
          {['economy','compact','mid-size','full-size','luxury','suv','minivan'].map(x => <option key={x} value={x}>{x}</option>)}
        </select>
        <input className="px-3 py-2 border rounded" placeholder="Brand" value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} />
        <input className="px-3 py-2 border rounded" placeholder="Model" value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} />
        <input className="px-3 py-2 border rounded" type="number" placeholder="Year" value={form.year} onChange={e => setForm({ ...form, year: Number(e.target.value) })} />
        <input className="px-3 py-2 border rounded" placeholder="License Plate" value={form.licensePlate} onChange={e => setForm({ ...form, licensePlate: e.target.value })} />
        <input className="px-3 py-2 border rounded" type="number" placeholder="Capacity" value={form.capacity} onChange={e => setForm({ ...form, capacity: Number(e.target.value) })} />
        <input className="px-3 py-2 border rounded" type="number" placeholder="Price/Day" value={form.pricePerDay} onChange={e => setForm({ ...form, pricePerDay: Number(e.target.value) })} />
        <input className="px-3 py-2 border rounded" placeholder="Location" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
        <select className="px-3 py-2 border rounded" value={form.transmission} onChange={e => setForm({ ...form, transmission: e.target.value })}>
          {['automatic','manual'].map(x => <option key={x} value={x}>{x}</option>)}
        </select>
        <select className="px-3 py-2 border rounded" value={form.fuelType} onChange={e => setForm({ ...form, fuelType: e.target.value })}>
          {['petrol','diesel','hybrid','electric'].map(x => <option key={x} value={x}>{x}</option>)}
        </select>
        <div className="flex items-center gap-2">
          <label className="text-sm">Available</label>
          <input type="checkbox" checked={!!form.isAvailable} onChange={e => setForm({ ...form, isAvailable: !!e.target.checked })} />
        </div>
        <div className="md:col-span-3">
          <button disabled={saving || user?.isBlocked} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50">{saving ? 'Saving...' : 'Add Car'}</button>
        </div>
      </form>

      {/* Cars List */}
      {loading ? <div>Loading...</div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {cars.map(car => (
            <div key={car._id} className="bg-white rounded-lg shadow p-4">
              <div className="flex gap-4">
                <div className="w-32 h-24 bg-gray-100 rounded overflow-hidden">
                  {car.images?.[0] ? <img src={`${API_URL}${car.images[0]}`} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-400">No image</div>}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{car.vehicleName} • {car.brand} {car.model}</h3>
                    <button onClick={() => updateCar(car._id, { isAvailable: !car.isAvailable })} className={`px-2 py-1 rounded text-sm ${car.isAvailable ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'}`}>{car.isAvailable ? 'Available' : 'Unavailable'}</button>
                  </div>
                  <p className="text-sm text-gray-600">{car.location} • {car.vehicleType} • {car.transmission}</p>
                  <p className="text-sm font-medium mt-1">{car.pricePerDay} {car.currency}/day</p>
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
                    <img key={i} src={`${API_URL}${img}`} className="w-full h-20 object-cover rounded" />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Bookings */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-2">Bookings</h2>
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="p-3">Car</th>
                <th className="p-3">Renter</th>
                <th className="p-3">Dates</th>
                <th className="p-3">Amount</th>
                <th className="p-3">Status</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map(b => (
                <tr key={b._id} className="border-t">
                  <td className="p-3">{b.car?.vehicleName}</td>
                  <td className="p-3">{b.guest?.firstName} {b.guest?.lastName}</td>
                  <td className="p-3">{new Date(b.pickupDate).toLocaleDateString()} → {new Date(b.returnDate).toLocaleDateString()}</td>
                  <td className="p-3">{b.totalAmount}</td>
                  <td className="p-3"><span className="px-2 py-1 rounded bg-gray-100">{b.status}</span></td>
                  <td className="p-3 flex items-center gap-2">
                    {['pending','confirmed','active'].map(s => (
                      <button key={s} onClick={async () => {
                        const res = await fetch(`${API_URL}/api/car-bookings/${b._id}/status`, { method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: s }) });
                        const data = await res.json();
                        if (!res.ok) return toast.error(data.message || 'Failed');
                        setBookings(list => list.map(x => x._id === b._id ? data.booking : x));
                        toast.success('Status updated');
                      }} className="px-2 py-1 bg-blue-600 text-white rounded text-xs">{s}</button>
                    ))}
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
    </div>
  );
}
