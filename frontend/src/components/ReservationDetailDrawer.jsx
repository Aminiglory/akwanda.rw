import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * ReservationDetailDrawer
 * Props:
 * - booking: booking object
 * - open: boolean
 * - onClose: fn()
 * - onUpdated: fn() -> refresh parent data
 */
const ReservationDetailDrawer = ({ booking, open, onClose, onUpdated }) => {
  const [form, setForm] = useState({ checkIn: '', checkOut: '', numberOfGuests: 1 });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (booking) {
      setForm({
        checkIn: booking.checkIn ? new Date(booking.checkIn).toISOString().slice(0,10) : '',
        checkOut: booking.checkOut ? new Date(booking.checkOut).toISOString().slice(0,10) : '',
        numberOfGuests: booking.numberOfGuests || 1,
      });
    }
  }, [booking]);

  if (!open) return null;

  const modifyBooking = async () => {
    try {
      setBusy(true);
      const res = await fetch(`${API_URL}/api/bookings/${booking._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          checkIn: form.checkIn ? new Date(form.checkIn).toISOString() : undefined,
          checkOut: form.checkOut ? new Date(form.checkOut).toISOString() : undefined,
          numberOfGuests: form.numberOfGuests ? Number(form.numberOfGuests) : undefined
        })
      });
      const data = await res.json().catch(()=>({}));
      if (!res.ok) throw new Error(data.message || 'Failed to modify booking');
      toast.success('Booking updated');
      onUpdated && onUpdated();
    } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  };

  const cancelBooking = async () => {
    if (!window.confirm('Cancel this booking?')) return;
    try {
      setBusy(true);
      const res = await fetch(`${API_URL}/api/bookings/${booking._id}`, { method: 'DELETE', credentials: 'include' });
      const data = await res.json().catch(()=>({}));
      if (!res.ok) throw new Error(data.message || 'Failed to cancel booking');
      toast.success('Booking canceled');
      onUpdated && onUpdated();
      onClose && onClose();
    } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  };

  const downloadInvoice = async () => {
    try {
      const res = await fetch(`${API_URL}/api/bookings/${booking._id}/invoice`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch invoice');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${booking.confirmationCode || booking._id}.pdf`;
      a.click();
    } catch (e) { toast.error(e.message); }
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full sm:w-[480px] bg-white shadow-2xl flex flex-col">
        <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-500">{booking.confirmationCode}</div>
            <div className="text-lg font-semibold text-gray-900">{booking.property?.title || 'Booking'}</div>
          </div>
          <button onClick={onClose} className="px-3 py-1 border rounded">Close</button>
        </div>
        <div className="p-4 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-gray-500">Guest</div>
              <div className="font-medium">{booking.guest?.firstName} {booking.guest?.lastName}</div>
              <div className="text-gray-500">{booking.guest?.email || ''}</div>
            </div>
            <div className="text-right">
              <div className="text-gray-500">Amount</div>
              <div className="font-semibold">RWF {(booking.totalAmount || 0).toLocaleString()}</div>
              <div className="text-gray-500">Payment: {booking.paymentStatus}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Check-in</label>
              <input type="date" className="w-full border rounded-lg px-3 py-2" value={form.checkIn} onChange={e=>setForm(prev=>({...prev, checkIn:e.target.value}))} />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Check-out</label>
              <input type="date" className="w-full border rounded-lg px-3 py-2" value={form.checkOut} onChange={e=>setForm(prev=>({...prev, checkOut:e.target.value}))} />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Guests</label>
              <input type="number" min="1" className="w-full border rounded-lg px-3 py-2" value={form.numberOfGuests} onChange={e=>setForm(prev=>({...prev, numberOfGuests:e.target.value}))} />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button disabled={busy} onClick={modifyBooking} className="px-4 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-50">Save Changes</button>
            <button disabled={busy} onClick={cancelBooking} className="px-4 py-2 rounded-lg bg-red-600 text-white disabled:opacity-50">Cancel Booking</button>
            <button onClick={downloadInvoice} className="px-4 py-2 rounded-lg bg-gray-100 text-gray-800">Download Invoice</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReservationDetailDrawer;
