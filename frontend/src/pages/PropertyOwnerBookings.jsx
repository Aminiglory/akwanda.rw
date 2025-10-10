import React, { useState, useEffect } from 'react';
import { FaCalendarAlt, FaUsers, FaMoneyBillWave, FaCheckCircle, FaClock, FaEye, FaFileInvoice, FaFilter, FaDownload, FaComments, FaHome, FaChartLine, FaPlus } from 'react-icons/fa';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import BookingManagementPanel from '../components/BookingManagementPanel';
import RoomCalendarPanel from '../components/RoomCalendarPanel';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const PropertyOwnerBookings = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [bookings, setBookings] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, paid, pending, unpaid
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('bookings'); // bookings, properties, analytics
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showBookingPanel, setShowBookingPanel] = useState(false);
  const [unreadByBooking, setUnreadByBooking] = useState({});
  const [stats, setStats] = useState({
    total: 0,
    paid: 0,
    pending: 0,
    unpaid: 0,
    totalRevenue: 0,
    pendingRevenue: 0,
    totalProperties: 0,
    activeProperties: 0
  });
  const [addRoomOpen, setAddRoomOpen] = useState({}); // { [propertyId]: boolean }
  const [addRoomData, setAddRoomData] = useState({});
  const [editingRoom, setEditingRoom] = useState(null); // { propertyId, roomId }
  const [editRoomData, setEditRoomData] = useState({});
  const [selectedRoomByProp, setSelectedRoomByProp] = useState({}); // { [propertyId]: 'all' | roomId }
  const [financeFilter, setFinanceFilter] = useState({ start: '', end: '', status: 'all' });
  const [analyticsRange, setAnalyticsRange] = useState(30); // 30, 90, 'ytd'
  const [visitorsKpis, setVisitorsKpis] = useState({ uniqueGuests: 0, totalBookings: 0, totalNights: 0, occupancyPercent: 0 });
  const [calendarView, setCalendarView] = useState('cards'); // cards | timeline
  const [timelineMonth, setTimelineMonth] = useState(() => new Date());
  const [calendarByProp, setCalendarByProp] = useState({}); // { [propertyId]: { month, days, rooms } }

  useEffect(() => {
    fetchBookings();
  }, []);

  // Sync tab from query param and keep URL updated
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab && ['bookings','properties','finance','analytics'].includes(tab) && tab !== activeTab) {
      setActiveTab(tab);
    }
    // Booking scope from navbar (all/paid/pending/unpaid)
    const scope = params.get('scope');
    if (scope && ['all','paid','pending','unpaid'].includes(scope)) {
      setFilter(scope);
    }
    // Finance status and view presets
    const finStatus = params.get('finance_status');
    if (finStatus && ['all','paid','pending','unpaid'].includes(finStatus)) {
      setFinanceFilter(f => ({ ...f, status: finStatus }));
    }
    const view = params.get('view');
    if (view === 'last30') {
      const now = new Date();
      const start = new Date(now); start.setDate(now.getDate()-29);
      setFinanceFilter(f => ({ ...f, start: start.toISOString().slice(0,10), end: now.toISOString().slice(0,10) }));
    } else if (view === 'mtd') {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      setFinanceFilter(f => ({ ...f, start: start.toISOString().slice(0,10), end: now.toISOString().slice(0,10) }));
    }
    // Analytics range presets
    const range = params.get('range');
    if (range === '30') setAnalyticsRange(30);
    else if (range === '90') setAnalyticsRange(90);
    else if (range === 'ytd') setAnalyticsRange('ytd');
    // Calendar view toggle (properties tab)
    const calv = params.get('calview');
    if (calv && ['cards','timeline'].includes(calv)) setCalendarView(calv);
    // Timeline month (YYYY-MM)
    const cm = params.get('calmonth');
    if (cm && /^\d{4}-\d{2}$/.test(cm)) {
      const [yy, mm] = cm.split('-').map(Number);
      setTimelineMonth(new Date(yy, mm - 1, 1));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  // Visitors analytics fetcher (owner-wide)
  useEffect(() => {
    if (activeTab !== 'analytics') return;
    const now = new Date();
    let start;
    if (analyticsRange === 'ytd') {
      start = new Date(now.getFullYear(), 0, 1);
    } else {
      const days = Number(analyticsRange || 30);
      start = new Date(now); start.setDate(now.getDate() - (days - 1));
    }
    const qs = new URLSearchParams({ start: start.toISOString().slice(0,10), end: now.toISOString().slice(0,10) });
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/bookings/owner/visitors-analytics?${qs.toString()}`, { credentials: 'include' });
        const data = await res.json();
        if (res.ok) setVisitorsKpis(data.kpis || { uniqueGuests: 0, totalBookings: 0, totalNights: 0, occupancyPercent: 0 });
      } catch (_) { /* ignore */ }
    })();
  }, [activeTab, analyticsRange]);

  const goTab = (tabId) => {
    setActiveTab(tabId);
    const params = new URLSearchParams(location.search);
    params.set('tab', tabId);
    navigate({ pathname: '/my-bookings', search: params.toString() }, { replace: false });
  };

  // Build YYYY-MM key for a Date
  const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;

  // Fetch backend monthly calendar for a property
  const fetchCalendar = async (propertyId, refDate) => {
    if (!propertyId || !refDate) return;
    const key = monthKey(refDate);
    try {
      const res = await fetch(`${API_URL}/api/properties/${propertyId}/calendar?month=${key}`, { credentials: 'include' });
      if (!res.ok) return; // silently fallback to client logic
      const data = await res.json();
      setCalendarByProp(prev => ({ ...prev, [propertyId]: data }));
    } catch (_) { /* ignore; fallback to client-side logic */ }
  };

  useEffect(() => {
    calculateStats();
  }, [bookings]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      
      // Fetch bookings
      const bookingsRes = await fetch(`${API_URL}/api/bookings/property-owner`, {
        credentials: 'include'
      });
      
      if (bookingsRes.ok) {
        const bookingsData = await bookingsRes.json();
        setBookings(bookingsData.bookings || []);
      } else {
        console.warn('Failed to fetch bookings');
        setBookings([]);
      }

      // Fetch unread messages grouped by booking
      try {
        const unreadRes = await fetch(`${API_URL}/api/messages/unread-by-booking`, { credentials: 'include' });
        if (unreadRes.ok) {
          const unreadData = await unreadRes.json();
          setUnreadByBooking(unreadData.unreadByBooking || {});
        } else {
          setUnreadByBooking({});
        }
      } catch (e) {
        console.warn('Unread-by-booking fetch failed:', e);
        setUnreadByBooking({});
      }
      
      // Fetch properties (with fallback to older endpoint)
      let loadedProperties = [];
      try {
        const propertiesRes = await fetch(`${API_URL}/api/properties/my-properties`, {
          credentials: 'include'
        });
        if (propertiesRes.ok) {
          const propertiesData = await propertiesRes.json();
          loadedProperties = propertiesData.properties || [];
        }
      } catch (e) {
        console.warn('Primary properties fetch failed:', e);
      }

      // Fallback to /api/properties/mine if primary route returned nothing
      if (!loadedProperties || loadedProperties.length === 0) {
        try {
          const altRes = await fetch(`${API_URL}/api/properties/mine`, {
            credentials: 'include'
          });
          if (altRes.ok) {
            const altData = await altRes.json();
            loadedProperties = altData.properties || [];
          }
        } catch (e) {
          console.warn('Fallback properties fetch failed:', e);
        }
      }
      setProperties(loadedProperties || []);
    } catch (error) {
      console.error('Fetch error:', error);
      setBookings([]);
      setProperties([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRoom = async (propertyId) => {
    try {
      const payload = addRoomData[propertyId] || {};
      if (!payload.roomNumber || !payload.roomType || !payload.pricePerNight || !payload.capacity) {
        toast.error('Please fill all required room fields');
        return;
      }
      const res = await fetch(`${API_URL}/api/properties/${propertyId}/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...payload,
          pricePerNight: Number(payload.pricePerNight),
          capacity: Number(payload.capacity),
          amenities: payload.amenities ? String(payload.amenities).split(',').map(s=>s.trim()).filter(Boolean) : [],
          images: payload.images ? String(payload.images).split(',').map(s=>s.trim()).filter(Boolean) : []
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to add room');
      toast.success('Room added');
      setAddRoomOpen(prev => ({ ...prev, [propertyId]: false }));
      setAddRoomData(prev => ({ ...prev, [propertyId]: {} }));
      fetchBookings();
    } catch (e) { toast.error(e.message); }
  };

  const handleStartEditRoom = (propertyId, room) => {
    setEditingRoom({ propertyId, roomId: room._id });
    setEditRoomData({
      roomNumber: room.roomNumber,
      roomType: room.roomType,
      pricePerNight: room.pricePerNight,
      capacity: room.capacity,
      amenities: (room.amenities || []).join(', '),
      images: (room.images || []).join(', '),
      maxAdults: room.maxAdults ?? '',
      maxChildren: room.maxChildren ?? '',
      maxInfants: room.maxInfants ?? ''
    });
  };

  const handleSaveEditRoom = async () => {
    if (!editingRoom) return;
    const { propertyId, roomId } = editingRoom;
    try {
      const payload = { ...editRoomData };
      const res = await fetch(`${API_URL}/api/properties/${propertyId}/rooms/${roomId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...payload,
          pricePerNight: payload.pricePerNight != null ? Number(payload.pricePerNight) : undefined,
          capacity: payload.capacity != null ? Number(payload.capacity) : undefined,
          maxAdults: payload.maxAdults !== '' ? Number(payload.maxAdults) : undefined,
          maxChildren: payload.maxChildren !== '' ? Number(payload.maxChildren) : undefined,
          maxInfants: payload.maxInfants !== '' ? Number(payload.maxInfants) : undefined,
          amenities: payload.amenities ? String(payload.amenities).split(',').map(s=>s.trim()).filter(Boolean) : undefined,
          images: payload.images ? String(payload.images).split(',').map(s=>s.trim()).filter(Boolean) : undefined
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update room');
      toast.success('Room updated');
      setEditingRoom(null);
      setEditRoomData({});
      fetchBookings();
    } catch (e) { toast.error(e.message); }
  };

  const handleDeleteRoom = async (propertyId, room) => {
    if (!window.confirm('Delete this room? This cannot be undone.')) return;
    try {
      const res = await fetch(`${API_URL}/api/properties/${propertyId}/rooms/${room._id}`, { method: 'DELETE', credentials: 'include' });
      const data = await res.json().catch(()=>({}));
      if (!res.ok) throw new Error(data.message || 'Failed to delete room');
      toast.success('Room deleted');
      fetchBookings();
    } catch (e) { toast.error(e.message); }
  };

  const calculateStats = () => {
    const total = bookings.length;
    const totalProperties = properties.length;
    const activeProperties = properties.filter(p => p.isActive).length;
    const paid = bookings.filter(b => b.paymentStatus === 'paid').length;
    const pending = bookings.filter(b => b.paymentStatus === 'pending').length;
    const unpaid = bookings.filter(b => b.paymentStatus === 'unpaid').length;
    
    const totalRevenue = bookings
      .filter(b => b.paymentStatus === 'paid')
      .reduce((sum, b) => sum + ((b.amountBeforeTax || b.totalAmount) - (b.commissionAmount || 0)), 0);
    
    const pendingRevenue = bookings
      .filter(b => b.paymentStatus === 'unpaid' || b.paymentStatus === 'pending')
      .reduce((sum, b) => sum + ((b.amountBeforeTax || b.totalAmount) - (b.commissionAmount || 0)), 0);

    setStats({ total, paid, pending, unpaid, totalRevenue, pendingRevenue, totalProperties, activeProperties });
  };

  const handleViewBooking = (booking) => {
    setSelectedBooking(booking);
    setShowBookingPanel(true);
  };

  const handleCloseBookingPanel = () => {
    setShowBookingPanel(false);
    setSelectedBooking(null);
  };

  const handleBookingUpdate = () => {
    fetchBookings();
  };

  const getFilteredBookings = () => {
    let filtered = bookings;

    // Apply payment status filter
    if (filter !== 'all') {
      filtered = filtered.filter(b => b.paymentStatus === filter);
    }

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(b => 
        b.confirmationCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.property?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.guest?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.guest?.lastName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    return `RWF ${amount.toLocaleString()}`;
  };

  const getPaymentStatusBadge = (status) => {
    const statusConfig = {
      paid: { bg: 'bg-green-100', text: 'text-green-800', icon: FaCheckCircle, label: 'Paid' },
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: FaClock, label: 'Pending' },
      unpaid: { bg: 'bg-red-100', text: 'text-red-800', icon: FaClock, label: 'Unpaid (Pay on Arrival)' },
      failed: { bg: 'bg-gray-100', text: 'text-gray-800', icon: FaClock, label: 'Failed' }
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        <Icon className="mr-1" />
        {config.label}
      </span>
    );
  };

  const exportToCSV = () => {
    const csvData = getFilteredBookings().map(booking => ({
      'Confirmation Code': booking.confirmationCode,
      'Property': booking.property?.title || 'N/A',
      'Guest': `${booking.guest?.firstName || ''} ${booking.guest?.lastName || ''}`,
      'Check-in': formatDate(booking.checkIn),
      'Check-out': formatDate(booking.checkOut),
      'Guests': booking.numberOfGuests,
      'Total Amount': booking.totalAmount,
      'Tax Amount': booking.taxAmount || 0,
      'Commission': booking.commissionAmount,
      'Your Earnings': (booking.amountBeforeTax || booking.totalAmount) - booking.commissionAmount,
      'Payment Status': booking.paymentStatus,
      'Payment Method': booking.paymentMethod,
      'Transaction ID': booking.transactionId || 'N/A'
    }));

    const csv = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bookings-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success('Bookings exported successfully!');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your bookings...</p>
        </div>
      </div>
    );
  }

  // If the property owner has no listings, show a clear CTA and stop here
  if ((properties || []).length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-3xl mx-auto px-4">
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-8 text-white">
              <h1 className="text-3xl font-bold mb-2">Become a Property Owner on AKWANDA</h1>
              <p className="text-blue-100">You need at least one active listing to access booking tracking and guest messaging.</p>
            </div>
            <div className="p-8">
              <div className="space-y-4">
                <p className="text-gray-700">
                  Add your first property to start receiving bookings, track payments, and chat with your guests in real time.
                </p>
                <ul className="list-disc list-inside text-gray-600">
                  <li>Full booking tracking (paid, pending, pay on arrival)</li>
                  <li>Guest–Owner messaging with notifications</li>
                  <li>Receipts with EBM tax breakdown</li>
                  <li>Export bookings to CSV</li>
                </ul>
                <div className="pt-4">
                  <button
                    onClick={() => navigate('/upload')}
                    className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                  >
                    <span>Add Your First Listing</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
          {/* Empty-state helper text and CTA only (owner links live in Navbar) */}
        </div>
      </div>
    );
  }

  const filteredBookings = getFilteredBookings();

  // Helpers for timeline view
  const getMonthDays = (refDate) => {
    const y = refDate.getFullYear();
    const m = refDate.getMonth();
    const first = new Date(y, m, 1);
    const last = new Date(y, m + 1, 0);
    const days = [];
    for (let d = 1; d <= last.getDate(); d++) days.push(new Date(y, m, d));
    return days;
  };
  const overlaps = (date, checkIn, checkOut) => {
    const ci = new Date(checkIn), co = new Date(checkOut);
    const d0 = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    return d0 >= new Date(ci.getFullYear(), ci.getMonth(), ci.getDate()) && d0 < new Date(co.getFullYear(), co.getMonth(), co.getDate());
  };
  const isClosedOn = (room, date) => {
    const d0 = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    return (room.closedDates || []).some(cd => {
      if (!cd?.startDate || !cd?.endDate) return false;
      const cs = new Date(cd.startDate), ce = new Date(cd.endDate);
      return d0 >= new Date(cs.getFullYear(), cs.getMonth(), cs.getDate()) && d0 < new Date(ce.getFullYear(), ce.getMonth(), ce.getDate());
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header + Tabs */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Property Bookings</h1>
          <p className="text-gray-600 mb-4">Track bookings, view room calendars, and manage availability</p>
          <div className="flex items-center gap-4 border-b">
            {[
              { id: 'bookings', label: 'Bookings', icon: FaCalendarAlt },
              { id: 'properties', label: 'Calendars', icon: FaHome },
              { id: 'finance', label: 'Finance', icon: FaMoneyBillWave },
              { id: 'analytics', label: 'Analytics', icon: FaChartLine }
            ].map(tab => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => goTab(tab.id)}
                  className={`flex items-center gap-2 px-3 py-2 -mb-px border-b-2 ${active ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
                >
                  <Icon />
                  <span className="font-medium text-sm">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="neu-card p-6 hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1 font-medium">Total Bookings</p>
                <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center shadow-lg">
                <FaCalendarAlt className="text-2xl text-blue-600" />
              </div>
            </div>
          </div>

          <div className="neu-card p-6 hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1 font-medium">Paid Bookings</p>
                <p className="text-3xl font-bold text-green-600">{stats.paid}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-green-200 rounded-xl flex items-center justify-center shadow-lg">
                <FaCheckCircle className="text-2xl text-green-600" />
              </div>
            </div>
          </div>

          <div className="neu-card p-6 hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1 font-medium">Total Revenue</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalRevenue)}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-green-200 rounded-xl flex items-center justify-center shadow-lg">
                <FaMoneyBillWave className="text-2xl text-green-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2 font-medium">After commission</p>
          </div>

          <div className="neu-card p-6 hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1 font-medium">Pending Revenue</p>
                <p className="text-2xl font-bold text-yellow-600">{formatCurrency(stats.pendingRevenue)}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-yellow-100 to-yellow-200 rounded-xl flex items-center justify-center shadow-lg">
                <FaClock className="text-2xl text-yellow-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2 font-medium">{stats.pending + stats.unpaid} pending bookings</p>
          </div>
        </div>

        {activeTab === 'bookings' && (
        <div className="neu-card p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center space-x-4">
              <FaFilter className="text-gray-400" />
              <div className="flex space-x-2">
                {['all', 'paid', 'pending', 'unpaid'].map(status => (
                  <button
                    key={status}
                    onClick={() => setFilter(status)}
                    className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                      filter === status
                        ? 'bg-blue-600 text-white shadow-lg transform scale-105'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-105'
                    }`}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <input
                type="text"
                placeholder="Search bookings..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
              />
              <button
                onClick={exportToCSV}
                className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-300 hover:scale-105 shadow-lg"
              >
                <FaDownload />
                <span>Export CSV</span>
              </button>
            </div>
          </div>
        </div>
        )}

        {activeTab === 'finance' && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white rounded-xl shadow p-4">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                <div className="md:col-span-2">
                  <label className="block text-xs text-gray-600 mb-1">Start date</label>
                  <input type="date" className="px-3 py-2 border rounded w-full" value={financeFilter.start} onChange={e=>setFinanceFilter(f=>({...f,start:e.target.value}))} />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs text-gray-600 mb-1">End date</label>
                  <input type="date" className="px-3 py-2 border rounded w-full" value={financeFilter.end} onChange={e=>setFinanceFilter(f=>({...f,end:e.target.value}))} />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Status</label>
                  <select className="px-3 py-2 border rounded w-full" value={financeFilter.status} onChange={e=>setFinanceFilter(f=>({...f,status:e.target.value}))}>
                    <option value="all">All</option>
                    <option value="paid">Paid</option>
                    <option value="pending">Pending</option>
                    <option value="unpaid">Unpaid</option>
                  </select>
                </div>
              </div>
            </div>

            {/* KPIs */}
            {(() => {
              const inRange = (b) => {
                const s = financeFilter.start ? new Date(financeFilter.start) : null;
                const e = financeFilter.end ? new Date(financeFilter.end) : null;
                const d = new Date(b.createdAt || b.checkIn);
                if (s && d < s) return false;
                if (e) { const eod = new Date(e); eod.setHours(23,59,59,999); if (d > eod) return false; }
                return true;
              };
              let rows = (bookings||[]).filter(inRange);
              if (financeFilter.status !== 'all') rows = rows.filter(b => b.paymentStatus === financeFilter.status);
              const paid = rows.filter(b => b.paymentStatus==='paid');
              const pending = rows.filter(b => b.paymentStatus==='pending' || b.paymentStatus==='unpaid');
              const grossPaid = paid.reduce((s,b)=> s + (b.totalAmount||0), 0);
              const commissionPaid = paid.reduce((s,b)=> s + (b.commissionAmount||0), 0);
              const netPaid = paid.reduce((s,b)=> s + ((b.amountBeforeTax || b.totalAmount) - (b.commissionAmount || 0)), 0);
              const grossPending = pending.reduce((s,b)=> s + (b.totalAmount||0), 0);
              return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-white rounded-xl shadow p-6">
                    <p className="text-sm text-gray-600 mb-1">Gross Paid</p>
                    <p className="text-2xl font-bold text-gray-900">RWF {Math.round(grossPaid).toLocaleString()}</p>
                  </div>
                  <div className="bg-white rounded-xl shadow p-6">
                    <p className="text-sm text-gray-600 mb-1">Commission on Paid</p>
                    <p className="text-2xl font-bold text-gray-900">RWF {Math.round(commissionPaid).toLocaleString()}</p>
                  </div>
                  <div className="bg-white rounded-xl shadow p-6">
                    <p className="text-sm text-gray-600 mb-1">Net Earnings (Paid)</p>
                    <p className="text-2xl font-bold text-green-600">RWF {Math.round(netPaid).toLocaleString()}</p>
                  </div>
                  <div className="bg-white rounded-xl shadow p-6">
                    <p className="text-sm text-gray-600 mb-1">Gross Pending/Unpaid</p>
                    <p className="text-2xl font-bold text-yellow-600">RWF {Math.round(grossPending).toLocaleString()}</p>
                  </div>
                </div>
              );
            })()}

            {/* Ledger */}
            <div className="bg-white rounded-xl shadow overflow-hidden">
              <div className="px-6 py-4 border-b flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Payout Ledger</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      // export filtered rows to CSV
                      const inRange = (b) => {
                        const s = financeFilter.start ? new Date(financeFilter.start) : null;
                        const e = financeFilter.end ? new Date(financeFilter.end) : null;
                        const d = new Date(b.createdAt || b.checkIn);
                        if (s && d < s) return false;
                        if (e) { const eod = new Date(e); eod.setHours(23,59,59,999); if (d > eod) return false; }
                        return true;
                      };
                      let rows = (bookings||[]).filter(inRange);
                      if (financeFilter.status !== 'all') rows = rows.filter(b => b.paymentStatus === financeFilter.status);
                      const csvRows = rows.map(b => ({
                        Date: new Date(b.createdAt || b.checkIn).toLocaleDateString(),
                        Booking: b.confirmationCode,
                        Property: b.property?.title || 'N/A',
                        Gross: b.totalAmount || 0,
                        Commission: b.commissionAmount || 0,
                        Net: ((b.amountBeforeTax || b.totalAmount || 0) - (b.commissionAmount || 0)),
                        Status: b.paymentStatus,
                        Reconciliation: b.paymentStatus==='paid' ? (b.transactionId ? 'Settled' : 'Unsettled') : 'N/A'
                      }));
                      if (csvRows.length === 0) return toast.error('Nothing to export');
                      const header = Object.keys(csvRows[0]).join(',');
                      const lines = csvRows.map(r => Object.values(r).join(','));
                      const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url; a.download = `finance-${new Date().toISOString().split('T')[0]}.csv`; a.click();
                      URL.revokeObjectURL(url);
                      toast.success('Finance exported');
                    }}
                    className="text-sm px-3 py-2 rounded bg-green-600 text-white hover:bg-green-700"
                  >Export CSV</button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Booking</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gross</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Commission</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Net</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reconciliation</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {(() => {
                      const inRange = (b) => {
                        const s = financeFilter.start ? new Date(financeFilter.start) : null;
                        const e = financeFilter.end ? new Date(financeFilter.end) : null;
                        const d = new Date(b.createdAt || b.checkIn);
                        if (s && d < s) return false;
                        if (e) { const eod = new Date(e); eod.setHours(23,59,59,999); if (d > eod) return false; }
                        return true;
                      };
                      let rows = (bookings||[]).filter(inRange);
                      if (financeFilter.status !== 'all') rows = rows.filter(b => b.paymentStatus === financeFilter.status);
                      return rows.map(b => {
                        const gross = b.totalAmount || 0;
                        const commission = b.commissionAmount || 0;
                        const net = (b.amountBeforeTax || b.totalAmount || 0) - commission;
                        const recon = b.paymentStatus==='paid' ? (b.transactionId ? 'Settled' : 'Unsettled') : 'N/A';
                        return (
                          <tr key={b._id}>
                            <td className="px-6 py-3 text-sm text-gray-700">{new Date(b.createdAt || b.checkIn).toLocaleDateString()}</td>
                            <td className="px-6 py-3 text-sm">
                              <div className="font-medium text-gray-900">{b.confirmationCode}</div>
                              <div className="text-gray-600">{b.property?.title || 'N/A'}</div>
                            </td>
                            <td className="px-6 py-3 text-sm text-gray-900">RWF {Math.round(gross).toLocaleString()}</td>
                            <td className="px-6 py-3 text-sm text-gray-900">RWF {Math.round(commission).toLocaleString()}</td>
                            <td className="px-6 py-3 text-sm text-green-700">RWF {Math.round(net).toLocaleString()}</td>
                            <td className="px-6 py-3 text-sm capitalize text-gray-700">{b.paymentStatus}</td>
                            <td className="px-6 py-3 text-sm text-gray-700">{recon}</td>
                            <td className="px-6 py-3 text-sm">
                              <button
                                onClick={() => window.open(`/booking-confirmation/${b._id}`, '_blank')}
                                className="inline-flex items-center gap-2 px-3 py-1.5 border rounded text-gray-700 hover:bg-gray-50"
                                title="View/Print Invoice"
                              >
                                <FaFileInvoice /> Invoice
                              </button>
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'bookings' && (
        <div className="neu-card overflow-hidden">
          {filteredBookings.length === 0 ? (
            <div className="text-center py-12">
              <FaCalendarAlt className="text-4xl text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No bookings found</h3>
              <p className="text-gray-600">
                {filter !== 'all' ? 'Try changing the filter' : 'Your bookings will appear here'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Booking Details
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Guest
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Dates
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Payment
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredBookings.map((booking) => (
                    <tr key={booking._id} className="hover:bg-gray-50 transition-all duration-300 hover:scale-[1.01]">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-semibold text-gray-900 flex items-center gap-2">
                            {booking.property?.title || 'N/A'}
                            {unreadByBooking[booking._id] > 0 && (
                              <span
                                className="inline-block w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse"
                                title={`${unreadByBooking[booking._id]} unread message${unreadByBooking[booking._id] > 1 ? 's' : ''}`}
                                aria-label="Unread messages"
                              />
                            )}
                          </p>
                          <p className="text-sm text-gray-600">Code: {booking.confirmationCode}</p>
                          <p className="text-xs text-gray-500">{booking.numberOfGuests} guests</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900">
                            {booking.guest?.firstName} {booking.guest?.lastName}
                          </p>
                          <p className="text-sm text-gray-600">{booking.guest?.email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <p className="text-gray-900">{formatDate(booking.checkIn)}</p>
                          <p className="text-gray-600">to {formatDate(booking.checkOut)}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-semibold text-gray-900">{formatCurrency(booking.totalAmount)}</p>
                          <p className="text-xs text-gray-600">Tax: {formatCurrency(booking.taxAmount || 0)}</p>
                          <p className="text-xs text-green-600">
                            You earn: {formatCurrency((booking.amountBeforeTax || booking.totalAmount) - booking.commissionAmount)}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-2">
                          {getPaymentStatusBadge(booking.paymentStatus)}
                          <p className="text-xs text-gray-600 capitalize">
                            {booking.paymentMethod?.replace('_', ' ')}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleViewBooking(booking)}
                            className="relative p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-all duration-300 hover:scale-110 shadow-md"
                            title="Manage & Message"
                          >
                            <FaComments />
                            {unreadByBooking[booking._id] > 0 && (
                              <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold leading-none text-white bg-red-600 rounded-full animate-pulse">
                                {unreadByBooking[booking._id]}
                              </span>
                            )}
                          </button>
                          <button
                            onClick={() => navigate(`/booking-confirmation/${booking._id}`)}
                            className="p-2 bg-purple-100 text-purple-600 rounded-lg hover:bg-purple-200 transition-all duration-300 hover:scale-110 shadow-md"
                            title="View Details"
                          >
                            <FaEye />
                          </button>
                          <button
                            onClick={() => {
                              // Open receipt in new tab
                              window.open(`/booking-confirmation/${booking._id}`, '_blank');
                            }}
                            className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-all duration-300 hover:scale-110 shadow-md"
                            title="View Receipt"
                          >
                            <FaFileInvoice />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Visitors KPIs from backend */}
              <div className="bg-white rounded-xl shadow p-6">
                <p className="text-sm text-gray-600 mb-1">Unique Guests</p>
                <p className="text-3xl font-bold text-gray-900">{visitorsKpis.uniqueGuests || 0}</p>
              </div>
              <div className="bg-white rounded-xl shadow p-6">
                <p className="text-sm text-gray-600 mb-1">Total Bookings</p>
                <p className="text-3xl font-bold text-gray-900">{visitorsKpis.totalBookings || 0}</p>
              </div>
              <div className="bg-white rounded-xl shadow p-6">
                <p className="text-sm text-gray-600 mb-1">Room-nights Booked</p>
                <p className="text-3xl font-bold text-gray-900">{visitorsKpis.totalNights || 0}</p>
              </div>
              <div className="bg-white rounded-xl shadow p-6">
                <p className="text-sm text-gray-600 mb-1">Occupancy (range)</p>
                <p className="text-3xl font-bold text-blue-700">{Math.round(visitorsKpis.occupancyPercent || 0)}%</p>
              </div>
              {(() => {
                const now = new Date();
                let start;
                if (analyticsRange === 'ytd') {
                  start = new Date(now.getFullYear(), 0, 1);
                } else {
                  const days = Number(analyticsRange || 30);
                  start = new Date(now); start.setDate(now.getDate() - (days - 1));
                }
                start.setHours(0,0,0,0);
                // Collect rooms count
                const roomsCount = (properties || []).reduce((sum, p) => sum + (p.rooms?.length || 0), 0);
                // Sum booked nights overlapping last 30 days
                const bookedNights = (bookings || []).reduce((acc, b) => {
                  const ci = new Date(b.checkIn), co = new Date(b.checkOut);
                  // iterate per-night end-exclusive (safe for small window)
                  let cur = new Date(Math.max(ci, start));
                  const end = new Date(Math.min(co, now));
                  while (cur < end) { acc += 1; cur.setDate(cur.getDate()+1); }
                  return acc;
                }, 0);
                const daysWindow = Math.max(1, Math.ceil((now - start) / (1000*60*60*24)) + 1);
                const totalRoomNights = roomsCount * daysWindow;
                const occupancy = totalRoomNights > 0 ? Math.round((bookedNights/totalRoomNights)*100) : 0;
                const revenue30 = (bookings||[]) 
                  .filter(b => new Date(b.checkIn) <= now && new Date(b.checkOut) >= start)
                  .filter(b => b.paymentStatus === 'paid')
                  .reduce((s,b)=> s + ((b.amountBeforeTax || b.totalAmount) - (b.commissionAmount || 0)), 0);
                const adr = (bookings||[])
                  .filter(b => b.paymentStatus === 'paid')
                  .reduce((s,b)=> s + (b.totalAmount || 0), 0) / Math.max(1, (bookings||[]).filter(b => b.paymentStatus==='paid').length);

                return (
                  <>
                    <div className="bg-white rounded-xl shadow p-6">
                      <p className="text-sm text-gray-600 mb-1">Occupancy (30 days)</p>
                      <p className="text-3xl font-bold text-gray-900">{occupancy}%</p>
                      <div className="mt-3 h-2 bg-gray-100 rounded">
                        <div className="h-2 bg-blue-600 rounded" style={{ width: `${Math.min(100, occupancy)}%` }}></div>
                      </div>
                    </div>
                    <div className="bg-white rounded-xl shadow p-6">
                      <p className="text-sm text-gray-600 mb-1">Revenue (30 days)</p>
                      <p className="text-3xl font-bold text-green-600">RWF {Math.round(revenue30).toLocaleString()}</p>
                    </div>
                    <div className="bg-white rounded-xl shadow p-6">
                      <p className="text-sm text-gray-600 mb-1">ADR</p>
                      <p className="text-3xl font-bold text-gray-900">RWF {Math.round(adr || 0).toLocaleString()}</p>
                    </div>
                    <div className="bg-white rounded-xl shadow p-6">
                      <p className="text-sm text-gray-600 mb-1">Rooms</p>
                      <p className="text-3xl font-bold text-gray-900">{roomsCount}</p>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Weekly trend (last 8 weeks) */}
            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Bookings Trend (last 8 weeks)</h3>
              {(() => {
                const weeks = [];
                const now = new Date();
                const startOfWeek = (d) => { const x = new Date(d); x.setDate(x.getDate()-x.getDay()); x.setHours(0,0,0,0); return x; };
                let cursor = startOfWeek(now);
                for (let i=0;i<8;i++) {
                  const end = new Date(cursor); end.setDate(end.getDate()+7);
                  const count = (bookings||[]).filter(b => {
                    const ci = new Date(b.checkIn), co = new Date(b.checkOut);
                    return ci < end && co > cursor; // overlap
                  }).length;
                  weeks.unshift({ label: `${cursor.toLocaleDateString('en-US',{month:'short', day:'numeric'})}`, count });
                  cursor = new Date(cursor); cursor.setDate(cursor.getDate()-7);
                }
                const max = Math.max(1, ...weeks.map(w=>w.count));
                return (
                  <div className="flex items-end gap-2 h-40">
                    {weeks.map((w, idx) => (
                      <div key={idx} className="flex-1 flex flex-col items-center">
                        <div className="w-full bg-blue-100 rounded-t" style={{ height: `${(w.count/max)*100}%` }}></div>
                        <div className="text-xs text-gray-600 mt-2">{w.label}</div>
                        <div className="text-xs text-gray-900 font-medium">{w.count}</div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Rooms performance */}
            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Room Performance (30 days)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(properties||[]).flatMap(p => (p.rooms||[]).map(r => ({ p, r }))).slice(0, 12).map(({p, r}) => {
                  const now = new Date(); const start = new Date(now); start.setDate(now.getDate()-29); start.setHours(0,0,0,0);
                  const rBookings = (bookings||[]).filter(b => String(b.room||'') === String(r._id));
                  const nights = rBookings.reduce((acc,b)=>{ let ci=new Date(b.checkIn), co=new Date(b.checkOut); let cur=new Date(Math.max(ci,start)); const end=new Date(Math.min(co,now)); while(cur<end){ acc+=1; cur.setDate(cur.getDate()+1);} return acc; },0);
                  return (
                    <div key={r._id || r.roomNumber} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div className="font-medium text-gray-900">{p.title} • {r.roomNumber} ({r.roomType})</div>
                        <div className="text-sm text-gray-600">Nights: {nights}</div>
                      </div>
                      <div className="mt-2 h-2 bg-gray-100 rounded">
                        <div className="h-2 bg-green-600 rounded" style={{ width: `${Math.min(100, (nights/30)*100)}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'properties' && (
          <div className="space-y-6">
            {/* Calendars header controls */}
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">View:</div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setCalendarView('cards'); const params = new URLSearchParams(location.search); params.set('tab','properties'); params.set('calview','cards'); navigate({ pathname: '/my-bookings', search: params.toString() }); }}
                  className={`px-3 py-1.5 rounded ${calendarView==='cards'?'bg-blue-600 text-white':'border text-gray-700'}`}
                >Cards</button>
                <button
                  onClick={() => { setCalendarView('timeline'); const params = new URLSearchParams(location.search); params.set('tab','properties'); params.set('calview','timeline'); navigate({ pathname: '/my-bookings', search: params.toString() }); }}
                  className={`px-3 py-1.5 rounded ${calendarView==='timeline'?'bg-blue-600 text-white':'border text-gray-700'}`}
                >Timeline</button>
              </div>
            </div>

            {properties.map((p) => (
              <div key={p._id} className="bg-white rounded-xl shadow p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{p.title}</h3>
                    <p className="text-sm text-gray-600">{p.city} • {p.address}</p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded border text-gray-600">{(p.category || 'apartment').toUpperCase()}</span>
                </div>
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-semibold text-gray-800">Rooms</div>
                  <button onClick={()=>setAddRoomOpen(prev=>({...prev,[p._id]:!prev[p._id]}))} className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700">
                    <FaPlus /> Add Room
                  </button>
                </div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm text-gray-700">View mode</label>
                  <select
                    className="px-3 py-2 border rounded"
                    value={selectedRoomByProp[p._id] || 'all'}
                    onChange={(e)=>setSelectedRoomByProp(s=>({...s, [p._id]: e.target.value}))}
                  >
                    <option value="all">All rooms</option>
                    {(p.rooms||[]).map(r => (
                      <option key={r._id || r.roomNumber} value={r._id}>{r.roomNumber} • {r.roomType}</option>
                    ))}
                  </select>
                </div>
                {addRoomOpen[p._id] && (
                  <div className="mb-4 p-4 bg-gray-50 rounded-lg border">
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                      <input placeholder="Room Number" className="px-3 py-2 border rounded" value={(addRoomData[p._id]?.roomNumber)||''} onChange={e=>setAddRoomData(s=>({...s,[p._id]:{...(s[p._id]||{}),roomNumber:e.target.value}}))} />
                      <select className="px-3 py-2 border rounded" value={(addRoomData[p._id]?.roomType)||''} onChange={e=>setAddRoomData(s=>({...s,[p._id]:{...(s[p._id]||{}),roomType:e.target.value}}))}>
                        <option value="">Room Type</option>
                        {['single','double','suite','family','deluxe'].map(t=> (<option key={t} value={t}>{t}</option>))}
                      </select>
                      <input type="number" placeholder="Price/night" className="px-3 py-2 border rounded" value={(addRoomData[p._id]?.pricePerNight)||''} onChange={e=>setAddRoomData(s=>({...s,[p._id]:{...(s[p._id]||{}),pricePerNight:e.target.value}}))} />
                      <input type="number" placeholder="Capacity" className="px-3 py-2 border rounded" value={(addRoomData[p._id]?.capacity)||''} onChange={e=>setAddRoomData(s=>({...s,[p._id]:{...(s[p._id]||{}),capacity:e.target.value}}))} />
                      <input placeholder="Amenities (comma separated)" className="px-3 py-2 border rounded md:col-span-2" value={(addRoomData[p._id]?.amenities)||''} onChange={e=>setAddRoomData(s=>({...s,[p._id]:{...(s[p._id]||{}),amenities:e.target.value}}))} />
                      <input placeholder="Image URLs (comma separated)" className="px-3 py-2 border rounded md:col-span-3" value={(addRoomData[p._id]?.images)||''} onChange={e=>setAddRoomData(s=>({...s,[p._id]:{...(s[p._id]||{}),images:e.target.value}}))} />
                      <div className="md:col-span-3 flex gap-2">
                        <button onClick={()=>handleAddRoom(p._id)} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">Save Room</button>
                        <button onClick={()=>setAddRoomOpen(prev=>({...prev,[p._id]:false}))} className="flex-1 border px-4 py-2 rounded">Cancel</button>
                      </div>
                    </div>
                  </div>
                )}
                {Array.isArray(p.rooms) && p.rooms.length > 0 ? (
                  calendarView === 'timeline' ? (
                    (() => {
                      const days = getMonthDays(timelineMonth);
                      const propBookings = (bookings||[]).filter(b => String(b.property?._id || b.property) === String(p._id));
                      return (
                        <div className="overflow-auto">
                          <div className="min-w-[800px]">
                            {/* Month controls */}
                            <div className="flex items-center justify-between mb-2">
                              <div className="text-sm font-semibold text-gray-800">{timelineMonth.toLocaleDateString('en-US',{ month:'long', year:'numeric' })}</div>
                              <div className="flex gap-2">
                                <button
                                  className="px-3 py-1 border rounded"
                                  onClick={() => {
                                    const next = new Date(timelineMonth.getFullYear(), timelineMonth.getMonth() - 1, 1);
                                    setTimelineMonth(next);
                                    const params = new URLSearchParams(location.search);
                                    params.set('tab','properties'); params.set('calview','timeline'); params.set('calmonth', `${next.getFullYear()}-${String(next.getMonth()+1).padStart(2,'0')}`);
                                    navigate({ pathname: '/my-bookings', search: params.toString() });
                                  }}
                                >Prev</button>
                                <button
                                  className="px-3 py-1 border rounded"
                                  onClick={() => {
                                    const next = new Date();
                                    setTimelineMonth(new Date(next.getFullYear(), next.getMonth(), 1));
                                    const params = new URLSearchParams(location.search);
                                    params.set('tab','properties'); params.set('calview','timeline'); params.set('calmonth', `${next.getFullYear()}-${String(next.getMonth()+1).padStart(2,'0')}`);
                                    navigate({ pathname: '/my-bookings', search: params.toString() });
                                  }}
                                >This month</button>
                                <button
                                  className="px-3 py-1 border rounded"
                                  onClick={() => {
                                    const next = new Date(timelineMonth.getFullYear(), timelineMonth.getMonth() + 1, 1);
                                    setTimelineMonth(next);
                                    const params = new URLSearchParams(location.search);
                                    params.set('tab','properties'); params.set('calview','timeline'); params.set('calmonth', `${next.getFullYear()}-${String(next.getMonth()+1).padStart(2,'0')}`);
                                    navigate({ pathname: '/my-bookings', search: params.toString() });
                                  }}
                                >Next</button>
                              </div>
                            </div>
                            {/* Header row */}
                            <div className="grid" style={{ gridTemplateColumns: `200px repeat(${days.length}, 1fr)` }}>
                              <div className="p-2 text-xs font-semibold text-gray-700">Room</div>
                              {days.map((d,i)=>(<div key={i} className="p-1 text-[10px] text-center text-gray-600">{d.getDate()}</div>))}
                            </div>
                            {/* Rooms rows */}
                            {(p.rooms||[]).map((r,ri)=>{
                              return (
                                <div key={r._id || r.roomNumber} className="grid items-stretch" style={{ gridTemplateColumns: `200px repeat(${days.length}, 1fr)` }}>
                                  <div className="p-2 text-xs border-b text-gray-800">{r.roomNumber} • {r.roomType}</div>
                                  {days.map((d,di)=>{
                                    // Backend-first statuses
                                    const cal = calendarByProp[p._id];
                                    let status = null;
                                    let bookingIds = [];
                                    let lockReason;

                                    if (cal && cal.month === monthKey(timelineMonth)) {
                                      const calRoom = (cal.rooms || []).find(cr => String(cr.roomId) === String(r._id));
                                      if (calRoom) {
                                        const dayIndex = d.getDate() - 1; // 0-based index
                                        const dayObj = calRoom.daily && calRoom.daily[dayIndex];
                                        if (dayObj) {
                                          status = dayObj.status; // 'available' | 'booked' | 'closed'
                                          bookingIds = dayObj.bookingIds || [];
                                          lockReason = dayObj.lockReason;
                                        }
                                      }
                                    }

                                    // Fallback to client-side inference
                                    let bkg = null;
                                    if (!status) {
                                      bkg = propBookings.find(b => String(b.room||'') === String(r._id) && overlaps(d, b.checkIn, b.checkOut));
                                      const guessedBooked = !!bkg;
                                      const guessedClosed = isClosedOn(r, d);
                                      status = guessedBooked ? 'booked' : (guessedClosed ? 'closed' : 'available');
                                    }

                                    const isToday = d.toDateString()===new Date().toDateString();
                                    const cls = status === 'booked'
                                      ? 'bg-blue-200 border-blue-300'
                                      : status === 'closed'
                                        ? 'bg-red-200 border-red-300'
                                        : (isToday ? 'bg-green-50 border-green-200' : 'bg-white');
                                    const title = status === 'booked'
                                      ? 'Booked'
                                      : status === 'closed'
                                        ? (lockReason || 'Closed')
                                        : d.toLocaleDateString();

                                    return (
                                      <div
                                        key={di}
                                        className={`h-6 border ${cls} ${status==='booked' ? 'cursor-pointer' : 'cursor-default'}`}
                                        title={title}
                                        onClick={() => {
                                          if (status === 'booked') {
                                            // Prefer backend bookingIds to open panel
                                            if (bookingIds.length > 0) {
                                              const found = (bookings || []).find(b => String(b._id) === String(bookingIds[0]));
                                              if (found) { setSelectedBooking(found); setShowBookingPanel(true); return; }
                                            }
                                            // Fallback to client-side found booking
                                            if (!bkg) {
                                              bkg = propBookings.find(b => String(b.room||'') === String(r._id) && overlaps(d, b.checkIn, b.checkOut));
                                            }
                                            if (bkg) { setSelectedBooking(bkg); setShowBookingPanel(true); }
                                          }
                                        }}
                                      ></div>
                                    );
                                  })}
                                </div>
                              );
                            })}
                            <div className="flex gap-3 mt-3 text-xs text-gray-600">
                              <div><span className="inline-block w-3 h-3 bg-blue-200 border border-blue-300 mr-1 align-middle"></span>Booked</div>
                              <div><span className="inline-block w-3 h-3 bg-red-200 border border-red-300 mr-1 align-middle"></span>Closed</div>
                              <div><span className="inline-block w-3 h-3 bg-green-100 border border-green-300 mr-1 align-middle"></span>Today</div>
                            </div>
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {(p.rooms.filter(r => (selectedRoomByProp[p._id] && selectedRoomByProp[p._id] !== 'all') ? String(r._id) === String(selectedRoomByProp[p._id]) : true)).map((room) => (
                        <div key={room._id || room.roomNumber} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="text-sm text-gray-700">{room.roomNumber} • {room.roomType} • Capacity {room.capacity}</div>
                            <div className="flex gap-2">
                              <button onClick={()=>handleStartEditRoom(p._id, room)} className="px-3 py-1 text-xs rounded border">Edit</button>
                              <button onClick={()=>handleDeleteRoom(p._id, room)} className="px-3 py-1 text-xs rounded border text-red-600">Delete</button>
                            </div>
                          </div>
                          {editingRoom && editingRoom.propertyId===p._id && editingRoom.roomId===(room._id) && (
                            <div className="p-3 bg-gray-50 border rounded">
                              <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
                                <input className="px-3 py-2 border rounded" value={editRoomData.roomNumber||''} onChange={e=>setEditRoomData(d=>({...d, roomNumber:e.target.value}))} />
                                <select className="px-3 py-2 border rounded" value={editRoomData.roomType||''} onChange={e=>setEditRoomData(d=>({...d, roomType:e.target.value}))}>
                                  {['single','double','suite','family','deluxe'].map(t=> (<option key={t} value={t}>{t}</option>))}
                                </select>
                                <input type="number" className="px-3 py-2 border rounded" value={editRoomData.pricePerNight||''} onChange={e=>setEditRoomData(d=>({...d, pricePerNight:e.target.value}))} />
                                <input type="number" className="px-3 py-2 border rounded" value={editRoomData.capacity||''} onChange={e=>setEditRoomData(d=>({...d, capacity:e.target.value}))} />
                                <input className="px-3 py-2 border rounded md:col-span-2" placeholder="Amenities" value={editRoomData.amenities||''} onChange={e=>setEditRoomData(d=>({...d, amenities:e.target.value}))} />
                                <input className="px-3 py-2 border rounded md:col-span-3" placeholder="Image URLs" value={editRoomData.images||''} onChange={e=>setEditRoomData(d=>({...d, images:e.target.value}))} />
                                <div className="md:col-span-3 flex gap-2">
                                  <button onClick={handleSaveEditRoom} className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded">Save</button>
                                  <button onClick={()=>{setEditingRoom(null); setEditRoomData({});}} className="flex-1 border px-4 py-2 rounded">Cancel</button>
                                </div>
                              </div>
                            </div>
                          )}
                          <RoomCalendarPanel
                            key={(room._id || room.roomNumber)+"-cal"}
                            propertyId={p._id}
                            room={room}
                            onChanged={fetchBookings}
                          />
                        </div>
                      ))}
                    </div>
                  )
                ) : (
                  <p className="text-sm text-gray-600">No rooms configured for this property.</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Summary Footer */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">Record Keeping Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-blue-700 font-medium">Paid Bookings:</p>
              <p className="text-blue-900 text-xl font-bold">{stats.paid}</p>
              <p className="text-blue-600">Revenue: {formatCurrency(stats.totalRevenue)}</p>
            </div>
            <div>
              <p className="text-yellow-700 font-medium">Pending Payments:</p>
              <p className="text-yellow-900 text-xl font-bold">{stats.pending}</p>
              <p className="text-yellow-600">Expected: {formatCurrency(stats.pendingRevenue)}</p>
            </div>
            <div>
              <p className="text-red-700 font-medium">Pay on Arrival:</p>
              <p className="text-red-900 text-xl font-bold">{stats.unpaid}</p>
              <p className="text-red-600">To be collected at check-in</p>
            </div>
          </div>
        </div>
      </div>

      {showBookingPanel && selectedBooking && (
        <BookingManagementPanel
          booking={selectedBooking}
          onClose={handleCloseBookingPanel}
          onUpdate={handleBookingUpdate}
        />
      )}
    </div>
  );
};

export default PropertyOwnerBookings;
