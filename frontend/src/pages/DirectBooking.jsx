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
    guestInfo: { firstName: '', lastName: '', email: '', phone: '', nationality: '', passport: '', address: '' },
    contactInfo: { email: '', phone: '' },
    paymentStatusSelection: 'paid',
    services: { breakfast: false, airportTransfer: false, laundry: false },
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
          addOnServices: Array.isArray(p.addOnServices) ? p.addOnServices : [],
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
  const selectedProperty = properties.find(p => p.id === form.propertyId);
  const propertyAddOns = selectedProperty?.addOnServices || [];
  const nightly = selectedRoom?.pricePerNight || selectedProperty?.pricePerNight || 0;
  const roomCharge = useMemo(() => (nights > 0 ? nightly * nights : 0), [nightly, nights]);
  const servicesTotal = 0; // Add-ons are negotiable and do not affect payment totals
  const subtotal = useMemo(() => roomCharge + servicesTotal, [roomCharge, servicesTotal]);
  const levy3 = useMemo(() => Math.round(subtotal * 0.03), [subtotal]);
  // VAT removed for direct bookings – only levy applied
  const grandTotal = useMemo(() => subtotal + levy3, [subtotal, levy3]);

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
      const uiPaymentMethod = form.paymentMethod;
      const payloadPaymentMethod = uiPaymentMethod === 'mtn_mobile_money' ? 'mtn_mobile_money' : 'cash';
      const markPaid = form.paymentStatusSelection === 'paid';
      const payload = {
        propertyId: form.propertyId,
        room: form.roomId || null,
        checkIn: form.checkIn,
        checkOut: form.checkOut,
        numberOfGuests: Number(form.numberOfGuests) || 1,
        contactInfo: form.contactInfo,
        specialRequests: form.specialRequests,
        paymentMethod: payloadPaymentMethod,
        markPaid: payloadPaymentMethod === 'cash' ? !!markPaid : false,
        guestInfo: form.guestInfo,
        directBooking: true,
        // Info-only add-on services selected by host for this direct booking
        services: form.services || {},
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
      const id = data.booking._id;
      // Navigate to booking confirmation; receipt can be previewed & printed from the owner dashboard
      navigate(`/booking-confirmation/${id}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const saveDraft = () => {
    try {
      const draft = { ...form };
      localStorage.setItem('directBookingDraft', JSON.stringify(draft));
      toast.success('Saved as draft');
    } catch (_) {}
  };

  const clearForm = () => {
    setForm({
      propertyId: '',
      roomId: '',
      checkIn: '',
      checkOut: '',
      numberOfGuests: 1,
      paymentMethod: 'cash',
      markPaid: true,
      specialRequests: '',
      guestInfo: { firstName: '', lastName: '', email: '', phone: '', nationality: '', passport: '', address: '' },
      contactInfo: { email: '', phone: '' },
      paymentStatusSelection: 'paid',
      services: {},
    });
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
                  <option value="cash">Cash</option>
                  <option value="mtn_mobile_money">Mobile Money</option>
                  <option value="credit_card">Credit Card</option>
                  <option value="bank_transfer">Bank Transfer</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Status</label>
                <div className="flex items-center gap-4 h-full">
                  <label className="inline-flex items-center gap-2 text-sm"><input type="radio" name="paystatus" checked={form.paymentStatusSelection==='paid'} onChange={() => update('paymentStatusSelection','paid')} />Paid</label>
                  <label className="inline-flex items-center gap-2 text-sm"><input type="radio" name="paystatus" checked={form.paymentStatusSelection==='pending'} onChange={() => update('paymentStatusSelection','pending')} />Pending</label>
                  <label className="inline-flex items-center gap-2 text-sm"><input type="radio" name="paystatus" checked={form.paymentStatusSelection==='deposit'} onChange={() => update('paymentStatusSelection','deposit')} />Deposit</label>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Guest Info</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input placeholder="First name" value={form.guestInfo.firstName} onChange={e => update('guestInfo.firstName', e.target.value)} className="w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent" required />
                <input placeholder="Last name" value={form.guestInfo.lastName} onChange={e => update('guestInfo.lastName', e.target.value)} className="w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent" required />
                <input type="email" placeholder="Email" value={form.guestInfo.email} onChange={e => update('guestInfo.email', e.target.value)} className="w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                <input type="tel" placeholder="Phone" value={form.guestInfo.phone} onChange={e => update('guestInfo.phone', e.target.value)} className="w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                <input placeholder="Nationality" value={form.guestInfo.nationality} onChange={e => update('guestInfo.nationality', e.target.value)} className="w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                <input placeholder="Passport" value={form.guestInfo.passport} onChange={e => update('guestInfo.passport', e.target.value)} className="w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                <input placeholder="Address" value={form.guestInfo.address} onChange={e => update('guestInfo.address', e.target.value)} className="md:col-span-2 w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
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

            <div className="border rounded-lg p-4 bg-gray-50">
              <div className="text-sm text-gray-900 font-semibold mb-2">Payment Information</div>
              <div className="text-sm text-gray-700 space-y-1">
                <div>Room Rate: based on selected property, room and nights</div>
                <div className="mt-2">Additional Services (select for record only, amounts are negotiable and not added to total):</div>
                {(!Array.isArray(propertyAddOns) || propertyAddOns.length === 0) && (
                  <div className="text-xs text-gray-500">No add-on services configured for this property.</div>
                )}
                {Array.isArray(propertyAddOns) && propertyAddOns.map(addOn => {
                  const key = addOn.key;
                  const checked = !!(form.services && form.services[key]);
                  const included = addOn.includedItems && typeof addOn.includedItems === 'object'
                    ? Object.keys(addOn.includedItems)
                        .filter(k => addOn.includedItems[k])
                        .map(k => k.replace(/_/g, ' ').replace(/\s+/g, ' ').trim().replace(/^(.)/, m => m.toUpperCase()))
                    : [];
                  const isFree = !addOn.price || Number(addOn.price) <= 0;
                  return (
                    <div key={key} className="space-y-0.5">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={e => update('services', { ...(form.services || {}), [key]: e.target.checked })}
                        />
                        <span>{addOn.name}</span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${isFree ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                          {isFree ? 'Free' : 'Paid (negotiable)'}
                        </span>
                      </label>
                      {included.length > 0 && (
                        <div className="pl-6 text-xs text-gray-500">Includes: {included.join(', ')}</div>
                      )}
                    </div>
                  );
                })}
                <div className="pt-2">Subtotal: calculated automatically</div>
                <div>Hospitality levy (3%): calculated automatically</div>
                <div className="font-semibold">TOTAL: calculated automatically</div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t pt-4">
              <button type="button" onClick={saveDraft} className="px-5 py-3 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100">Save as Draft</button>
              <button type="button" onClick={clearForm} className="px-5 py-3 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100">Clear Form</button>
              <button type="submit" disabled={loading} className="px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-50">{loading ? 'Creating…' : 'Save & Print Receipt'}</button>
            </div>

            <div className="mt-4 text-xs text-gray-500">
              After creation, you can always re-open the printable PDF receipt from the owner dashboard bookings list.
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default DirectBooking;
