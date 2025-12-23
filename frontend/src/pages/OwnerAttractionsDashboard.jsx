import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  const createFormRef = useRef(null);
  const [bookingsMenuOpen, setBookingsMenuOpen] = useState(false);
  const [directBookingDraft, setDirectBookingDraft] = useState({
    attractionId: '',
    visitDate: '',
    tickets: 1,
    paymentMethod: 'cash',
    paymentStatus: 'paid',
    contactPhone: '',
    notes: '',
    guestInfo: { firstName: '', lastName: '', email: '', phone: '' }
  });
  const [directBookingSaving, setDirectBookingSaving] = useState(false);
  const [activeAttraction, setActiveAttraction] = useState(null);
  const [activeAttractionLoading, setActiveAttractionLoading] = useState(false);

  const [attractionExpensesLoading, setAttractionExpensesLoading] = useState(false);
  const [attractionExpenses, setAttractionExpenses] = useState([]);
  const [attractionExpensesTotal, setAttractionExpensesTotal] = useState(0);
  const [attractionExpenseFilters, setAttractionExpenseFilters] = useState({ from: '', to: '' });
  const [attractionExpenseForm, setAttractionExpenseForm] = useState({ date: '', amount: '', category: '', note: '' });
  const [attractionExpenseSaving, setAttractionExpenseSaving] = useState(false);
  const [editingAttractionExpenseId, setEditingAttractionExpenseId] = useState(null);

  const [attractionExpenseCategoriesLoading, setAttractionExpenseCategoriesLoading] = useState(false);
  const [attractionExpenseCategories, setAttractionExpenseCategories] = useState([]);

  const [attractionReportsLoading, setAttractionReportsLoading] = useState(false);
  const [attractionReportRange, setAttractionReportRange] = useState('monthly');
  const [attractionReportDate, setAttractionReportDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [attractionReportSummary, setAttractionReportSummary] = useState(null);

  const [detailsDraft, setDetailsDraft] = useState(null);
  const [detailsSaving, setDetailsSaving] = useState(false);

  const [scheduleDraft, setScheduleDraft] = useState(null);
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [availabilityCheck, setAvailabilityCheck] = useState({ visitDate: '', tickets: 1, loading: false, result: null });

  const [mediaDraft, setMediaDraft] = useState(null);
  const [mediaSaving, setMediaSaving] = useState(false);
  const [mediaUploadFiles, setMediaUploadFiles] = useState([]);
  const [coverImage, setCoverImage] = useState('');
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
  const currentViewParam = (searchParams.get('view') || 'overview').toLowerCase();
  const sectionParam = (searchParams.get('section') || '').toLowerCase();
  const attractionsSection = currentViewParam === 'attractions' ? (sectionParam || 'list') : 'list';
  const bookingsSection = currentViewParam === 'bookings' ? (sectionParam || 'list') : 'list';
  const expensesSection = currentViewParam === 'expenses' ? (sectionParam || 'all') : 'all';
  const incomeRevenueSection = currentViewParam === 'income-revenue' ? (sectionParam || 'transactions') : 'transactions';
  const clientsContractsSection = currentViewParam === 'clients-contracts' ? (sectionParam || 'clients') : 'clients';
  const notificationsSection = currentViewParam === 'notifications' ? (sectionParam || 'maintenance') : 'maintenance';

  const financeFilterLabel = (() => {
    switch (financeFilter) {
      case 'paid': return 'Paid payments';
      case 'pending': return 'Pending payments';
      case 'unpaid': return 'Unpaid payments';
      default: return 'All payments';
    }
  })();

  const bookingStatusParam = (searchParams.get('bstatus') || 'all').toLowerCase();
  const bookingPaymentParam = (searchParams.get('pstatus') || 'all').toLowerCase();

  const normalizePaymentStatus = (b) => {
    const raw = (b?.paymentStatus ?? b?.payment_state ?? b?.payment ?? '').toString().toLowerCase();
    if (raw === 'paid' || raw === 'pending' || raw === 'unpaid') return raw;
    // Fallback: this project doesn't persist a dedicated paymentStatus in the attraction booking schema.
    // Derive a reasonable value from existing fields to keep filters working on real DB data.
    const status = String(b?.status || '').toLowerCase();
    if (status === 'cancelled') return 'unpaid';
    if (status === 'completed') return 'paid';
    if (status === 'confirmed') return 'pending';
    if (status === 'pending') return 'pending';
    return 'pending';
  };

  const normalizeBookingStatus = (b) => String(b?.status || '').toLowerCase();

  const goToDashboardView = (nextView, updateParams) => {
    setView(nextView);
    try {
      const next = new URLSearchParams(searchParams.toString());
      if (!nextView || nextView === 'overview') {
        next.delete('view');
      } else {
        next.set('view', String(nextView));
      }
      next.delete('section');
      if (typeof updateParams === 'function') updateParams(next);
      setSearchParams(next, { replace: true });
    } catch (_) {}
  };

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
      const pay = normalizePaymentStatus(b);
      if (filter === 'paid' && pay !== 'paid') return;
      if (filter === 'pending' && pay !== 'pending') return;
      if (filter === 'unpaid' && pay !== 'unpaid') return;

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
      if (!v) return fallback;
      const last = String(key || '').split('.').pop();
      if (v === key || (last && v === last)) return fallback;
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
      case 'expenses':
        if (view !== 'expenses') setView('expenses');
        break;
      case 'income-revenue':
        if (view !== 'income-revenue') setView('income-revenue');
        break;
      case 'clients-contracts':
        if (view !== 'clients-contracts') setView('clients-contracts');
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
      case 'notifications':
        if (view !== 'notifications') setView('notifications');
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

  const selectedAttraction = useMemo(() => {
    if (!selectedAttractionId || selectedAttractionId === 'all') return null;
    const list = Array.isArray(items) ? items : [];
    return list.find(a => String(a._id) === String(selectedAttractionId)) || null;
  }, [items, selectedAttractionId]);

  const canUseAttractionTools = !!selectedAttraction && String(selectedAttractionId) !== 'all';

  const loadActiveAttraction = async (id) => {
    if (!id || id === 'all') {
      setActiveAttraction(null);
      return;
    }
    try {
      setActiveAttractionLoading(true);
      const res = await fetch(`${API_URL}/api/attractions/${id}/manage`, { credentials: 'include' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Failed to load attraction');
      setActiveAttraction(data.attraction || null);
    } catch (e) {
      console.error('[Attractions][loadActiveAttraction] error', e);
      setActiveAttraction(null);
      toast.error(e.message);
    } finally {
      setActiveAttractionLoading(false);
    }
  };

  useEffect(() => {
    if (!canUseAttractionTools) {
      setActiveAttraction(null);
      return;
    }
    loadActiveAttraction(selectedAttractionId);
  }, [selectedAttractionId]);

  useEffect(() => {
    if (!activeAttraction) {
      setDetailsDraft(null);
      setScheduleDraft(null);
      setMediaDraft(null);
      setCoverImage('');
      return;
    }
    setDetailsDraft({
      name: activeAttraction.name || '',
      description: activeAttraction.description || '',
      location: activeAttraction.location || '',
      city: activeAttraction.city || '',
      country: activeAttraction.country || 'Rwanda',
      category: activeAttraction.category || 'cultural',
      price: Number(activeAttraction.price || 0),
      currency: activeAttraction.currency || 'RWF',
      duration: activeAttraction.duration || '',
      bookingRequired: activeAttraction.bookingRequired || 'yes',
      contactEmail: activeAttraction.contactEmail || '',
      contactPhone: activeAttraction.contactPhone || '',
      contactWebsite: activeAttraction.contactWebsite || ''
    });
    setScheduleDraft({
      capacity: Number(activeAttraction.capacity || 50),
      operatingHours: {
        open: activeAttraction.operatingHours?.open || '08:00',
        close: activeAttraction.operatingHours?.close || '18:00',
        days: Array.isArray(activeAttraction.operatingHours?.days) ? activeAttraction.operatingHours.days : []
      }
    });
    const amenitiesList = Array.isArray(activeAttraction.amenities) ? activeAttraction.amenities : [];
    setMediaDraft({
      description: activeAttraction.description || '',
      amenities: amenitiesList,
      video: activeAttraction.video || ''
    });
    const first = (activeAttraction.images && activeAttraction.images[0]) ? activeAttraction.images[0] : '';
    setCoverImage(first);
  }, [activeAttraction]);

  const saveAttractionPatch = async (id, patch) => {
    const res = await fetch(`${API_URL}/api/attractions/${id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Update failed');
    setItems(list => list.map(x => String(x._id) === String(id) ? data.attraction : x));
    setActiveAttraction(data.attraction);
    return data.attraction;
  };

  const ensureHasAttractions = () => {
    if (loading) return { ok: false, type: 'loading' };
    if (!items || items.length === 0) return { ok: false, type: 'empty' };
    return { ok: true };
  };

  const filteredBookings = useMemo(() => {
    if (!Array.isArray(bookings)) return [];
    if (!selectedAttractionId || selectedAttractionId === 'all') return bookings;
    return bookings.filter(b => {
      const id = b?.attraction?._id || b?.attraction;
      return id && String(id) === String(selectedAttractionId);
    });
  }, [bookings, selectedAttractionId]);

  const filteredBookingsForView = useMemo(() => {
    const list = Array.isArray(filteredBookings) ? filteredBookings : [];
    const bs = bookingStatusParam;
    const ps = bookingPaymentParam;
    return list.filter(b => {
      if (bs && bs !== 'all') {
        if (normalizeBookingStatus(b) !== bs) return false;
      }
      if (ps && ps !== 'all') {
        if (normalizePaymentStatus(b) !== ps) return false;
      }
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
  }, [filteredBookings, bookingStatusParam, bookingPaymentParam, bookingFilters.from, bookingFilters.to]);

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
      if (normalizeBookingStatus(b) === 'cancelled') return;
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

  const overviewKpis = useMemo(() => {
    const now = new Date();
    const upcoming7 = new Date(now);
    upcoming7.setDate(upcoming7.getDate() + 7);

    const listA = Array.isArray(filteredItems) ? filteredItems : [];
    const listB = Array.isArray(filteredBookings) ? filteredBookings : [];

    let activeAttractions = 0;
    listA.forEach(a => { if (a?.isActive) activeAttractions += 1; });

    let upcomingVisits7d = 0;
    let pendingBookings = 0;
    let paidBookings = 0;
    let unpaidBookings = 0;

    listB.forEach(b => {
      const st = normalizeBookingStatus(b);
      const pay = normalizePaymentStatus(b);
      const visit = b?.visitDate ? new Date(b.visitDate) : null;

      if (st === 'pending') pendingBookings += 1;
      if (pay === 'paid') paidBookings += 1;
      if (pay === 'unpaid') unpaidBookings += 1;

      if (visit && !Number.isNaN(visit.getTime())) {
        if (visit >= now && visit <= upcoming7 && st !== 'cancelled') upcomingVisits7d += 1;
      }
    });

    return {
      attractionsTotal: listA.length,
      attractionsActive: activeAttractions,
      bookingsTotal: listB.length,
      upcomingVisits7d,
      pendingBookings,
      paidBookings,
      unpaidBookings
    };
  }, [filteredItems, filteredBookings]);

  const recentBookings = useMemo(() => {
    const list = Array.isArray(filteredBookings) ? filteredBookings : [];
    return list.slice(0, 5);
  }, [filteredBookings]);

  const empty = useMemo(() => ({
    name: '',
    description: '',
    category: 'cultural',
    location: '',
    city: '',
    country: 'Rwanda',
    price: 0,
    currency: 'RWF',
    isActive: true,
    highlights: ''
  }), []);

  const [form, setForm] = useState(empty);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState('create');
  const [editingId, setEditingId] = useState(null);

  const openCreateEditor = () => {
    window.location.assign('/upload-property?type=attraction');
  };

  const openEditEditor = (item) => {
    const id = item?._id;
    if (!id) return;
    setEditorMode('edit');
    setEditingId(String(id));
    setCreateImages([]);
    setForm({
      name: item?.name || '',
      description: item?.description || '',
      category: item?.category || 'cultural',
      location: item?.location || '',
      city: item?.city || '',
      country: item?.country || 'Rwanda',
      price: Number(item?.price || 0),
      currency: item?.currency || 'RWF',
      isActive: Boolean(item?.isActive),
      highlights: Array.isArray(item?.amenities) ? item.amenities.join(', ') : (item?.amenities || '')
    });
    setEditorOpen(true);
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setEditingId(null);
    setEditorMode('create');
    setForm(empty);
    setCreateImages([]);
  };

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

  const fetchAttractionExpenses = async () => {
    try {
      setAttractionExpensesLoading(true);
      const q = new URLSearchParams();
      if (selectedAttractionId && selectedAttractionId !== 'all') q.set('attraction', String(selectedAttractionId));
      if (attractionExpenseFilters.from) q.set('from', attractionExpenseFilters.from);
      if (attractionExpenseFilters.to) q.set('to', attractionExpenseFilters.to);
      const res = await fetch(`${API_URL}/api/attraction-finance/expenses?${q.toString()}`, { credentials: 'include' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Failed to load expenses');
      setAttractionExpenses(Array.isArray(data.expenses) ? data.expenses : []);
      setAttractionExpensesTotal(Number(data.total || 0));
    } catch (e) {
      toast.error(e.message || 'Failed to load expenses');
      setAttractionExpenses([]);
      setAttractionExpensesTotal(0);
    } finally {
      setAttractionExpensesLoading(false);
    }
  };

  const fetchAttractionExpenseCategories = async () => {
    try {
      setAttractionExpenseCategoriesLoading(true);
      const q = new URLSearchParams();
      if (selectedAttractionId && selectedAttractionId !== 'all') q.set('attraction', String(selectedAttractionId));
      if (attractionExpenseFilters.from) q.set('from', attractionExpenseFilters.from);
      if (attractionExpenseFilters.to) q.set('to', attractionExpenseFilters.to);
      const res = await fetch(`${API_URL}/api/attraction-finance/categories?${q.toString()}`, { credentials: 'include' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Failed to load categories');
      setAttractionExpenseCategories(Array.isArray(data.categories) ? data.categories : []);
    } catch (e) {
      toast.error(e.message || 'Failed to load categories');
      setAttractionExpenseCategories([]);
    } finally {
      setAttractionExpenseCategoriesLoading(false);
    }
  };

  const fetchAttractionReportSummary = async () => {
    try {
      setAttractionReportsLoading(true);
      const q = new URLSearchParams();
      if (selectedAttractionId && selectedAttractionId !== 'all') q.set('attraction', String(selectedAttractionId));
      q.set('range', attractionReportRange || 'monthly');
      if (attractionReportDate) q.set('date', attractionReportDate);
      const res = await fetch(`${API_URL}/api/attraction-finance/summary?${q.toString()}`, { credentials: 'include' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Failed to load report');
      setAttractionReportSummary(data);
    } catch (e) {
      toast.error(e.message || 'Failed to load report');
      setAttractionReportSummary(null);
    } finally {
      setAttractionReportsLoading(false);
    }
  };

  const resetAttractionExpenseEditor = () => {
    setEditingAttractionExpenseId(null);
    setAttractionExpenseForm({ date: '', amount: '', category: '', note: '' });
  };

  const submitAttractionExpense = async (e) => {
    e?.preventDefault?.();
    try {
      const amountNumber = Number(attractionExpenseForm.amount || 0);
      if (!amountNumber || !Number.isFinite(amountNumber) || amountNumber <= 0) {
        toast.error(labelOr('ownerAttractions.expenses.errors.amount', 'Enter a valid amount'));
        return;
      }
      const date = attractionExpenseForm.date || new Date().toISOString().slice(0, 10);
      const payload = {
        attraction: (selectedAttractionId && selectedAttractionId !== 'all') ? selectedAttractionId : undefined,
        date,
        amount: amountNumber,
        category: attractionExpenseForm.category || 'general',
        note: attractionExpenseForm.note || ''
      };

      if (!payload.attraction) {
        toast.error(labelOr('ownerAttractions.expenses.errors.attractionRequired', 'Select an attraction in the scope selector to add an expense.'));
        return;
      }

      setAttractionExpenseSaving(true);
      const isEditing = !!editingAttractionExpenseId;
      const url = isEditing
        ? `${API_URL}/api/attraction-finance/expenses/${editingAttractionExpenseId}`
        : `${API_URL}/api/attraction-finance/expenses`;
      const method = isEditing ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || (isEditing ? 'Failed to update expense' : 'Failed to record expense'));

      toast.success(isEditing
        ? labelOr('ownerAttractions.expenses.updated', 'Expense updated')
        : labelOr('ownerAttractions.expenses.created', 'Expense recorded'));

      resetAttractionExpenseEditor();
      await fetchAttractionExpenses();
      if (expensesSection === 'categories') await fetchAttractionExpenseCategories();
      if (expensesSection === 'reports') await fetchAttractionReportSummary();

      if (expensesSection === 'add') {
        try {
          const next = new URLSearchParams(searchParams.toString());
          next.set('view', 'expenses');
          next.set('section', 'all');
          setSearchParams(next, { replace: true });
        } catch (_) {}
      }
    } catch (err) {
      toast.error(err.message || 'Failed to save expense');
    } finally {
      setAttractionExpenseSaving(false);
    }
  };

  const startEditAttractionExpense = (exp) => {
    setEditingAttractionExpenseId(exp?._id || null);
    setAttractionExpenseForm({
      date: exp?.date ? new Date(exp.date).toISOString().slice(0, 10) : '',
      amount: exp?.amount != null ? String(exp.amount) : '',
      category: exp?.category || '',
      note: exp?.note || ''
    });
    try {
      const next = new URLSearchParams(searchParams.toString());
      next.set('view', 'expenses');
      next.set('section', 'add');
      setSearchParams(next, { replace: true });
    } catch (_) {}
  };

  const deleteAttractionExpense = async (id) => {
    if (!id) return;
    try {
      const ok = confirm(labelOr('ownerAttractions.expenses.confirmDelete', 'Delete this expense?'));
      if (!ok) return;
      const res = await fetch(`${API_URL}/api/attraction-finance/expenses/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Failed to delete expense');
      toast.success(labelOr('ownerAttractions.expenses.deleted', 'Expense deleted'));
      if (String(editingAttractionExpenseId || '') === String(id)) {
        resetAttractionExpenseEditor();
      }
      await fetchAttractionExpenses();
      if (expensesSection === 'categories') await fetchAttractionExpenseCategories();
      if (expensesSection === 'reports') await fetchAttractionReportSummary();
    } catch (e) {
      toast.error(e.message || 'Failed to delete expense');
    }
  };

  async function createDirectAttractionBooking(e) {
    e?.preventDefault?.();
    try {
      if (!directBookingDraft.attractionId || !directBookingDraft.visitDate) {
        toast.error(labelOr('ownerAttractions.bookings.direct.missing', 'Please select an attraction and visit date.'));
        return;
      }
      setDirectBookingSaving(true);
      const payload = {
        attractionId: directBookingDraft.attractionId,
        visitDate: directBookingDraft.visitDate,
        tickets: Number(directBookingDraft.tickets || 1) || 1,
        notes: directBookingDraft.notes,
        contactPhone: directBookingDraft.contactPhone,
        paymentMethod: directBookingDraft.paymentMethod,
        directBooking: true,
        paymentStatus: directBookingDraft.paymentStatus,
        guestInfo: {
          firstName: directBookingDraft.guestInfo?.firstName,
          lastName: directBookingDraft.guestInfo?.lastName,
          email: directBookingDraft.guestInfo?.email,
          phone: directBookingDraft.guestInfo?.phone
        }
      };
      const res = await fetch(`${API_URL}/api/attraction-bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Failed to create booking');
      toast.success(labelOr('ownerAttractions.bookings.direct.created', 'Direct booking created'));
      await loadMine();
      try {
        const next = new URLSearchParams(searchParams.toString());
        next.set('view', 'bookings');
        next.set('section', 'list');
        setSearchParams(next, { replace: true });
        setView('bookings');
      } catch (_) {}
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDirectBookingSaving(false);
    }
  }

  function exportBookingsCsv() {
    const rows = [['Attraction','Guest','Visit Date','Tickets','Amount','Status']];
    const filtered = filteredBookingsForView;
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

  useEffect(() => {
    if (view !== 'expenses') return;
    if (expensesSection === 'all') {
      fetchAttractionExpenses();
    }
    if (expensesSection === 'categories') {
      fetchAttractionExpenseCategories();
    }
    if (expensesSection === 'reports') {
      fetchAttractionReportSummary();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, expensesSection, selectedAttractionId, attractionExpenseFilters.from, attractionExpenseFilters.to, attractionReportRange, attractionReportDate]);

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

  async function saveEditor() {
    try {
      if (user?.isBlocked) {
        toast.error(labelOr('ownerAttractions.blockedToast', 'Your account is deactivated.')); 
        return;
      }
      if (!String(form.name || '').trim()) {
        toast.error(labelOr('ownerAttractions.errors.nameRequired', 'Name is required'));
        return;
      }

      const payload = {
        ...form,
        price: Number(form.price || 0),
        amenities: String(form.highlights || '').split(',').map(s => s.trim()).filter(Boolean)
      };

      if (editorMode === 'create' && (!createImages || createImages.length === 0)) {
        toast.error(labelOr('ownerAttractions.errors.addAtLeastOneImage', 'Please add at least one image'));
        return;
      }

      setSaving(true);

      if (editorMode === 'create') {
        const res = await fetch(`${API_URL}/api/attractions`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || labelOr('ownerAttractions.errors.failedToCreate', 'Failed to create'));
        setItems(list => [data.attraction, ...list]);
        await uploadImages(data.attraction._id, createImages);
        toast.success(labelOr('ownerAttractions.toasts.created', 'Attraction created'));
        setSuccessTitle(labelOr('ownerAttractions.modals.createdTitle', 'Attraction Created'));
        setSuccessMsg(labelOr('ownerAttractions.modals.createdMessage', 'Your attraction was created successfully.'));
        setSuccessOpen(true);
        closeEditor();
      } else {
        const id = editingId;
        if (!id) {
          toast.error(labelOr('ownerAttractions.errors.missingAttractionId', 'Missing attraction id'));
          return;
        }
        const res = await fetch(`${API_URL}/api/attractions/${id}`, {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || labelOr('ownerAttractions.errors.updateFailed', 'Update failed'));
        setItems(list => list.map(x => String(x._id) === String(id) ? data.attraction : x));
        if (createImages && createImages.length > 0) {
          await uploadImages(id, createImages);
        }
        toast.success(labelOr('ownerAttractions.toasts.updated', 'Updated'));
        setSuccessTitle(labelOr('ownerAttractions.modals.updatedTitle', 'Attraction Updated'));
        setSuccessMsg(labelOr('ownerAttractions.modals.updatedMessage', 'Your attraction was updated successfully.'));
        setSuccessOpen(true);
        closeEditor();
      }
    } catch (e) {
      console.error('[Attractions][saveEditor] error', e);
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function createItem(e) {
    e.preventDefault();
    try {
      console.log('[Attractions][create] payload', form);
      if (!createImages || createImages.length === 0) { toast.error('Please add at least one image'); return; }
      setSaving(true);
      const payload = {
        ...form,
        price: Number(form.price || 0),
        amenities: String(form.highlights || '').split(',').map(s => s.trim()).filter(Boolean)
      };
      const res = await fetch(`${API_URL}/api/attractions`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      const data = await res.json();
      console.log('[Attractions][create] result', { status: res.status, id: data?.attraction?._id });
      if (!res.ok) throw new Error(data.message || 'Failed to create');
      setItems(list => [data.attraction, ...list]);
      toast.success(labelOr('ownerAttractions.toasts.created', 'Attraction created'));
      setSuccessTitle(labelOr('ownerAttractions.modals.createdTitle', 'Attraction Created'));
      setSuccessMsg(labelOr('ownerAttractions.modals.createdMessage', 'Your attraction was created successfully.'));
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
      toast.success(labelOr('ownerAttractions.toasts.updated', 'Updated'));
      setSuccessTitle(labelOr('ownerAttractions.modals.updatedTitle', 'Attraction Updated'));
      setSuccessMsg(labelOr('ownerAttractions.modals.updatedMessage', 'Your attraction was updated successfully.'));
      setSuccessOpen(true);
    } catch (e) { console.error('[Attractions][update] error', e); toast.error(e.message); }
  }

  async function deleteItem(id) {
    if (!confirm(labelOr('ownerAttractions.confirm.deleteAttraction', 'Delete this attraction?'))) return;
    try {
      console.log('[Attractions][delete] id', id);
      const res = await fetch(`${API_URL}/api/attractions/${id}`, { method: 'DELETE', credentials: 'include' });
      const data = await res.json().catch(()=>({}));
      console.log('[Attractions][delete] result', { status: res.status });
      if (!res.ok) throw new Error(data.message || 'Delete failed');
      setItems(list => list.filter(x => x._id !== id));
      toast.success(labelOr('ownerAttractions.toasts.deleted', 'Deleted'));
      setSuccessTitle(labelOr('ownerAttractions.modals.deletedTitle', 'Attraction Deleted'));
      setSuccessMsg(labelOr('ownerAttractions.modals.deletedMessage', 'Your attraction was deleted successfully.'));
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
      setActiveAttraction(prev => (prev && String(prev._id) === String(id)) ? data.attraction : prev);
      toast.success(labelOr('ownerAttractions.toasts.imagesUploaded', 'Images uploaded'));
      setSuccessTitle(labelOr('ownerAttractions.modals.imagesUploadedTitle', 'Images Uploaded'));
      setSuccessMsg(labelOr('ownerAttractions.modals.imagesUploadedMessage', 'Your attraction images were uploaded successfully.'));
      setSuccessOpen(true);
    } catch (e) { console.error('[Attractions][uploadImages] error', e); toast.error(e.message); } finally { setUploadingId(null); }
  }

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
        <div className="mb-4 flex items-center justify-end gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.location.assign('/upload-property?type=attraction')}
              className="px-4 py-2 rounded-lg bg-[#a06b42] hover:bg-[#8f5a32] text-white text-sm font-medium shadow-sm"
            >
              List Your Attraction
            </button>
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
      <div className="mb-4 -mx-1 px-1 overflow-x-auto scrollbar-hide">
        <div className="flex flex-nowrap gap-2 text-sm min-w-max">
        <button
          type="button"
          onClick={() => {
            setView('overview');
            try {
              const next = new URLSearchParams(searchParams.toString());
              next.delete('view');
              next.delete('section');
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
              next.delete('section');
              setSearchParams(next, { replace: true });
            } catch (_) {}
          }}
          className={`px-3 py-1.5 rounded-full border ${view === 'attractions' ? 'bg-[#a06b42] text-white border-[#a06b42]' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
        >
          Attractions
        </button>
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setView('bookings');
              try {
                const next = new URLSearchParams(searchParams.toString());
                next.set('view', 'bookings');
                next.delete('section');
                setSearchParams(next, { replace: true });
              } catch (_) {}
            }}
            className={`px-3 py-1.5 rounded-full border ${view === 'bookings' ? 'bg-[#a06b42] text-white border-[#a06b42]' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
          >
            Bookings
          </button>
          <button
            type="button"
            onClick={() => setBookingsMenuOpen(v => !v)}
            className="absolute -right-2 top-0 h-full px-2 text-[10px] text-gray-600"
            title={labelOr('ownerAttractions.bookings.filters', 'Booking filters')}
          >
            ▾
          </button>
          {bookingsMenuOpen && (
            <div
              className="absolute z-20 mt-2 w-64 rounded-xl border border-[#e0d5c7] bg-white shadow-lg p-2"
              onMouseLeave={() => setBookingsMenuOpen(false)}
            >
              <div className="px-2 py-1 text-[11px] text-gray-500">{labelOr('ownerAttractions.bookings.status', 'Booking status')}</div>
              <div className="flex flex-wrap gap-1 px-2 pb-2">
                {['all','pending','confirmed','completed','cancelled'].map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      const next = new URLSearchParams(searchParams.toString());
                      next.set('view','bookings');
                      if (s === 'all') next.delete('bstatus'); else next.set('bstatus', s);
                      setSearchParams(next, { replace: true });
                      setBookingsMenuOpen(false);
                    }}
                    className={`px-2 py-1 rounded-full border text-[11px] ${bookingStatusParam === s ? 'bg-[#f5e6d5] text-[#4b2a00] border-[#a06b42] font-semibold' : 'bg-white text-[#6b5744] border-[#e0d5c7] hover:bg-[#f9f1e7]'}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <div className="px-2 py-1 text-[11px] text-gray-500">{labelOr('ownerAttractions.bookings.payment', 'Payment status')}</div>
              <div className="flex flex-wrap gap-1 px-2 pb-2">
                {['all','paid','pending','unpaid'].map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      const next = new URLSearchParams(searchParams.toString());
                      next.set('view','bookings');
                      if (s === 'all') next.delete('pstatus'); else next.set('pstatus', s);
                      setSearchParams(next, { replace: true });
                      setBookingsMenuOpen(false);
                    }}
                    className={`px-2 py-1 rounded-full border text-[11px] ${bookingPaymentParam === s ? 'bg-[#f5e6d5] text-[#4b2a00] border-[#a06b42] font-semibold' : 'bg-white text-[#6b5744] border-[#e0d5c7] hover:bg-[#f9f1e7]'}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            setView('finance');
            try {
              const next = new URLSearchParams(searchParams.toString());
              next.set('view', 'finance');
              next.delete('section');
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
            setView('expenses');
            try {
              const next = new URLSearchParams(searchParams.toString());
              next.set('view', 'expenses');
              next.delete('section');
              setSearchParams(next, { replace: true });
            } catch (_) {}
          }}
          className={`px-3 py-1.5 rounded-full border ${view === 'expenses' ? 'bg-[#a06b42] text-white border-[#a06b42]' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
        >
          {labelOr('nav.expenses', 'Expenses')}
        </button>
        <button
          type="button"
          onClick={() => {
            setView('income-revenue');
            try {
              const next = new URLSearchParams(searchParams.toString());
              next.set('view', 'income-revenue');
              next.delete('section');
              setSearchParams(next, { replace: true });
            } catch (_) {}
          }}
          className={`px-3 py-1.5 rounded-full border ${view === 'income-revenue' ? 'bg-[#a06b42] text-white border-[#a06b42]' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
        >
          {labelOr('nav.incomeRevenue', 'Income & revenue')}
        </button>
        <button
          type="button"
          onClick={() => {
            setView('clients-contracts');
            try {
              const next = new URLSearchParams(searchParams.toString());
              next.set('view', 'clients-contracts');
              next.delete('section');
              setSearchParams(next, { replace: true });
            } catch (_) {}
          }}
          className={`px-3 py-1.5 rounded-full border ${view === 'clients-contracts' ? 'bg-[#a06b42] text-white border-[#a06b42]' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
        >
          {labelOr('nav.clientsContracts', 'Clients & contracts')}
        </button>
        <button
          type="button"
          onClick={() => {
            setView('analytics');
            try {
              const next = new URLSearchParams(searchParams.toString());
              next.set('view', 'analytics');
              next.delete('section');
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
              next.delete('section');
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
              next.delete('section');
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
              next.delete('section');
              setSearchParams(next, { replace: true });
            } catch (_) {}
          }}
          className={`px-3 py-1.5 rounded-full border ${view === 'settings' ? 'bg-[#a06b42] text-white border-[#a06b42]' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
        >
          Settings
        </button>
        <button
          type="button"
          onClick={() => {
            setView('notifications');
            try {
              const next = new URLSearchParams(searchParams.toString());
              next.set('view', 'notifications');
              next.delete('section');
              setSearchParams(next, { replace: true });
            } catch (_) {}
          }}
          className={`px-3 py-1.5 rounded-full border ${view === 'notifications' ? 'bg-[#a06b42] text-white border-[#a06b42]' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
        >
          {labelOr('nav.notificationsAlerts', 'Notifications')}
        </button>
        </div>
      </div>

      {view === 'attractions' && (
        <div className="mb-4 flex flex-wrap gap-2 text-[11px] sm:text-xs">
          <button
            type="button"
            onClick={() => {
              try {
                const next = new URLSearchParams(searchParams.toString());
                next.delete('section');
                setSearchParams(next, { replace: true });
              } catch (_) {}
            }}
            className={`px-2.5 py-1 rounded-full border ${
              attractionsSection === 'list'
                ? 'bg-[#f5e6d5] text-[#4b2a00] border-[#a06b42] font-semibold'
                : 'bg-white text-[#6b5744] border-[#e0d5c7] hover:bg-[#f9f1e7]'
            }`}
          >
            {labelOr('nav.allAttractions', 'All attractions')}
          </button>
          <button
            type="button"
            onClick={() => {
              try {
                const next = new URLSearchParams(searchParams.toString());
                next.set('section', 'details');
                setSearchParams(next, { replace: true });
              } catch (_) {}
            }}
            className={`px-2.5 py-1 rounded-full border ${
              attractionsSection === 'details'
                ? 'bg-[#f5e6d5] text-[#4b2a00] border-[#a06b42] font-semibold'
                : 'bg-white text-[#6b5744] border-[#e0d5c7] hover:bg-[#f9f1e7]'
            }`}
          >
            {labelOr('nav.attractionDetails', 'Attraction details')}
          </button>
          <button
            type="button"
            onClick={() => {
              try {
                const next = new URLSearchParams(searchParams.toString());
                next.set('section', 'schedule');
                setSearchParams(next, { replace: true });
              } catch (_) {}
            }}
            className={`px-2.5 py-1 rounded-full border ${
              attractionsSection === 'schedule'
                ? 'bg-[#f5e6d5] text-[#4b2a00] border-[#a06b42] font-semibold'
                : 'bg-white text-[#6b5744] border-[#e0d5c7] hover:bg-[#f9f1e7]'
            }`}
          >
            {labelOr('nav.schedulesAvailability', 'Schedules & availability')}
          </button>
          <button
            type="button"
            onClick={() => {
              try {
                const next = new URLSearchParams(searchParams.toString());
                next.set('section', 'media');
                setSearchParams(next, { replace: true });
              } catch (_) {}
            }}
            className={`px-2.5 py-1 rounded-full border ${
              attractionsSection === 'media'
                ? 'bg-[#f5e6d5] text-[#4b2a00] border-[#a06b42] font-semibold'
                : 'bg-white text-[#6b5744] border-[#e0d5c7] hover:bg-[#f9f1e7]'
            }`}
          >
            {labelOr('nav.mediaContent', 'Media & content')}
          </button>
        </div>
      )}

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
          {filteredItems.length === 0 ? (
            <div className="mb-6 rounded-2xl bg-white shadow-sm border border-[#e0d5c7] p-5">
              <div className="text-sm font-semibold text-gray-900">
                {labelOr('ownerAttractions.overview.emptyTitle', 'Start by listing your first attraction')}
              </div>
              <div className="mt-1 text-xs text-gray-600">
                {labelOr('ownerAttractions.overview.emptyBody', 'Your overview will show bookings and revenue once you have at least one active attraction.')}
              </div>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={openCreateEditor}
                  className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-[#a06b42] hover:bg-[#8f5a32] text-white text-sm font-medium shadow-sm"
                >
                  {labelOr('ownerAttractions.addNewAttraction', 'Add new attraction')}
                </button>
              </div>
            </div>
          ) : null}

          <div className="mb-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-2xl bg-white shadow-sm border border-gray-100 px-3 py-2.5">
              <div className="text-[11px] text-gray-500">{labelOr('ownerAttractions.overview.totalAttractions', 'Total attractions')}</div>
              <div className="text-lg font-semibold text-gray-900">{overviewKpis.attractionsTotal}</div>
              <div className="mt-0.5 text-[11px] text-gray-500">
                {overviewKpis.attractionsActive}{' '}{labelOr('ownerAttractions.overview.activeLabel', 'active')}
              </div>
            </div>
            <div className="rounded-2xl bg-white shadow-sm border border-gray-100 px-3 py-2.5">
              <div className="text-[11px] text-gray-500">{labelOr('ownerAttractions.overview.totalBookings', 'Total bookings')}</div>
              <div className="text-lg font-semibold text-gray-900">{overviewKpis.bookingsTotal}</div>
              <div className="mt-0.5 text-[11px] text-gray-500">
                {overviewKpis.upcomingVisits7d}{' '}{labelOr('ownerAttractions.overview.upcoming7d', 'upcoming (7d)')}
              </div>
            </div>
            <div className="rounded-2xl bg-white shadow-sm border border-gray-100 px-3 py-2.5">
              <div className="text-[11px] text-gray-500">{labelOr('ownerAttractions.overview.pendingBookings', 'Pending bookings')}</div>
              <div className="text-lg font-semibold text-yellow-700">{overviewKpis.pendingBookings}</div>
              <button
                type="button"
                onClick={() => goToDashboardView('bookings', (next) => {
                  next.set('bstatus', 'pending');
                  next.delete('pstatus');
                })}
                className="mt-1 text-[11px] text-[#a06b42] hover:underline"
              >
                {labelOr('ownerAttractions.overview.viewPending', 'View pending')}
              </button>
            </div>
            <div className="rounded-2xl bg-white shadow-sm border border-gray-100 px-3 py-2.5">
              <div className="text-[11px] text-gray-500">{labelOr('ownerAttractions.overview.paidUnpaid', 'Paid / unpaid (derived)')}</div>
              <div className="text-lg font-semibold text-gray-900">
                <span className="text-emerald-700">{overviewKpis.paidBookings}</span>
                <span className="text-gray-400"> / </span>
                <span className="text-red-700">{overviewKpis.unpaidBookings}</span>
              </div>
              <div className="mt-0.5 text-[11px] text-gray-500">
                {labelOr('ownerAttractions.overview.paymentDerivedHint', 'Based on booking status')}
              </div>
            </div>
          </div>

          <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-3">
            <button
              type="button"
              onClick={() => goToDashboardView('attractions')}
              className="text-left rounded-xl bg-white shadow-sm border border-gray-100 px-3 py-2 hover:border-[#a06b42] hover:shadow-md transition"
            >
              <div className="text-[11px] text-gray-500">{labelOr('ownerAttractions.overview.quick.attractions', 'Attractions')}</div>
              <div className="text-sm font-semibold text-gray-900">{labelOr('ownerAttractions.overview.quick.manageExperiences', 'Manage experiences')}</div>
              <div className="mt-0.5 text-[11px] text-gray-500">{labelOr('ownerAttractions.overview.quick.manageExperiencesHint', 'Create and update your attractions')}</div>
            </button>
            <button
              type="button"
              onClick={() => goToDashboardView('bookings')}
              className="text-left rounded-xl bg-white shadow-sm border border-gray-100 px-3 py-2 hover:border-[#a06b42] hover:shadow-md transition"
            >
              <div className="text-[11px] text-gray-500">{labelOr('ownerAttractions.overview.quick.bookings', 'Bookings')}</div>
              <div className="text-sm font-semibold text-gray-900">{labelOr('ownerAttractions.overview.quick.reservations', 'Reservations')}</div>
              <div className="mt-0.5 text-[11px] text-gray-500">{labelOr('ownerAttractions.overview.quick.reservationsHint', 'View and manage all attraction bookings')}</div>
            </button>
            <button
              type="button"
              onClick={() => goToDashboardView('finance')}
              className="text-left rounded-xl bg-white shadow-sm border border-gray-100 px-3 py-2 hover:border-[#a06b42] hover:shadow-md transition"
            >
              <div className="text-[11px] text-gray-500">{labelOr('ownerAttractions.overview.quick.finance', 'Finance')}</div>
              <div className="text-sm font-semibold text-gray-900">{labelOr('ownerAttractions.overview.quick.payments', 'Payments overview')}</div>
              <div className="mt-0.5 text-[11px] text-gray-500">{labelOr('ownerAttractions.overview.quick.paymentsHint', 'See revenue totals and payment filters')}</div>
            </button>
            <button
              type="button"
              onClick={() => goToDashboardView('analytics')}
              className="text-left rounded-xl bg-white shadow-sm border border-gray-100 px-3 py-2 hover:border-[#a06b42] hover:shadow-md transition"
            >
              <div className="text-[11px] text-gray-500">{labelOr('ownerAttractions.overview.quick.analytics', 'Analytics')}</div>
              <div className="text-sm font-semibold text-gray-900">{labelOr('ownerAttractions.overview.quick.performanceOverview', 'Performance overview')}</div>
              <div className="mt-0.5 text-[11px] text-gray-500">{labelOr('ownerAttractions.overview.quick.performanceHint', 'See trends across your listings')}</div>
            </button>
          </div>

          <div className="mb-4 grid grid-cols-2 md:grid-cols-4 gap-3">
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

          <div className="rounded-2xl bg-white shadow-sm border border-[#e0d5c7] overflow-hidden">
            <div className="px-4 py-3 bg-[#f7efe4] flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-gray-900">{labelOr('ownerAttractions.overview.recentBookings', 'Recent bookings')}</div>
                <div className="text-[11px] text-gray-600">{labelOr('ownerAttractions.overview.recentBookingsHint', 'Latest activity from your attractions')}</div>
              </div>
              <button
                type="button"
                onClick={() => goToDashboardView('bookings')}
                className="text-xs font-medium text-[#a06b42] hover:underline"
              >
                {labelOr('ownerAttractions.overview.viewAllBookings', 'View all')}
              </button>
            </div>
            <div className="divide-y divide-[#f0e6d9]">
              {recentBookings.length === 0 ? (
                <div className="px-4 py-4 text-xs text-gray-600">
                  {labelOr('ownerAttractions.overview.noBookingsYet', 'No bookings yet for this scope.')}
                </div>
              ) : (
                recentBookings.map(b => (
                  <div key={b._id} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-[#3b2a18] truncate">{b.attraction?.name || labelOr('ownerAttractions.overview.attractionFallback', 'Attraction')}</div>
                      <div className="text-[11px] text-gray-600 truncate">
                        {(b.guest?.firstName || '')} {(b.guest?.lastName || '')} • {new Date(b.visitDate).toLocaleDateString()} • {formatAmount(b.totalAmount)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {(() => {
                        const pay = normalizePaymentStatus(b);
                        const cls = pay === 'paid'
                          ? 'bg-emerald-100 text-emerald-800'
                          : pay === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800';
                        return (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${cls}`}>{pay}</span>
                        );
                      })()}
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${
                        b.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        b.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                        b.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {b.status}
                      </span>
                      <button
                        type="button"
                        onClick={() => goToDashboardView('bookings', (next) => {
                          next.set('bstatus', String(b.status || 'all'));
                        })}
                        className="text-xs font-medium text-[#a06b42] hover:underline"
                      >
                        {labelOr('ownerAttractions.overview.openBookings', 'Open')}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {/* Finance view: computed from attraction bookings for this dashboard */}
      {view === 'finance' && (
        <>
          <div className="mb-3 flex flex-wrap gap-2 text-[11px] sm:text-xs">
            <button
              type="button"
              onClick={() => {
                try {
                  const next = new URLSearchParams(searchParams.toString());
                  next.set('view', 'finance');
                  next.set('filter', 'all');
                  next.delete('mode');
                  setSearchParams(next, { replace: true });
                } catch (_) {}
              }}
              className={`px-2.5 py-1 rounded-full border ${
                financeFilter === 'all' && financeMode !== 'expenses'
                  ? 'bg-[#f5e6d5] text-[#4b2a00] border-[#a06b42] font-semibold'
                  : 'bg-white text-[#6b5744] border-[#e0d5c7] hover:bg-[#f9f1e7]'
              }`}
            >
              {labelOr('ownerAttractions.finance.allPayments', 'All payments')}
            </button>
            <button
              type="button"
              onClick={() => {
                try {
                  const next = new URLSearchParams(searchParams.toString());
                  next.set('view', 'finance');
                  next.set('filter', 'paid');
                  next.delete('mode');
                  setSearchParams(next, { replace: true });
                } catch (_) {}
              }}
              className={`px-2.5 py-1 rounded-full border ${
                financeFilter === 'paid' && financeMode !== 'expenses'
                  ? 'bg-[#f5e6d5] text-[#4b2a00] border-[#a06b42] font-semibold'
                  : 'bg-white text-[#6b5744] border-[#e0d5c7] hover:bg-[#f9f1e7]'
              }`}
            >
              {labelOr('ownerAttractions.finance.paid', 'Paid')}
            </button>
            <button
              type="button"
              onClick={() => {
                try {
                  const next = new URLSearchParams(searchParams.toString());
                  next.set('view', 'finance');
                  next.set('filter', 'pending');
                  next.delete('mode');
                  setSearchParams(next, { replace: true });
                } catch (_) {}
              }}
              className={`px-2.5 py-1 rounded-full border ${
                financeFilter === 'pending' && financeMode !== 'expenses'
                  ? 'bg-[#f5e6d5] text-[#4b2a00] border-[#a06b42] font-semibold'
                  : 'bg-white text-[#6b5744] border-[#e0d5c7] hover:bg-[#f9f1e7]'
              }`}
            >
              {labelOr('ownerAttractions.finance.pending', 'Pending')}
            </button>
            <button
              type="button"
              onClick={() => {
                try {
                  const next = new URLSearchParams(searchParams.toString());
                  next.set('view', 'finance');
                  next.set('filter', 'unpaid');
                  next.delete('mode');
                  setSearchParams(next, { replace: true });
                } catch (_) {}
              }}
              className={`px-2.5 py-1 rounded-full border ${
                financeFilter === 'unpaid' && financeMode !== 'expenses'
                  ? 'bg-[#f5e6d5] text-[#4b2a00] border-[#a06b42] font-semibold'
                  : 'bg-white text-[#6b5744] border-[#e0d5c7] hover:bg-[#f9f1e7]'
              }`}
            >
              {labelOr('ownerAttractions.finance.unpaid', 'Unpaid')}
            </button>
            <button
              type="button"
              onClick={() => {
                try {
                  const next = new URLSearchParams(searchParams.toString());
                  next.set('view', 'finance');
                  next.set('mode', 'expenses');
                  next.set('filter', financeFilter || 'all');
                  setSearchParams(next, { replace: true });
                } catch (_) {}
              }}
              className={`px-2.5 py-1 rounded-full border ${
                financeMode === 'expenses'
                  ? 'bg-[#f5e6d5] text-[#4b2a00] border-[#a06b42] font-semibold'
                  : 'bg-white text-[#6b5744] border-[#e0d5c7] hover:bg-[#f9f1e7]'
              }`}
            >
              {labelOr('ownerAttractions.finance.expensesMode', 'Expenses & profit')}
            </button>
            <span className="inline-flex items-center px-1 text-[10px] text-gray-400">
              |
            </span>
            <button
              type="button"
              onClick={() => {
                try {
                  const next = new URLSearchParams(searchParams.toString());
                  next.set('view', 'finance');
                  next.delete('range');
                  setSearchParams(next, { replace: true });
                } catch (_) {}
              }}
              className={`px-2.5 py-1 rounded-full border ${
                !financeRange || financeRange === 'all'
                  ? 'bg-[#f5e6d5] text-[#4b2a00] border-[#a06b42] font-semibold'
                  : 'bg-white text-[#6b5744] border-[#e0d5c7] hover:bg-[#f9f1e7]'
              }`}
            >
              {labelOr('ownerAttractions.finance.rangeAll', 'All time')}
            </button>
            <button
              type="button"
              onClick={() => {
                try {
                  const next = new URLSearchParams(searchParams.toString());
                  next.set('view', 'finance');
                  next.set('range', '30');
                  setSearchParams(next, { replace: true });
                } catch (_) {}
              }}
              className={`px-2.5 py-1 rounded-full border ${
                financeRange === '30'
                  ? 'bg-[#f5e6d5] text-[#4b2a00] border-[#a06b42] font-semibold'
                  : 'bg-white text-[#6b5744] border-[#e0d5c7] hover:bg-[#f9f1e7]'
              }`}
            >
              {labelOr('ownerAttractions.finance.range30', 'Last 30 days')}
            </button>
            <button
              type="button"
              onClick={() => {
                try {
                  const next = new URLSearchParams(searchParams.toString());
                  next.set('view', 'finance');
                  next.set('range', 'mtd');
                  setSearchParams(next, { replace: true });
                } catch (_) {}
              }}
              className={`px-2.5 py-1 rounded-full border ${
                financeRange === 'mtd'
                  ? 'bg-[#f5e6d5] text-[#4b2a00] border-[#a06b42] font-semibold'
                  : 'bg-white text-[#6b5744] border-[#e0d5c7] hover:bg-[#f9f1e7]'
              }`}
            >
              {labelOr('ownerAttractions.finance.rangeMtd', 'Month to date')}
            </button>
            <button
              type="button"
              onClick={() => {
                try {
                  const next = new URLSearchParams(searchParams.toString());
                  next.set('view', 'finance');
                  next.set('range', 'ytd');
                  setSearchParams(next, { replace: true });
                } catch (_) {}
              }}
              className={`px-2.5 py-1 rounded-full border ${
                financeRange === 'ytd'
                  ? 'bg-[#f5e6d5] text-[#4b2a00] border-[#a06b42] font-semibold'
                  : 'bg-white text-[#6b5744] border-[#e0d5c7] hover:bg-[#f9f1e7]'
              }`}
            >
              {labelOr('ownerAttractions.finance.rangeYtd', 'Year to date')}
            </button>
          </div>

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
        </>
      )}

      {/* Analytics view: simple stats derived from bookings */}
      {view === 'analytics' && (
        <>
        <div className="mb-3 flex flex-wrap gap-2 text-[11px] sm:text-xs">
          <button
            type="button"
            onClick={() => {
              try {
                const next = new URLSearchParams(searchParams.toString());
                next.delete('segment');
                setSearchParams(next, { replace: true });
              } catch (_) {}
            }}
            className={`px-2.5 py-1 rounded-full border ${
              !analyticsSegment || analyticsSegment === 'overview'
                ? 'bg-[#f5e6d5] text-[#4b2a00] border-[#a06b42] font-semibold'
                : 'bg-white text-[#6b5744] border-[#e0d5c7] hover:bg-[#f9f1e7]'
            }`}
          >
            {labelOr('ownerAttractions.analytics.overview', 'Overview')}
          </button>
          <button
            type="button"
            onClick={() => {
              try {
                const next = new URLSearchParams(searchParams.toString());
                next.set('segment', 'attractions');
                setSearchParams(next, { replace: true });
              } catch (_) {}
            }}
            className={`px-2.5 py-1 rounded-full border ${
              analyticsSegment === 'attractions'
                ? 'bg-[#f5e6d5] text-[#4b2a00] border-[#a06b42] font-semibold'
                : 'bg-white text-[#6b5744] border-[#e0d5c7] hover:bg-[#f9f1e7]'
            }`}
          >
            {labelOr('ownerAttractions.analytics.attractionPerformance', 'Attraction performance')}
          </button>
          <button
            type="button"
            onClick={() => {
              try {
                const next = new URLSearchParams(searchParams.toString());
                next.set('segment', 'bookings');
                setSearchParams(next, { replace: true });
              } catch (_) {}
            }}
            className={`px-2.5 py-1 rounded-full border ${
              analyticsSegment === 'bookings'
                ? 'bg-[#f5e6d5] text-[#4b2a00] border-[#a06b42] font-semibold'
                : 'bg-white text-[#6b5744] border-[#e0d5c7] hover:bg-[#f9f1e7]'
            }`}
          >
            {labelOr('ownerAttractions.analytics.bookingTrends', 'Booking trends')}
          </button>
          <button
            type="button"
            onClick={() => {
              try {
                const next = new URLSearchParams(searchParams.toString());
                next.set('segment', 'revenue');
                setSearchParams(next, { replace: true });
              } catch (_) {}
            }}
            className={`px-2.5 py-1 rounded-full border ${
              analyticsSegment === 'revenue'
                ? 'bg-[#f5e6d5] text-[#4b2a00] border-[#a06b42] font-semibold'
                : 'bg-white text-[#6b5744] border-[#e0d5c7] hover:bg-[#f9f1e7]'
            }`}
          >
            {labelOr('ownerAttractions.analytics.revenueReports', 'Revenue reports')}
          </button>
        </div>

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
        </>
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

      {view === 'clients-contracts' && (
        <>
          <div className="mb-3 flex flex-wrap gap-2 text-[11px] sm:text-xs">
            {(() => {
              const s = ['clients', 'add-client', 'contracts', 'add-contract', 'reports'].includes(clientsContractsSection) ? clientsContractsSection : 'clients';
              const setSection = (val) => {
                try {
                  const next = new URLSearchParams(searchParams.toString());
                  next.set('view', 'clients-contracts');
                  next.set('section', val);
                  setSearchParams(next, { replace: true });
                } catch (_) {}
              };
              const pill = (val, label) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setSection(val)}
                  className={`px-2.5 py-1 rounded-full border ${
                    s === val
                      ? 'bg-[#f5e6d5] text-[#4b2a00] border-[#a06b42] font-semibold'
                      : 'bg-white text-[#6b5744] border-[#e0d5c7] hover:bg-[#f9f1e7]'
                  }`}
                >
                  {label}
                </button>
              );
              return (
                <>
                  {pill('clients', labelOr('nav.allClients', 'All clients'))}
                  {pill('add-client', labelOr('nav.addClient', 'Add client'))}
                  {pill('contracts', labelOr('nav.allContracts', 'All contracts'))}
                  {pill('add-contract', labelOr('nav.addContract', 'Add contract'))}
                  {pill('reports', labelOr('nav.clientReports', 'Client reports'))}
                </>
              );
            })()}
          </div>
          <div className="mb-6 rounded-xl bg-white border border-gray-200 px-4 py-3 text-sm text-gray-700">
            <h2 className="text-lg font-semibold mb-1">
              {labelOr('nav.clientsContracts', 'Clients & contracts')}
            </h2>
            <p className="text-xs text-gray-500">
              {labelOr('ownerAttractions.clientsContractsDescription', 'Management tools for your attraction clients and contracts will appear here. For now you can use the Bookings tab to review reservations.')}
            </p>
          </div>
        </>
      )}

      {view === 'notifications' && (
        <>
          <div className="mb-3 flex flex-wrap gap-2 text-[11px] sm:text-xs">
            {(() => {
              const s = ['maintenance', 'policy', 'expiry', 'activity'].includes(notificationsSection) ? notificationsSection : 'maintenance';
              const setSection = (val) => {
                try {
                  const next = new URLSearchParams(searchParams.toString());
                  next.set('view', 'notifications');
                  next.set('section', val);
                  setSearchParams(next, { replace: true });
                } catch (_) {}
              };
              const pill = (val, label) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setSection(val)}
                  className={`px-2.5 py-1 rounded-full border ${
                    s === val
                      ? 'bg-[#f5e6d5] text-[#4b2a00] border-[#a06b42] font-semibold'
                      : 'bg-white text-[#6b5744] border-[#e0d5c7] hover:bg-[#f9f1e7]'
                  }`}
                >
                  {label}
                </button>
              );
              return (
                <>
                  {pill('maintenance', labelOr('nav.maintenanceReminders', 'Maintenance reminders'))}
                  {pill('policy', labelOr('nav.policyAlerts', 'Policy & safety alerts'))}
                  {pill('expiry', labelOr('nav.expiryAlerts', 'Expiry alerts'))}
                  {pill('activity', labelOr('nav.activityAlerts', 'Guest activity alerts'))}
                </>
              );
            })()}
          </div>
          <div className="mb-6 rounded-xl bg-white border border-gray-200 px-4 py-3 text-sm text-gray-700">
            <h2 className="text-lg font-semibold mb-1">
              {labelOr('nav.notificationsAlerts', 'Notifications & alerts')}
            </h2>
            <p className="text-xs text-gray-500">
              {labelOr('ownerAttractions.notificationsDescription', 'Here you will see attraction-specific alerts, reminders and policy notifications. For now you can use the bell icon at the top of the page for your main notifications feed.')}
            </p>
          </div>
        </>
      )}

      {/* List: only in Attractions view */}
      {view === 'attractions' && attractionsSection === 'list' && (
        <>
          <div className="mb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <div className="text-sm font-semibold text-[#3b2a18]">
                {labelOr('ownerAttractions.manageAllTitle', 'All attractions')}
              </div>
              <div className="text-[11px] text-gray-500">
                {labelOr('ownerAttractions.manageAllSubtitle', 'Create, view, update and delete your attractions from here.')}
              </div>
            </div>
            <button
              type="button"
              onClick={openCreateEditor}
              className="inline-flex items-center justify-center px-3 py-2 rounded-lg bg-[#a06b42] hover:bg-[#8f5a32] text-white text-xs font-medium shadow-sm"
            >
              {labelOr('ownerAttractions.addNewAttraction', 'Add new attraction')}
            </button>
          </div>

          {loading ? (
            <div className="mb-6 rounded-xl bg-white border border-gray-200 px-4 py-6 text-sm text-gray-700">
              {labelOr('common.loading', 'Loading...')}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="mb-6 rounded-xl bg-white border border-gray-200 px-4 py-6 text-sm text-gray-700 text-center">
              <h2 className="text-lg font-semibold mb-1">
                {labelOr('ownerAttractions.empty.title', 'No attractions listed')}
              </h2>
              <p className="text-xs text-gray-500">
                {labelOr('ownerAttractions.empty.subtitle', 'You have no attractions listed yet. Add your first attraction to start receiving bookings.')}
              </p>
              <div className="mt-4 flex justify-center">
                <button
                  type="button"
                  onClick={openCreateEditor}
                  className="px-4 py-2 rounded-lg bg-[#a06b42] hover:bg-[#8f5a32] text-white text-sm font-medium shadow-sm"
                >
                  {labelOr('ownerAttractions.addNewAttraction', 'Add new attraction')}
                </button>
              </div>
            </div>
          ) : (
            viewMode==='cards' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredItems.map(item => (
                  <div key={item._id} className="bg-white rounded-xl shadow-sm border border-[#e0d5c7] p-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="w-full sm:w-40 h-28 bg-[#f7efe4] rounded-lg overflow-hidden border border-[#f0e6d9]">
                        {item.images?.[0]
                          ? <img src={makeAbsolute(item.images[0])} alt="" className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center text-[#6b5744] text-xs">{labelOr('ownerAttractions.noImage', 'No image')}</div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="font-semibold text-[#3b2a18] truncate">{item.name}</h3>
                            <p className="text-sm text-gray-600 truncate">{item.city || item.location || labelOr('ownerAttractions.locationUnknown', 'Location not set')}</p>
                          </div>
                          <button
                            type="button"
                            onClick={()=>updateItem(item._id, { isActive: !item.isActive })}
                            className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] border ${item.isActive ? 'bg-green-50 text-green-700 border-green-200' : 'bg-[#f7efe4] text-[#6b5744] border-[#e0d5c7]'}`}
                          >
                            {item.isActive ? labelOr('ownerAttractions.status.active', 'Active') : labelOr('ownerAttractions.status.inactive', 'Inactive')}
                          </button>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-700">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#fffaf4] border border-[#f0e6d9]">
                            {labelOr('ownerAttractions.fields.category', 'Category')}: {item.category || '-'}
                          </span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#fffaf4] border border-[#f0e6d9]">
                            {labelOr('ownerAttractions.fields.price', 'Price')}: {formatAmount(item.price)}
                          </span>
                        </div>
                        {item.description && (
                          <p className="mt-2 text-xs text-gray-600 line-clamp-2">{item.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-2">
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-[#6b5744]">{labelOr('ownerAttractions.uploadImages', 'Upload images')}:</label>
                        <input type="file" multiple disabled={uploadingId===item._id} onChange={e=>uploadImages(item._id, e.target.files)} className="text-xs" />
                      </div>
                      <div className="sm:ml-auto flex flex-wrap items-center gap-2">
                        <button type="button" onClick={() => openEditEditor(item)} className="px-3 py-1.5 rounded-lg bg-white border border-[#d4c4b0] text-[#4b2a00] text-xs font-medium hover:bg-[#f9f1e7]">
                          {labelOr('common.edit', 'Edit')}
                        </button>
                        <button type="button" onClick={()=>deleteItem(item._id)} className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700">
                          {labelOr('common.delete', 'Delete')}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-[#e0d5c7] overflow-x-auto scrollbar-hide">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-[#f7efe4] text-left text-[11px] uppercase tracking-wide text-[#6b5744]">
                      <th className="p-3">{labelOr('ownerAttractions.table.name', 'Name')}</th>
                      <th className="p-3">{labelOr('ownerAttractions.table.category', 'Category')}</th>
                      <th className="p-3">{labelOr('ownerAttractions.table.city', 'City')}</th>
                      <th className="p-3">{labelOr('ownerAttractions.table.price', 'Price')}</th>
                      <th className="p-3">{labelOr('ownerAttractions.table.status', 'Status')}</th>
                      <th className="p-3">{labelOr('ownerAttractions.table.actions', 'Actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map(item => (
                      <tr key={item._id} className="border-t border-[#f0e6d9] hover:bg-[#fffaf4]">
                        <td className="p-3 font-medium text-[#3b2a18]">{item.name}</td>
                        <td className="p-3 text-gray-700">{item.category}</td>
                        <td className="p-3 text-gray-700">{item.city || item.location}</td>
                        <td className="p-3 text-[#4b2a00] font-semibold">{formatAmount(item.price)}</td>
                        <td className="p-3">
                          <button type="button" onClick={()=>updateItem(item._id, { isActive: !item.isActive })} className={`px-2 py-1 rounded-full text-[11px] border ${item.isActive ? 'bg-green-50 text-green-700 border-green-200':'bg-[#f7efe4] text-[#6b5744] border-[#e0d5c7]'}`}> 
                            {item.isActive ? labelOr('ownerAttractions.status.active', 'Active') : labelOr('ownerAttractions.status.inactive', 'Inactive')}
                          </button>
                        </td>
                        <td className="p-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <button type="button" onClick={() => openEditEditor(item)} className="px-3 py-1 rounded-lg bg-white border border-[#d4c4b0] text-[#4b2a00] text-xs font-medium hover:bg-[#f9f1e7]">
                              {labelOr('common.edit', 'Edit')}
                            </button>
                            <button type="button" onClick={()=>deleteItem(item._id)} className="px-3 py-1 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700">
                              {labelOr('common.delete', 'Delete')}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </>
      )}

      {view === 'attractions' && attractionsSection !== 'list' && (
        <>
          {(() => {
            const state = ensureHasAttractions();
            if (!state.ok) {
              if (state.type === 'loading') {
                return (
                  <div className="mb-6 rounded-xl bg-white border border-gray-200 px-4 py-6 text-sm text-gray-700">
                    {labelOr('common.loading', 'Loading...')}
                  </div>
                );
              }
              return (
                <div className="mb-6 rounded-xl bg-white border border-gray-200 px-4 py-6 text-sm text-gray-700 text-center">
                  <h2 className="text-lg font-semibold mb-1">
                    {labelOr('ownerAttractions.empty.title', 'No attractions listed')}
                  </h2>
                  <p className="text-xs text-gray-500">
                    {labelOr('ownerAttractions.empty.subtitle', 'You have no attractions listed yet. Add your first attraction to start receiving bookings.')}
                  </p>
                  <div className="mt-4 flex justify-center">
                    <button
                      type="button"
                      onClick={() => window.location.assign('/upload-property?type=attraction')}
                      className="px-4 py-2 rounded-lg bg-[#a06b42] hover:bg-[#8f5a32] text-white text-sm font-medium shadow-sm"
                    >
                      {labelOr('ownerAttractions.addNewAttraction', 'Add new attraction')}
                    </button>
                  </div>
                </div>
              );
            }

            if (!canUseAttractionTools) {
              return (
                <div className="mb-6 rounded-xl bg-white border border-gray-200 px-4 py-4 text-sm text-gray-700">
                  <h2 className="text-lg font-semibold mb-2">
                    {attractionsSection === 'details'
                      ? labelOr('nav.attractionDetails', 'Attraction details')
                      : attractionsSection === 'schedule'
                        ? labelOr('nav.schedulesAvailability', 'Schedules & availability')
                        : labelOr('nav.mediaContent', 'Media & content')}
                  </h2>
                  <p className="text-xs text-gray-500">
                    {labelOr('ownerAttractions.selectAttractionHint', 'Select an attraction from the dropdown above to continue.')}
                  </p>
                </div>
              );
            }

            if (activeAttractionLoading || !activeAttraction) {
              return (
                <div className="mb-6 rounded-xl bg-white border border-gray-200 px-4 py-6 text-sm text-gray-700">
                  {labelOr('common.loading', 'Loading...')}
                </div>
              );
            }

            const title = attractionsSection === 'details'
              ? labelOr('nav.attractionDetails', 'Attraction details')
              : attractionsSection === 'schedule'
                ? labelOr('nav.schedulesAvailability', 'Schedules & availability')
                : labelOr('nav.mediaContent', 'Media & content');

            if (attractionsSection === 'details') {
              const d = detailsDraft;
              return (
                <div className="mb-6 rounded-xl bg-white border border-gray-200 px-4 py-4 text-sm text-gray-700">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                    <div>
                      <h2 className="text-lg font-semibold">{title}</h2>
                      <p className="text-xs text-gray-500">
                        {labelOr('ownerAttractions.details.subtitle', 'Review and update the core information for this attraction.')}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={detailsSaving || user?.isBlocked}
                      onClick={async () => {
                        try {
                          if (!d) return;
                          setDetailsSaving(true);
                          await saveAttractionPatch(activeAttraction._id, {
                            name: d.name,
                            description: d.description,
                            location: d.location,
                            city: d.city,
                            country: d.country,
                            category: d.category,
                            price: Number(d.price || 0),
                            currency: d.currency,
                            duration: d.duration,
                            bookingRequired: d.bookingRequired,
                            contactEmail: d.contactEmail,
                            contactPhone: d.contactPhone,
                            contactWebsite: d.contactWebsite,
                          });
                          toast.success(labelOr('ownerAttractions.toasts.updated', 'Updated'));
                        } catch (e) {
                          toast.error(e.message);
                        } finally {
                          setDetailsSaving(false);
                        }
                      }}
                      className="px-4 py-2 rounded-lg bg-[#a06b42] hover:bg-[#8f5a32] disabled:opacity-60 text-white text-xs font-medium shadow-sm"
                    >
                      {detailsSaving ? labelOr('common.saving', 'Saving...') : labelOr('common.save', 'Save')}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="md:col-span-2">
                      <label className="block text-[11px] text-[#6b5744] mb-1">{labelOr('ownerAttractions.fields.name', 'Name')}</label>
                      <input value={d?.name || ''} onChange={e => setDetailsDraft(p => ({ ...p, name: e.target.value }))} className="w-full px-3 py-2 border border-[#d4c4b0] rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="block text-[11px] text-[#6b5744] mb-1">{labelOr('ownerAttractions.fields.category', 'Category')}</label>
                      <select value={d?.category || 'cultural'} onChange={e => setDetailsDraft(p => ({ ...p, category: e.target.value }))} className="w-full px-3 py-2 border border-[#d4c4b0] rounded-lg text-sm bg-white">
                        {['cultural','nature','adventure','historical','religious','entertainment'].map(v => (
                          <option key={v} value={v}>{v}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] text-[#6b5744] mb-1">{labelOr('ownerAttractions.fields.city', 'City')}</label>
                      <input value={d?.city || ''} onChange={e => setDetailsDraft(p => ({ ...p, city: e.target.value }))} className="w-full px-3 py-2 border border-[#d4c4b0] rounded-lg text-sm" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[11px] text-[#6b5744] mb-1">{labelOr('ownerAttractions.fields.location', 'Location')}</label>
                      <input value={d?.location || ''} onChange={e => setDetailsDraft(p => ({ ...p, location: e.target.value }))} className="w-full px-3 py-2 border border-[#d4c4b0] rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="block text-[11px] text-[#6b5744] mb-1">{labelOr('ownerAttractions.fields.price', 'Price')}</label>
                      <input type="number" value={d?.price ?? 0} onChange={e => setDetailsDraft(p => ({ ...p, price: e.target.value }))} className="w-full px-3 py-2 border border-[#d4c4b0] rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="block text-[11px] text-[#6b5744] mb-1">{labelOr('ownerAttractions.fields.currency', 'Currency')}</label>
                      <input value={d?.currency || 'RWF'} onChange={e => setDetailsDraft(p => ({ ...p, currency: e.target.value }))} className="w-full px-3 py-2 border border-[#d4c4b0] rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="block text-[11px] text-[#6b5744] mb-1">{labelOr('ownerAttractions.fields.duration', 'Duration')}</label>
                      <input value={d?.duration || ''} onChange={e => setDetailsDraft(p => ({ ...p, duration: e.target.value }))} className="w-full px-3 py-2 border border-[#d4c4b0] rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="block text-[11px] text-[#6b5744] mb-1">{labelOr('ownerAttractions.fields.bookingRequired', 'Booking required')}</label>
                      <select value={d?.bookingRequired || 'yes'} onChange={e => setDetailsDraft(p => ({ ...p, bookingRequired: e.target.value }))} className="w-full px-3 py-2 border border-[#d4c4b0] rounded-lg text-sm bg-white">
                        <option value="yes">{labelOr('common.yes', 'Yes')}</option>
                        <option value="no">{labelOr('common.no', 'No')}</option>
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[11px] text-[#6b5744] mb-1">{labelOr('ownerAttractions.fields.description', 'Description')}</label>
                      <textarea value={d?.description || ''} onChange={e => setDetailsDraft(p => ({ ...p, description: e.target.value }))} className="w-full px-3 py-2 border border-[#d4c4b0] rounded-lg text-sm min-h-[96px]" />
                    </div>
                    <div>
                      <label className="block text-[11px] text-[#6b5744] mb-1">{labelOr('ownerAttractions.fields.contactEmail', 'Contact email')}</label>
                      <input value={d?.contactEmail || ''} onChange={e => setDetailsDraft(p => ({ ...p, contactEmail: e.target.value }))} className="w-full px-3 py-2 border border-[#d4c4b0] rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="block text-[11px] text-[#6b5744] mb-1">{labelOr('ownerAttractions.fields.contactPhone', 'Contact phone')}</label>
                      <input value={d?.contactPhone || ''} onChange={e => setDetailsDraft(p => ({ ...p, contactPhone: e.target.value }))} className="w-full px-3 py-2 border border-[#d4c4b0] rounded-lg text-sm" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[11px] text-[#6b5744] mb-1">{labelOr('ownerAttractions.fields.contactWebsite', 'Website')}</label>
                      <input value={d?.contactWebsite || ''} onChange={e => setDetailsDraft(p => ({ ...p, contactWebsite: e.target.value }))} className="w-full px-3 py-2 border border-[#d4c4b0] rounded-lg text-sm" />
                    </div>
                  </div>
                </div>
              );
            }

            if (attractionsSection === 'schedule') {
              const s = scheduleDraft;
              const days = [
                { key: 'monday', label: labelOr('common.days.monday', 'Monday') },
                { key: 'tuesday', label: labelOr('common.days.tuesday', 'Tuesday') },
                { key: 'wednesday', label: labelOr('common.days.wednesday', 'Wednesday') },
                { key: 'thursday', label: labelOr('common.days.thursday', 'Thursday') },
                { key: 'friday', label: labelOr('common.days.friday', 'Friday') },
                { key: 'saturday', label: labelOr('common.days.saturday', 'Saturday') },
                { key: 'sunday', label: labelOr('common.days.sunday', 'Sunday') },
              ];
              return (
                <div className="mb-6 rounded-xl bg-white border border-gray-200 px-4 py-4 text-sm text-gray-700">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                    <div>
                      <h2 className="text-lg font-semibold">{title}</h2>
                      <p className="text-xs text-gray-500">
                        {labelOr('ownerAttractions.schedule.subtitle', 'Manage capacity and opening hours. Availability checks use real bookings.')}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={scheduleSaving || user?.isBlocked}
                      onClick={async () => {
                        try {
                          if (!s) return;
                          setScheduleSaving(true);
                          await saveAttractionPatch(activeAttraction._id, {
                            capacity: Number(s.capacity || 0),
                            operatingHours: {
                              open: s.operatingHours?.open,
                              close: s.operatingHours?.close,
                              days: Array.isArray(s.operatingHours?.days) ? s.operatingHours.days : []
                            }
                          });
                          toast.success(labelOr('ownerAttractions.toasts.updated', 'Updated'));
                        } catch (e) {
                          toast.error(e.message);
                        } finally {
                          setScheduleSaving(false);
                        }
                      }}
                      className="px-4 py-2 rounded-lg bg-[#a06b42] hover:bg-[#8f5a32] disabled:opacity-60 text-white text-xs font-medium shadow-sm"
                    >
                      {scheduleSaving ? labelOr('common.saving', 'Saving...') : labelOr('common.save', 'Save')}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-[#f0e6d9] bg-[#fffaf4] p-3">
                      <div className="text-sm font-semibold text-[#3b2a18] mb-2">{labelOr('ownerAttractions.schedule.operatingHours', 'Operating hours')}</div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] text-[#6b5744] mb-1">{labelOr('ownerAttractions.schedule.open', 'Open')}</label>
                          <input type="time" value={s?.operatingHours?.open || ''} onChange={e => setScheduleDraft(p => ({ ...p, operatingHours: { ...p.operatingHours, open: e.target.value } }))} className="w-full px-3 py-2 border border-[#d4c4b0] rounded-lg text-sm" />
                        </div>
                        <div>
                          <label className="block text-[11px] text-[#6b5744] mb-1">{labelOr('ownerAttractions.schedule.close', 'Close')}</label>
                          <input type="time" value={s?.operatingHours?.close || ''} onChange={e => setScheduleDraft(p => ({ ...p, operatingHours: { ...p.operatingHours, close: e.target.value } }))} className="w-full px-3 py-2 border border-[#d4c4b0] rounded-lg text-sm" />
                        </div>
                      </div>
                      <div className="mt-3">
                        <div className="text-[11px] text-[#6b5744] mb-1">{labelOr('ownerAttractions.schedule.days', 'Days open')}</div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {days.map(dy => (
                            <label key={dy.key} className="flex items-center gap-2 text-xs text-gray-700">
                              <input
                                type="checkbox"
                                checked={Array.isArray(s?.operatingHours?.days) && s.operatingHours.days.includes(dy.key)}
                                onChange={() => setScheduleDraft(p => {
                                  const curr = Array.isArray(p.operatingHours?.days) ? p.operatingHours.days : [];
                                  const next = curr.includes(dy.key) ? curr.filter(x => x !== dy.key) : [...curr, dy.key];
                                  return { ...p, operatingHours: { ...p.operatingHours, days: next } };
                                })}
                              />
                              <span>{dy.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-[#f0e6d9] bg-white p-3">
                      <div className="text-sm font-semibold text-[#3b2a18] mb-2">{labelOr('ownerAttractions.schedule.capacity', 'Capacity')}</div>
                      <label className="block text-[11px] text-[#6b5744] mb-1">{labelOr('ownerAttractions.schedule.dailyCapacity', 'Daily capacity (people)')}</label>
                      <input type="number" min="1" value={s?.capacity ?? 50} onChange={e => setScheduleDraft(p => ({ ...p, capacity: e.target.value }))} className="w-full px-3 py-2 border border-[#d4c4b0] rounded-lg text-sm" />

                      <div className="mt-4 rounded-xl border border-[#f0e6d9] bg-[#fffaf4] p-3">
                        <div className="text-sm font-semibold text-[#3b2a18] mb-2">{labelOr('ownerAttractions.schedule.availabilityCheck', 'Availability check')}</div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <div>
                            <label className="block text-[11px] text-[#6b5744] mb-1">{labelOr('ownerAttractions.schedule.visitDate', 'Visit date')}</label>
                            <input type="date" value={availabilityCheck.visitDate} onChange={e => setAvailabilityCheck(p => ({ ...p, visitDate: e.target.value }))} className="w-full px-3 py-2 border border-[#d4c4b0] rounded-lg text-sm" />
                          </div>
                          <div>
                            <label className="block text-[11px] text-[#6b5744] mb-1">{labelOr('ownerAttractions.schedule.tickets', 'Tickets')}</label>
                            <input type="number" min="1" value={availabilityCheck.tickets} onChange={e => setAvailabilityCheck(p => ({ ...p, tickets: e.target.value }))} className="w-full px-3 py-2 border border-[#d4c4b0] rounded-lg text-sm" />
                          </div>
                          <div className="flex items-end">
                            <button
                              type="button"
                              disabled={availabilityCheck.loading}
                              onClick={async () => {
                                try {
                                  if (!availabilityCheck.visitDate) return toast.error(labelOr('ownerAttractions.schedule.visitDateRequired', 'Choose a date'));
                                  setAvailabilityCheck(p => ({ ...p, loading: true, result: null }));
                                  const res = await fetch(`${API_URL}/api/attractions/${activeAttraction._id}/availability`, {
                                    method: 'POST',
                                    credentials: 'include',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ visitDate: availabilityCheck.visitDate, tickets: Number(availabilityCheck.tickets || 1) })
                                  });
                                  const data = await res.json().catch(() => ({}));
                                  if (!res.ok) throw new Error(data.message || 'Failed');
                                  setAvailabilityCheck(p => ({ ...p, result: data }));
                                } catch (e) {
                                  toast.error(e.message);
                                } finally {
                                  setAvailabilityCheck(p => ({ ...p, loading: false }));
                                }
                              }}
                              className="w-full px-3 py-2 rounded-lg bg-[#a06b42] hover:bg-[#8f5a32] disabled:opacity-60 text-white text-xs font-medium shadow-sm"
                            >
                              {availabilityCheck.loading ? labelOr('common.loading', 'Loading...') : labelOr('ownerAttractions.schedule.check', 'Check')}
                            </button>
                          </div>
                        </div>
                        {availabilityCheck.result && (
                          <div className="mt-3 text-xs">
                            {availabilityCheck.result.available ? (
                              <div className="text-emerald-700">
                                {labelOr('ownerAttractions.schedule.available', 'Available')} — {labelOr('ownerAttractions.schedule.remaining', 'Remaining')}: {availabilityCheck.result.remaining}
                              </div>
                            ) : (
                              <div className="text-red-700">
                                {labelOr('ownerAttractions.schedule.notAvailable', 'Not available')}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            // media
            const m = mediaDraft;
            const allAmenities = [
              'Parking','Restaurant','Gift Shop','Guided Tours','Audio Guide','Wheelchair Accessible','Photography Allowed','Pet Friendly','Group Discounts','Student Discounts','Senior Discounts','Free WiFi','Restrooms','First Aid','Security','ATM','Public Transport Access'
            ];
            const images = Array.isArray(activeAttraction.images) ? activeAttraction.images : [];
            const cover = coverImage || images[0] || '';
            const completion = (() => {
              let score = 0;
              let total = 5;
              if (images.length > 0) score++;
              if (String(m?.description || '').trim().length > 30) score++;
              if ((m?.amenities || []).length > 0) score++;
              if (String(activeAttraction?.location || '').trim()) score++;
              if (Number(activeAttraction?.price || 0) > 0) score++;
              return Math.round((score / total) * 100);
            })();
            return (
              <div className="mb-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 space-y-4">
                  <div className="rounded-xl bg-white border border-gray-200 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-lg font-semibold">{title}</div>
                        <div className="text-xs text-gray-500">{labelOr('ownerAttractions.media.subtitle', 'Manage gallery, featured image and key features.')}</div>
                      </div>
                      <button
                        type="button"
                        disabled={mediaSaving || user?.isBlocked}
                        onClick={async () => {
                          try {
                            if (!m) return;
                            setMediaSaving(true);
                            if (mediaUploadFiles && mediaUploadFiles.length > 0) {
                              await uploadImages(activeAttraction._id, mediaUploadFiles);
                              setMediaUploadFiles([]);
                            }
                            await saveAttractionPatch(activeAttraction._id, {
                              description: m.description,
                              amenities: Array.isArray(m.amenities) ? m.amenities : [],
                              video: m.video || ''
                            });
                            toast.success(labelOr('ownerAttractions.toasts.updated', 'Updated'));
                          } catch (e) {
                            toast.error(e.message);
                          } finally {
                            setMediaSaving(false);
                          }
                        }}
                        className="px-4 py-2 rounded-lg bg-[#a06b42] hover:bg-[#8f5a32] disabled:opacity-60 text-white text-xs font-medium shadow-sm"
                      >
                        {mediaSaving ? labelOr('common.saving', 'Saving...') : labelOr('ownerAttractions.media.save', 'Save Media & Content')}
                      </button>
                    </div>

                    <div className="mt-3">
                      <div className="text-xs text-gray-600 mb-1">
                        {labelOr('ownerAttractions.media.completeness', 'Media completeness')}: {completion}%
                      </div>
                      <div className="h-2 rounded-full bg-[#f0e6d9] overflow-hidden">
                        <div className="h-full bg-[#a06b42]" style={{ width: `${completion}%` }}></div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl bg-white border border-gray-200 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-semibold text-[#3b2a18]">{labelOr('ownerAttractions.media.gallery', 'Media Gallery')}</div>
                      <label className="px-3 py-2 rounded-lg bg-white border border-[#d4c4b0] text-[#4b2a00] text-xs font-medium hover:bg-[#f9f1e7] cursor-pointer">
                        {labelOr('ownerAttractions.media.uploadNewPhotos', 'Upload New Photos')}
                        <input type="file" multiple className="hidden" onChange={(e) => setMediaUploadFiles(e.target.files ? Array.from(e.target.files) : [])} />
                      </label>
                    </div>
                    {images.length === 0 ? (
                      <div className="text-xs text-gray-500">{labelOr('ownerAttractions.media.noImages', 'No images uploaded yet.')}</div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {images.map((img, idx) => {
                          const isCover = String(img) === String(cover);
                          return (
                            <div key={idx} className="rounded-lg overflow-hidden border border-[#f0e6d9] bg-[#fffaf4]">
                              <div className="h-28 bg-[#f7efe4]">
                                <img src={makeAbsolute(img)} alt="" className="w-full h-full object-cover" />
                              </div>
                              <div className="p-2 flex items-center justify-between gap-2">
                                <div className="text-[11px] text-gray-600 truncate">#{idx + 1}</div>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    disabled={mediaSaving || user?.isBlocked}
                                    onClick={async () => {
                                      try {
                                        if (isCover) return;
                                        setMediaSaving(true);
                                        const nextImages = [img, ...images.filter(x => String(x) !== String(img))];
                                        setCoverImage(img);
                                        await saveAttractionPatch(activeAttraction._id, { images: nextImages });
                                        toast.success(labelOr('ownerAttractions.media.coverUpdated', 'Cover updated'));
                                      } catch (e) {
                                        toast.error(e.message);
                                      } finally {
                                        setMediaSaving(false);
                                      }
                                    }}
                                    className={`px-2 py-1 rounded-full text-[11px] border ${isCover ? 'bg-[#f5e6d5] text-[#4b2a00] border-[#a06b42]' : 'bg-white text-[#6b5744] border-[#e0d5c7] hover:bg-[#f9f1e7]'}`}
                                  >
                                    {isCover ? labelOr('ownerAttractions.media.cover', 'Cover') : labelOr('ownerAttractions.media.setAsCover', 'Set as cover')}
                                  </button>
                                  <button
                                    type="button"
                                    disabled={mediaSaving || user?.isBlocked}
                                    onClick={async () => {
                                      try {
                                        const ok = confirm(labelOr('ownerAttractions.media.confirmRemovePhoto', 'Remove this photo?'));
                                        if (!ok) return;
                                        setMediaSaving(true);
                                        const nextImages = images.filter(x => String(x) !== String(img));
                                        const nextCover = String(cover) === String(img) ? (nextImages[0] || '') : cover;
                                        setCoverImage(nextCover);
                                        await saveAttractionPatch(activeAttraction._id, { images: nextImages });
                                        toast.success(labelOr('ownerAttractions.media.photoRemoved', 'Photo removed'));
                                      } catch (e) {
                                        toast.error(e.message);
                                      } finally {
                                        setMediaSaving(false);
                                      }
                                    }}
                                    className="px-2 py-1 rounded-full text-[11px] border bg-white text-red-700 border-red-200 hover:bg-red-50"
                                  >
                                    {labelOr('common.remove', 'Remove')}
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl bg-white border border-gray-200 p-4">
                    <div className="text-sm font-semibold text-[#3b2a18] mb-2">{labelOr('ownerAttractions.media.featuredImage', 'Featured Image')}</div>
                    {cover ? (
                      <div className="rounded-xl overflow-hidden border border-[#f0e6d9]">
                        <img src={makeAbsolute(cover)} alt="" className="w-full h-64 object-cover" />
                      </div>
                    ) : (
                      <div className="text-xs text-gray-500">{labelOr('ownerAttractions.media.noCover', 'Upload images to set a cover.')}</div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-xl bg-white border border-gray-200 p-4">
                    <div className="text-sm font-semibold text-[#3b2a18] mb-2">{labelOr('ownerAttractions.fields.description', 'Description')}</div>
                    <textarea value={m?.description || ''} onChange={e => setMediaDraft(p => ({ ...p, description: e.target.value }))} className="w-full px-3 py-2 border border-[#d4c4b0] rounded-lg text-sm min-h-[140px]" />
                  </div>

                  <div className="rounded-xl bg-white border border-gray-200 p-4">
                    <div className="text-sm font-semibold text-[#3b2a18] mb-2">{labelOr('ownerAttractions.media.keyFeatures', 'Highlights & key features')}</div>
                    <div className="grid grid-cols-1 gap-2">
                      {allAmenities.map(a => {
                        const checked = Array.isArray(m?.amenities) && m.amenities.includes(a);
                        return (
                          <label key={a} className="flex items-center gap-2 text-xs text-gray-700">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => setMediaDraft(p => {
                                const curr = Array.isArray(p.amenities) ? p.amenities : [];
                                const next = curr.includes(a) ? curr.filter(x => x !== a) : [...curr, a];
                                return { ...p, amenities: next };
                              })}
                            />
                            <span>{a}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div className="rounded-xl bg-white border border-gray-200 p-4">
                    <div className="text-sm font-semibold text-[#3b2a18] mb-2">{labelOr('ownerAttractions.media.video', 'Video (optional)')}</div>
                    <input value={m?.video || ''} onChange={e => setMediaDraft(p => ({ ...p, video: e.target.value }))} className="w-full px-3 py-2 border border-[#d4c4b0] rounded-lg text-sm" placeholder="https://..." />
                  </div>
                </div>
              </div>
            );
          })()}
        </>
      )}

      {view === 'expenses' && (
        <>
          <div className="mb-3 flex flex-wrap gap-2 text-[11px] sm:text-xs">
            {(() => {
              const s = ['all', 'add', 'categories', 'reports'].includes(expensesSection) ? expensesSection : 'all';
              const setSection = (val) => {
                try {
                  const next = new URLSearchParams(searchParams.toString());
                  next.set('view', 'expenses');
                  next.set('section', val);
                  setSearchParams(next, { replace: true });
                } catch (_) {}
              };
              const pill = (val, label) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setSection(val)}
                  className={`px-2.5 py-1 rounded-full border ${
                    s === val
                      ? 'bg-[#f5e6d5] text-[#4b2a00] border-[#a06b42] font-semibold'
                      : 'bg-white text-[#6b5744] border-[#e0d5c7] hover:bg-[#f9f1e7]'
                  }`}
                >
                  {label}
                </button>
              );
              return (
                <>
                  {pill('all', labelOr('nav.allExpenses', 'All expenses'))}
                  {pill('add', labelOr('nav.addExpense', 'Add expense'))}
                  {pill('categories', labelOr('nav.expenseCategories', 'Expense categories'))}
                  {pill('reports', labelOr('nav.expenseReports', 'Expense reports'))}
                </>
              );
            })()}
          </div>

          {expensesSection === 'all' && (
            <div className="mb-6 rounded-xl bg-white border border-gray-200 px-4 py-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{labelOr('nav.expenses', 'Expenses')}</h2>
                  <p className="text-xs text-gray-500">{labelOr('ownerAttractions.expenses.subtitle', 'Track costs per attraction and understand your profit.')}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[11px]">
                  <input
                    type="date"
                    value={attractionExpenseFilters.from}
                    onChange={(e) => setAttractionExpenseFilters(p => ({ ...p, from: e.target.value }))}
                    className="px-2 py-1.5 border border-gray-200 rounded-lg"
                  />
                  <span className="text-gray-400">to</span>
                  <input
                    type="date"
                    value={attractionExpenseFilters.to}
                    onChange={(e) => setAttractionExpenseFilters(p => ({ ...p, to: e.target.value }))}
                    className="px-2 py-1.5 border border-gray-200 rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={fetchAttractionExpenses}
                    className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
                  >
                    {labelOr('common.apply', 'Apply')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        const next = new URLSearchParams(searchParams.toString());
                        next.set('view', 'expenses');
                        next.set('section', 'add');
                        setSearchParams(next, { replace: true });
                      } catch (_) {}
                    }}
                    className="px-3 py-1.5 rounded-lg bg-[#a06b42] text-white hover:bg-[#8f5a32]"
                  >
                    {labelOr('nav.addExpense', 'Add expense')}
                  </button>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div className="text-xs text-gray-600">
                  {labelOr('ownerAttractions.expenses.total', 'Total')}: <span className="font-semibold">{formatAmount(attractionExpensesTotal)}</span>
                </div>
                {attractionExpensesLoading && (
                  <div className="text-xs text-gray-500">{labelOr('common.loading', 'Loading...')}</div>
                )}
              </div>

              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{labelOr('common.date', 'Date')}</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{labelOr('nav.attractions', 'Attraction')}</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{labelOr('ownerAttractions.expenses.category', 'Category')}</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{labelOr('ownerAttractions.expenses.note', 'Note')}</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">{labelOr('ownerAttractions.expenses.amount', 'Amount')}</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">{labelOr('common.actions', 'Actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {(Array.isArray(attractionExpenses) ? attractionExpenses : []).map(exp => (
                      <tr key={String(exp._id)} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-xs text-gray-700">{exp.date ? new Date(exp.date).toLocaleDateString() : ''}</td>
                        <td className="px-3 py-2 text-xs text-gray-800">{exp.attraction?.name || '-'}</td>
                        <td className="px-3 py-2 text-xs text-gray-700">{exp.category || 'general'}</td>
                        <td className="px-3 py-2 text-xs text-gray-600">{exp.note || '-'}</td>
                        <td className="px-3 py-2 text-xs text-right font-semibold text-gray-900">{formatAmount(exp.amount)}</td>
                        <td className="px-3 py-2 text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => startEditAttractionExpense(exp)}
                              className="px-2 py-1 border rounded text-[11px] text-gray-700 hover:bg-gray-50"
                            >
                              {labelOr('common.edit', 'Edit')}
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteAttractionExpense(exp._id)}
                              className="px-2 py-1 border rounded text-[11px] text-red-700 border-red-200 hover:bg-red-50"
                            >
                              {labelOr('common.delete', 'Delete')}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {(!attractionExpensesLoading && (!attractionExpenses || attractionExpenses.length === 0)) && (
                <div className="mt-3 text-xs text-gray-500">
                  {labelOr('ownerAttractions.expenses.empty', 'No expenses recorded for the selected period.')}
                </div>
              )}
            </div>
          )}

          {expensesSection === 'add' && (
            <div className="mb-6 rounded-xl bg-white border border-gray-200 px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{labelOr('nav.addExpense', 'Add expense')}</h2>
                  <p className="text-xs text-gray-500">{labelOr('ownerAttractions.expenses.addHint', 'Expenses are attached to a specific attraction. Use the scope selector above to choose the attraction.')}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    try {
                      const next = new URLSearchParams(searchParams.toString());
                      next.set('view', 'expenses');
                      next.set('section', 'all');
                      setSearchParams(next, { replace: true });
                    } catch (_) {}
                  }}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs"
                >
                  {labelOr('common.back', 'Back')}
                </button>
              </div>

              <form onSubmit={submitAttractionExpense} className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-gray-600 mb-1">{labelOr('common.date', 'Date')}</label>
                  <input
                    type="date"
                    value={attractionExpenseForm.date}
                    onChange={(e) => setAttractionExpenseForm(p => ({ ...p, date: e.target.value }))}
                    className="w-full px-3 py-2 border border-[#d4c4b0] rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-600 mb-1">{labelOr('ownerAttractions.expenses.amount', 'Amount (RWF)')}</label>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={attractionExpenseForm.amount}
                    onChange={(e) => setAttractionExpenseForm(p => ({ ...p, amount: e.target.value }))}
                    className="w-full px-3 py-2 border border-[#d4c4b0] rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-600 mb-1">{labelOr('ownerAttractions.expenses.category', 'Category')}</label>
                  <input
                    value={attractionExpenseForm.category}
                    onChange={(e) => setAttractionExpenseForm(p => ({ ...p, category: e.target.value }))}
                    className="w-full px-3 py-2 border border-[#d4c4b0] rounded-lg text-sm"
                    placeholder={labelOr('ownerAttractions.expenses.categoryPlaceholder', 'e.g. Staff, Utilities, Maintenance')}
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-600 mb-1">{labelOr('ownerAttractions.expenses.note', 'Note')}</label>
                  <input
                    value={attractionExpenseForm.note}
                    onChange={(e) => setAttractionExpenseForm(p => ({ ...p, note: e.target.value }))}
                    className="w-full px-3 py-2 border border-[#d4c4b0] rounded-lg text-sm"
                    placeholder={labelOr('ownerAttractions.expenses.notePlaceholder', 'Optional note')}
                  />
                </div>

                <div className="md:col-span-2 flex flex-wrap gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={attractionExpenseSaving}
                    className={`px-4 py-2 rounded-lg text-sm font-medium text-white ${attractionExpenseSaving ? 'bg-[#c39a73]' : 'bg-[#a06b42] hover:bg-[#8f5a32]'}`}
                  >
                    {attractionExpenseSaving
                      ? labelOr('common.saving', 'Saving...')
                      : (editingAttractionExpenseId ? labelOr('ownerAttractions.expenses.update', 'Update expense') : labelOr('ownerAttractions.expenses.save', 'Save expense'))}
                  </button>
                  {editingAttractionExpenseId && (
                    <button
                      type="button"
                      onClick={resetAttractionExpenseEditor}
                      className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-50"
                    >
                      {labelOr('common.cancel', 'Cancel')}
                    </button>
                  )}
                </div>
              </form>

              <div className="mt-4 text-xs text-gray-600">
                <span className="font-semibold">{labelOr('ownerAttractions.manageScopeLabel', 'Manage')}:</span> {selectedAttraction ? (selectedAttraction.name || labelOr('nav.attractions', 'Attraction')) : labelOr('ownerAttractions.expenses.scopeNone', 'No attraction selected')}
              </div>
            </div>
          )}

          {expensesSection === 'categories' && (
            <div className="mb-6 rounded-xl bg-white border border-gray-200 px-4 py-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{labelOr('nav.expenseCategories', 'Expense categories')}</h2>
                  <p className="text-xs text-gray-500">{labelOr('ownerAttractions.expenses.categoriesHint', 'See where your costs are going.')}</p>
                </div>
                <div className="flex items-center gap-2 text-[11px]">
                  <button
                    type="button"
                    onClick={fetchAttractionExpenseCategories}
                    className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
                  >
                    {labelOr('common.refresh', 'Refresh')}
                  </button>
                </div>
              </div>

              {attractionExpenseCategoriesLoading ? (
                <div className="mt-4 text-xs text-gray-500">{labelOr('common.loading', 'Loading...')}</div>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{labelOr('ownerAttractions.expenses.category', 'Category')}</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">{labelOr('ownerAttractions.expenses.amount', 'Total')}</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">{labelOr('ownerAttractions.expenses.count', 'Count')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {(Array.isArray(attractionExpenseCategories) ? attractionExpenseCategories : []).map((row, idx) => (
                        <tr key={`${row.category || 'general'}-${idx}`}>
                          <td className="px-3 py-2 text-xs text-gray-800">{row.category || 'general'}</td>
                          <td className="px-3 py-2 text-xs text-right font-semibold text-gray-900">{formatAmount(row.total)}</td>
                          <td className="px-3 py-2 text-xs text-right text-gray-700">{Number(row.count || 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {(!attractionExpenseCategories || attractionExpenseCategories.length === 0) && (
                    <div className="mt-3 text-xs text-gray-500">{labelOr('ownerAttractions.expenses.categoriesEmpty', 'No expense categories yet.')}</div>
                  )}
                </div>
              )}
            </div>
          )}

          {expensesSection === 'reports' && (
            <div className="mb-6 rounded-xl bg-white border border-gray-200 px-4 py-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{labelOr('nav.expenseReports', 'Expense reports')}</h2>
                  <p className="text-xs text-gray-500">{labelOr('ownerAttractions.expenses.reportsHint', 'Profit & loss based on your bookings and recorded expenses.')}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[11px]">
                  <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
                    {[{ id: 'weekly', label: labelOr('nav.weekly', 'Weekly') }, { id: 'monthly', label: labelOr('nav.monthToDate', 'Monthly') }, { id: 'annual', label: labelOr('nav.yearToDate', 'Annual') }].map(opt => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setAttractionReportRange(opt.id)}
                        className={`px-3 py-1.5 ${attractionReportRange === opt.id ? 'bg-[#a06b42] text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <input
                    type="date"
                    value={attractionReportDate}
                    onChange={(e) => setAttractionReportDate(e.target.value)}
                    className="px-2 py-1.5 border border-gray-200 rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={fetchAttractionReportSummary}
                    className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
                  >
                    {labelOr('common.refresh', 'Refresh')}
                  </button>
                </div>
              </div>

              {attractionReportsLoading ? (
                <div className="mt-4 text-xs text-gray-500">{labelOr('common.loading', 'Loading...')}</div>
              ) : (
                <>
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
                      <div className="text-xs text-gray-500 mb-1">{labelOr('ownerAttractions.expenses.reportRevenue', 'Revenue')}</div>
                      <div className="text-lg font-semibold text-gray-900">{formatAmount(attractionReportSummary?.revenueTotal || 0)}</div>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
                      <div className="text-xs text-gray-500 mb-1">{labelOr('ownerAttractions.expenses.reportExpenses', 'Expenses')}</div>
                      <div className="text-lg font-semibold text-gray-900">{formatAmount(attractionReportSummary?.expenseTotal || 0)}</div>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
                      <div className="text-xs text-gray-500 mb-1">{labelOr('ownerAttractions.expenses.reportProfit', 'Profit')}</div>
                      <div className={`text-lg font-semibold ${(Number(attractionReportSummary?.profit || 0) >= 0) ? 'text-green-700' : 'text-red-700'}`}
                      >
                        {formatAmount(attractionReportSummary?.profit || 0)}
                      </div>
                      <div className="text-[11px] text-gray-500 mt-1">
                        {labelOr('ownerAttractions.expenses.reportCounts', 'Bookings')}: {Number(attractionReportSummary?.counts?.bookings || 0)} | {labelOr('nav.expenses', 'Expenses')}: {Number(attractionReportSummary?.counts?.expenses || 0)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="text-sm font-semibold text-gray-900 mb-2">{labelOr('ownerAttractions.expenses.byCategory', 'Expenses by category')}</div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{labelOr('ownerAttractions.expenses.category', 'Category')}</th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">{labelOr('ownerAttractions.expenses.amount', 'Total')}</th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">{labelOr('ownerAttractions.expenses.count', 'Count')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {(Array.isArray(attractionReportSummary?.byCategory) ? attractionReportSummary.byCategory : []).map((row, idx) => (
                            <tr key={`${row.category || 'general'}-${idx}`}>
                              <td className="px-3 py-2 text-xs text-gray-800">{row.category || 'general'}</td>
                              <td className="px-3 py-2 text-xs text-right font-semibold text-gray-900">{formatAmount(row.total)}</td>
                              <td className="px-3 py-2 text-xs text-right text-gray-700">{Number(row.count || 0)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}

      {view === 'income-revenue' && (
        <>
          <div className="mb-3 flex flex-wrap gap-2 text-[11px] sm:text-xs">
            {(() => {
              const s = ['transactions', 'add', 'payments', 'invoices', 'reports'].includes(incomeRevenueSection) ? incomeRevenueSection : 'transactions';
              const setSection = (val) => {
                try {
                  const next = new URLSearchParams(searchParams.toString());
                  next.set('view', 'income-revenue');
                  next.set('section', val);
                  setSearchParams(next, { replace: true });
                } catch (_) {}
              };
              const pill = (val, label) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setSection(val)}
                  className={`px-2.5 py-1 rounded-full border ${
                    s === val
                      ? 'bg-[#f5e6d5] text-[#4b2a00] border-[#a06b42] font-semibold'
                      : 'bg-white text-[#6b5744] border-[#e0d5c7] hover:bg-[#f9f1e7]'
                  }`}
                >
                  {label}
                </button>
              );
              return (
                <>
                  {pill('transactions', labelOr('nav.allTransactions', 'All transactions'))}
                  {pill('add', labelOr('nav.addIncome', 'Add income'))}
                  {pill('payments', labelOr('nav.clientPayments', 'Client payments'))}
                  {pill('invoices', labelOr('nav.invoicesReceipts', 'Invoices & receipts'))}
                  {pill('reports', labelOr('nav.revenueReports', 'Revenue reports'))}
                </>
              );
            })()}
          </div>

          <div className="mb-6 rounded-xl bg-white border border-gray-200 px-4 py-4 text-sm text-gray-700">
            <h2 className="text-lg font-semibold mb-2">
              {labelOr('nav.incomeRevenue', 'Income & revenue')}
            </h2>
            <p className="text-xs text-gray-500 mb-2">
              {labelOr('ownerAttractions.incomeRevenueDescription', 'Tools for managing attraction income, payouts and revenue reports will appear here. For now you can use the Finance and Analytics tabs for high-level numbers.')}
            </p>
          </div>
        </>
      )}

      {/* Bookings: only in Bookings view */}
      {view === 'bookings' && (
      <div className="mt-8">
        <div className="mb-3 flex flex-wrap gap-2 text-[11px] sm:text-xs">
          <button
            type="button"
            onClick={() => {
              try {
                const next = new URLSearchParams(searchParams.toString());
                next.set('view', 'bookings');
                next.set('section', 'list');
                setSearchParams(next, { replace: true });
              } catch (_) {}
            }}
            className={`px-2.5 py-1 rounded-full border ${
              bookingsSection === 'list'
                ? 'bg-[#f5e6d5] text-[#4b2a00] border-[#a06b42] font-semibold'
                : 'bg-white text-[#6b5744] border-[#e0d5c7] hover:bg-[#f9f1e7]'
            }`}
          >
            {labelOr('ownerAttractions.bookings.subtab.list', 'Bookings list')}
          </button>
          <button
            type="button"
            onClick={() => {
              try {
                const next = new URLSearchParams(searchParams.toString());
                next.set('view', 'bookings');
                next.set('section', 'direct');
                setSearchParams(next, { replace: true });
              } catch (_) {}
            }}
            className={`px-2.5 py-1 rounded-full border ${
              bookingsSection === 'direct'
                ? 'bg-[#f5e6d5] text-[#4b2a00] border-[#a06b42] font-semibold'
                : 'bg-white text-[#6b5744] border-[#e0d5c7] hover:bg-[#f9f1e7]'
            }`}
          >
            {labelOr('ownerAttractions.bookings.subtab.direct', 'Direct booking')}
          </button>
        </div>

        {bookingsSection === 'direct' ? (
          <div className="bg-white rounded-2xl shadow-sm border border-[#e0d5c7] p-4">
            <div className="mb-3">
              <h2 className="text-xl font-semibold text-gray-900">{labelOr('ownerAttractions.bookings.direct.title', 'Direct attraction booking')}</h2>
              <p className="text-xs text-gray-500 mt-0.5">{labelOr('ownerAttractions.bookings.direct.subtitle', 'Create a booking for a walk-in guest. This will be saved in reservations.')}</p>
            </div>

            <form onSubmit={createDirectAttractionBooking} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-gray-600 mb-1">{labelOr('ownerAttractions.bookings.direct.attraction', 'Attraction')}</label>
                  <select
                    value={directBookingDraft.attractionId}
                    onChange={(e) => setDirectBookingDraft(prev => ({ ...prev, attractionId: e.target.value }))}
                    className="w-full px-3 py-2 border border-[#d4c4b0] rounded-lg text-sm"
                    required
                  >
                    <option value="">{labelOr('ownerAttractions.bookings.direct.selectAttraction', 'Select attraction...')}</option>
                    {(Array.isArray(items) ? items : []).map(a => (
                      <option key={String(a._id)} value={String(a._id)}>{a.name || 'Attraction'}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-gray-600 mb-1">{labelOr('ownerAttractions.bookings.direct.visitDate', 'Visit date')}</label>
                    <input
                      type="date"
                      value={directBookingDraft.visitDate}
                      onChange={(e) => setDirectBookingDraft(prev => ({ ...prev, visitDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-[#d4c4b0] rounded-lg text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-gray-600 mb-1">{labelOr('ownerAttractions.bookings.direct.tickets', 'Tickets')}</label>
                    <input
                      type="number"
                      min={1}
                      value={directBookingDraft.tickets}
                      onChange={(e) => setDirectBookingDraft(prev => ({ ...prev, tickets: e.target.value }))}
                      className="w-full px-3 py-2 border border-[#d4c4b0] rounded-lg text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-gray-600 mb-1">{labelOr('ownerAttractions.bookings.direct.paymentMethod', 'Payment method')}</label>
                  <select
                    value={directBookingDraft.paymentMethod}
                    onChange={(e) => setDirectBookingDraft(prev => ({ ...prev, paymentMethod: e.target.value }))}
                    className="w-full px-3 py-2 border border-[#d4c4b0] rounded-lg text-sm"
                  >
                    <option value="cash">{labelOr('ownerAttractions.bookings.direct.cash', 'Cash')}</option>
                    <option value="mtn_mobile_money">{labelOr('ownerAttractions.bookings.direct.mobileMoney', 'Mobile money')}</option>
                    <option value="card">{labelOr('ownerAttractions.bookings.direct.card', 'Card')}</option>
                    <option value="bank_transfer">{labelOr('ownerAttractions.bookings.direct.bankTransfer', 'Bank transfer')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-gray-600 mb-1">{labelOr('ownerAttractions.bookings.direct.paymentStatus', 'Payment status')}</label>
                  <select
                    value={directBookingDraft.paymentStatus}
                    onChange={(e) => setDirectBookingDraft(prev => ({ ...prev, paymentStatus: e.target.value }))}
                    className="w-full px-3 py-2 border border-[#d4c4b0] rounded-lg text-sm"
                  >
                    <option value="paid">{labelOr('ownerAttractions.finance.paid', 'Paid')}</option>
                    <option value="pending">{labelOr('ownerAttractions.finance.pending', 'Pending')}</option>
                    <option value="unpaid">{labelOr('ownerAttractions.finance.unpaid', 'Unpaid')}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-gray-600 mb-1">{labelOr('ownerAttractions.bookings.direct.guestFirstName', 'Guest first name')}</label>
                  <input
                    value={directBookingDraft.guestInfo.firstName}
                    onChange={(e) => setDirectBookingDraft(prev => ({ ...prev, guestInfo: { ...prev.guestInfo, firstName: e.target.value } }))}
                    className="w-full px-3 py-2 border border-[#d4c4b0] rounded-lg text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-600 mb-1">{labelOr('ownerAttractions.bookings.direct.guestLastName', 'Guest last name')}</label>
                  <input
                    value={directBookingDraft.guestInfo.lastName}
                    onChange={(e) => setDirectBookingDraft(prev => ({ ...prev, guestInfo: { ...prev.guestInfo, lastName: e.target.value } }))}
                    className="w-full px-3 py-2 border border-[#d4c4b0] rounded-lg text-sm"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-gray-600 mb-1">{labelOr('ownerAttractions.bookings.direct.guestEmail', 'Guest email (optional)')}</label>
                  <input
                    type="email"
                    value={directBookingDraft.guestInfo.email}
                    onChange={(e) => setDirectBookingDraft(prev => ({ ...prev, guestInfo: { ...prev.guestInfo, email: e.target.value } }))}
                    className="w-full px-3 py-2 border border-[#d4c4b0] rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-600 mb-1">{labelOr('ownerAttractions.bookings.direct.guestPhone', 'Guest phone')}</label>
                  <input
                    value={directBookingDraft.guestInfo.phone}
                    onChange={(e) => setDirectBookingDraft(prev => ({ ...prev, guestInfo: { ...prev.guestInfo, phone: e.target.value } }))}
                    className="w-full px-3 py-2 border border-[#d4c4b0] rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-gray-600 mb-1">{labelOr('ownerAttractions.bookings.direct.contactPhone', 'Contact phone (booking record)')}</label>
                  <input
                    value={directBookingDraft.contactPhone}
                    onChange={(e) => setDirectBookingDraft(prev => ({ ...prev, contactPhone: e.target.value }))}
                    className="w-full px-3 py-2 border border-[#d4c4b0] rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-600 mb-1">{labelOr('ownerAttractions.bookings.direct.notes', 'Notes')}</label>
                  <input
                    value={directBookingDraft.notes}
                    onChange={(e) => setDirectBookingDraft(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full px-3 py-2 border border-[#d4c4b0] rounded-lg text-sm"
                    placeholder={labelOr('ownerAttractions.bookings.direct.notesPlaceholder', 'Special requests or internal note')}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#f0e6d9]">
                <button
                  type="submit"
                  disabled={directBookingSaving}
                  className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-[#a06b42] hover:bg-[#8f5a32] text-white text-sm font-medium shadow-sm disabled:opacity-50"
                >
                  {directBookingSaving
                    ? labelOr('ownerAttractions.bookings.direct.creating', 'Creating...')
                    : labelOr('ownerAttractions.bookings.direct.create', 'Create booking')}
                </button>
              </div>
            </form>
          </div>
        ) : (
        <>
        <div className="mb-2 flex flex-wrap gap-2 text-[11px] sm:text-xs">
          {['all','pending','confirmed','completed','cancelled'].map(s => (
            <button
              key={s}
              type="button"
              onClick={() => {
                try {
                  const next = new URLSearchParams(searchParams.toString());
                  next.set('view', 'bookings');
                  if (s === 'all') next.delete('bstatus'); else next.set('bstatus', s);
                  setSearchParams(next, { replace: true });
                } catch (_) {}
              }}
              className={`px-2.5 py-1 rounded-full border ${
                bookingStatusParam === s
                  ? 'bg-[#f5e6d5] text-[#4b2a00] border-[#a06b42] font-semibold'
                  : 'bg-white text-[#6b5744] border-[#e0d5c7] hover:bg-[#f9f1e7]'
              }`}
            >
              {s === 'all' ? labelOr('nav.allReservations', 'All reservations') : s}
            </button>
          ))}
        </div>

        <div className="mb-3 flex flex-wrap gap-2 text-[11px] sm:text-xs">
          {['all','paid','pending','unpaid'].map(s => (
            <button
              key={s}
              type="button"
              onClick={() => {
                try {
                  const next = new URLSearchParams(searchParams.toString());
                  next.set('view', 'bookings');
                  if (s === 'all') next.delete('pstatus'); else next.set('pstatus', s);
                  setSearchParams(next, { replace: true });
                } catch (_) {}
              }}
              className={`px-2.5 py-1 rounded-full border ${
                bookingPaymentParam === s
                  ? 'bg-[#f5e6d5] text-[#4b2a00] border-[#a06b42] font-semibold'
                  : 'bg-white text-[#6b5744] border-[#e0d5c7] hover:bg-[#f9f1e7]'
              }`}
            >
              {s === 'all' ? labelOr('ownerAttractions.finance.allPayments', 'All payments') : s}
            </button>
          ))}
        </div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Bookings</h2>
            <p className="text-xs text-gray-500 mt-0.5">View and manage all reservations for your attractions.</p>
          </div>
        </div>
        <div className="mb-4 bg-white rounded-xl shadow-sm border border-[#e0d5c7] px-3 py-3 flex flex-wrap items-end gap-3">
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
                <th className="px-4 py-2">Payment</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBookingsForView.map(b => (
                <tr key={b._id} className="border-t border-[#f0e6d9] hover:bg-[#fffaf4]">
                  <td className="px-4 py-3 text-sm font-medium text-[#3b2a18]">{b.attraction?.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{b.guest?.firstName} {b.guest?.lastName}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{new Date(b.visitDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{b.numberOfPeople}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-[#4b2a00]">{formatAmount(b.totalAmount)}</td>
                  <td className="px-4 py-3">
                    {(() => {
                      const pay = normalizePaymentStatus(b);
                      const cls = pay === 'paid'
                        ? 'bg-emerald-100 text-emerald-800'
                        : pay === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800';
                      return (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${cls}`}>{pay}</span>
                      );
                    })()}
                  </td>
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
        </>
        )}
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

      {editorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={closeEditor}></div>
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-[#e0d5c7] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#f0e6d9] bg-[#fffaf4]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-semibold text-[#3b2a18]">
                    {editorMode === 'create'
                      ? labelOr('ownerAttractions.editor.createTitle', 'Create attraction')
                      : labelOr('ownerAttractions.editor.editTitle', 'Edit attraction')}
                  </div>
                  <div className="mt-0.5 text-xs text-gray-600">
                    {labelOr('ownerAttractions.editor.subtitle', 'Fill in the details below. You can upload images after saving too.')}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeEditor}
                  className="px-3 py-1.5 rounded-lg bg-white border border-[#d4c4b0] text-[#4b2a00] text-xs font-medium hover:bg-[#f9f1e7]"
                >
                  {labelOr('common.close', 'Close')}
                </button>
              </div>
            </div>

            <div className="px-5 py-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-[11px] text-[#6b5744] mb-1">
                    {labelOr('ownerAttractions.fields.name', 'Name')}
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-[#d4c4b0] rounded-lg text-sm"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-[#6b5744] mb-1">
                    {labelOr('ownerAttractions.fields.category', 'Category')}
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 border border-[#d4c4b0] rounded-lg text-sm bg-white"
                  >
                    <option value="cultural">{labelOr('ownerAttractions.categories.cultural', 'Cultural')}</option>
                    <option value="nature">{labelOr('ownerAttractions.categories.nature', 'Nature')}</option>
                    <option value="adventure">{labelOr('ownerAttractions.categories.adventure', 'Adventure')}</option>
                    <option value="historical">{labelOr('ownerAttractions.categories.historical', 'Historical')}</option>
                    <option value="religious">{labelOr('ownerAttractions.categories.religious', 'Religious')}</option>
                    <option value="entertainment">{labelOr('ownerAttractions.categories.entertainment', 'Entertainment')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-[#6b5744] mb-1">
                    {labelOr('ownerAttractions.fields.city', 'City')}
                  </label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) => setForm(prev => ({ ...prev, city: e.target.value }))}
                    className="w-full px-3 py-2 border border-[#d4c4b0] rounded-lg text-sm"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[11px] text-[#6b5744] mb-1">
                    {labelOr('ownerAttractions.fields.location', 'Location')}
                  </label>
                  <input
                    type="text"
                    value={form.location}
                    onChange={(e) => setForm(prev => ({ ...prev, location: e.target.value }))}
                    className="w-full px-3 py-2 border border-[#d4c4b0] rounded-lg text-sm"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-[#6b5744] mb-1">
                    {labelOr('ownerAttractions.fields.price', 'Price')}
                  </label>
                  <input
                    type="number"
                    value={form.price}
                    onChange={(e) => setForm(prev => ({ ...prev, price: e.target.value }))}
                    className="w-full px-3 py-2 border border-[#d4c4b0] rounded-lg text-sm"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-[#6b5744] mb-1">
                    {labelOr('ownerAttractions.fields.currency', 'Currency')}
                  </label>
                  <select
                    value={form.currency}
                    onChange={(e) => setForm(prev => ({ ...prev, currency: e.target.value }))}
                    className="w-full px-3 py-2 border border-[#d4c4b0] rounded-lg text-sm bg-white"
                  >
                    <option value="RWF">RWF</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[11px] text-[#6b5744] mb-1">
                    {labelOr('ownerAttractions.fields.description', 'Description')}
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-[#d4c4b0] rounded-lg text-sm min-h-[96px]"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[11px] text-[#6b5744] mb-1">
                    {labelOr('ownerAttractions.fields.highlights', 'Highlights (comma-separated)')}
                  </label>
                  <input
                    type="text"
                    value={form.highlights}
                    onChange={(e) => setForm(prev => ({ ...prev, highlights: e.target.value }))}
                    className="w-full px-3 py-2 border border-[#d4c4b0] rounded-lg text-sm"
                  />
                </div>

                <div className="md:col-span-2 flex items-center gap-2">
                  <input
                    id="attractionActive"
                    type="checkbox"
                    checked={!!form.isActive}
                    onChange={(e) => setForm(prev => ({ ...prev, isActive: e.target.checked }))}
                  />
                  <label htmlFor="attractionActive" className="text-sm text-gray-700">
                    {labelOr('ownerAttractions.fields.isActive', 'Active')}
                  </label>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[11px] text-[#6b5744] mb-1">
                    {editorMode === 'create'
                      ? labelOr('ownerAttractions.fields.imagesRequired', 'Images (required)')
                      : labelOr('ownerAttractions.fields.imagesOptional', 'Images (optional)')}
                  </label>
                  <input
                    type="file"
                    multiple
                    onChange={(e) => setCreateImages(e.target.files ? Array.from(e.target.files) : [])}
                    className="text-sm"
                  />
                  {createImages?.length > 0 && (
                    <div className="mt-2 text-xs text-gray-600">
                      {createImages.length}{' '}
                      {labelOr('ownerAttractions.fields.imagesSelected', 'images selected')}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="px-5 py-4 border-t border-[#f0e6d9] bg-white flex flex-col sm:flex-row gap-2 sm:justify-end">
              <button
                type="button"
                onClick={closeEditor}
                className="px-4 py-2 rounded-lg bg-white border border-[#d4c4b0] text-[#4b2a00] text-sm font-medium hover:bg-[#f9f1e7]"
              >
                {labelOr('common.cancel', 'Cancel')}
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={saveEditor}
                className="px-4 py-2 rounded-lg bg-[#a06b42] hover:bg-[#8f5a32] disabled:opacity-60 text-white text-sm font-medium shadow-sm"
              >
                {saving
                  ? labelOr('common.saving', 'Saving...')
                  : (editorMode === 'create'
                    ? labelOr('common.create', 'Create')
                    : labelOr('common.save', 'Save'))}
              </button>
            </div>
          </div>
        </div>
      )}

      <SuccessModal
        open={successOpen}
        title={successTitle}
        message={successMsg}
        onClose={() => setSuccessOpen(false)}
      />
      </div>
    </div>
  );

}

