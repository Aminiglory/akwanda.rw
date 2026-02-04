import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { FaBell, FaCheckCircle, FaClock, FaExclamationTriangle } from 'react-icons/fa';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Notifications = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useAuth() || {};
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState({});
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [ticketLoading, setTicketLoading] = useState(false);
  const [ticketData, setTicketData] = useState(null);
  const [ticketError, setTicketError] = useState('');
  const [ticketReply, setTicketReply] = useState('');
  const [ticketStatus, setTicketStatus] = useState('open');
  const [ticketUpdating, setTicketUpdating] = useState(false);
  const [ticketMessageMode, setTicketMessageMode] = useState('auto');
  const [ticketLastAutoMessage, setTicketLastAutoMessage] = useState('');
  const [filter, setFilter] = useState(() => {
    const params = new URLSearchParams(location.search || '');
    const f = params.get('filter');
    const allowed = ['all', 'commission', 'bookings', 'unread', 'read'];
    return allowed.includes(f) ? f : 'all';
  }); // all | commission | bookings | unread | read
  const [focusId, setFocusId] = useState(null);
  const hasFocusedRef = useRef(false);

  // Parse query param ?open or ?id to focus a notification
  const openParam = useMemo(() => new URLSearchParams(location.search).get('open') || new URLSearchParams(location.search).get('id'), [location.search]);

  // Keep filter in sync with ?filter= query param (e.g. from navbar links)
  useEffect(() => {
    const params = new URLSearchParams(location.search || '');
    const f = params.get('filter');
    const allowed = ['all', 'commission', 'bookings', 'unread', 'read'];
    if (f && allowed.includes(f) && f !== filter) {
      setFilter(f);
    }
  }, [location.search]);

  const setFilterAndSyncUrl = (value) => {
    setFilter(value);
    const params = new URLSearchParams(location.search || '');
    if (!value || value === 'all') {
      params.delete('filter');
    } else {
      params.set('filter', value);
    }
    navigate({ pathname: location.pathname, search: params.toString() ? `?${params.toString()}` : '' }, { replace: true });
  };

  // Routes that represent the property/owner dashboards. The generic
  // /notifications page is intentionally NOT included here so that even
  // host users see guest-facing notifications when browsing in traveler mode.
  const ownerRoutes = ['/group-home', '/dashboard', '/user-dashboard', '/owner', '/messages', '/owner/cars', '/owner/cars/group-home'];

  const isOwnerContext = () => {
    if (!isAuthenticated || user?.userType !== 'host') return false;
    return ownerRoutes.some(route => location.pathname.startsWith(route));
  };

  const load = async () => {
    setLoading(true);
    try {
      const endpoint = isOwnerContext()
        ? `${API_URL}/api/user/notifications`
        : `${API_URL}/api/notifications/list`;
      const res = await fetch(endpoint, { credentials: 'include' });
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

  const extractTicketNumber = (text) => {
    const s = String(text || '');
    const m = s.match(/\bTKT\d{6,}\b/i);
    return m ? m[0] : '';
  };

  const safeFetchJson = async (url, options) => {
    const r = await fetch(url, options);
    const raw = await r.text();
    let data = null;
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch (_) {
      data = null;
    }
    return { r, raw, data };
  };

  const buildAutoStatusMessage = (ticket, status) => {
    const tn = ticket?.ticketNumber || '';
    const name = ticket?.name || 'there';
    const subj = ticket?.subject ? ` (${ticket.subject})` : '';
    if (status === 'open') {
      return `Hi ${name}, we've reopened your ticket (${tn})${subj}. Our team will review it and respond as soon as possible.`;
    }
    if (status === 'in_progress') {
      return `Hi ${name}, your ticket (${tn})${subj} is now in progress. We're working on it and will update you shortly.`;
    }
    if (status === 'resolved') {
      return `Hi ${name}, your ticket (${tn})${subj} has been resolved. If the issue persists, reply to this ticket and we'll assist further.`;
    }
    if (status === 'closed') {
      return `Hi ${name}, we're closing your ticket (${tn})${subj}. If you need more help, you can open a new ticket referencing ${tn}.`;
    }
    return `Hi ${name}, your ticket (${tn}) status has been updated to ${status}.`;
  };

  const syncAutoMessageIfNeeded = (nextStatus) => {
    const nextAuto = buildAutoStatusMessage(ticketData, nextStatus);
    const current = String(ticketReply || '');
    if (!current.trim() || current === ticketLastAutoMessage) {
      setTicketReply(nextAuto);
      setTicketLastAutoMessage(nextAuto);
    }
  };

  const openSupportTicket = async (n) => {
    const tn = extractTicketNumber(n?.message) || extractTicketNumber(n?.title);
    if (!tn) {
      toast.error('Could not find ticket number in this notification');
      return;
    }

    setTicketModalOpen(true);
    setTicketError('');
    setTicketReply('');
    setTicketLastAutoMessage('');
    setTicketData(null);
    setTicketLoading(true);

    try {
      if (!n?.isRead) {
        try { await markRead(n.id); } catch (_) {}
      }

      const { r, raw, data } = await safeFetchJson(`${API_URL}/api/support/tickets/${encodeURIComponent(tn)}`, {
        method: 'GET',
        credentials: 'include'
      });

      if (!r.ok) {
        const htmlLike = raw && raw.trim().startsWith('<');
        throw new Error(data?.message || (htmlLike ? 'Support service is unavailable.' : `Failed to load ticket (${r.status})`));
      }
      if (!data?.ticket) {
        throw new Error('Unexpected response from server');
      }

      setTicketData(data.ticket);
      setTicketStatus(String(data.ticket.status || 'open'));
      if (ticketMessageMode === 'auto') {
        const initialAuto = buildAutoStatusMessage(data.ticket, String(data.ticket.status || 'open'));
        setTicketReply(initialAuto);
        setTicketLastAutoMessage(initialAuto);
      }
    } catch (e) {
      setTicketError(e.message || 'Failed to load ticket');
      toast.error(e.message || 'Failed to load ticket');
    } finally {
      setTicketLoading(false);
    }
  };

  const refreshTicket = async (ticketNumber) => {
    const ref = await safeFetchJson(`${API_URL}/api/support/tickets/${encodeURIComponent(ticketNumber)}`, {
      method: 'GET',
      credentials: 'include'
    });
    if (ref.r.ok && ref.data?.ticket) {
      setTicketData(ref.data.ticket);
      setTicketStatus(String(ref.data.ticket.status || ticketStatus));
    }
  };

  const sendTicketReply = async () => {
    if (!ticketData?.ticketNumber) return;
    const msg = String(ticketReply || '').trim();
    if (!msg) {
      toast.error('Please type a message to the user');
      return;
    }

    try {
      setTicketUpdating(true);
      const { r, raw, data } = await safeFetchJson(`${API_URL}/api/support/tickets/${encodeURIComponent(ticketData.ticketNumber)}/response`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message: msg, isAdmin: true })
      });

      if (!r.ok) {
        const htmlLike = raw && raw.trim().startsWith('<');
        throw new Error(data?.message || (htmlLike ? 'Support service is unavailable.' : `Failed to send reply (${r.status})`));
      }

      await refreshTicket(ticketData.ticketNumber);
      setTicketReply('');
      setTicketLastAutoMessage('');
      toast.success('Reply sent');
    } catch (e) {
      toast.error(e.message || 'Failed to send reply');
    } finally {
      setTicketUpdating(false);
    }
  };

  const updateTicketStatus = async (withReply) => {
    if (!ticketData?.ticketNumber) return;

    let msg = '';
    if (ticketMessageMode === 'auto') {
      msg = String(ticketReply || '').trim();
      if (!msg) {
        msg = buildAutoStatusMessage(ticketData, ticketStatus);
      }
    } else {
      msg = String(ticketReply || '').trim();
      if (!msg) {
        toast.error('Please type a message to the user or switch to Auto');
        return;
      }
    }

    try {
      setTicketUpdating(true);
      const payload = { status: ticketStatus };
      if (withReply || ticketMessageMode === 'auto' || ticketMessageMode === 'manual') {
        payload.response = msg;
      }

      const { r, raw, data } = await safeFetchJson(`${API_URL}/api/support/tickets/${encodeURIComponent(ticketData.ticketNumber)}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      if (!r.ok) {
        const htmlLike = raw && raw.trim().startsWith('<');
        throw new Error(data?.message || (htmlLike ? 'Support service is unavailable.' : `Failed to update status (${r.status})`));
      }

      await refreshTicket(ticketData.ticketNumber);
      setTicketReply('');
      setTicketLastAutoMessage('');
      toast.success('Status updated');
    } catch (e) {
      toast.error(e.message || 'Failed to update status');
    } finally {
      setTicketUpdating(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Reset one-time focus flag whenever the query param changes
  useEffect(() => {
    hasFocusedRef.current = false;
  }, [openParam]);

  // When items load or param changes, focus the target notification ONCE
  useEffect(() => {
    if (!openParam || !items || items.length === 0) return;
    if (hasFocusedRef.current) return; // already focused; don't keep snapping back while user scrolls

    const id = String(openParam);
    setFocusId(id);
    hasFocusedRef.current = true;

    // mark as read and scroll into view once
    try { markRead(id); } catch (_) {}
    const el = document.getElementById(`notif-${id}`);
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [openParam, items]);

  const markRead = async (id) => {
    try {
      const ownerMode = isOwnerContext();
      const endpoint = ownerMode
        ? `${API_URL}/api/user/notifications/${id}/read`
        : `${API_URL}/api/notifications/${id}/read`;
      const method = ownerMode ? 'POST' : 'PATCH';

      await fetch(endpoint, { method, credentials: 'include' });
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

  const openReview = (n) => {
    const isHost = user?.userType === 'host' || user?.userType === 'admin';
    // Mark as read but do not change any global mode; just navigate to the proper reviews page
    markRead(n.id);

    const messageText = String(n?.message || '');
    const bookingNumberMatch = messageText.match(/Booking number:\s*([A-Z0-9-]+)/i);
    const reviewPinMatch = messageText.match(/Review PIN:\s*(\d+)/i);
    const bookingId = n?.booking?._id || n?.booking;
    const propertyId = n?.property?._id || n?.property;

    if (bookingId && propertyId) {
      const qs = new URLSearchParams();
      qs.set('bookingId', String(bookingId));
      qs.set('propertyId', String(propertyId));
      if (bookingNumberMatch && bookingNumberMatch[1]) qs.set('bn', bookingNumberMatch[1]);
      if (reviewPinMatch && reviewPinMatch[1]) qs.set('pin', reviewPinMatch[1]);
      navigate(`/rate-stay?${qs.toString()}`);
      return;
    }

    if (isHost) {
      navigate('/owner/reviews?filter=unreplied');
    } else {
      navigate('/account/reviews');
    }
  };

  const confirmBooking = async (n) => {
    const bid = n.booking?._id || n.booking;
    if (!bid) return;
    try {
      setBusy(prev => ({ ...prev, [n.id]: true }));
      // First fetch the latest booking to ensure it is still confirmable.
      const checkRes = await fetch(`${API_URL}/api/bookings/${bid}`, { credentials: 'include' });
      const checkData = await checkRes.json().catch(() => ({}));
      if (!checkRes.ok) {
        throw new Error(checkData?.message || 'Could not load booking');
      }

      const currentStatus = String(checkData?.booking?.status || '').toLowerCase();
      if (currentStatus && currentStatus !== 'pending' && currentStatus !== 'awaiting') {
        // Do not call confirm endpoint for non-confirmable states; show an info message instead.
        toast.success(`Booking is already ${currentStatus}. No further confirmation is needed.`);
        markRead(n.id);
        navigate(`/booking-confirmation/${bid}`);
        return;
      }

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

  const filteredItems = items.filter(n => {
    if (filter === 'commission') return String(n.type || '').includes('commission');
    if (filter === 'bookings') return !!n.booking;
    if (filter === 'unread') return !n.isRead;
    if (filter === 'read') return !!n.isRead;
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <FaBell className="text-blue-600 text-2xl" />
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
        </div>

        {/* Filter Chips */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <button onClick={() => setFilterAndSyncUrl('all')} className={`px-3 py-1.5 rounded-full text-sm border ${filter==='all' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}>All</button>
          <button onClick={() => setFilterAndSyncUrl('commission')} className={`px-3 py-1.5 rounded-full text-sm border ${filter==='commission' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}>Commission</button>
          <button onClick={() => setFilterAndSyncUrl('bookings')} className={`px-3 py-1.5 rounded-full text-sm border ${filter==='bookings' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}>Bookings</button>
          <button onClick={() => setFilterAndSyncUrl('unread')} className={`px-3 py-1.5 rounded-full text-sm border ${filter==='unread' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}>Unread</button>
          <button onClick={() => setFilterAndSyncUrl('read')} className={`px-3 py-1.5 rounded-full text-sm border ${filter==='read' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}>Read</button>
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
            {filteredItems.map(n => {
              const messageText = n.message || '';
              const bookingNumberMatch = messageText.match(/Booking number:\s*([A-Z0-9-]+)/i);
              const reviewPinMatch = messageText.match(/Review PIN:\s*(\d+)/i);
              const isReviewNotification = String(n.type || '').toLowerCase().includes('review') || !!reviewPinMatch;
              const isSupportTicketNotification = String(n.type || '') === 'support_ticket_created' && user?.userType === 'admin';
              const isPlatformRatingReminder = String(n.type || '') === 'platform_rating_reminder';

              const handleCardClick = () => {
                // Commission-style notifications keep their own CTAs; just mark read on click
                if (String(n.type || '').includes('commission')) {
                  if (!n.isRead) markRead(n.id);
                  return;
                }

                if (isSupportTicketNotification) {
                  openSupportTicket(n);
                  return;
                }

                if (isReviewNotification) {
                  openReview(n);
                  return;
                }

                if (isPlatformRatingReminder) {
                  markRead(n.id);
                  navigate('/rate-akwanda');
                  return;
                }

                if (n.booking) {
                  openBooking(n);
                  return;
                }

                if (!n.isRead) {
                  markRead(n.id);
                }
              };

              return (
                <div
                  id={`notif-${n.id}`}
                  key={n.id}
                  className={`modern-card p-4 cursor-pointer transition ${!n.isRead ? 'border-l-4 border-blue-600 bg-blue-50' : 'bg-white'} ${focusId===n.id ? 'ring-2 ring-blue-400' : ''}`}
                  onClick={handleCardClick}
                >
                  {String(n.type || '').includes('commission') ? (
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-blue-700 font-semibold">Commission Update</div>
                        <div className="text-sm text-gray-700 mt-1">{n.message}</div>
                        <div className="text-xs text-gray-400 mt-1">{n.createdAt ? new Date(n.createdAt).toLocaleString() : ''}</div>
                        <div className="mt-2 text-sm text-gray-600 bg-blue-50 border border-blue-100 rounded-lg p-2">
                          You can start the booking process once your commission is set. This helps keep your listing visible and bookable.
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {n.property && (
                          <Link to={`/apartment/${n.property}`} className="px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded">View Property</Link>
                        )}
                        {!n.isRead && (
                          <button onClick={(e) => {
                            e.stopPropagation();
                            markRead(n.id);
                          }} className="px-3 py-2 text-sm bg-white border border-gray-200 hover:bg-gray-50 rounded">Dismiss</button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="font-semibold text-gray-900">{n.title}</div>
                          {!n.isRead && (
                            <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium text-blue-800 bg-blue-100 rounded-full">Unread</span>
                          )}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">{n.message}</div>
                        {(bookingNumberMatch || reviewPinMatch) && (
                          <div className="text-xs text-gray-700 mt-1 space-y-0.5">
                            {bookingNumberMatch && (
                              <div>
                                <span className="font-semibold">Booking number:</span> {bookingNumberMatch[1]}
                              </div>
                            )}
                            {reviewPinMatch && (
                              <div>
                                <span className="font-semibold">Review PIN:</span> {reviewPinMatch[1]}
                              </div>
                            )}
                          </div>
                        )}
                        <div className="text-xs text-gray-400 mt-1">{n.createdAt ? new Date(n.createdAt).toLocaleString() : ''}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isSupportTicketNotification && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openSupportTicket(n);
                            }}
                            className="px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded"
                          >
                            Open
                          </button>
                        )}
                        {n.booking &&
                          (n.type === 'booking_paid' || n.type === 'booking_created') &&
                          (user?.userType === 'host' || user?.userType === 'admin') && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                confirmBooking(n);
                              }}
                              disabled={!!busy[n.id]}
                              className="px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50"
                            >
                              {busy[n.id] ? 'Confirming...' : 'Confirm'}
                            </button>
                          )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {ticketModalOpen && (
          <div className="fixed inset-0 z-[99999] overflow-y-auto">
            <div className="min-h-full flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => {
                if (ticketUpdating) return;
                setTicketModalOpen(false);
              }}
            />
            <div className="relative w-full max-w-3xl max-h-[90vh] bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
                <div>
                  <div className="text-sm text-gray-600">Support Ticket</div>
                  <div className="text-lg font-bold text-gray-900">{ticketData?.ticketNumber || '—'}</div>
                </div>
                <button
                  onClick={() => {
                    if (ticketUpdating) return;
                    setTicketModalOpen(false);
                  }}
                  className="px-3 py-2 text-sm bg-white border border-gray-200 hover:bg-gray-50 rounded"
                >
                  Close
                </button>
              </div>

              <div className="p-5 overflow-y-auto flex-1">
                {ticketLoading ? (
                  <div className="text-gray-600">Loading ticket...</div>
                ) : ticketError ? (
                  <div className="text-red-600">{ticketError}</div>
                ) : ticketData ? (
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                        <div className="text-xs text-gray-500">Status</div>
                        <div className="text-sm font-semibold text-gray-900">{ticketData.status}</div>
                      </div>
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                        <div className="text-xs text-gray-500">Priority</div>
                        <div className="text-sm font-semibold text-gray-900">{ticketData.priority}</div>
                      </div>
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                        <div className="text-xs text-gray-500">Category</div>
                        <div className="text-sm font-semibold text-gray-900">{ticketData.category}</div>
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-gray-500">Subject</div>
                      <div className="text-sm font-semibold text-gray-900">{ticketData.subject}</div>
                    </div>

                    <div>
                      <div className="text-sm font-semibold text-gray-900 mb-2">Conversation</div>
                      <div className="space-y-3 max-h-[32vh] overflow-y-auto pr-1">
                        {(ticketData.responses || []).map((r, idx) => (
                          <div key={idx} className={`p-4 rounded-lg border ${r.isAdmin ? 'bg-white border-blue-200' : 'bg-white border-gray-200'}`}>
                            <div className="text-xs text-gray-500 mb-1">{r.isAdmin ? 'Support' : 'User'} • {r.createdAt ? new Date(r.createdAt).toLocaleString() : ''}</div>
                            <div className="text-gray-800 whitespace-pre-wrap break-words">{r.message}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-start">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Set status</label>
                        <select
                          value={ticketStatus}
                          onChange={(e) => {
                            const next = e.target.value;
                            setTicketStatus(next);
                            if (ticketMessageMode === 'auto') {
                              syncAutoMessageIfNeeded(next);
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          disabled={ticketUpdating}
                        >
                          <option value="open">open</option>
                          <option value="in_progress">in_progress</option>
                          <option value="resolved">resolved</option>
                          <option value="closed">closed</option>
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                          <label className="block text-sm font-medium text-gray-700">Message to user</label>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setTicketMessageMode('auto');
                                const nextAuto = buildAutoStatusMessage(ticketData, ticketStatus);
                                setTicketReply(nextAuto);
                                setTicketLastAutoMessage(nextAuto);
                              }}
                              disabled={ticketUpdating}
                              className={`px-3 py-1.5 text-xs rounded border ${ticketMessageMode === 'auto' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                            >
                              Auto
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const lastAuto = ticketLastAutoMessage;
                                setTicketMessageMode('manual');
                                setTicketLastAutoMessage('');
                                if (ticketReply === lastAuto) setTicketReply('');
                              }}
                              disabled={ticketUpdating}
                              className={`px-3 py-1.5 text-xs rounded border ${ticketMessageMode === 'manual' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                            >
                              Manual
                            </button>
                          </div>
                        </div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Reply to user</label>
                        <textarea
                          value={ticketReply}
                          onChange={(e) => setTicketReply(e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          disabled={ticketUpdating}
                        />
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            onClick={sendTicketReply}
                            disabled={ticketUpdating || !String(ticketReply || '').trim()}
                            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50"
                          >
                            {ticketUpdating ? 'Sending...' : 'Send Reply'}
                          </button>
                          <button
                            onClick={() => updateTicketStatus(false)}
                            disabled={ticketUpdating || (ticketMessageMode === 'manual' && !String(ticketReply || '').trim())}
                            className="px-4 py-2 text-sm bg-white border border-gray-200 hover:bg-gray-50 rounded disabled:opacity-50"
                          >
                            {ticketUpdating ? 'Updating...' : 'Update Status'}
                          </button>
                          <button
                            onClick={() => updateTicketStatus(true)}
                            disabled={ticketUpdating || (ticketMessageMode === 'manual' && !String(ticketReply || '').trim())}
                            className="px-4 py-2 text-sm bg-green-700 hover:bg-green-800 text-white rounded disabled:opacity-50"
                          >
                            {ticketUpdating ? 'Updating...' : 'Reply + Update'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-600">No ticket selected.</div>
                )}
              </div>

              <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-end gap-2 bg-white shrink-0">
                <button
                  onClick={() => {
                    if (ticketUpdating) return;
                    setTicketModalOpen(false);
                  }}
                  className="px-4 py-2 text-sm bg-white border border-gray-200 hover:bg-gray-50 rounded"
                >
                  Close
                </button>
              </div>
            </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
