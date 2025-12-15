import React, { useState, useEffect, useRef } from 'react';

import {
  FaCalendarAlt, FaUsers, FaMoneyBillWave, FaCheckCircle, FaClock,
  FaEye, FaFileInvoice, FaFilter, FaDownload, FaComments, FaHome,
  FaChartLine, FaPlus, FaSearch, FaChevronDown, FaChevronUp,
  FaEdit, FaTrash, FaStar, FaPhone, FaEnvelope, FaDollarSign, FaUser,
  FaMapMarkerAlt, FaBed, FaBath, FaWifi, FaCar, FaSwimmingPool,
  FaUtensils, FaTv, FaSnowflake, FaPaw, FaSmokingBan,
  FaExclamationTriangle, FaTimes, FaCheck, FaArrowRight, FaArrowLeft,
  FaCalendarCheck, FaCalendarTimes, FaUserCheck, FaUserTimes,
  FaShoppingBag, FaCog, FaFileAlt, FaImages, FaQuestionCircle,
  FaPercent, FaCalendar, FaRulerCombined, FaUpload, FaBook, FaBuilding
} from 'react-icons/fa';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import BookingCalendar from '../components/BookingCalendar';
import { useLocale } from '../contexts/LocaleContext';
import FinancePanel from '../components/FinancePanel';
import LoadingIndicator from '../components/LoadingIndicator';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Lightweight UI-level timeout helper so dashboard doesn't hang indefinitely on slow networks
// Also attaches Authorization Bearer token from localStorage for protected owner endpoints.
const fetchWithUiTimeout = (url, options = {}, timeoutMs = 8000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  let token = null;
  try {
    if (typeof window !== 'undefined') {
      token = window.localStorage.getItem('token');
    }
  } catch (_) {}

  const mergedHeaders = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  return fetch(url, { ...options, headers: mergedHeaders, signal: controller.signal })
    .finally(() => clearTimeout(id));
};

const PropertyOwnerBookings = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, formatCurrencyRWF, formatCurrency } = useLocale() || {};

  const [searchParams, setSearchParams] = useSearchParams();
  const [bookings, setBookings] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showBookingDetails, setShowBookingDetails] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptPdfUrl, setReceiptPdfUrl] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    paid: 0,
    pending: 0,
    unpaid: 0,
    totalRevenue: 0,
    pendingRevenue: 0,
    totalProperties: 0,
    activeProperties: 0,
    occupancyRate: 0,
    averageRating: 0
  });
  const [showDirectBooking, setShowDirectBooking] = useState(false);
  const [showEditDirect, setShowEditDirect] = useState(false);
  const [editingDirectBooking, setEditingDirectBooking] = useState(null);
  const [editDirectForm, setEditDirectForm] = useState({
    directAddOns: [],
    finalAgreedAmount: '',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [directForm, setDirectForm] = useState({
    propertyId: '',
    roomId: '',
    checkIn: '',
    checkOut: '',
    guests: 1,
    guestInfo: { firstName: '', lastName: '', email: '', phone: '', nationality: '', passport: '', address: '' },
    contactInfo: { email: '', phone: '' },
    paymentMethod: 'cash',
    markPaid: true,
    paymentStatusSelection: 'paid',
    // services will be keyed dynamically by add-on key per property
    services: {},
    specialRequests: '',
    finalAgreedAmount: '',
  });
  const [ownerRooms, setOwnerRooms] = useState([]);
  const [ownerAddOns, setOwnerAddOns] = useState([]);
  const [filters, setFilters] = useState({
    status: 'all',
    property: 'all',
    dateRange: 'all',
    year: new Date().getFullYear(),
    search: ''
  });
  const [ownerView, setOwnerView] = useState('table'); // 'table' | 'calendar'
  const [calendarViewMode, setCalendarViewMode] = useState('monthly'); // 'monthly' | 'yearly' | 'matrix'
  // Default to 'dashboard' to show summary cards first; calendar is now only on the dedicated calendar tab
  const initialTab = searchParams.get('tab') || 'dashboard';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [activeNavDropdown, setActiveNavDropdown] = useState(null);
  const [financeFilter, setFinanceFilter] = useState(searchParams.get('finance_status') || 'all'); // all|paid|pending|unpaid
  const [financeView, setFinanceView] = useState(searchParams.get('view') || 'all'); // all|last30|mtd|ytd|invoices|statement|overview
  const [financePage, setFinancePage] = useState(1);
  const [financePerPage] = useState(10);
  const [analyticsRange, setAnalyticsRange] = useState(searchParams.get('range') || '30'); // 30|90|ytd|custom
  const [analyticsView, setAnalyticsView] = useState(searchParams.get('view') || 'dashboard'); // dashboard|demand|pace|sales|booker|bookwindow|cancellation|competitive|genius|ranking|performance
  const [boostView, setBoostView] = useState(searchParams.get('view') || 'opportunity'); // opportunity|commission-free|genius|preferred|long-stays|visibility|work-friendly|unit-diff
  const [ratesView, setRatesView] = useState(searchParams.get('view') || 'availability'); // availability|pricing
  const [ownerReviews, setOwnerReviews] = useState([]);
  const [ownerAvgRating, setOwnerAvgRating] = useState(0);
  const [ownerReviewCount, setOwnerReviewCount] = useState(0);
  const [analyticsData, setAnalyticsData] = useState({ occupancyDaily: [], adrDaily: [], revparDaily: [], totals: { occupancyAvg: 0, adrAvg: 0, revparAvg: 0, conversions: 0, cancellations: 0 } });
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [salesPeriod, setSalesPeriod] = useState('daily'); // daily|weekly|monthly
  const [salesPage, setSalesPage] = useState(1);
  const [salesPerPage] = useState(10);
  const [reportsPeriod, setReportsPeriod] = useState('monthly');
  const [reportsPage, setReportsPage] = useState(1);
  const [reportsPerPage] = useState(10);
  const [compPage, setCompPage] = useState(1);
  const [compPerPage] = useState(10);
  const [occPage, setOccPage] = useState(1);
  const [occPerPage] = useState(10);
  const [taxPage, setTaxPage] = useState(1);
  const [taxPerPage] = useState(10);
  const [showSalesConfirm, setShowSalesConfirm] = useState(false);
  const [salesNewBooking, setSalesNewBooking] = useState(null);
  const [expandedSections, setExpandedSections] = useState({
    reservations: true,
    calendar: false,
    finance: false,
    analytics: false,
    promotions: false,
    reviews: false,
    messages: false,
    settings: false,
    revenue: false,
    advancedAnalytics: false,
    reviewsManagement: false,
    propertyPerformance: false,
    guestCommunication: false,
    promotionsManagement: false,
    propertySettings: false,
    financialReports: false,
    photoManagement: false,
    helpSupport: false
  });
  const calendarRef = useRef(null);
  const receiptIframeRef = useRef(null);

  console.log('[PropertyOwnerBookings] mount/render', {
    path: location.pathname,
    search: location.search,
    initialTab: activeTab,
  });

  const openReceiptPdf = (bookingId) => {
    if (!bookingId) return;
    // Use the React Receipt page, which will call window.print() once loaded
    const url = `/receipt/${bookingId}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const openInvoicePdf = (bookingId) => {
    if (!bookingId) return;
    // Use the React Invoice page for preview; user can print from there
    const url = `/invoice/${bookingId}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Removed mock data. We will fetch live data from the backend.

  useEffect(() => {
    console.log('[PropertyOwnerBookings] useEffect mount -> loadData');
    
    // When accessing /dashboard route, set tab to 'dashboard' to show summary cards
    if (location.pathname === '/dashboard' && !location.search) {
      setActiveTab('dashboard');
    }
    
    loadData();
  }, [location.pathname]);

  useEffect(() => {
    if (activeTab === 'reviews') {
      loadOwnerReviews();
    }
    console.log('[PropertyOwnerBookings] activeTab changed', activeTab);
  }, [activeTab]);

  const loadData = async () => {
    console.log('[PropertyOwnerBookings] loadData start');
    setLoading(true);
    try {
      const [bookRes, propRes, occRes] = await Promise.all([
        fetchWithUiTimeout(`${API_URL}/api/bookings/property-owner`, { credentials: 'include' }),
        fetchWithUiTimeout(`${API_URL}/api/properties/my-properties`, { credentials: 'include' }),
        fetchWithUiTimeout(`${API_URL}/api/bookings/owner/visitors-analytics`, { credentials: 'include' })
      ]);
      const [bookJson, propJson, occJson] = await Promise.all([bookRes.json(), propRes.json(), occRes.json()]);
      if (bookRes.ok) setBookings(bookJson.bookings || []);
      if (propRes.ok) {
        const props = propJson.properties || [];
        setProperties(props);
        console.log('[PropertyOwnerBookings] properties loaded', props.length);
        if (!props.length) {
          toast.dismiss();
          toast.error('Add your first property to access your owner dashboard.');
          navigate('/upload');
          return;
        }
        // Ensure a concrete propertyId is selected so the calendar fetch runs
        if (props.length && filters.property === 'all') {
          setFilters(prev => ({ ...prev, property: props[0]._id }));
        }
      }
      const list = bookRes.ok ? (bookJson.bookings || []) : [];
      setStats({
        total: list.length,
        paid: list.filter(b => b.paymentStatus === 'paid' || b.status === 'confirmed').length,
        pending: list.filter(b => b.paymentStatus === 'pending' || b.status === 'pending').length,
        unpaid: list.filter(b => b.paymentStatus === 'unpaid').length,
        totalRevenue: list.reduce((sum, b) => sum + (b.totalAmount || 0), 0),
        pendingRevenue: list.filter(b => (b.paymentStatus === 'pending' || b.status === 'pending')).reduce((sum, b) => sum + (b.totalAmount || 0), 0),
        totalProperties: (propJson.properties || []).length,
        activeProperties: (propJson.properties || []).filter(p => p.status === 'active').length,
        // Initial occupancyRate will be recomputed per-property in the stats effect
        occupancyRate: 0,
        averageRating: 0
      });
      console.log('[PropertyOwnerBookings] bookings loaded', list.length);
    } catch (error) {
      console.error('[PropertyOwnerBookings] loadData error', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
      console.log('[PropertyOwnerBookings] loadData finished, loading = false');
    }
  };

  // Recompute dashboard stats whenever bookings/properties or selected property change
  useEffect(() => {
    const list = Array.isArray(bookings) ? bookings : [];
    const propertyFiltered = (filters.property && filters.property !== 'all')
      ? list.filter(b => String(b.property?._id) === String(filters.property))
      : list;

    // Derive property-level metrics based on the selected property filter
    const allProps = Array.isArray(properties) ? properties : [];
    const hasSpecificProperty = filters.property && filters.property !== 'all';
    const effectiveProps = hasSpecificProperty
      ? allProps.filter(p => String(p._id) === String(filters.property))
      : allProps;
    const totalPropertiesMetric = hasSpecificProperty
      ? (effectiveProps.length > 0 ? 1 : 0)
      : effectiveProps.length;
    const activePropertiesMetric = effectiveProps.filter(p => p.status === 'active').length;

    // Approximate occupancy: confirmed/ended bookings over capacity * period (30 days per active property)
    const occupancyNumerator = propertyFiltered.filter(b => (
      b.status === 'confirmed' || b.status === 'ended'
    )).length;
    const denominatorBase = Math.max(1, activePropertiesMetric || totalPropertiesMetric || 1);
    const occupancyRateRaw = (occupancyNumerator / (denominatorBase * 30)) * 100;
    const occupancyRateMetric = Math.max(0, Math.min(100, Math.round(occupancyRateRaw)));

    setStats(prev => ({
      ...prev,
      total: propertyFiltered.length,
      paid: propertyFiltered.filter(b => b.paymentStatus === 'paid' || b.status === 'confirmed').length,
      pending: propertyFiltered.filter(b => b.paymentStatus === 'pending' || b.status === 'pending').length,
      unpaid: propertyFiltered.filter(b => b.paymentStatus === 'unpaid').length,
      totalRevenue: propertyFiltered.reduce((sum, b) => sum + (b.totalAmount || 0), 0),
      pendingRevenue: propertyFiltered
        .filter(b => (b.paymentStatus === 'pending' || b.status === 'pending'))
        .reduce((sum, b) => sum + (b.totalAmount || 0), 0),
      totalProperties: totalPropertiesMetric,
      activeProperties: activePropertiesMetric,
      occupancyRate: occupancyRateMetric,
    }));
  }, [bookings, filters.property, properties]);

  // Sales confirmation flow kept for analytics, but printing now happens directly
  const onConfirmSalesAndPrint = async () => {
    try {
      if (salesNewBooking) {
        setActiveTab('analytics');
        setAnalyticsView('sales');
        setBookings(prev => [salesNewBooking, ...prev]);
        loadData();
      }
    } finally {
      setShowSalesConfirm(false);
      setSalesNewBooking(null);
    }
  };

  const onCancelSalesConfirm = () => {
    setShowSalesConfirm(false);
    setSalesNewBooking(null);
  };

  // Load owner analytics (RevPAR, ADR, occupancy) based on selected property
  useEffect(() => {
    const fetchOwnerAnalytics = async () => {
      try {
        setAnalyticsLoading(true);
        const params = new URLSearchParams();
        if (filters.property && filters.property !== 'all') params.set('property', filters.property);
        const res = await fetchWithUiTimeout(`${API_URL}/api/analytics/owner?${params.toString()}`, { credentials: 'include' });
        const data = await res.json();
        if (res.ok) setAnalyticsData(data || {});
      } catch (_) {
        setAnalyticsData({ occupancyDaily: [], adrDaily: [], revparDaily: [], totals: { occupancyAvg: 0, adrAvg: 0, revparAvg: 0, conversions: 0, cancellations: 0 } });
      } finally {
        setAnalyticsLoading(false);
      }
    };
    if (activeTab === 'analytics') fetchOwnerAnalytics();
  }, [activeTab, filters.property]);

  // Reset finance pagination when view or filters change
  useEffect(() => {
    setFinancePage(1);
  }, [financeView, financeFilter, filters.property]);

  // Helpers for sales grouping, export, and pagination
  const getPeriodKey = (d, period) => {
    const dt = new Date(d); dt.setHours(0, 0, 0, 0);
    if (period === 'monthly') return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
    if (period === 'weekly') {
      const t = new Date(dt.getTime());
      const day = (t.getDay() + 6) % 7; // ISO week, Monday=0
      t.setDate(t.getDate() - day);
      const y = t.getFullYear();
      const first = new Date(y, 0, 1); const diff = Math.floor((t - first) / (24 * 3600 * 1000));
      const week = Math.floor((diff + first.getDay() + 6) / 7) + 1;
      return `${y}-W${String(week).padStart(2, '0')}`;
    }
    return dt.toISOString().slice(0, 10);
  };

  const computeSalesBuckets = (list, period) => {
    const map = new Map();
    list.forEach(b => {
      const key = getPeriodKey(b.createdAt || b.checkIn, period);
      const cur = map.get(key) || { period: key, revenue: 0, tax: 0, count: 0 };
      cur.revenue += Number(b.totalAmount || 0);
      cur.tax += Number(b.taxAmount || 0);
      cur.count += 1;
      map.set(key, cur);
    });
    return Array.from(map.values()).sort((a, b) => a.period.localeCompare(b.period));
  };

  const exportSalesCSV = (rows) => {
    const header = ['Period', 'Revenue', 'Tax', 'Count'];
    const lines = [header.join(',')].concat(rows.map(r => [r.period, r.revenue, r.tax, r.count].join(',')));
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `sales_${salesPeriod}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  // Computed values for direct booking modal
  const ownerSelectedProperty = properties.find(p => String(p._id) === String(directForm.propertyId));
  const ownerSelectedRoom = ownerRooms.find(r => String(r._id) === String(directForm.roomId));
  const ownerNightly = ownerSelectedRoom?.pricePerNight || ownerSelectedProperty?.pricePerNight || 0;
  const ownerNights = (() => {
    if (!directForm.checkIn || !directForm.checkOut) return 0;
    const s = new Date(directForm.checkIn); const e = new Date(directForm.checkOut);
    const n = Math.ceil((e - s) / (1000 * 60 * 60 * 24));
    return isNaN(n) ? 0 : Math.max(0, n);
  })();
  const ownerRoomCharge = ownerNights > 0 ? ownerNightly * ownerNights : 0;
  const ownerServicesTotal = (() => {
    if (!Array.isArray(ownerAddOns) || ownerAddOns.length === 0) return 0;
    let total = 0;
    const guestCount = Math.max(1, directForm.guests || 1);
    const nightsCount = Math.max(1, ownerNights || 0);
    ownerAddOns
      .filter(a => a && a.enabled)
      .forEach(addOn => {
        const key = addOn.key;
        const selected = !!(directForm.services && directForm.services[key]);
        if (!selected) return;
        const price = Number(addOn.price || 0);
        const scope = addOn.scope || 'per-booking';
        if (scope === 'per-night') {
          total += price * nightsCount;
        } else if (scope === 'per-guest') {
          total += price * guestCount;
        } else {
          // per-booking
          total += price;
        }
      });
    return total;
  })();
  const ownerSubtotal = ownerRoomCharge + ownerServicesTotal;
  const ownerLevy3 = Math.round(ownerSubtotal * 0.03);
  // VAT removed for direct bookings – only levy applied
  const ownerVat18 = 0;
  const ownerGrandTotal = ownerSubtotal + ownerLevy3;

  // Respond to navbar dropdown links like /my-bookings?tab=properties
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    const propParam = params.get('property');
    const scope = params.get('scope'); // reservations scope
    const fstatus = params.get('finance_status');
    const view = params.get('view');
    const range = params.get('range');

    // Apply property filter from URL for all tabs (dashboard, reservations, finance, etc.)
    if (propParam && String(filters.property) !== String(propParam)) {
      setFilters(prev => ({ ...prev, property: propParam }));
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem('owner:lastPropertyId', String(propParam));
        }
      } catch (_) {}
    } else if (!propParam) {
      // No explicit property in URL: restore last selected property from localStorage if available
      try {
        if (typeof window !== 'undefined' && window.localStorage && filters.property === 'all') {
          const lastId = window.localStorage.getItem('owner:lastPropertyId');
          if (lastId && Array.isArray(properties) && properties.length) {
            const exists = properties.find(p => String(p._id) === String(lastId));
            if (exists) {
              setFilters(prev => ({ ...prev, property: lastId }));
            }
          }
        }
      } catch (_) {}
    }

    // Normalize tab mapping to our internal tabs
    if (!tab && location.pathname === '/dashboard') {
      // Any /dashboard URL without an explicit tab (even with other params like property)
      // should show the main dashboard home view.
      setActiveTab('dashboard');
    } else if (tab) {
      if (tab === 'bookings' || tab === 'reservations') {
        setActiveTab('reservations');
        // Expand reservations section
        setExpandedSections(prev => ({ ...prev, reservations: true }));
      } else if (tab === 'rates' || tab === 'dashboard') {
        setActiveTab('dashboard');
        // Rates & Availability and Dashboard both show summary cards + calendar
      } else if (tab === 'boost') {
        setActiveTab('promotions');
        // Boost performance goes to promotions
        setExpandedSections(prev => ({ ...prev, promotions: true }));
      } else if (tab === 'finance') {
        setActiveTab('finance');
        setExpandedSections(prev => ({ ...prev, finance: true }));
      } else if (tab === 'analytics') {
        setActiveTab('analytics');
        setExpandedSections(prev => ({ ...prev, analytics: true }));
      } else {
        setActiveTab(tab);
      }
    }

    // Apply reservations scope filters with enhanced mapping
    if (scope) {
      const map = {
        all: 'all',
        upcoming: 'confirmed',
        'checked-in': 'confirmed',
        'checked-out': 'ended',
        cancelled: 'cancelled',
        paid: 'paid',
        pending: 'pending',
        unpaid: 'unpaid'
      };
      const next = map[scope] || 'all';
      setFilters(prev => ({ ...prev, status: next }));

      // For upcoming, checked-in, checked-out, we'll need date-based filtering
      // This will be handled in the filtering logic
      if (scope === 'upcoming' || scope === 'checked-in' || scope === 'checked-out') {
        setFilters(prev => ({ ...prev, dateRange: scope }));
      }
    }

    // Apply finance filters
    if (fstatus) {
      setFinanceFilter(fstatus);
      setExpandedSections(prev => ({ ...prev, finance: true }));
    }

    if (view && tab === 'finance') {
      setFinanceView(view);
      setExpandedSections(prev => ({ ...prev, finance: true }));
    }

    if (view && tab === 'analytics') {
      setAnalyticsView(view);
      setExpandedSections(prev => ({ ...prev, analytics: true }));
    }

    if (view && tab === 'boost') {
      setBoostView(view);
      setExpandedSections(prev => ({ ...prev, promotions: true }));
    }

    if (view && tab === 'rates') {
      setRatesView(view);
    }

    // Apply analytics range
    if (range) {
      setAnalyticsRange(range);
      setExpandedSections(prev => ({ ...prev, analytics: true }));
    }

    // Calendar deep-linking
    if (tab === 'properties' || tab === 'calendar') {
      setOwnerView('calendar');
      setActiveTab('calendar'); // Set to calendar tab instead of dashboard
      // Ensure a property is selected to render the calendar
      if (propParam) {
        setFilters(prev => ({ ...prev, property: propParam }));
      } else if (properties.length && filters.property === 'all') {
        setFilters(prev => ({ ...prev, property: properties[0]._id }));
      }
      // Handle monthOffset for calendar navigation
      const monthOffset = params.get('monthOffset');
      if (monthOffset !== null) {
        // The monthOffset will be used by the BookingCalendar component
        // We just need to ensure the calendar section is visible
      }
      // Expand and scroll to calendar
      setExpandedSections(prev => ({ ...prev, calendar: true }));
      setTimeout(() => {
        if (calendarRef.current) {
          calendarRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  }, [location.search, properties, filters.property]);

  const onDirectChange = (path, value) => {
    setDirectForm(prev => {
      if (path.includes('.')) {
        const [p, c] = path.split('.');
        return { ...prev, [p]: { ...prev[p], [c]: value } };
      }
      return { ...prev, [path]: value };
    });
  };

  const onEditDirectChange = (path, value) => {
    setEditDirectForm(prev => {
      if (path.includes('.')) {
        const [p, c] = path.split('.');
        return { ...prev, [p]: { ...prev[p], [c]: value } };
      }
      return { ...prev, [path]: value };
    });
  };

  const addEditDirectAddOnRow = () => {
    setEditDirectForm(prev => ({
      ...prev,
      directAddOns: [...(prev.directAddOns || []), { label: '', amount: '' }]
    }));
  };

  const updateEditDirectAddOn = (index, field, value) => {
    setEditDirectForm(prev => {
      const list = Array.isArray(prev.directAddOns) ? [...prev.directAddOns] : [];
      if (!list[index]) list[index] = { label: '', amount: '' };
      list[index] = { ...list[index], [field]: value };
      return { ...prev, directAddOns: list };
    });
  };

  const removeEditDirectAddOn = (index) => {
    setEditDirectForm(prev => {
      const list = Array.isArray(prev.directAddOns) ? [...prev.directAddOns] : [];
      list.splice(index, 1);
      return { ...prev, directAddOns: list };
    });
  };

  const onSelectProperty = async (pid) => {
    onDirectChange('propertyId', pid);
    onDirectChange('roomId', '');
    setOwnerRooms([]);
    setOwnerAddOns([]);
    // Keep dashboard filters aligned with the currently selected direct-booking property
    setFilters(prev => ({ ...prev, property: pid || 'all' }));
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        if (pid) {
          window.localStorage.setItem('owner:lastPropertyId', String(pid));
        } else {
          window.localStorage.removeItem('owner:lastPropertyId');
        }
      }
    } catch (_) {}
    if (!pid) return;
    try {
      const res = await fetch(`${API_URL}/api/properties/${pid}`, { credentials: 'include' });
      const data = await res.json();
      if (res.ok) {
        setOwnerRooms(data.property?.rooms || []);
        setOwnerAddOns(Array.isArray(data.property?.addOnServices) ? data.property.addOnServices : []);
      }
    } catch (_) { }
  };

  const submitDirectBooking = async () => {
    try {
      if (!directForm.propertyId || !directForm.roomId || !directForm.checkIn || !directForm.checkOut) {
        toast.error('Please fill property, room, dates');
        return;
      }
      if (!directForm.guestInfo.firstName || !directForm.guestInfo.lastName || !directForm.guestInfo.phone) {
        toast.error('Guest name and phone are required');
        return;
      }
      const uiPaymentMethod = directForm.paymentMethod;
      const payloadPaymentMethod = uiPaymentMethod === 'mtn_mobile_money' ? 'mtn_mobile_money' : 'cash';
      const markPaid = directForm.paymentStatusSelection === 'paid';
      const payload = {
        propertyId: directForm.propertyId,
        room: directForm.roomId,
        checkIn: directForm.checkIn,
        checkOut: directForm.checkOut,
        numberOfGuests: directForm.guests,
        contactInfo: directForm.contactInfo,
        specialRequests: directForm.specialRequests,
        groupBooking: directForm.guests >= 4,
        groupSize: directForm.guests,
        paymentMethod: payloadPaymentMethod,
        guestInfo: directForm.guestInfo,
        markPaid: payloadPaymentMethod === 'cash' ? !!markPaid : false,
        directBooking: true,
        finalAgreedAmount: directForm.finalAgreedAmount ? Number(directForm.finalAgreedAmount) : undefined,
      };
      const res = await fetch(`${API_URL}/api/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create booking');
      toast.success('Direct booking recorded');
      setShowDirectBooking(false);
      if (data?.booking) {
        // Immediately open printable receipt; the page will invoke window.print()
        openReceiptPdf(data.booking._id);
      }
    } catch (e) {
      toast.error(e.message);
    }
  };

  const saveDirectDraft = () => {
    try {
      localStorage.setItem('directBookingDraft', JSON.stringify(directForm));
      toast.success('Saved as draft');
    } catch (_) { }
  };

  const clearDirectForm = () => {
    setDirectForm({
      propertyId: '',
      roomId: '',
      checkIn: '',
      checkOut: '',
      guests: 1,
      guestInfo: { firstName: '', lastName: '', email: '', phone: '', nationality: '', passport: '', address: '' },
      contactInfo: { email: '', phone: '' },
      paymentMethod: 'cash',
      markPaid: true,
      paymentStatusSelection: 'paid',
      services: {},
      specialRequests: '',
      finalAgreedAmount: '',
    });
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (activeNavDropdown && !event.target.closest('.relative')) {
        setActiveNavDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeNavDropdown]);

  const handleViewDetails = (booking) => {
    setSelectedBooking(booking);
    setShowBookingDetails(true);
  };

  const handleViewReceipt = (booking) => {
    if (!booking?._id) return;
    openReceiptPdf(booking._id);
  };

  const handleMarkPaid = async (booking) => {
    if (!booking?._id) return;
    try {
      const res = await fetchWithUiTimeout(`${API_URL}/api/bookings/${booking._id}/mark-paid`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || 'Failed to mark booking as paid');
      }
      toast.success('Booking marked as paid');
      // Refresh bookings so status and finance stats update
      loadData();
    } catch (error) {
      console.error('[PropertyOwnerBookings] handleMarkPaid error', error);
      toast.error(error.message || 'Failed to mark booking as paid');
    }
  };

  const openEditDirectModal = async (booking) => {
    try {
      if (!booking?._id) return;
      const res = await fetch(`${API_URL}/api/bookings/${booking._id}`, { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to load booking');
      const full = data.booking || data;
      setEditingDirectBooking(full);
      setEditDirectForm({
        directAddOns: Array.isArray(full.directAddOns) ? full.directAddOns.map(a => ({
          label: a.label || '',
          amount: a.amount != null ? a.amount : ''
        })) : [],
        finalAgreedAmount: full.finalAgreedAmount != null ? String(full.finalAgreedAmount) : '',
      });
      setShowEditDirect(true);
    } catch (e) {
      toast.error(e.message || 'Failed to open edit form');
    }
  };

  const submitEditDirectBooking = async () => {
    try {
      if (!editingDirectBooking?._id) return;
      const payload = {
        directAddOns: (editDirectForm.directAddOns || [])
          .filter(a => (a.label && String(a.label).trim()) || Number(a.amount || 0) > 0)
          .map(a => ({
            label: String(a.label || '').trim(),
            amount: Number(a.amount || 0) || 0,
          })),
        finalAgreedAmount: editDirectForm.finalAgreedAmount
          ? Number(editDirectForm.finalAgreedAmount)
          : undefined,
      };
      const res = await fetch(`${API_URL}/api/bookings/${editingDirectBooking._id}/direct`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update direct booking');
      const updated = data.booking || editingDirectBooking;
      setBookings(prev => prev.map(b => (b._id === updated._id ? { ...b, ...updated } : b)));
      toast.success('Direct booking updated');
      setShowEditDirect(false);
      setEditingDirectBooking(null);
    } catch (e) {
      toast.error(e.message || 'Failed to save changes');
    }
  };

  const renderBookingDetails = () => {
    if (!showBookingDetails || !selectedBooking) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Booking Details</h2>
              <button
                onClick={() => setShowBookingDetails(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <FaTimes className="text-xl" />
              </button>
            </div>
          </div>
          <div className="p-6 space-y-4 text-sm">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="text-xs text-gray-500">Guest</p>
                <p className="font-semibold text-gray-900">
                  {`${selectedBooking.guest?.firstName || ''} ${selectedBooking.guest?.lastName || ''}`.trim() || selectedBooking.guest?.email || 'Guest'}
                </p>
                <p className="text-xs text-gray-500">{selectedBooking.guest?.email}</p>
                <p className="text-xs text-gray-500">{selectedBooking.guest?.phone}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Total amount</p>
                <p className="text-xl font-bold text-[#4b2a00]">
                  {formatCurrencyRWF
                    ? formatCurrencyRWF(selectedBooking.totalAmount || 0)
                    : `RWF ${(selectedBooking.totalAmount || 0).toLocaleString()}`}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Property</p>
                <p className="font-medium text-gray-900">{selectedBooking.property?.title || selectedBooking.property?.name || 'Property'}</p>
                <p className="text-xs text-gray-500">{selectedBooking.property?.city || selectedBooking.property?.address}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Dates & guests</p>
                <p className="font-medium text-gray-900">{selectedBooking.checkIn} → {selectedBooking.checkOut}</p>
                <p className="text-xs text-gray-500">{selectedBooking.numberOfGuests || selectedBooking.guests || 1} guests</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderReceipt = () => {
    if (!showReceipt || !receiptPdfUrl) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Receipt preview</h2>
            <button
              onClick={() => setShowReceipt(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <FaTimes />
            </button>
          </div>
          <div className="flex-1">
            <iframe
              ref={receiptIframeRef}
              src={receiptPdfUrl}
              title="Receipt PDF"
              className="w-full h-full border-0"
            />
          </div>
        </div>
      </div>
    );
  };

  const handleStatusChange = async (bookingId, newStatus) => {
    try {
      if (!bookingId || !newStatus) return;

      // For "ended" we use the same backend route as the guest dashboard, so dates are freed
      if (newStatus === 'ended') {
        const res = await fetch(`${API_URL}/api/bookings/${bookingId}/end`, {
          method: 'POST',
          credentials: 'include'
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || 'Failed to mark as ended');
      } else {
        // Generic status update (if supported by backend)
        const res = await fetch(`${API_URL}/api/bookings/${bookingId}/status`, {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || 'Failed to update status');
      }

      // Refresh local list
      setBookings(prev => prev.map(b => (
        b._id === bookingId ? { ...b, status: newStatus } : b
      )));
      toast.success('Status updated successfully');
    } catch (error) {
      toast.error(error.message || 'Failed to update status');
    }
  };

  const now = new Date();
  const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  const since48h = new Date(now.getTime() - 48 * 60 * 60 * 1000);

  const scopedBookings = Array.isArray(bookings)
    ? bookings.filter((b) =>
      filters.property === 'all'
        ? true
        : String(b.property?._id) === String(filters.property)
    )
    : [];

  const ownerOpsStats = {
    reservations: scopedBookings.length,
    arrivals48h: scopedBookings.filter((b) => {
      if (!b.checkIn) return false;
      const checkIn = new Date(b.checkIn);
      return (
        checkIn >= now &&
        checkIn <= in48h &&
        (b.status === 'confirmed' || (b.paymentStatus || '').toLowerCase() === 'paid')
      );
    }).length,
    departures48h: scopedBookings.filter((b) => {
      if (!b.checkOut) return false;
      const checkOut = new Date(b.checkOut);
      return (
        checkOut >= now &&
        checkOut <= in48h &&
        (b.status === 'confirmed' || b.status === 'ended')
      );
    }).length,
    reviews: ownerReviewCount || (Array.isArray(ownerReviews) ? ownerReviews.length : 0),
    cancellations48h: scopedBookings.filter((b) => {
      if (b.status !== 'cancelled') return false;
      const ts = b.updatedAt || b.cancelledAt || b.createdAt;
      if (!ts) return false;
      const d = new Date(ts);
      return d >= since48h && d <= now;
    }).length,
  };

  const propertiesWithStats = Array.isArray(properties) ? properties.map((p) => {
    const id = String(p._id || '');
    const code = p.propertyNumber || id.slice(-6) || 'N/A';
    const name = p.title || p.name || 'Property';
    const locationLabel = p.city || p.address || p.location || '';

    const pBookings = Array.isArray(bookings)
      ? bookings.filter((b) => String(b.property?._id) === id)
      : [];

    const bookingCount = pBookings.length;
    const revenue = pBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
    const upcomingCount = pBookings.filter((b) => {
      if (!b.checkIn) return false;
      const checkIn = new Date(b.checkIn);
      return (b.status === 'confirmed' || (b.paymentStatus || '').toLowerCase() === 'paid') && checkIn >= now;
    }).length;

    const arrivals48h = pBookings.filter((b) => {
      if (!b.checkIn) return false;
      const checkIn = new Date(b.checkIn);
      return (
        checkIn >= now &&
        checkIn <= in48h &&
        (b.status === 'confirmed' || (b.paymentStatus || '').toLowerCase() === 'paid')
      );
    }).length;

    const departures48h = pBookings.filter((b) => {
      if (!b.checkOut) return false;
      const checkOut = new Date(b.checkOut);
      return (
        checkOut >= now &&
        checkOut <= in48h &&
        (b.status === 'confirmed' || b.status === 'ended')
      );
    }).length;

    return {
      id,
      code,
      name,
      locationLabel,
      bookingCount,
      revenue,
      upcomingCount,
      arrivals48h,
      departures48h,
      raw: p,
    };
  }) : [];

  const filteredBookings = bookings.filter(booking => {
    // Status filter
    if (filters.status !== 'all' && booking.status !== filters.status && booking.paymentStatus !== filters.status) return false;

    // Property filter

    if (filters.property !== 'all' && String(booking.property?._id) !== String(filters.property)) return false;

    // Search filter
    const guestName = `${booking.guest?.firstName || ''} ${booking.guest?.lastName || ''}`.trim().toLowerCase();
    if (filters.search && !guestName.includes(filters.search.toLowerCase())) return false;

    // Date-based scope filtering for upcoming, checked-in, checked-out
    if (filters.dateRange && filters.dateRange !== 'all') {
      const now = new Date();
      const checkIn = new Date(booking.checkIn);
      const checkOut = new Date(booking.checkOut);

      if (filters.dateRange === 'upcoming') {
        // Upcoming: confirmed bookings with check-in date in the future
        if (booking.status !== 'confirmed' || checkIn <= now) return false;
      } else if (filters.dateRange === 'checked-in') {
        // Checked in: confirmed bookings where check-in has passed but check-out hasn't
        if (booking.status !== 'confirmed' || checkIn > now || checkOut < now) return false;
      } else if (filters.dateRange === 'checked-out') {
        // Checked out: ended bookings or confirmed bookings past check-out date
        if (booking.status !== 'ended' && (booking.status !== 'confirmed' || checkOut >= now)) return false;
      }
    }

    return true;
  });

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentBookings = filteredBookings.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredBookings.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Download report function
  const downloadReport = async (format) => {
    try {
      const propertyParam = filters.property !== 'all' ? `&property=${filters.property}` : '';
      const url = `${API_URL}/api/reports/generate-${format}?type=bookings&period=monthly${propertyParam}`;
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to generate report');
      const blob = await res.blob();
      const link = document.createElement('a');
      const objUrl = window.URL.createObjectURL(blob);
      link.href = objUrl;
      link.download = `bookings-report-${Date.now()}.${format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(objUrl);
      toast.success(`${format.toUpperCase()} report downloaded`);
    } catch (error) {
      toast.error('Failed to download report');
    }
  };

  // Finance filters derived from query params
  const financeFiltered = bookings.filter(b => {
    // status filter
    if (financeFilter && financeFilter !== 'all') {
      if (!((b.paymentStatus || '').toLowerCase() === financeFilter || (financeFilter === 'paid' && (b.status === 'confirmed' || b.status === 'ended')))) return false;
    }
    // property filter alignment (use same property filter if set)
    if (filters.property !== 'all' && String(b.property?._id) !== String(filters.property)) return false;
    // date range filter
    const created = new Date(b.createdAt);
    const now = new Date();
    if (financeView === 'last30') {
      const d30 = new Date(); d30.setDate(now.getDate() - 30);
      if (!(created >= d30 && created <= now)) return false;
    } else if (financeView === 'mtd') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      if (!(created >= start && created <= now)) return false;
    } else if (financeView === 'ytd') {
      const start = new Date(now.getFullYear(), 0, 1);
      if (!(created >= start && created <= now)) return false;
    }
    return true;
  });

  const renderBookingCard = (booking) => (
    <div key={booking._id} className="modern-card-elevated p-5 hover:scale-105 transition-all duration-300">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-base md:text-lg font-semibold text-gray-900">{booking.property.name}</h3>
          <p className="text-xs md:text-sm text-gray-600 flex items-center">
            <FaMapMarkerAlt className="mr-1" />
            {booking.property.location}
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-[11px] md:text-xs font-medium ${booking.status === 'paid' ? 'bg-green-100 text-green-800' :
          booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
          }`}>
          {booking.status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 md:gap-4 mb-4">
        <div>
          <p className="text-xs md:text-sm text-gray-600">Guest</p>
          <div className="flex items-center gap-2">
            {booking.guest?.avatar ? (
              <img src={booking.guest.avatar.startsWith('http') ? booking.guest.avatar : `${API_URL}${booking.guest.avatar}`} alt={booking.guest.name} className="w-8 h-8 rounded-full object-cover border" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-xs font-semibold">
                {((booking.guest?.firstName || booking.guest?.name || '').charAt(0) || (booking.guest?.email || 'U').charAt(0))}
              </div>
            )}

      {/* Edit Direct Booking modal */}
      {showEditDirect && editingDirectBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-2xl font-bold">Edit Direct Booking</h2>
              <button onClick={() => { setShowEditDirect(false); setEditingDirectBooking(null); }} className="text-gray-500 hover:text-gray-700">
                <FaTimes className="text-xl" />
              </button>
            </div>
            <div className="p-6 space-y-4 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Property</p>
                  <p className="font-semibold text-gray-900">{editingDirectBooking.property?.title || 'Property'}</p>
                  <p className="text-xs text-gray-500">{editingDirectBooking.property?.city || editingDirectBooking.property?.address}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Stay</p>
                  <p className="font-medium text-gray-900">{editingDirectBooking.checkIn} → {editingDirectBooking.checkOut}</p>
                  <p className="text-xs text-gray-500">Guests: {editingDirectBooking.numberOfGuests || 1}</p>
                </div>
              </div>

              <div className="border rounded-lg p-4 bg-gray-50 space-y-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-sm font-semibold text-gray-900">Direct add-ons</div>
                  <button
                    type="button"
                    onClick={addEditDirectAddOnRow}
                    className="px-2 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700"
                  >
                    + Add add-on
                  </button>
                </div>
                {(!Array.isArray(editDirectForm.directAddOns) || editDirectForm.directAddOns.length === 0) && (
                  <div className="text-xs text-gray-500">No direct add-ons yet. Use "+ Add add-on" to record extras like breakfast, transfer, etc.</div>
                )}
                {Array.isArray(editDirectForm.directAddOns) && editDirectForm.directAddOns.map((addOn, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center text-xs">
                    <input
                      type="text"
                      placeholder="Add-on description"
                      value={addOn.label || ''}
                      onChange={e => updateEditDirectAddOn(idx, 'label', e.target.value)}
                      className="col-span-7 border rounded px-2 py-1"
                    />
                    <input
                      type="number"
                      min={0}
                      placeholder="Amount"
                      value={addOn.amount}
                      onChange={e => updateEditDirectAddOn(idx, 'amount', e.target.value)}
                      className="col-span-4 border rounded px-2 py-1"
                    />
                    <button
                      type="button"
                      onClick={() => removeEditDirectAddOn(idx)}
                      className="col-span-1 text-red-500 hover:text-red-700"
                      aria-label="Remove add-on row"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <div className="pt-2 text-xs text-gray-700 space-y-1">
                  {(() => {
                    const addOnsTotal = (editDirectForm.directAddOns || []).reduce((sum, a) => {
                      const amt = Number(a?.amount || 0);
                      return sum + (isNaN(amt) || amt <= 0 ? 0 : amt);
                    }, 0);
                    return (
                      <>
                        <div>Direct add-ons total: RWF {addOnsTotal.toLocaleString()}</div>
                        <div className="text-[11px] text-gray-500">Room base and levy stay as per original booking; this only adjusts add-ons and final agreed amount.</div>
                      </>
                    );
                  })()}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Final agreed base amount (room + levy, before add-ons)</label>
                <input
                  type="number"
                  min={0}
                  value={editDirectForm.finalAgreedAmount}
                  onChange={e => onEditDirectChange('finalAgreedAmount', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="Leave blank to keep current agreed amount"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 border-t pt-4 pb-4 px-6">
              <button
                type="button"
                onClick={() => { setShowEditDirect(false); setEditingDirectBooking(null); }}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitEditDirectBooking}
                className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium"
              >
                Save changes
              </button>
            </div>
          </div>
        </div>
      )}
            <div>
              <p className="font-medium text-sm md:text-base">{booking.guest.name}</p>
              <p className="text-xs md:text-sm text-gray-500">{booking.guest.email}</p>
            </div>
          </div>
        </div>
        <div>
          <p className="text-xs md:text-sm text-gray-600">Dates</p>
          <p className="font-medium text-sm md:text-base">{booking.checkIn} - {booking.checkOut}</p>
          <p className="text-xs md:text-sm text-gray-500">{booking.guests} guests</p>
        </div>
      </div>

      {/* Finance History */}
      <div className="max-w-7xl mx-auto px-4 pb-10">
        <div className="mt-10">
          <h2 className="text-2xl font-bold text-[#4b2a00] mb-4">{t ? t('dashboard.financeHistory') : 'Finance History'}</h2>
          <div
            ref={calendarRef}
            className="neu-card p-0 overflow-x-auto rounded-2xl border border-[#e0d5c7] bg-white shadow-sm"
          >
            <table className="min-w-full divide-y divide-[#eee0cf]">
              <thead className="bg-[#fdf7f0]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#6b5744] uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#6b5744] uppercase tracking-wider">Booking</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#6b5744] uppercase tracking-wider">Property</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#6b5744] uppercase tracking-wider">Client</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-[#6b5744] uppercase tracking-wider">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#6b5744] uppercase tracking-wider">Method</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#6b5744] uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-[#f1e2d3]">
                {bookings.map(tr => (
                  <tr key={`fin-${tr._id}`} className="hover:bg-[#fff7ef] transition-colors">
                    <td className="px-4 py-3 text-xs md:text-sm text-[#4b2a00]">{new Date(tr.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-3 text-xs md:text-sm text-[#4b2a00]">{tr.confirmationCode || tr._id}</td>
                    <td className="px-4 py-3 text-xs md:text-sm text-[#4b2a00]">{tr.property?.title || tr.property?.name || 'Property'}</td>
                    <td className="px-4 py-3 text-xs md:text-sm text-[#4b2a00]">
                      <div className="flex items-center gap-2">
                        {tr.guest?.avatar ? (
                          <img src={tr.guest.avatar.startsWith('http') ? tr.guest.avatar : `${API_URL}${tr.guest.avatar}`} alt={tr.guest?.firstName} className="w-6 h-6 rounded-full object-cover border" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-[10px] font-semibold">
                            {((tr.guest?.firstName || '').charAt(0) || (tr.guest?.email || 'U').charAt(0))}
                          </div>
                        )}
                        <span>{`${tr.guest?.firstName || ''} ${tr.guest?.lastName || ''}`.trim() || tr.guest?.email || 'Guest'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-[#4b2a00]">{formatCurrencyRWF ? formatCurrencyRWF(tr.totalAmount || 0) : `RWF ${(tr.totalAmount || 0).toLocaleString()}`}</td>
                    <td className="px-4 py-3 text-xs md:text-sm text-[#6b5744]">{tr.paymentMethod}</td>
                    <td className="px-4 py-3 text-xs md:text-sm">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${(tr.paymentStatus || tr.status) === 'paid'
                        ? 'bg-green-50 text-green-800 border border-green-200'
                        : (tr.paymentStatus || tr.status) === 'pending'
                          ? 'bg-yellow-50 text-yellow-800 border border-yellow-200'
                          : 'bg-gray-50 text-gray-700 border border-gray-200'
                        }`}>
                        {tr.paymentStatus || tr.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {bookings.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-[#8a745e] text-sm">{t ? t('dashboard.noFinanceHistory') : 'No finance history yet.'}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      <div className="flex justify-between items-center mb-4">
        <div>
          <p className="text-xs md:text-sm text-gray-600">{t ? t('dashboard.totalAmount') : 'Total Amount'}</p>
          <p className="text-lg md:text-xl font-bold text-primary">{formatCurrencyRWF ? formatCurrencyRWF(booking.totalAmount || 0) : `RWF ${booking.totalAmount.toLocaleString()}`}</p>
        </div>
        {booking.rating && (
          <div className="flex items-center">
            <FaStar className="text-yellow-400 mr-1" />
            <span className="font-medium text-sm">{booking.rating}</span>
          </div>
        )}
      </div>

      <div className="flex space-x-2">
        <button
          onClick={() => handleViewDetails(booking)}
          className="flex-1 btn-primary text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center"
        >
          <FaEye className="mr-2" />
          View Details
        </button>
        <button
          onClick={() => handleViewReceipt(booking)}
          className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center"
        >
          <FaFileInvoice className="mr-2" />
          Receipt
        </button>
        <button
          onClick={() => navigate(`/messages?booking=${booking._id}`)}
          className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          Message Guest
        </button>
      </div>
    </div>
  );

  return (
    console.log('[PropertyOwnerBookings] render return', {
      activeTab,
      loading,
      bookings: Array.isArray(bookings) ? bookings.length : 'not-array',
      properties: Array.isArray(properties) ? properties.length : 'not-array',
    }),
    <div className="bg-[#f5f0e8]">
      {/* Summary Cards - Dashboard overview - Only shown on main dashboard home page */}
      {location.pathname === '/dashboard' && activeTab === 'dashboard' && (
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="mb-6">
            {filters.property && filters.property !== 'all' && (
              <p className="text-sm text-gray-600 mb-4">
                Showing data for selected property
              </p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Reservations</p>
                    <p className="text-3xl font-bold text-gray-900">{ownerOpsStats.reservations}</p>
                  </div>
                  <div className="w-12 h-12 bg-[#f5ede1] rounded-lg flex items-center justify-center">
                    <FaCalendarAlt className="text-2xl text-[#a06b42]" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Arrival</p>
                    <p className="text-3xl font-bold text-gray-900">{ownerOpsStats.arrivals48h}</p>
                  </div>
                  <div className="w-12 h-12 bg-[#f5ede1] rounded-lg flex items-center justify-center">
                    <FaCheckCircle className="text-2xl text-[#a06b42]" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Departures</p>
                    <p className="text-3xl font-bold text-gray-900">{ownerOpsStats.departures48h}</p>
                  </div>
                  <div className="w-12 h-12 bg-[#f5ede1] rounded-lg flex items-center justify-center">
                    <FaUsers className="text-2xl text-[#a06b42]" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Reviews</p>
                    <p className="text-3xl font-bold text-gray-900">{ownerOpsStats.reviews}</p>
                  </div>
                  <div className="w-12 h-12 bg-[#f5ede1] rounded-lg flex items-center justify-center">
                    <FaStar className="text-2xl text-[#a06b42]" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Cancellations</p>
                    <p className="text-3xl font-bold text-gray-900">{ownerOpsStats.cancellations48h}</p>
                  </div>
                  <div className="w-12 h-12 bg-[#f5ede1] rounded-lg flex items-center justify-center">
                    <FaTimes className="text-2xl text-[#a06b42]" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
       {activeTab === 'calendar' && (
        <div>
          <div className="neu-card p-6 mb-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
              <div>
                <h2 className="text-xl font-semibold text-[#4b2a00]">Property Calendar</h2>
                <p className="text-xs text-gray-500">Switch between monthly and yearly availability views.</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={filters.property}
                  onChange={(e) => setFilters(prev => ({ ...prev, property: e.target.value }))}
                  className="modern-input"
                >
                  <option value="all">All Properties</option>
                  {properties.map(p => (
                    <option key={p._id} value={p._id}>{p.name}</option>
                  ))}
                </select>
                <div className="relative">
                  <select
                    value={calendarViewMode}
                    onChange={(e) => setCalendarViewMode(e.target.value)}
                    className="pl-3 pr-8 py-2 rounded-full border border-[#e0d5c7] bg-[#fdf7f0] text-xs text-[#4b2a00] focus:outline-none focus:ring-2 focus:ring-[#a06b42]"
                  >
                    <option value="monthly">Monthly view</option>
                    <option value="yearly">Yearly view</option>
                    <option value="matrix">List view</option>
                  </select>
                </div>
              </div>
            </div>

            {(() => {
              const propertyForCalendar = filters.property !== 'all' ? filters.property : (properties[0]?._id || '');
              if (!propertyForCalendar) {
                return (
                  <div className="text-gray-500 py-8 text-center">Select a property to view its calendar.</div>
                );
              }

              if (calendarViewMode === 'monthly') {
                const mo = parseInt(searchParams.get('monthOffset') || '0');
                const base = new Date(filters.year, new Date().getMonth(), 1);
                if (!isNaN(mo)) {
                  base.setMonth(base.getMonth() + mo);
                }
                return (
                  <BookingCalendar
                    propertyId={propertyForCalendar}
                    initialDate={base}
                    onBookingSelect={(booking) => {
                      setSelectedBooking(booking);
                      setShowBookingDetails(true);
                    }}
                  />
                );
              }

              if (calendarViewMode === 'matrix') {
                const start = new Date(filters.year, new Date().getMonth(), 1);
                const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);

                const days = [];
                for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                  days.push(new Date(d));
                }

                const roomsForProperty = ownerRooms.filter(
                  r => String(r.property) === String(propertyForCalendar)
                );

                const getRoomUnits = (room) => Number(room.totalUnits || room.units || 1);

                const getRoomStatsForDay = (room, day) => {
                  const roomId = room._id || room.id;

                  const list = bookings.filter(b => {
                    if (String(b.property?._id) !== String(propertyForCalendar)) return false;
                    if (String(b.room) !== String(roomId)) return false;
                    const ci = new Date(b.checkIn);
                    const co = new Date(b.checkOut);
                    const d0 = new Date(day.getFullYear(), day.getMonth(), day.getDate());
                    return d0 >= new Date(ci.getFullYear(), ci.getMonth(), ci.getDate()) &&
                      d0 < new Date(co.getFullYear(), co.getMonth(), co.getDate());
                  });

                  const units = getRoomUnits(room);
                  const booked = list.length;
                  const remaining = Math.max(0, units - booked);

                  let status = 'bookable';
                  if (booked >= units && units > 0) status = 'soldout';
                  else if (booked > 0) status = 'partial';

                  return { units, booked, remaining, status };
                };

                const statusClasses = {
                  bookable: 'bg-[#e9f7ec] border-[#b7dfc5] text-[#245430]',
                  partial: 'bg-[#fff4e6] border-[#f1c48a] text-[#7b4a12]',
                  soldout: 'bg-[#fdeeee] border-[#f5b5b5] text-[#7a1f1f]',
                };

                return (
                  <div className="space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-semibold text-[#4b2a00]">
                          {start.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-gray-600">
                        <span className="inline-flex items-center gap-1">
                          <span className="w-3 h-3 rounded-sm bg-[#e9f7ec] border border-[#b7dfc5]" /> Open
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <span className="w-3 h-3 rounded-sm bg-[#fff4e6] border border-[#f1c48a]" /> Partially booked
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <span className="w-3 h-3 rounded-sm bg-[#fdeeee] border border-[#f5b5b5]" /> Sold-out
                        </span>
                      </div>
                    </div>

                    <div className="border border-[#e0d5c7] rounded-xl overflow-x-auto bg-white">
                      <table className="min-w-full text-xs">
                        <thead className="bg-[#fdf7f0] text-[#4b2a00]">
                          <tr>
                            <th className="px-3 py-2 text-left w-40">Room</th>
                            {days.map(d => (
                              <th
                                key={d.toISOString()}
                                className="px-2 py-2 text-center whitespace-nowrap border-l border-[#e0d5c7]"
                              >
                                <div>{d.getDate()}</div>
                                <div className="text-[10px] text-gray-500">
                                  {d.toLocaleDateString(undefined, { weekday: 'short' })}
                                </div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {roomsForProperty.map(room => (
                            <tr key={room._id || room.id} className="border-t border-[#f0e6d9]">
                              <td className="px-3 py-2 text-[11px] text-[#4b2a00] bg-[#fdf7f0] sticky left-0 z-10">
                                <div className="font-semibold">{room.roomNumber || room.name || 'Room'}</div>
                                <div className="text-[10px] text-gray-500">
                                  Rooms to sell: {getRoomUnits(room)}
                                </div>
                              </td>
                              {days.map(d => {
                                const { units, booked, remaining, status } = getRoomStatsForDay(room, d);
                                const cls = statusClasses[status] || 'bg-white border-[#e0d5c7] text-[#4b2a00]';
                                return (
                                  <td
                                    key={d.toISOString()}
                                    className={`px-1 py-1 text-center border-l border-[#f0e6d9] ${cls}`}
                                    title={`${booked} booked / ${units} total`}
                                  >
                                    <div className="text-[10px] font-semibold">
                                      {booked}/{units}
                                    </div>
                                    <div className="text-[9px] text-[rgba(0,0,0,0.55)]">
                                      {remaining} open
                                    </div>
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                          {roomsForProperty.length === 0 && (
                            <tr>
                              <td colSpan={days.length + 1} className="px-4 py-8 text-center text-gray-500">
                                Add rooms to this property to use the list view.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              }

              const year = Number(filters.year) || new Date().getFullYear();
              const propertyBookings = bookings.filter(b => String(b.property?._id) === String(propertyForCalendar));
              const hasBookingOn = (d) => {
                return propertyBookings.some(b => {
                  const ci = new Date(b.checkIn);
                  const co = new Date(b.checkOut);
                  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
                  return day >= new Date(ci.getFullYear(), ci.getMonth(), ci.getDate()) && day < new Date(co.getFullYear(), co.getMonth(), co.getDate());
                });
              };
              const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

              const buildMonthMatrix = (y, m) => {
                const first = new Date(y, m, 1);
                const last = new Date(y, m + 1, 0);
                const offset = first.getDay();
                const days = [];
                for (let i = 0; i < offset; i++) days.push(null);
                for (let d = 1; d <= last.getDate(); d++) days.push(new Date(y, m, d));
                return days;
              };

              return (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setFilters(prev => ({ ...prev, year: prev.year - 1 }))}
                        className="px-2 py-1 text-xs rounded border border-[#e0d5c7] bg-white hover:bg-[#f5ede1]"
                      >
                        ◀ {year - 1}
                      </button>
                      <div className="px-3 py-1.5 rounded-full bg-[#f5ede1] text-[#4b2a00] text-sm font-semibold">
                        {year}
                      </div>
                      <button
                        type="button"
                        onClick={() => setFilters(prev => ({ ...prev, year: prev.year + 1 }))}
                        className="px-2 py-1 text-xs rounded border border-[#e0d5c7] bg-white hover:bg-[#f5ede1]"
                      >
                        {year + 1} ▶
                      </button>
                    </div>
                    <div className="hidden sm:flex items-center gap-3 text-[11px] text-gray-600">
                      <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-[#e9f7ec] border border-[#b7dfc5]"></span> Bookable</span>
                      <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-[#fdeeee] border border-[#f5b5b5]"></span> Has bookings</span>
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    {monthNames.map((name, idx) => {
                      const cells = buildMonthMatrix(year, idx);
                      return (
                        <div key={name} className="border border-[#e0d5c7] rounded-xl bg-white overflow-hidden">
                          <div className="px-3 py-2 bg-[#fdf7f0] text-[#4b2a00] text-sm font-semibold border-b border-[#e0d5c7] flex items-center justify-between">
                            <span>{name}</span>
                          </div>
                          <div className="grid grid-cols-7 text-[10px] text-gray-500 px-2 pt-2">
                            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                              <div key={d} className="text-center pb-1">{d}</div>
                            ))}
                          </div>
                          <div className="grid grid-cols-7 text-[10px] px-2 pb-2 gap-y-1">
                            {cells.map((d, i) => {
                              if (!d) return <div key={i} />;
                              const booked = hasBookingOn(d);
                              const baseClasses = 'h-6 flex items-center justify-center rounded-sm border text-[10px]';
                              const cls = booked
                                ? 'bg-[#fdeeee] border-[#f5b5b5] text-[#7a1f1f]'
                                : 'bg-[#e9f7ec] border-[#b7dfc5] text-[#245430]';
                              return (
                                <div key={i} className={`${baseClasses} ${cls}`}>
                                  {d.getDate()}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {activeTab === 'reservations' && (
        <div className="space-y-6 max-w-7xl mx-auto px-4 pb-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-[#4b2a00]">Reservations</h2>
              <p className="text-xs text-gray-600">
                View and manage all reservations for your selected property.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={filters.status}
                onChange={(e) => { setCurrentPage(1); setFilters(prev => ({ ...prev, status: e.target.value })); }}
                className="modern-input text-xs"
              >
                <option value="all">All statuses</option>
                <option value="confirmed">Confirmed</option>
                <option value="pending">Pending</option>
                <option value="unpaid">Unpaid</option>
                <option value="cancelled">Cancelled</option>
                <option value="ended">Ended</option>
              </select>
              <select
                value={filters.dateRange}
                onChange={(e) => { setCurrentPage(1); setFilters(prev => ({ ...prev, dateRange: e.target.value })); }}
                className="modern-input text-xs"
              >
                <option value="all">All dates</option>
                <option value="upcoming">Upcoming</option>
                <option value="checked-in">Checked in</option>
                <option value="checked-out">Checked out</option>
              </select>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => { setCurrentPage(1); setFilters(prev => ({ ...prev, search: e.target.value })); }}
                placeholder="Search by guest name"
                className="modern-input text-xs w-40"
              />
            </div>
          </div>

          <div className="neu-card p-4 rounded-2xl border border-[#e0d5c7] bg-white overflow-x-auto">
            <table className="min-w-full divide-y divide-[#eee0cf] text-xs">
              <thead className="bg-[#fdf7f0] text-[#4b2a00]">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Guest</th>
                  <th className="px-3 py-2 text-left font-semibold">Property</th>
                  <th className="px-3 py-2 text-left font-semibold">Dates</th>
                  <th className="px-3 py-2 text-center font-semibold">Guests</th>
                  <th className="px-3 py-2 text-right font-semibold">Total</th>
                  <th className="px-3 py-2 text-left font-semibold">Status</th>
                  <th className="px-3 py-2 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-[#f1e2d3]">
                {currentBookings.map((b) => (
                  <tr key={b._id} className="hover:bg-[#fff7ef] transition-colors">
                    <td className="px-3 py-2 align-top">
                      <div className="text-[11px] font-semibold text-[#4b2a00]">
                        {`${b.guest?.firstName || ''} ${b.guest?.lastName || ''}`.trim() || b.guest?.email || 'Guest'}
                      </div>
                      <div className="text-[10px] text-gray-500">{b.guest?.email}</div>
                      <div className="text-[10px] text-gray-500">{b.guest?.phone}</div>
                    </td>
                    <td className="px-3 py-2 align-top text-[11px] text-[#4b2a00]">
                      <div className="font-medium">{b.property?.title || b.property?.name || 'Property'}</div>
                      <div className="text-[10px] text-gray-500">{b.property?.city || b.property?.address}</div>
                    </td>
                    <td className="px-3 py-2 align-top text-[11px] text-[#4b2a00]">
                      <div>{b.checkIn} → {b.checkOut}</div>
                    </td>
                    <td className="px-3 py-2 align-top text-center text-[11px] text-[#4b2a00]">
                      {b.numberOfGuests || b.guests || 1}
                    </td>
                    <td className="px-3 py-2 align-top text-right text-[11px] font-semibold text-[#4b2a00]">
                      {formatCurrencyRWF
                        ? formatCurrencyRWF(b.totalAmount || 0)
                        : `RWF ${(b.totalAmount || 0).toLocaleString()}`}
                    </td>
                    <td className="px-3 py-2 align-top text-[11px]">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-medium ${
                        (b.paymentStatus || b.status) === 'paid'
                          ? 'bg-green-50 text-green-800 border border-green-200'
                          : (b.paymentStatus || b.status) === 'pending'
                            ? 'bg-yellow-50 text-yellow-800 border border-yellow-200'
                            : (b.status === 'cancelled'
                              ? 'bg-red-50 text-red-800 border border-red-200'
                              : 'bg-gray-50 text-gray-700 border border-gray-200')
                      }`}>
                        {b.paymentStatus || b.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 align-top text-right text-[11px] space-x-1 whitespace-nowrap">
                      <button
                        onClick={() => handleViewDetails(b)}
                        className="inline-flex items-center px-2 py-1 rounded border border-gray-200 hover:bg-gray-50"
                      >
                        <FaEye className="mr-1" />
                        Details
                      </button>
                      <button
                        onClick={() => handleViewReceipt(b)}
                        className="inline-flex items-center px-2 py-1 rounded border border-green-200 text-green-700 hover:bg-green-50"
                      >
                        <FaFileInvoice className="mr-1" />
                        Receipt
                      </button>
                      {(b.paymentMethod === 'cash' || !b.paymentMethod) && b.paymentStatus !== 'paid' && (
                        <button
                          onClick={() => handleMarkPaid(b)}
                          className="inline-flex items-center px-2 py-1 rounded border border-blue-200 text-blue-700 hover:bg-blue-50"
                        >
                          <FaCheck className="mr-1" />
                          Mark as paid
                        </button>
                      )}
                      {b.isDirect && (
                        <button
                          onClick={() => openEditDirectModal(b)}
                          className="inline-flex items-center px-2 py-1 rounded border border-blue-200 text-blue-700 hover:bg-blue-50"
                        >
                          <FaEdit className="mr-1" />
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {currentBookings.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-sm text-[#8a745e]">
                      No reservations match your current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between text-xs text-gray-600">
              <span>
                Page {currentPage} of {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => paginate(Math.max(1, currentPage - 1))}
                  className="px-3 py-1 rounded border disabled:opacity-50"
                >
                  Prev
                </button>
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => paginate(Math.min(totalPages, currentPage + 1))}
                  className="px-3 py-1 rounded border disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'finance' && (
        <div className="space-y-8">
          {financeView === 'expenses' ? (
            <FinancePanel propertyOptions={properties} activeSection="expenses" />
          ) : (
            <>
              {/* Finance View Tabs */}
              <div className="flex space-x-2 border-b border-gray-200 mb-6">
                {['overview', 'invoices', 'statement'].map((view) => (
                  <button
                    key={view}
                    onClick={() => setFinanceView(view)}
                    className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${financeView === view
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                  >
                    {view === 'overview' ? 'Financial Overview' : view === 'invoices' ? 'Invoices' : 'Reservations Statement'}
                  </button>
                ))}
              </div>

              {financeView === 'overview' && (
                <div className="neu-card p-6 rounded-2xl border border-[#e0d5c7] bg-white">
                  <h2 className="text-xl font-semibold mb-6 text-[#4b2a00]">Financial overview</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="rounded-2xl border border-[#e0d5c7] bg-[#fdf7f0] p-5 flex flex-col justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-[#6b5744] mb-1 uppercase tracking-wide">Total revenue</h3>
                        <div className="text-2xl md:text-3xl font-bold text-[#4b2a00]">{formatCurrencyRWF ? formatCurrencyRWF(stats.totalRevenue) : `RWF ${stats.totalRevenue.toLocaleString()}`}</div>
                      </div>
                      <p className="text-xs text-[#8a745e] mt-2">All-time earnings across all properties.</p>
                    </div>
                    <div className="rounded-2xl border border-[#e0d5c7] bg-[#fdf7f0] p-5 flex flex-col justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-[#6b5744] mb-1 uppercase tracking-wide">Pending revenue</h3>
                        <div className="text-2xl md:text-3xl font-bold text-[#4b2a00]">{formatCurrencyRWF ? formatCurrencyRWF(stats.pendingRevenue) : `RWF ${stats.pendingRevenue.toLocaleString()}`}</div>
                      </div>
                      <p className="text-xs text-[#8a745e] mt-2">Awaiting payout from upcoming and in-house stays.</p>
                    </div>
                    <div className="rounded-2xl border border-[#e0d5c7] bg-[#fdf7f0] p-5 flex flex-col justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-[#6b5744] mb-1 uppercase tracking-wide">Commission paid</h3>
                        <div className="text-2xl md:text-3xl font-bold text-[#4b2a00]">{formatCurrencyRWF ? formatCurrencyRWF(Math.round(stats.totalRevenue * 0.1)) : `RWF ${Math.round(stats.totalRevenue * 0.1).toLocaleString()}`}</div>
                      </div>
                      <p className="text-xs text-[#8a745e] mt-2">Estimated platform fees based on your total revenue.</p>
                    </div>
                  </div>
                </div>
              )}

              {financeView === 'invoices' && (
                <div className="neu-card p-6">
                  <h2 className="text-xl font-semibold mb-6">Invoices</h2>
                  <div className="space-y-4">
                    {(() => {
                      const rows = financeFiltered || [];
                      const totalPages = Math.max(1, Math.ceil(rows.length / financePerPage));
                      const page = Math.min(financePage, totalPages);
                      const start = (page - 1) * financePerPage;
                      const pageRows = rows.slice(start, start + financePerPage);
                      return (
                        <>
                          {pageRows.map((booking) => (
                            <div key={booking._id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                              <div className="flex justify-between items-start">
                                <div>
                                  <div className="font-semibold text-gray-900">Invoice #{booking.confirmationCode || booking._id.slice(-8)}</div>
                                  <div className="text-sm text-gray-600">{booking.property?.title || 'Property'}</div>
                                  <div className="text-sm text-gray-500">{new Date(booking.createdAt).toLocaleDateString()}</div>
                                </div>
                                <div className="text-right">
                                  <div className="text-lg font-bold text-gray-900">{formatCurrencyRWF ? formatCurrencyRWF(booking.totalAmount || 0) : `RWF ${(booking.totalAmount || 0).toLocaleString()}`}</div>
                                  <span className={`inline-block px-2 py-1 text-xs rounded-full ${booking.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' :
                                    booking.paymentStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                      'bg-red-100 text-red-800'
                                    }`}>
                                    {booking.paymentStatus || booking.status}
                                  </span>
                                </div>
                              </div>
                              <div className="mt-3 flex space-x-2">
                                <button
                                  onClick={() => openInvoicePdf(booking._id)}
                                  className="text-sm text-blue-600 hover:text-blue-800"
                                >
                                  View Invoice
                                </button>
                                <button
                                  onClick={() => openReceiptPdf(booking._id)}
                                  className="text-sm text-green-600 hover:text-green-800"
                                >
                                  View Receipt
                                </button>
                              </div>
                            </div>
                          ))}
                          {pageRows.length === 0 && (
                            <div className="text-center py-12 text-gray-500">No invoices found</div>
                          )}
                          <div className="flex items-center justify-between pt-2">
                            <div className="text-sm text-gray-500">Page {page} of {totalPages}</div>
                            <div className="flex gap-2">
                              <button disabled={page <= 1} onClick={() => setFinancePage(p => Math.max(1, p - 1))} className="px-3 py-1 rounded border disabled:opacity-50">Prev</button>
                              <button disabled={page >= totalPages} onClick={() => setFinancePage(p => Math.min(totalPages, p + 1))} className="px-3 py-1 rounded border disabled:opacity-50">Next</button>
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}

              {financeView === 'statement' && (
                <div className="neu-card p-6">
                  <h2 className="text-xl font-semibold mb-6">Reservations Statement</h2>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Booking ID</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Property</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Guest</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Commission</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Net</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {(() => {
                          const rows = financeFiltered || [];
                          const totalPages = Math.max(1, Math.ceil(rows.length / financePerPage));
                          const page = Math.min(financePage, totalPages);
                          const start = (page - 1) * financePerPage;
                          const pageRows = rows.slice(start, start + financePerPage);
                          return pageRows.map((booking) => {
                            const commission = Math.round((booking.totalAmount || 0) * 0.1);
                            const net = (booking.totalAmount || 0) - commission;
                            return (
                              <tr key={booking._id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-sm">{new Date(booking.createdAt).toLocaleDateString()}</td>
                                <td className="px-4 py-3 text-sm font-medium">{booking.confirmationCode || booking._id.slice(-8)}</td>
                                <td className="px-4 py-3 text-sm">{booking.property?.title || 'Property'}</td>
                                <td className="px-4 py-3 text-sm">{`${booking.guest?.firstName || ''} ${booking.guest?.lastName || ''}`.trim() || 'Guest'}</td>
                                <td className="px-4 py-3 text-sm text-right font-semibold">RWF {(booking.totalAmount || 0).toLocaleString()}</td>
                                <td className="px-4 py-3 text-sm text-right text-red-600">-RWF {commission.toLocaleString()}</td>
                                <td className="px-4 py-3 text-sm text-right font-bold text-green-600">RWF {net.toLocaleString()}</td>
                                <td className="px-4 py-3 text-sm">
                                  <span className={`inline-block px-2 py-1 text-xs rounded-full ${booking.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' :
                                    booking.paymentStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                      'bg-red-100 text-red-800'
                                    }`}>
                                    {booking.paymentStatus || booking.status}
                                  </span>
                                </td>
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                    {(!financeFiltered || financeFiltered.length === 0) && (
                      <div className="text-center py-12 text-gray-500">No transactions found</div>
                    )}
                    {financeFiltered && financeFiltered.length > 0 && (
                      <div className="flex items-center justify-between pt-2">
                        <div className="text-sm text-gray-500">Page {financePage} of {Math.max(1, Math.ceil(financeFiltered.length / financePerPage))}</div>
                        <div className="flex gap-2">
                          <button disabled={financePage <= 1} onClick={() => setFinancePage(p => Math.max(1, p - 1))} className="px-3 py-1 rounded border disabled:opacity-50">Prev</button>
                          <button disabled={financePage >= Math.ceil(financeFiltered.length / financePerPage)} onClick={() => setFinancePage(p => Math.min(Math.ceil(financeFiltered.length / financePerPage), p + 1))} className="px-3 py-1 rounded border disabled:opacity-50">Next</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="space-y-8">
          <div className="neu-card p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
              <h2 className="text-xl font-semibold">
                {analyticsView === 'dashboard' && 'Performance Analytics'}
                {analyticsView === 'demand' && 'Demand for Location'}
                {analyticsView === 'pace' && 'Your Pace of Bookings'}
                {analyticsView === 'sales' && 'Sales Reporting & Analytics'}
                {analyticsView === 'reports' && 'Reports'}
                {analyticsView === 'comparison' && 'Direct vs Online Booking Comparison'}
                {analyticsView === 'occupancy' && 'Occupancy & Revenue per Room'}
                {analyticsView === 'tax' && 'Tax Liability Tracking'}
                {analyticsView === 'booker' && 'Booker Insights'}
                {analyticsView === 'bookwindow' && 'Booking Window Information'}
                {analyticsView === 'cancellation' && 'Cancellation Characteristics'}
                {analyticsView === 'competitive' && 'Competitive Set'}
                {analyticsView === 'genius' && 'Genius Report'}
                {analyticsView === 'ranking' && 'Ranking Dashboard'}
                {analyticsView === 'performance' && 'Performance Dashboard'}
              </h2>
              {analyticsView === 'sales' && (
                <div className="flex items-center gap-3">
                  <select value={salesPeriod} onChange={(e) => { setSalesPeriod(e.target.value); setSalesPage(1); }} className="border rounded-lg px-3 py-2">
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                  <button onClick={() => {
                    const rows = computeSalesBuckets(bookings, salesPeriod);
                    exportSalesCSV(rows);
                  }} className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm">Export CSV</button>
                  <button onClick={() => window.print()} className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm">Export PDF</button>
                </div>
              )}
            </div>

            {/* Removed duplicate analytics KPI cards so summary cards only appear on main dashboard tab */}

            {analyticsView === 'demand' && (
              <div className="space-y-4">
                <p className="text-gray-600">Analyze demand trends for your location and property type.</p>
                <div className="bg-[#fdf7f0] p-6 rounded-lg border border-[#e0d5c7]">
                  <h4 className="font-semibold mb-3 text-[#4b2a00]">Location Demand Index</h4>
                  <div className="text-3xl font-bold text-[#a06b42] mb-2">High</div>
                  <p className="text-sm text-[#6b5744]">Your location is experiencing high demand this season</p>
                </div>
              </div>
            )}

            {analyticsView === 'pace' && (
              <div className="space-y-4">
                <p className="text-gray-600">Track how quickly your properties are getting booked.</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Avg Days to Book</p>
                    <p className="text-2xl font-bold text-green-600">12 days</p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Booking Velocity</p>
                    <p className="text-2xl font-bold text-purple-600">Fast</p>
                  </div>
                </div>
              </div>
            )}

            {analyticsView === 'sales' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Total Revenue</p>
                    <p className="text-xl font-bold">RWF {stats.totalRevenue?.toLocaleString()}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Avg Booking Value</p>
                    <p className="text-xl font-bold">RWF {Math.round(stats.totalRevenue / Math.max(1, stats.total)).toLocaleString()}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Bookings (Direct)</p>
                    <p className="text-xl font-bold">{bookings.filter(b => b.isDirect).length}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Bookings (Online)</p>
                    <p className="text-xl font-bold">{bookings.filter(b => !b.isDirect).length}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-[#fdf7f0] p-4 rounded-lg border border-[#e0d5c7]">
                    <p className="text-sm text-[#6b5744]">RevPAR (avg)</p>
                    <p className="text-2xl font-bold text-[#a06b42]">RWF {Number(analyticsData?.totals?.revparAvg || 0).toLocaleString()}</p>
                  </div>
                  <div className="bg-[#fdf7f0] p-4 rounded-lg border border-[#e0d5c7]">
                    <p className="text-sm text-[#6b5744]">ADR (avg)</p>
                    <p className="text-2xl font-bold text-[#a06b42]">RWF {Number(analyticsData?.totals?.adrAvg || 0).toLocaleString()}</p>
                  </div>
                  <div className="bg-[#fdf7f0] p-4 rounded-lg border border-[#e0d5c7]">
                    <p className="text-sm text-[#6b5744]">Occupancy (avg)</p>
                    <p className="text-2xl font-bold text-[#a06b42]">{Number(analyticsData?.totals?.occupancyAvg || 0)}%</p>
                  </div>
                </div>

                <div className="neu-card p-4">
                  <h3 className="font-semibold mb-3">Revenue by {salesPeriod}</h3>
                  {(() => {
                    const initial = (filters.property && filters.property !== 'all')
                      ? bookings.filter(b => String(b.property?._id || b.property) === String(filters.property))
                      : bookings;
                    const source = (initial.length === 0 && filters.property && filters.property !== 'all') ? bookings : initial;
                    const rows = computeSalesBuckets(source, salesPeriod);
                    const totalPages = Math.max(1, Math.ceil(rows.length / salesPerPage));
                    const page = Math.min(salesPage, totalPages);
                    const start = (page - 1) * salesPerPage;
                    const pageRows = rows.slice(start, start + salesPerPage);
                    return (
                      <div className="space-y-3">
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Revenue</th>
                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Tax</th>
                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Count</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                              {pageRows.map(r => (
                                <tr key={r.period} className="hover:bg-gray-50">
                                  <td className="px-4 py-2 text-sm">{r.period}</td>
                                  <td className="px-4 py-2 text-sm text-right">RWF {Number(r.revenue).toLocaleString()}</td>
                                  <td className="px-4 py-2 text-sm text-right">RWF {Number(r.tax).toLocaleString()}</td>
                                  <td className="px-4 py-2 text-sm text-right">{r.count}</td>
                                </tr>
                              ))}
                              {pageRows.length === 0 && (
                                <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-500">No data</td></tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-gray-500">Page {page} of {totalPages}</div>
                          <div className="flex gap-2">
                            <button disabled={page <= 1} onClick={() => setSalesPage(p => Math.max(1, p - 1))} className="px-3 py-1 rounded border disabled:opacity-50">Prev</button>
                            <button disabled={page >= totalPages} onClick={() => setSalesPage(p => Math.min(totalPages, p + 1))} className="px-3 py-1 rounded border disabled:opacity-50">Next</button>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div className="neu-card p-4">
                  <h3 className="font-semibold mb-2">Direct vs Online Comparison</h3>
                  {(() => {
                    const direct = bookings.filter(b => b.isDirect);
                    const online = bookings.filter(b => !b.isDirect);
                    const dRev = direct.reduce((s, b) => s + Number(b.totalAmount || 0), 0);
                    const oRev = online.reduce((s, b) => s + Number(b.totalAmount || 0), 0);
                    return (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-[#fdf7f0] p-4 rounded-lg border border-[#e0d5c7]">
                          <p className="text-sm text-[#6b5744]">Direct Revenue</p>
                          <p className="text-xl font-bold text-[#a06b42]">RWF {dRev.toLocaleString()}</p>
                        </div>
                        <div className="bg-[#fdf7f0] p-4 rounded-lg border border-[#e0d5c7]">
                          <p className="text-sm text-[#6b5744]">Online Revenue</p>
                          <p className="text-xl font-bold text-[#a06b42]">RWF {oRev.toLocaleString()}</p>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div className="neu-card p-4">
                  <h3 className="font-semibold mb-2">Tax Liability Tracking</h3>
                  {(() => {
                    const list = bookings;
                    const tax = list.reduce((s, b) => s + Number(b.taxAmount || 0), 0);
                    return <div className="text-gray-800">Estimated Taxes: <span className="font-semibold">RWF {tax.toLocaleString()}</span></div>;
                  })()}
                </div>
              </div>
            )}

            {analyticsView === 'reports' && (
              <div className="space-y-6">
                <div className="neu-card p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">Sales Reports</h3>
                    <div className="flex items-center gap-2">
                      <select value={reportsPeriod} onChange={(e) => { setReportsPeriod(e.target.value); setReportsPage(1); }} className="border rounded-lg px-3 py-2 text-sm">
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                      <button onClick={() => {
                        const initial = (filters.property && filters.property !== 'all')
                          ? bookings.filter(b => String(b.property?._id || b.property) === String(filters.property))
                          : bookings;
                        const source = (initial.length === 0 && filters.property && filters.property !== 'all') ? bookings : initial;
                        const rows = computeSalesBuckets(source, reportsPeriod);
                        exportSalesCSV(rows);
                      }} className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm">Export CSV</button>
                      <button onClick={() => window.print()} className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm">Export PDF</button>
                    </div>
                  </div>
                  {(() => {
                    const initial = (filters.property && filters.property !== 'all')
                      ? bookings.filter(b => String(b.property?._id || b.property) === String(filters.property))
                      : bookings;
                    const source = (initial.length === 0 && filters.property && filters.property !== 'all') ? bookings : initial;
                    const rows = computeSalesBuckets(source, reportsPeriod);
                    const totalPages = Math.max(1, Math.ceil(rows.length / reportsPerPage));
                    const page = Math.min(reportsPage, totalPages);
                    const start = (page - 1) * reportsPerPage;
                    const pageRows = rows.slice(start, start + reportsPerPage);
                    return (
                      <div className="space-y-3">
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Revenue</th>
                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Tax</th>
                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Count</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                              {pageRows.map(r => (
                                <tr key={r.period} className="hover:bg-gray-50">
                                  <td className="px-4 py-2 text-sm">{r.period}</td>
                                  <td className="px-4 py-2 text-sm text-right">RWF {Number(r.revenue).toLocaleString()}</td>
                                  <td className="px-4 py-2 text-sm text-right">RWF {Number(r.tax).toLocaleString()}</td>
                                  <td className="px-4 py-2 text-sm text-right">{r.count}</td>
                                </tr>
                              ))}
                              {pageRows.length === 0 && (<tr><td colSpan={4} className="px-4 py-6 text-center text-gray-500">No data</td></tr>)}
                            </tbody>
                          </table>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-gray-500">Page {page} of {totalPages}</div>
                          <div className="flex gap-2">
                            <button disabled={page <= 1} onClick={() => setReportsPage(p => Math.max(1, p - 1))} className="px-3 py-1 rounded border disabled:opacity-50">Prev</button>
                            <button disabled={page >= totalPages} onClick={() => setReportsPage(p => Math.min(totalPages, p + 1))} className="px-3 py-1 rounded border disabled:opacity-50">Next</button>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
                <div className="neu-card p-4">
                  <h3 className="font-semibold mb-3">Quick Links</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <button onClick={() => navigate('/dashboard?tab=finance&view=invoices')} className="px-4 py-3 rounded-lg bg-gray-100 hover:bg-gray-200 text-left">Invoices</button>
                    <button onClick={() => navigate('/dashboard?tab=finance&view=statement')} className="px-4 py-3 rounded-lg bg-gray-100 hover:bg-gray-200 text-left">Reservations Statement</button>
                  </div>
                </div>
              </div>
            )}

            {analyticsView === 'comparison' && (
              <div className="space-y-6">
                <div className="neu-card p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">Direct vs Online Comparison</h3>
                    <div className="flex gap-2">
                      <button onClick={() => {
                        const rows = [
                          { channel: 'Direct', revenue: bookings.filter(b => b.isDirect).reduce((s, b) => s + Number(b.totalAmount || 0), 0), count: bookings.filter(b => b.isDirect).length },
                          { channel: 'Online', revenue: bookings.filter(b => !b.isDirect).reduce((s, b) => s + Number(b.totalAmount || 0), 0), count: bookings.filter(b => !b.isDirect).length },
                        ];
                        const header = ['Channel', 'Revenue', 'Count'];
                        const lines = [header.join(',')].concat(rows.map(r => [r.channel, r.revenue, r.count].join(',')));
                        const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a'); a.href = url; a.download = 'comparison.csv'; a.click(); URL.revokeObjectURL(url);
                      }} className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm">Export CSV</button>
                      <button onClick={() => window.print()} className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm">Export PDF</button>
                    </div>
                  </div>
                  {(() => {
                    const direct = bookings.filter(b => b.isDirect);
                    const online = bookings.filter(b => !b.isDirect);
                    const dRev = direct.reduce((s, b) => s + Number(b.totalAmount || 0), 0);
                    const oRev = online.reduce((s, b) => s + Number(b.totalAmount || 0), 0);
                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-green-50 p-4 rounded-lg">
                          <p className="text-sm text-green-700">Direct Revenue</p>
                          <p className="text-xl font-bold text-green-800">RWF {dRev.toLocaleString()}</p>
                          <p className="text-sm text-green-700 mt-1">Bookings: {direct.length}</p>
                        </div>
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <p className="text-sm text-blue-700">Online Revenue</p>
                          <p className="text-xl font-bold text-blue-800">RWF {oRev.toLocaleString()}</p>
                          <p className="text-sm text-blue-700 mt-1">Bookings: {online.length}</p>
                        </div>
                      </div>
                    );
                  })()}
                </div>
                <div className="neu-card p-4">
                  {(() => {
                    const rows = bookings.map(b => ({
                      date: new Date(b.createdAt).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric' }),
                      channel: b.isDirect ? 'Direct' : 'Online',
                      amount: Number(b.totalAmount || 0)
                    }));
                    const totalPages = Math.max(1, Math.ceil(rows.length / compPerPage));
                    const page = Math.min(compPage, totalPages);
                    const start = (page - 1) * compPerPage;
                    const pageRows = rows.slice(start, start + compPerPage);
                    return (
                      <div className="space-y-3">
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Channel</th>
                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                              {pageRows.map((r, i) => (
                                <tr key={i} className="hover:bg-gray-50">
                                  <td className="px-4 py-2 text-sm">{r.date}</td>
                                  <td className="px-4 py-2 text-sm">{r.channel}</td>
                                  <td className="px-4 py-2 text-sm text-right">RWF {r.amount.toLocaleString()}</td>
                                </tr>
                              ))}
                              {pageRows.length === 0 && (<tr><td colSpan={3} className="px-4 py-6 text-center text-gray-500">No data</td></tr>)}
                            </tbody>
                          </table>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-gray-500">Page {page} of {totalPages}</div>
                          <div className="flex gap-2">
                            <button disabled={page <= 1} onClick={() => setCompPage(p => Math.max(1, p - 1))} className="px-3 py-1 rounded border disabled:opacity-50">Prev</button>
                            <button disabled={page >= totalPages} onClick={() => setCompPage(p => Math.min(totalPages, p + 1))} className="px-3 py-1 rounded border disabled:opacity-50">Next</button>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {analyticsView === 'occupancy' && (
              <div className="space-y-6">
                <div className="neu-card p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">Occupancy & Revenue per Room</h3>
                    <div className="flex gap-2">
                      <button onClick={() => {
                        const map = new Map();
                        bookings.forEach(b => {
                          const roomKey = (b.room?._id || b.room || 'unknown');
                          const roomName = b.room?.roomNumber || b.room?.roomType || b.roomNumber || 'Room';
                          const cur = map.get(roomKey) || { roomName, nights: 0, revenue: 0, count: 0 };
                          const s = new Date(b.checkIn); const e = new Date(b.checkOut); const n = Math.ceil((e - s) / (1000 * 60 * 60 * 24)) || 0;
                          cur.nights += Math.max(0, n); cur.revenue += Number(b.totalAmount || 0); cur.count += 1; map.set(roomKey, cur);
                        });
                        const rows = Array.from(map.values());
                        const header = ['Room', 'Nights', 'Bookings', 'Revenue'];
                        const lines = [header.join(',')].concat(rows.map(r => [r.roomName, r.nights, r.count, r.revenue].join(',')));
                        const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a'); a.href = url; a.download = 'occupancy_per_room.csv'; a.click(); URL.revokeObjectURL(url);
                      }} className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm">Export CSV</button>
                      <button onClick={() => window.print()} className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm">Export PDF</button>
                    </div>
                  </div>
                  {(() => {
                    const map = new Map();
                    bookings.forEach(b => {
                      const roomKey = (b.room?._id || b.room || 'unknown');
                      const roomName = b.room?.roomNumber || b.room?.roomType || b.roomNumber || 'Room';
                      const cur = map.get(roomKey) || { roomName, nights: 0, revenue: 0, count: 0 };
                      const nights = (() => { const s = new Date(b.checkIn); const e = new Date(b.checkOut); const n = Math.ceil((e - s) / (1000 * 60 * 60 * 24)); return isNaN(n) ? 0 : Math.max(0, n); })();
                      cur.nights += nights;
                      cur.revenue += Number(b.totalAmount || 0);
                      cur.count += 1;
                      map.set(roomKey, cur);
                    });
                    const rows = Array.from(map.values());
                    const totalPages = Math.max(1, Math.ceil(rows.length / occPerPage));
                    const page = Math.min(occPage, totalPages);
                    const start = (page - 1) * occPerPage;
                    const pageRows = rows.slice(start, start + occPerPage);
                    return (
                      <div className="space-y-3">
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Room</th>
                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Nights</th>
                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Bookings</th>
                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Revenue</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                              {pageRows.map((r, i) => (
                                <tr key={i} className="hover:bg-gray-50">
                                  <td className="px-4 py-2 text-sm">{r.roomName}</td>
                                  <td className="px-4 py-2 text-sm text-right">{r.nights}</td>
                                  <td className="px-4 py-2 text-sm text-right">{r.count}</td>
                                  <td className="px-4 py-2 text-sm text-right">RWF {Number(r.revenue).toLocaleString()}</td>
                                </tr>
                              ))}
                              {pageRows.length === 0 && (<tr><td colSpan={4} className="px-4 py-6 text-center text-gray-500">No data</td></tr>)}
                            </tbody>
                          </table>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-gray-500">Page {page} of {totalPages}</div>
                          <div className="flex gap-2">
                            <button disabled={page <= 1} onClick={() => setOccPage(p => Math.max(1, p - 1))} className="px-3 py-1 rounded border disabled:opacity-50">Prev</button>
                            <button disabled={page >= totalPages} onClick={() => setOccPage(p => Math.min(totalPages, p + 1))} className="px-3 py-1 rounded border disabled:opacity-50">Next</button>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {analyticsView === 'tax' && (
              <div className="space-y-6">
                <div className="neu-card p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">Tax Liability Tracking</h3>
                    <div className="flex gap-2">
                      <button onClick={() => {
                        const rows = bookings.map(b => ({ date: new Date(b.createdAt).toISOString().slice(0, 10), booking: b.confirmationCode || b._id, amount: Number(b.totalAmount || 0), tax: Number(b.taxAmount || 0) }));
                        const header = ['Date', 'Booking', 'Amount', 'Tax'];
                        const lines = [header.join(',')].concat(rows.map(r => [r.date, r.booking, r.amount, r.tax].join(',')));
                        const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a'); a.href = url; a.download = 'tax_liability.csv'; a.click(); URL.revokeObjectURL(url);
                      }} className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm">Export CSV</button>
                      <button onClick={() => window.print()} className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm">Export PDF</button>
                    </div>
                  </div>
                  {(() => {
                    const rows = bookings.map(b => ({ date: new Date(b.createdAt).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric' }), booking: b.confirmationCode || b._id, amount: Number(b.totalAmount || 0), tax: Number(b.taxAmount || 0) }));
                    const totalTax = rows.reduce((s, r) => s + r.tax, 0);
                    const totalPages = Math.max(1, Math.ceil(rows.length / taxPerPage));
                    const page = Math.min(taxPage, totalPages);
                    const start = (page - 1) * taxPerPage;
                    const pageRows = rows.slice(start, start + taxPerPage);
                    return (
                      <div className="space-y-3">
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Booking</th>
                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Tax</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                              {pageRows.map((r, i) => (
                                <tr key={i} className="hover:bg-gray-50">
                                  <td className="px-4 py-2 text-sm">{r.date}</td>
                                  <td className="px-4 py-2 text-sm">{r.booking}</td>
                                  <td className="px-4 py-2 text-sm text-right">RWF {r.amount.toLocaleString()}</td>
                                  <td className="px-4 py-2 text-sm text-right">RWF {r.tax.toLocaleString()}</td>
                                </tr>
                              ))}
                              {pageRows.length === 0 && (<tr><td colSpan={4} className="px-4 py-6 text-center text-gray-500">No data</td></tr>)}
                            </tbody>
                          </table>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-gray-700 font-medium">Total Tax: RWF {totalTax.toLocaleString()}</div>
                          <div className="flex gap-2">
                            <button disabled={page <= 1} onClick={() => setTaxPage(p => Math.max(1, p - 1))} className="px-3 py-1 rounded border disabled:opacity-50">Prev</button>
                            <button disabled={page >= totalPages} onClick={() => setTaxPage(p => Math.min(totalPages, p + 1))} className="px-3 py-1 rounded border disabled:opacity-50">Next</button>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {analyticsView === 'booker' && (
              <div className="space-y-4">
                <p className="text-gray-600">Understand who is booking your properties.</p>
                <div className="bg-indigo-50 p-6 rounded-lg">
                  <h4 className="font-semibold mb-3">Guest Demographics</h4>
                  <p className="text-sm text-gray-600">Most bookings from business travelers and families</p>
                </div>
              </div>
            )}

            {analyticsView === 'bookwindow' && (
              <div className="space-y-4">
                <p className="text-gray-600">Analyze how far in advance guests book.</p>
                <div className="bg-yellow-50 p-6 rounded-lg">
                  <h4 className="font-semibold mb-3">Average Booking Window</h4>
                  <p className="text-3xl font-bold text-yellow-600">21 days</p>
                  <p className="text-sm text-gray-600 mt-2">Guests typically book 3 weeks in advance</p>
                </div>
              </div>
            )}

            {analyticsView === 'cancellation' && (
              <div className="space-y-4">
                <p className="text-gray-600">Track cancellation patterns and reasons.</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-red-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Cancellation Rate</p>
                    <p className="text-2xl font-bold text-red-600">8%</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Completion Rate</p>
                    <p className="text-2xl font-bold text-green-600">92%</p>
                  </div>
                </div>
              </div>
            )}

            {analyticsView === 'competitive' && (
              <div className="space-y-4">
                <p className="text-gray-600">Compare your performance with similar properties.</p>
                <div className="bg-blue-50 p-6 rounded-lg">
                  <h4 className="font-semibold mb-3">Market Position</h4>
                  <p className="text-sm text-gray-600">Your properties rank in the top 25% for your area</p>
                </div>
              </div>
            )}

            {analyticsView === 'genius' && (
              <div className="space-y-4">
                <p className="text-gray-600">Performance metrics for Genius program participants.</p>
                <div className="bg-purple-50 p-6 rounded-lg">
                  <h4 className="font-semibold mb-3">Genius Status</h4>
                  <p className="text-sm text-gray-600">Not enrolled in Genius program</p>
                </div>
              </div>
            )}

            {analyticsView === 'ranking' && (
              <div className="space-y-4">
                <p className="text-gray-600">See how your property ranks in search results.</p>
                <div className="bg-green-50 p-6 rounded-lg">
                  <h4 className="font-semibold mb-3">Search Ranking</h4>
                  <p className="text-3xl font-bold text-green-600">#8</p>
                  <p className="text-sm text-gray-600 mt-2">Average position in search results</p>
                </div>
              </div>
            )}

            {analyticsView === 'performance' && (
              <div className="space-y-4">
                <p className="text-gray-600">Comprehensive performance overview.</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Performance Score</p>
                    <p className="text-2xl font-bold text-blue-600">8.5/10</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Guest Satisfaction</p>
                    <p className="text-2xl font-bold text-green-600">{stats.averageRating}/5</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'boost' && (
        <div className="space-y-8">
          <div className="neu-card p-6">
            <h2 className="text-xl font-semibold mb-6">
              {boostView === 'opportunity' && 'Opportunity Centre'}
              {boostView === 'commission-free' && 'Commission-free Bookings'}
              {boostView === 'genius' && 'Genius Partner Programme'}
              {boostView === 'preferred' && 'Preferred Partner Programme'}
              {boostView === 'long-stays' && 'Long Stays Toolkit'}
              {boostView === 'visibility' && 'Visibility Booster'}
              {boostView === 'work-friendly' && 'Work-Friendly Programme'}
              {boostView === 'unit-diff' && 'Unit Differentiation Tool'}
              {!boostView && 'Boost Performance'}
            </h2>

            {(!boostView || boostView === 'opportunity') && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-blue-50 rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow">
                  <div className="flex items-center mb-4">
                    <FaChartLine className="text-3xl text-blue-600 mr-3" />
                    <h3 className="text-lg font-semibold text-gray-900">Opportunity Centre</h3>
                  </div>
                  <p className="text-gray-600 mb-4">Discover ways to improve your property performance and increase bookings</p>
                  <div className="space-y-2">
                    <div className="p-3 bg-white rounded">
                      <p className="font-semibold text-sm">✓ Update your photos</p>
                      <p className="text-xs text-gray-600">Properties with recent photos get 30% more bookings</p>
                    </div>
                    <div className="p-3 bg-white rounded">
                      <p className="font-semibold text-sm">✓ Enable instant booking</p>
                      <p className="text-xs text-gray-600">Increase bookings by up to 40%</p>
                    </div>
                    <div className="p-3 bg-white rounded">
                      <p className="font-semibold text-sm">✓ Respond faster to inquiries</p>
                      <p className="text-xs text-gray-600">Aim for under 1 hour response time</p>
                    </div>
                  </div>
                </div>
                <div className="bg-green-50 rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow">
                  <div className="flex items-center mb-4">
                    <FaDollarSign className="text-3xl text-green-600 mr-3" />
                    <h3 className="text-lg font-semibold text-gray-900">Commission-free Bookings</h3>
                  </div>
                  <p className="text-gray-600 mb-4">Learn how to get direct bookings without platform commission</p>
                  <button onClick={() => navigate('/dashboard?tab=boost&view=commission-free')} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">
                    Learn More
                  </button>
                </div>
                <div className="bg-purple-50 rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow">
                  <div className="flex items-center mb-4">
                    <FaStar className="text-3xl text-purple-600 mr-3" />
                    <h3 className="text-lg font-semibold text-gray-900">Visibility Booster</h3>
                  </div>
                  <p className="text-gray-600 mb-4">Increase your property's visibility in search results</p>
                  <button onClick={() => navigate('/dashboard?tab=boost&view=visibility')} className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors">
                    Boost Visibility
                  </button>
                </div>
                <div className="bg-orange-50 rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow">
                  <div className="flex items-center mb-4">
                    <FaCalendarAlt className="text-3xl text-orange-600 mr-3" />
                    <h3 className="text-lg font-semibold text-gray-900">Long Stays Toolkit</h3>
                  </div>
                  <p className="text-gray-600 mb-4">Attract guests looking for extended stays</p>
                  <button onClick={() => navigate('/dashboard?tab=boost&view=long-stays')} className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors">
                    Enable Long Stays
                  </button>
                </div>
              </div>
            )}

            {boostView === 'commission-free' && (
              <div className="space-y-4">
                <p className="text-gray-600">Enable direct bookings to save on commission fees.</p>
                <div className="bg-green-50 p-6 rounded-lg">
                  <h4 className="font-semibold mb-3">Direct Booking Benefits</h4>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li>✓ Save up to 15% on commission fees</li>
                    <li>✓ Build direct relationships with guests</li>
                    <li>✓ Full control over pricing and policies</li>
                    <li>✓ Access to guest contact information</li>
                  </ul>
                  <button onClick={() => navigate('/owner/direct-booking')} className="mt-4 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700">
                    Set Up Direct Booking
                  </button>
                </div>
              </div>
            )}

            {boostView === 'genius' && (
              <div className="space-y-4">
                <p className="text-gray-600">Join the Genius programme to attract more bookings from loyal travelers.</p>
                <div className="bg-purple-50 p-6 rounded-lg">
                  <h4 className="font-semibold mb-3">Genius Programme Benefits</h4>
                  <p className="text-sm text-gray-600">Offer exclusive discounts to Genius members and increase your visibility</p>
                </div>
              </div>
            )}

            {boostView === 'preferred' && (
              <div className="space-y-4">
                <p className="text-gray-600">Become a Preferred Partner to unlock premium features and higher visibility.</p>
                <div className="bg-blue-50 p-6 rounded-lg">
                  <h4 className="font-semibold mb-3">Preferred Partner Status</h4>
                  <p className="text-sm text-gray-600">Get priority placement in search results and access to exclusive tools</p>
                </div>
              </div>
            )}

            {boostView === 'long-stays' && (
              <div className="space-y-4">
                <p className="text-gray-600">Optimize your property for guests looking for extended stays (28+ nights).</p>
                <div className="bg-orange-50 p-6 rounded-lg">
                  <h4 className="font-semibold mb-3">Long Stay Features</h4>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li>✓ Offer weekly and monthly discounts</li>
                    <li>✓ Highlight amenities for long-term guests</li>
                    <li>✓ Flexible check-in/out dates</li>
                    <li>✓ Workspace and kitchen facilities</li>
                  </ul>
                </div>
              </div>
            )}

            {boostView === 'visibility' && (
              <div className="space-y-4">
                <p className="text-gray-600">Increase your property's visibility in search results with these strategies.</p>
                <div className="bg-purple-50 p-6 rounded-lg">
                  <h4 className="font-semibold mb-3">Visibility Tips</h4>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li>✓ Maintain high response rates (90%+)</li>
                    <li>✓ Keep your calendar updated</li>
                    <li>✓ Earn positive reviews (4.5+ rating)</li>
                    <li>✓ Offer competitive pricing</li>
                    <li>✓ Enable instant booking</li>
                  </ul>
                </div>
              </div>
            )}

            {boostView === 'work-friendly' && (
              <div className="space-y-4">
                <p className="text-gray-600">Attract remote workers and business travelers with work-friendly amenities.</p>
                <div className="bg-indigo-50 p-6 rounded-lg">
                  <h4 className="font-semibold mb-3">Work-Friendly Checklist</h4>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li>✓ High-speed WiFi (50+ Mbps)</li>
                    <li>✓ Dedicated workspace with desk</li>
                    <li>✓ Comfortable office chair</li>
                    <li>✓ Good lighting</li>
                    <li>✓ Quiet environment</li>
                  </ul>
                </div>
              </div>
            )}

            {boostView === 'unit-diff' && (
              <div className="space-y-4">
                <p className="text-gray-600">Differentiate your units to appeal to different guest segments.</p>
                <div className="bg-teal-50 p-6 rounded-lg">
                  <h4 className="font-semibold mb-3">Unit Differentiation Strategy</h4>
                  <p className="text-sm text-gray-600">Create unique listings for different room types, amenities, and guest preferences</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'promotions' && (
        <div className="space-y-8">
          <div className="neu-card p-6">
            <h2 className="text-xl font-semibold mb-6">Promotions & Deals</h2>
            <div className="text-center py-12">
              <FaShoppingBag className="text-6xl text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Promotions</h3>
              <p className="text-gray-600 mb-6">Create your first promotion to boost bookings</p>
              <button className="bg-pink-600 text-white px-6 py-3 rounded-lg hover:bg-pink-700 transition-colors">
                Create Promotion
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'reviews' && (
        <div className="space-y-8">
          <div className="neu-card p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Guest Reviews</h2>
              <div className="flex items-center gap-2">
                <FaStar className="text-yellow-400" />
                <span className="text-2xl font-bold text-gray-900">{ownerAvgRating.toFixed(1)} / 10</span>
                <span className="text-gray-500">({ownerReviewCount} reviews)</span>
              </div>
            </div>
            {ownerReviews.length > 0 ? (
              <div className="space-y-4">
                {ownerReviews.map((review) => (
                  <div key={review._id} className="bg-white rounded-lg shadow-md p-5 hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {review.guest?.profilePicture ? (
                          <img
                            src={review.guest.profilePicture.startsWith('http') ? review.guest.profilePicture : `${API_URL}${review.guest.profilePicture}`}
                            alt={review.guest.fullName}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-lg font-semibold">
                            {(review.guest?.fullName || 'G').charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <h4 className="font-semibold text-gray-900">{review.guest?.fullName || 'Guest'}</h4>
                          <p className="text-sm text-gray-500">{new Date(review.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }, (_, i) => (
                          <FaStar
                            key={i}
                            className={i < review.rating ? 'text-yellow-400' : 'text-gray-300'}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-gray-700 leading-relaxed">{review.comment}</p>
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-sm text-gray-500">
                        <span className="font-medium">Property:</span> {review.property?.title || 'N/A'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <FaStar className="text-6xl text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Reviews Yet</h3>
                <p className="text-gray-600">Reviews from guests will appear here</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'messages' && (
        <div className="space-y-8">
          <div className="neu-card p-6">
            <h2 className="text-xl font-semibold mb-6">Messages</h2>
            <div className="text-center py-12">
              <FaComments className="text-6xl text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Messages</h3>
              <p className="text-gray-600">Guest messages will appear here</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'photos' && (
        <div className="space-y-8">
          <div className="neu-card p-6">
            <h2 className="text-xl font-semibold mb-6">Property Photos</h2>
            <div className="text-center py-12">
              <FaImages className="text-6xl text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Manage Photos</h3>
              <p className="text-gray-600">Upload and manage your property photos</p>
              <button className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors mt-4">
                Upload Photos
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="space-y-8">
          <div className="neu-card p-6">
            <h2 className="text-xl font-semibold mb-6">Property Settings</h2>
            <div className="text-center py-12">
              <FaCog className="text-6xl text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Property Configuration</h3>
              <p className="text-gray-600">Manage your property settings and preferences</p>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showBookingDetails && renderBookingDetails()}
      {showReceipt && renderReceipt()}
      {showSalesConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-xl">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Review booking before printing</h3>
                <p className="text-xs text-gray-500 mt-1">Check the key details below. When you confirm, the receipt preview will open and you can print from there.</p>
              </div>
              <button onClick={onCancelSalesConfirm} className="text-gray-500 hover:text-gray-700">
                <FaTimes />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {salesNewBooking && (
                <div className="text-sm text-gray-700 bg-gray-50 p-4 rounded-xl space-y-2">
                  <div className="flex justify-between gap-4">
                    <div>
                      <div className="text-[11px] uppercase tracking-wide text-gray-500">Property</div>
                      <div className="font-medium text-gray-900">{salesNewBooking.property?.title || salesNewBooking.property?.name || 'Property'}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[11px] uppercase tracking-wide text-gray-500">Booking ID</div>
                      <div className="font-mono text-xs">{salesNewBooking.confirmationCode || salesNewBooking._id}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs mt-2">
                    <div>
                      <div className="text-[11px] uppercase tracking-wide text-gray-500">Guest</div>
                      <div className="font-medium text-gray-900">{salesNewBooking.guest?.firstName || salesNewBooking.guest?.name || 'Guest'} {salesNewBooking.guest?.lastName || ''}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[11px] uppercase tracking-wide text-gray-500">Dates</div>
                      <div className="font-medium text-gray-900">
                        {salesNewBooking.checkIn ? new Date(salesNewBooking.checkIn).toLocaleDateString() : ''}
                        {' '}–{' '}
                        {salesNewBooking.checkOut ? new Date(salesNewBooking.checkOut).toLocaleDateString() : ''}
                      </div>
                      <div className="text-[11px] text-gray-500">{salesNewBooking.numberOfGuests || salesNewBooking.guests || 1} guests</div>
                    </div>
                  </div>
                  <div className="border-t border-dashed border-gray-200 pt-3 mt-2 flex items-center justify-between text-sm">
                    <div>
                      <div className="text-[11px] uppercase tracking-wide text-gray-500">Payment</div>
                      <div className="text-xs text-gray-700">
                        {salesNewBooking.paymentMethod || 'Cash'} · {salesNewBooking.paymentStatus || 'paid'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[11px] uppercase tracking-wide text-gray-500">Total</div>
                      <div className="text-base font-semibold text-gray-900">
                        {formatCurrencyRWF
                          ? formatCurrencyRWF(salesNewBooking.totalAmount || 0)
                          : `RWF ${(salesNewBooking.totalAmount || 0).toLocaleString()}`}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div className="flex items-center justify-end gap-3">
                <button onClick={onCancelSalesConfirm} className="px-5 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 text-sm">Cancel</button>
                <button onClick={onConfirmSalesAndPrint} className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium">Confirm &amp; open receipt</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDirectBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-2xl font-bold">New Direct Booking</h2>
              <button onClick={() => setShowDirectBooking(false)} className="text-gray-500 hover:text-gray-700">
                <FaTimes className="text-xl" />
              </button>
            </div>
            <div className="p-6">
              <form onSubmit={(e) => { e.preventDefault(); submitDirectBooking(); }} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Property</label>
                  <select
                    value={directForm.propertyId}
                    onChange={(e) => onSelectProperty(e.target.value)}
                    className="w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select property…</option>
                    {properties.map(p => (
                      <option key={p._id} value={p._id}>{p.title || p.name || 'Property'}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Room (optional)</label>
                    <select
                      value={directForm.roomId}
                      onChange={(e) => onDirectChange('roomId', e.target.value)}
                      className="w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Any room</option>
                      {ownerRooms.map(r => (
                        <option key={r._id} value={r._id}>
                          {[r.roomNumber || r.name || 'Room', r.roomType].filter(Boolean).join('  ')}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Check-in</label>
                    <input type="date" value={directForm.checkIn} onChange={e => onDirectChange('checkIn', e.target.value)} className="w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Check-out</label>
                    <input type="date" value={directForm.checkOut} onChange={e => onDirectChange('checkOut', e.target.value)} className="w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent" required />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Guests</label>
                    <input type="number" min={1} value={directForm.guests} onChange={e => onDirectChange('guests', Number(e.target.value) || 1)} className="w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                    <select value={directForm.paymentMethod} onChange={e => onDirectChange('paymentMethod', e.target.value)} className="w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                      <option value="cash">Cash</option>
                      <option value="mtn_mobile_money">Mobile Money</option>
                      <option value="credit_card">Credit Card</option>
                      <option value="bank_transfer">Bank Transfer</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Payment Status</label>
                    <div className="flex items-center gap-4 h-full">
                      <label className="inline-flex items-center gap-2 text-sm"><input type="radio" name="ownerpaystatus" checked={directForm.paymentStatusSelection === 'paid'} onChange={() => onDirectChange('paymentStatusSelection', 'paid')} />Paid</label>
                      <label className="inline-flex items-center gap-2 text-sm"><input type="radio" name="ownerpaystatus" checked={directForm.paymentStatusSelection === 'pending'} onChange={() => onDirectChange('paymentStatusSelection', 'pending')} />Pending</label>
                      <label className="inline-flex items-center gap-2 text-sm"><input type="radio" name="ownerpaystatus" checked={directForm.paymentStatusSelection === 'deposit'} onChange={() => onDirectChange('paymentStatusSelection', 'deposit')} />Deposit</label>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Guest Info</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input placeholder="First name" value={directForm.guestInfo.firstName} onChange={e => onDirectChange('guestInfo.firstName', e.target.value)} className="w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent" required />
                    <input placeholder="Last name" value={directForm.guestInfo.lastName} onChange={e => onDirectChange('guestInfo.lastName', e.target.value)} className="w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent" required />
                    <input type="email" placeholder="Email" value={directForm.guestInfo.email} onChange={e => onDirectChange('guestInfo.email', e.target.value)} className="w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                    <input type="tel" placeholder="Phone" value={directForm.guestInfo.phone} onChange={e => onDirectChange('guestInfo.phone', e.target.value)} className="w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                    <input placeholder="Nationality" value={directForm.guestInfo.nationality} onChange={e => onDirectChange('guestInfo.nationality', e.target.value)} className="w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                    <input placeholder="Passport" value={directForm.guestInfo.passport} onChange={e => onDirectChange('guestInfo.passport', e.target.value)} className="w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                    <input placeholder="Address" value={directForm.guestInfo.address} onChange={e => onDirectChange('guestInfo.address', e.target.value)} className="md:col-span-2 w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">A guest account will be linked or created automatically if necessary.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Info (for booking records)</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="email" placeholder="Contact email" value={directForm.contactInfo.email} onChange={e => onDirectChange('contactInfo.email', e.target.value)} className="w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                    <input type="tel" placeholder="Contact phone" value={directForm.contactInfo.phone} onChange={e => onDirectChange('contactInfo.phone', e.target.value)} className="w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Special Requests</label>
                  <textarea value={directForm.specialRequests} onChange={e => onDirectChange('specialRequests', e.target.value)} rows={3} className="w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Any special notes..."></textarea>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Information</label>
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <div className="text-sm text-gray-900 font-semibold mb-2">Payment Information</div>
                    <div className="text-sm text-gray-700 space-y-1">
                      <div>Room Rate: based on selected property, room and nights</div>
                      <div className="mt-2">Additional Services:</div>
                      {(ownerAddOns.length === 0) && (
                        <div className="text-xs text-gray-500">No add-on services configured for this property.</div>
                      )}
                      {ownerAddOns.map(addOn => {
                        const key = addOn.key;
                        const checked = !!(directForm.services && directForm.services[key]);
                        const price = Number(addOn.price || 0);
                        const scope = addOn.scope || 'per-booking';
                        const guestCount = Math.max(1, directForm.guests || 1);
                        const nightsCount = Math.max(1, ownerNights || 0);
                        let lineTotal = price;
                        let scopeLabel = 'per booking';
                        if (scope === 'per-night') {
                          lineTotal = price * nightsCount;
                          scopeLabel = `${price.toLocaleString()} × ${nightsCount} nights`;
                        } else if (scope === 'per-guest') {
                          lineTotal = price * guestCount;
                          scopeLabel = `${price.toLocaleString()} × ${guestCount} guests`;
                        } else {
                          scopeLabel = `${price.toLocaleString()} per booking`;
                        }

                        // Build included items summary from property-level configuration, if present
                        const included = addOn.includedItems && typeof addOn.includedItems === 'object'
                          ? Object.keys(addOn.includedItems)
                            .filter(k => addOn.includedItems[k])
                            .map(k => {
                              // Use the key but format it nicely if we don't have labels
                              return k
                                .replace(/_/g, ' ')
                                .replace(/\s+/g, ' ')
                                .trim()
                                .replace(/^(.)/, (m) => m.toUpperCase());
                            })
                          : [];

                        return (
                          <div key={key} className="space-y-0.5">
                            <label className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={e => {
                                  onDirectChange('services', { ...(directForm.services || {}), [key]: e.target.checked });
                                }}
                              />
                              <span>{addOn.name}</span>
                            </label>
                            {included.length > 0 && (
                              <div className="pl-6 text-xs text-gray-500">
                                Includes: {included.join(', ')}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      <div className="pt-2">Subtotal: calculated automatically</div>
                      <div>Hospitality levy (3%): calculated automatically</div>
                      <div className="font-semibold">TOTAL: calculated automatically</div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-3 border-t pt-4">
                  <button type="button" onClick={saveDirectDraft} className="px-5 py-3 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100">Save as Draft</button>
                  <button type="button" onClick={clearDirectForm} className="px-5 py-3 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100">Clear Form</button>
                  <button type="submit" className="px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium">Save & Print Receipt</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
export default PropertyOwnerBookings;
