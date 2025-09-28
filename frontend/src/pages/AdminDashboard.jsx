import React, { useState, useEffect } from 'react';
import { FaChartLine, FaUsers, FaBed, FaCalendarAlt, FaDollarSign, FaStar, FaMapMarkerAlt, FaCar, FaPlane, FaCamera, FaFilter, FaSearch, FaEdit, FaTrash, FaPlus, FaEye, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

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
        totalTaxis: 0,
        totalCarRentals: 0,
        pendingCommissions: 0
      });
      setProperties([]);
      setBookings([]);
      setUsers([]);
      setAttractions([]);
      setTaxis([]);
      setCarRentals([]);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed':
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'ended':
      case 'completed':
        return 'bg-blue-100 text-blue-800';
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-gray-600 mt-1">Manage your platform like Booking.com</p>
            </div>
            <div className="flex items-center space-x-4">
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl font-semibold transition-colors duration-300 flex items-center gap-2">
                <FaPlus />
                Add New Service
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-xl">
                <FaBed className="text-blue-600 text-xl" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Properties</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.totalProperties}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-xl">
                <FaCalendarAlt className="text-green-600 text-xl" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Bookings</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.totalBookings}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
            <div className="flex items-center">
              <div className="p-3 bg-yellow-100 rounded-xl">
                <FaDollarSign className="text-yellow-600 text-xl" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900">RWF {metrics.totalRevenue?.toLocaleString()}</p>
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
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'overview', label: 'Overview', icon: FaChartLine },
                { id: 'properties', label: 'Properties', icon: FaBed },
                { id: 'bookings', label: 'Bookings', icon: FaCalendarAlt },
                { id: 'users', label: 'Users', icon: FaUsers },
                { id: 'commissions', label: 'Commissions', icon: FaDollarSign }
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
                            <p className="text-sm text-gray-600 mt-1">RWF {booking.totalAmount?.toLocaleString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Properties</h3>
                    <div className="space-y-3">
                      {properties.slice(0, 5).map((property) => (
                        <div key={property._id} className="flex items-center justify-between p-3 bg-white rounded-lg">
                          <div>
                            <p className="font-medium text-gray-900">{property.title}</p>
                            <p className="text-sm text-gray-600">{property.city}</p>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center">
                              {renderStars(property.ratings?.length ? property.ratings.reduce((sum, r) => sum + r.rating, 0) / property.ratings.length : 0)}
                            </div>
                            <p className="text-sm text-gray-600 mt-1">RWF {property.pricePerNight?.toLocaleString()}</p>
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
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">All Properties</h3>
                  <div className="flex items-center space-x-2">
                    <div className="relative">
                      <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Search properties..."
                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <select
                      value={filterStatus}
                      onChange={e => setFilterStatus(e.target.value)}
                      className="p-2 border border-gray-300 rounded-lg bg-white text-gray-700"
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
                        src={property.images?.[0] || 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&h=250&fit=crop'}
                        alt={property.title}
                        className="w-full h-48 object-cover"
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
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">All Bookings</h3>
                  <div className="flex items-center space-x-2">
                    <div className="relative">
                      <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Search bookings..."
                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <select
                      value={filterStatus}
                      onChange={e => setFilterStatus(e.target.value)}
                      className="p-2 border border-gray-300 rounded-lg bg-white text-gray-700"
                    >
                      <option value="">All Statuses</option>
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="ended">Ended</option>
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
                      return matchesSearch && matchesStatus;
                    })
                    .map((booking) => (
                    <div key={booking._id} className="bg-gray-50 rounded-xl p-6 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-start space-x-4">
                            <img
                              src={booking.property?.images?.[0] || 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=100&h=100&fit=crop'}
                              alt={booking.property?.title}
                              className="w-20 h-20 rounded-lg object-cover"
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
                            {booking.status === 'pending' && (
                              <button className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm">
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
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">All Users</h3>
                  <div className="flex items-center space-x-2">
                    <div className="relative">
                      <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Search users..."
                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <select
                      value={filterStatus}
                      onChange={e => setFilterStatus(e.target.value)}
                      className="p-2 border border-gray-300 rounded-lg bg-white text-gray-700"
                    >
                      <option value="">All Types</option>
                      <option value="guest">Guests</option>
                      <option value="host">Hosts</option>
                      <option value="admin">Admins</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {users
                    .filter(u => {
                      const matchesSearch = u.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                          u.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                          u.email.toLowerCase().includes(searchTerm.toLowerCase());
                      const matchesType = filterStatus ? u.userType === filterStatus : true;
                      return matchesSearch && matchesType;
                    })
                    .map((user) => (
                    <div key={user._id} className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center text-lg font-bold">
                          {user.firstName?.[0]}{user.lastName?.[0]}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{user.firstName} {user.lastName}</h4>
                          <p className="text-sm text-gray-600">{user.email}</p>
                          <p className="text-sm text-gray-500">{user.phone}</p>
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
                      </div>
                      <div className="mt-4 flex items-center space-x-2">
                        <button className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
                          View Profile
                        </button>
                        <button className="p-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                          <FaEdit />
                        </button>
                        <button className="p-2 border border-gray-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors">
                          <FaTrash />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Commissions Tab */}
            {activeTab === 'commissions' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Commission Management</h3>
                  <div className="flex items-center space-x-2">
                    <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2">
                      <FaCheckCircle />
                      Mark as Paid
                    </button>
                    <button className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2">
                      <FaTimesCircle />
                      Remove Non-Payers
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Property/Service</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Owner</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Commission Rate</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount Due</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {bookings
                          .filter(b => b.commissionAmount > 0)
                          .map((booking) => (
                          <tr key={booking._id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{booking.property?.title}</div>
                              <div className="text-sm text-gray-500">{booking.property?.city}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{booking.property?.host?.firstName} {booking.property?.host?.lastName}</div>
                              <div className="text-sm text-gray-500">{booking.property?.host?.email}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {booking.property?.commissionRate || 10}%
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              RWF {booking.commissionAmount?.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                booking.commissionPaid ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {booking.commissionPaid ? 'Paid' : 'Pending'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex items-center space-x-2">
                                {!booking.commissionPaid && (
                                  <button className="text-green-600 hover:text-green-900">
                                    <FaCheckCircle />
                                  </button>
                                )}
                                <button className="text-red-600 hover:text-red-900">
                                  <FaTimesCircle />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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

export default AdminDashboard;
