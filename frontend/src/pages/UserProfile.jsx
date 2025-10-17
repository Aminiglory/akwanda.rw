import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { FaUser, FaChartLine, FaCalendarAlt, FaDollarSign, FaDownload, FaEdit, FaTrash, FaEye, FaCog, FaHome, FaStar, FaMapMarkerAlt, FaCamera, FaFileAlt, FaPrint, FaEnvelope, FaPhone, FaBed, FaUsers, FaWifi, FaCar, FaSwimmingPool, FaUtensils, FaShieldAlt } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { safeApiGet, apiGet, apiPost, apiPut, apiDelete, apiDownload } from '../utils/apiUtils';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const UserProfile = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [properties, setProperties] = useState([]);
  const [reports, setReports] = useState({});
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    bio: user?.bio || '',
    avatar: user?.avatar || ''
  });

  useEffect(() => {
    fetchProperties();
    fetchReports();
  }, []);

  const fetchProperties = async () => {
    try {
      const res = await fetch(`${API_URL}/api/properties/my-properties`, { credentials: 'include' });
      const data = await res.json();
      if (res.ok) setProperties(data.properties || []);
    } catch (e) {
      toast.error('Failed to fetch properties');
    }
  };

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/reports/dashboard`, { credentials: 'include' });
      const data = await res.json();
      if (res.ok) setReports(data);
    } catch (e) {
      console.error('Failed to fetch reports:', e);
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async (type, period, format = 'json') => {
    try {
      setLoading(true);
      let endpoint = `${API_URL}/api/reports/generate?type=${type}&period=${period}`;
      
      if (format === 'pdf') {
        endpoint = `${API_URL}/api/reports/generate-pdf?type=${type}&period=${period}`;
      } else if (format === 'csv') {
        endpoint = `${API_URL}/api/reports/generate-csv?type=${type}&period=${period}`;
      }
      
      const res = await fetch(endpoint, { credentials: 'include' });
      
      if (res.ok) {
        if (format === 'pdf' || format === 'csv') {
          // Handle file download
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${type}-${period}-report.${format}`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        } else {
          // Handle JSON response
          const data = await res.json();
          const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${type}-${period}-report.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
        toast.success(`${type} ${period} report (${format.toUpperCase()}) generated successfully`);
      }
    } catch (e) {
      toast.error('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async () => {
    try {
      const res = await fetch(`${API_URL}/api/user/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(profileData)
      });
      if (res.ok) {
        toast.success('Profile updated successfully');
      }
    } catch (e) {
      toast.error('Failed to update profile');
    }
  };

  const uploadAvatar = async (file) => {
    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const res = await fetch(`${API_URL}/api/user/upload-avatar`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      });
      
      if (res.ok) {
        const data = await res.json();
        setProfileData(prev => ({ ...prev, avatar: data.avatarUrl }));
        toast.success('Avatar updated successfully');
      } else {
        toast.error('Failed to upload avatar');
      }
    } catch (error) {
      toast.error('Failed to upload avatar');
    }
  };

  const deleteProperty = async (propertyId) => {
    if (!window.confirm('Are you sure you want to delete this property?')) return;
    try {
      const res = await fetch(`${API_URL}/api/properties/${propertyId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (res.ok) {
        toast.success('Property deleted successfully');
        fetchProperties();
      }
    } catch (e) {
      toast.error('Failed to delete property');
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: FaUser },
    { id: 'properties', label: 'My Properties', icon: FaHome },
    { id: 'reports', label: 'Reports', icon: FaChartLine },
    { id: 'settings', label: 'Settings', icon: FaCog }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <img
                  src={profileData.avatar || '/default-avatar.png'}
                  alt="Profile"
                  className="w-16 h-16 rounded-full object-cover border-4 border-white shadow-lg"
                />
                <label className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 cursor-pointer">
                  <FaCamera className="text-xs" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => e.target.files[0] && uploadAvatar(e.target.files[0])}
                    className="hidden"
                  />
                </label>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {profileData.firstName} {profileData.lastName}
                </h1>
                <p className="text-gray-600">{user?.userType === 'host' ? 'Property Owner' : 'Guest'}</p>
                <div className="flex items-center space-x-4 mt-2">
                  <span className="text-sm text-gray-500 flex items-center">
                    <FaEnvelope className="mr-1" /> {profileData.email}
                  </span>
                  {profileData.phone && (
                    <span className="text-sm text-gray-500 flex items-center">
                      <FaPhone className="mr-1" /> {profileData.phone}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={updateProfile}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
              >
                <FaEdit className="text-sm" />
                <span>Edit Profile</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="text-lg" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Stats Cards */}
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-lg shadow-sm p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Properties</p>
                    <p className="text-3xl font-bold text-gray-900">{properties.length}</p>
                  </div>
                  <FaHome className="text-3xl text-blue-600" />
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Bookings</p>
                    <p className="text-3xl font-bold text-gray-900">{reports.totalBookings || 0}</p>
                  </div>
                  <FaCalendarAlt className="text-3xl text-green-600" />
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                    <p className="text-3xl font-bold text-gray-900">RWF {(reports.totalRevenue || 0).toLocaleString()}</p>
                  </div>
                  <FaDollarSign className="text-3xl text-yellow-600" />
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Average Rating</p>
                    <p className="text-3xl font-bold text-gray-900">{reports.averageRating || 0}</p>
                  </div>
                  <FaStar className="text-3xl text-orange-600" />
                </div>
              </div>
            </div>

            {/* Profile Info */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Profile Information</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                  <input
                    type="text"
                    value={profileData.firstName}
                    onChange={(e) => setProfileData(prev => ({ ...prev, firstName: e.target.value }))}
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={profileData.lastName}
                    onChange={(e) => setProfileData(prev => ({ ...prev, lastName: e.target.value }))}
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={profileData.phone}
                    onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                  <textarea
                    value={profileData.bio}
                    onChange={(e) => setProfileData(prev => ({ ...prev, bio: e.target.value }))}
                    rows={3}
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Tell us about yourself..."
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'properties' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">My Properties</h2>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2">
                <FaHome className="text-sm" />
                <span>Add Property</span>
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {properties.map((property) => (
                <div key={property._id} className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="relative">
                    <img
                      src={property.images?.[0] || '/placeholder-property.jpg'}
                      alt={property.title}
                      className="w-full h-48 object-cover"
                    />
                    <div className="absolute top-3 right-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        property.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {property.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 mb-2">{property.title}</h3>
                    <p className="text-sm text-gray-600 mb-2 flex items-center">
                      <FaMapMarkerAlt className="mr-1" />
                      {property.city}, {property.country}
                    </p>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-lg font-bold text-blue-600">
                        RWF {property.pricePerNight?.toLocaleString()}/night
                      </span>
                      <div className="flex items-center space-x-1">
                        <FaStar className="text-yellow-400 text-sm" />
                        <span className="text-sm text-gray-600">{property.rating || 'New'}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <FaBed className="text-xs" />
                        <span>{property.bedrooms} beds</span>
                        <FaUsers className="text-xs ml-2" />
                        <span>{property.maxGuests} guests</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 mt-4">
                      <button className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm flex items-center justify-center space-x-1">
                        <FaEye className="text-xs" />
                        <span>View</span>
                      </button>
                      <button className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm flex items-center justify-center space-x-1">
                        <FaEdit className="text-xs" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => deleteProperty(property._id)}
                        className="px-3 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 text-sm"
                      >
                        <FaTrash className="text-xs" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Reports & Analytics</h2>
            </div>
            
            {/* Report Generation */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow-sm p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Reports</h3>
                <p className="text-sm text-gray-600 mb-4">Generate detailed daily performance reports</p>
                <div className="space-y-2">
                  <div className="grid grid-cols-3 gap-1">
                    <button
                      onClick={() => generateReport('revenue', 'daily', 'pdf')}
                      disabled={loading}
                      className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 disabled:opacity-50"
                    >
                      PDF
                    </button>
                    <button
                      onClick={() => generateReport('revenue', 'daily', 'csv')}
                      disabled={loading}
                      className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:opacity-50"
                    >
                      CSV
                    </button>
                    <button
                      onClick={() => generateReport('revenue', 'daily', 'json')}
                      disabled={loading}
                      className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      JSON
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    <button
                      onClick={() => generateReport('bookings', 'daily', 'pdf')}
                      disabled={loading}
                      className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 disabled:opacity-50"
                    >
                      PDF
                    </button>
                    <button
                      onClick={() => generateReport('bookings', 'daily', 'csv')}
                      disabled={loading}
                      className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:opacity-50"
                    >
                      CSV
                    </button>
                    <button
                      onClick={() => generateReport('bookings', 'daily', 'json')}
                      disabled={loading}
                      className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      JSON
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Reports</h3>
                <p className="text-sm text-gray-600 mb-4">Comprehensive monthly analytics and insights</p>
                <div className="space-y-2">
                  <button
                    onClick={() => generateReport('revenue', 'monthly')}
                    disabled={loading}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center space-x-2"
                  >
                    <FaDownload className="text-sm" />
                    <span>Revenue Report</span>
                  </button>
                  <button
                    onClick={() => generateReport('performance', 'monthly')}
                    disabled={loading}
                    className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 flex items-center justify-center space-x-2"
                  >
                    <FaChartLine className="text-sm" />
                    <span>Performance Report</span>
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Annual Reports</h3>
                <p className="text-sm text-gray-600 mb-4">Yearly summaries and tax-ready documents</p>
                <div className="space-y-2">
                  <button
                    onClick={() => generateReport('annual', 'yearly')}
                    disabled={loading}
                    className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center space-x-2"
                  >
                    <FaDownload className="text-sm" />
                    <span>Annual Summary</span>
                  </button>
                  <button
                    onClick={() => generateReport('tax', 'yearly')}
                    disabled={loading}
                    className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 flex items-center justify-center space-x-2"
                  >
                    <FaPrint className="text-sm" />
                    <span>Tax Report</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Analytics</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">{reports.thisMonth?.bookings || 0}</div>
                  <div className="text-sm text-gray-600">This Month Bookings</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">RWF {(reports.thisMonth?.revenue || 0).toLocaleString()}</div>
                  <div className="text-sm text-gray-600">This Month Revenue</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-600">{reports.occupancyRate || 0}%</div>
                  <div className="text-sm text-gray-600">Occupancy Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">{reports.averageStay || 0}</div>
                  <div className="text-sm text-gray-600">Avg Stay (nights)</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                  <input
                    type="password"
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter current password"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                  <input
                    type="password"
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter new password"
                  />
                </div>
                <button className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  Update Password
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Notification Preferences</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Email Notifications</span>
                  <input type="checkbox" className="toggle" defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">SMS Notifications</span>
                  <input type="checkbox" className="toggle" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Booking Alerts</span>
                  <input type="checkbox" className="toggle" defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Marketing Emails</span>
                  <input type="checkbox" className="toggle" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfile;
