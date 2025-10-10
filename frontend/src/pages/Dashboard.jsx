import React, { useState, useEffect, useMemo } from 'react';

import { FaBed, FaMapMarkerAlt, FaCheckCircle, FaCalendarAlt, FaStar, FaHeart, FaEdit, FaTrash, FaPlus, FaFilter, FaSearch } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';


// ReadMore component for notification messages
function ReadMore({ text, maxLength }) {
  const [expanded, setExpanded] = useState(false);
  if (!text) return null;
  if (text.length <= maxLength) return <div className="text-gray-600 text-sm whitespace-pre-line">{text}</div>;
  return (
    <div className="text-gray-600 text-sm whitespace-pre-line">
      {expanded ? text : text.slice(0, maxLength) + '...'}
      <button className="ml-2 text-blue-600 underline text-xs" onClick={() => setExpanded(e => !e)}>
        {expanded ? 'Read Less' : 'Read More'}
      </button>
    </div>
  );
}
// Interactive star rating form for booking rating
function StarRatingForm({ booking, setBookings, bookings }) {
  const [starRating, setStarRating] = useState(0);
  const [comment, setComment] = useState("");
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Send rating and comment, and notify apartment owner
      const res = await fetch(`${API_URL}/api/bookings/${booking.id}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: starRating, comment, notifyOwner: true }),
        credentials: 'include'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to submit rating');
      toast.success('Rating submitted and sent to apartment owner');
      setBookings(bookings.map(b => b.id === booking.id ? { ...b, rating: starRating } : b));
    } catch (e) { toast.error(e.message); }
  };
  if (booking.status !== 'ended' || booking.rating) return null;
  return (
    <form onSubmit={handleSubmit} className="flex items-center space-x-2">
      <span className="flex items-center">
        {[1, 2, 3, 4, 5].map(n => (
          <span
            key={n}
            style={{ cursor: 'pointer' }}
            onClick={() => setStarRating(n)}
          >
            <FaStar className={(starRating >= n ? 'text-yellow-400' : 'text-gray-300') + ' text-xl'} />
          </span>
        ))}
      </span>
      <input name="comment" value={comment} onChange={e => setComment(e.target.value)} className="border rounded px-2 py-1" placeholder="Comment" />
      <button type="submit" className="px-2 py-1 bg-green-600 text-white rounded">Submit</button>
    </form>
  );
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Dashboard = () => {
  const [notifications, setNotifications] = useState([]);
  const { user, isLoading, updateProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('bookings');
  const [profileForm, setProfileForm] = useState({ firstName: '', lastName: '', email: '', phone: '', bio: '' });
  const [passwords, setPasswords] = useState({ currentPassword: '', password: '', confirmPassword: '' });
  const [showPwd, setShowPwd] = useState({ current: false, next: false, confirm: false });
  const [metrics, setMetrics] = useState({
    totalBookings: 0,
    activeListings: 0,
    happyGuests: 0,
    satisfactionRate: 100,
    savedApartments: 0
  });

  useEffect(() => {
    if (user && user.userType === 'host') {
      fetch(`${API_URL}/api/user/notifications`, { credentials: 'include' })
        .then(res => res.json())
        .then(data => setNotifications(data.notifications || []));
    }
    fetch(`${API_URL}/api/admin/metrics`)
      .then(res => res.json())
      .then(data => {
        setMetrics(prev => ({
          ...prev,
          totalBookings: data.totalBookings || 0,
          happyGuests: data.happyGuests || 0,
          satisfactionRate: data.satisfactionRate || 100,
          savedApartments: 8
        }));
      });
  }, [user?.userType]);

  const [bookings, setBookings] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const [listings, setListings] = useState([]);
  const [bookingModal, setBookingModal] = useState({ open: false, booking: null, details: null });
  const [showAll, setShowAll] = useState(false);

  // Derived earnings and growth metrics for monetization widgets
  const earnings = useMemo(() => {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    let last30 = 0, ytd = 0, upcoming = 0, countEnded = 0;
    const days30Ago = new Date(now);
    days30Ago.setDate(now.getDate() - 30);
    (bookings || []).forEach(b => {
      const amt = Number(b.total || 0) || 0;
      const co = b.checkOut ? new Date(b.checkOut) : null;
      if (co && co >= days30Ago && co <= now) last30 += amt;
      if (co && co >= startOfYear && co <= now) ytd += amt;
      if (b.status === 'confirmed' && co && co > now) upcoming += amt;
      if (b.status === 'ended') countEnded += 1;
    });
    return { last30, ytd, upcoming, countEnded };
  }, [bookings]);

  useEffect(() => {
    if (!user) return; // wait for user to be available to avoid undefined access
    (async () => {
      try {
        const makeAbsolute = (u) => {
          if (!u) return u;
          let s = String(u).replace(/\\/g, '/');
          if (!s.startsWith('http')) {
            if (!s.startsWith('/')) s = `/${s}`;
            return `${API_URL}${s}`;
          }
          return s;
        };
        const [bRes, pRes] = await Promise.all([
          fetch(`${API_URL}/api/bookings/mine`, { credentials: 'include' }),
          fetch(`${API_URL}/api/properties/mine`, { credentials: 'include' })
        ]);
        const [bData, pData] = [await bRes.json(), await pRes.json()];
        if (!bRes.ok) throw new Error(bData.message || 'Failed to load bookings');
        if (!pRes.ok) throw new Error(pData.message || 'Failed to load listings');
        setBookings((bData.bookings || []).map(b => ({
          id: b._id,
          apartment: {
            title: b.property?.title,
            image: (b.property?.images && b.property.images[0]) ? makeAbsolute(b.property.images[0]) : 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=300&h=200&fit=crop',
            location: `${b.property?.address}, ${b.property?.city}`
          },
          checkIn: b.checkIn?.slice(0, 10),
          checkOut: b.checkOut?.slice(0, 10),
          status: b.status,
          total: b.totalAmount,
          rating: null
        })));
        // Only show listings owned by the current user (host)
        setListings((pData.properties || []).filter(p => {
          // p.host may be an object or string
          const hostId = typeof p.host === 'object' && p.host !== null ? p.host._id || p.host.id : p.host;
          return user?.id && String(hostId) === String(user.id);
        }).map(p => ({
          id: p._id,
          title: p.title,
          location: `${p.address}, ${p.city}`,
          price: p.pricePerNight,
          image: (p.images && p.images.length ? makeAbsolute(p.images[0]) : 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=300&h=200&fit=crop'),
          status: p.isActive ? 'active' : 'inactive',
          bookings: 0,
          rating: null
        })));
      } catch (e) {
        toast.error(e.message);
      }
    })();
  }, [user?.id]);

  useEffect(() => {
    if (user) {
      const [fn, ln] = (user.name || '').split(' ');
      setProfileForm({
        firstName: user.firstName || fn || '',
        lastName: user.lastName || ln || '',
        email: user.email || '',
        phone: user.phone || '',
        bio: user.bio || ''
      });
    }
  }, [user]);


  // Automatically mark bookings as ended if checkout date has passed (single effect)
  useEffect(() => {
    const autoEndBookings = async () => {
      for (const b of bookings) {
        if (b.status !== 'ended' && b.checkOut && new Date(b.checkOut) < new Date()) {
          try {
            const res = await fetch(`${API_URL}/api/bookings/${b.id}/end`, {
              method: 'POST',
              credentials: 'include'
            });
            const data = await res.json();
            if (data.booking && data.booking.status === 'ended') {
              setBookings(current => current.map(b2 => b2.id === b.id ? { ...b2, status: 'ended' } : b2));
            }
          } catch (e) {
          }
        }
      }
    };
    if (bookings.length > 0) autoEndBookings();
  }, [bookings]);

  const renderStars = (rating) => {
    if (!rating) return null;
    return Array.from({ length: 5 }, (_, i) => (
      <FaStar
        key={i}
        className={`${i < Math.floor(rating) ? 'text-yellow-400' : 'text-gray-300'}`}
      />
    ));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'active':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-xl text-gray-600">Loading...</div>;
  }
  if (!user) {
    return <div className="min-h-screen flex items-center justify-center text-xl text-red-600">You must be logged in to view the dashboard.</div>;
  }
  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Welcome back, {user.name ? user.name.split(' ')[0] : 'User'}!</h1>
                <p className="text-gray-600 mt-1">Manage your apartments and bookings</p>
              </div>
              <div className="flex items-center space-x-4">
                <Link to="/upload" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl font-semibold transition-colors duration-300 flex items-center gap-2">
                  <FaPlus />
                  List Your Property
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Stats Cards (Neumorphism) */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
<<<<<<< HEAD
            <div className="rounded-2xl p-6 bg-gradient-to-b from-blue-50 to-white border border-blue-100 shadow-sm hover:shadow-md transition-shadow neu-card">
=======
            <div className="neu-card p-6 transition-all">
>>>>>>> 91099b3fca3fb4f43c5f902adb930426c86a9ddb
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 rounded-xl ring-1 ring-blue-200">
                  <FaBed className="text-blue-600 text-xl" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Bookings</p>
                  <p className="text-2xl font-bold text-gray-900">{metrics.totalBookings}</p>
                </div>
              </div>
            </div>
<<<<<<< HEAD
            <div className="rounded-2xl p-6 bg-gradient-to-b from-blue-50/60 to-white border border-blue-100 shadow-sm hover:shadow-md transition-shadow neu-card">
=======
            <div className="neu-card p-6 transition-all">
>>>>>>> 91099b3fca3fb4f43c5f902adb930426c86a9ddb
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 rounded-xl ring-1 ring-blue-200">
                  <FaCalendarAlt className="text-blue-600 text-xl" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Active Listings</p>
                  <p className="text-2xl font-bold text-gray-900">{listings.filter(l => l.status === 'active').length}</p>
                </div>
              </div>
            </div>
<<<<<<< HEAD
            <div className="rounded-2xl p-6 bg-gradient-to-b from-blue-50/60 to-white border border-blue-100 shadow-sm hover:shadow-md transition-shadow neu-card">
=======
            <div className="neu-card p-6 transition-all">
>>>>>>> 91099b3fca3fb4f43c5f902adb930426c86a9ddb
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 rounded-xl ring-1 ring-blue-200">
                  <FaStar className="text-blue-600 text-xl" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Satisfaction Rate</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {(() => {
                      // Support both ratings and _ratings field, filter only valid numbers
                      const allRatings = listings.flatMap(l => {
                        let arr = [];
                        if (Array.isArray(l.ratings)) arr = l.ratings.map(r => r.rating);
                        else if (Array.isArray(l._ratings)) arr = l._ratings.map(r => r.rating);
                        return arr.filter(r => typeof r === 'number' && !isNaN(r));
                      });
                      // Debug output for troubleshooting
                      if (allRatings.length === 0) {
                        return '0%';
                      }
                      const positive = allRatings.filter(r => r >= 4).length;
                      const percent = Math.round((positive / allRatings.length) * 100);
                      return `${percent}%`;
                    })()}
                  </p>
                </div>
              </div>
            </div>
<<<<<<< HEAD
            <div className="rounded-2xl p-6 bg-gradient-to-b from-blue-50/60 to-white border border-blue-100 shadow-sm hover:shadow-md transition-shadow neu-card">
=======
            <div className="neu-card p-6 transition-all">
>>>>>>> 91099b3fca3fb4f43c5f902adb930426c86a9ddb
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 rounded-xl ring-1 ring-blue-200">
                  <FaHeart className="text-blue-600 text-xl" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Happy Guests</p>
                  <p className="text-2xl font-bold text-gray-900">{metrics.happyGuests}</p>
                </div>
              </div>
            </div>
          </div>

<<<<<<< HEAD
          {/* Tabs */}
          <div className="bg-white rounded-2xl shadow-lg neu-card">
=======
          {/* Earnings & Growth (Neumorphism) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Earnings Summary */}
            <div className="neu-card p-6 lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Earnings Summary</h3>
                <span className="neu-pill px-3 py-1 text-xs text-gray-700">Auto-updated</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="neu-inset p-4 rounded-xl">
                  <div className="text-xs text-gray-500 mb-1">Last 30 days</div>
                  <div className="text-2xl font-bold text-gray-900">RWF {earnings.last30.toLocaleString()}</div>
                </div>
                <div className="neu-inset p-4 rounded-xl">
                  <div className="text-xs text-gray-500 mb-1">Year to date</div>
                  <div className="text-2xl font-bold text-gray-900">RWF {earnings.ytd.toLocaleString()}</div>
                </div>
                <div className="neu-inset p-4 rounded-xl">
                  <div className="text-xs text-gray-500 mb-1">Upcoming (confirmed)</div>
                  <div className="text-2xl font-bold text-gray-900">RWF {earnings.upcoming.toLocaleString()}</div>
                </div>
              </div>
              <div className="mt-4 text-sm text-gray-600">Completed stays: <span className="font-semibold text-gray-900">{earnings.countEnded}</span></div>
            </div>

            {/* Referral Banner */}
            <div className="neu-card p-6 flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Invite & Earn</h3>
                <p className="text-sm text-gray-600 mt-1">Earn rewards when your friends list or book properties via your link.</p>
              </div>
              <button onClick={() => window.location.href = '/referrals'} className="mt-4 neu-pill px-4 py-2 text-blue-700 font-semibold hover:opacity-90">Get referral link</button>
            </div>
          </div>

          {/* Tabs Container (Neumorphism) */}
          <div className="neu-card">
>>>>>>> 91099b3fca3fb4f43c5f902adb930426c86a9ddb
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-6">
                <button
                  onClick={() => setActiveTab('bookings')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-300 ${activeTab === 'bookings'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                  My Bookings
                </button>
                {user.userType === 'host' && (
                  <button
                    onClick={() => setActiveTab('listings')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-300 ${activeTab === 'listings'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                  >
                    My Listings
                  </button>
                )}
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-300 ${activeTab === 'profile'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                  Profile Settings
                </button>
              </nav>
            </div>

            <div className="p-6">
              {/* Admin Notifications Tab with Read More, timestamp sorting, and show more/less */}
              {user.userType === 'admin' && notifications.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Admin Notifications</h3>
                  <div className="space-y-3">
                    {notifications
                      .slice()
                      .sort((a, b) => new Date(b.createdAt || b.timestamp) - new Date(a.createdAt || a.timestamp))
                      .slice(0, showAll ? notifications.length : 5)
                      .map(n => (
                        <div key={n._id} className={`p-4 rounded-xl shadow flex flex-col md:flex-row md:items-center justify-between ${!n.isRead ? 'bg-blue-50 border border-blue-300' : 'bg-gray-50 border border-gray-200'}`}>
                          <div>
                            <div className="font-semibold text-gray-800">{n.title}</div>
                            <ReadMore text={n.message} maxLength={120} />
                            {n.booking && n.booking.guest && (
                              <div className="mt-2 text-sm text-gray-700">
                                <span className="font-medium">Guest:</span> {n.booking.guest.firstName} {n.booking.guest.lastName}
                                {n.booking.guest.phone && <span className="ml-4 font-medium">Phone:</span>} {n.booking.guest.phone}
                              </div>
                            )}
                            {n.property && (
                              <div className="text-sm text-gray-700"><span className="font-medium">Property:</span> {n.property.title}</div>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-2 md:mt-0 md:ml-4">
                            <span className="text-xs text-gray-500" title={n.createdAt ? new Date(n.createdAt).toLocaleString() : ''}>{n.createdAt ? new Date(n.createdAt).toLocaleString() : ''}</span>
                            {!n.isRead && <span className="px-2 py-1 bg-blue-600 text-white rounded-full text-xs">New</span>}
                          </div>
                        </div>
                      ))}
                  </div>
                  {notifications.length > 5 && (
                    <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-full text-sm" onClick={() => setShowAll(s => !s)}>
                      {showAll ? 'Show Less' : 'Show More'}
                    </button>
                  )}
                </div>
              )}
              {/* Bookings Tab */}
              {activeTab === 'bookings' && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-900">Your Bookings</h3>
                  <div className="flex items-center space-x-2">
                      <div className="relative">
                        <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          value={searchTerm}
                          onChange={e => setSearchTerm(e.target.value)}
                          placeholder="Search bookings..."
                          className="pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                        />
                      </div>
                      <select
                        value={filterStatus}
                        onChange={e => setFilterStatus(e.target.value)}
                        className="p-2 border border-gray-200 rounded-xl bg-white text-gray-700"
                      >
                        <option value="">All Statuses</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="pending">Pending</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="ended">Ended</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {useMemo(() => bookings
                      .filter(b => {
                        const term = searchTerm.toLowerCase();
                        const matchesSearch =
                          b.apartment.title.toLowerCase().includes(term) ||
                          b.apartment.location.toLowerCase().includes(term) ||
                          b.status.toLowerCase().includes(term);
                        const matchesStatus = filterStatus ? b.status === filterStatus : true;
                        return matchesSearch && matchesStatus;
                      }), [bookings, searchTerm, filterStatus])
                      .map((booking) => (
                        <div key={booking.id} className="neu-card-sm p-6 transition-all">
                          {/* Host can confirm booking if status is pending */}
                          {user.userType === 'host' && booking.status === 'pending' && (
                            <div className="mb-4 flex items-center justify-between bg-blue-100 border border-blue-400 rounded-lg px-4 py-3">
                              <span className="flex items-center text-blue-700 font-bold text-lg">
                                <FaCheckCircle className="mr-2 text-blue-600 text-2xl" />
                                Confirm Booking
                              </span>
                              <button
                                className="px-5 py-2 bg-blue-600 text-white rounded-xl font-bold text-base shadow hover:bg-blue-700 transition-colors"
                                onClick={async () => {
                                  if (!window.confirm('Confirm this booking for the guest?')) return;
                                  try {
                                    const res = await fetch(`${API_URL}/api/bookings/${booking.id}/confirm`, {
                                      method: 'POST',
                                      credentials: 'include'
                                    });
                                    const data = await res.json();
                                    if (!res.ok) throw new Error(data.message || 'Failed to confirm booking');
                                    toast.success('Booking confirmed! Guest has been notified.');
                                    setBookings(bookings.map(b => b.id === booking.id ? { ...b, status: 'confirmed' } : b));
                                  } catch (e) {
                                    toast.error('Failed to confirm booking: ' + e.message);
                                  }
                                }}
                              >
                                <FaCheckCircle className="mr-2 text-white text-xl" /> Confirm Booking
                              </button>
                            </div>
                          )}
                          {/* Guest sees green badge if booking is confirmed */}
                          {user.userType === 'guest' && booking.status === 'confirmed' && (
                            <div className="mb-4 flex items-center justify-between bg-green-100 border border-green-400 rounded-lg px-4 py-3">
                              <span className="flex items-center text-green-700 font-bold text-lg">
                                <FaCheckCircle className="mr-2 text-green-600 text-2xl" />
                                Booking Confirmed
                              </span>
                            </div>
                          )}
                          {/* End booking button for guest or host if not ended */}
                          {booking.status !== 'ended' && (
                            <div className="mb-4 flex items-center justify-between bg-green-100 border border-green-400 rounded-lg px-4 py-3">
                              <span className="flex items-center text-green-700 font-bold text-lg">
                                <FaCheckCircle className="mr-2 text-green-600 text-2xl" />
                                Ready to End Booking
                              </span>
                              <button
                                className="px-5 py-2 bg-green-600 text-white rounded-xl font-bold text-base shadow hover:bg-green-700 transition-colors"
                                onClick={async () => {
                                  if (!window.confirm('Are you sure you want to end this booking? This action cannot be undone.')) return;
                                  try {
                                    const res = await fetch(`${API_URL}/api/bookings/${booking.id}/end`, {
                                      method: 'POST',
                                      credentials: 'include'
                                    });
                                    const data = await res.json();
                                    if (!res.ok) throw new Error(data.message || 'Failed to mark as ended');
                                    toast.success('Booking marked as ended! You can now rate your stay.');
                                    setBookings(bookings.filter(b => b.id !== booking.id));
                                  } catch (e) {
                                    toast.error('Failed to end booking: ' + e.message);
                                  }
                                }}
                              >
                                <FaCheckCircle className="mr-2 text-white text-xl" /> Mark as Ended
                              </button>
                            </div>
                          )}
                          <div className="flex items-start space-x-4">
                            <img
                              loading="lazy"
                              src={(booking.apartment.image?.startsWith('http') ? booking.apartment.image : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${booking.apartment.image}`)}
                              alt={booking.apartment.title}
                              className="w-24 h-24 rounded-lg object-cover"
                              onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=300&h=200&fit=crop'; }}
                            />
                            <div className="flex-1">
                              <div className="flex items-start justify-between">
                                <div>
                                  <h4 className="font-semibold text-gray-900">{booking.apartment.title}</h4>
                                  <div className="flex items-center mt-1 text-gray-600">
                                    <FaMapMarkerAlt className="mr-1" />
                                    <span className="text-sm">{booking.apartment.location}</span>
                                  </div>
                                  <div className="flex items-center mt-2 space-x-4 text-sm text-gray-600">
                                    <div className="flex items-center">
                                      <FaCalendarAlt className="mr-1" />
                                      <span>{booking.checkIn} - {booking.checkOut}</span>
                                    </div>
                                    <span className="font-medium text-gray-900">RWF {booking.total.toLocaleString()}</span>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                                    {booking.status}
                                  </span>
                                  {booking.rating && (
                                    <div className="flex items-center mt-2">
                                      {renderStars(booking.rating)}
                                      <span className="ml-1 text-sm text-gray-600">{booking.rating}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center space-x-2 mt-4">
                                <button onClick={async () => {
                                  try {
                                    const res = await fetch(`${API_URL}/api/bookings/${booking.id}`, { credentials: 'include' });
                                    const data = await res.json();
                                    if (!res.ok) throw new Error(data.message || 'Failed to load booking');
                                    setBookingModal({ open: true, booking, details: data.booking });
                                  } catch (e) { toast.error(e.message); }
                                }} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
                                  View Details
                                </button>
                                {booking.status === 'ended' && !booking.rating && (
                                  <StarRatingForm booking={booking} setBookings={setBookings} bookings={bookings} />
                                )}
                                {booking.status === 'confirmed' && (
                                  <button
                                    onClick={async () => {
                                      if (!window.confirm('Cancel this booking?')) return;
                                      try {
                                        const res = await fetch(`${API_URL}/api/bookings/${booking.id}/status`, {
                                          method: 'PATCH',
                                          headers: { 'Content-Type': 'application/json' },
                                          credentials: 'include',
                                          body: JSON.stringify({ status: 'cancelled' })
                                        });
                                        const data = await res.json();
                                        if (!res.ok) throw new Error(data.message || 'Failed to cancel booking');
                                        toast.success('Booking cancelled');
                                        setBookings(prev => prev.map(b => b.id === booking.id ? { ...b, status: 'cancelled' } : b));
                                      } catch (e) {
                                        toast.error(e.message);
                                      }
                                    }}
                                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                                  >
                                    Cancel Booking
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

              {/* Listings Tab */}
              {activeTab === 'listings' && user.userType === 'host' && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-900">Your Listings</h3>
                    <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2">
                      <FaPlus />
                      Add New Listing
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {listings.map((listing) => (
                      <div key={listing.id} className="neu-card-sm overflow-hidden transition-all">
                        <img
                          loading="lazy"
                          src={listing.image}
                          alt={listing.title}
                          className="w-full h-48 object-cover"
                          onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=300&h=200&fit=crop'; }}
                        />
                        <div className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-semibold text-gray-900">{listing.title}</h4>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(listing.status)}`}>
                              {listing.status}
                            </span>
                          </div>
                          <div className="flex items-center text-gray-600 mb-2">
                            <FaMapMarkerAlt className="mr-1" />
                            <span className="text-sm">{listing.location}</span>
                          </div>
                          <div className="flex items-center justify-between mb-4">
                            <span className="text-lg font-bold text-blue-600">RWF {listing.price.toLocaleString()}/month</span>
                            <div className="flex items-center">
                              {/* Show real average rating for property */}
                              {listing.ratings && listing.ratings.length > 0 ? (
                                <>
                                  {renderStars(Math.round(listing.ratings.reduce((sum, r) => sum + r.rating, 0) / listing.ratings.length))}
                                  <span className="ml-1 text-sm text-gray-600">{(listing.ratings.reduce((sum, r) => sum + r.rating, 0) / listing.ratings.length).toFixed(1)}</span>
                                </>
                              ) : (
                                <span className="text-gray-400">No ratings</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                            <span>{listing.bookings} bookings</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
                              View Details
                            </button>
                            <Link to={`/upload?edit=${listing.id}`} className="p-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                              <FaEdit />
                            </Link>
                            <button onClick={async () => {
                              if (!window.confirm('Are you sure you want to delete this listing? This cannot be undone.')) return;
                              try {
                                const res = await fetch(`${API_URL}/api/properties/${listing.id}`, { method: 'DELETE', credentials: 'include' });
                                const data = await res.json();
                                if (!res.ok) throw new Error(data.message || 'Failed to delete');
                                toast.success('Listing deleted');
                                setListings(listings.filter(x => x.id !== listing.id));
                              } catch (e) { toast.error(e.message); }
                            }} className="p-2 border border-gray-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors">
                              <FaTrash />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Profile Tab */}
              {activeTab === 'profile' && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">Profile Settings</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <input
                            type="text"
                            placeholder="First name"
                            value={profileForm.firstName}
                            onChange={e => setProfileForm({ ...profileForm, firstName: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                          <input
                            type="text"
                            placeholder="Last name"
                            value={profileForm.lastName}
                            onChange={e => setProfileForm({ ...profileForm, lastName: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                        <input
                          type="email"
                          value={profileForm.email}
                          onChange={e => setProfileForm({ ...profileForm, email: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                        <input
                          type="tel"
                          placeholder="+250 xxx xxx xxx"
                          value={profileForm.phone}
                          onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
                          <div className="relative">
                            <input
                              type={showPwd.current ? 'text' : 'password'}
                              value={passwords.currentPassword}
                              onChange={e => setPasswords({ ...passwords, currentPassword: e.target.value })}
                              placeholder="Enter current password"
                              className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPwd({ ...showPwd, current: !showPwd.current })}
                              className="absolute inset-y-0 right-0 px-3 text-sm text-gray-600 hover:text-gray-800"
                            >
                              {showPwd.current ? 'Hide' : 'Show'}
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                          <div className="relative">
                            <input
                              type={showPwd.next ? 'text' : 'password'}
                              value={passwords.password}
                              onChange={e => setPasswords({ ...passwords, password: e.target.value })}
                              placeholder="Enter new password"
                              className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPwd({ ...showPwd, next: !showPwd.next })}
                              className="absolute inset-y-0 right-0 px-3 text-sm text-gray-600 hover:text-gray-800"
                            >
                              {showPwd.next ? 'Hide' : 'Show'}
                            </button>
                          </div>
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
                          <div className="relative">
                            <input
                              type={showPwd.confirm ? 'text' : 'password'}
                              value={passwords.confirmPassword}
                              onChange={e => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                              placeholder="Re-enter new password"
                              className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPwd({ ...showPwd, confirm: !showPwd.confirm })}
                              className="absolute inset-y-0 right-0 px-3 text-sm text-gray-600 hover:text-gray-800"
                            >
                              {showPwd.confirm ? 'Hide' : 'Show'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-6">
                      <div className="text-center">
                        {user?.avatar ? (
                          <img src={user.avatar} alt={user.name} className="w-24 h-24 rounded-full mx-auto mb-4 object-cover" />
                        ) : (
                          <div className="w-24 h-24 rounded-full mx-auto mb-4 bg-blue-600 text-white flex items-center justify-center text-3xl font-bold">
                            {(user?.name?.trim?.()?.[0] || user?.email?.trim?.()?.[0] || 'U').toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Bio</label>
                        <textarea
                          rows="4"
                          placeholder="Tell us about yourself..."
                          value={profileForm.bio}
                          onChange={e => setProfileForm({ ...profileForm, bio: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="mt-8 flex justify-end">
                    <button
                      onClick={async () => {
                        try {
                          if (passwords.password && passwords.password !== passwords.confirmPassword) {
                            toast.error('Passwords do not match');
                            return;
                          }
                          const payload = {
                            firstName: profileForm.firstName,
                            lastName: profileForm.lastName,
                            email: profileForm.email,
                            phone: profileForm.phone,
                            bio: profileForm.bio,
                            ...(passwords.password ? { password: passwords.password, currentPassword: passwords.currentPassword } : {})
                          };
                          await updateProfile(payload);
                          setPasswords({ currentPassword: '', password: '', confirmPassword: '' });
                          toast.success('Profile updated');
                        } catch (e) {
                          toast.error(e.message);
                        }
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>)}
            </div>
            {bookingModal.open && bookingModal.details && (
              <>
                <div className="p-6 space-y-4 overflow-y-auto">
                  <div>
                    <div className="text-gray-600">Check-in</div>
                    <div className="font-medium text-gray-900">{new Date(bookingModal.details.checkIn).toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Check-out</div>
                    <div className="font-medium text-gray-900">{new Date(bookingModal.details.checkOut).toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Guests</div>
                    <div className="font-medium text-gray-900">{bookingModal.details.numberOfGuests}</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Total Amount</div>
                    <div className="font-medium text-gray-900">RWF {Number(bookingModal.details.totalAmount || 0).toLocaleString()}</div>
                  </div>
                  {bookingModal.details.paymentMethod && (
                    <div>
                      <div className="text-gray-600">Payment Method</div>
                      <div className="font-medium text-gray-900">{String(bookingModal.details.paymentMethod).replace('_', ' ')}</div>
                    </div>
                  )}
                </div>
                <div className="border-t bg-gray-50 p-4 flex items-center justify-end gap-2">
                  <button
                    onClick={() => {
                      // Navigate to full page for receipts and chat
                      window.open(`/booking-confirmation/${bookingModal.details._id}`, '_blank');
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                  >
                    Open Full Details
                  </button>
                  {(bookingModal.details.status === 'pending' || bookingModal.details.status === 'confirmed') && (
                    <button
                      onClick={async () => {
                        try {
                          const res = await fetch(`${API_URL}/api/bookings/${bookingModal.details._id}/status`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            credentials: 'include',
                            body: JSON.stringify({ status: 'cancelled' })
                          });
                          const data = await res.json();
                          if (!res.ok) throw new Error(data.message || 'Failed to cancel');
                          toast.success('Booking cancelled');
                          setBookings(prev => prev.map(b => b.id === bookingModal.details._id ? { ...b, status: 'cancelled' } : b));
                          setBookingModal(m => ({ ...m, details: { ...m.details, status: 'cancelled' } }));
                        } catch (e) { toast.error(e.message); }
                      }}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100"
                    >
                      Cancel Booking
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>)
}

export default Dashboard;
