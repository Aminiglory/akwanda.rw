import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  FaHome, FaCalendarAlt, FaMoneyBillWave, FaCheckCircle, FaClock, FaEye, 
  FaEdit, FaTrash, FaPlus, FaFileInvoice, FaFilter, FaDownload, FaChartLine,
  FaUsers, FaBed, FaMapMarkerAlt, FaStar, FaExclamationTriangle, FaToggleOn, FaToggleOff,
  FaComments
} from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import BookingManagementPanel from '../components/BookingManagementPanel';
import RoomCalendarPanel from '../components/RoomCalendarPanel';
import MasterCalendar from '../components/MasterCalendar';
import ReservationDetailDrawer from '../components/ReservationDetailDrawer';
import PromotionsPanel from '../components/PromotionsPanel';
import FinancePanel from '../components/FinancePanel';
import AnalyticsPanel from '../components/AnalyticsPanel';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const EnhancedPropertyOwnerDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview'); // overview, properties, bookings, analytics
  const [properties, setProperties] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showBookingPanel, setShowBookingPanel] = useState(false);
  const [stats, setStats] = useState({
    totalProperties: 0,
    activeProperties: 0,
    totalBookings: 0,
    paidBookings: 0,
    pendingBookings: 0,
    unpaidBookings: 0,
    totalRevenue: 0,
    pendingRevenue: 0,
    commissionOwed: 0
  });
  const [addRoomOpen, setAddRoomOpen] = useState({}); // { [propertyId]: boolean }
  const [addRoomData, setAddRoomData] = useState({}); // { [propertyId]: { roomNumber, roomType, pricePerNight, capacity, amenities, images } }
  const [editingRoom, setEditingRoom] = useState(null); // { propertyId, room }
  const [editRoomData, setEditRoomData] = useState({}); // fields for edit
  const [openMenu, setOpenMenu] = useState(null); // 'rates' | 'promotions' | 'reservations' | 'property' | 'more'
  const [showMasterCalendar, setShowMasterCalendar] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch properties
      const propsRes = await fetch(`${API_URL}/api/properties/my-properties`, {
        credentials: 'include'
      });
      const propsData = await propsRes.json();
      
      if (propsRes.ok) {
        setProperties(propsData.properties || []);
      }

      // Fetch bookings
      const bookingsRes = await fetch(`${API_URL}/api/bookings/property-owner`, {
        credentials: 'include'
      });
      const bookingsData = await bookingsRes.json();
      
      if (bookingsRes.ok) {
        setBookings(bookingsData.bookings || []);
        calculateStats(propsData.properties || [], bookingsData.bookings || []);
      }
    } catch (error) {
      console.error('Dashboard fetch error:', error);
      toast.error('Failed to load dashboard data');
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
      fetchDashboardData();
    } catch (e) {
      toast.error(e.message);
    }
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
      fetchDashboardData();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const handleDeleteRoom = async (propertyId, room) => {
    if (!window.confirm('Delete this room? This cannot be undone.')) return;
    try {
      const res = await fetch(`${API_URL}/api/properties/${propertyId}/rooms/${room._id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      const data = await res.json().catch(()=>({}));
      if (!res.ok) throw new Error(data.message || 'Failed to delete room');
      toast.success('Room deleted');
      fetchDashboardData();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const calculateStats = (props, bookings) => {
    const totalProperties = props.length;
    const activeProperties = props.filter(p => p.isActive).length;
    const totalBookings = bookings.length;
    const paidBookings = bookings.filter(b => b.paymentStatus === 'paid').length;
    const pendingBookings = bookings.filter(b => b.paymentStatus === 'pending').length;
    const unpaidBookings = bookings.filter(b => b.paymentStatus === 'unpaid').length;
    
    const totalRevenue = bookings
      .filter(b => b.paymentStatus === 'paid')
      .reduce((sum, b) => sum + ((b.amountBeforeTax || b.totalAmount) - (b.commissionAmount || 0)), 0);
    
    const pendingRevenue = bookings
      .filter(b => b.paymentStatus === 'unpaid' || b.paymentStatus === 'pending')
      .reduce((sum, b) => sum + ((b.amountBeforeTax || b.totalAmount) - (b.commissionAmount || 0)), 0);

    const commissionOwed = bookings
      .filter(b => b.paymentStatus === 'paid' && !b.commissionPaid)
      .reduce((sum, b) => sum + (b.commissionAmount || 0), 0);

    setStats({
      totalProperties,
      activeProperties,
      totalBookings,
      paidBookings,
      pendingBookings,
      unpaidBookings,
      totalRevenue,
      pendingRevenue,
      commissionOwed
    });
  };

  const handleDeleteProperty = async (propertyId) => {
    if (!window.confirm('Are you sure you want to delete this property? This action cannot be undone.')) {
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/properties/${propertyId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to delete property');
      }

      toast.success('Property deleted successfully');
      fetchDashboardData();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleTogglePropertyStatus = async (propertyId, currentStatus) => {
    try {
      const res = await fetch(`${API_URL}/api/properties/${propertyId}/toggle-status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isActive: !currentStatus })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to update property status');
      }

      toast.success(`Property ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
      fetchDashboardData();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const formatCurrency = (amount) => {
    return `RWF ${amount.toLocaleString()}`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getPaymentStatusBadge = (status) => {
    const config = {
      paid: { bg: 'bg-green-100', text: 'text-green-800', label: 'Paid' },
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' },
      unpaid: { bg: 'bg-red-100', text: 'text-red-800', label: 'Pay on Arrival' },
      failed: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Failed' }
    };

    const { bg, text, label } = config[status] || config.pending;

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${bg} ${text}`}>
        {label}
      </span>
    );
  };

  const exportBookingsToCSV = () => {
    const csvData = bookings.map(booking => ({
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

  const handleViewBooking = (booking) => {
    setSelectedBooking(booking);
    setShowBookingPanel(true);
  };

  const handleCloseBookingPanel = () => {
    setShowBookingPanel(false);
    setSelectedBooking(null);
  };

  const handleBookingUpdate = () => {
    fetchDashboardData();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-8">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-3xl font-bold mb-2">Property Owner Dashboard</h1>
          <p className="text-blue-100">Manage your properties and track bookings</p>
        </div>
      </div>

      {/* Classified Navigation (Booking.com-style) */}
      <div className="bg-blue-800 text-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-2 py-2 overflow-x-auto no-scrollbar">
            {/* Home */}
            <button
              className={`flex items-center gap-2 px-3 py-2 rounded-lg ${activeTab==='overview' ? 'bg-blue-700' : 'hover:bg-blue-700/60'}`}
              onClick={() => { setActiveTab('overview'); setOpenMenu(null); }}
              title="Home"
            >
              <FaHome />
              <span className="hidden sm:inline">Home</span>
            </button>

            {/* Rates & Availability */}
            <div className="relative">
              <button
                className={`flex items-center gap-2 px-3 py-2 rounded-lg ${openMenu==='rates' ? 'bg-blue-700' : 'hover:bg-blue-700/60'}`}
                onClick={() => setOpenMenu(prev => prev==='rates' ? null : 'rates')}
                title="Rates & Availability"
              >
                <FaCalendarAlt />
                <span className="hidden sm:inline">Rates & Availability</span>
              </button>
              {openMenu==='rates' && (
                <div className="absolute left-0 mt-2 w-56 bg-white text-gray-800 rounded-xl shadow-xl ring-1 ring-black/5 z-20">
                  <div className="py-1">
                    <button onClick={() => { setShowMasterCalendar(true); setOpenMenu(null); }} className="w-full text-left px-4 py-2 hover:bg-gray-50">Calendar</button>
                    <button onClick={() => { setActiveTab('properties'); setOpenMenu(null); }} className="w-full text-left px-4 py-2 hover:bg-gray-50">Manage Rooms & Rates</button>
                  </div>
                </div>
              )}
            </div>

            {/* Promotions */}
            <div className="relative">
              <button
                className={`flex items-center gap-2 px-3 py-2 rounded-lg ${openMenu==='promotions' ? 'bg-blue-700' : 'hover:bg-blue-700/60'}`}
                onClick={() => setOpenMenu(prev => prev==='promotions' ? null : 'promotions')}
                title="Promotions"
              >
                <FaChartLine />
                <span className="hidden sm:inline">Promotions</span>
              </button>
              {openMenu==='promotions' && (
                <div className="absolute left-0 mt-2 w-56 bg-white text-gray-800 rounded-xl shadow-xl ring-1 ring-black/5 z-20">
                  <div className="py-1">
                    <button onClick={() => { setActiveTab('analytics'); setOpenMenu(null); }} className="w-full text-left px-4 py-2 hover:bg-gray-50">Performance</button>
                    <button onClick={() => { setActiveTab('analytics'); setOpenMenu(null); }} className="w-full text-left px-4 py-2 hover:bg-gray-50">Visibility Options</button>
                  </div>
                </div>
              )}
            </div>

            {/* Reservations */}
            <div className="relative">
              <button
                className={`flex items-center gap-2 px-3 py-2 rounded-lg ${openMenu==='reservations' ? 'bg-blue-700' : 'hover:bg-blue-700/60'}`}
                onClick={() => { setActiveTab('bookings'); setOpenMenu(prev => prev==='reservations' ? null : 'reservations'); }}
                title="Reservations"
              >
                <FaFileInvoice />
                <span className="hidden sm:inline">Reservations</span>
                {bookings?.length ? (
                  <span className="ml-1 inline-flex items-center justify-center text-xs bg-red-600 text-white rounded-full h-5 min-w-[20px] px-1">
                    {bookings.filter(b=>b.paymentStatus==='pending' || b.paymentStatus==='unpaid').length}
                  </span>
                ) : null}
              </button>
              {openMenu==='reservations' && (
                <div className="absolute left-0 mt-2 w-56 bg-white text-gray-800 rounded-xl shadow-xl ring-1 ring-black/5 z-20">
                  <div className="py-1">
                    <button onClick={() => { setActiveTab('bookings'); setOpenMenu(null); }} className="w-full text-left px-4 py-2 hover:bg-gray-50">All Reservations</button>
                    <button onClick={() => { setActiveTab('bookings'); setOpenMenu(null); }} className="w-full text-left px-4 py-2 hover:bg-gray-50">Pending Payments</button>
                  </div>
                </div>
              )}
            </div>

            {/* Property */}
            <div className="relative">
              <button
                className={`flex items-center gap-2 px-3 py-2 rounded-lg ${openMenu==='property' ? 'bg-blue-700' : 'hover:bg-blue-700/60'}`}
                onClick={() => setOpenMenu(prev => prev==='property' ? null : 'property')}
                title="Property"
              >
                <FaBed />
                <span className="hidden sm:inline">Property</span>
              </button>
              {openMenu==='property' && (
                <div className="absolute left-0 mt-2 w-56 bg-white text-gray-800 rounded-xl shadow-xl ring-1 ring-black/5 z-20">
                  <div className="py-1">
                    <button onClick={() => { setActiveTab('properties'); setOpenMenu(null); }} className="w-full text-left px-4 py-2 hover:bg-gray-50">My Properties</button>
                    <button onClick={() => { if (user?.isBlocked) { toast.error('Your account is deactivated. Listing is disabled.'); return; } setOpenMenu(null); navigate('/upload'); }} className="w-full text-left px-4 py-2 hover:bg-gray-50">Add Property</button>
                    <button onClick={() => { setActiveTab('properties'); setOpenMenu(null); }} className="w-full text-left px-4 py-2 hover:bg-gray-50">Policies & House Rules</button>
                  </div>
                </div>
              )}
            </div>

            {/* More */}
            <div className="relative">
              <button
                className={`flex items-center gap-2 px-3 py-2 rounded-lg ${openMenu==='more' ? 'bg-blue-700' : 'hover:bg-blue-700/60'}`}
                onClick={() => setOpenMenu(prev => prev==='more' ? null : 'more')}
                title="More"
              >
                <FaUsers />
                <span className="hidden sm:inline">More</span>
              </button>
              {openMenu==='more' && (
                <div className="absolute left-0 mt-2 w-56 bg-white text-gray-800 rounded-xl shadow-xl ring-1 ring-black/5 z-20">
                  <div className="py-1">
                    <button onClick={() => { setOpenMenu(null); navigate('/messages'); }} className="w-full text-left px-4 py-2 hover:bg-gray-50">Messages</button>
                    <button onClick={() => { setOpenMenu(null); navigate('/notifications'); }} className="w-full text-left px-4 py-2 hover:bg-gray-50">Notifications</button>
                    <button onClick={() => { setOpenMenu(null); navigate('/settings'); }} className="w-full text-left px-4 py-2 hover:bg-gray-50">Settings</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Deactivation banner */}
      {user?.isBlocked && (
        <div className="bg-red-50 border-y border-red-200">
          <div className="max-w-7xl mx-auto px-4 py-3 text-sm text-red-700">
            Your account is deactivated due to unpaid commissions. Actions are limited until reactivated.
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: FaChartLine },
              { id: 'properties', label: 'My Properties', icon: FaHome },
              { id: 'bookings', label: 'Bookings', icon: FaCalendarAlt },
              { id: 'analytics', label: 'Analytics', icon: FaMoneyBillWave }
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-2 border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Icon />
                  <span className="font-medium">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-600">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Properties</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.totalProperties}</p>
                    <p className="text-xs text-green-600 mt-1">{stats.activeProperties} active</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <FaHome className="text-2xl text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-600">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalRevenue)}</p>
                    <p className="text-xs text-gray-600 mt-1">From {stats.paidBookings} bookings</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <FaMoneyBillWave className="text-2xl text-green-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-yellow-600">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Pending Revenue</p>
                    <p className="text-2xl font-bold text-yellow-600">{formatCurrency(stats.pendingRevenue)}</p>
                    <p className="text-xs text-gray-600 mt-1">{stats.pendingBookings + stats.unpaidBookings} pending</p>
                  </div>
                  <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <FaClock className="text-2xl text-yellow-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-red-600">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Commission Owed</p>
                    <p className="text-2xl font-bold text-red-600">{formatCurrency(stats.commissionOwed)}</p>
                    <p className="text-xs text-gray-600 mt-1">To platform</p>
                  </div>
                  <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                    <FaExclamationTriangle className="text-2xl text-red-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => { if (user?.isBlocked) { toast.error('Your account is deactivated. Listing is disabled.'); return; } navigate('/upload'); }}
                  disabled={user?.isBlocked}
                  className="flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-4 rounded-lg font-medium transition-colors"
                >
                  <FaPlus />
                  <span>Add New Property</span>
                </button>
                <button
                  onClick={() => setActiveTab('bookings')}
                  className="flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-6 py-4 rounded-lg font-medium transition-colors"
                >
                  <FaCalendarAlt />
                  <span>View All Bookings</span>
                </button>
                <button
                  onClick={exportBookingsToCSV}
                  className="flex items-center justify-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-4 rounded-lg font-medium transition-colors"
                >
                  <FaDownload />
                  <span>Export Data</span>
                </button>
              </div>
            </div>

            {/* Recent Bookings */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Bookings</h2>
              {bookings.slice(0, 5).length === 0 ? (
                <p className="text-gray-600 text-center py-8">No bookings yet</p>
              ) : (
                <div className="space-y-4">
                  {bookings.slice(0, 5).map(booking => (
                    <div key={booking._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{booking.property?.title}</p>
                        <p className="text-sm text-gray-600">
                          {booking.guest?.firstName} {booking.guest?.lastName} • {formatDate(booking.checkIn)}
                        </p>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">{formatCurrency(booking.totalAmount)}</p>
                          {getPaymentStatusBadge(booking.paymentStatus)}
                        </div>
                        <button
                          onClick={() => navigate(`/booking-confirmation/${booking._id}`)}
                          className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                        >
                          <FaEye />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Properties Tab */}
        {activeTab === 'properties' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">My Properties</h2>
              <button
                onClick={() => { if (user?.isBlocked) { toast.error('Your account is deactivated. Listing is disabled.'); return; } navigate('/upload'); }}
                disabled={user?.isBlocked}
                className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                <FaPlus />
                <span>Add New Property</span>
              </button>
            </div>

            {properties.length === 0 ? (
              <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                <FaHome className="text-6xl text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Properties Yet</h3>
                <p className="text-gray-600 mb-6">Start by adding your first property</p>
                <button
                  onClick={() => { if (user?.isBlocked) { toast.error('Your account is deactivated. Listing is disabled.'); return; } navigate('/upload'); }}
                  disabled={user?.isBlocked}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-8 py-3 rounded-lg font-medium transition-colors"
                >
                  Add Property
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {properties.map(property => (
                  <div key={property._id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
                    <div className="relative h-48">
                      <img
                        src={property.images?.[0] || '/placeholder-property.jpg'}
                        alt={property.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 right-2">
                        {property.isActive ? (
                          <span className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                            Active
                          </span>
                        ) : (
                          <span className="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                            Inactive
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-lg text-gray-900 mb-2">{property.title}</h3>
                      <div className="space-y-2 text-sm text-gray-600 mb-4">
                        <div className="flex items-center space-x-2">
                          <FaMapMarkerAlt className="text-gray-400" />
                          <span>{property.city}, {property.country}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <FaBed className="text-gray-400" />
                          <span>{property.rooms?.length || 0} rooms</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <FaMoneyBillWave className="text-gray-400" />
                          <span>{formatCurrency(property.pricePerNight)}/night</span>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => navigate(`/apartment/${property._id}`)}
                          className="flex-1 flex items-center justify-center space-x-1 bg-blue-100 text-blue-600 px-3 py-2 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium"
                        >
                          <FaEye />
                          <span>View</span>
                        </button>
                        <button
                          onClick={() => { if (user?.isBlocked) { toast.error('Your account is deactivated. Editing is disabled.'); return; } navigate(`/edit-property/${property._id}`); }}
                          disabled={user?.isBlocked}
                          className="flex-1 flex items-center justify-center space-x-1 bg-green-100 text-green-600 px-3 py-2 rounded-lg hover:bg-green-200 disabled:opacity-50 transition-colors text-sm font-medium"
                        >
                          <FaEdit />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => { if (user?.isBlocked) { toast.error('Your account is deactivated. Status changes are disabled.'); return; } handleTogglePropertyStatus(property._id, property.isActive); }}
                          disabled={user?.isBlocked}
                          className={`flex-1 flex items-center justify-center space-x-1 px-3 py-2 rounded-lg transition-colors text-sm font-medium ${
                            property.isActive
                              ? 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200'
                              : 'bg-green-100 text-green-600 hover:bg-green-200'
                          } disabled:opacity-50`}
                        >
                          {property.isActive ? <FaToggleOff /> : <FaToggleOn />}
                          <span>{property.isActive ? 'Hide' : 'Show'}</span>
                        </button>
                        <button
                          onClick={() => { if (user?.isBlocked) { toast.error('Your account is deactivated. Delete is disabled.'); return; } handleDeleteProperty(property._id); }}
                          disabled={user?.isBlocked}
                          className="flex items-center justify-center bg-red-100 text-red-600 px-3 py-2 rounded-lg hover:bg-red-200 disabled:opacity-50 transition-colors text-sm font-medium"
                        >
                          <FaTrash />
                        </button>
                      </div>
                      <div className="mt-4 border-t pt-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-sm font-semibold text-gray-800">Room Availability</div>
                          <button
                            onClick={() => { if (user?.isBlocked) { toast.error('Your account is deactivated. Adding rooms is disabled.'); return; } setAddRoomOpen(prev => ({ ...prev, [property._id]: !prev[property._id] })); }}
                            disabled={user?.isBlocked}
                            className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                          >
                            <FaPlus /> Add Room
                          </button>
                        </div>

                        {addRoomOpen[property._id] && (
                          <div className="mb-4 p-4 bg-gray-50 rounded-lg border">
                            <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                              <input placeholder="Room Number" className="px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" value={(addRoomData[property._id]?.roomNumber)||''} onChange={e=>setAddRoomData(p=>({ ...p, [property._id]: { ...(p[property._id]||{}), roomNumber:e.target.value } }))} />
                              <select className="px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" value={(addRoomData[property._id]?.roomType)||''} onChange={e=>setAddRoomData(p=>({ ...p, [property._id]: { ...(p[property._id]||{}), roomType:e.target.value } }))}>
                                <option value="">Room Type</option>
                                {['single','double','suite','family','deluxe'].map(t=> (<option key={t} value={t}>{t}</option>))}
                              </select>
                              <input type="number" placeholder="Price/night" className="px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" value={(addRoomData[property._id]?.pricePerNight)||''} onChange={e=>setAddRoomData(p=>({ ...p, [property._id]: { ...(p[property._id]||{}), pricePerNight:e.target.value } }))} />
                              <input type="number" placeholder="Capacity" className="px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" value={(addRoomData[property._id]?.capacity)||''} onChange={e=>setAddRoomData(p=>({ ...p, [property._id]: { ...(p[property._id]||{}), capacity:e.target.value } }))} />
                              <input placeholder="Amenities (comma separated)" className="px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent md:col-span-2" value={(addRoomData[property._id]?.amenities)||''} onChange={e=>setAddRoomData(p=>({ ...p, [property._id]: { ...(p[property._id]||{}), amenities:e.target.value } }))} />
                              <input placeholder="Image URLs (comma separated)" className="px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent md:col-span-3" value={(addRoomData[property._id]?.images)||''} onChange={e=>setAddRoomData(p=>({ ...p, [property._id]: { ...(p[property._id]||{}), images:e.target.value } }))} />
                              <div className="md:col-span-3 flex gap-2">
                                <button onClick={()=>handleAddRoom(property._id)} disabled={user?.isBlocked} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded">Save Room</button>
                                <button onClick={()=>setAddRoomOpen(prev=>({...prev,[property._id]:false}))} className="flex-1 border px-4 py-2 rounded">Cancel</button>
                              </div>
                            </div>
                          </div>
                        )}

                        {Array.isArray(property.rooms) && property.rooms.length > 0 ? (
                          <div className="space-y-4">
                            {property.rooms.map((room) => (
                              <div key={room._id || room.roomNumber} className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="text-sm text-gray-700">{room.roomNumber} • {room.roomType} • Capacity {room.capacity}</div>
                                  <div className="flex gap-2">
                                    <button onClick={()=>{ if (user?.isBlocked) { toast.error('Your account is deactivated. Editing is disabled.'); return; } handleStartEditRoom(property._id, room); }} disabled={user?.isBlocked} className="px-3 py-1 text-xs rounded border disabled:opacity-50">Edit</button>
                                    <button onClick={()=>{ if (user?.isBlocked) { toast.error('Your account is deactivated. Delete is disabled.'); return; } handleDeleteRoom(property._id, room); }} disabled={user?.isBlocked} className="px-3 py-1 text-xs rounded border text-red-600 disabled:opacity-50">Delete</button>
                                  </div>
                                </div>
                                {editingRoom && editingRoom.propertyId===property._id && editingRoom.roomId===(room._id) && (
                                  <div className="p-3 bg-gray-50 border rounded">
                                    <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
                                      <input disabled={user?.isBlocked} className="px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50" value={editRoomData.roomNumber||''} onChange={e=>setEditRoomData(d=>({...d, roomNumber:e.target.value}))} />
                                      <select className="px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" value={editRoomData.roomType||''} onChange={e=>setEditRoomData(d=>({...d, roomType:e.target.value}))}>
                                        {['single','double','suite','family','deluxe'].map(t=> (<option key={t} value={t}>{t}</option>))}
                                      </select>
                                      <input disabled={user?.isBlocked} type="number" className="px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50" value={editRoomData.pricePerNight||''} onChange={e=>setEditRoomData(d=>({...d, pricePerNight:e.target.value}))} />
                                      <input disabled={user?.isBlocked} type="number" className="px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50" value={editRoomData.capacity||''} onChange={e=>setEditRoomData(d=>({...d, capacity:e.target.value}))} />
                                      <input disabled={user?.isBlocked} className="px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent md:col-span-2 disabled:opacity-50" placeholder="Amenities" value={editRoomData.amenities||''} onChange={e=>setEditRoomData(d=>({...d, amenities:e.target.value}))} />
                                      <input disabled={user?.isBlocked} className="px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent md:col-span-3 disabled:opacity-50" placeholder="Image URLs" value={editRoomData.images||''} onChange={e=>setEditRoomData(d=>({...d, images:e.target.value}))} />
                                      <div className="md:col-span-3 flex gap-2">
                                        <button onClick={handleSaveEditRoom} disabled={user?.isBlocked} className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-4 py-2 rounded">Save</button>
                                        <button onClick={()=>{setEditingRoom(null); setEditRoomData({});}} className="flex-1 border px-4 py-2 rounded">Cancel</button>
                                      </div>
                                    </div>
                                  </div>
                                )}
                                <RoomCalendarPanel
                                  key={(room._id || room.roomNumber)+"-cal"}
                                  propertyId={property._id}
                                  room={room}
                                  onChanged={fetchDashboardData}
                                  compact={true}
                                />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-600">No rooms configured for this property.</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Bookings Tab */}
        {activeTab === 'bookings' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <div className="flex items-center space-x-4">
                  <FaFilter className="text-gray-400" />
                  <div className="flex space-x-2">
                    {['all', 'paid', 'pending', 'unpaid'].map(status => (
                      <button
                        key={status}
                        onClick={() => setFilter(status)}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                          filter === status
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    onClick={exportBookingsToCSV}
                    className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    <FaDownload />
                    <span>Export</span>
                  </button>
                </div>
              </div>

              {bookings.filter(b => {
                if (filter !== 'all' && b.paymentStatus !== filter) return false;
                if (searchTerm && !b.confirmationCode?.toLowerCase().includes(searchTerm.toLowerCase()) &&
                    !b.property?.title?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
                return true;
              }).length === 0 ? (
                <div className="text-center py-12">
                  <FaCalendarAlt className="text-4xl text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No bookings found</h3>
                  <p className="text-gray-600">Try changing the filter or search term</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Booking</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Guest</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Dates</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Payment</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {bookings.filter(b => {
                        if (filter !== 'all' && b.paymentStatus !== filter) return false;
                        if (searchTerm && !b.confirmationCode?.toLowerCase().includes(searchTerm.toLowerCase()) &&
                            !b.property?.title?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
                        return true;
                      }).map(booking => (
                        <tr key={booking._id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <div>
                              <p className="font-semibold text-gray-900">{booking.property?.title}</p>
                              <p className="text-sm text-gray-600">{booking.confirmationCode}</p>
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
                              <p className="text-xs text-green-600">
                                You: {formatCurrency((booking.amountBeforeTax || booking.totalAmount) - booking.commissionAmount)}
                              </p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {getPaymentStatusBadge(booking.paymentStatus)}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleViewBooking(booking)}
                                className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                                title="Manage Booking"
                              >
                                <FaComments />
                              </button>
                              <button
                                onClick={() => navigate(`/booking-confirmation/${booking._id}`)}
                                className="p-2 bg-purple-100 text-purple-600 rounded-lg hover:bg-purple-200 transition-colors"
                                title="View Details"
                              >
                                <FaEye />
                              </button>
                              <button
                                onClick={() => window.open(`/booking-confirmation/${booking._id}`, '_blank')}
                                className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors"
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
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <AnalyticsPanel propertyOptions={properties} />
            <PromotionsPanel propertyOptions={properties} onChanged={fetchDashboardData} />
            <FinancePanel propertyOptions={properties} />
          </div>
        )}
      </div>

      {/* Booking Detail Drawer */}
      {selectedBooking && (
        <ReservationDetailDrawer
          booking={selectedBooking}
          open={showBookingPanel}
          onClose={handleCloseBookingPanel}
          onUpdated={handleBookingUpdate}
        />
      )}

      {/* Master Calendar Modal */}
      {showMasterCalendar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowMasterCalendar(false)} />
          <div className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh]">
            <div className="flex items-center justify-between px-5 py-4 bg-gray-50/70 sticky top-0 z-10">
              <div className="text-gray-900 font-semibold">Rates & Availability</div>
              <button className="px-3 py-1 border rounded" onClick={() => setShowMasterCalendar(false)}>Close</button>
            </div>
            <div className="p-5 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 56px)' }}>
              <MasterCalendar properties={properties} onChanged={fetchDashboardData} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedPropertyOwnerDashboard;
