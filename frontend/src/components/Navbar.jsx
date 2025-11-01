import React, { useState, useEffect, useRef } from "react";
import toast from 'react-hot-toast';
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useSocket } from "../contexts/SocketContext";
import { safeApiGet, apiGet, apiPatch } from "../utils/apiUtils";
import {
  FaHome,
  FaCar,
  FaPlane,
  FaBed,
  FaUtensils,
  FaShoppingBag,
  FaBars,
  FaTimes,
  FaUser,
  FaSignOutAlt,
  FaBell,
  FaCog,
  FaGlobe,
  FaCaretDown,
  FaSearch,
  FaHeart,
  FaShoppingCart,
  FaEnvelope,
  FaUserCircle,
  FaChevronDown,
  FaChevronUp,
  FaChartLine,
  FaCalendarAlt,
  FaDollarSign,
  FaStar,
  FaCog as FaSettings,
  FaQuestionCircle,
  FaFileAlt,
  FaUsers,
  FaBuilding,
  FaMapMarkerAlt,
  FaUmbrellaBeach,
  FaChevronRight,
} from "react-icons/fa";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [unreadMsgCount, setUnreadMsgCount] = useState(0);
  const [userStats, setUserStats] = useState({ properties: 0, bookings: 0, rating: 0 });
  const { socket } = useSocket();
  const [uiError, setUiError] = useState(null);
  const [avatarOk, setAvatarOk] = useState(true);
  const [showOwnerSwitch, setShowOwnerSwitch] = useState(false);
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [switchLoading, setSwitchLoading] = useState(false);
  const [myProperties, setMyProperties] = useState([]);
  const [propDropdownOpen, setPropDropdownOpen] = useState(false);

  const makeAbsolute = (u) => {
    if (!u) return u;
    let s = String(u).replace(/\\+/g, '/');
    if (s.startsWith('http')) return s;
    if (!s.startsWith('/')) s = `/${s}`;
    return `${API_URL}${s}`;
  };

  // Main navigation items like Booking.com
  const mainNavItems = [
    {
      label: "Stays",
      icon: FaHome,
      href: "/apartments",
      children: [
        { label: "Apartments", href: "/apartments", icon: FaBuilding },
        { label: "Hotels", href: "/hotels", icon: FaBed },
        { label: "Homes", href: "/homes", icon: FaHome },
        { label: "Resorts", href: "/resorts", icon: FaUmbrellaBeach },
      ]
    },
    {
      label: "Flights",
      icon: FaPlane,
      href: "/flights",
      children: [
        { label: "Search flights", href: "/flights", icon: FaPlane },
        { label: "Flight deals", href: "/flights?deals=true", icon: FaPlane },
        { label: "Multi-city", href: "/flights?multi=true", icon: FaPlane },
      ]
    },
    {
      label: "Car Rentals",
      icon: FaCar,
      href: "/cars",
      children: [
        { label: "Rent a car", href: "/cars", icon: FaCar },
        { label: "My Cars", href: "/owner/cars", icon: FaCar },
        { label: "Car deals", href: "/cars?deals=true", icon: FaCar },
      ]
    },
    {
      label: "Attractions",
      icon: FaUmbrellaBeach,
      href: "/experiences",
      children: [
        { label: "Tours & Activities", href: "/experiences", icon: FaUmbrellaBeach },
        { label: "Restaurants", href: "/restaurants", icon: FaUtensils },
        { label: "Deals", href: "/deals", icon: FaShoppingBag },
      ]
    },
    {
      label: "Airport taxis",
      icon: FaCar,
      href: "/airport-taxis",
      children: [
        { label: "Book airport taxi", href: "/airport-taxis", icon: FaCar },
        { label: "Taxi deals", href: "/airport-taxis?deals=true", icon: FaCar },
      ]
    }
  ];

  // Owner management links organized exactly like Booking.com
  const ownerManagementLinks = [
    {
      category: "Reservations",
      icon: FaCalendarAlt,
      links: [
        { label: "All reservations", href: "/my-bookings?tab=bookings&scope=all" },
        { label: "Paid reservations", href: "/my-bookings?tab=bookings&scope=paid" },
        { label: "Pending reservations", href: "/my-bookings?tab=bookings&scope=pending" },
        { label: "Unpaid reservations", href: "/my-bookings?tab=bookings&scope=unpaid" },
        { label: "Cancelled reservations", href: "/my-bookings?tab=bookings&scope=cancelled" },
      ]
    },
    {
      category: "Calendar",
      icon: FaCalendarAlt,
      links: [
        { label: "This month", href: "/my-bookings?tab=calendar&monthOffset=0" },
        { label: "Next month", href: "/my-bookings?tab=calendar&monthOffset=1" },
        { label: "This year", href: "/my-bookings?tab=calendar" },
      ]
    },
    {
      category: "Finance",
      icon: FaDollarSign,
      links: [
        { label: "All payments", href: "/my-bookings?tab=finance&finance_status=all" },
        { label: "Paid", href: "/my-bookings?tab=finance&finance_status=paid" },
        { label: "Pending", href: "/my-bookings?tab=finance&finance_status=pending" },
        { label: "Unpaid", href: "/my-bookings?tab=finance&finance_status=unpaid" },
        { label: "Last 30 days", href: "/my-bookings?tab=finance&view=last30" },
        { label: "Month to date", href: "/my-bookings?tab=finance&view=mtd" },
        { label: "Year to date", href: "/my-bookings?tab=finance&view=ytd" },
      ]
    },
    {
      category: "Analytics",
      icon: FaChartLine,
      links: [
        { label: "Last 30 days", href: "/my-bookings?tab=analytics&range=30" },
        { label: "Last 90 days", href: "/my-bookings?tab=analytics&range=90" },
        { label: "Year to date", href: "/my-bookings?tab=analytics&range=ytd" },
        { label: "Custom range", href: "/my-bookings?tab=analytics&range=custom" },
      ]
    },
    {
      category: "Promotions",
      icon: FaShoppingBag,
      links: [
        { label: "Manage promotions", href: "/owner/promotions" },
        { label: "Create new promotion", href: "/owner/promotions?mode=new" },
        { label: "Active promotions", href: "/owner/promotions?status=active" },
        { label: "Expired promotions", href: "/owner/promotions?status=expired" },
      ]
    },
    {
      category: "Reviews",
      icon: FaStar,
      links: [
        { label: "All reviews", href: "/owner/reviews" },
        { label: "Unreplied reviews", href: "/owner/reviews?filter=unreplied" },
        { label: "5-star reviews", href: "/owner/reviews?filter=5star" },
        { label: "Low ratings", href: "/owner/reviews?filter=low" },
      ]
    },
    {
      category: "Messages",
      icon: FaEnvelope,
      links: [
        { label: "Inbox", href: "/messages" },
        { label: "Unread messages", href: "/messages?filter=unread" },
        { label: "Archived messages", href: "/messages?filter=archived" },
      ]
    },
    {
      category: "Settings",
      icon: FaSettings,
      links: [
        { label: "Property settings", href: "/upload" },
        { label: "Account settings", href: "/settings" },
        { label: "Payment settings", href: "/settings?tab=payment" },
        { label: "Notification settings", href: "/settings?tab=notifications" },
        { label: "Workers", href: "/owner/workers" },
      ]
    }
  ];

  useEffect(() => {
    if (socket && isAuthenticated) {
      socket.on("newMessage", (data) => {
        setUnreadMsgCount((prev) => prev + 1);
      });

      socket.on("messageRead", () => {
        setUnreadMsgCount(0);
      });

      return () => {
        socket.off("newMessage");
        socket.off("messageRead");
      };
    }
  }, [socket, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    let timer;
    const loadUnread = async () => {
      const data = await safeApiGet('/api/notifications/unread-count', { count: 0 });
      setUnreadNotifCount(Number(data.count || 0));
    };

    const loadUnreadMessages = async () => {
      const data = await safeApiGet('/api/messages/unread-count', { count: 0 });
      setUnreadMsgCount(Number(data.count || 0));
    };
    const loadUserStats = async () => {
      if (user?.userType === 'host') {
        // Try stats endpoint first, fallback to dashboard
        let data = await safeApiGet('/api/reports/stats', null);
        if (!data) {
          data = await safeApiGet('/api/reports/dashboard', { properties: 0, bookings: 0, rating: 0 });
        }

        setUserStats({
          properties: data.totalProperties || 0,
          bookings: data.totalBookings || 0,
          rating: data.averageRating || 0
        });
      }
    };

    const loadList = async () => {
      const data = await safeApiGet('/api/notifications/list', { notifications: [] });
      const list = (data.notifications || []).map(n => ({
        id: n._id,
        type: n.type,
        title: n.title,
        message: n.message,
        isRead: n.isRead,
        createdAt: n.createdAt
      }));
      setNotifications(list);
    };

    // Initial fetch so UI shows live data immediately
    loadUnread();
    loadUnreadMessages();
    loadUserStats();
    loadList();

    timer = setInterval(() => {
      loadUnread();
      loadUnreadMessages();
      loadUserStats();
      loadList();
    }, 30000);
    return () => { if (timer) clearInterval(timer); };
  }, [isAuthenticated, user?.userType]);

  // Load host's properties for property selector (desktop and mobile)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!isAuthenticated || user?.userType !== 'host') return;
        const [res1, res2] = await Promise.all([
          fetch(`${API_URL}/api/properties/my-properties`, { credentials: 'include' }),
          fetch(`${API_URL}/api/properties/mine`, { credentials: 'include' })
        ]);
        const [data1, data2] = await Promise.all([
          res1.ok ? res1.json().catch(()=>({properties:[]})) : Promise.resolve({properties: []}),
          res2.ok ? res2.json().catch(()=>({properties:[]})) : Promise.resolve({properties: []}),
        ]);
        const list = [...(data1.properties||[]), ...(data2.properties||[])];
        // Deduplicate by _id
        const seen = new Set();
        const merged = list.filter(p => {
          const id = String(p._id || p.id || '');
          if (!id || seen.has(id)) return false;
          seen.add(id);
          return true;
        });
        if (!cancelled) setMyProperties(merged);
      } catch (_) {
        if (!cancelled) setMyProperties([]);
      }
    })();
    return () => { cancelled = true; };
  }, [isAuthenticated, user?.userType]);

  // Refresh counts/stats when opening the profile dropdown to ensure fresh DB values
  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.notification-dropdown') && !event.target.closest('.notification-button')) {
        setIsNotificationOpen(false);
      }
      if (!event.target.closest('.profile-dropdown') && !event.target.closest('.profile-button')) {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !isProfileOpen) return;
    (async () => {
      const unreadNotif = await safeApiGet('/api/notifications/unread-count', { count: 0 });
      setUnreadNotifCount(Number(unreadNotif.count || 0));
      const unreadMsgs = await safeApiGet('/api/messages/unread-count', { count: 0 });
      setUnreadMsgCount(Number(unreadMsgs.count || 0));
      if (user?.userType === 'host') {
        let data = await safeApiGet('/api/reports/stats', null);
        if (!data) data = await safeApiGet('/api/reports/dashboard', { properties: 0, bookings: 0, rating: 0 });
        setUserStats({
          properties: data.totalProperties || 0,
          bookings: data.totalBookings || 0,
          rating: data.averageRating || 0
        });
      }
    })();
  }, [isAuthenticated, isProfileOpen, user?.userType]);

  const markNotificationRead = async (id) => {
    const success = await apiPatch(`/api/notifications/${id}/read`);
    if (success) {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnreadNotifCount(prev => Math.max(0, prev - 1));
    } else {
      setUiError('Could not update notification status. Please try again.');
    }
  };

  const getNotificationLink = (n) => {
    if (!n) return '#';
    // Route mapping by type and attached entities
    if ((n.type?.startsWith('booking') || n.type?.includes('receipt')) && (n.booking?._id || n.booking)) {
      const bid = n.booking?._id || n.booking;
      return `/booking-confirmation/${bid}`;
    }
    if (n.property?._id || n.property) {
      const pid = n.property?._id || n.property;
      return `/properties/${pid}`;
    }
    return '/admin';
  };

  const isActiveRoute = (path) => {
    return location.pathname === path;
  };

  // Check if user is in property owner dashboard context
  const isInPropertyOwnerDashboard = () => {
    const ownerRoutes = ['/dashboard', '/user-dashboard', '/my-bookings', '/upload', '/owner'];
    return ownerRoutes.some(route => location.pathname.startsWith(route));
  };

  const handleLogout = () => {
    logout();
    navigate("/logout-success");
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const toggleProfile = () => {
    setIsProfileOpen(!isProfileOpen);
    setIsNotificationOpen(false); // Close notifications when opening profile
  };

  const toggleNotifications = () => {
    setIsNotificationOpen(!isNotificationOpen);
    setIsProfileOpen(false); // Close profile when opening notifications
  };

  const toggleDropdown = (dropdownName) => {
    setActiveDropdown(activeDropdown === dropdownName ? null : dropdownName);
  };

  const groupedNotifications = () => {
    return notifications.reduce((acc, n) => {
      const cat = n.type?.includes('property') ? 'Properties' : (n.type?.includes('booking') ? 'Bookings' : 'General');
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(n);
      return acc;
    }, {});
  };

  const avatarUrl = user?.avatar ? makeAbsolute(user.avatar) : null;

  const handleListProperty = () => {
    // Always guard into owner mode before listing
    if (!isAuthenticated || user?.userType !== 'host') {
      setOwnerEmail(user?.email || '');
      setOwnerPassword('');
      setShowOwnerSwitch(true);
      return;
    }
    // Navigate to new multi-step listing flow
    navigate('/list-property');
  };

  const goToPropertyDashboard = () => {
    if (!isAuthenticated) {
      navigate('/login?redirect=/dashboard');
      return;
    }
    if (user?.userType === 'host') {
      navigate('/dashboard');
      return;
    }
    // Non-host trying to access dashboard: open pre-confirm modal
    setOwnerEmail(user?.email || '');
    setShowOwnerSwitch(true);
  };

  const submitOwnerSwitch = async (e) => {
    e?.preventDefault?.();
    const email = String(ownerEmail || '').trim();
    const password = String(ownerPassword || '').trim();
    if (!email || !password) { toast.error('Enter owner email and password'); return; }
    try {
      setSwitchLoading(true);
      // Logout current session (user mode)
      await fetch(`${API_URL}/api/auth/logout`, { method: 'POST', credentials: 'include' });
      // Login as owner
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json().catch(()=>({}));
      if (!res.ok) throw new Error(data.message || 'Owner login failed');
      // Ensure account is host
      if (data?.user?.userType !== 'host') {
        toast.error('That account is not a property owner');
        return;
      }
      toast.success('Switched to Property Owner');
      setShowOwnerSwitch(false);
      setOwnerPassword('');
      // Redirect to owner dashboard
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.message || 'Could not switch account');
    } finally {
      setSwitchLoading(false);
    }
  };

  return (
    <>
      {/* Top Bar - First Level */}
      <div className="w-full bg-[#4b2a00] text-white py-2 px-4 border-b border-[#3a2000]">
        <div className="max-w-7xl mx-auto flex justify-between items-center text-xs">
          <div className="flex items-center space-x-4 lg:space-x-6">
            {/* Property Owner Links - Show when authenticated as host (only show Dashboard label in owner context) */}
            {isAuthenticated && user?.userType === 'host' && (
              <>
                {userStats.properties > 0 && isInPropertyOwnerDashboard() && (
                  <Link to="/dashboard" className="hidden sm:inline hover:text-white font-medium">
                    Dashboard
                  </Link>
                )}
                <Link
                  to="/my-bookings"
                  className="hidden sm:inline hover:text-white font-medium"
                >
                  My Bookings
                </Link>
                <Link
                  to="/owner/cars"
                  className="hidden sm:inline hover:text-white font-medium"
                >
                  My Cars
                </Link>
              </>
            )}

            {/* Admin Links */}
            {isAuthenticated && user?.userType === "admin" && (
              <>
                <Link
                  to="/admin"
                  className="hidden sm:inline hover:text-white font-medium"
                >
                  Admin Dashboard
                </Link>
                <Link
                  to="/admin/reports"
                  className="hidden sm:inline hover:text-white font-medium"
                >
                  Reports
                </Link>
                <Link
                  to="/admin/landing"
                  className="hidden sm:inline hover:text-white font-medium"
                >
                  Content
                </Link>
              </>
            )}

            {/* Universal Links - Show to all users */}
            <Link
              to="/support"
              className="hover:text-white font-medium"
            >
              Customer Support
            </Link>

            {/* Hide guest-specific links when in property owner dashboard */}
            {!isInPropertyOwnerDashboard() && (
              <>
                <Link
                  to="/notifications"
                  className="hidden sm:inline hover:text-white font-medium"
                >
                  Notifications
                </Link>
                <span className="hidden lg:inline hover:text-white cursor-pointer font-medium">
                  Partner Portal
                </span>
              </>
            )}
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 hover:text-white cursor-pointer">
              <FaGlobe className="text-sm" />
              <span className="hidden sm:inline">English</span>
            </div>
            <div className="flex items-center space-x-2 hover:text-white cursor-pointer">
              <span className="font-semibold">RWF</span>
            </div>
          </div>
        </div>
      </div>

      {/* Friendly error banner */}
      {uiError && (
        <div className="w-full bg-red-50 text-red-700 px-4 py-2 text-sm border-b border-red-200">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <span>{uiError}</span>
            <button className="text-xs underline" onClick={() => setUiError(null)}>Dismiss</button>
          </div>
        </div>
      )}

      {/* Blocked account banner */}
      {isAuthenticated && user?.isBlocked && (
        <div className="w-full bg-yellow-50 text-yellow-800 px-4 py-3 text-sm border-b border-yellow-200" role="region" aria-live="polite">
          <div className="max-w-7xl mx-auto grid gap-2 sm:gap-3 sm:flex sm:flex-row sm:items-center sm:justify-between">
            <div className="font-medium leading-relaxed">
              Your account is temporarily deactivated due to outstanding dues. Some features are restricted.
            </div>
            <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-2">
              <Link to="/billing/pay-commission" className="inline-flex justify-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 w-full sm:w-auto">Pay commission</Link>
              <Link to="/notifications" className="inline-flex justify-center px-3 py-2 bg-white text-yellow-800 border border-yellow-300 rounded-md hover:bg-yellow-100 w-full sm:w-auto">View notice</Link>
            </div>
          </div>
        </div>
      )}

      {/* Second Bar - Navigation Level */}
      <nav className="w-full bg-[#f5f0e8] border-b border-[#e0d5c7] navbar-shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            {/* Logo */}
            <div className="flex items-center space-x-8">
              <Link
                to="/"
                className="text-xl font-bold text-[#4b2a00] hover:text-[#6b3f1f]"
              >
                AKWANDA.rw
              </Link>

              {/* Property Owner Mode Indicator */}
              {user?.userType === 'host' && isInPropertyOwnerDashboard() && (
                <div className="hidden lg:flex items-center space-x-4">
                  <div className="flex items-center space-x-2 px-3 py-2 bg-[#e8dcc8] rounded-lg border border-[#d0c4b0]">
                    <FaBuilding className="text-[#8b6f47] text-sm" />
                    <span className="text-sm font-medium text-[#6b5744]">Property Owner Mode</span>
                  </div>
                  <div className="text-xs text-[#F5E6D3]">
                    <span>To book as guest, </span>
                    <button
                      onClick={handleLogout}
                      className="text-[#8b6f47] hover:text-[#4b2a00] underline font-medium"
                    >
                      logout and login as guest
                    </button>
                  </div>
                </div>
              )}

              {/* Main Navigation Items - Show for guests and hide for property owners in dashboard */}
              {user?.userType !== "admin" && (user?.userType !== 'host' || !isInPropertyOwnerDashboard()) && (
                <div className="hidden lg:flex items-center space-x-1">
                  {mainNavItems.map((item, index) => {
                    const Icon = item.icon;
                    const isActive = isActiveRoute(item.href);
                    const isDropdownOpen = activeDropdown === item.label;

                    return (
                      <div key={index} className="relative group">
                        <button
                          onClick={() => toggleDropdown(item.label)}
                          className={`flex items-center space-x-1 px-3 py-2 rounded-lg transition-all duration-300 font-medium text-sm ${isActive
                              ? "bg-[#a06b42] text-white shadow-md"
                              : "text-[#6b5744] hover:text-[#4b2a00] hover:bg-[#e8dcc8]"
                            }`}
                        >
                          <Icon className="text-sm" />
                          <span>{item.label}</span>
                          <FaCaretDown className={`text-xs transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Dropdown Menu - Booking.com Style */}
                        {isDropdownOpen && (
                          <div className="absolute top-full left-0 mt-1 w-64 bg-[#f6e9d8] rounded-xl dropdown-shadow border border-[#d4c4b0] py-3 z-50">
                            {item.children
                              .filter((child) => {
                                const href = String(child.href || '');
                                const ownerOnly = href.startsWith('/owner');
                                if (ownerOnly) return user?.userType === 'host' || user?.userType === 'admin';
                                return true;
                              })
                              .map((child, childIndex) => {
                                const ChildIcon = child.icon;
                                const isChildActive = isActiveRoute(child.href);
                                return (
                                  <Link
                                    key={childIndex}
                                    to={child.href}
                                    className={`flex items-center space-x-3 px-4 py-3 text-sm hover:bg-white transition-colors ${isChildActive ? 'bg-white text-[#4b2a00]' : 'text-[#4b2a00]'
                                      }`}
                                    onClick={() => setActiveDropdown(null)}
                                  >
                                    <ChildIcon className="text-sm" />
                                    <span>{child.label}</span>
                                    {isChildActive && <FaChevronRight className="text-xs ml-auto" />}
                                  </Link>
                                );
                              })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right Side - Booking.com Style */}
            <div className="flex flex-nowrap items-center gap-2 lg:gap-3">
              {/* Property selector (desktop) */}
              {isAuthenticated && user?.userType === 'host' && myProperties.length > 0 && (
                <div className="hidden lg:block relative">
                  <button
                    onClick={() => setPropDropdownOpen(v => !v)}
                    className={`flex items-center px-3 py-2 rounded-lg transition-all duration-300 ${propDropdownOpen
                        ? 'bg-[#a06b42] text-white shadow-md'
                        : 'text-[#6b5744] hover:text-[#4b2a00] hover:bg-[#e8dcc8]'
                      }`}
                    title="Choose property to manage"
                  >
                    <FaBuilding className="text-lg" />
                    <FaCaretDown className={`ml-2 text-xs transition-transform ${propDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {propDropdownOpen && (
                    <div className="absolute top-full right-0 mt-1 w-80 max-h-80 overflow-y-auto bg-[#f6e9d8] rounded-xl dropdown-shadow border border-[#d4c4b0] p-2 z-50">
                      {myProperties.map((p) => (
                        <Link
                          key={p._id}
                          to={`/my-bookings?tab=calendar&property=${p._id}`}
                          className="block px-3 py-2 rounded hover:bg-white text-sm text-[#4b2a00] truncate"
                          onClick={() => setPropDropdownOpen(false)}
                          title={p.title}
                        >
                          {p.title || p.name || p.propertyNumber}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {/* List your property - Hidden on small screens completely */}
              <button
                onClick={handleListProperty}
                className="hidden lg:inline-flex items-center px-2 lg:px-3 py-2 rounded-lg bg-[#a06b42] text-white text-xs lg:text-sm font-medium hover:bg-[#8f5a32] transition-colors whitespace-nowrap shadow-md"
                title="List your property"
              >
                <span className="hidden lg:inline">List your property</span>
                <span className="lg:hidden">List Property</span>
              </button>

              {/* Property Dashboard - hidden in user mode to reduce overflow; visible only in owner dashboard context */}
              {isAuthenticated && user?.userType === 'host' && isInPropertyOwnerDashboard() && (
                <button
                  onClick={() => navigate('/dashboard')}
                  className="hidden lg:inline-flex items-center px-2 lg:px-3 py-2 rounded-lg bg-green-600 text-white text-xs lg:text-sm font-medium hover:bg-green-700 transition-colors whitespace-nowrap"
                  title="Property Owner Dashboard"
                >
                  <span className="hidden lg:inline">Dashboard</span>
                  <span className="lg:hidden">Dash</span>
                </button>
              )}
              {/* Analytics Dropdown - Booking.com Style */}
              {isAuthenticated && user?.userType === 'host' && (
                <div className="hidden lg:block relative">
                  <button
                    onClick={() => toggleDropdown('owner')}
                    className={`flex items-center px-3 py-2 rounded-lg transition-all duration-300 ${activeDropdown === 'owner'
                        ? "bg-[#a06b42] text-white shadow-md"
                        : "text-[#6b5744] hover:text-[#4b2a00] hover:bg-[#e8dcc8]"
                      }`}
                    title="Analytics & Management"
                  >
                    <FaChartLine className="text-lg" />
                  </button>

                  {/* Owner Management Dropdown - Booking.com Style */}
                  {activeDropdown === 'owner' && (
                    <div className="absolute top-full right-0 mt-1 w-[900px] bg-[#f6e9d8] rounded-xl dropdown-shadow border border-[#d4c4b0] p-6 z-50">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-sm">
                        {ownerManagementLinks.map((category, index) => {
                          const CategoryIcon = category.icon;
                          return (
                            <div key={index}>
                              <div className="flex items-center space-x-2 mb-4">
                                <CategoryIcon className="text-gray-700 text-lg" />
                                <div className="text-sm font-semibold text-gray-700">
                                  {category.category}
                                </div>
                              </div>
                              <div className="space-y-1">
                                {category.links.map((link, linkIndex) => (
                                  <Link
                                    key={linkIndex}
                                    to={link.href}
                                    className="block px-3 py-2 rounded hover:bg-gray-100 hover:text-gray-800 text-gray-600 transition-colors"
                                    onClick={() => setActiveDropdown(null)}
                                  >
                                    {link.label}
                                  </Link>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Favorites */}
              {isAuthenticated && !isInPropertyOwnerDashboard() && (
                <Link
                  to="/favorites"
                  className="hidden lg:flex items-center px-3 py-2 rounded-lg text-[#6b5744] hover:text-[#4b2a00] hover:bg-[#e8dcc8] transition-colors"
                  title="Favorites"
                >
                  <FaHeart className="text-lg" />
                </Link>
              )}

              {/* Messages */}
              {isAuthenticated && (user?.userType !== 'worker' ? true : !!user?.privileges?.canMessageGuests) && (
                <Link
                  to="/messages"
                  className="flex items-center px-3 py-2 rounded-lg text-[#6b5744] hover:text-[#4b2a00] hover:bg-[#e8dcc8] relative transition-colors"
                  title="Messages"
                >
                  <FaEnvelope className="text-lg" />
                  {unreadMsgCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full px-2 py-1 min-w-[18px] text-center">
                      {unreadMsgCount}
                    </span>
                  )}
                </Link>
              )}

              {/* Show Login / Sign Up when not authenticated */}
              {!isAuthenticated && (
                <div className="flex items-center space-x-1 lg:space-x-2">
                  <Link
                    to="/login"
                    className="px-2 lg:px-3 py-2 text-xs lg:text-sm font-medium text-[#6b5744] hover:text-[#4b2a00] whitespace-nowrap"
                  >
                    Login
                  </Link>
                  {/* Property Owner Login - visible on all screens with icon on mobile */}
                  <Link
                    to="/owner-login"
                    className="flex items-center px-2 lg:px-3 py-2 text-xs lg:text-sm font-medium text-[#6b5744] hover:text-[#4b2a00] whitespace-nowrap"
                    title="Property Owner Login"
                  >
                    <FaBuilding className="sm:hidden text-base" />
                    <span className="hidden sm:inline md:hidden">Owner</span>
                    <span className="hidden md:inline">Owner Login</span>
                  </Link>
                  <Link
                    to="/register"
                    className="px-2 lg:px-3 py-2 bg-[#a06b42] text-white text-xs lg:text-sm font-medium rounded-lg hover:bg-[#8f5a32] transition-colors whitespace-nowrap shadow-md"
                  >
                    <span className="hidden sm:inline">Sign Up</span>
                    <span className="sm:hidden">Join</span>
                  </Link>
                </div>
              )}

              {/* Notifications (admin and host) */}
              {(user?.userType === "admin" || user?.userType === 'host') && (
                <div className="relative inline-flex items-center">
                  <button
                    onClick={toggleNotifications}
                    className={`notification-button relative px-3 py-2 rounded-lg transition-colors ${isNotificationOpen
                        ? 'bg-[#a06b42] text-white'
                        : 'text-[#6b5744] hover:text-[#4b2a00] hover:bg-[#e8dcc8]'
                      }`}
                  >
                    <FaBell className="text-lg" />
                    {unreadNotifCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-green-600 text-white text-xs rounded-full px-2 py-1 min-w-[18px] text-center">
                        {unreadNotifCount}
                      </span>
                    )}
                  </button>
                  {isNotificationOpen && (
                    <div className="notification-dropdown absolute top-full right-0 mt-2 w-80 bg-[#f6e9d8] rounded-xl dropdown-shadow border border-[#d4c4b0] py-2 z-50">
                      <div className="px-4 py-2 border-b border-gray-100 font-semibold text-sm flex items-center justify-between">
                        <span>Notifications</span>
                        <Link
                          to="/notifications"
                          className="text-xs text-gray-700 hover:text-gray-900"
                          onClick={() => setIsNotificationOpen(false)}
                        >
                          View All
                        </Link>
                      </div>
                      <div className="max-h-80 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="px-4 py-8 text-center text-gray-500 text-sm">No notifications</div>
                        ) : (
                          Object.entries(groupedNotifications()).map(([category, notifs]) => (
                            <div key={category} className="px-4 py-2">
                              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                                {category}
                              </div>
                              {notifs.slice(0, 3).map((n) => (
                                <Link
                                  key={n.id}
                                  to={getNotificationLink(n)}
                                  onClick={() => {
                                    markNotificationRead(n.id);
                                    setIsNotificationOpen(false);
                                  }}
                                  className={`block text-xs py-2 rounded hover:bg-gray-50 ${!n.isRead ? 'font-semibold' : 'text-gray-600'}`}
                                >
                                  <div className="flex items-start gap-2">
                                    <div className={`${!n.isRead ? 'bg-blue-600' : 'bg-gray-300'} w-2 h-2 mt-1 rounded-full`}></div>
                                    <div className="min-w-0">
                                      <div className="text-gray-800 break-words whitespace-normal text-[12px] leading-snug">{n.title || n.message}</div>
                                      <div className="text-[10px] text-gray-500 break-words">{n.createdAt ? new Date(n.createdAt).toLocaleString() : ''}</div>
                                    </div>
                                  </div>
                                </Link>
                              ))}
                              {notifs.length > 3 && (
                                <div className="text-xs text-gray-500 text-center py-1">
                                  +{notifs.length - 3} more in {category}
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Profile Menu */}
              {isAuthenticated && (
                <div className="relative inline-flex items-center">
                  <button
                    onClick={toggleProfile}
                    className="profile-button flex items-center space-x-2 px-3 py-2 rounded-lg text-[#6b5744] hover:text-[#4b2a00] hover:bg-[#e8dcc8] transition-colors"
                  >
                    <FaUserCircle className="text-lg" />
                    <span className="hidden sm:inline font-medium text-sm">
                      {user?.firstName || user?.name || user?.email}
                    </span>
                    {isProfileOpen ? (
                      <FaChevronUp className="text-xs" />
                    ) : (
                      <FaChevronDown className="text-xs" />
                    )}
                  </button>

                  {isProfileOpen && (
                    <div className="profile-dropdown absolute top-full right-0 mt-2 w-64 bg-[#f6e9d8] rounded-xl dropdown-shadow border border-[#d4c4b0] py-3 z-50">
                      {/* Profile Header */}
                      <div className="px-4 pb-3 border-b border-gray-100">
                        <div className="flex items-center space-x-3">
                          {user?.avatar && avatarOk ? (
                            <img
                              src={avatarUrl}
                              alt="Profile"
                              className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                              onError={() => setAvatarOk(false)}
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center border-2 border-gray-200">
                              <span className="text-white font-bold text-lg">
                                {((user?.firstName || '').charAt(0) + (user?.lastName || '').charAt(0)) || user?.email?.charAt(0) || 'U'}
                              </span>
                            </div>
                          )}
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900">
                              {user?.firstName} {user?.lastName}
                            </div>
                            <div className="text-sm text-gray-500">{user?.email}</div>
                            <div className="text-xs text-gray-700 font-medium">
                              {user?.userType === 'host' ? 'Property Owner' : user?.userType === 'worker' ? 'Worker' : 'Guest'}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Quick Stats for Hosts */}
                      {user?.userType === 'host' && (
                        <div className="px-4 py-2 border-b border-gray-100">
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div>
                              <div className="text-sm font-bold text-gray-700">{userStats.properties}</div>
                              <div className="text-xs text-gray-500">Properties</div>
                            </div>
                            <div>
                              <div className="text-sm font-bold text-green-600">{userStats.bookings}</div>
                              <div className="text-xs text-gray-500">Bookings</div>
                            </div>
                            <div>
                              <div className="text-sm font-bold text-orange-600">{userStats.rating}</div>
                              <div className="text-xs text-gray-500">Rating</div>
                            </div>
                          </div>
                        </div>
                      )}

                      {user?.userType === 'worker' && (
                        <div className="px-4 py-2 border-b border-gray-100">
                          <div className="text-xs font-semibold text-gray-500 mb-1">Abilities</div>
                          <div className="flex flex-wrap gap-2">
                            {(() => {
                              const enabled = Object.entries(user?.privileges || {}).filter(([k, v]) => v);
                              if (enabled.length === 0) {
                                return <span className="text-xs text-gray-500">No abilities assigned</span>;
                              }
                              return enabled.slice(0, 12).map(([k]) => (
                                <span key={k} className="px-2 py-1 text-xs rounded bg-emerald-50 text-emerald-700 border border-emerald-200">{k}</span>
                              ));
                            })()}
                          </div>
                          {Array.isArray(user?.assignedProperties) && (
                            <div className="mt-2 text-xs text-gray-600">
                              Assigned properties: <span className="font-semibold">{user.assignedProperties.length}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Menu Items */}
                      <div className="py-1">
                        <Link
                          to="/profile"
                          className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-800 transition-colors"
                          onClick={() => setIsProfileOpen(false)}
                        >
                          <FaUser className="text-gray-700" />
                          <span className="font-medium">My Profile</span>
                        </Link>
                        {user?.userType === 'admin' && (
                          <Link
                            to="/admin/reports"
                            className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-800 transition-colors"
                            onClick={() => setIsProfileOpen(false)}
                          >
                            <FaFileAlt className="text-gray-700" />
                            <span className="font-medium">Admin Reports</span>
                          </Link>
                        )}
                        {user?.userType === 'admin' && (
                          <Link
                            to="/admin/landing"
                            className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-800 transition-colors"
                            onClick={() => setIsProfileOpen(false)}
                          >
                            <FaFileAlt className="text-gray-700" />
                            <span className="font-medium">Landing Content</span>
                          </Link>
                        )}

                        {user?.userType === 'host' && (
                          <button
                            type="button"
                            className="w-full text-left flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 transition-colors"
                            onClick={() => {
                              setIsProfileOpen(false);
                              if (!isInPropertyOwnerDashboard()) { setOwnerEmail(user?.email || ''); setOwnerPassword(''); setShowOwnerSwitch(true); }
                              else { navigate('/dashboard'); }
                            }}
                          >
                            <FaChartLine className="text-green-600" />
                            <span className="font-medium">Dashboard</span>
                          </button>
                        )}

                        <Link
                          to="/settings"
                          className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          onClick={() => setIsProfileOpen(false)}
                        >
                          <FaCog className="text-gray-600" />
                          <span className="font-medium">Settings</span>
                        </Link>

                        {user?.userType === 'host' && (
                          <Link
                            to="/support"
                            className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition-colors"
                            onClick={() => setIsProfileOpen(false)}
                          >
                            <FaQuestionCircle className="text-purple-600" />
                            <span className="font-medium">Help</span>
                          </Link>
                        )}
                      </div>

                      <hr className="my-2" />

                      <div className="px-4 py-1">
                        <button
                          onClick={handleLogout}
                          className="flex items-center space-x-3 w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <FaSignOutAlt className="text-red-600" />
                          <span className="font-medium">Sign Out</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Mobile Menu Button - only for authenticated users */}
              {isAuthenticated && (
                <button
                  onClick={toggleMenu}
                  className="lg:hidden p-2 text-[#6b5744] hover:text-[#4b2a00]"
                >
                  {isMenuOpen ? <FaTimes className="text-xl" /> : <FaBars className="text-xl" />}
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu - booking.com Style */}
      {isMenuOpen && (
        <div className="lg:hidden bg-white border-t border-gray-200 mobile-menu">
          <div className="px-4 py-2 space-y-1">
            {/* Main Navigation Items - Show for guests and property owners not in dashboard */}
            {isAuthenticated && user?.userType !== "admin" && (user?.userType !== 'host' || !isInPropertyOwnerDashboard()) && (
              <>
                {mainNavItems.map((item, index) => {
                  const Icon = item.icon;
                  const isActive = isActiveRoute(item.href);
                  return (
                    <Link
                      key={index}
                      to={item.href}
                      className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-gray-100 text-gray-800' : 'text-gray-700 hover:bg-gray-50'}`}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <Icon className="text-lg" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </>
            )}

            {/* Guest actions - only for non-property owners */}
            {isAuthenticated && user?.userType !== 'admin' && user?.userType !== 'host' && (
              <>
                <Link
                  to="/notifications"
                  className="flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 relative"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <FaBell className="text-lg" />
                  <span>Notifications</span>
                  {unreadNotifCount > 0 && (
                    <span className="absolute right-4 bg-green-600 text-white text-[10px] rounded-full px-1.5 py-0.5 min-w-[16px] text-center">{unreadNotifCount}</span>
                  )}
                </Link>
                <Link
                  to="/favorites"
                  className="flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <FaHeart className="text-lg" />
                  <span>Favorites</span>
                </Link>
                {(user?.userType !== 'worker' ? true : !!user?.privileges?.canMessageGuests) && (
                  <Link
                    to="/messages"
                    className="flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <FaEnvelope className="text-lg" />
                    <span>Messages</span>
                  </Link>
                )}
              </>
            )}

            {/* Host-specific links (move outside guest-only block) */}
            {user?.userType === 'host' && userStats.properties > 0 && (
              <Link
                to="/dashboard"
                className="flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                onClick={() => setIsMenuOpen(false)}
              >
                <FaChartLine className="text-lg" />
                <span>Dashboard</span>
              </Link>
            )}
            {/* List your property (mobile) - available in user mode; triggers owner guard */}
            <button
              type="button"
              className="flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              onClick={() => { setIsMenuOpen(false); handleListProperty(); }}
              title="List your property"
            >
              <FaBuilding className="text-lg" />
              <span>List your property</span>
            </button>

            {user?.userType === 'host' && (
              <>
                <Link
                  to="/my-bookings"
                  className="flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <FaCalendarAlt className="text-lg" />
                  <span>My Bookings</span>
                </Link>
                <Link
                  to="/owner/cars"
                  className="flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <FaCar className="text-lg" />
                  <span>My Cars</span>
                </Link>

                {/* Mobile property selector (compact, no overflow) */}
                {myProperties.length > 0 && (
                  <div className="mt-2 border-t border-gray-200 pt-2">
                    <div className="text-xs font-semibold text-gray-500 px-4 mb-1">Select Property</div>
                    <div className="max-h-56 overflow-y-auto">
                      {myProperties.map((p) => (
                        <Link
                          key={p._id}
                          to={`/my-bookings?tab=calendar&property=${p._id}`}
                          className="block px-6 py-2 text-sm text-gray-700 hover:bg-gray-50 truncate"
                          title={p.title || p.name || p.propertyNumber}
                          onClick={() => setIsMenuOpen(false)}
                        >
                          {p.title || p.name || p.propertyNumber}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {isAuthenticated && user?.userType === 'admin' && (
              <Link
                to="/admin"
                className="flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                onClick={() => setIsMenuOpen(false)}
              >
                <FaChartLine className="text-lg" />
                <span>Admin Dashboard</span>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Global banner for deactivated owners - visible on all screens */}
      {isAuthenticated && user?.userType === 'host' && user?.isBlocked && (
        <div className="w-full bg-red-50 border-b border-red-200">
          <div className="max-w-7xl mx-auto px-4 py-2 text-sm text-red-700">
            Your account is currently deactivated due to unpaid commissions. Actions are limited until reactivated.
          </div>
        </div>
      )}
      {/* Owner switch modal (enter owner credentials) */}
      {showOwnerSwitch && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
            <div className="mb-3 text-lg font-semibold text-gray-900">Switch to Property Owner Mode</div>
            <p className="text-sm text-gray-600 mb-4">Enter your Property Owner account credentials. We'll log you out of user mode and sign you in as owner.</p>
            <form onSubmit={submitOwnerSwitch} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Owner Email</label>
                <input
                  type="email"
                  value={ownerEmail}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                  placeholder="owner@example.com"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#a06b42]"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  value={ownerPassword}
                  onChange={(e) => setOwnerPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#a06b42]"
                  required
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-2 justify-end pt-1">
                <button type="button" className="px-4 py-2 rounded-lg border" onClick={() => setShowOwnerSwitch(false)}>Cancel</button>
                <button type="submit" disabled={switchLoading} className="px-4 py-2 rounded-lg bg-[#a06b42] text-white hover:bg-[#8f5a32] disabled:opacity-50">
                  {switchLoading ? 'Switching…' : 'Switch to Owner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;