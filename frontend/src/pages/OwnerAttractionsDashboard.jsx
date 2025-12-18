import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import ReceiptPreview from '../components/ReceiptPreview';
import toast from 'react-hot-toast';
import SuccessModal from '../components/SuccessModal';
import { useLocale } from '../contexts/LocaleContext';
import { useAuth } from '../contexts/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const makeAbsolute = (u) => {
  if (!u) return null;
  let s = String(u).trim().replace(/\\+/g, '/');
  if (/^https?:\/\//i.test(s)) return s;
  if (!s.startsWith('/')) s = `/${s}`;
  return `${API_URL}${s}`;
};

export default function OwnerAttractionsDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth() || {};
  const propertyContextId = searchParams.get('property') || '';
  const [propertyContextLabel, setPropertyContextLabel] = useState('');
  const [items, setItems] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [bookingFilters, setBookingFilters] = useState({ status: '', from: '', to: '' });
  const [receiptBooking, setReceiptBooking] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingId, setUploadingId] = useState(null);
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'table'
  const [createImages, setCreateImages] = useState([]);
  const [successOpen, setSuccessOpen] = useState(false);
  const [successTitle, setSuccessTitle] = useState('Success');
  const [successMsg, setSuccessMsg] = useState('Action completed successfully.');
  const [view, setView] = useState('overview'); // 'overview' | 'attractions' | 'bookings' | 'finance' | 'analytics' | 'reviews' | 'messages' | 'settings'
  const financeRange = (searchParams.get('range') || '').toLowerCase();
  const financeRangeLabel = financeRange === '30'
    ? 'Last 30 days'
    : financeRange === 'ytd'
      ? 'Year to date'
        : financeRange === 'mtd'
          ? 'Month to date'
          : financeRange === 'custom'
            ? 'Custom range'
            : 'All time';

  const analyticsSegment = (searchParams.get('segment') || 'overview').toLowerCase();

  const financeFilter = (searchParams.get('filter') || 'all').toLowerCase();
  const financeMode = (searchParams.get('mode') || 'overview').toLowerCase();

  const financeFilterLabel = (() => {
    switch (financeFilter) {
      case 'paid': return 'Paid payments';
      case 'pending': return 'Pending payments';
      case 'unpaid': return 'Unpaid payments';
      default: return 'All payments';
    }
  })();

  const financeModeLabel = financeMode === 'expenses' ? 'Expenses & profit' : 'Overview';

  // Finance stats for attractions, based on bookings loaded for this dashboard
  const financeStats = useMemo(() => {
    const baseList = Array.isArray(bookings) ? bookings : [];
    const filter = financeFilter;
    const now = new Date();
    const start30 = new Date(now);
    start30.setDate(start30.getDate() - 30);
    const start90 = new Date(now);
    start90.setDate(start90.getDate() - 90);
    const startYear = new Date(now.getFullYear(), 0, 1);

    let totalAll = 0;
    let totalRange = 0;
    let countAll = 0;
    let countRange = 0;

    baseList.forEach(b => {
      const status = String(b.paymentStatus || b.status || '').toLowerCase();
      if (filter === 'paid' && status !== 'paid') return;
      if (filter === 'pending' && status !== 'pending') return;
      if (filter === 'unpaid' && status !== 'unpaid') return;

      const amount = Number(b.totalAmount || 0);
      const visit = b.visitDate ? new Date(b.visitDate) : null;
      if (!visit || Number.isNaN(visit.getTime())) {
        // If we cannot determine visit date, include in overall totals only
        totalAll += amount;
        countAll += 1;
        return;
      }

      // Overall
      totalAll += amount;
      countAll += 1;

      // Range-specific
      let inRange = false;
      if (financeRange === '30') {
        inRange = visit >= start30 && visit <= now;
      } else if (financeRange === '90') {
        inRange = visit >= start90 && visit <= now;
      } else if (financeRange === 'ytd') {
        inRange = visit >= startYear && visit <= now;
      } else if (!financeRange || financeRange === 'all') {
        inRange = true;
      }

      if (inRange) {
        totalRange += amount;
        countRange += 1;
      }
    });

    const avgPerBooking = countRange > 0 ? totalRange / countRange : 0;
    return { totalAll, totalRange, countAll, countRange, avgPerBooking };
  }, [bookings, financeFilter, financeRange]);

  const { t, formatCurrencyRWF } = useLocale() || {};

  const labelOr = (key, fallback) => {
    if (!t) return fallback;
    try {
      const v = t(key);
      if (!v || v === key) return fallback;
      return v;
    } catch (_) {
      return fallback;
    }
  };

  const formatAmount = (value) => {
    const num = Number(value || 0);
    if (formatCurrencyRWF) return formatCurrencyRWF(num);
    return `RWF ${num.toLocaleString()}`;
  };

  // Sync high-level view with ?view= from URL (used by owner navbar)
  useEffect(() => {
    const v = (searchParams.get('view') || '').toLowerCase();
    switch (v) {
      case 'overview':
      case '':
        if (view !== 'overview') setView('overview');
        break;
      case 'attractions':
        if (view !== 'attractions') setView('attractions');
        break;
      case 'bookings':
        if (view !== 'bookings') setView('bookings');
        break;
      case 'finance':
        if (view !== 'finance') setView('finance');
        break;
      case 'analytics':
        if (view !== 'analytics') setView('analytics');
        break;
      case 'reviews':
        if (view !== 'reviews') setView('reviews');
        break;
      case 'messages':
        if (view !== 'messages') setView('messages');
        break;
      case 'settings':
        if (view !== 'settings') setView('settings');
        break;
      default:
        break;
    }
  }, [searchParams, view]);

  const [selectedAttractionId, setSelectedAttractionId] = useState(() => searchParams.get('attraction') || 'all');

  const filteredItems = useMemo(() => {
    if (!Array.isArray(items)) return [];
    if (!selectedAttractionId || selectedAttractionId === 'all') return items;
    return items.filter(a => String(a._id) === String(selectedAttractionId));
  }, [items, selectedAttractionId]);

  const filteredBookings = useMemo(() => {
    if (!Array.isArray(bookings)) return [];
    if (!selectedAttractionId || selectedAttractionId === 'all') return bookings;
    return bookings.filter(b => {
      const id = b?.attraction?._id || b?.attraction;
      return id && String(id) === String(selectedAttractionId);
    });
  }, [bookings, selectedAttractionId]);

  const overviewFinanceStats = useMemo(() => {
    const baseList = Array.isArray(filteredBookings) ? filteredBookings : [];
    const now = new Date();
    const start30 = new Date(now);
    start30.setDate(start30.getDate() - 30);
    const startYear = new Date(now.getFullYear(), 0, 1);

    let rev30 = 0;
    let revYtd = 0;
    let bookings30 = 0;
    let bookingsYtd = 0;

    baseList.forEach(b => {
      const amount = Number(b.totalAmount || 0);
      const visit = b.visitDate ? new Date(b.visitDate) : null;
      if (!visit || Number.isNaN(visit.getTime())) return;

      if (visit >= start30 && visit <= now) {
        rev30 += amount;
        bookings30 += 1;
      }
      if (visit >= startYear && visit <= now) {
        revYtd += amount;
        bookingsYtd += 1;
      }
    });

    const avg30 = bookings30 > 0 ? rev30 / bookings30 : 0;
    return { rev30, revYtd, bookings30, bookingsYtd, avg30 };
  }, [filteredBookings]);

  const empty = useMemo(() => ({
    name: '',
    description: '',
    category: 'tour',
    location: '',
    city: '',
    country: 'Rwanda',
    price: 0,
    currency: 'RWF',
    isActive: true,
    highlights: ''
  }), []);
  const [form, setForm] = useState(empty);

  async function loadMine() {
    try {
      setLoading(true);
      console.log('[Attractions][loadMine] fetching my attractions & bookings');
      const [res, resB] = await Promise.all([
        fetch(`${API_URL}/api/attractions/mine`, { credentials: 'include' }),
        fetch(`${API_URL}/api/attraction-bookings/for-my-attractions`, { credentials: 'include' })
      ]);
      const [data, dataB] = await Promise.all([res.json(), resB.json()]);
      console.log('[Attractions][loadMine] responses', { itemsStatus: res.status, bookingsStatus: resB.status, items: (data?.attractions||[]).length, bookings: (dataB?.bookings||[]).length });
      if (!res.ok) throw new Error(data.message || '');
      if (!resB.ok) throw new Error(dataB.message || '');
      setItems(data.attractions || []);
      setBookings(dataB.bookings || []);
    } catch (e) {
      console.error('[Attractions][loadMine] error', e);
      // Show empty state silently
      setItems([]);
      setBookings([]);
    } finally { setLoading(false); }
  }

  function exportBookingsCsv() {
    const rows = [['Attraction','Guest','Visit Date','Tickets','Amount','Status']];
    const filtered = filteredBookings.filter(b => {
      if (bookingFilters.status && b.status !== bookingFilters.status) return false;
      if (bookingFilters.from) {
        const from = new Date(bookingFilters.from);
        if (new Date(b.visitDate) < from) return false;
      }
      if (bookingFilters.to) {
        const to = new Date(bookingFilters.to);
        if (new Date(b.visitDate) > to) return false;
      }
      return true;
    });
    filtered.forEach(b => rows.push([
      (b.attraction?.name || '').replace(/,/g,' '),
      `${b.guest?.firstName || ''} ${b.guest?.lastName || ''}`.trim().replace(/,/g,' '),
      new Date(b.visitDate).toLocaleDateString(),
      String(b.numberOfPeople || 0),
      String(b.totalAmount || 0),
      b.status || ''
    ]));
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'attraction-bookings.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  useEffect(() => { loadMine(); }, []);

  // Load human-readable property context label when propertyContextId is present
  useEffect(() => {
    if (!propertyContextId) {
      setPropertyContextLabel('');
      return;
    }
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/properties/${propertyContextId}`, { credentials: 'include' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to load property');
        const p = data.property || data;
        const id = String(p._id || propertyContextId);
        const code = p.propertyNumber || id.slice(-6) || 'N/A';
        const name = p.title || p.name || 'Property';
        setPropertyContextLabel(`#${code} - ${name}`);
      } catch (e) {
        console.error('[Attractions][propertyContext] error', e);
        setPropertyContextLabel(propertyContextId);
      }
    })();
  }, [propertyContextId]);

  function reset() { setForm(empty); }

  async function createItem(e) {
    e.preventDefault();
    try {
      console.log('[Attractions][create] payload', form);
      if (!createImages || createImages.length === 0) { toast.error('Please add at least one image'); return; }
      setSaving(true);
      const payload = {
        ...form,
        price: Number(form.price || 0),
        highlights: String(form.highlights || '').split(',').map(s => s.trim()).filter(Boolean)
      };
      const res = await fetch(`${API_URL}/api/attractions`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      const data = await res.json();
      console.log('[Attractions][create] result', { status: res.status, id: data?.attraction?._id });
      if (!res.ok) throw new Error(data.message || 'Failed to create');
      setItems(list => [data.attraction, ...list]);
      toast.success('Attraction created');
      setSuccessTitle('Attraction Created');
      setSuccessMsg('Your attraction was created successfully.');
      setSuccessOpen(true);
      await uploadImages(data.attraction._id, createImages);
      reset();
      setCreateImages([]);
    } catch (e) { console.error('[Attractions][create] error', e); toast.error(e.message); } finally { setSaving(false); }
  }

  async function updateItem(id, patch) {
    try {
      console.log('[Attractions][update] id', id, 'patch', patch);
      const res = await fetch(`${API_URL}/api/attractions/${id}`, {
        method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch)
      });
      const data = await res.json();
      console.log('[Attractions][update] result', { status: res.status });
      if (!res.ok) throw new Error(data.message || 'Update failed');
      setItems(list => list.map(x => x._id === id ? data.attraction : x));
      toast.success('Updated');
      setSuccessTitle('Attraction Updated');
      setSuccessMsg('Your attraction was updated successfully.');
      setSuccessOpen(true);
    } catch (e) { console.error('[Attractions][update] error', e); toast.error(e.message); }
  }

  async function deleteItem(id) {
    if (!confirm('Delete this attraction?')) return;
    try {
      console.log('[Attractions][delete] id', id);
      const res = await fetch(`${API_URL}/api/attractions/${id}`, { method: 'DELETE', credentials: 'include' });
      const data = await res.json().catch(()=>({}));
      console.log('[Attractions][delete] result', { status: res.status });
      if (!res.ok) throw new Error(data.message || 'Delete failed');
      setItems(list => list.filter(x => x._id !== id));
      toast.success('Deleted');
      setSuccessTitle('Attraction Deleted');
      setSuccessMsg('Your attraction was deleted successfully.');
      setSuccessOpen(true);
    } catch (e) { console.error('[Attractions][delete] error', e); toast.error(e.message); }
  }

  async function uploadImages(id, files) {
    if (!files?.length) return;
    try {
      console.log('[Attractions][uploadImages] id', id, 'files', files?.length);
      setUploadingId(id);
      const fd = new FormData();
      Array.from(files).forEach(f => fd.append('images', f));
      const res = await fetch(`${API_URL}/api/attractions/${id}/images`, { method: 'POST', credentials: 'include', body: fd });
      const data = await res.json();
      console.log('[Attractions][uploadImages] result', { status: res.status, imageCount: (data?.attraction?.images||[]).length });
      if (!res.ok) throw new Error(data.message || 'Upload failed');
      setItems(list => list.map(x => x._id === id ? data.attraction : x));
      toast.success('Images uploaded');
      setSuccessTitle('Images Uploaded');
      setSuccessMsg('Your attraction images were uploaded successfully.');
      setSuccessOpen(true);
    } catch (e) { console.error('[Attractions][uploadImages] error', e); toast.error(e.message); } finally { setUploadingId(null); }
  }

  const isActiveTab = (path) => location.pathname.startsWith(path);

  return (
    <div className="min-h-screen bg-[#f9f5ef] py-6">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-4 flex justify-between items-center">
          <button
            type="button"
            onClick={() => window.location.assign('/choose-listing-type')}
            className="inline-flex items-center px-3 py-1.5 rounded-full bg-white/70 hover:bg-white text-xs font-medium text-[#4b2a00] border border-[#e0d5c7] shadow-sm transition-colors"
          >
            <span className="mr-1">←</span>
            Back to listing options
          </button>
        </div>
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="inline-flex rounded-lg overflow-hidden border border-[#d4c4b0] bg-[#a06b42] text-white px-3 py-2 text-sm">
            Attractions
          </div>
          <div className="inline-flex rounded-lg overflow-hidden border">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`px-3 py-2 text-sm ${viewMode==='cards' ? 'bg-[#a06b42] text-white' : 'bg-white text-gray-700'}`}
            >
              Cards
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-3 py-2 text-sm ${viewMode==='table' ? 'bg-[#a06b42] text-white' : 'bg-white text-gray-700'}`}
            >
              Table
            </button>
          </div>
        </div>

      {propertyContextId && (
        <div className="mb-2 text-xs text-gray-600">
          You are managing property context: <span className="font-semibold">{propertyContextLabel || propertyContextId}</span>
        </div>
      )}

      <div className="mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">My Attractions</h1>
        {items.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600 hidden sm:inline">
              {labelOr('ownerAttractions.manageScopeLabel', 'Manage')}
            </span>
            <select
              value={selectedAttractionId || 'all'}
              onChange={(e) => {
                const id = e.target.value || 'all';
                setSelectedAttractionId(id);
                try {
                  const next = new URLSearchParams(searchParams.toString());
                  if (id === 'all') {
                    next.delete('attraction');
                  } else {
                    next.set('attraction', String(id));
                  }
                  setSearchParams(next, { replace: true });
                } catch (_) {}
              }}
              className="min-w-[180px] px-3 py-2 border border-[#d4c4b0] rounded-lg bg-white text-xs font-medium text-[#4b2a00] focus:outline-none focus:ring-1 focus:ring-[#a06b42] focus:border-[#a06b42] transition-all"
            >
              <option value="all">{labelOr('ownerAttractions.allProperties', 'All Properties')}</option>
              {items.map((item) => {
                const id = String(item._id || '');
                const name = item.name || 'Attraction';
                const city = item.city || item.location || '';
                const label = city ? `${name} - ${city}` : name;
                return (
                  <option key={id} value={id}>{label}</option>
                );
              })}
            </select>
          </div>
        )}
      </div>

      {/* View selector similar to Property/Car dashboards */}
      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        <button
          type="button"
          onClick={() => {
            setView('overview');
            try {
              const next = new URLSearchParams(searchParams.toString());
              next.delete('view');
              setSearchParams(next, { replace: true });
            } catch (_) {}
          }}
          className={`px-3 py-1.5 rounded-full border ${view === 'overview' ? 'bg-[#a06b42] text-white border-[#a06b42]' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
        >
          Overview
        </button>
        <button
          type="button"
          onClick={() => {
            setView('attractions');
            try {
              const next = new URLSearchParams(searchParams.toString());
              next.set('view', 'attractions');
              setSearchParams(next, { replace: true });
            } catch (_) {}
          }}
          className={`px-3 py-1.5 rounded-full border ${view === 'attractions' ? 'bg-[#a06b42] text-white border-[#a06b42]' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
        >
          Attractions
        </button>
        <button
          type="button"
          onClick={() => {
            setView('bookings');
            try {
              const next = new URLSearchParams(searchParams.toString());
              next.set('view', 'bookings');
              setSearchParams(next, { replace: true });
            } catch (_) {}
          }}
          className={`px-3 py-1.5 rounded-full border ${view === 'bookings' ? 'bg-[#a06b42] text:white border-[#a06b42]' : 'bg:white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
        >
          Bookings
        </button>
        <button
          type="button"
          onClick={() => {
            setView('finance');
            try {
              const next = new URLSearchParams(searchParams.toString());
              next.set('view', 'finance');
              setSearchParams(next, { replace: true });
            } catch (_) {}
          }}
          className={`px-3 py-1.5 rounded-full border ${view === 'finance' ? 'bg-[#a06b42] text-white border-[#a06b42]' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
        >
          Finance
        </button>
        <button
          type="button"
          onClick={() => {
            setView('analytics');
            try {
              const next = new URLSearchParams(searchParams.toString());
              next.set('view', 'analytics');
              setSearchParams(next, { replace: true });
            } catch (_) {}
          }}
          className={`px-3 py-1.5 rounded-full border ${view === 'analytics' ? 'bg-[#a06b42] text-white border-[#a06b42]' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
        >
          Analytics
        </button>
        <button
          type="button"
          onClick={() => {
            setView('reviews');
            try {
              const next = new URLSearchParams(searchParams.toString());
              next.set('view', 'reviews');
              setSearchParams(next, { replace: true });
            } catch (_) {}
          }}
          className={`px-3 py-1.5 rounded-full border ${view === 'reviews' ? 'bg-[#a06b42] text-white border-[#a06b42]' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
        >
          Reviews
        </button>
        <button
          type="button"
          onClick={() => {
            setView('messages');
            try {
              const next = new URLSearchParams(searchParams.toString());
              next.set('view', 'messages');
              setSearchParams(next, { replace: true });
            } catch (_) {}
          }}
          className={`px-3 py-1.5 rounded-full border ${view === 'messages' ? 'bg-[#a06b42] text-white border-[#a06b42]' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
        >
          Messages
        </button>
        <button
          type="button"
          onClick={() => {
            setView('settings');
            try {
              const next = new URLSearchParams(searchParams.toString());
              next.set('view', 'settings');
              setSearchParams(next, { replace: true });
            } catch (_) {}
          }}
          className={`px-3 py-1.5 rounded-full border ${view === 'settings' ? 'bg-[#a06b42] text-white border-[#a06b42]' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
        >
          Settings
        </button>
      </div>

      {user?.isBlocked && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 text-sm">
          {labelOr(
            'ownerAttractions.blockedBanner',
            'Your account is deactivated. Attraction management is disabled until reactivated.'
          )}
        </div>
      )}

      {/* Overview: basic stats + quick links */}
      {view === 'overview' && (
        <>
          <div className="mb-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-xl bg-white shadow-sm border border-gray-100 px-3 py-2">
              <div className="text-[11px] text-gray-500">Total attractions</div>
              <div className="text-lg font-semibold text-gray-900">{filteredItems.length}</div>
            </div>
            <div className="rounded-xl bg-white shadow-sm border border-gray-100 px-3 py-2">
              <div className="text-[11px] text-gray-500">Total bookings</div>
              <div className="text-lg font-semibold text-gray-900">{filteredBookings.length}</div>
            </div>
            <div className="rounded-xl bg-white shadow-sm border border-gray-100 px-3 py-2">
              <div className="text-[11px] text-gray-500">Active attractions</div>
              <div className="text-lg font-semibold text-emerald-700">{filteredItems.filter(a => a.isActive).length}</div>
            </div>
          </div>

          <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-3">
            <button
              type="button"
              onClick={() => setView('attractions')}
              className="text-left rounded-xl bg-white shadow-sm border border-gray-100 px-3 py-2 hover:border-[#a06b42] hover:shadow-md transition"
            >
              <div className="text-[11px] text-gray-500">Attractions</div>
              <div className="text-sm font-semibold text-gray-900">Manage experiences</div>
              <div className="mt-0.5 text-[11px] text-gray-500">Create and update your attractions</div>
            </button>
            <button
              type="button"
              onClick={() => setView('bookings')}
              className="text-left rounded-xl bg-white shadow-sm border border-gray-100 px-3 py-2 hover:border-[#a06b42] hover:shadow-md transition"
            >
              <div className="text-[11px] text-gray-500">Bookings</div>
              <div className="text-sm font-semibold text-gray-900">Reservations</div>
              <div className="mt-0.5 text-[11px] text-gray-500">View and manage all attraction bookings</div>
            </button>
            <Link
              to="/transactions"
              className="rounded-xl bg-white shadow-sm border border-gray-100 px-3 py-2 hover:border-[#a06b42] hover:shadow-md transition block"
            >
              <div className="text-[11px] text-gray-500">Finance</div>
              <div className="text-sm font-semibold text-gray-900">Payments & transactions</div>
              <div className="mt-0.5 text-[11px] text-gray-500">Track payouts and charges</div>
            </Link>
            <Link
              to="/analytics"
              className="rounded-xl bg-white shadow-sm border border-gray-100 px-3 py-2 hover:border-[#a06b42] hover:shadow-md transition block"
            >
              <div className="text-[11px] text-gray-500">Analytics</div>
              <div className="text-sm font-semibold text-gray-900">Performance overview</div>
              <div className="mt-0.5 text-[11px] text-gray-500">See trends across your listings</div>
            </Link>
          </div>

          <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-2xl bg-white shadow-sm border border-gray-100 px-3 py-2.5">
              <div className="text-[11px] text-gray-500">
                {labelOr('ownerAttractions.overview.last30Revenue', 'Last 30 days revenue')}
              </div>
              <div className="text-sm font-semibold text-gray-900">
                {formatAmount(overviewFinanceStats.rev30)}
              </div>
              <div className="mt-0.5 text-[11px] text-gray-500">
                {overviewFinanceStats.bookings30}{' '}
                {labelOr('ownerAttractions.overview.bookingsLabel', 'bookings')}
              </div>
            </div>
            <div className="rounded-2xl bg-white shadow-sm border border-gray-100 px-3 py-2.5">
              <div className="text-[11px] text-gray-500">
                {labelOr('ownerAttractions.overview.ytdRevenue', 'Year-to-date revenue')}
              </div>
              <div className="text-sm font-semibold text-gray-900">
                {formatAmount(overviewFinanceStats.revYtd)}
              </div>
              <div className="mt-0.5 text-[11px] text-gray-500">
                {overviewFinanceStats.bookingsYtd}{' '}
                {labelOr('ownerAttractions.overview.bookingsLabel', 'bookings')}
              </div>
            </div>
            <div className="rounded-2xl bg-white shadow-sm border border-gray-100 px-3 py-2.5">
              <div className="text-[11px] text-gray-500">
                {labelOr('ownerAttractions.overview.avgRevenuePerBooking', 'Avg revenue / booking (30d)')}
              </div>
              <div className="text-sm font-semibold text-gray-900">
                {formatAmount(overviewFinanceStats.avg30)}
              </div>
              <div className="mt-0.5 text-[11px] text-gray-500">
                {labelOr(
                  'ownerAttractions.overview.avgRevenuePerBookingHint',
                  'Based on last 30 days'
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Finance view: computed from attraction bookings for this dashboard */}
      {view === 'finance' && (
        <div className="mb-6 rounded-xl bg-white border border-gray-200 px-4 py-4 text-sm text-gray-700">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-lg font-semibold">{financeModeLabel} - {financeFilterLabel}</h2>
              <p className="text-xs text-gray-500">Range: {financeRangeLabel}</p>
            </div>
            <div className="text-xs text-gray-500">
              Based on {financeStats.countAll} attraction bookings in this dashboard.
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-xl bg-white shadow-sm border border-gray-100 px-3 py-2">
              <div className="text-[11px] text-gray-500">Total revenue (all time)</div>
              <div className="text-lg font-semibold text-gray-900">{formatAmount(financeStats.totalAll)}</div>
            </div>
            <div className="rounded-xl bg-white shadow-sm border border-gray-100 px-3 py-2">
              <div className="text-[11px] text-gray-500">Revenue in range</div>
              <div className="text-lg font-semibold text-gray-900">{formatAmount(financeStats.totalRange)}</div>
            </div>
            <div className="rounded-xl bg-white shadow-sm border border-gray-100 px-3 py-2">
              <div className="text-[11px] text-gray-500">Bookings in range</div>
              <div className="text-lg font-semibold text-gray-900">{financeStats.countRange}</div>
            </div>
            <div className="rounded-xl bg-white shadow-sm border border-gray-100 px-3 py-2">
              <div className="text-[11px] text-gray-500">Avg revenue / booking (range)</div>
              <div className="text-lg font-semibold text-gray-900">{formatAmount(financeStats.avgPerBooking)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Analytics view: simple stats derived from bookings */}
      {view === 'analytics' && (
        <div className="mb-6 rounded-xl bg-white border border-gray-200 px-4 py-4 text-sm text-gray-700">
          <h2 className="text-lg font-semibold mb-3">
            {analyticsSegment === 'attractions'
              ? labelOr('ownerAttractions.analytics.attractionPerformance', 'Attraction performance')
              : analyticsSegment === 'bookings'
                ? labelOr('ownerAttractions.analytics.bookingTrends', 'Booking trends')
                : analyticsSegment === 'revenue'
                  ? labelOr('ownerAttractions.analytics.revenueReports', 'Revenue reports')
                  : labelOr('ownerAttractions.analytics.overview', 'Analytics overview')}
          </h2>
          <p className="text-xs text-gray-500 mb-3">Range: {financeRangeLabel}</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-xl bg-white shadow-sm border border-gray-100 px-3 py-2">
              <div className="text-[11px] text-gray-500">Total bookings</div>
              <div className="text-lg font-semibold text-gray-900">{filteredBookings.length}</div>
            </div>
            <div className="rounded-xl bg-white shadow-sm border border-gray-100 px-3 py-2">
              <div className="text-[11px] text-gray-500">Completed bookings</div>
              <div className="text-lg font-semibold text-gray-900">{filteredBookings.filter(b => (b.status || '').toLowerCase() === 'completed').length}</div>
            </div>
            <div className="rounded-xl bg-white shadow-sm border border-gray-100 px-3 py-2">
              <div className="text-[11px] text-gray-500">Cancelled bookings</div>
              <div className="text-lg font-semibold text-gray-900">{filteredBookings.filter(b => (b.status || '').toLowerCase() === 'cancelled').length}</div>
            </div>
            <div className="rounded-xl bg-white shadow-sm border border-gray-100 px-3 py-2">
              <div className="text-[11px] text-gray-500">Revenue (all time)</div>
              <div className="text-lg font-semibold text-gray-900">
                {formatAmount(
                  Array.isArray(bookings)
                    ? bookings.reduce((sum, b) => sum + Number(b.totalAmount || 0), 0)
                    : 0
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reviews/messages/settings placeholders */}
      {view === 'reviews' && (
        <div className="mb-6 rounded-xl bg-white border border-gray-200 px-4 py-3 text-sm text-gray-700">
          <h2 className="text-lg font-semibold mb-1">Attraction reviews</h2>
          <p>
            Attraction reviews are managed from the main reviews page. Use the Reviews link in the top
            owner navigation to open <span className="font-mono">/owner/reviews</span> in a full page.
          </p>
        </div>
      )}

      {view === 'messages' && (
        <div className="mb-6 rounded-xl bg-white border border-gray-200 px-4 py-3 text-sm text-gray-700">
          <h2 className="text-lg font-semibold mb-1">Messages</h2>
          <p>
            Attraction reservation messages are handled in your main inbox. Use the Messages link in the
            top navigation to open the full messaging interface with reservation filters.
          </p>
        </div>
      )}

      {view === 'settings' && (
        <div className="mb-6 rounded-xl bg-white border border-gray-200 px-4 py-3 text-sm text-gray-700">
          <h2 className="text-lg font-semibold mb-1">Settings</h2>
          <p>
            Attraction-specific settings will appear here in the future. For now you can manage notification
            and account settings from the main Settings section of your profile.
          </p>
        </div>
      )}

      {/* Create form: only in Attractions view */}
      {view === 'attractions' && (
        <form onSubmit={createItem} className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 md:p-8 mb-8">
          <div className="mb-6 pb-4 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">List a New Attraction</h2>
            <p className="text-sm text-gray-600">Share your unique experiences and attractions with travelers</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Basic Information */}
            <div className="md:col-span-3">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100">Basic Information</h3>
            </div>
            
          <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Attraction Name *</label>
              <input 
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#a06b42] focus:border-transparent transition-all" 
                placeholder="e.g., Volcanoes National Park Tour" 
                value={form.name} 
                onChange={e=>setForm({ ...form, name: e.target.value })} 
              />
          </div>
          <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Category *</label>
              <select 
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#a06b42] focus:border-transparent transition-all bg-white" 
                value={form.category} 
                onChange={e=>setForm({ ...form, category: e.target.value })}
              >
                <option value="tour">Tour</option>
                <option value="museum">Museum</option>
                <option value="park">Park</option>
                <option value="cultural">Cultural</option>
                <option value="nature">Nature</option>
                <option value="adventure">Adventure</option>
                <option value="historical">Historical</option>
                <option value="religious">Religious</option>
                <option value="entertainment">Entertainment</option>
              </select>
          </div>
          <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">City *</label>
              <input 
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#a06b42] focus:border-transparent transition-all" 
                placeholder="e.g., Musanze" 
                value={form.city} 
                onChange={e=>setForm({ ...form, city: e.target.value })} 
              />
            </div>
            
            {/* Location & Pricing */}
            <div className="md:col-span-3 mt-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100">Location & Pricing</h3>
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Location (Address) *</label>
              <input 
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#a06b42] focus:border-transparent transition-all" 
                placeholder="Address or meeting point" 
                value={form.location} 
                onChange={e=>setForm({ ...form, location: e.target.value })} 
              />
          </div>
          <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Price (RWF) *</label>
              <input 
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#a06b42] focus:border-transparent transition-all" 
                type="number" 
                placeholder="e.g., 20000" 
                value={form.price} 
                onChange={e=>setForm({ ...form, price: e.target.value })} 
              />
          </div>
            
            {/* Description */}
            <div className="md:col-span-3 mt-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100">Description</h3>
          </div>
            
          <div className="md:col-span-3">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Description *</label>
              <textarea 
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#a06b42] focus:border-transparent transition-all resize-none" 
                rows={4} 
                placeholder="Describe the experience, what visitors can expect, duration, etc." 
                value={form.description} 
                onChange={e=>setForm({ ...form, description: e.target.value })} 
              />
          </div>
            
          <div className="md:col-span-3">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Highlights</label>
              <input 
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#a06b42] focus:border-transparent transition-all" 
                placeholder="Comma-separated, e.g., Gorilla trekking, Cultural tour, Scenic views" 
                value={form.highlights} 
                onChange={e=>setForm({ ...form, highlights: e.target.value })} 
              />
              <p className="text-xs text-gray-500 mt-1">Separate multiple highlights with commas</p>
            </div>
            
            {/* Images */}
            <div className="md:col-span-3 mt-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100">Images *</h3>
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 hover:border-[#a06b42] transition-colors">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={e=>setCreateImages(Array.from(e.target.files || []))}
                  className="hidden"
                  id="attraction-images"
                />
                <label 
                  htmlFor="attraction-images" 
                  className="flex flex-col items-center justify-center cursor-pointer"
                >
                  <svg className="w-12 h-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-sm font-medium text-gray-700 mb-1">Click to upload images</span>
                  <span className="text-xs text-gray-500">PNG, JPG up to 10MB each</span>
                </label>
              </div>
              {createImages?.length > 0 && (
                <p className="text-sm text-gray-600 mt-2">{createImages.length} image(s) selected</p>
              )}
            </div>
            
            {/* Availability */}
            <div className="md:col-span-3 mt-4">
              <label className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors">
                <input 
                  type="checkbox" 
                  checked={!!form.isActive} 
                  onChange={e=>setForm({ ...form, isActive: !!e.target.checked })} 
                  className="w-5 h-5 text-[#a06b42] border-gray-300 rounded focus:ring-[#a06b42]"
                />
                <span className="text-sm font-semibold text-gray-700">Make this attraction active and visible to guests</span>
              </label>
            </div>
            
            {/* Submit Button */}
            <div className="md:col-span-3 mt-6 flex items-center justify-end gap-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => {
                  reset();
                  setCreateImages([]);
                }}
                className="px-6 py-3 text-gray-700 font-medium border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={saving} 
                className="px-8 py-3 bg-[#a06b42] hover:bg-[#8f5a32] text-white font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                {saving ? 'Creating...' : 'Create Attraction Listing'}
              </button>
          </div>
          </div>
        </form>
      )}

      {/* List: only in Attractions view */}
      {view === 'attractions' && (loading ? <div>Loading...</div> : (
        viewMode==='cards' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredItems.map(item => (
              <div key={item._id} className="bg-white rounded-lg shadow p-4">
                <div className="flex gap-4">
                  <div className="w-32 h-24 bg-gray-100 rounded overflow-hidden">
                    {item.images?.[0] ? <img src={makeAbsolute(item.images[0])} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-400">No image</div>}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">{item.name}</h3>
                      <button onClick={()=>updateItem(item._id, { isActive: !item.isActive })} className={`px-2 py-1 rounded text-sm ${item.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'}`}>{item.isActive ? 'Active' : 'Inactive'}</button>
                    </div>
                    <p className="text-sm text-gray-600">{item.city || item.location}</p>
                    {item.price != null && (<p className="text-sm font-medium mt-1">RWF {Number(item.price || 0).toLocaleString()}</p>)}
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <label className="text-sm">Upload Images:</label>
                  <input type="file" multiple disabled={uploadingId===item._id} onChange={e=>uploadImages(item._id, e.target.files)} />
                  <button onClick={()=>deleteItem(item._id)} className="ml-auto px-3 py-1 bg-red-600 text-white rounded text-sm">Delete</button>
                </div>
                {item.images?.length>0 && (
                  <div className="mt-3 grid grid-cols-4 gap-2">
                    {item.images.map((img, i)=> (
                      <img key={i} src={makeAbsolute(img)} className="w-full h-20 object-cover rounded" />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="p-3">Name</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">City</th>
                  <th className="p-3">Price</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map(item => (
                  <tr key={item._id} className="border-t">
                    <td className="p-3 font-medium">{item.name}</td>
                    <td className="p-3">{item.category}</td>
                    <td className="p-3">{item.city || item.location}</td>
                    <td className="p-3">RWF {Number(item.price || 0).toLocaleString()}</td>
                    <td className="p-3"><button onClick={()=>updateItem(item._id, { isActive: !item.isActive })} className={`px-2 py-1 rounded text-xs ${item.isActive ? 'bg-green-100 text-green-700':'bg-gray-200 text-gray-700'}`}>{item.isActive ? 'Active':'Inactive'}</button></td>
                    <td className="p-3"><button onClick={()=>deleteItem(item._id)} className="px-3 py-1 bg-red-600 text-white rounded text-xs">Delete</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ))}

      {/* Bookings: only in Bookings view */}
      {view === 'bookings' && (
      <div className="mt-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Bookings</h2>
            <p className="text-xs text-gray-500 mt-0.5">View and manage all reservations for your attractions.</p>
          </div>
        </div>
        <div className="mb-4 bg-white rounded-xl shadow-sm border border-[#e0d5c7] px-3 py-3 flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-[11px] text-gray-600 mb-1">Status</label>
            <select value={bookingFilters.status} onChange={e=>setBookingFilters({ ...bookingFilters, status: e.target.value })} className="px-3 py-2 border border-[#d4c4b0] rounded-lg text-sm">
              <option value="">All</option>
              {['pending','confirmed','completed','cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-gray-600 mb-1">From</label>
            <input type="date" value={bookingFilters.from} onChange={e=>setBookingFilters({ ...bookingFilters, from: e.target.value })} className="px-3 py-2 border border-[#d4c4b0] rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-[11px] text-gray-600 mb-1">To</label>
            <input type="date" value={bookingFilters.to} onChange={e=>setBookingFilters({ ...bookingFilters, to: e.target.value })} className="px-3 py-2 border border-[#d4c4b0] rounded-lg text-sm" />
          </div>
          <button onClick={exportBookingsCsv} className="ml-auto inline-flex items-center justify-center px-3 py-2 rounded-lg bg-[#a06b42] hover:bg-[#8f5a32] text-white text-xs font-medium shadow-sm">Export CSV</button>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-[#e0d5c7] overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-[#f7efe4] text-left text-[11px] uppercase tracking-wide text-[#6b5744]">
                <th className="px-4 py-2">Attraction</th>
                <th className="px-4 py-2">Guest</th>
                <th className="px-4 py-2">Visit Date</th>
                <th className="px-4 py-2">Tickets</th>
                <th className="px-4 py-2">Amount</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBookings.filter(b => {
                if (bookingFilters.status && b.status !== bookingFilters.status) return false;
                if (bookingFilters.from) {
                  const from = new Date(bookingFilters.from);
                  if (new Date(b.visitDate) < from) return false;
                }
                if (bookingFilters.to) {
                  const to = new Date(bookingFilters.to);
                  if (new Date(b.visitDate) > to) return false;
                }
                return true;
              }).map(b => (
                <tr key={b._id} className="border-t border-[#f0e6d9] hover:bg-[#fffaf4]">
                  <td className="px-4 py-3 text-sm font-medium text-[#3b2a18]">{b.attraction?.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{b.guest?.firstName} {b.guest?.lastName}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{new Date(b.visitDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{b.numberOfPeople}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-[#4b2a00]">{formatAmount(b.totalAmount)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${
                      b.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      b.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                      b.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {b.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 flex flex-wrap items-center gap-1.5">
                    {['pending','confirmed','completed','cancelled'].map(s => (
                      <button key={s} onClick={async () => {
                        const res = await fetch(`${API_URL}/api/attraction-bookings/${b._id}/status`, { method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: s }) });
                        const data = await res.json();
                        if (!res.ok) return toast.error(data.message || 'Failed');
                        setBookings(list => list.map(x => x._id === b._id ? data.booking : x));
                        toast.success('Status updated');
                      }} className="px-2 py-1 rounded-full border border-[#d4c4b0] bg-white text-[11px] text-[#4b2a00] hover:bg-[#f5e6d5]">{s}</button>
                    ))}
                    <button onClick={() => setReceiptBooking(b)} className="px-2 py-1 rounded-full bg-emerald-600 text-white text-[11px] hover:bg-emerald-700">Receipt</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {receiptBooking && (
        <ReceiptPreview
          title="Attraction Booking Receipt"
          lines={[
            { label: 'Receipt', value: `#${String(receiptBooking._id).slice(-8)}` },
            { label: 'Date', value: new Date().toLocaleString() },
            '---',
            { label: 'Attraction', value: receiptBooking.attraction?.name || '' },
            { label: 'Guest', value: `${receiptBooking.guest?.firstName || ''} ${receiptBooking.guest?.lastName || ''}`.trim() },
            { label: 'Visit', value: new Date(receiptBooking.visitDate).toLocaleDateString() },
            { label: 'Tickets', value: String(receiptBooking.numberOfPeople || 0) },
            { label: 'Amount', value: `RWF ${Number(receiptBooking.totalAmount || 0).toLocaleString()}` },
            { label: 'Status', value: receiptBooking.status || '' },
          ]}
          onPrint={() => window.print()}
          onClose={() => setReceiptBooking(null)}
        />
      )}

      <SuccessModal
        open={successOpen}
        title={successTitle}
        message={successMsg}
        onClose={() => setSuccessOpen(false)}
      />
    </div>
  );
  </div>
  )}

