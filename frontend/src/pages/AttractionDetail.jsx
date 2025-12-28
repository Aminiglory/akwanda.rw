import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FaMapMarkerAlt, FaCalendarAlt } from 'react-icons/fa';
import { useLocale } from '../contexts/LocaleContext';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const makeAbsolute = (u) => {
  if (!u) return null;
  let s = String(u).trim().replace(/\\+/g, '/');
  if (/^https?:\/\//i.test(s)) return s;
  if (!s.startsWith('/')) s = `/${s}`;
  return `${API_URL}${s}`;
};

const defaultMarkerIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const getVideoEmbedUrl = (raw) => {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s) === false) return null;

  try {
    const u = new URL(s);
    const host = u.hostname.replace(/^www\./, '');

    if (host === 'youtu.be') {
      const id = u.pathname.replace('/', '').trim();
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }

    if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (u.pathname.startsWith('/embed/')) return s;
      const id = u.searchParams.get('v');
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }

    if (host === 'vimeo.com') {
      const id = u.pathname.split('/').filter(Boolean)[0];
      return id ? `https://player.vimeo.com/video/${id}` : null;
    }
  } catch (_) {
    return null;
  }

  return s;
};

export default function AttractionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { formatCurrencyRWF } = useLocale() || {};
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState(false);
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState(null);
  const [availabilityInfo, setAvailabilityInfo] = useState(null);
  const [viewerId, setViewerId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash'); // 'cash' | 'mtn_mobile_money'
  const today = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    visitDate: '',
    timeSlot: '',
    tickets: 1,
    notes: ''
  });

  const [contact, setContact] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
  });

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_URL}/api/attractions/${id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || '');
        setItem(data.attraction || data);
      } catch (e) { setItem(null); } finally { setLoading(false); }
    })();
  }, [id]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/auth/me`, { credentials: 'include' });
        if (!res.ok) return;
        const data = await res.json().catch(() => ({}));
        const u = data?.user;
        if (!u) return;
        if (u._id) setViewerId(String(u._id));
        setContact(prev => ({
          ...prev,
          firstName: u.firstName || prev.firstName,
          lastName: u.lastName || prev.lastName,
          email: u.email || prev.email,
          phone: u.phone || prev.phone,
        }));
      } catch (_) {
        // ignore
      }
    })();
  }, []);

  async function checkAvailability() {
    if (!form.visitDate) return toast.error('Select visit date');
    try {
      setChecking(true);
      const res = await fetch(`${API_URL}/api/attractions/${id}/availability`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitDate: form.visitDate,
          tickets: Number(form.tickets || 1),
          timeSlot: String(form.timeSlot || '').trim()
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Could not check availability');
      setAvailabilityInfo(data);
      if (!data?.available) {
        setAvailable(false);
        const reason = String(data?.reason || '').toLowerCase();
        if (reason === 'closed') {
          toast.error('Not available: closed on selected date');
        } else if (reason === 'slot_required') {
          toast.error('Not available: please select a time slot');
        } else if (reason === 'invalid_slot') {
          toast.error('Not available: selected time slot is not valid');
        } else if (reason === 'capacity') {
          const remaining = Number(data?.remaining);
          if (Number.isFinite(remaining)) {
            toast.error(`Not available: only ${Math.max(0, remaining)} tickets remaining for this slot`);
          } else {
            toast.error('Not available: not enough remaining capacity');
          }
        } else {
          toast.error('Not available');
        }
      } else {
        setAvailable(true);
        toast.success('Available');
      }
    } catch (e) { toast.error(e.message); } finally { setChecking(false); }
  }

  async function createBooking() {
    if (!form.visitDate) return toast.error('Select visit date');
    try {
      setBooking(true);
      const res = await fetch(`${API_URL}/api/attraction-bookings`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attractionId: id,
          visitDate: form.visitDate,
          timeSlot: String(form.timeSlot || '').trim(),
          tickets: Number(form.tickets || 1),
          notes: form.notes,
          contactPhone: contact.phone,
          paymentMethod,
        })
      });
      if (res.status === 401) { toast.error('Please login'); navigate('/login'); return; }
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Booking failed');
      if (paymentMethod === 'mtn_mobile_money' && data?.booking?._id) {
        toast.success('Redirecting to payment...');
        navigate('/mtn-payment', {
          state: {
            attractionBookingId: data.booking._id,
            amount: Number(data.booking.totalAmount || 0),
            description: `Attraction booking for ${item?.name || 'your trip'}`,
            customerName: `${contact.firstName || ''} ${contact.lastName || ''}`.trim(),
            customerEmail: contact.email || '',
            phoneNumber: contact.phone || '',
            redirectPath: `/attraction-booking-confirmation/${data.booking._id}`
          }
        });
        return;
      }
      toast.success('Booking created');
      if (data?.booking?._id) {
        navigate(`/attraction-booking-confirmation/${data.booking._id}`);
      } else {
        navigate('/attractions');
      }
    } catch (e) { toast.error(e.message); } finally { setBooking(false); }
  }

  if (loading) return <div className="max-w-6xl mx-auto px-4 py-6">Loading...</div>;
  if (!item) return <div className="max-w-6xl mx-auto px-4 py-6">Not found</div>;

  const imgUrl = (u) => makeAbsolute(u) || '';

  const unitPrice = Number(item.price || 0);
  const qty = Math.max(1, Number(form.tickets || 1));
  const total = unitPrice * qty;
  const totalLabel = formatCurrencyRWF ? formatCurrencyRWF(total) : `RWF ${Number(total || 0).toLocaleString()}`;

  const videoUrl = getVideoEmbedUrl(item?.video);
  const lat = Number(item?.latitude);
  const lng = Number(item?.longitude);
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);

  const ownerId = item?.owner ? String(item.owner) : '';
  const isOwnerViewing = viewerId && ownerId && viewerId === ownerId;

  const nextFromStep1 = () => {
    if (!form.visitDate) { toast.error('Select visit date'); return; }
    if (Array.isArray(availabilityInfo?.slots) && availabilityInfo.slots.length > 0 && !String(form.timeSlot || '').trim()) {
      toast.error('Select a time slot');
      return;
    }
    if (Number(form.tickets || 1) < 1) { toast.error('Tickets must be at least 1'); return; }
    setStep(2);
  };

  const nextFromStep2 = () => {
    if (!String(contact.phone || '').trim()) { toast.error('Enter phone number'); return; }
    setStep(3);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="w-full h-72 bg-gray-100 rounded overflow-hidden">
            {item.images?.[0] ? (
              <img src={imgUrl(item.images[0])} className="w-full h-full object-cover" />
            ) : item.image ? (
              <img src={imgUrl(item.image)} className="w-full h-full object-cover" />
            ) : null}
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {(item.images || []).slice(1,9).map((im, i) => (
              <img key={i} src={imgUrl(im)} className="w-full h-20 object-cover rounded" />
            ))}
          </div>

          <div className="mt-4 bg-white rounded-lg shadow p-4">
            <h1 className="text-2xl font-bold text-gray-900">{item.name}</h1>
            <div className="mt-1 text-gray-600 flex items-center gap-2">
              <FaMapMarkerAlt className="text-[#a06b42]" />
              <span>{item.location}</span>
            </div>
            {item.description && (
              <p className="mt-3 text-gray-700 text-sm leading-relaxed">{item.description}</p>
            )}
          </div>

          {videoUrl && (
            <div className="mt-4 bg-white rounded-lg shadow p-4">
              <div className="text-sm font-semibold text-gray-900">Video</div>
              <div className="mt-3 w-full aspect-video bg-gray-100 rounded overflow-hidden">
                <iframe
                  src={videoUrl}
                  title="Attraction video"
                  className="w-full h-full"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
            </div>
          )}

          {hasCoords && (
            <div className="mt-4 bg-white rounded-lg shadow p-4">
              <div className="text-sm font-semibold text-gray-900">Location map</div>
              <div className="mt-3 w-full h-64 rounded overflow-hidden">
                <MapContainer center={[lat, lng]} zoom={13} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  />
                  <Marker position={[lat, lng]} icon={defaultMarkerIcon} />
                </MapContainer>
              </div>
            </div>
          )}
        </div>

        <div>
          <div className="bg-white rounded-lg shadow p-4">
            {item.price != null && (
              <div className="text-xl font-semibold">{formatCurrencyRWF ? formatCurrencyRWF(unitPrice) : `RWF ${unitPrice.toLocaleString()}`}</div>
            )}

            <div className="mt-3 flex items-center justify-between">
              <div className="text-xs text-gray-600">Step {step} of 3</div>
              <div className="text-sm font-semibold text-gray-900">Total: {totalLabel}</div>
            </div>

            {step === 1 && (
              <div className="grid grid-cols-1 gap-3 mt-3">
                <div>
                  <label className="text-sm text-gray-700">Visit date</label>
                  <div className="relative">
                    <FaCalendarAlt className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="date"
                      min={today}
                      value={form.visitDate}
                      onChange={e => setForm({ ...form, visitDate: e.target.value })}
                      className="w-full pl-10 px-3 py-2 border rounded"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm text-gray-700">Time slot</label>
                  <select
                    value={form.timeSlot}
                    onChange={e => {
                      setAvailable(null);
                      setAvailabilityInfo(null);
                      setForm({ ...form, timeSlot: e.target.value });
                    }}
                    className="w-full px-3 py-2 border rounded"
                  >
                    <option value="">Select a slot</option>
                    {Array.isArray(availabilityInfo?.slots) ? availabilityInfo.slots.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    )) : null}
                  </select>
                  <div className="text-xs text-gray-500 mt-1">Click "Check availability" to load slots for the selected date.</div>
                </div>

                <div>
                  <label className="text-sm text-gray-700">Tickets</label>
                  <input
                    type="number"
                    min={1}
                    value={form.tickets}
                    onChange={e => setForm({ ...form, tickets: Number(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={checkAvailability}
                    disabled={checking}
                    className="px-3 py-2 bg-[#a06b42] hover:bg-[#8f5a32] text-white rounded"
                  >
                    {checking ? 'Checking...' : 'Check availability'}
                  </button>
                  {available !== null && (
                    <span className={`text-sm ${available ? 'text-green-600' : 'text-red-600'}`}>
                      {available ? 'Available' : 'Not available'}
                    </span>
                  )}
                </div>

                {availabilityInfo?.reason === 'closed' && (
                  <div className="text-xs text-red-600">This attraction is closed on the selected date.</div>
                )}
                {availabilityInfo?.reason === 'slot_required' && (
                  <div className="text-xs text-red-600">Please select a time slot.</div>
                )}
                {availabilityInfo?.reason === 'invalid_slot' && (
                  <div className="text-xs text-red-600">Selected time slot is not valid for this attraction.</div>
                )}
                {availabilityInfo?.reason === 'capacity' && (
                  <div className="text-xs text-red-600">
                    Not enough remaining capacity{Number.isFinite(Number(availabilityInfo?.remaining)) ? ` (remaining: ${Math.max(0, Number(availabilityInfo?.remaining))})` : ''}.
                  </div>
                )}
                <button
                  type="button"
                  onClick={nextFromStep1}
                  className="px-4 py-2 bg-[#a06b42] hover:bg-[#8f5a32] text-white rounded"
                >
                  Continue
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="grid grid-cols-1 gap-3 mt-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm text-gray-700">First name</label>
                    <input
                      value={contact.firstName}
                      onChange={e => setContact({ ...contact, firstName: e.target.value })}
                      className="w-full px-3 py-2 border rounded"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-700">Last name</label>
                    <input
                      value={contact.lastName}
                      onChange={e => setContact({ ...contact, lastName: e.target.value })}
                      className="w-full px-3 py-2 border rounded"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm text-gray-700">Email</label>
                  <input
                    type="email"
                    value={contact.email}
                    onChange={e => setContact({ ...contact, email: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-700">Phone number *</label>
                  <input
                    value={contact.phone}
                    onChange={e => setContact({ ...contact, phone: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-700">Notes (optional)</label>
                  <textarea
                    value={form.notes}
                    onChange={e => setForm({ ...form, notes: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                    rows={3}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="px-4 py-2 bg-gray-100 text-gray-800 rounded border"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={nextFromStep2}
                    className="px-4 py-2 bg-[#a06b42] hover:bg-[#8f5a32] text-white rounded"
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="grid grid-cols-1 gap-3 mt-3">
                <div className="text-sm text-gray-700">
                  <div className="flex items-center justify-between">
                    <span>Visit date</span>
                    <span className="font-semibold text-gray-900">{form.visitDate}</span>
                  </div>
                  {form.timeSlot ? (
                    <div className="flex items-center justify-between mt-1">
                      <span>Time slot</span>
                      <span className="font-semibold text-gray-900">{form.timeSlot}</span>
                    </div>
                  ) : null}
                  <div className="flex items-center justify-between mt-1">
                    <span>Tickets</span>
                    <span className="font-semibold text-gray-900">{qty}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span>Total</span>
                    <span className="font-semibold text-gray-900">{totalLabel}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cash')}
                    className={`px-3 py-2 rounded border ${paymentMethod === 'cash'
                      ? 'bg-[#a06b42] text-white border-[#a06b42]'
                      : 'bg-[#f6e9d8] text-[#4b2a00] border-[#d4c4b0] hover:bg-[#e8dcc8]'}`}
                  >
                    Pay on Arrival
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('mtn_mobile_money')}
                    className={`px-3 py-2 rounded border ${paymentMethod === 'mtn_mobile_money'
                      ? 'bg-[#a06b42] text-white border-[#a06b42]'
                      : 'bg-[#f6e9d8] text-[#4b2a00] border-[#d4c4b0] hover:bg-[#e8dcc8]'}`}
                  >
                    MTN Mobile Money
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="px-4 py-2 bg-gray-100 text-gray-800 rounded border"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={createBooking}
                    disabled={booking || isOwnerViewing}
                    className="px-4 py-2 bg-[#a06b42] hover:bg-[#8f5a32] text-white rounded"
                  >
                    {booking ? 'Booking...' : 'Confirm & book'}
                  </button>
                </div>

                {isOwnerViewing && (
                  <div className="text-xs text-red-600">You can’t book your own attraction.</div>
                )}

                {item?.owner && (
                  <button
                    type="button"
                    onClick={() => navigate(`/messages?to=${item.owner}`)}
                    className="px-4 py-2 bg-gray-100 text-gray-800 rounded border"
                  >
                    Message host
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
