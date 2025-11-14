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

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

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
    services: { breakfast: false, airportTransfer: false, laundry: false },
    specialRequests: ''
  });
  const [ownerRooms, setOwnerRooms] = useState([]);
  const [filters, setFilters] = useState({
    status: 'all',
    property: 'all',
    dateRange: 'all',
    year: new Date().getFullYear(),
    search: ''
  });
  const [ownerView, setOwnerView] = useState('table'); // 'table' | 'calendar'
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'dashboard');
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

  const openReceiptPdf = async (bookingId) => {
    try {
      const tryUrls = [
        `${API_URL}/api/bookings/${bookingId}/receipt?format=pdf`,
        `${API_URL}/api/bookings/${bookingId}/receipt`
      ];
      for (const url of tryUrls) {
        const res = await fetch(url, { credentials: 'include' });
        if (res.ok) {
          const ct = res.headers.get('content-type') || '';
          const blob = await res.blob();
          const blobType = ct && ct.includes('pdf') ? 'application/pdf' : blob.type;
          const pdfBlob = new Blob([blob], { type: blobType || 'application/pdf' });
          const objectUrl = URL.createObjectURL(pdfBlob);
          window.open(objectUrl, '_blank', 'noopener,noreferrer');
          // caller can manually print from viewer; do not auto-print
          return;
        }
      }
      // Fallback: open original route
      window.open(`${API_URL}/api/bookings/${bookingId}/receipt`, '_blank');
    } catch (_) {
      window.open(`${API_URL}/api/bookings/${bookingId}/receipt`, '_blank');
    }
  };

  const openInvoicePdf = async (bookingId) => {
    try {
      const tryUrls = [
        `${API_URL}/api/bookings/${bookingId}/invoice?format=pdf`,
        `${API_URL}/api/bookings/${bookingId}/invoice`
      ];
      for (const url of tryUrls) {
        const res = await fetch(url, { credentials: 'include' });
        if (res.ok) {
          const ct = res.headers.get('content-type') || '';
          const blob = await res.blob();
          const blobType = ct && ct.includes('pdf') ? 'application/pdf' : blob.type;
          const pdfBlob = new Blob([blob], { type: blobType || 'application/pdf' });
          const objectUrl = URL.createObjectURL(pdfBlob);
          window.open(objectUrl, '_blank', 'noopener,noreferrer');
          return;
        }
      }
      window.open(`${API_URL}/api/bookings/${bookingId}/invoice`, '_blank');
    } catch (_) {
      window.open(`${API_URL}/api/bookings/${bookingId}/invoice`, '_blank');
    }
  };

  // Removed mock data. We will fetch live data from the backend.

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (activeTab === 'reviews') {
      loadOwnerReviews();
    }
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [bookRes, propRes, occRes] = await Promise.all([
        fetch(`${API_URL}/api/bookings/property-owner`, { credentials: 'include' }),
        fetch(`${API_URL}/api/properties/my-properties`, { credentials: 'include' }),
        fetch(`${API_URL}/api/bookings/owner/visitors-analytics`, { credentials: 'include' })
      ]);
      const [bookJson, propJson, occJson] = await Promise.all([bookRes.json(), propRes.json(), occRes.json()]);
      if (bookRes.ok) setBookings(bookJson.bookings || []);
      if (propRes.ok) {
        const props = propJson.properties || [];
        setProperties(props);
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
        occupancyRate: Math.max(0, Math.min(100, Number(occJson?.kpis?.occupancyPercent || 0))),
        averageRating: 0
      });
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Sales confirmation flow before printing receipt
  const onConfirmSalesAndPrint = async () => {
    try {
      if (salesNewBooking) {
        // Ensure analytics tab is active to review
        setActiveTab('analytics');
        setAnalyticsView('sales');
        // Reflect immediately in UI without waiting network
        setBookings(prev => [salesNewBooking, ...prev]);
        // Refresh data in background
        loadData();
        // Open receipt PDF in a new tab
        openReceiptPdf(salesNewBooking._id);
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
        const res = await fetch(`${API_URL}/api/analytics/owner?${params.toString()}`, { credentials: 'include' });
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
    const dt = new Date(d); dt.setHours(0,0,0,0);
    if (period === 'monthly') return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}`;
    if (period === 'weekly') {
      const t = new Date(dt.getTime());
      const day = (t.getDay()+6)%7; // ISO week, Monday=0
      t.setDate(t.getDate()-day);
      const y = t.getFullYear();
      const first = new Date(y,0,1); const diff = Math.floor((t-first)/(24*3600*1000));
      const week = Math.floor((diff+first.getDay()+6)/7)+1;
      return `${y}-W${String(week).padStart(2,'0')}`;
    }
    return dt.toISOString().slice(0,10);
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
    return Array.from(map.values()).sort((a,b) => a.period.localeCompare(b.period));
  };

  const exportSalesCSV = (rows) => {
    const header = ['Period','Revenue','Tax','Count'];
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
    let total = 0;
    if (directForm.services?.breakfast) total += 15000 * Math.max(1, ownerNights);
    if (directForm.services?.airportTransfer) total += 0;
    if (directForm.services?.laundry) total += 0;
    return total;
  })();
  const ownerSubtotal = ownerRoomCharge + ownerServicesTotal;
  const ownerLevy3 = Math.round(ownerSubtotal * 0.03);
  const ownerVat18 = Math.round(ownerSubtotal * 0.18);
  const ownerGrandTotal = ownerSubtotal + ownerLevy3 + ownerVat18;

  const loadOwnerProperties = async () => {
    try {
      const res = await fetch(`${API_URL}/api/properties/my-properties`, { credentials: 'include' });
      const data = await res.json();
      if (res.ok) setProperties(data.properties || []);
    } catch (_) {}
  };

  const loadOwnerReviews = async () => {
    try {
      const res = await fetch(`${API_URL}/api/bookings/owner/reviews`, { credentials: 'include' });
      const data = await res.json();
      if (res.ok) {
        setOwnerReviews(data.reviews || []);
        setOwnerAvgRating(Number(data.avgRating || 0));
        setOwnerReviewCount(Number(data.count || 0));
      }
    } catch (_) {
      setOwnerReviews([]);
      setOwnerAvgRating(0);
      setOwnerReviewCount(0);
    }
  };

  useEffect(() => { loadOwnerProperties(); }, []);

  // Respond to navbar dropdown links like /my-bookings?tab=properties
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    const propParam = params.get('property');
    const scope = params.get('scope'); // reservations scope
    const fstatus = params.get('finance_status');
    const view = params.get('view');
    const range = params.get('range');

    // Normalize tab mapping to our internal tabs
    if (tab) {
      if (tab === 'bookings' || tab === 'reservations') {
        setActiveTab('reservations');
        // Expand reservations section
        setExpandedSections(prev => ({ ...prev, reservations: true }));
      } else if (tab === 'rates') {
        setActiveTab('dashboard');
        // Rates & Availability goes to dashboard
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

  const onSelectProperty = async (pid) => {
    onDirectChange('propertyId', pid);
    onDirectChange('roomId', '');
    setOwnerRooms([]);
    if (!pid) return;
    try {
      const res = await fetch(`${API_URL}/api/properties/${pid}`, { credentials: 'include' });
      const data = await res.json();
      if (res.ok) setOwnerRooms(data.property?.rooms || []);
    } catch (_) {}
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
        directBooking: true
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
        setSalesNewBooking(data.booking);
        setShowSalesConfirm(true); // require sales confirmation before printing
      }
    } catch (e) {
      toast.error(e.message);
    }
  };

  const saveDirectDraft = () => {
    try {
      localStorage.setItem('directBookingDraft', JSON.stringify(directForm));
      toast.success('Saved as draft');
    } catch (_) {}
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
      services: { breakfast: false, airportTransfer: false, laundry: false },
      specialRequests: ''
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
    setSelectedBooking(booking);
    setShowReceipt(true);
  };

  const handleStatusChange = async (bookingId, newStatus) => {
    try {
      // API call to update status
      setBookings(prev => prev.map(b => 
        b._id === bookingId ? { ...b, status: newStatus } : b
      ));
      toast.success('Status updated successfully');
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

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
        <span className={`px-3 py-1 rounded-full text-[11px] md:text-xs font-medium ${
          booking.status === 'paid' ? 'bg-green-100 text-green-800' :
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
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold">
                {((booking.guest?.firstName || booking.guest?.name || '').charAt(0) || (booking.guest?.email || 'U').charAt(0))}
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
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{t ? t('dashboard.financeHistory') : 'Finance History'}</h2>
          <div ref={calendarRef} className="neu-card p-0 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Booking</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Property</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {bookings.map(tr => (
                  <tr key={`fin-${tr._id}`} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">{new Date(tr.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm">{tr.confirmationCode || tr._id}</td>
                    <td className="px-4 py-3 text-sm">{tr.property?.title || tr.property?.name || 'Property'}</td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        {tr.guest?.avatar ? (
                          <img src={tr.guest.avatar.startsWith('http') ? tr.guest.avatar : `${API_URL}${tr.guest.avatar}`} alt={tr.guest?.firstName} className="w-6 h-6 rounded-full object-cover border" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-semibold">
                            {((tr.guest?.firstName || '').charAt(0) || (tr.guest?.email || 'U').charAt(0))}
                          </div>
                        )}
                        <span>{`${tr.guest?.firstName || ''} ${tr.guest?.lastName || ''}`.trim() || tr.guest?.email || 'Guest'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">{formatCurrencyRWF ? formatCurrencyRWF(tr.totalAmount || 0) : `RWF ${(tr.totalAmount || 0).toLocaleString()}`}</td>
                    <td className="px-4 py-3 text-sm">{tr.paymentMethod}</td>
                    <td className="px-4 py-3 text-sm">{tr.paymentStatus || tr.status}</td>
                  </tr>
                ))}
                {bookings.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-gray-500">{t ? t('dashboard.noFinanceHistory') : 'No finance history yet.'}</td>
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
          <FaComments />
        </button>
      </div>
    </div>
  );
  const renderBookingDetails = () => (
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

        {selectedBooking && (
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Guest Information */}
              <div className="modern-card p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <FaUser className="mr-2" />
                  Guest Information
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600">Name</p>
                    <p className="font-medium">{selectedBooking.guest.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="font-medium">{selectedBooking.guest.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Phone</p>
                    <p className="font-medium">{selectedBooking.guest.phone}</p>
                  </div>
                  <div className="flex space-x-2 mt-4">
                    <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center">
                      <FaEnvelope className="mr-2" />
                      Email
                    </button>
                    <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center">
                      <FaPhone className="mr-2" />
                      Call
                    </button>
                  </div>
                </div>
              </div>

              {/* Booking Information */}
              <div className="modern-card p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <FaCalendarAlt className="mr-2" />
                  Booking Information
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600">Property</p>
                    <p className="font-medium">{selectedBooking.property.name}</p>
                    <p className="text-sm text-gray-500">{selectedBooking.property.location}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Check-in</p>
                      <p className="font-medium">{selectedBooking.checkIn}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Check-out</p>
                      <p className="font-medium">{selectedBooking.checkOut}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Guests</p>
                    <p className="font-medium">{selectedBooking.guests} guests</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">{t ? t('dashboard.totalAmount') : 'Total Amount'}</p>
                    <p className="text-xl font-bold text-blue-600">{formatCurrencyRWF ? formatCurrencyRWF(selectedBooking.totalAmount || 0) : `RWF ${selectedBooking.totalAmount.toLocaleString()}`}</p>
                  </div>
                </div>
              </div>

              {/* Special Requests */}
              {selectedBooking.specialRequests && (
                <div className="modern-card p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <FaComments className="mr-2" />
                    Special Requests
                  </h3>
                  <p className="text-gray-700">{selectedBooking.specialRequests}</p>
                </div>
              )}


              {/* Review */}
              {selectedBooking.review && (
                <div className="modern-card p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <FaStar className="mr-2" />
                    Guest Review
                  </h3>
                  <div className="flex items-center mb-2">
                    <FaStar className="text-yellow-400 mr-1" />
                    <span className="font-medium">{selectedBooking.rating}</span>
                  </div>
                  <p className="text-gray-700">{selectedBooking.review}</p>
                </div>
              )}

              {/* Actions */}
              <div className="modern-card p-6">
                <h3 className="text-lg font-semibold mb-4">{t ? t('dashboard.actions') : 'Actions'}</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => handleStatusChange(selectedBooking._id, 'paid')}
                    className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center"
                  >
                    <FaCheck className="mr-2" />
                    {t ? t('dashboard.markAsPaid') : 'Mark as Paid'}
                  </button>
                  <button
                    onClick={() => handleStatusChange(selectedBooking._id, 'pending')}
                    className="w-full bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors flex items-center justify-center"
                  >
                    <FaClock className="mr-2" />
                    {t ? t('dashboard.markAsPending') : 'Mark as Pending'}
                  </button>
                  <button
                    onClick={() => navigate(`/messages?booking=${selectedBooking._id}`)}
                    className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
                  >
                    <FaComments className="mr-2" />
                    {t ? t('dashboard.sendMessage') : 'Send Message'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderReceipt = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">{t ? t('dashboard.bookingReceipt') : 'Booking Receipt'}</h2>
            <button
              onClick={() => setShowReceipt(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <FaTimes className="text-xl" />
            </button>
          </div>
        </div>

        {selectedBooking && (
          <div className="p-6">
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold">AKWANDA.rw</h3>
              <p className="text-gray-600">{t ? t('dashboard.bookingReceipt') : 'Booking Receipt'}</p>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between">
                <span>Booking ID:</span>
                <span className="font-medium">{selectedBooking._id}</span>
              </div>
              <div className="flex justify-between">
                <span>Property:</span>
                <span className="font-medium">{selectedBooking.property.name}</span>
              </div>
              <div className="flex justify-between">
                <span>Guest:</span>
                <span className="font-medium">{selectedBooking.guest.name}</span>
              </div>
              <div className="flex justify-between">
                <span>Check-in:</span>
                <span className="font-medium">{selectedBooking.checkIn}</span>
              </div>
              <div className="flex justify-between">
                <span>Check-out:</span>
                <span className="font-medium">{selectedBooking.checkOut}</span>
              </div>
              <div className="flex justify-between">
                <span>Guests:</span>
                <span className="font-medium">{selectedBooking.guests}</span>
              </div>
              <hr />
              <div className="flex justify-between text-lg font-bold">
                <span>{t ? t('dashboard.totalAmount') : 'Total Amount'}:</span>
                <span className="text-blue-600">{formatCurrencyRWF ? formatCurrencyRWF(selectedBooking.totalAmount || 0) : `RWF ${selectedBooking.totalAmount.toLocaleString()}`}</span>
              </div>
            </div>

            <div className="mt-6 flex space-x-4">
              <button
                onClick={() => window.print()}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                {t ? t('dashboard.printReceipt') : 'Print Receipt'}
              </button>
              <button
                onClick={() => setShowReceipt(false)}
                className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                {t ? t('dashboard.close') : 'Close'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Navigation items with dropdowns - COMPLETE LIST matching mobile menu (60+ sub-links)
  const navItems = [
    { label: 'Home', icon: FaHome, href: '/dashboard', children: [] },
    {
      label: 'Pricing and booking calendar',
      icon: FaCalendarAlt,
      href: '/owner/rates',
      children: [
        { label: 'Calendar', href: '/owner/rates?view=calendar' },
        { label: 'Open/close rooms', href: '/owner/rates?view=open-close' },
        { label: 'Guest pricing', href: '/owner/rates?view=pricing-per-guest' },
      ]
    },
    {
      label: 'Reservations',
      icon: FaCalendarCheck,
      href: '/my-bookings',
      children: [
        { label: 'All reservations', href: '/my-bookings?tab=reservations&scope=all' },
        { label: 'Upcoming', href: '/my-bookings?tab=reservations&scope=upcoming' },
        { label: 'Checked in', href: '/my-bookings?tab=reservations&scope=checked-in' },
        { label: 'Checked out', href: '/my-bookings?tab=reservations&scope=checked-out' },
        { label: 'Cancelled', href: '/my-bookings?tab=reservations&scope=cancelled' },
      ]
    },
    {
      label: 'Property',
      icon: FaBed,
      href: '/owner/property',
      children: [
        { label: 'Property policies', href: '/owner/property?view=policies' },
        { label: 'Reservation policies', href: '/owner/property?view=reservation-policies' },
        { label: 'Facilities and services', href: '/owner/property?view=facilities' },
        { label: 'Room details', href: '/owner/property?view=room-details' },
        { label: 'Room Amenities', href: '/owner/property?view=room-amenities' },
        { label: 'your profile', href: '/owner/property?view=profile' },
        { label: 'View your descriptions', href: '/owner/property?view=descriptions' },
        { label: 'Messaging preferences', href: '/settings?tab=messaging' },
        { label: 'Property photos', href: '/owner/property?view=photos' },
      ]
    },
    {
      label: 'Inbox',
      icon: FaEnvelope,
      href: '/messages',
      children: [
        { label: 'Reservation messages', href: '/messages?category=reservations' },
        { label: 'Akwanda.rw messages', href: '/messages?category=platform' },
        { label: 'Guest Q&A', href: '/messages?category=qna' },
      ]
    },
    {
      label: 'Guest reviews',
      icon: FaStar,
      href: '/owner/reviews',
      children: [
        { label: 'Guest reviews', href: '/owner/reviews' },
        { label: 'Guest experience', href: '/owner/reviews?view=experience' },
      ]
    },
    {
      label: 'Finance',
      icon: FaDollarSign,
      href: '/dashboard?tab=finance',
      children: [
        { label: 'Invoices', href: '/dashboard?tab=finance&view=invoices' },
        { label: 'Reservations statement', href: '/dashboard?tab=finance&view=statement' },
        { label: 'Financial overview', href: '/dashboard?tab=finance&view=overview' },
        { label: 'Transactions', href: '/transactions' },
        { label: 'Finance settings', href: '/settings?tab=finance' },
      ]
    },
    {
      label: 'Sales Reporting & Analytics',
      icon: FaChartLine,
      href: '/dashboard?tab=analytics',
      children: [
        { label: 'Overview dashboard', href: '/dashboard?tab=analytics' },
        { label: 'Sales statistics', href: '/dashboard?tab=analytics&view=sales' },
        { label: 'Reports', href: '/dashboard?tab=analytics&view=reports' },
        { label: 'Direct vs Online', href: '/dashboard?tab=analytics&view=comparison' },
        { label: 'Occupancy & Revenue per Room', href: '/dashboard?tab=analytics&view=occupancy' },
        { label: 'Tax liability tracking', href: '/dashboard?tab=analytics&view=tax' },
      ]
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Back Button */}
        <div className="mb-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 hover:text-[#a06b42] transition-colors"
          >
            <FaArrowLeft className="text-sm" />
            <span className="text-sm font-medium">Back</span>
          </button>
        </div>

        {/* Property Owner Navigation - Desktop Only */}
        <div className="hidden lg:block mb-6">
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              {/* Navigation Links */}
              <div className="flex items-center gap-2 flex-wrap">
                {navItems.map((item, index) => (
                  <div key={index} className="relative">
                    <button
                      onClick={() => {
                        if (item.children.length === 0) {
                          if (item.href) navigate(item.href);
                          if (item.action) item.action();
                          setActiveNavDropdown(null);
                        } else {
                          setActiveNavDropdown(activeNavDropdown === item.label ? null : item.label);
                        }
                      }}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:text-[#a06b42] hover:bg-[#f5f0e8] transition-colors"
                    >
                      <item.icon className="text-sm" />
                      <span>{item.label}</span>
                      {item.children.length > 0 && (
                        <FaChevronDown className={`text-xs transition-transform ${activeNavDropdown === item.label ? 'rotate-180' : ''}`} />
                      )}
                    </button>
                    
                    {/* Dropdown Menu */}
                    {item.children.length > 0 && activeNavDropdown === item.label && (
                      <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-xl py-2 min-w-[200px] z-[99999]">
                        {item.children.map((child, childIndex) => (
                          <button
                            key={childIndex}
                            onClick={() => {
                              if (child.href) navigate(child.href);
                              if (child.action) child.action();
                              setActiveNavDropdown(null);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-[#f5f0e8] hover:text-[#a06b42] transition-colors"
                          >
                            {child.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              {/* New Booking Button */}
              <button
                onClick={() => setShowDirectBooking(true)}
                className="bg-[#a06b42] hover:bg-[#8f5a32] text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-md transition-colors"
              >
                <FaPlus />
                <span>New Booking</span>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile: New Booking Button Only */}
        <div className="lg:hidden mb-6 flex justify-end">
          <button
            onClick={() => setShowDirectBooking(true)}
            className="bg-[#a06b42] hover:bg-[#8f5a32] text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-md transition-colors"
          >
            <FaPlus />
            <span className="hidden sm:inline">New Booking</span>
            <span className="sm:hidden">New</span>
          </button>
        </div>

        <div className="mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div onClick={() => navigate('/owner/cars')} className="cursor-pointer neu-card p-5 flex items-center justify-between hover:shadow-lg transition-shadow">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Manage Cars</h3>
                <p className="text-sm text-gray-600">Create, edit and view car bookings</p>
              </div>
              <FaCar className="text-3xl text-blue-600" />
            </div>
            <div onClick={() => navigate('/owner/attractions')} className="cursor-pointer neu-card p-5 flex items-center justify-between hover:shadow-lg transition-shadow">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Manage Attractions</h3>
                <p className="text-sm text-gray-600">Create, edit and view attraction bookings</p>
              </div>
              <FaShoppingBag className="text-3xl text-pink-600" />
            </div>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            {/* Stats Cards (dashboard only) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="neu-card p-6 hover:scale-105 transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Bookings</p>
                    <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
                  </div>
                  <FaCalendarAlt className="text-3xl text-blue-600" />
                </div>
              </div>
              <div className="neu-card p-6 hover:scale-105 transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Revenue</p>
                    <p className="text-2xl font-bold text-green-600">{formatCurrencyRWF ? formatCurrencyRWF(stats.totalRevenue) : `RWF ${stats.totalRevenue.toLocaleString()}`}</p>
                  </div>
                  <FaMoneyBillWave className="text-3xl text-green-600" />
                </div>
              </div>
              <div className="neu-card p-6 hover:scale-105 transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Properties</p>
                    <p className="text-2xl font-bold text-purple-600">{stats.totalProperties}</p>
                  </div>
                  <FaHome className="text-3xl text-purple-600" />
                </div>
              </div>
              <div className="neu-card p-6 hover:scale-105 transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Occupancy Rate</p>
                    <p className="text-2xl font-bold text-orange-600">{stats.occupancyRate}%</p>
                  </div>
                  <FaChartLine className="text-3xl text-orange-600" />
                </div>
              </div>
            </div>
            {/* Revenue Management */}
            <div className="neu-card p-0">
              <div 
                className="flex items-center justify-between p-6 border-b cursor-pointer hover:bg-gray-50"
                onClick={() => toggleSection('revenue')}
              >
                <div className="flex items-center space-x-3">
                  <FaDollarSign className="text-green-600 text-xl" />
                  <h2 className="text-xl font-semibold text-gray-900">Revenue Management</h2>
                </div>
                {expandedSections.revenue ? <FaChevronUp /> : <FaChevronDown />}
              </div>
              
              {expandedSections.revenue && (
                <div className="p-6 space-y-6">
                  {/* Revenue content from previous implementation */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                      <h3 className="text-lg font-semibold text-green-900 mb-4">Monthly Revenue</h3>
                      <div className="text-3xl font-bold text-green-600">{formatCurrencyRWF ? formatCurrencyRWF(stats.totalRevenue) : `RWF ${stats.totalRevenue.toLocaleString()}`}</div>
                      <p className="text-sm text-green-700 mt-2">+12% from last month</p>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                      <h3 className="text-lg font-semibold text-blue-900 mb-4">Average Daily Rate</h3>
                      <div className="text-3xl font-bold text-blue-600">{formatCurrencyRWF ? formatCurrencyRWF(Math.round(stats.totalRevenue / Math.max(stats.total, 1))) : `RWF ${Math.round(stats.totalRevenue / Math.max(stats.total, 1)).toLocaleString()}`}</div>
                      <p className="text-sm text-blue-700 mt-2">Per booking average</p>
                    </div>
                    <div className="bg-purple-50 border border-purple-200 rounded-xl p-6">
                      <h3 className="text-lg font-semibold text-purple-900 mb-4">Occupancy Rate</h3>
                      <div className="text-3xl font-bold text-purple-600">{stats.occupancyRate}%</div>
                      <p className="text-sm text-purple-700 mt-2">Current month</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="neu-card p-0">
              <div 
                className="flex items-center justify-between p-6 border-b cursor-pointer hover:bg-gray-50"
                onClick={() => toggleSection('advancedAnalytics')}
              >
                {/* ... */}
                <div className="flex items-center space-x-3">
                  <FaChartLine className="text-purple-600 text-xl" />
                  <h2 className="text-xl font-semibold text-gray-900">Advanced Analytics</h2>
                </div>
                {expandedSections.advancedAnalytics ? <FaChevronUp /> : <FaChevronDown />}
              </div>
              
              {expandedSections.advancedAnalytics && (
                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-6">
                      <h3 className="text-lg font-semibold text-indigo-900 mb-4">Performance Metrics</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-indigo-700">Conversion Rate</span>
                          <span className="font-semibold text-indigo-900">24.5%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-indigo-700">Avg Booking Value</span>
                          <span className="font-semibold text-indigo-900">{formatCurrencyRWF ? formatCurrencyRWF(Math.round(stats.totalRevenue / Math.max(stats.total, 1))) : `RWF ${Math.round(stats.totalRevenue / Math.max(stats.total, 1)).toLocaleString()}`}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-indigo-700">Repeat Guests</span>
                          <span className="font-semibold text-indigo-900">18%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'reservations' && (
          <div>
            {/* Filters */}
        <div className="neu-card p-6 mb-8">
          <div className="flex flex-wrap gap-4 items-center justify-between mb-4">
            <div className="flex flex-wrap gap-4 flex-1">
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="modern-input"
            >
              <option value="all">All Status</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="unpaid">Unpaid</option>
            </select>
            <select
              value={filters.property}
              onChange={(e) => setFilters(prev => ({ ...prev, property: e.target.value }))}
              className="modern-input"
            >
              <option value="all">All Properties</option>
              {properties.map(prop => (
                <option key={prop._id} value={prop._id}>{prop.title || prop.name || `Property ${prop._id?.slice(-4)}`}</option>
              ))}
            </select>
            <select
              value={filters.year}
              onChange={(e) => setFilters(prev => ({ ...prev, year: Number(e.target.value) }))}
              className="modern-input"
            >
              {Array.from({ length: 11 }, (_, k) => new Date().getFullYear() - 5 + k).map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <div className="flex-1 min-w-64">
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by guest name..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="modern-input pl-10 w-full"
                />
              </div>
            </div>
            </div>
            {/* Active Filter Indicator */}
            {filters.dateRange && filters.dateRange !== 'all' && (
              <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                <FaFilter className="text-xs" />
                <span>
                  {filters.dateRange === 'upcoming' && 'Upcoming Bookings'}
                  {filters.dateRange === 'checked-in' && 'Currently Checked In'}
                  {filters.dateRange === 'checked-out' && 'Checked Out'}
                </span>
                <button
                  onClick={() => setFilters(prev => ({ ...prev, dateRange: 'all' }))}
                  className="ml-1 hover:text-blue-900"
                >
                  ×
                </button>
              </div>
            )}
            {/* Export Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => downloadReport('pdf')}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                <FaFileAlt />
                Export PDF
              </button>
              <button
                onClick={() => downloadReport('csv')}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <FaDownload />
                Export CSV
              </button>
            </div>
          </div>
        </div>

        {/* Bookings / Calendar Card */}
        <div className="neu-card p-0 overflow-x-auto">
          <div className="flex items-center justify-between p-4 border-b">
            <div className="font-semibold text-gray-800">Clients & Calendar</div>
            <div className="flex gap-2">
              <button
                className={`px-3 py-1 rounded ${ownerView === 'table' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
                onClick={() => setOwnerView('table')}
              >
                Table
              </button>
              <button
                className={`px-3 py-1 rounded ${ownerView === 'calendar' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
                onClick={() => setOwnerView('calendar')}
              >
                Calendar
              </button>
            </div>
          </div>

          {ownerView === 'table' && (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Property</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dates</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Guests</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Direct</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentBookings.map(b => {
                const guestName = `${b.guest?.firstName || ''} ${b.guest?.lastName || ''}`.trim() || b.guest?.email || 'Guest';
                const propertyTitle = b.property?.title || b.property?.name || 'Property';
                const propertyLocation = b.property?.city || b.property?.address || '';
                const checkIn = new Date(b.checkIn).toLocaleDateString();
                const checkOut = new Date(b.checkOut).toLocaleDateString();
                return (
                  <tr key={b._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{guestName}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <div>{b.guest?.email || '-'}</div>
                      <div>{b.guest?.phone || '-'}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <div className="font-medium text-gray-900">{propertyTitle}</div>
                      <div className="text-gray-500">{propertyLocation}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <div>{checkIn} → {checkOut}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{b.numberOfGuests || b.guests || 1}</td>
                    <td className="px-4 py-3 text-right font-semibold">{formatCurrencyRWF ? formatCurrencyRWF(b.totalAmount || 0) : `RWF ${(b.totalAmount || 0).toLocaleString()}`}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        (b.paymentStatus === 'paid' || b.status === 'confirmed') ? 'bg-green-100 text-green-800' :
                        (b.paymentStatus === 'pending' || b.status === 'pending') ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {b.paymentStatus || b.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">{b.isDirect ? 'Yes' : 'No'}</td>
                    <td className="px-4 py-3 text-sm space-x-1">
                      <button
                        onClick={() => openReceiptPdf(b._id)}
                        className="p-2 rounded bg-green-50 text-green-700 hover:bg-green-100"
                        aria-label="Receipt"
                        title="Download Receipt"
                      >
                        <FaFileInvoice />
                      </button>
                      <button
                        onClick={() => openInvoicePdf(b._id)}
                        className="p-2 rounded bg-purple-50 text-purple-700 hover:bg-purple-100"
                        aria-label="Invoice"
                        title="Download Invoice"
                      >
                        <FaDownload />
                      </button>
                      <button
                        onClick={() => {
                          const guestId = b.guest?._id || b.guest;
                          navigate(`/messages?recipient=${guestId}&booking=${b._id}`);
                        }}
                        className="p-2 rounded bg-[#003580] text-white hover:bg-[#002a66]"
                        aria-label="Chat"
                        title="Message Guest"
                      >
                        <FaComments />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredBookings.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-gray-500">
                    No bookings found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          )}

          {/* Pagination Controls */}
          {ownerView === 'table' && totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
              <div className="text-sm text-gray-700">
                Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredBookings.length)} of {filteredBookings.length} reservations
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => paginate(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(number => (
                  <button
                    key={number}
                    onClick={() => paginate(number)}
                    className={`px-3 py-1 rounded ${
                      currentPage === number
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    {number}
                  </button>
                ))}
                <button
                  onClick={() => paginate(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {ownerView === 'calendar' && (
            <div className="p-4">
              {(() => {
                const propertyForCalendar = filters.property !== 'all' ? filters.property : (properties[0]?._id || '');
                if (!propertyForCalendar) {
                  return (
                    <div className="text-gray-500 py-8 text-center">Select a property to view its calendar.</div>
                  );
                }
                const params = new URLSearchParams(location.search);
                const mo = parseInt(params.get('monthOffset') || '0', 10);
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
              })()}
            </div>
          )}
        </div>
          </div>
        )}

        {activeTab === 'calendar' && (
          <div>
            <div className="neu-card p-6 mb-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Property Calendar</h2>
                <div className="flex space-x-4">
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
                </div>
              </div>
              
              {(() => {
                const propertyForCalendar = filters.property !== 'all' ? filters.property : (properties[0]?._id || '');
                if (!propertyForCalendar) {
                  return (
                    <div className="text-gray-500 py-8 text-center">Select a property to view its calendar.</div>
                  );
                }

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
              })()}
            </div>
          </div>
        )}

        {activeTab === 'finance' && (
          <div className="space-y-8">
            {/* Finance View Tabs */}
            <div className="flex space-x-2 border-b border-gray-200 mb-6">
              {['overview', 'invoices', 'statement'].map((view) => (
                <button
                  key={view}
                  onClick={() => setFinanceView(view)}
                  className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                    financeView === view
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {view === 'overview' ? 'Financial Overview' : view === 'invoices' ? 'Invoices' : 'Reservations Statement'}
                </button>
              ))}
            </div>

            {financeView === 'overview' && (
              <div className="neu-card p-6">
                <h2 className="text-xl font-semibold mb-6">Financial Overview</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-green-900 mb-4">Total Revenue</h3>
                    <div className="text-3xl font-bold text-green-600">{formatCurrencyRWF ? formatCurrencyRWF(stats.totalRevenue) : `RWF ${stats.totalRevenue.toLocaleString()}`}</div>
                    <p className="text-sm text-green-700 mt-2">All time earnings</p>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-blue-900 mb-4">Pending Revenue</h3>
                    <div className="text-3xl font-bold text-blue-600">{formatCurrencyRWF ? formatCurrencyRWF(stats.pendingRevenue) : `RWF ${stats.pendingRevenue.toLocaleString()}`}</div>
                    <p className="text-sm text-blue-700 mt-2">Awaiting payout</p>
                  </div>
                  <div className="bg-purple-50 border border-purple-200 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-purple-900 mb-4">Commission Paid</h3>
                    <div className="text-3xl font-bold text-purple-600">{formatCurrencyRWF ? formatCurrencyRWF(Math.round(stats.totalRevenue * 0.1)) : `RWF ${Math.round(stats.totalRevenue * 0.1).toLocaleString()}`}</div>
                    <p className="text-sm text-purple-700 mt-2">Platform fees (10%)</p>
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
                                <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                                  booking.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' :
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
                            <button disabled={page<=1} onClick={()=>setFinancePage(p=>Math.max(1,p-1))} className="px-3 py-1 rounded border disabled:opacity-50">Prev</button>
                            <button disabled={page>=totalPages} onClick={()=>setFinancePage(p=>Math.min(totalPages,p+1))} className="px-3 py-1 rounded border disabled:opacity-50">Next</button>
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
                                <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                                  booking.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' :
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
                        <button disabled={financePage<=1} onClick={()=>setFinancePage(p=>Math.max(1,p-1))} className="px-3 py-1 rounded border disabled:opacity-50">Prev</button>
                        <button disabled={financePage>=Math.ceil(financeFiltered.length/financePerPage)} onClick={()=>setFinancePage(p=>Math.min(Math.ceil(financeFiltered.length/financePerPage),p+1))} className="px-3 py-1 rounded border disabled:opacity-50">Next</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
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
                    <select value={salesPeriod} onChange={(e)=>{ setSalesPeriod(e.target.value); setSalesPage(1); }} className="border rounded-lg px-3 py-2">
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                    <button onClick={()=>{
                      const rows = computeSalesBuckets(bookings, salesPeriod);
                      exportSalesCSV(rows);
                    }} className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm">Export CSV</button>
                    <button onClick={()=>window.print()} className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm">Export PDF</button>
                  </div>
                )}
              </div>
              
              {analyticsView === 'dashboard' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-indigo-50 rounded-xl p-6 shadow-md">
                    <h3 className="text-lg font-semibold text-indigo-900 mb-2">Occupancy Rate</h3>
                    <div className="text-2xl font-bold text-indigo-600">{stats.occupancyRate}%</div>
                  </div>
                  <div className="bg-orange-50 rounded-xl p-6 shadow-md">
                    <h3 className="text-lg font-semibold text-orange-900 mb-2">Avg Rating</h3>
                    <div className="text-2xl font-bold text-orange-600">{stats.averageRating}</div>
                  </div>
                  <div className="bg-teal-50 rounded-xl p-6 shadow-md">
                    <h3 className="text-lg font-semibold text-teal-900 mb-2">Total Bookings</h3>
                    <div className="text-2xl font-bold text-teal-600">{stats.total}</div>
                  </div>
                  <div className="bg-pink-50 rounded-xl p-6 shadow-md">
                    <h3 className="text-lg font-semibold text-pink-900 mb-2">Properties</h3>
                    <div className="text-2xl font-bold text-pink-600">{stats.totalProperties}</div>
                  </div>
                </div>
              )}

              {analyticsView === 'demand' && (
                <div className="space-y-4">
                  <p className="text-gray-600">Analyze demand trends for your location and property type.</p>
                  <div className="bg-blue-50 p-6 rounded-lg">
                    <h4 className="font-semibold mb-3">Location Demand Index</h4>
                    <div className="text-3xl font-bold text-blue-600 mb-2">High</div>
                    <p className="text-sm text-gray-600">Your location is experiencing high demand this season</p>
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
                      <p className="text-xl font-bold">{bookings.filter(b=>b.isDirect).length}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600">Bookings (Online)</p>
                      <p className="text-xl font-bold">{bookings.filter(b=>!b.isDirect).length}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-indigo-50 p-4 rounded-lg">
                      <p className="text-sm text-indigo-700">RevPAR (avg)</p>
                      <p className="text-2xl font-bold text-indigo-800">RWF {Number(analyticsData?.totals?.revparAvg||0).toLocaleString()}</p>
                    </div>
                    <div className="bg-teal-50 p-4 rounded-lg">
                      <p className="text-sm text-teal-700">ADR (avg)</p>
                      <p className="text-2xl font-bold text-teal-800">RWF {Number(analyticsData?.totals?.adrAvg||0).toLocaleString()}</p>
                    </div>
                    <div className="bg-yellow-50 p-4 rounded-lg">
                      <p className="text-sm text-yellow-700">Occupancy (avg)</p>
                      <p className="text-2xl font-bold text-yellow-800">{Number(analyticsData?.totals?.occupancyAvg||0)}%</p>
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
                      const start = (page-1) * salesPerPage;
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
                              <button disabled={page<=1} onClick={()=>setSalesPage(p=>Math.max(1,p-1))} className="px-3 py-1 rounded border disabled:opacity-50">Prev</button>
                              <button disabled={page>=totalPages} onClick={()=>setSalesPage(p=>Math.min(totalPages,p+1))} className="px-3 py-1 rounded border disabled:opacity-50">Next</button>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  <div className="neu-card p-4">
                    <h3 className="font-semibold mb-2">Direct vs Online Comparison</h3>
                    {(() => {
                      const direct = bookings.filter(b=>b.isDirect);
                      const online = bookings.filter(b=>!b.isDirect);
                      const dRev = direct.reduce((s,b)=>s+Number(b.totalAmount||0),0);
                      const oRev = online.reduce((s,b)=>s+Number(b.totalAmount||0),0);
                      return (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-green-50 p-4 rounded-lg">
                            <p className="text-sm text-green-700">Direct Revenue</p>
                            <p className="text-xl font-bold text-green-800">RWF {dRev.toLocaleString()}</p>
                          </div>
                          <div className="bg-blue-50 p-4 rounded-lg">
                            <p className="text-sm text-blue-700">Online Revenue</p>
                            <p className="text-xl font-bold text-blue-800">RWF {oRev.toLocaleString()}</p>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  <div className="neu-card p-4">
                    <h3 className="font-semibold mb-2">Tax Liability Tracking</h3>
                    {(() => {
                      const list = bookings;
                      const tax = list.reduce((s,b)=> s + Number(b.taxAmount||0), 0);
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
                        <select value={reportsPeriod} onChange={(e)=>{ setReportsPeriod(e.target.value); setReportsPage(1); }} className="border rounded-lg px-3 py-2 text-sm">
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
                      const start = (page-1) * reportsPerPage;
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
                                {pageRows.length===0 && (<tr><td colSpan={4} className="px-4 py-6 text-center text-gray-500">No data</td></tr>)}
                              </tbody>
                            </table>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="text-sm text-gray-500">Page {page} of {totalPages}</div>
                            <div className="flex gap-2">
                              <button disabled={page<=1} onClick={()=>setReportsPage(p=>Math.max(1,p-1))} className="px-3 py-1 rounded border disabled:opacity-50">Prev</button>
                              <button disabled={page>=totalPages} onClick={()=>setReportsPage(p=>Math.min(totalPages,p+1))} className="px-3 py-1 rounded border disabled:opacity-50">Next</button>
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
                            { channel: 'Direct', revenue: bookings.filter(b=>b.isDirect).reduce((s,b)=>s+Number(b.totalAmount||0),0), count: bookings.filter(b=>b.isDirect).length },
                            { channel: 'Online', revenue: bookings.filter(b=>!b.isDirect).reduce((s,b)=>s+Number(b.totalAmount||0),0), count: bookings.filter(b=>!b.isDirect).length },
                          ];
                          const header = ['Channel','Revenue','Count'];
                          const lines = [header.join(',')].concat(rows.map(r=>[r.channel,r.revenue,r.count].join(',')));
                          const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a'); a.href = url; a.download = 'comparison.csv'; a.click(); URL.revokeObjectURL(url);
                        }} className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm">Export CSV</button>
                        <button onClick={()=>window.print()} className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm">Export PDF</button>
                      </div>
                    </div>
                    {(() => {
                      const direct = bookings.filter(b=>b.isDirect);
                      const online = bookings.filter(b=>!b.isDirect);
                      const dRev = direct.reduce((s,b)=>s+Number(b.totalAmount||0),0);
                      const oRev = online.reduce((s,b)=>s+Number(b.totalAmount||0),0);
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
                      const rows = bookings.map(b=>({
                        date: new Date(b.createdAt).toLocaleDateString(undefined, { day:'2-digit', month:'2-digit', year:'numeric' }),
                        channel: b.isDirect ? 'Direct' : 'Online',
                        amount: Number(b.totalAmount||0)
                      }));
                      const totalPages = Math.max(1, Math.ceil(rows.length / compPerPage));
                      const page = Math.min(compPage, totalPages);
                      const start = (page-1) * compPerPage;
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
                                {pageRows.map((r,i)=> (
                                  <tr key={i} className="hover:bg-gray-50">
                                    <td className="px-4 py-2 text-sm">{r.date}</td>
                                    <td className="px-4 py-2 text-sm">{r.channel}</td>
                                    <td className="px-4 py-2 text-sm text-right">RWF {r.amount.toLocaleString()}</td>
                                  </tr>
                                ))}
                                {pageRows.length===0 && (<tr><td colSpan={3} className="px-4 py-6 text-center text-gray-500">No data</td></tr>)}
                              </tbody>
                            </table>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="text-sm text-gray-500">Page {page} of {totalPages}</div>
                            <div className="flex gap-2">
                              <button disabled={page<=1} onClick={()=>setCompPage(p=>Math.max(1,p-1))} className="px-3 py-1 rounded border disabled:opacity-50">Prev</button>
                              <button disabled={page>=totalPages} onClick={()=>setCompPage(p=>Math.min(totalPages,p+1))} className="px-3 py-1 rounded border disabled:opacity-50">Next</button>
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
                            const s = new Date(b.checkIn); const e = new Date(b.checkOut); const n = Math.ceil((e-s)/(1000*60*60*24)) || 0;
                            cur.nights += Math.max(0,n); cur.revenue += Number(b.totalAmount||0); cur.count += 1; map.set(roomKey, cur);
                          });
                          const rows = Array.from(map.values());
                          const header = ['Room','Nights','Bookings','Revenue'];
                          const lines = [header.join(',')].concat(rows.map(r=>[r.roomName,r.nights,r.count,r.revenue].join(',')));
                          const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a'); a.href = url; a.download = 'occupancy_per_room.csv'; a.click(); URL.revokeObjectURL(url);
                        }} className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm">Export CSV</button>
                        <button onClick={()=>window.print()} className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm">Export PDF</button>
                      </div>
                    </div>
                    {(() => {
                      const map = new Map();
                      bookings.forEach(b => {
                        const roomKey = (b.room?._id || b.room || 'unknown');
                        const roomName = b.room?.roomNumber || b.room?.roomType || b.roomNumber || 'Room';
                        const cur = map.get(roomKey) || { roomName, nights: 0, revenue: 0, count: 0 };
                        const nights = (()=>{ const s = new Date(b.checkIn); const e = new Date(b.checkOut); const n = Math.ceil((e-s)/(1000*60*60*24)); return isNaN(n)?0:Math.max(0,n); })();
                        cur.nights += nights;
                        cur.revenue += Number(b.totalAmount||0);
                        cur.count += 1;
                        map.set(roomKey, cur);
                      });
                      const rows = Array.from(map.values());
                      const totalPages = Math.max(1, Math.ceil(rows.length / occPerPage));
                      const page = Math.min(occPage, totalPages);
                      const start = (page-1) * occPerPage;
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
                                {pageRows.length===0 && (<tr><td colSpan={4} className="px-4 py-6 text-center text-gray-500">No data</td></tr>)}
                              </tbody>
                            </table>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="text-sm text-gray-500">Page {page} of {totalPages}</div>
                            <div className="flex gap-2">
                              <button disabled={page<=1} onClick={()=>setOccPage(p=>Math.max(1,p-1))} className="px-3 py-1 rounded border disabled:opacity-50">Prev</button>
                              <button disabled={page>=totalPages} onClick={()=>setOccPage(p=>Math.min(totalPages,p+1))} className="px-3 py-1 rounded border disabled:opacity-50">Next</button>
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
                          const rows = bookings.map(b=>({ date: new Date(b.createdAt).toISOString().slice(0,10), booking: b.confirmationCode || b._id, amount: Number(b.totalAmount||0), tax: Number(b.taxAmount||0) }));
                          const header = ['Date','Booking','Amount','Tax'];
                          const lines = [header.join(',')].concat(rows.map(r=>[r.date,r.booking,r.amount,r.tax].join(',')));
                          const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a'); a.href = url; a.download = 'tax_liability.csv'; a.click(); URL.revokeObjectURL(url);
                        }} className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm">Export CSV</button>
                        <button onClick={()=>window.print()} className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm">Export PDF</button>
                      </div>
                    </div>
                    {(() => {
                      const rows = bookings.map(b=>({ date: new Date(b.createdAt).toLocaleDateString(undefined, { day:'2-digit', month:'2-digit', year:'numeric' }), booking: b.confirmationCode || b._id, amount: Number(b.totalAmount||0), tax: Number(b.taxAmount||0) }));
                      const totalTax = rows.reduce((s,r)=>s + r.tax, 0);
                      const totalPages = Math.max(1, Math.ceil(rows.length / taxPerPage));
                      const page = Math.min(taxPage, totalPages);
                      const start = (page-1) * taxPerPage;
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
                                {pageRows.map((r,i)=> (
                                  <tr key={i} className="hover:bg-gray-50">
                                    <td className="px-4 py-2 text-sm">{r.date}</td>
                                    <td className="px-4 py-2 text-sm">{r.booking}</td>
                                    <td className="px-4 py-2 text-sm text-right">RWF {r.amount.toLocaleString()}</td>
                                    <td className="px-4 py-2 text-sm text-right">RWF {r.tax.toLocaleString()}</td>
                                  </tr>
                                ))}
                                {pageRows.length===0 && (<tr><td colSpan={4} className="px-4 py-6 text-center text-gray-500">No data</td></tr>)}
                              </tbody>
                            </table>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="text-sm text-gray-700 font-medium">Total Tax: RWF {totalTax.toLocaleString()}</div>
                            <div className="flex gap-2">
                              <button disabled={page<=1} onClick={()=>setTaxPage(p=>Math.max(1,p-1))} className="px-3 py-1 rounded border disabled:opacity-50">Prev</button>
                              <button disabled={page>=totalPages} onClick={()=>setTaxPage(p=>Math.min(totalPages,p+1))} className="px-3 py-1 rounded border disabled:opacity-50">Next</button>
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
                  <span className="text-2xl font-bold text-gray-900">{ownerAvgRating.toFixed(1)}</span>
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

      </div>

      {/* Modals */}
      {showBookingDetails && renderBookingDetails()}
      {showReceipt && renderReceipt()}
      {showSalesConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold">Confirm Sale and Print Receipt</h3>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-gray-700">Please confirm that this booking should be recorded in Sales Reporting & Analytics before printing the receipt.</p>
              {salesNewBooking && (
                <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                  <div><span className="font-medium">Booking:</span> {salesNewBooking.confirmationCode || salesNewBooking._id}</div>
                  <div><span className="font-medium">Amount:</span> {formatCurrencyRWF ? formatCurrencyRWF(salesNewBooking.totalAmount || 0) : `RWF ${(salesNewBooking.totalAmount || 0).toLocaleString()}`}</div>
                </div>
              )}
              <div className="flex items-center justify-end gap-3">
                <button onClick={onCancelSalesConfirm} className="px-5 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100">Cancel</button>
                <button onClick={onConfirmSalesAndPrint} className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white">Confirm & Print</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showDirectBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
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
                  <option key={r._id} value={r._id}>{r.roomNumber || r.roomType || 'Room'}</option>
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
                <label className="inline-flex items-center gap-2 text-sm"><input type="radio" name="ownerpaystatus" checked={directForm.paymentStatusSelection==='paid'} onChange={() => onDirectChange('paymentStatusSelection','paid')} />Paid</label>
                <label className="inline-flex items-center gap-2 text-sm"><input type="radio" name="ownerpaystatus" checked={directForm.paymentStatusSelection==='pending'} onChange={() => onDirectChange('paymentStatusSelection','pending')} />Pending</label>
                <label className="inline-flex items-center gap-2 text-sm"><input type="radio" name="ownerpaystatus" checked={directForm.paymentStatusSelection==='deposit'} onChange={() => onDirectChange('paymentStatusSelection','deposit')} />Deposit</label>
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

          <div className="border rounded-lg p-4 bg-gray-50">
            <div className="text-sm text-gray-900 font-semibold mb-2">Payment Information</div>
            <div className="text-sm text-gray-700 space-y-1">
              <div>Room Rate: RWF {(ownerNightly !== undefined && ownerNightly !== null ? Number(ownerNightly).toLocaleString() : '0')} × {Math.max(1, ownerNights)} nights = RWF {ownerRoomCharge.toLocaleString()}</div>
              <div className="mt-2">Additional Services:</div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!directForm.services?.breakfast} onChange={e => onDirectChange('services', { ...(directForm.services||{}), breakfast: e.target.checked })} />
                Breakfast Plan: RWF 15,000 × {Math.max(1, ownerNights)} = RWF {(directForm.services?.breakfast ? (15000 * Math.max(1, ownerNights)) : 0).toLocaleString()}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!directForm.services?.airportTransfer} onChange={e => onDirectChange('services', { ...(directForm.services||{}), airportTransfer: e.target.checked })} />
                Airport Transfer
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!directForm.services?.laundry} onChange={e => onDirectChange('services', { ...(directForm.services||{}), laundry: e.target.checked })} />
                Laundry Service
              </label>
              <div className="pt-2">Subtotal: RWF {ownerSubtotal.toLocaleString()}</div>
              <div>Hospitality Levy (3%): RWF {ownerLevy3.toLocaleString()}</div>
              <div>VAT (18%): RWF {ownerVat18.toLocaleString()}</div>
              <div className="font-semibold">TOTAL: RWF {ownerGrandTotal.toLocaleString()}</div>
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
{/* End Modals */}
</div>
);
};
export default PropertyOwnerBookings;
