import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FaMapMarkerAlt, FaCalendarAlt } from 'react-icons/fa';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const makeAbsolute = (u) => {
  if (!u) return null;
  let s = String(u).trim().replace(/\\+/g, '/');
  if (/^https?:\/\//i.test(s)) return s;
  if (!s.startsWith('/')) s = `/${s}`;
  return `${API_URL}${s}`;
};

export default function AttractionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState(false);
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('cash'); // 'cash' | 'mtn_mobile_money'
  const today = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [form, setForm] = useState({
    visitDate: '',
    tickets: 1,
    notes: ''
  });

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_URL}/api/attractions/${id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to load');
        setItem(data.attraction || data);
      } catch (e) { toast.error(e.message); } finally { setLoading(false); }
    })();
  }, [id]);

  async function checkAvailability() {
    if (!form.visitDate) return toast.error('Select visit date');
    try {
      setChecking(true);
      const res = await fetch(`${API_URL}/api/attractions/${id}/availability`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitDate: form.visitDate, tickets: Number(form.tickets || 1) })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Could not check availability');
      setAvailable(!!data.available);
      toast[data.available ? 'success' : 'error'](data.available ? 'Available' : 'Not available');
    } catch (e) { toast.error(e.message); } finally { setChecking(false); }
  }

  async function createBooking() {
    if (!form.visitDate) return toast.error('Select visit date');
    try {
      setBooking(true);
      const res = await fetch(`${API_URL}/api/attraction-bookings`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attractionId: id, ...form, tickets: Number(form.tickets || 1), paymentMethod })
      });
      if (res.status === 401) { toast.error('Please login'); navigate('/login'); return; }
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Booking failed');
      if (paymentMethod === 'mtn_mobile_money' && data?.booking?._id) {
        toast.success('Redirecting to payment...');
        navigate('/mtn-payment', {
          state: {
            bookingId: data.booking._id,
            amount: Number(data.booking.totalAmount || 0),
            description: `Attraction booking for ${item?.name || 'your trip'}`,
            customerName: data.booking?.guestName || '',
            customerEmail: data.booking?.guestEmail || '',
            phoneNumber: data.booking?.guestPhone || ''
          }
        });
        return;
      }
      toast.success('Booking created');
      if (item?.owner && data?.booking?._id) {
        navigate(`/messages?to=${item.owner}&bookingId=${data.booking._id}`);
      } else {
        navigate('/user-dashboard');
      }
    } catch (e) { toast.error(e.message); } finally { setBooking(false); }
  }

  if (loading) return <div className="max-w-6xl mx-auto px-4 py-6">Loading...</div>;
  if (!item) return <div className="max-w-6xl mx-auto px-4 py-6">Not found</div>;

  const imgUrl = (u) => makeAbsolute(u) || '';

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
        </div>

        <div>
          <div className="bg-white rounded-lg shadow p-4">
            {item.price != null && (
              <div className="text-xl font-semibold">RWF {Number(item.price || 0).toLocaleString()}</div>
            )}
            <div className="grid grid-cols-1 gap-3 mt-3">
              <div>
                <label className="text-sm text-gray-700">Visit date</label>
                <div className="relative">
                  <FaCalendarAlt className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="date" min={today} value={form.visitDate} onChange={e=>setForm({...form, visitDate: e.target.value})} className="w-full pl-10 px-3 py-2 border rounded" />
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-700">Tickets</label>
                <input type="number" min={1} value={form.tickets} onChange={e=>setForm({...form, tickets: Number(e.target.value)||1})} className="w-full px-3 py-2 border rounded" />
              </div>
              <div>
                <label className="text-sm text-gray-700">Notes (optional)</label>
                <textarea value={form.notes} onChange={e=>setForm({...form, notes: e.target.value})} className="w-full px-3 py-2 border rounded" rows={3} />
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={checkAvailability} disabled={checking} className="px-3 py-2 bg-[#a06b42] hover:bg-[#8f5a32] text-white rounded">{checking?'Checking...':'Check availability'}</button>
                {available !== null && (<span className={`text-sm ${available ? 'text-green-600':'text-red-600'}`}>{available ? 'Available':'Not available'}</span>)}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button type="button" onClick={()=>setPaymentMethod('cash')} className={`px-3 py-2 rounded border ${paymentMethod==='cash' ? 'bg-[#a06b42] text-white border-[#a06b42]' : 'bg-[#f6e9d8] text-[#4b2a00] border-[#d4c4b0] hover:bg-[#e8dcc8]'}`}>Pay on Arrival</button>
                <button type="button" onClick={()=>setPaymentMethod('mtn_mobile_money')} className={`px-3 py-2 rounded border ${paymentMethod==='mtn_mobile_money' ? 'bg-[#a06b42] text-white border-[#a06b42]' : 'bg-[#f6e9d8] text-[#4b2a00] border-[#d4c4b0] hover:bg-[#e8dcc8]'}`}>MTN Mobile Money</button>
              </div>
              <button onClick={createBooking} disabled={booking} className="px-4 py-2 bg-[#a06b42] hover:bg-[#8f5a32] text-white rounded">{booking?'Booking...':'Book now'}</button>
              {item?.owner && (
                <button type="button" onClick={() => navigate(`/messages?to=${item.owner}`)} className="px-4 py-2 bg-gray-100 text-gray-800 rounded border">Message host</button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
