import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useLocale } from '../contexts/LocaleContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function AttractionBookingConfirmation() {
  const { id } = useParams();
  const { formatCurrencyRWF } = useLocale() || {};
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_URL}/api/attraction-bookings/${id}`, { credentials: 'include' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || 'Failed to load booking');
        setBooking(data.booking);
      } catch (e) {
        setBooking(null);
        toast.error(e.message || 'Failed to load booking');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return <div className="max-w-4xl mx-auto px-4 py-8">Loading...</div>;
  }

  if (!booking) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold text-gray-900">Booking not found</h1>
          <div className="mt-4">
            <Link to="/attractions" className="px-4 py-2 bg-[#a06b42] text-white rounded">Back to Attractions</Link>
          </div>
        </div>
      </div>
    );
  }

  const a = booking.attraction;
  const totalLabel = formatCurrencyRWF
    ? formatCurrencyRWF(Number(booking.totalAmount || 0))
    : `RWF ${Number(booking.totalAmount || 0).toLocaleString()}`;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-5 bg-gradient-to-r from-[#a06b42] to-[#8f5a32] text-white">
          <div className="text-sm opacity-90">Attraction booking confirmation</div>
          <h1 className="text-2xl font-bold mt-1">{a?.name || 'Your booking'}</h1>
        </div>

        <div className="p-6 grid grid-cols-1 gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded border p-4">
              <div className="text-xs text-gray-600">Confirmation code</div>
              <div className="text-lg font-semibold text-gray-900">{booking.confirmationCode || '—'}</div>
            </div>
            <div className="bg-gray-50 rounded border p-4">
              <div className="text-xs text-gray-600">Status</div>
              <div className="text-lg font-semibold text-gray-900">{booking.status || '—'}</div>
              <div className="text-xs text-gray-600 mt-1">Payment: {booking.paymentStatus || '—'}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded border p-4">
              <div className="text-sm font-semibold text-gray-900">Visit details</div>
              <div className="mt-2 text-sm text-gray-700">
                <div className="flex items-center justify-between">
                  <span>Date</span>
                  <span className="font-semibold">{booking.visitDate ? new Date(booking.visitDate).toLocaleDateString() : '—'}</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span>Tickets</span>
                  <span className="font-semibold">{Number(booking.numberOfPeople || 0)}</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span>Total</span>
                  <span className="font-semibold">{totalLabel}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded border p-4">
              <div className="text-sm font-semibold text-gray-900">Location</div>
              <div className="mt-2 text-sm text-gray-700">
                <div className="text-gray-900 font-semibold">{a?.location || '—'}</div>
                {a?.city || a?.country ? (
                  <div className="text-gray-600 text-xs mt-1">{[a?.city, a?.country].filter(Boolean).join(', ')}</div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Link to="/attractions" className="px-4 py-2 bg-gray-100 text-gray-900 rounded border">Back to Attractions</Link>
            {a?._id ? (
              <Link to={`/attractions/${a._id}`} className="px-4 py-2 bg-[#a06b42] text-white rounded">View attraction</Link>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
