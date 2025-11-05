import React, { useState, useEffect, useRef } from 'react';
import { 
  FaCalendarAlt, FaUsers, FaMoneyBillWave, FaCheckCircle, FaClock, 
  FaEye, FaFileInvoice, FaFilter, FaDownload, FaComments, FaHome, 
  FaChartLine, FaPlus, FaSearch, FaChevronDown, FaChevronUp, 
  FaEdit, FaTrash, FaStar, FaPhone, FaEnvelope, FaDollarSign,
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

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const PropertyOwnerBookings = () => {
  const navigate = useNavigate();
  const location = useLocation();
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
    guestInfo: { firstName: '', lastName: '', email: '', phone: '' },
    contactInfo: { email: '', phone: '' },
    paymentMethod: 'cash',
    markPaid: true,
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
  const [analyticsRange, setAnalyticsRange] = useState(searchParams.get('range') || '30'); // 30|90|ytd|custom
  const [analyticsView, setAnalyticsView] = useState(searchParams.get('view') || 'dashboard'); // dashboard|demand|pace|sales|booker|bookwindow|cancellation|competitive|genius|ranking|performance
  const [boostView, setBoostView] = useState(searchParams.get('view') || 'opportunity'); // opportunity|commission-free|genius|preferred|long-stays|visibility|work-friendly|unit-diff
  const [ratesView, setRatesView] = useState(searchParams.get('view') || 'availability'); // availability|pricing
  const [ownerReviews, setOwnerReviews] = useState([]);
  const [ownerAvgRating, setOwnerAvgRating] = useState(0);
  const [ownerReviewCount, setOwnerReviewCount] = useState(0);
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
      if (tab === 'bookings') setActiveTab('reservations');
      else if (tab === 'rates') setActiveTab('dashboard'); // Rates & Availability goes to dashboard
      else if (tab === 'boost') setActiveTab('boost'); // Boost performance tab
      else if (tab === 'finance') setActiveTab('finance'); // Finance tab
      else if (tab === 'analytics') setActiveTab('analytics'); // Analytics tab
      else setActiveTab(tab);
    }

    // Apply reservations scope filters
    if (scope) {
      const map = {
        all: 'all',
        upcoming: 'upcoming',
        'checked-in': 'checked-in',
        'checked-out': 'checked-out',
        cancelled: 'cancelled',
        paid: 'paid',
        pending: 'pending',
        unpaid: 'unpaid'
      };
      const next = map[scope] || 'all';
      setFilters(prev => ({ ...prev, status: next }));
    }

    // Apply finance filters
    if (fstatus) setFinanceFilter(fstatus);
    if (view && tab === 'finance') setFinanceView(view);
    if (view && tab === 'analytics') setAnalyticsView(view);
    if (view && tab === 'boost') setBoostView(view);
    if (view && tab === 'rates') setRatesView(view);

    // Apply analytics range
    if (range) setAnalyticsRange(range);

    // Calendar deep-linking
    if (tab === 'properties' || tab === 'calendar') {
      setOwnerView('calendar');
      // Ensure a property is selected to render the calendar
      if (propParam) {
        setFilters(prev => ({ ...prev, property: propParam }));
      } else if (properties.length && filters.property === 'all') {
        setFilters(prev => ({ ...prev, property: properties[0]._id }));
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
        paymentMethod: directForm.paymentMethod,
        guestInfo: directForm.guestInfo,
        markPaid: directForm.paymentMethod === 'cash' ? directForm.markPaid : false,
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
      // Open simplified direct receipt for printing/saving
      if (data?.booking?._id) {
        window.open(`${API_URL}/api/bookings/${data.booking._id}/direct-receipt.csv`, '_blank');
        navigate(`/booking-confirmation/${data.booking._id}`);
      } else {
        loadData();
      }
    } catch (e) {
      toast.error(e.message);
    }
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
    // Handle status filtering with new navigation scopes
    if (filters.status !== 'all') {
      const now = new Date();
      const checkIn = new Date(booking.checkIn);
      const checkOut = new Date(booking.checkOut);
      
      if (filters.status === 'upcoming') {
        // Upcoming: check-in date is in the future
        if (checkIn <= now || booking.status === 'cancelled') return false;
      } else if (filters.status === 'checked-in') {
        // Checked-in: currently staying (between check-in and check-out)
        if (now < checkIn || now > checkOut || booking.status === 'cancelled') return false;
      } else if (filters.status === 'checked-out') {
        // Checked-out: check-out date has passed
        if (checkOut >= now || booking.status === 'cancelled') return false;
      } else if (filters.status === 'cancelled') {
        // Cancelled bookings
        if (booking.status !== 'cancelled') return false;
      } else {
        // Original status filtering (paid, pending, unpaid, etc.)
        if (booking.status !== filters.status && booking.paymentStatus !== filters.status) return false;
      }
    }
    
    if (filters.property !== 'all' && String(booking.property?._id) !== String(filters.property)) return false;
    const guestName = `${booking.guest?.firstName || ''} ${booking.guest?.lastName || ''}`.trim().toLowerCase();
    if (filters.search && !guestName.includes(filters.search.toLowerCase())) return false;
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
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Finance History</h2>
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
                    <td className="px-4 py-3 text-right font-semibold">RWF {(tr.totalAmount || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm">{tr.paymentMethod}</td>
                    <td className="px-4 py-3 text-sm">{tr.paymentStatus || tr.status}</td>
                  </tr>
                ))}
                {bookings.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-gray-500">No finance history yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      <div className="flex justify-between items-center mb-4">
        <div>
          <p className="text-xs md:text-sm text-gray-600">Total Amount</p>
          <p className="text-lg md:text-xl font-bold text-primary">RWF {booking.totalAmount.toLocaleString()}</p>
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
                    <p className="text-sm text-gray-600">Total Amount</p>
                    <p className="text-xl font-bold text-blue-600">RWF {selectedBooking.totalAmount.toLocaleString()}</p>
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
                <h3 className="text-lg font-semibold mb-4">Actions</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => handleStatusChange(selectedBooking._id, 'paid')}
                    className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center"
                  >
                    <FaCheck className="mr-2" />
                    Mark as Paid
                  </button>
                  <button
                    onClick={() => handleStatusChange(selectedBooking._id, 'pending')}
                    className="w-full bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors flex items-center justify-center"
                  >
                    <FaClock className="mr-2" />
                    Mark as Pending
                  </button>
                  <button
                    onClick={() => navigate(`/messages?booking=${selectedBooking._id}`)}
                    className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
                  >
                    <FaComments className="mr-2" />
                    Send Message
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
            <h2 className="text-2xl font-bold">Booking Receipt</h2>
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
              <p className="text-gray-600">Booking Receipt</p>
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
                <span>Total Amount:</span>
                <span className="text-blue-600">RWF {selectedBooking.totalAmount.toLocaleString()}</span>
              </div>
            </div>

            <div className="mt-6 flex space-x-4">
              <button
                onClick={() => window.print()}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Print Receipt
              </button>
              <button
                onClick={() => setShowReceipt(false)}
                className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Close
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
      label: 'Rates & Availability',
      icon: FaCalendarAlt,
      href: '/owner/rates',
      children: [
        { label: 'Calendar', href: '/owner/rates?view=calendar' },
        { label: 'Open/close rooms', href: '/owner/rates?view=open-close' },
        { label: 'Copy yearly rates', href: '/owner/rates?view=copy-yearly' },
        { label: 'Dynamic restriction rules', href: '/owner/rates?view=restrictions' },
        { label: 'Rate plans', href: '/owner/rates?view=rate-plans' },
        { label: 'Value adds', href: '/owner/rates?view=value-adds' },
        { label: 'Availability planner', href: '/owner/rates?view=availability-planner' },
        { label: 'Pricing per guest', href: '/owner/rates?view=pricing-per-guest' },
        { label: 'Country rates', href: '/owner/rates?view=country-rates' },
        { label: 'Mobile rates', href: '/owner/rates?view=mobile-rates' },
      ]
    },
    {
      label: 'Promotions',
      icon: FaShoppingBag,
      href: '/owner/promotions',
      children: [
        { label: 'Choose new promotion', href: '/owner/promotions?action=new' },
        { label: 'Simulate max discount', href: '/owner/promotions?action=simulate' },
        { label: 'Your active promotions', href: '/owner/promotions?filter=active' },
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
        { label: 'Quality rating', href: '/owner/property?view=quality-rating' },
        { label: 'Property page score', href: '/owner/property?view=page-score' },
        { label: 'General info & property status', href: '/owner/property?view=general-info' },
        { label: 'VAT/tax/charges', href: '/owner/property?view=vat-tax' },
        { label: 'Photos', href: '/owner/property?view=photos' },
        { label: 'Property policies', href: '/owner/property?view=policies' },
        { label: 'Reservation policies', href: '/owner/property?view=policies' },
        { label: 'Facilities & services', href: '/owner/property?view=facilities' },
        { label: 'Room details', href: '/owner/property?view=room-details' },
        { label: 'Room amenities', href: '/owner/property?view=facilities' },
        { label: 'Your profile', href: '/owner/property?view=profile' },
        { label: 'View your descriptions', href: '/owner/property?view=general-info' },
        { label: 'Messaging preferences', href: '/settings?tab=messaging' },
        { label: 'Sustainability', href: '/owner/property?view=sustainability' },
      ]
    },
    {
      label: 'Boost performance',
      icon: FaChartLine,
      href: '/dashboard?tab=boost',
      children: [
        { label: 'Opportunity Centre', href: '/dashboard?tab=boost&view=opportunity' },
        { label: 'Commission-free bookings', href: '/dashboard?tab=boost&view=commission-free' },
        { label: 'Genius partner programme', href: '/dashboard?tab=boost&view=genius' },
        { label: 'Preferred Partner Programme', href: '/dashboard?tab=boost&view=preferred' },
        { label: 'Long stays toolkit', href: '/dashboard?tab=boost&view=long-stays' },
        { label: 'Visibility booster', href: '/dashboard?tab=boost&view=visibility' },
        { label: 'Work-Friendly Programme', href: '/dashboard?tab=boost&view=work-friendly' },
        { label: 'Unit differentiation tool', href: '/dashboard?tab=boost&view=unit-diff' },
      ]
    },
    {
      label: 'Inbox',
      icon: FaEnvelope,
      href: '/messages',
      children: [
        { label: 'Reservation messages', href: '/messages?category=reservations' },
        { label: 'Booking.com messages', href: '/messages?category=platform' },
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
        { label: 'Finance settings', href: '/settings?tab=finance' },
      ]
    },
    {
      label: 'Analytics',
      icon: FaChartLine,
      href: '/dashboard?tab=analytics',
      children: [
        { label: 'Analytics dashboard', href: '/dashboard?tab=analytics' },
        { label: 'Demand for location', href: '/dashboard?tab=analytics&view=demand' },
        { label: 'Your pace of bookings', href: '/dashboard?tab=analytics&view=pace' },
        { label: 'Sales statistics', href: '/dashboard?tab=analytics&view=sales' },
        { label: 'Booker insights', href: '/dashboard?tab=analytics&view=booker' },
        { label: 'Bookwindow information', href: '/dashboard?tab=analytics&view=bookwindow' },
        { label: 'Cancellation characteristics', href: '/dashboard?tab=analytics&view=cancellation' },
        { label: 'Manage your competitive set', href: '/dashboard?tab=analytics&view=competitive' },
        { label: 'Genius report', href: '/dashboard?tab=analytics&view=genius' },
        { label: 'Ranking dashboard', href: '/dashboard?tab=analytics&view=ranking' },
        { label: 'Performance dashboard', href: '/dashboard?tab=analytics&view=performance' },
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
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
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
                      <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-2 min-w-[200px] z-[99999]">
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

        {/* Tab Navigation - Only unique tabs not in navbar */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-4 sm:space-x-8 overflow-x-auto scrollbar-hide">
              {[
                { id: 'dashboard', label: 'Home', icon: FaHome },
                { id: 'reservations', label: 'Reservations', icon: FaCalendarAlt },
                { id: 'reviews', label: 'Reviews', icon: FaStar },
                { id: 'messages', label: 'Messages', icon: FaComments },
                { id: 'photos', label: 'Photos', icon: FaImages },
                { id: 'settings', label: 'Settings', icon: FaCog }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`group inline-flex items-center py-3 sm:py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-[#a06b42] text-[#a06b42]'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <tab.icon className={`mr-2 text-sm ${
                    activeTab === tab.id ? 'text-[#a06b42]' : 'text-gray-400 group-hover:text-gray-500'
                  }`} />
                  {tab.label}
                </button>
              ))}
            </nav>
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
                    <p className="text-2xl font-bold text-green-600">RWF {stats.totalRevenue.toLocaleString()}</p>
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
                      <div className="text-3xl font-bold text-green-600">RWF {stats.totalRevenue.toLocaleString()}</div>
                      <p className="text-sm text-green-700 mt-2">+12% from last month</p>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                      <h3 className="text-lg font-semibold text-blue-900 mb-4">Average Daily Rate</h3>
                      <div className="text-3xl font-bold text-blue-600">RWF {Math.round(stats.totalRevenue / Math.max(stats.total, 1)).toLocaleString()}</div>
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

            {/* Analytics */}
            <div className="neu-card p-0">
              <div 
                className="flex items-center justify-between p-6 border-b cursor-pointer hover:bg-gray-50"
                onClick={() => toggleSection('advancedAnalytics')}
              >
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
                          <span className="font-semibold text-indigo-900">RWF {Math.round(stats.totalRevenue / Math.max(stats.total, 1)).toLocaleString()}</span>
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
                <option key={prop._id} value={prop._id}>{prop.name}</option>
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
                    <td className="px-4 py-3 text-right font-semibold">RWF {(b.totalAmount || 0).toLocaleString()}</td>
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
                        onClick={() => window.open(`${API_URL}/api/bookings/${b._id}/receipt`, '_blank')}
                        className="p-2 rounded bg-green-50 text-green-700 hover:bg-green-100"
                        aria-label="Receipt"
                        title="Download Receipt"
                      >
                        <FaFileInvoice />
                      </button>
                      <button
                        onClick={() => window.open(`${API_URL}/api/bookings/${b._id}/invoice`, '_blank')}
                        className="p-2 rounded bg-purple-50 text-purple-700 hover:bg-purple-100"
                        aria-label="Invoice"
                        title="Download Invoice"
                      >
                        <FaDownload />
                      </button>
                      <button
                        onClick={() => {
                          const guestId = b.guest?._id || b.guest;
                          const hostId = b.property?.host || req.user?.id;
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
                    <div className="text-3xl font-bold text-green-600">RWF {stats.totalRevenue.toLocaleString()}</div>
                    <p className="text-sm text-green-700 mt-2">All time earnings</p>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-blue-900 mb-4">Pending Revenue</h3>
                    <div className="text-3xl font-bold text-blue-600">RWF {stats.pendingRevenue.toLocaleString()}</div>
                    <p className="text-sm text-blue-700 mt-2">Awaiting payout</p>
                  </div>
                  <div className="bg-purple-50 border border-purple-200 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-purple-900 mb-4">Commission Paid</h3>
                    <div className="text-3xl font-bold text-purple-600">RWF {Math.round(stats.totalRevenue * 0.1).toLocaleString()}</div>
                    <p className="text-sm text-purple-700 mt-2">Platform fees (10%)</p>
                  </div>
                </div>
              </div>
            )}

            {financeView === 'invoices' && (
              <div className="neu-card p-6">
                <h2 className="text-xl font-semibold mb-6">Invoices</h2>
                <div className="space-y-4">
                  {financeFiltered.map((booking) => (
                    <div key={booking._id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-semibold text-gray-900">Invoice #{booking.confirmationCode || booking._id.slice(-8)}</div>
                          <div className="text-sm text-gray-600">{booking.property?.title || 'Property'}</div>
                          <div className="text-sm text-gray-500">{new Date(booking.createdAt).toLocaleDateString()}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-gray-900">RWF {(booking.totalAmount || 0).toLocaleString()}</div>
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
                          onClick={() => navigate(`/invoice/${booking._id}`)}
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          View Invoice
                        </button>
                        <button
                          onClick={() => {
                            window.open(`${API_URL}/api/bookings/${booking._id}/receipt`, '_blank');
                          }}
                          className="text-sm text-green-600 hover:text-green-800"
                        >
                          View Receipt
                        </button>
                      </div>
                    </div>
                  ))}
                  {financeFiltered.length === 0 && (
                    <div className="text-center py-12 text-gray-500">No invoices found</div>
                  )}
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
                      {financeFiltered.map((booking) => {
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
                      })}
                    </tbody>
                  </table>
                  {financeFiltered.length === 0 && (
                    <div className="text-center py-12 text-gray-500">No transactions found</div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-8">
            <div className="neu-card p-6">
              <h2 className="text-xl font-semibold mb-6">Performance Analytics</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-indigo-900 mb-2">Occupancy Rate</h3>
                  <div className="text-2xl font-bold text-indigo-600">{stats.occupancyRate}%</div>
                </div>
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-orange-900 mb-2">Avg Rating</h3>
                  <div className="text-2xl font-bold text-orange-600">{stats.averageRating}</div>
                </div>
                <div className="bg-teal-50 border border-teal-200 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-teal-900 mb-2">Total Bookings</h3>
                  <div className="text-2xl font-bold text-teal-600">{stats.total}</div>
                </div>
                <div className="bg-pink-50 border border-pink-200 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-pink-900 mb-2">Properties</h3>
                  <div className="text-2xl font-bold text-pink-600">{stats.totalProperties}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'boost' && (
          <div className="space-y-8">
            <div className="neu-card p-6">
              <h2 className="text-xl font-semibold mb-6">Boost Performance</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border border-blue-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-center mb-4">
                    <FaChartLine className="text-3xl text-blue-600 mr-3" />
                    <h3 className="text-lg font-semibold text-gray-900">Opportunity Centre</h3>
                  </div>
                  <p className="text-gray-600 mb-4">Discover ways to improve your property performance and increase bookings</p>
                  <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                    View Opportunities
                  </button>
                </div>
                <div className="border border-green-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-center mb-4">
                    <FaDollarSign className="text-3xl text-green-600 mr-3" />
                    <h3 className="text-lg font-semibold text-gray-900">Commission-free Bookings</h3>
                  </div>
                  <p className="text-gray-600 mb-4">Learn how to get direct bookings without platform commission</p>
                  <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">
                    Learn More
                  </button>
                </div>
                <div className="border border-purple-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-center mb-4">
                    <FaStar className="text-3xl text-purple-600 mr-3" />
                    <h3 className="text-lg font-semibold text-gray-900">Visibility Booster</h3>
                  </div>
                  <p className="text-gray-600 mb-4">Increase your property's visibility in search results</p>
                  <button className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors">
                    Boost Visibility
                  </button>
                </div>
                <div className="border border-orange-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-center mb-4">
                    <FaCalendarAlt className="text-3xl text-orange-600 mr-3" />
                    <h3 className="text-lg font-semibold text-gray-900">Long Stays Toolkit</h3>
                  </div>
                  <p className="text-gray-600 mb-4">Attract guests looking for extended stays</p>
                  <button className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors">
                    Enable Long Stays
                  </button>
                </div>
              </div>
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
              <h2 className="text-xl font-semibold mb-6">Guest Reviews</h2>
              <div className="text-center py-12">
                <FaStar className="text-6xl text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Reviews Yet</h3>
                <p className="text-gray-600">Reviews from guests will appear here</p>
              </div>
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
                      <option value="cash">Pay on Arrival</option>
                      <option value="mtn_mobile_money">MTN Mobile Money</option>
                    </select>
                  </div>
                  {directForm.paymentMethod === 'cash' && (
                    <div className="flex items-end">
                      <label className="inline-flex items-center space-x-2">
                        <input type="checkbox" checked={directForm.markPaid} onChange={e => onDirectChange('markPaid', e.target.checked)} />
                        <span className="text-sm">Mark as paid</span>
                      </label>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Guest Info</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input placeholder="First name" value={directForm.guestInfo.firstName} onChange={e => onDirectChange('guestInfo.firstName', e.target.value)} className="w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent" required />
                    <input placeholder="Last name" value={directForm.guestInfo.lastName} onChange={e => onDirectChange('guestInfo.lastName', e.target.value)} className="w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent" required />
                    <input type="email" placeholder="Email" value={directForm.guestInfo.email} onChange={e => onDirectChange('guestInfo.email', e.target.value)} className="w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                    <input type="tel" placeholder="Phone" value={directForm.guestInfo.phone} onChange={e => onDirectChange('guestInfo.phone', e.target.value)} className="w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
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

                <div className="flex items-center justify-end border-t pt-4">
                  <button type="submit" className="px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium">Create Booking</button>
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
