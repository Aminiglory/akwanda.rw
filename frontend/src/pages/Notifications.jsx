import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FaBell, FaCheckCircle, FaClock, FaExclamationTriangle } from 'react-icons/fa';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Notifications = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState({});

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/notifications/list`, { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Failed to load notifications');
      const list = (data.notifications || []).map(n => ({
        id: n._id,
        type: n.type,
        title: n.title || n.message,
        message: n.message || n.title,
        isRead: !!n.isRead,
        booking: n.booking,
        property: n.property,
        createdAt: n.createdAt
      }));
      setItems(list);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const markRead = async (id) => {
    try {
      await fetch(`${API_URL}/api/notifications/${id}/read`, { method: 'PATCH', credentials: 'include' });
      setItems(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (_) {}
  };

  const openBooking = (n) => {
    const bid = n.booking?._id || n.booking;
    if (bid) {
      markRead(n.id);
      navigate(`/booking-confirmation/${bid}`);
    }
  };

  const confirmBooking = async (n) => {
    const bid = n.booking?._id || n.booking;
    if (!bid) return;
    try {
      setBusy(prev => ({ ...prev, [n.id]: true }));
      const res = await fetch(`${API_URL}/api/bookings/${bid}/confirm`, { method: 'POST', credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Failed to confirm booking');
      toast.success('Booking confirmed');
      markRead(n.id);
      navigate(`/booking-confirmation/${bid}`);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(prev => ({ ...prev, [n.id]: false }));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <FaBell className="text-blue-600 text-2xl" />
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="modern-card p-4 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16">
            <div className="mx-auto w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <FaExclamationTriangle className="text-gray-400 text-2xl" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">No notifications</h2>
            <p className="text-gray-600 mt-1">You're all caught up.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map(n => (
              <div key={n.id} className={`modern-card p-4 ${!n.isRead ? 'border-l-4 border-blue-600' : ''}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-gray-900">{n.title}</div>
                    <div className="text-sm text-gray-600 mt-1">{n.message}</div>
                    <div className="text-xs text-gray-400 mt-1">{n.createdAt ? new Date(n.createdAt).toLocaleString() : ''}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {n.booking && (
                      <>
                        <button onClick={() => openBooking(n)} className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-800 rounded">Open</button>
                        {(n.type === 'booking_paid' || n.type === 'booking_created') && (
                          <button
                            onClick={() => confirmBooking(n)}
                            disabled={!!busy[n.id]}
                            className="px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50"
                          >
                            {busy[n.id] ? 'Confirming...' : 'Confirm'}
                          </button>
                        )}
                      </>
                    )}
                    {!n.isRead && (
                      <button onClick={() => markRead(n.id)} className="px-3 py-2 text-sm bg-white border border-gray-200 hover:bg-gray-50 rounded">Mark read</button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
