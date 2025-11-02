import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { FaUser, FaChartLine, FaCalendarAlt, FaDollarSign, FaDownload, FaEdit, FaTrash, FaEye, FaCog, FaHome, FaStar, FaMapMarkerAlt, FaCamera, FaFileAlt, FaPrint, FaEnvelope, FaPhone, FaBed, FaUsers, FaWifi, FaCar, FaSwimmingPool, FaUtensils, FaShieldAlt, FaClock, FaComments } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { safeApiGet, apiGet, apiPost, apiPut, apiDelete, apiDownload } from '../utils/apiUtils';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const UserProfile = () => {
  const { user, refreshUser, updateProfile: ctxUpdateProfile, updateAvatar: ctxUpdateAvatar } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [properties, setProperties] = useState([]);
  const [reports, setReports] = useState({});
  const [loading, setLoading] = useState(false);
  const [propertiesLoading, setPropertiesLoading] = useState(false);
  const [propView, setPropView] = useState('cards'); // 'cards' | 'table'
  const makeAbsolute = (u) => {
    if (!u) return u;
    let s = String(u).replace(/\\+/g, '/');
    if (s.startsWith('http')) return s;
    if (!s.startsWith('/')) s = `/${s}`;
    return `${API_URL}${s}`;
  };

  // Simple center square crop for selected avatar (optional)
  const cropAvatarToSquare = async () => {
    if (!avatarFile) return;
    const file = avatarFile;
    const img = document.createElement('img');
    const url = URL.createObjectURL(file);
    try {
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = url;
      });
      const size = Math.min(img.naturalWidth, img.naturalHeight);
      const sx = Math.max(0, Math.floor((img.naturalWidth - size) / 2));
      const sy = Math.max(0, Math.floor((img.naturalHeight - size) / 2));
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, sx, sy, size, size, 0, 0, size, size);
      await new Promise((resolve) => setTimeout(resolve));
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
      if (blob) {
        const croppedFile = new File([blob], file.name.replace(/\.[^.]+$/, '') + '-sq.jpg', { type: 'image/jpeg' });
        if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
        const preview = URL.createObjectURL(croppedFile);
        setAvatarFile(croppedFile);
        setAvatarPreviewUrl(preview);
      }
    } catch (_) {
      // ignore errors; keep original
    } finally {
      URL.revokeObjectURL(url);
    }
  };

  const [profileData, setProfileData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    bio: user?.bio || '',
    avatar: makeAbsolute(user?.avatar) || ''
  });
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [threadsUnread, setThreadsUnread] = useState(0);

  useEffect(() => {
    fetchProperties();
    fetchReports();
    // Fetch latest profile from backend to populate real form data
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/user/profile`, { credentials: 'include' });
        const data = await res.json().catch(()=>({}));
        if (res.ok && data?.user) {
          setProfileData({
            firstName: data.user.firstName || '',
            lastName: data.user.lastName || '',
            email: data.user.email || '',
            phone: data.user.phone || '',
            bio: data.user.bio || '',
            avatar: makeAbsolute(data.user.avatar) || ''
          });
        } else {
          // keep avatar in sync if auth user changes
          setProfileData((prev) => ({ ...prev, avatar: makeAbsolute(user?.avatar) || prev.avatar }));
        }
      } catch (_) {
        setProfileData((prev) => ({ ...prev, avatar: makeAbsolute(user?.avatar) || prev.avatar }));
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/messages/threads`, { credentials: 'include' });
        const data = await res.json();
        if (res.ok && Array.isArray(data.threads)) {
          const total = data.threads.reduce((sum, t) => sum + Number(t.unreadCount || 0), 0);
          setThreadsUnread(total);
        } else {
          setThreadsUnread(0);
        }
      } catch (_) { setThreadsUnread(0); }
    })();
  }, []);

  // Refetch when switching to My Properties tab to ensure fresh data
  useEffect(() => {
    if (activeTab === 'properties') {
      fetchProperties();
    }
    if (activeTab === 'reports') {
      fetchReports();
    }
  }, [activeTab]);

  const fetchProperties = async () => {
    try {
      setPropertiesLoading(true);
      // Prefer apiGet helper if it handles credentials and errors
      try {
        const data = await apiGet('/api/properties/my-properties');
        setProperties(Array.isArray(data?.properties) ? data.properties : []);
        return;
      } catch (_) {
        // Fallback to raw fetch with explicit error handling
      }
      const res = await fetch(`${API_URL}/api/properties/my-properties`, { credentials: 'include' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data?.message || `Failed to fetch properties (${res.status})`;
        toast.error(msg);
        setProperties([]);
        return;
      }
      setProperties(Array.isArray(data?.properties) ? data.properties : []);
    } catch (e) {
      toast.error('Failed to fetch properties');
      setProperties([]);
    } finally {
      setPropertiesLoading(false);
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
      const updated = await ctxUpdateProfile({
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        email: profileData.email,
        phone: profileData.phone,
        bio: profileData.bio
      });
      if (updated?.avatar) {
        setProfileData((p) => ({ ...p, avatar: updated.avatar }));
      }
      toast.success('Profile updated successfully');
    } catch (e) {
      toast.error(e.message || 'Failed to update profile');
    }
  };

  const uploadAvatar = async () => {
    if (!avatarFile) return;
    try {
      const updated = await ctxUpdateAvatar(avatarFile, false);
      if (updated?.avatar) {
        setProfileData(prev => ({ ...prev, avatar: updated.avatar }));
      }
      if (avatarPreviewUrl) { URL.revokeObjectURL(avatarPreviewUrl); setAvatarPreviewUrl(null); }
      setAvatarFile(null);
      try { await refreshUser(); } catch (_) {}
      toast.success('Avatar updated successfully');
    } catch (error) {
      toast.error(error.message || 'Failed to upload avatar');
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

  const isHost = user?.userType === 'host';

  if (!isHost) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-[#a06b42] text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <img src={avatarPreviewUrl || profileData.avatar || '/default-avatar.png'} alt="Profile" className="w-12 h-12 md:w-16 md:h-16 rounded-full object-cover ring-4 ring-white/20" />
                </div>
                <div>
                  <div className="text-xl md:text-2xl font-bold">Hi, {profileData.firstName || 'Traveler'}</div>
                  <div className="text-sm opacity-90">Welcome back</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => navigate('/messages')} className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm flex items-center gap-2">
                  <FaComments /> Messages {threadsUnread > 0 ? <span className="ml-1 bg-white text-[#a06b42] px-2 py-0.5 rounded-full text-xs font-semibold">{threadsUnread}</span> : null}
                </button>
                <label className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm cursor-pointer flex items-center gap-2">
                  <FaCamera />
                  <input type="file" accept="image/*" onChange={(e)=>{ const f=e.target.files?.[0]; if(f){ if(avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl); setAvatarPreviewUrl(URL.createObjectURL(f)); setAvatarFile(f);} }} className="hidden" />
                </label>
                {avatarFile && (
                  <button onClick={uploadAvatar} className="px-3 py-2 rounded-lg bg-white text-[#a06b42] text-sm font-medium">Save</button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm p-4">
              <div className="text-sm text-gray-600 mb-3">Payment info</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <button className="p-3 border rounded-lg text-left hover:bg-gray-50" onClick={()=>toast('Coming soon')}>Rewards & Wallet</button>
                <button className="p-3 border rounded-lg text-left hover:bg-gray-50" onClick={()=>toast('Coming soon')}>Payment methods</button>
                <button className="p-3 border rounded-lg text-left hover:bg-gray-50" onClick={()=>toast('Coming soon')}>Transactions</button>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-4">
              <div className="text-sm text-gray-600 mb-3">Manage account</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <button className="p-3 border rounded-lg text-left hover:bg-gray-50" onClick={()=>setActiveTab('overview')}>Personal details</button>
                <button className="p-3 border rounded-lg text-left hover:bg-gray-50" onClick={()=>toast('Coming soon')}>Security settings</button>
                <button className="p-3 border rounded-lg text-left hover:bg-gray-50" onClick={()=>toast('Coming soon')}>Other travelers</button>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-4">
              <div className="text-sm text-gray-600 mb-3">Preferences</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <button className="p-3 border rounded-lg text-left hover:bg-gray-50" onClick={()=>toast('Coming soon')}>Customization preferences</button>
                <button className="p-3 border rounded-lg text-left hover:bg-gray-50" onClick={()=>toast('Coming soon')}>Email preferences</button>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-4">
              <div className="text-sm text-gray-600 mb-3">Travel activity</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <button className="p-3 border rounded-lg text-left hover:bg-gray-50" onClick={()=>navigate('/bookings')}>Trips and bookings</button>
                <button className="p-3 border rounded-lg text-left hover:bg-gray-50" onClick={()=>toast('Coming soon')}>Saved lists</button>
                <button className="p-3 border rounded-lg text-left hover:bg-gray-50" onClick={()=>toast('Coming soon')}>My reviews</button>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-4">
              <div className="text-sm text-gray-600 mb-3">Help and support</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <button className="p-3 border rounded-lg text-left hover:bg-gray-50" onClick={()=>navigate('/support')}>Contact Customer Service</button>
                <button className="p-3 border rounded-lg text-left hover:bg-gray-50" onClick={()=>toast('Coming soon')}>Safety resource center</button>
                <button className="p-3 border rounded-lg text-left hover:bg-gray-50" onClick={()=>toast('Coming soon')}>Dispute resolution</button>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-4">
              <div className="text-sm text-gray-600 mb-3">Manage your property</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <button className="p-3 border rounded-lg text-left hover:bg-gray-50" onClick={()=>navigate('/upload')}>List your property</button>
                <button className="p-3 border rounded-lg text-left hover:bg-gray-50" onClick={()=>navigate('/messages')}>
                  Messages {threadsUnread > 0 ? <span className="ml-2 inline-flex items-center justify-center w-6 h-6 text-xs font-semibold rounded-full bg-[#a06b42] text-white">{threadsUnread}</span> : null}
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium text-gray-700 mb-1">First Name</div>
                <input type="text" value={profileData.firstName} onChange={(e)=> setProfileData(prev=>({...prev, firstName: e.target.value}))} className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-700 mb-1">Last Name</div>
                <input type="text" value={profileData.lastName} onChange={(e)=> setProfileData(prev=>({...prev, lastName: e.target.value}))} className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-700 mb-1">Phone</div>
                <input type="tel" value={profileData.phone} onChange={(e)=> setProfileData(prev=>({...prev, phone: e.target.value}))} className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div className="flex items-end">
                <button onClick={updateProfile} className="px-4 py-3 bg-[#a06b42] hover:bg-[#8f5a32] text-white rounded-lg">Save details</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <img
                  src={avatarPreviewUrl || profileData.avatar || '/default-avatar.png'}
                  alt="Profile"
                  className="w-12 h-12 md:w-16 md:h-16 rounded-full object-cover border-4 border-white shadow-lg"
                />
                <label className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 cursor-pointer">
                  <FaCamera className="text-xs" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
                        setAvatarPreviewUrl(URL.createObjectURL(file));
                        setAvatarFile(file);
                      }
                    }}
                    className="hidden"
                  />
                </label>
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-900">
                  {profileData.firstName} {profileData.lastName}
                </h1>
                <p className="text-sm md:text-base text-gray-600">{user?.userType === 'host' ? 'Property Owner' : 'Guest'}</p>
                <div className="flex items-center flex-wrap gap-2 md:space-x-4 mt-2">
                  <span className="text-xs md:text-sm text-gray-500 flex items-center">
                    <FaEnvelope className="mr-1" /> {profileData.email}
                  </span>
                  {profileData.phone && (
                    <span className="text-xs md:text-sm text-gray-500 flex items-center">
                      <FaPhone className="mr-1" /> {profileData.phone}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 md:space-x-3 flex-wrap justify-end">
              <button
                onClick={updateProfile}
                className="px-3 py-1.5 md:px-4 md:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2 text-sm"
              >
                <FaEdit className="text-sm" />
                <span className="hidden sm:inline">Edit Profile</span>
              </button>
              {avatarFile && (
                <>
                  <button
                    onClick={uploadAvatar}
                    className="px-3 py-1.5 md:px-4 md:py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                  >Save Avatar</button>
                  <button
                    onClick={cropAvatarToSquare}
                    type="button"
                    className="px-3 py-1.5 md:px-4 md:py-2 border rounded-lg text-sm"
                  >Crop to square</button>
                  <button
                    onClick={() => { if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl); setAvatarPreviewUrl(null); setAvatarFile(null); }}
                    className="px-3 py-1.5 md:px-4 md:py-2 border rounded-lg text-sm"
                  >Cancel</button>
                </>
              )}
              {user?.userType === 'host' && (
                <Link
                  to="/owner/workers"
                  className="px-3 py-1.5 md:px-4 md:py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-2 text-sm"
                  title="Create and manage your workers"
                >
                  <FaUsers className="text-sm" />
                  <span className="hidden sm:inline">Manage Workers</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-4 md:space-x-8 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-2 md:py-4 px-1 border-b-2 font-medium text-xs md:text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="text-base md:text-lg" />
                  <span className="whitespace-nowrap">{tab.label}</span>
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
              <div className="flex items-center gap-2">
                <div className="hidden md:flex items-center border rounded-lg overflow-hidden">
                  <button onClick={()=>setPropView('cards')} className={`px-3 py-2 text-sm ${propView==='cards'?'bg-gray-100 font-medium':'bg-white'}`}>Cards</button>
                  <button onClick={()=>setPropView('table')} className={`px-3 py-2 text-sm ${propView==='table'?'bg-gray-100 font-medium':'bg-white'}`}>Table</button>
                </div>
                <button onClick={()=>navigate('/upload')} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2">
                <FaHome className="text-sm" />
                <span>Add Property</span>
                </button>
              </div>
            </div>

            {propView === 'cards' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {properties.map((property) => (
                  <div key={property._id} className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="relative">
                      <img
                        src={makeAbsolute(property.images?.[0]) || 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600&h=400&fit=crop'}
                        alt={property.title}
                        className="w-full h-48 object-cover"
                      />
                      <div className="absolute top-3 right-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${property.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
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
                        <button onClick={()=>navigate(`/apartment/${property._id}`)} className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm flex items-center justify-center space-x-1">
                          <FaEye className="text-xs" />
                          <span>View</span>
                        </button>
                        <button onClick={()=>navigate(`/edit-property/${property._id}`)} className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm flex items-center justify-center space-x-1">
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
            ) : (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Property</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price/night</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {properties.map((p)=> (
                        <tr key={p._id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <img src={makeAbsolute(p.images?.[0]) || 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=120&h=80&fit=crop'} alt="thumb" className="w-16 h-12 object-cover rounded" />
                              <div>
                                <div className="text-sm font-medium text-gray-900">{p.title}</div>
                                <div className="text-xs text-gray-500">{p.rooms?.length || 0} rooms</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">{p.city}, {p.country}</td>
                          <td className="px-4 py-3 text-sm text-blue-600 font-semibold">RWF {p.pricePerNight?.toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${p.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{p.isActive ? 'Active' : 'Inactive'}</span>
                          </td>
                          <td className="px-4 py-3 text-right text-sm">
                            <div className="flex justify-end gap-2">
                              <button onClick={()=>navigate(`/apartment/${p._id}`)} className="px-3 py-1 bg-blue-600 text-white rounded">View</button>
                              <button onClick={()=>navigate(`/edit-property/${p._id}`)} className="px-3 py-1 border rounded">Edit</button>
                              <button onClick={()=>deleteProperty(p._id)} className="px-3 py-1 border border-red-300 text-red-600 rounded">Delete</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'reports' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Reports & Analytics</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => generateReport('summary', 'daily', 'pdf')}
                  className="px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm"
                >Download PDF</button>
                <button
                  onClick={() => generateReport('summary', 'daily', 'csv')}
                  className="px-3 py-2 rounded-lg border text-sm hover:bg-gray-50"
                >Export CSV</button>
              </div>
            </div>

            {/* Compact Tabular Overview */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-8 overflow-x-auto">
              <table className="min-w-[560px] w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500">
                    <th className="py-2 pr-4">Metric</th>
                    <th className="py-2 pr-4">All Time</th>
                    <th className="py-2 pr-4">This Month</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr>
                    <td className="py-2 pr-4 font-medium text-gray-900">Bookings</td>
                    <td className="py-2 pr-4">{reports.totalBookings || 0}</td>
                    <td className="py-2 pr-4">{reports.thisMonth?.bookings || 0}</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 font-medium text-gray-900">Revenue</td>
                    <td className="py-2 pr-4">RWF {(reports.totalRevenue || 0).toLocaleString()}</td>
                    <td className="py-2 pr-4">RWF {(reports.thisMonth?.revenue || 0).toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 font-medium text-gray-900">Occupancy</td>
                    <td className="py-2 pr-4">{reports.occupancyRate || 0}%</td>
                    <td className="py-2 pr-4">{reports.thisMonth?.occupancyRate ?? '—'}{typeof reports.thisMonth?.occupancyRate === 'number' ? '%' : ''}</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 font-medium text-gray-900">Avg Stay (nights)</td>
                    <td className="py-2 pr-4">{reports.averageStay || 0}</td>
                    <td className="py-2 pr-4">{reports.thisMonth?.averageStay ?? '—'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            {/* Report Generation */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {/* Daily Reports Card */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-5">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Daily Reports</h3>
                <p className="text-sm text-gray-600 mb-4">Generate detailed daily performance reports</p>
                <div className="space-y-3">
                  {/* Revenue Row */}
                  <div>
                    <div className="text-xs font-semibold text-gray-500 mb-2">Revenue</div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => generateReport('revenue', 'daily', 'pdf')}
                        disabled={loading}
                        className="px-3 py-2 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700 disabled:opacity-50"
                        title="Download Revenue (PDF)"
                      >
                        PDF
                      </button>
                      <button
                        onClick={() => generateReport('revenue', 'daily', 'csv')}
                        disabled={loading}
                        className="px-3 py-2 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 disabled:opacity-50"
                        title="Download Revenue (CSV)"
                      >
                        CSV
                      </button>
                    </div>
                  </div>
                  {/* Bookings Row */}
                  <div>
                    <div className="text-xs font-semibold text-gray-500 mb-2">Bookings</div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => generateReport('bookings', 'daily', 'pdf')}
                        disabled={loading}
                        className="px-3 py-2 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700 disabled:opacity-50"
                        title="Download Bookings (PDF)"
                      >
                        PDF
                      </button>
                      <button
                        onClick={() => generateReport('bookings', 'daily', 'csv')}
                        disabled={loading}
                        className="px-3 py-2 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 disabled:opacity-50"
                        title="Download Bookings (CSV)"
                      >
                        CSV
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-5">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Monthly Reports</h3>
                <p className="text-sm text-gray-600 mb-4">Comprehensive monthly analytics and insights</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => generateReport('revenue', 'monthly', 'pdf')}
                      disabled={loading}
                      className="px-3 py-2 bg-purple-600 text-white text-xs rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
                      title="Download Monthly Revenue (PDF)"
                    >
                      <FaDownload className="text-xs" />
                      <span>Revenue PDF</span>
                    </button>
                    <button
                      onClick={() => generateReport('revenue', 'monthly', 'csv')}
                      disabled={loading}
                      className="px-3 py-2 bg-emerald-600 text-white text-xs rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2"
                      title="Download Monthly Revenue (CSV)"
                    >
                      <FaDownload className="text-xs" />
                      <span>Revenue CSV</span>
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => generateReport('performance', 'monthly', 'pdf')}
                      disabled={loading}
                      className="px-3 py-2 bg-indigo-600 text-white text-xs rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                      title="Download Monthly Performance (PDF)"
                    >
                      <FaChartLine className="text-xs" />
                      <span>Performance PDF</span>
                    </button>
                    <button
                      onClick={() => generateReport('performance', 'monthly', 'csv')}
                      disabled={loading}
                      className="px-3 py-2 bg-sky-600 text-white text-xs rounded-lg hover:bg-sky-700 disabled:opacity-50 flex items-center gap-2"
                      title="Download Monthly Performance (CSV)"
                    >
                      <FaChartLine className="text-xs" />
                      <span>Performance CSV</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-5">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Annual Reports</h3>
                <p className="text-sm text-gray-600 mb-4">Yearly summaries and tax-ready documents</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => generateReport('annual', 'yearly', 'pdf')}
                      disabled={loading}
                      className="px-3 py-2 bg-fuchsia-600 text-white text-xs rounded-lg hover:bg-fuchsia-700 disabled:opacity-50 flex items-center gap-2"
                      title="Download Annual Summary (PDF)"
                    >
                      <FaDownload className="text-xs" />
                      <span>Annual PDF</span>
                    </button>
                    <button
                      onClick={() => generateReport('annual', 'yearly', 'csv')}
                      disabled={loading}
                      className="px-3 py-2 bg-amber-600 text-white text-xs rounded-lg hover:bg-amber-700 disabled:opacity-50 flex items-center gap-2"
                      title="Download Annual Summary (CSV)"
                    >
                      <FaDownload className="text-xs" />
                      <span>Annual CSV</span>
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => generateReport('tax', 'yearly', 'pdf')}
                      disabled={loading}
                      className="px-3 py-2 bg-stone-700 text-white text-xs rounded-lg hover:bg-stone-800 disabled:opacity-50 flex items-center gap-2"
                      title="Download Tax Report (PDF)"
                    >
                      <FaPrint className="text-xs" />
                      <span>Tax PDF</span>
                    </button>
                    <button
                      onClick={() => generateReport('tax', 'yearly', 'csv')}
                      disabled={loading}
                      className="px-3 py-2 bg-neutral-600 text-white text-xs rounded-lg hover:bg-neutral-700 disabled:opacity-50 flex items-center gap-2"
                      title="Download Tax Report (CSV)"
                    >
                      <FaPrint className="text-xs" />
                      <span>Tax CSV</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Analytics */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Analytics</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Bookings */}
                <div className="rounded-xl border border-gray-200 p-4 hover:shadow-sm transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">This Month Bookings</span>
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700"><FaCalendarAlt /></span>
                  </div>
                  <div className="text-3xl font-bold text-blue-700">{reports.thisMonth?.bookings || 0}</div>
                </div>
                {/* Revenue */}
                <div className="rounded-xl border border-gray-200 p-4 hover:shadow-sm transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">This Month Revenue</span>
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-700"><FaDollarSign /></span>
                  </div>
                  <div className="text-2xl md:text-3xl font-bold text-green-700">RWF {(reports.thisMonth?.revenue || 0).toLocaleString()}</div>
                </div>
                {/* Occupancy */}
                <div className="rounded-xl border border-gray-200 p-4 hover:shadow-sm transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">Occupancy Rate</span>
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-orange-100 text-orange-700"><FaStar /></span>
                  </div>
                  <div className="text-3xl font-bold text-orange-700">{reports.occupancyRate || 0}%</div>
                </div>
                {/* Avg stay */}
                <div className="rounded-xl border border-gray-200 p-4 hover:shadow-sm transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">Avg Stay (nights)</span>
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 text-purple-700"><FaClock /></span>
                  </div>
                  <div className="text-3xl font-bold text-purple-700">{reports.averageStay || 0}</div>
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
                    value={passwords.current || ''}
                    onChange={(e) => setPasswords(p => ({ ...p, current: e.target.value }))}
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter current password"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                  <input
                    type="password"
                    value={passwords.new || ''}
                    onChange={(e) => setPasswords(p => ({ ...p, new: e.target.value }))}
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter new password"
                  />
                </div>
                <button
                  className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  onClick={async () => {
                    try {
                      if (!passwords?.current || !passwords?.new) {
                        toast.error('Enter current and new password');
                        return;
                      }
                      await ctxUpdateProfile({ currentPassword: passwords.current, password: passwords.new });
                      setPasswords({ current: '', new: '' });
                      toast.success('Password updated');
                    } catch (e) {
                      toast.error(e.message || 'Failed to update password');
                    }
                  }}
                >
                  Update Password
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Notification Preferences</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Email Notifications</span>
                  <input type="checkbox" className="toggle" checked={!!prefs.email}
                    onChange={(e)=> setPrefs(p => ({ ...p, email: e.target.checked }))} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">SMS Notifications</span>
                  <input type="checkbox" className="toggle" checked={!!prefs.sms}
                    onChange={(e)=> setPrefs(p => ({ ...p, sms: e.target.checked }))} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Booking Alerts</span>
                  <input type="checkbox" className="toggle" checked={!!prefs.booking}
                    onChange={(e)=> setPrefs(p => ({ ...p, booking: e.target.checked }))} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Marketing Emails</span>
                  <input type="checkbox" className="toggle" checked={!!prefs.marketing}
                    onChange={(e)=> setPrefs(p => ({ ...p, marketing: e.target.checked }))} />
                </div>
                <div className="text-right pt-2">
                  <button
                    className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-black text-sm"
                    onClick={async () => {
                      try {
                        await ctxUpdateProfile({ preferences: { email: !!prefs.email, sms: !!prefs.sms, booking: !!prefs.booking, marketing: !!prefs.marketing } });
                        toast.success('Preferences saved');
                      } catch (e) { toast.error(e.message || 'Failed to save preferences'); }
                    }}
                  >Save Preferences</button>
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
