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
    // Manual direct booking add-ons: [{ label, amount }]
    directAddOns: [],
    finalAgreedAmount: '',
  });

  // Fetch properties owned by current host for selection (includes per-property add-on services)
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/properties/my-properties`, { credentials: 'include' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to load properties');
        const list = (data.properties || []).map(p => ({
          // Always normalize id to string so comparisons with form.propertyId work
          id: String(p._id || p.id || ''),
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
    const prop = properties.find(p => String(p.id) === String(form.propertyId));
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
  const selectedProperty = properties.find(p => String(p.id) === String(form.propertyId));
  const nightly = selectedRoom?.pricePerNight || selectedProperty?.pricePerNight || 0;
  const roomCharge = useMemo(() => (nights > 0 ? nightly * nights : 0), [nightly, nights]);
  // Manual direct-booking add-ons: sum all positive amounts
  const servicesTotal = useMemo(() => {
    if (!Array.isArray(form.directAddOns)) return 0;
    return form.directAddOns.reduce((sum, a) => {
      const amt = Number(a?.amount || 0);
      return sum + (isNaN(amt) || amt <= 0 ? 0 : amt);
    }, 0);
  }, [form.directAddOns]);

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

  const addDirectAddOnRow = () => {
    setForm(prev => ({
      ...prev,
      directAddOns: [...(prev.directAddOns || []), { label: '', amount: '' }]
    }));
  };

  const updateDirectAddOn = (index, field, value) => {
    setForm(prev => {
      const list = Array.isArray(prev.directAddOns) ? [...prev.directAddOns] : [];
      if (!list[index]) list[index] = { label: '', amount: '' };
      list[index] = { ...list[index], [field]: value };
      return { ...prev, directAddOns: list };
    });
  };

  const removeDirectAddOn = (index) => {
    setForm(prev => {
      const list = Array.isArray(prev.directAddOns) ? [...prev.directAddOns] : [];
      list.splice(index, 1);
      return { ...prev, directAddOns: list };
    });
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
        // Manual direct-booking add-ons (label + amount)
        directAddOns: (form.directAddOns || [])
          .filter(a => (a.label && String(a.label).trim()) || Number(a.amount || 0) > 0)
          .map(a => ({
            label: String(a.label || '').trim(),
            amount: Number(a.amount || 0) || 0,
          })),
        finalAgreedAmount: form.finalAgreedAmount ? Number(form.finalAgreedAmount) : undefined,
      };
      const res = await fetch(`${API_URL}/api/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create booking');

      const bookingId = data.booking && data.booking._id;
      toast.success('Direct booking created');

      if (bookingId) {
        const confirmPrint = window.confirm('Booking has been saved to reservations. Do you want to open the receipt now to print or save as PDF?');
        if (confirmPrint) {
          // Open owner receipt page which auto-triggers print; mark as direct for UI tweaks
          const url = `/receipt/${bookingId}?direct=true`;
          window.open(url, '_blank', 'noopener,noreferrer');
        } else {
          // Fallback: show confirmation screen
          navigate(`/booking-confirmation/${bookingId}`);
        }
      }
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
      directAddOns: [],
      finalAgreedAmount: '',
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
                    <option key={r._id} value={r._id}>
                      {[r.roomNumber || r.name || 'Room', r.roomType].filter(Boolean).join('  ')}
                    </option>
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Final agreed price (RWF)</label>
                <input
                  type="number"
                  min={0}
                  value={form.finalAgreedAmount}
                  onChange={e => update('finalAgreedAmount', e.target.value)}
                  className="w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Leave blank to use calculated total"
                />
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
              <div className="text-sm text-gray-700 space-y-2">
                <div>Room Rate: based on selected property, room and nights</div>
                <div className="mt-2 flex items-center justify-between">
                  <span>Direct add-ons (will be added on top of room total):</span>
                  <button
                    type="button"
                    onClick={addDirectAddOnRow}
                    className="px-2 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700"
                  >
                    + Add add-on
                  </button>
                </div>
                {(!Array.isArray(form.directAddOns) || form.directAddOns.length === 0) && (
                  <div className="text-xs text-gray-500">No direct add-ons yet. Use "+ Add add-on" to record extras like breakfast, transfer, etc.</div>
                )}
                {Array.isArray(form.directAddOns) && form.directAddOns.map((addOn, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center text-xs">
                    <input
                      type="text"
                      placeholder="Add-on description (e.g. Airport transfer)"
                      value={addOn.label || ''}
                      onChange={e => updateDirectAddOn(idx, 'label', e.target.value)}
                      className="col-span-7 border rounded px-2 py-1"
                    />
                    <input
                      type="number"
                      min={0}
                      placeholder="Amount"
                      value={addOn.amount}
                      onChange={e => updateDirectAddOn(idx, 'amount', e.target.value)}
                      className="col-span-4 border rounded px-2 py-1"
                    />
                    <button
                      type="button"
                      onClick={() => removeDirectAddOn(idx)}
                      className="col-span-1 text-red-500 hover:text-red-700"
                      aria-label="Remove add-on row"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <div className="pt-2 text-xs text-gray-700">
                  <div>Room subtotal: RWF {roomCharge.toLocaleString()}</div>
                  <div>Direct add-ons total: RWF {servicesTotal.toLocaleString()}</div>
                  <div>Hospitality levy (3%): RWF {levy3.toLocaleString()}</div>
                  <div className="font-semibold mt-1">TOTAL (room + add-ons + levy): RWF {grandTotal.toLocaleString()}</div>
                  {form.finalAgreedAmount && (
                    <div className="mt-1 text-[11px] text-gray-500">
                      Note: Final agreed amount overrides calculated totals for booking records, but direct add-ons are still shown on the receipt.
                    </div>
                  )}
                </div>
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
