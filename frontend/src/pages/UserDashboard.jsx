import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLocale } from '../contexts/LocaleContext';
import { FaChartLine, FaUsers, FaBed, FaCalendarAlt, FaDollarSign, FaStar, FaMapMarkerAlt, FaEdit, FaTrash, FaPlus, FaEye, FaCheckCircle, FaTimesCircle, FaClock, FaHome, FaMoneyBillWave, FaCalendarCheck, FaCalendarTimes, FaComments } from 'react-icons/fa';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { safeApiGet, apiGet, apiPost, apiPatch, apiDelete } from '../utils/apiUtils';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const makeAbsolute = (u) => {
  if (!u) return u;
  let s = String(u).replace(/\\/g, '/');
  if (!s.startsWith('http')) {
    if (!s.startsWith('/')) s = `/${s}`;
    return `${API_URL}${s}`;
  }
  return s;
};

const UserDashboard = () => {
  const { user, updateAvatar } = useAuth();
  const { formatCurrencyRWF } = useLocale() || {};

  const [activeTab, setActiveTab] = useState('overview');
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState({
    totalProperties: 0,
    totalBookings: 0,
    totalEarnings: 0,
    pendingBookings: 0,
    monthlyEarnings: 0,
    averageRating: 0,
    occupancyRate: 0
  });

  const [properties, setProperties] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [unreadCount, setUnreadCount] = useState(0);
  
  const getBookingCountFor = (propertyId) => {
    try {
      const pid = String(propertyId || '');
      return bookings.filter(b => String(b.property?._id || b.property) === pid).length;
    } catch (_) { return 0; }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Use enhanced API utilities with automatic retry and better error handling
      const [propertiesData, bookingsData, messagesData] = await Promise.all([
        safeApiGet('/api/properties/mine', { 
          fallback: { properties: [] },
          timeout: 15000
        }),
        safeApiGet('/api/bookings/property-owner', { 
          fallback: { bookings: [] },
          timeout: 15000
        }),
        safeApiGet('/api/messages/unread-count', { 
          fallback: { count: 0 },
          timeout: 10000
        })
      ]);

      const properties = propertiesData.properties || [];
      const bookings = bookingsData.bookings || [];

      setProperties(properties);
      setBookings(bookings);
      setUnreadCount(messagesData.count || 0);

      // Initialize selected property from localStorage if available and still valid
      try {
        const stored = localStorage.getItem('lastSelectedPropertyId');
        const exists = stored && properties.find(p => String(p._id) === String(stored));
        if (exists) {
          setSelectedPropertyId(String(exists._id));
        } else if (properties.length > 0 && !selectedPropertyId) {
          setSelectedPropertyId(String(properties[0]._id));
        }
      } catch (_) {
        if (properties.length > 0 && !selectedPropertyId) {
          setSelectedPropertyId(String(properties[0]._id));
        }
      }
    } catch (error) {
      console.error('User dashboard data fetch error:', error);
      toast.error('Failed to load dashboard data. Please try again.');
      
      // Set fallback data
      setProperties([]);
      setBookings([]);
      setMetrics({
        totalProperties: 0,
        totalBookings: 0,
        totalEarnings: 0,
        pendingBookings: 0,
        monthlyEarnings: 0,
        averageRating: 0,
        occupancyRate: 0
      });
    }
  };

  // Recalculate metrics whenever properties, bookings, or selected property change
  useEffect(() => {
    const props = properties || [];
    const bks = bookings || [];

    const averageRating = props.reduce((sum, p) => {
      const ratings = p.ratings || [];
      return sum + (ratings.length > 0 ? ratings.reduce((s, r) => s + r.rating, 0) / ratings.length : 0);
    }, 0) / (props.length || 1);

    // Narrow bookings to the selected property for property-level metrics
    const bookingsForSelected = selectedPropertyId
      ? bks.filter(b => String(b.property?._id || b.property) === String(selectedPropertyId))
      : bks;

    // Earnings (total & monthly) and pending bookings are per selected property if one is chosen
    const totalEarnings = bookingsForSelected
      .filter(b => b.status === 'confirmed' || b.status === 'ended')
      .reduce((sum, b) => sum + (b.totalAmount - (b.commissionAmount || 0)), 0);

    const monthlyEarnings = bookingsForSelected
      .filter(b => {
        const bookingDate = new Date(b.createdAt);
        const currentMonth = new Date();
        return bookingDate.getMonth() === currentMonth.getMonth() &&
               bookingDate.getFullYear() === currentMonth.getFullYear() &&
               (b.status === 'confirmed' || b.status === 'ended');
      })
      .reduce((sum, b) => sum + (b.totalAmount - (b.commissionAmount || 0)), 0);

    const pendingBookings = bookingsForSelected.filter(b => b.status === 'pending' || b.status === 'awaiting').length;

    // For TOTAL PROPERTIES card and Occupancy Rate, respect the selected property
    const effectiveProps = selectedPropertyId
      ? props.filter(p => String(p._id) === String(selectedPropertyId))
      : props;

    const totalPropertiesMetric = selectedPropertyId
      ? (effectiveProps.length > 0 ? 1 : 0)
      : props.length;

    const occupancyRate = effectiveProps.length > 0
      ? (bookingsForSelected.filter(b => b.status === 'confirmed').length / (effectiveProps.length * 30)) * 100
      : 0;

    setMetrics({
      totalProperties: totalPropertiesMetric,
      totalBookings: bookingsForSelected.length,
      totalEarnings,
      pendingBookings,
      monthlyEarnings,
      averageRating: Math.round(averageRating * 10) / 10,
      occupancyRate: Math.round(occupancyRate)
    });
  }, [properties, bookings, selectedPropertyId]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'awaiting':
        return 'bg-orange-100 text-orange-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'ended':
        return 'bg-blue-100 text-blue-800';
      case 'commission_due':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const renderStars = (rating) => {
    if (!rating) return null;
    return Array.from({ length: 5 }, (_, i) => (
      <FaStar
        key={i}
        className={`${i < Math.floor(rating) ? 'text-yellow-400' : 'text-gray-300'}`}
      />
    ));
  };

  const handleBookingAction = async (bookingId, action) => {
    try {
      let data;
      if (action === 'cancel') {
        // Use status endpoint to cancel
        data = await apiPatch(`/api/bookings/${bookingId}/status`, {
          status: 'cancelled'
        });
      } else if (action === 'confirm') {
        // Existing confirm endpoint
        data = await apiPost(`/api/bookings/${bookingId}/confirm`, {});
      } else {
        throw new Error('Unsupported action');
      }

      toast.success(`Booking ${action}ed successfully`);
      fetchDashboardData();
    } catch (error) {
      console.error(`Failed to ${action} booking:`, error);
      toast.error(error.message || `Failed to ${action} booking`);
    }
  };

  const handleRoomClose = async (propertyId, roomId, startDate, endDate, reason) => {
    try {
      const data = await apiPost(`/api/properties/${propertyId}/rooms/${roomId}/close`, {
        startDate,
        endDate,
        reason
      });
      
      toast.success('Room closed successfully');
      fetchDashboardData();
    } catch (error) {
      console.error('Failed to close room:', error);
      toast.error(error.message || 'Failed to close room');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="neu-card-inset mx-4 mt-4 mb-8">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="animate-fade-in-down">
              <h1 className="text-4xl font-bold text-gray-900 tracking-tight">PROPERTY OWNER DASHBOARD</h1>
              <p className="text-gray-600 mt-2 text-lg">Manage Your Properties And Track Your Earnings</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center gap-3">
                {user?.avatar ? (
                  <img
                    src={user.avatar.startsWith('http') ? user.avatar : `${API_URL}${user.avatar.startsWith('/') ? '' : '/'}${user.avatar}`}
                    alt={user?.firstName || 'Avatar'}
                    className="w-10 h-10 rounded-full object-cover ring-2 ring-blue-100"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center ring-2 ring-blue-100">
                    <span className="text-sm font-semibold">{(user?.firstName?.[0] || user?.email?.[0] || 'U').toUpperCase()}</span>
                  </div>
                )}
                <label className="neu-btn text-sm cursor-pointer animate-fade-in-up-delayed">
                  UPDATE AVATAR
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        await updateAvatar(file, user?.userType === 'admin');
                        toast.success('Profile photo updated');
                      } catch (err) {
                        toast.error(err.message || 'Failed to update');
                      } finally {
                        e.target.value = '';
                      }
                    }}
                  />
                </label>
              </div>
              <Link to="/upload" className="btn-primary text-white px-8 py-3 font-semibold flex items-center gap-3 animate-fade-in-up-slow">
                <FaPlus className="animate-bounce-gentle" />
                ADD NEW PROPERTY
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Property Selector for dashboard metrics */}
        {properties.length > 0 && (
          <div className="flex justify-end mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">View metrics for</label>
              <select
                value={selectedPropertyId}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedPropertyId(val);
                  try { localStorage.setItem('lastSelectedPropertyId', val); } catch (_) {}
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[220px]"
              >
                <option value="">All properties</option>
                {properties.map((p) => {
                  const name = p.title || p.name || 'Untitled property';
                  const location = [p.city, p.address].filter(Boolean).join(', ');
                  const label = location ? `${location} - ${name}` : name;
                  return (
                    <option key={p._id} value={p._id}>{label}</option>
                  );
                })}
              </select>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="neu-card p-6 animate-fade-in-up">
            <div className="flex items-center">
              <div className="neu-card-inset p-4">
                <FaHome className="text-blue-600 text-2xl animate-float" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">TOTAL PROPERTIES</p>
                <p className="text-3xl font-bold text-gray-900">{metrics.totalProperties}</p>
              </div>
            </div>
          </div>
          
          <div className="neu-card p-6 animate-fade-in-up-delayed">
            <div className="flex items-center">
              <div className="neu-card-inset p-4">
                <FaCalendarCheck className="text-green-600 text-2xl animate-float-delayed" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">TOTAL BOOKINGS</p>
                <p className="text-3xl font-bold text-gray-900">{metrics.totalBookings}</p>
              </div>
            </div>
          </div>

          <div className="neu-card p-6 animate-fade-in-up-slow">
            <div className="flex items-center">
              <div className="neu-card-inset p-4">
                <FaMoneyBillWave className="text-yellow-600 text-2xl animate-float-slow" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">TOTAL EARNINGS</p>
                <p className="text-3xl font-bold text-gray-900">{formatCurrencyRWF ? formatCurrencyRWF(metrics.totalEarnings || 0) : `RWF ${(metrics.totalEarnings || 0).toLocaleString()}`}</p>
              </div>
            </div>
          </div>

          <div className="neu-card p-6 animate-fade-in-up-slower">
            <div className="flex items-center">
              <div className="neu-card-inset p-4">
                <FaStar className="text-purple-600 text-2xl animate-bounce-gentle" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">AVERAGE RATING</p>
                <p className="text-3xl font-bold text-gray-900">{metrics.averageRating}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <div className="flex items-center">
              <div className="p-3 bg-orange-100 rounded-xl">
                <FaClock className="text-orange-600 text-xl" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending Bookings</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.pendingBookings}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <div className="flex items-center">
              <div className="p-3 bg-indigo-100 rounded-xl">
                <FaDollarSign className="text-indigo-600 text-xl" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">This Month</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrencyRWF ? formatCurrencyRWF(metrics.monthlyEarnings || 0) : `RWF ${(metrics.monthlyEarnings || 0).toLocaleString()}`}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <div className="flex items-center">
              <div className="p-3 bg-pink-100 rounded-xl">
                <FaChartLine className="text-pink-600 text-xl" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Occupancy Rate</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.occupancyRate}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-2xl shadow-lg mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'overview', label: 'Overview', icon: FaChartLine },
                { id: 'properties', label: 'My Properties', icon: FaHome },
                { id: 'bookings', label: 'Bookings', icon: FaCalendarAlt },
                { id: 'calendar', label: 'Calendar', icon: FaCalendarCheck },
                { id: 'earnings', label: 'Earnings', icon: FaMoneyBillWave }
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-300 flex items-center gap-2 ${
                    activeTab === id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon />
                  {label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-gray-50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Bookings</h3>
                    <div className="space-y-3">
                      {bookings.slice(0, 5).map((booking) => (
                        <div key={booking._id} className="flex items-center justify-between p-3 bg-white rounded-lg">
                          <div>
                            <p className="font-medium text-gray-900">{booking.property?.title}</p>
                            <p className="text-sm text-gray-600">{booking.guest?.firstName} {booking.guest?.lastName}</p>
                          </div>
                          <div className="text-right">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                              {booking.status}
                            </span>
                            <p className="text-sm text-gray-600 mt-1">{formatCurrencyRWF ? formatCurrencyRWF(booking.totalAmount || 0) : `RWF ${(booking.totalAmount || 0).toLocaleString()}`}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">My Properties</h3>
                    <div className="space-y-3">
                      {properties.slice(0, 5).map((property) => (
                        <div key={property._id} className="flex items-center justify-between p-3 bg-white rounded-lg">
                          <div>
                            <p className="font-medium text-gray-900">{property.title}</p>
                            {property.propertyNumber && (
                              <p className="text-xs text-gray-500">{property.propertyNumber}</p>
                            )}
                            <p className="text-sm text-gray-600">{property.city}</p>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center">
                              {renderStars(property.ratings?.length ? property.ratings.reduce((sum, r) => sum + r.rating, 0) / property.ratings.length : 0)}
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{formatCurrencyRWF ? formatCurrencyRWF(property.pricePerNight || 0) : `RWF ${(property.pricePerNight || 0).toLocaleString()}`}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Manage Bookings & Messages Tile */}
                {metrics.totalProperties > 0 ? (
                  <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="p-3 bg-blue-100 rounded-xl">
                          <FaComments className="text-blue-600 text-xl" />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600">Owner Tools</p>
                          <h3 className="text-xl font-semibold text-gray-900">Manage Bookings & Messages</h3>
                          <p className="text-gray-600">Open your bookings dashboard to chat with guests and manage statuses.</p>
                        </div>
                      </div>
                      <Link
                        to="/my-bookings"
                        className="relative px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
                      >
                        Open Dashboard
                        {unreadCount > 0 && (
                          <span className="absolute -top-2 -right-2 inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
                            {unreadCount}
                          </span>
                        )}
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-blue-900">Add your first listing to enable owner tools</h3>
                        <p className="text-blue-800">Once you add a property, you'll unlock booking tracking and guest messaging.</p>
                      </div>
                      <Link
                        to="/upload"
                        className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
                      >
                        Add Listing
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Properties Tab */}
            {activeTab === 'properties' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">My Properties</h3>
                  <div className="flex items-center space-x-2">
                    <div className="relative">
                      <FaEye className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Search properties..."
                        className="pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <select
                      value={filterStatus}
                      onChange={e => setFilterStatus(e.target.value)}
                      className="px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">All Categories</option>
                      <option value="hotel">Hotels</option>
                      <option value="apartment">Apartments</option>
                      <option value="villa">Villas</option>
                      <option value="hostel">Hostels</option>
                      <option value="resort">Resorts</option>
                      <option value="guesthouse">Guesthouses</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {properties
                    .filter(p => {
                      const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                          p.city.toLowerCase().includes(searchTerm.toLowerCase());
                      const matchesCategory = filterStatus ? p.category === filterStatus : true;
                      return matchesSearch && matchesCategory;
                    })
                    .map((property) => (
                    <div key={property._id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
                      <img
                        loading="lazy"
                        src={property.images?.[0] ? makeAbsolute(property.images[0]) : 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&h=250&fit=crop'}
                        alt={property.title}
                        className="w-full h-48 object-cover"
                        onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&h=250&fit=crop'; }}
                      />
                      <div className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                            {property.title}
                            {property.propertyNumber && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700" title="Property Number">
                                {property.propertyNumber}
                              </span>
                            )}
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {getBookingCountFor(property._id)} bookings
                            </span>
                          </h4>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(property.isActive ? 'active' : 'inactive')}`}>
                            {property.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <div className="flex items-center text-gray-600 mb-2">
                          <FaMapMarkerAlt className="mr-1" />
                          <span className="text-sm">{property.city}</span>
                        </div>
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-lg font-bold text-blue-600">{formatCurrencyRWF ? formatCurrencyRWF(property.pricePerNight || 0) : `RWF ${(property.pricePerNight || 0).toLocaleString()}`}</span>
                          <div className="flex items-center">
                            {renderStars(property.ratings?.length ? property.ratings.reduce((sum, r) => sum + r.rating, 0) / property.ratings.length : 0)}
                          </div>
                        </div>
                        
                        {/* Room Management */}
                        {property.rooms && property.rooms.length > 0 && (
                          <div className="mb-4">
                            <h5 className="text-sm font-medium text-gray-700 mb-2">Rooms:</h5>
                            <div className="space-y-2">
                              {property.rooms.slice(0, 3).map((room) => (
                                <div key={room._id} className="flex items-center justify-between text-sm">
                                  <span className="text-gray-600">{room.roomNumber} - {room.roomType}</span>
                                  <div className="flex items-center space-x-2">
                                    <span className={`px-2 py-1 rounded text-xs ${room.isAvailable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                      {room.isAvailable ? 'Available' : 'Closed'}
                                    </span>
                                    <button 
                                      onClick={() => {
                                        const startDate = prompt('Start date (YYYY-MM-DD):');
                                        const endDate = prompt('End date (YYYY-MM-DD):');
                                        const reason = prompt('Reason for closing:');
                                        if (startDate && endDate && reason) {
                                          handleRoomClose(property._id, room._id, startDate, endDate, reason);
                                        }
                                      }}
                                      className="text-red-600 hover:text-red-800 text-xs"
                                    >
                                      <FaCalendarTimes />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex items-center space-x-2">
                          <button className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
                            <FaEye className="inline mr-1" />
                            View
                          </button>
                          <Link to={`/upload?edit=${property._id}`} className="p-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                            <FaEdit />
                          </Link>
                          <button 
                            onClick={async () => {
                              if (!confirm('Are you sure you want to delete this property?')) return;
                              try {
                                await apiDelete(`/api/properties/${property._id}`);
                                toast.success('Property deleted');
                                fetchDashboardData();
                              } catch (e) { 
                                console.error('Failed to delete property:', e);
                                toast.error(e.message || 'Failed to delete property'); 
                              }
                            }}
                            className="p-2 border border-gray-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bookings Tab */}
            {activeTab === 'bookings' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">All Bookings</h3>
                  <div className="flex items-center space-x-2">
                    <select
                      value={selectedPropertyId}
                      onChange={e => setSelectedPropertyId(e.target.value)}
                      className="px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      title="Filter by property"
                    >
                      <option value="">All Properties</option>
                      {properties.map(p => (
                        <option key={p._id} value={p._id}>
                          {(p.propertyNumber ? `${p.propertyNumber} · ` : '') + p.title}
                        </option>
                      ))}
                    </select>
                    <div className="relative">
                      <FaEye className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Search bookings..."
                        className="pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <select
                      value={filterStatus}
                      onChange={e => setFilterStatus(e.target.value)}
                      className="px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">All Statuses</option>
                      <option value="pending">Pending</option>
                      <option value="awaiting">Awaiting Confirmation</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="ended">Ended</option>
                      <option value="commission_due">Commission Due</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  {bookings
                    .filter(b => {
                      const matchesSearch = b.property?.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                          b.guest?.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                          b.guest?.lastName.toLowerCase().includes(searchTerm.toLowerCase());
                      const matchesStatus = filterStatus ? b.status === filterStatus : true;
                      const matchesProperty = selectedPropertyId ? String(b.property?._id) === String(selectedPropertyId) : true;
                      return matchesSearch && matchesStatus && matchesProperty;
                    })
                    .map((booking) => (
                    <div key={booking._id} className="bg-gray-50 rounded-xl p-6 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-start space-x-4">
                            <img
                              loading="lazy"
                              src={booking.property?.images?.[0] ? makeAbsolute(booking.property.images[0]) : 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=100&h=100&fit=crop'}
                              alt={booking.property?.title}
                              className="w-20 h-20 rounded-lg object-cover"
                              onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=100&h=100&fit=crop'; }}
                            />
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                                {booking.property?.title}
                                {booking.property?.propertyNumber && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700" title="Property Number">
                                    {booking.property.propertyNumber}
                                  </span>
                                )}
                              </h4>
                              <div className="flex items-center mt-1 text-gray-600">
                                <FaMapMarkerAlt className="mr-1" />
                                <span className="text-sm">{booking.property?.city}</span>
                              </div>
                              <div className="flex items-center mt-2 space-x-4 text-sm text-gray-600">
                                <div className="flex items-center">
                                  <FaCalendarAlt className="mr-1" />
                                  <span>{new Date(booking.checkIn).toLocaleDateString()} - {new Date(booking.checkOut).toLocaleDateString()}</span>
                                </div>
                                <span className="font-medium text-gray-900">{formatCurrencyRWF ? formatCurrencyRWF(booking.totalAmount || 0) : `RWF ${(booking.totalAmount || 0).toLocaleString()}`}</span>
                              </div>
                              <div className="mt-2 text-sm text-gray-600">
                                <span className="font-medium">Guest:</span> {booking.guest?.firstName} {booking.guest?.lastName}
                                {booking.guest?.phone && <span className="ml-4"><span className="font-medium">Phone:</span> {booking.guest.phone}</span>}
                              </div>
                              {booking.guest?.email && (
                                <div className="mt-1 text-sm text-gray-600">
                                  <span className="font-medium">Email:</span> {booking.guest.email}
                                </div>
                              )}
                              {booking.confirmationCode && (
                                <div className="mt-1 text-sm text-blue-600">
                                  <span className="font-medium">Booking ID:</span> {booking.confirmationCode}
                                </div>
                              )}
                              {booking.guestContact && (
                                <div className="mt-2 p-2 bg-blue-50 rounded-lg">
                                  <h5 className="text-xs font-medium text-blue-900 mb-1">Guest Contact Details:</h5>
                                  <div className="text-xs text-blue-800">
                                    {booking.guestContact.phone && <p>Phone: {booking.guestContact.phone}</p>}
                                    {booking.guestContact.email && <p>Email: {booking.guestContact.email}</p>}
                                    {booking.guestContact.emergencyContact && <p>Emergency: {booking.guestContact.emergencyContact}</p>}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                            {booking.status}
                          </span>
                          <div className="mt-2 flex items-center space-x-2">
                            <button
                              onClick={() => navigate(`/booking-confirmation/${booking._id}`)}
                              className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:scale-[0.98] transition-all text-sm shadow-sm hover:shadow"
                            >
                              View Details
                            </button>
                            {(booking.status === 'pending' || booking.status === 'awaiting') && (
                              <button 
                                onClick={() => handleBookingAction(booking._id, 'confirm')}
                                className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                              >
                                Confirm
                              </button>
                            )}
                            {booking.status === 'confirmed' && (
                              <button 
                                onClick={async () => {
                                  if (!window.confirm('Are you sure you want to cancel this booking?')) return;
                                  await handleBookingAction(booking._id, 'cancel');
                                }}
                                className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 active:scale-[0.98] transition-all text-sm shadow-sm hover:shadow"
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Calendar Tab */}
            {activeTab === 'calendar' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Booking Calendar</h3>
                  <div className="flex items-center space-x-2">
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={e => setSelectedDate(e.target.value)}
                      className="p-2 border border-gray-300 rounded-lg bg-white text-gray-700"
                    />
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6">
                  <div className="grid grid-cols-7 gap-4 mb-4">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                      <div key={day} className="text-center font-medium text-gray-700 py-2">
                        {day}
                      </div>
                    ))}
                  </div>
                  
                  <div className="grid grid-cols-7 gap-4">
                    {Array.from({ length: 35 }, (_, i) => {
                      const date = new Date();
                      date.setDate(date.getDate() - date.getDay() + i);
                      const dateStr = date.toISOString().split('T')[0];
                      const dayBookings = bookings.filter(b => 
                        new Date(b.checkIn) <= date && new Date(b.checkOut) >= date
                      );
                      
                      return (
                        <div key={i} className={`min-h-[80px] p-2 border rounded-lg ${
                          date.toDateString() === new Date().toDateString() ? 'bg-blue-50 border-blue-200' : 'bg-gray-50'
                        }`}>
                          <div className="text-sm font-medium text-gray-700 mb-1">
                            {date.getDate()}
                          </div>
                          <div className="space-y-1">
                            {dayBookings.slice(0, 2).map(booking => (
                              <div key={booking._id} className={`text-xs p-1 rounded ${
                                booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                                booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                booking.status === 'awaiting' ? 'bg-orange-100 text-orange-800' :
                                booking.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                booking.status === 'ended' ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {booking.property?.title}
                              </div>
                            ))}
                            {dayBookings.length > 2 && (
                              <div className="text-xs text-gray-500">
                                +{dayBookings.length - 2} more
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Earnings Tab */}
            {activeTab === 'earnings' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Earnings Overview</h3>
                  <div className="flex items-center space-x-2">
                    <select className="p-2 border border-gray-300 rounded-lg bg-white text-gray-700">
                      <option value="all">All Time</option>
                      <option value="month">This Month</option>
                      <option value="year">This Year</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white rounded-xl shadow-lg p-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Earnings Breakdown</h4>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Total Bookings</span>
                        <span className="font-medium">{bookings.length}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Confirmed Bookings</span>
                        <span className="font-medium">{bookings.filter(b => b.status === 'confirmed' || b.status === 'ended').length}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Total Revenue</span>
                        <span className="font-medium text-green-600">{formatCurrencyRWF ? formatCurrencyRWF(bookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0)) : `RWF ${bookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0).toLocaleString()}`}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Commission Paid</span>
                        <span className="font-medium text-red-600">{formatCurrencyRWF ? formatCurrencyRWF(bookings.reduce((sum, b) => sum + (b.commissionAmount || 0), 0)) : `RWF ${bookings.reduce((sum, b) => sum + (b.commissionAmount || 0), 0).toLocaleString()}`}</span>
                      </div>
                      <div className="flex justify-between items-center border-t pt-4">
                        <span className="text-gray-900 font-semibold">Net Earnings</span>
                        <span className="font-bold text-green-600 text-lg">{formatCurrencyRWF ? formatCurrencyRWF(metrics.totalEarnings || 0) : `RWF ${(metrics.totalEarnings || 0).toLocaleString()}`}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-lg p-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Recent Transactions</h4>
                    <div className="space-y-3">
                      {bookings
                        .filter(b => b.status === 'confirmed' || b.status === 'ended')
                        .slice(0, 5)
                        .map((booking) => (
                        <div key={booking._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium text-gray-900">{booking.property?.title}</p>
                            <p className="text-sm text-gray-600">{new Date(booking.createdAt).toLocaleDateString()}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-green-600">{formatCurrencyRWF ? formatCurrencyRWF((booking.totalAmount || 0) - (booking.commissionAmount || 0)) : `RWF ${((booking.totalAmount || 0) - (booking.commissionAmount || 0)).toLocaleString()}`}</p>
                            <p className="text-sm text-gray-500">{booking.status}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;
