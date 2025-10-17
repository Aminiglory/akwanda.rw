import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const DirectBooking = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [properties, setProperties] = useState([]);
  const [rooms, setRooms] = useState([]);

  const [form, setForm] = useState({
    propertyId: '',
    roomId: '',
    checkIn: '',
    checkOut: '',
    numberOfGuests: 1,
    paymentMethod: 'cash',
    markPaid: true,
    specialRequests: '',
    guestInfo: { firstName: '', lastName: '', email: '', phone: '' },
    contactInfo: { email: '', phone: '' },
  });

  // Fetch properties owned by current host for selection
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/properties/mine`, { credentials: 'include' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to load properties');
        const list = (data.properties || []).map(p => ({
          id: p._id,
          title: p.title,
          address: p.address,
          city: p.city,
          rooms: p.rooms || [],
          pricePerNight: p.pricePerNight,
        }));
        setProperties(list);
      } catch (e) {
        toast.error(e.message);
      }
    })();
  }, []);

  // Set rooms when property changes
  useEffect(() => {
    const prop = properties.find(p => p.id === form.propertyId);
    setRooms(prop ? (prop.rooms || []) : []);
    if (!prop) setForm(prev => ({ ...prev, roomId: '' }));
  }, [form.propertyId, properties]);

  const nights = useMemo(() => {
    if (!form.checkIn || !form.checkOut) return 0;
    const s = new Date(form.checkIn), e = new Date(form.checkOut);
    const n = Math.ceil((e - s) / (1000 * 60 * 60 * 24));
    return isNaN(n) ? 0 : Math.max(0, n);
  }, [form.checkIn, form.checkOut]);

  const selectedRoom = rooms.find(r => String(r._id) === String(form.roomId));
  const nightly = selectedRoom?.pricePerNight || properties.find(p => p.id === form.propertyId)?.pricePerNight || 0;
  const estimatedTotal = useMemo(() => (nights > 0 ? nightly * nights : 0), [nightly, nights]);

  const update = (path, value) => {
    if (path.includes('.')) {
      const [a, b] = path.split('.');
      setForm(prev => ({ ...prev, [a]: { ...prev[a], [b]: value } }));
    } else {
      setForm(prev => ({ ...prev, [path]: value }));
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.propertyId || !form.checkIn || !form.checkOut) {
      toast.error('Please select property and dates');
      return;
    }
    try {
      setLoading(true);
      const payload = {
        propertyId: form.propertyId,
        room: form.roomId || null,
        checkIn: form.checkIn,
        checkOut: form.checkOut,
        numberOfGuests: Number(form.numberOfGuests) || 1,
        contactInfo: form.contactInfo,
        specialRequests: form.specialRequests,
        paymentMethod: form.paymentMethod,
        markPaid: form.paymentMethod === 'cash' ? !!form.markPaid : false,
        guestInfo: form.guestInfo, // creates/uses guest if host/admin
        directBooking: true,
      };
      const res = await fetch(`${API_URL}/api/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create booking');

      toast.success('Direct booking created');
      // Provide quick-access to direct receipt (no tax/commission lines)
      const id = data.booking._id;
      window.open(`${API_URL}/api/bookings/${id}/direct-receipt.csv`, '_blank');
      navigate(`/booking-confirmation/${id}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        <div className="bg-white rounded-2xl shadow p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Direct Booking</h1>
          <p className="text-gray-600 mb-6">Create a booking on behalf of a guest. Receipts are generated automatically.</p>

          <form onSubmit={submit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Property</label>
              <select
                value={form.propertyId}
                onChange={(e) => update('propertyId', e.target.value)}
                className="w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Select property…</option>
                {properties.map(p => (
                  <option key={p.id} value={p.id}>{p.title} — {p.city}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Room (optional)</label>
                <select
                  value={form.roomId}
                  onChange={(e) => update('roomId', e.target.value)}
                  className="w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Any room</option>
                  {rooms.map(r => (
                    <option key={r._id} value={r._id}>{r.roomNumber || r.roomType || 'Room'}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Check-in</label>
                <input type="date" value={form.checkIn} onChange={e => update('checkIn', e.target.value)} className="w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Check-out</label>
                <input type="date" value={form.checkOut} onChange={e => update('checkOut', e.target.value)} className="w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent" required />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Guests</label>
                <input type="number" min={1} value={form.numberOfGuests} onChange={e => update('numberOfGuests', e.target.value)} className="w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                <select value={form.paymentMethod} onChange={e => update('paymentMethod', e.target.value)} className="w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="cash">Pay on Arrival</option>
                  <option value="mtn_mobile_money">MTN Mobile Money</option>
                </select>
              </div>
              {form.paymentMethod === 'cash' && (
                <div className="flex items-end">
                  <label className="inline-flex items-center space-x-2">
                    <input type="checkbox" checked={form.markPaid} onChange={e => update('markPaid', e.target.checked)} />
                    <span className="text-sm">Mark as paid</span>
                  </label>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Guest Info</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input placeholder="First name" value={form.guestInfo.firstName} onChange={e => update('guestInfo.firstName', e.target.value)} className="w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent" required />
                <input placeholder="Last name" value={form.guestInfo.lastName} onChange={e => update('guestInfo.lastName', e.target.value)} className="w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent" required />
                <input type="email" placeholder="Email" value={form.guestInfo.email} onChange={e => update('guestInfo.email', e.target.value)} className="w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                <input type="tel" placeholder="Phone" value={form.guestInfo.phone} onChange={e => update('guestInfo.phone', e.target.value)} className="w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <p className="text-xs text-gray-500 mt-1">A guest account will be linked or created automatically if necessary.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Info (for booking records)</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="email" placeholder="Contact email" value={form.contactInfo.email} onChange={e => update('contactInfo.email', e.target.value)} className="w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                <input type="tel" placeholder="Contact phone" value={form.contactInfo.phone} onChange={e => update('contactInfo.phone', e.target.value)} className="w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Special Requests</label>
              <textarea value={form.specialRequests} onChange={e => update('specialRequests', e.target.value)} rows={3} className="w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Any special notes..."></textarea>
            </div>

            <div className="flex items-center justify-between border-t pt-4">
              <div className="text-sm text-gray-700">
                <div>Nights: <span className="font-medium">{nights}</span></div>
                <div>Nightly: <span className="font-medium">RWF {nightly.toLocaleString()}</span></div>
                <div>Estimated Total: <span className="font-semibold text-blue-600">RWF {estimatedTotal.toLocaleString()}</span></div>
              </div>
              <button type="submit" disabled={loading} className="px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-50">
                {loading ? 'Creating…' : 'Create Booking'}
              </button>
            </div>

            <div className="mt-4 text-xs text-gray-500">
              After creation, view receipts at:
              <ul className="list-disc ml-5 mt-1">
                <li>/api/bookings/:id/receipt (Owner receipt JSON)</li>
                <li>/api/bookings/:id/receipt.csv (Owner receipt CSV)</li>
                <li>/api/bookings/:id/rra-receipt (RRA receipt JSON)</li>
                <li>/api/bookings/:id/rra-receipt.csv (RRA receipt CSV)</li>
              </ul>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default DirectBooking;
