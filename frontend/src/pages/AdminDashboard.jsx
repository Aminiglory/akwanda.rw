import React, { useState, useEffect } from 'react';
import { FaChartLine, FaUsers, FaBed, FaCalendarAlt, FaDollarSign, FaStar, FaMapMarkerAlt, FaCar, FaPlane, FaCamera, FaFilter, FaSearch, FaEdit, FaTrash, FaPlus, FaEye, FaCheckCircle, FaTimesCircle, FaComments, FaEllipsisV, FaUser, FaHome, FaUserTimes } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import AdminCommissionManager from '../components/AdminCommissionManager';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const makeAbsolute = (u) => {
  if (!u) return '';
  // Normalize common DB image shapes
  let v = u;
  if (typeof v === 'object') {
    // pull from typical fields
    v = v.path || v.url || v.src || v.location || v.image || '';
    if (v && typeof v === 'object') {
      v = v.path || v.url || v.src || v.location || '';
    }
  }
  if (typeof v !== 'string') v = String(v || '').trim();
  let s = v.replace(/\\+/g, '/');
  if (!s) return '';
  if (s.startsWith('data:')) return s; // base64
  if (s.startsWith('http')) return s;
  if (!s.startsWith('/')) s = `/${s}`;
  return `${API_URL}${s}`;
};

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [metrics, setMetrics] = useState({
    totalProperties: 0,
    totalBookings: 0,
    totalRevenue: 0,
    totalUsers: 0,
    totalAttractions: 0,
    totalTaxis: 0,
    totalCarRentals: 0,
    pendingCommissions: 0
  });
  

  const [properties, setProperties] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [users, setUsers] = useState([]);
  const [attractions, setAttractions] = useState([]);
  const [taxis, setTaxis] = useState([]);
  const [carRentals, setCarRentals] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [deletingUserId, setDeletingUserId] = useState(null);
  const [menuForUserId, setMenuForUserId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch data with error handling for each endpoint
      const fetchWithFallback = async (url, fallbackData = {}) => {
        try {
          const response = await fetch(url, { credentials: 'include' });
          if (response.ok) {
            return await response.json();
          } else {
            console.warn(`Failed to fetch ${url}:`, response.status);
            return fallbackData;
          }
        } catch (error) {
          console.warn(`Error fetching ${url}:`, error);
          return fallbackData;
        }
      };

  // Admin user actions (moved to component scope)
  const viewUserDetails = async (id) => {
    try {
      setShowUserDetails(true);
      setSelectedUser(null);
      const res = await fetch(`${API_URL}/api/admin/user-management/users/${id}`, { credentials: 'include' });
      let data = {};
      try { data = await res.json(); } catch { data = {}; }
      if (!res.ok) throw new Error(data.message || 'Failed to load user');
      setSelectedUser({
        user: data.user,
        properties: data.properties || [],
        propertyCount: (data.properties || []).length
      });
    } catch (e) {
      setShowUserDetails(false);
      toast.error(e.message || 'Something went wrong');
    }
  };

  const deleteUser = async (id) => {
    try {
      setDeletingUserId(id);
      const res = await fetch(`${API_URL}/api/admin/user-management/users/${id}`, { method: 'DELETE', credentials: 'include' });
      const data = await res.json().catch(()=>({}));
      if (!res.ok) throw new Error(data.message || 'Failed to delete user');
      toast.success('User deleted');
      setUsers(prev => prev.filter(u => String(u._id) !== String(id)));
    } catch (e) {
      toast.error(e.message || 'Failed to delete user');
    } finally {
      setDeletingUserId(null);
    }
  };

  const promoteToHost = async (id) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/user-management/users/${id}/promote-to-host`, { method: 'POST', credentials: 'include' });
      let data = {}; try { data = await res.json(); } catch {}
      if (!res.ok) throw new Error(data.message || 'Failed to promote');
      toast.success('Promoted to host');
      setUsers(prev => prev.map(u => (String(u._id) === String(id) ? { ...u, userType: 'host' } : u)));
    } catch (e) { toast.error(e.message || 'Failed to promote'); }
  };

  const demoteToGuest = async (id) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/user-management/users/${id}/demote-to-guest`, { method: 'POST', credentials: 'include' });
      let data = {}; try { data = await res.json(); } catch {}
      if (!res.ok) throw new Error(data.message || 'Failed to demote');
      toast.success('Demoted to guest');
      setUsers(prev => prev.map(u => (String(u._id) === String(id) ? { ...u, userType: 'guest' } : u)));
    } catch (e) { toast.error(e.message || 'Failed to demote'); }
  };

  const deactivateUser = async (id) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/users/${id}/deactivate`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason: 'Admin deactivation' }) });
      let data = {}; try { data = await res.json(); } catch {}
      if (!res.ok) throw new Error(data.message || 'Failed to deactivate');
      toast.success('User deactivated');
      setUsers(prev => prev.map(u => (String(u._id)===String(id) ? { ...u, isBlocked: true } : u)));
    } catch (e) { toast.error(e.message || 'Failed to deactivate'); }
  };

  const reactivateUser = async (id) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/users/${id}/reactivate`, { method: 'POST', credentials: 'include' });
      let data = {}; try { data = await res.json(); } catch {}
      if (!res.ok) throw new Error(data.message || 'Failed to reactivate');
      toast.success('User reactivated');
      setUsers(prev => prev.map(u => (String(u._id)===String(id) ? { ...u, isBlocked: false } : u)));
    } catch (e) { toast.error(e.message || 'Failed to reactivate'); }
  };

    // Fetch all data with fallbacks
    const [metricsData, propertiesData, bookingsData, usersData] = await Promise.all([
      fetchWithFallback(`${API_URL}/api/admin/metrics`, { 
        totalProperties: 0, 
          totalBookings: 0, 
          totalRevenue: 0, 
          totalUsers: 0 
        }),
        fetchWithFallback(`${API_URL}/api/properties`, { properties: [] }),
        fetchWithFallback(`${API_URL}/api/bookings`, { bookings: [] }),
        fetchWithFallback(`${API_URL}/api/admin/users`, { users: [] })
      ]);

      // Set data with fallbacks
      setMetrics({
        totalProperties: metricsData.totalProperties || propertiesData.properties?.length || 0,
        totalBookings: metricsData.totalBookings || bookingsData.bookings?.length || 0,
        totalRevenue: metricsData.totalRevenue || 0,
        totalUsers: metricsData.totalUsers || usersData.users?.length || 0,
        totalAttractions: 0,
        totalTaxis: 0,
        totalCarRentals: 0,
        pendingCommissions: 0
      });
      
      setProperties(propertiesData.properties || []);
      setBookings(bookingsData.bookings || []);
      setUsers(usersData.users || []);
      
      // Set attractions, taxis, and car rentals to empty arrays for now
      setAttractions([]);
      setTaxis([]);
      setCarRentals([]);

    } catch (error) {
      console.error('Dashboard data fetch error:', error);
      toast.error('Failed to load dashboard data. Using fallback data.');
      
      // Set fallback data
      setMetrics({
        totalProperties: 0,
        totalBookings: 0,
        totalRevenue: 0,
        totalUsers: 0,
        totalAttractions: 0,
        totalCarRentals: 0,
        pendingCommissions: 0
      });
      setProperties([]);
      setBookings([]);
    }
  };

  // Seed a few demo properties for quick testing
  // Backfill legacy properties: assign propertyNumber and promote owners to host
  const backfillProperties = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/backfill/properties-owner-codes`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Backfill failed');
      const { updatedProperties = 0, promotedOwners = 0, totalProperties = 0 } = data || {};
      toast.success(`Backfill done • Updated: ${updatedProperties} • Promoted owners: ${promotedOwners} • Total props: ${totalProperties}`);
      // Refresh dashboard data and switch to properties tab
      await fetchDashboardData();
      setActiveTab('properties');
    } catch (e) {
      toast.error(e.message || 'Failed to run backfill');
    }
  };

  // Seed a few demo properties (safe no-op if endpoint missing)
  const seedDemoProperties = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/demo/seed-properties`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Seeding demo properties failed');
      toast.success(data.message || 'Demo properties seeded');
      await fetchDashboardData();
      setActiveTab('properties');
    } catch (e) {
      // If there is no endpoint, show informative message instead of crashing
      console.warn('seedDemoProperties failed:', e);
      toast.error(e.message || 'Failed to seed demo properties');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed':
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'awaiting':
        return 'bg-orange-100 text-orange-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'ended':
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const confirmBooking = async (bookingId) => {
    try {
      const response = await fetch(`${API_URL}/api/bookings/${bookingId}/confirm`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to confirm booking');
      }

      const data = await response.json();
      toast.success('Booking confirmed successfully!');
      
      // Update the booking in the local state
      setBookings(prevBookings => 
        prevBookings.map(booking => 
          booking._id === bookingId 
            ? { ...booking, status: 'confirmed' }
            : booking
        )
      );
    } catch (error) {
      console.error('Error confirming booking:', error);
      toast.error(error.message || 'Failed to confirm booking');
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

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col gap-3">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight">Admin Dashboard</h1>
              <p className="text-sm md:text-base text-gray-600 mt-1">Manage your AKWANDA platform</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={backfillProperties}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
                title="Assign property numbers and promote owners to host"
              >
                Backfill Properties
              </button>
              <button
                onClick={seedDemoProperties}
                className="px-4 py-2 rounded-lg bg-gray-100 text-gray-800 text-sm font-medium hover:bg-gray-200 transition-colors"
                title="Seed a few demo properties for admin"
              >
                Seed Demo Properties
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-xl">
                <FaBed className="text-blue-600 text-xl" />
              </div>
              <div className="ml-4">
                <p className="text-xs md:text-sm font-medium text-gray-600">Total Properties</p>
                <p className="text-xl md:text-2xl font-bold text-gray-900">{metrics.totalProperties}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-xl">
                <FaCalendarAlt className="text-green-600 text-xl" />
              </div>
              <div className="ml-4">
                <p className="text-xs md:text-sm font-medium text-gray-600">Total Bookings</p>
                <p className="text-xl md:text-2xl font-bold text-gray-900">{metrics.totalBookings}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
            <div className="flex items-center">
              <div className="p-3 bg-yellow-100 rounded-xl">
                <FaDollarSign className="text-yellow-600 text-xl" />
              </div>
              <div className="ml-4">
                <p className="text-xs md:text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-xl md:text-2xl font-bold text-gray-900">RWF {metrics.totalRevenue?.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-xl">
                <FaUsers className="text-purple-600 text-xl" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.totalUsers}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-2xl shadow-lg mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex px-4 md:px-6 overflow-x-auto whitespace-nowrap no-scrollbar gap-1">
              {[
                { id: 'overview', label: 'Overview', icon: FaChartLine },
                { id: 'properties', label: 'Properties', icon: FaBed },
                { id: 'bookings', label: 'Bookings', icon: FaCalendarAlt },
                { id: 'users', label: 'Users', icon: FaUsers },
                { id: 'content', label: 'Content', icon: FaCamera },
                { id: 'cars', label: 'Cars', icon: FaCar },
                { id: 'commissions', label: 'Commissions', icon: FaDollarSign }
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`py-3 px-3 sm:px-4 md:px-5 border-b-2 font-medium text-sm transition-colors duration-300 inline-flex items-center gap-2 shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:rounded-lg ${
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
                    <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-4">Recent Bookings</h3>
                    <div className="space-y-3">
                      {bookings.slice(0, 5).map((booking) => (
                        <div key={booking._id} className="flex items-center justify-between p-3 bg-white rounded-lg min-w-0">
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate">{booking.property?.title}</p>
                            <p className="text-xs md:text-sm text-gray-600 truncate">{booking.guest?.firstName} {booking.guest?.lastName}</p>
                          </div>
                          <div className="text-right">
                            <span className={`px-2 py-1 rounded-full text-[10px] md:text-xs font-medium ${getStatusColor(booking.status)}`}>
                              {booking.status}
                            </span>
                            <p className="text-xs md:text-sm text-gray-600 mt-1">RWF {booking.totalAmount?.toLocaleString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-6">
                    <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-4">Top Properties</h3>
                    <div className="space-y-3">
                      {properties.slice(0, 5).map((property) => (
                        <div key={property._id} className="flex items-center justify-between p-3 bg-white rounded-lg min-w-0">
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate">{property.title}</p>
                            <p className="text-xs md:text-sm text-gray-600 truncate">{property.city}</p>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center">
                              {renderStars(property.ratings?.length ? property.ratings.reduce((sum, r) => sum + r.rating, 0) / property.ratings.length : 0)}
                            </div>
                            <p className="text-xs md:text-sm text-gray-600 mt-1">RWF {property.pricePerNight?.toLocaleString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Properties Tab */}
            {activeTab === 'properties' && (
              <div>
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">All Properties</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                    <div className="w-full">
                      <label className="block text-xs text-gray-600 mb-1 sm:hidden">Search</label>
                      <div className="relative">
                        <FaSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          value={searchTerm}
                          onChange={e => setSearchTerm(e.target.value)}
                          placeholder="Search properties..."
                          className="w-full pl-10 pr-3 h-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                    <div className="w-full">
                      <label className="block text-xs text-gray-600 mb-1 sm:hidden">Category</label>
                      <select
                        value={filterStatus}
                        onChange={e => setFilterStatus(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-lg bg-white text-gray-700"
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
                          <h4 className="font-semibold text-gray-900">{property.title}</h4>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(property.isActive ? 'active' : 'inactive')}`}>
                            {property.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <div className="flex items-center text-gray-600 mb-2">
                          <FaMapMarkerAlt className="mr-1" />
                          <span className="text-sm">{property.city}</span>
                        </div>
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-lg font-bold text-blue-600">RWF {property.pricePerNight?.toLocaleString()}</span>
                          <div className="flex items-center">
                            {renderStars(property.ratings?.length ? property.ratings.reduce((sum, r) => sum + r.rating, 0) / property.ratings.length : 0)}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
                            <FaEye className="inline mr-1" />
                            View
                          </button>
                          <button className="p-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                            <FaEdit />
                          </button>
                          <button className="p-2 border border-gray-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors">
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
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">All Bookings</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                    <div className="w-full">
                      <label className="block text-xs text-gray-600 mb-1 sm:hidden">Search</label>
                      <div className="relative">
                        <FaSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          value={searchTerm}
                          onChange={e => setSearchTerm(e.target.value)}
                          placeholder="Search bookings..."
                          className="w-full pl-10 pr-3 h-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                    <div className="w-full">
                      <label className="block text-xs text-gray-600 mb-1 sm:hidden">Status</label>
                      <select
                        value={filterStatus}
                        onChange={e => setFilterStatus(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-lg bg-white text-gray-700"
                      >
                        <option value="">All Statuses</option>
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="ended">Ended</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {bookings
                    .filter(b => {
                      const matchesSearch = b.property?.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                          b.guest?.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                          b.guest?.lastName.toLowerCase().includes(searchTerm.toLowerCase());
                      const matchesStatus = filterStatus ? b.status === filterStatus : true;
                      return matchesSearch && matchesStatus;
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
                              <h4 className="font-semibold text-gray-900">{booking.property?.title}</h4>
                              <div className="flex items-center mt-1 text-gray-600">
                                <FaMapMarkerAlt className="mr-1" />
                                <span className="text-sm">{booking.property?.city}</span>
                              </div>
                              <div className="flex items-center mt-2 space-x-4 text-sm text-gray-600">
                                <div className="flex items-center">
                                  <FaCalendarAlt className="mr-1" />
                                  <span>{new Date(booking.checkIn).toLocaleDateString()} - {new Date(booking.checkOut).toLocaleDateString()}</span>
                                </div>
                                <span className="font-medium text-gray-900">RWF {booking.totalAmount?.toLocaleString()}</span>
                              </div>
                              <div className="mt-2 text-sm text-gray-600">
                                <span className="font-medium">Guest:</span> {booking.guest?.firstName} {booking.guest?.lastName}
                                {booking.guest?.phone && <span className="ml-4"><span className="font-medium">Phone:</span> {booking.guest.phone}</span>}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                            {booking.status}
                          </span>
                          <div className="mt-2 flex items-center space-x-2">
                            <button className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
                              View Details
                            </button>
                            {(booking.status === 'pending' || booking.status === 'awaiting') && (
                              <button 
                                onClick={() => confirmBooking(booking._id)}
                                className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                              >
                                Confirm
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

            {/* Users Tab */}
            {activeTab === 'users' && (
              <div>
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">All Users</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                    <div className="w-full">
                      <label className="block text-xs text-gray-600 mb-1 sm:hidden">Search</label>
                      <div className="relative">
                        <FaSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          value={searchTerm}
                          onChange={e => setSearchTerm(e.target.value)}
                          placeholder="Search users..."
                          className="w-full pl-10 pr-3 h-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                    <div className="w-full">
                      <label className="block text-xs text-gray-600 mb-1 sm:hidden">User Type</label>
                      <select
                        value={filterStatus}
                        onChange={e => setFilterStatus(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-lg bg-white text-gray-700"
                      >
                        <option value="">All Types</option>
                        <option value="guest">Guests</option>
                        <option value="host">Hosts</option>
                        <option value="admin">Admins</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {users
                    .filter(u => {
                      const matchesSearch = (u.firstName||'').toLowerCase().includes(searchTerm.toLowerCase()) ||
                                          (u.lastName||'').toLowerCase().includes(searchTerm.toLowerCase()) ||
                                          (u.email||'').toLowerCase().includes(searchTerm.toLowerCase());
                      const matchesType = filterStatus ? u.userType === filterStatus : true;
                      const excludeAdmins = filterStatus !== 'admin' ? (String(u.userType||'').toLowerCase() !== 'admin') : true;
                      return matchesSearch && matchesType && excludeAdmins;
                    })
                    .map((user) => (
                    <div key={user._id} className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center text-lg font-bold">
                          {user.firstName?.[0]}{user.lastName?.[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 truncate">{user.firstName} {user.lastName}</h4>
                          <p className="text-sm text-gray-600 truncate">{user.email}</p>
                          <p className="text-sm text-gray-500 truncate">{user.phone}</p>
                        </div>
                        <div className="text-right">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            user.userType === 'admin' ? 'bg-red-100 text-red-800' :
                            user.userType === 'host' ? 'bg-blue-100 text-blue-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {user.userType}
                          </span>
                        </div>
                        <div className="relative">
                          <button onClick={()=> setMenuForUserId(m => m===user._id ? null : user._id)} className="p-2 border rounded" aria-haspopup="menu" aria-expanded={menuForUserId===user._id} title="Actions"><FaEllipsisV /></button>
                          {menuForUserId===user._id && (
                            <div className="absolute right-0 mt-2 w-56 bg-white border rounded shadow z-10">
                              <button onClick={()=> { viewUserDetails(user._id); setMenuForUserId(null); }} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-left"><FaUser className="md:hidden" /><span className="hidden md:inline">View</span><span className="md:hidden">View</span></button>
                              {user.userType !== 'host' && user.userType !== 'admin' && (
                                <button onClick={()=> { promoteToHost(user._id); setMenuForUserId(null); }} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-left"><FaHome className="md:hidden" /><span className="hidden md:inline">Promote to Host</span><span className="md:hidden">Promote</span></button>
                              )}
                              {user.userType === 'host' && (user.propertyCount===0 || (user.properties?.length||0)===0) && (
                                <button onClick={()=> { demoteToGuest(user._id); setMenuForUserId(null); }} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-left"><FaUserTimes className="md:hidden" /><span className="hidden md:inline">Demote to Guest</span><span className="md:hidden">Demote</span></button>
                              )}
                              <button onClick={()=> { (user.isBlocked ? reactivateUser(user._id) : deactivateUser(user._id)); setMenuForUserId(null); }} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-left"><FaEdit className="md:hidden" /><span className="hidden md:inline">{user.isBlocked ? 'Reactivate' : 'Deactivate'}</span><span className="md:hidden">{user.isBlocked ? 'Reactivate' : 'Deactivate'}</span></button>
                              <button onClick={()=> { setConfirmDeleteId(user._id); setMenuForUserId(null); }} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-left text-rose-600"><FaTrash className="md:hidden" /><span className="hidden md:inline">Delete</span><span className="md:hidden">Delete</span></button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Commissions Tab */}
            {activeTab === 'commissions' && (
              <div>
                <AdminCommissionManager />
              </div>
            )}

            {/* Content Tab */}
            {activeTab === 'content' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">Site Content</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  <Link
                    to="/admin/landing"
                    className="group block bg-white rounded-xl shadow-lg p-5 sm:p-6 hover:shadow-xl transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    <div className="flex items-center gap-3 sm:gap-4 mb-2 sm:mb-3">
                      <FaCamera className="text-blue-600 text-lg sm:text-xl" />
                      <div className="font-semibold text-gray-900 text-sm sm:text-base">Landing Page CMS</div>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-600">Edit hero title/subtitle, manage slideshow images and captions, and publish changes.</p>
                  </Link>
                  <Link
                    to="/admin/attractions"
                    className="group block bg-white rounded-xl shadow-lg p-5 sm:p-6 hover:shadow-xl transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    <div className="flex items-center gap-3 sm:gap-4 mb-2 sm:mb-3">
                      <FaCamera className="text-purple-600 text-lg sm:text-xl" />
                      <div className="font-semibold text-gray-900 text-sm sm:text-base">Attractions Page CMS</div>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-600">Manage attractions content, images, and publish the page.</p>
                  </Link>
                  <Link
                    to="/messages"
                    className="group block bg-white rounded-xl shadow-lg p-5 sm:p-6 hover:shadow-xl transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    <div className="flex items-center gap-3 sm:gap-4 mb-2 sm:mb-3">
                      <FaComments className="text-green-600 text-lg sm:text-xl" />
                      <div className="font-semibold text-gray-900 text-sm sm:text-base">Messages</div>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-600">Open conversations with users and property/car owners.</p>
                  </Link>
                </div>
              </div>
            )}

            {/* Cars Tab */}
            {activeTab === 'cars' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">Car Rentals</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  <Link
                    to="/owner/cars"
                    className="group block bg-white rounded-xl shadow-lg p-5 sm:p-6 hover:shadow-xl transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    <div className="flex items-center gap-3 sm:gap-4 mb-2 sm:mb-3">
                      <FaCar className="text-blue-600 text-lg sm:text-xl" />
                      <div className="font-semibold text-gray-900 text-sm sm:text-base">Manage Fleet</div>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-600">Create and edit cars, upload images, view and manage bookings.</p>
                  </Link>
                  <Link
                    to="/cars"
                    className="group block bg-white rounded-xl shadow-lg p-5 sm:p-6 hover:shadow-xl transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    <div className="flex items-center gap-3 sm:gap-4 mb-2 sm:mb-3">
                      <FaEye className="text-indigo-600 text-lg sm:text-xl" />
                      <div className="font-semibold text-gray-900 text-sm sm:text-base">Public Car Listings</div>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-600">View the public car rental page as users see it.</p>
                  </Link>
                  <Link
                    to="/messages"
                    className="group block bg-white rounded-xl shadow-lg p-5 sm:p-6 hover:shadow-xl transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    <div className="flex items-center gap-3 sm:gap-4 mb-2 sm:mb-3">
                      <FaComments className="text-green-600 text-lg sm:text-xl" />
                      <div className="font-semibold text-gray-900 text-sm sm:text-base">Messages</div>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-600">Chat with renters and owners in real-time.</p>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* User Details Modal */}
      {showUserDetails && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">User Details</h2>
              <button onClick={() => setShowUserDetails(false)} className="text-gray-500 hover:text-gray-700">×</button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-4">
                {selectedUser.user?.avatar ? (
                  <img src={selectedUser.user.avatar} alt={selectedUser.user.firstName} className="w-16 h-16 rounded-full object-cover border" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-base font-semibold">{(selectedUser.user?.firstName || selectedUser.user?.email || 'U').charAt(0)}</div>
                )}
                <div className="text-sm text-gray-600">
                  <div className="font-semibold text-gray-900">{selectedUser.user?.firstName} {selectedUser.user?.lastName}</div>
                  <div>{selectedUser.user?.email}</div>
                  <div>{selectedUser.user?.phone}</div>
                  <div className="mt-1 inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">{selectedUser.user?.userType}</div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold">Properties ({selectedUser.propertyCount})</h3>
                {selectedUser.properties?.length > 0 ? (
                  <div className="space-y-2 mt-2">
                    {selectedUser.properties.map((p) => (
                      <div key={p._id} className="p-2 bg-gray-50 rounded">
                        <div className="font-medium">{p.title}</div>
                        <div className="text-xs text-gray-600">Status: {p.status} • Created: {new Date(p.createdAt).toLocaleDateString()}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">No properties</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
