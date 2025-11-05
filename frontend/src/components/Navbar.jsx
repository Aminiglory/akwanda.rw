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
  FaCalendarTimes,
  FaImages,
  FaComments,
  FaCalendarCheck,
  FaMoneyBillWave,
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
  const [messageCounts, setMessageCounts] = useState({ reservations: 0, platform: 0, qna: 0 });
  const [propertyAlerts, setPropertyAlerts] = useState(0);
  const [unrepliedReviews, setUnrepliedReviews] = useState(0);
  const [opportunityCount, setOpportunityCount] = useState(0);
  const { socket } = useSocket();
  const [uiError, setUiError] = useState(null);
  const [avatarOk, setAvatarOk] = useState(true);
  const [showOwnerSwitch, setShowOwnerSwitch] = useState(false);
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [switchLoading, setSwitchLoading] = useState(false);
  const [myProperties, setMyProperties] = useState([]);
  const [propDropdownOpen, setPropDropdownOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const dropdownButtonRefs = useRef({});

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

  // Booking.com-style navigation for property owners
  const bookingComNavItems = [
    {
      label: "Home",
      icon: FaHome,
      href: "/dashboard",
      children: []
    },
    {
      label: "Rates & Availability",
      icon: FaCalendarAlt,
      href: "/owner/rates",
      children: [
        { label: "Calendar", href: "/owner/rates?view=calendar", icon: FaCalendarAlt },
        { label: "Open/close rooms", href: "/owner/rates?view=open-close", icon: FaCalendarAlt },
        { label: "Copy yearly rates", href: "/owner/rates?view=copy-yearly", icon: FaDollarSign },
        { label: "Dynamic restriction rules", href: "/owner/rates?view=restrictions", icon: FaCog },
        { label: "Rate plans", href: "/owner/rates?view=rate-plans", icon: FaDollarSign },
        { label: "Value adds", href: "/owner/rates?view=value-adds", icon: FaShoppingBag },
        { label: "Availability planner", href: "/owner/rates?view=availability-planner", icon: FaCalendarAlt },
        { label: "Pricing per guest", href: "/owner/rates?view=pricing-per-guest", icon: FaDollarSign },
        { label: "Country rates", href: "/owner/rates?view=country-rates", icon: FaGlobe },
        { label: "Mobile rates", href: "/owner/rates?view=mobile-rates", icon: FaDollarSign },
      ]
    },
    {
      label: "Promotions",
      icon: FaShoppingBag,
      href: "/owner/promotions",
      children: [
        { label: "Choose new promotion", href: "/owner/promotions?action=new", icon: FaShoppingBag },
        { label: "Simulate max discount", href: "/owner/promotions?action=simulate", icon: FaDollarSign },
        { label: "Your active promotions", href: "/owner/promotions?filter=active", icon: FaShoppingBag },
      ]
    },
    {
      label: "Reservations",
      icon: FaCalendarAlt,
      href: "/my-bookings",
      children: [
        { label: "All reservations", href: "/my-bookings?tab=reservations&scope=all", icon: FaCalendarAlt },
        { label: "Upcoming", href: "/my-bookings?tab=reservations&scope=upcoming", icon: FaCalendarAlt },
        { label: "Checked in", href: "/my-bookings?tab=reservations&scope=checked-in", icon: FaCalendarAlt },
        { label: "Checked out", href: "/my-bookings?tab=reservations&scope=checked-out", icon: FaCalendarAlt },
        { label: "Cancelled", href: "/my-bookings?tab=reservations&scope=cancelled", icon: FaCalendarAlt },
      ]
    },
    {
      label: "Property",
      icon: FaBuilding,
      href: "/owner/property",
      badge: propertyAlerts,
      children: [
        { label: "Quality rating", href: "/owner/property?view=quality-rating", icon: FaStar },
        { label: "Property page score", href: "/owner/property?view=page-score", icon: FaChartLine },
        { label: "General info & property status", href: "/owner/property?view=general-info", icon: FaBuilding },
        { label: "VAT/tax/charges", href: "/owner/property?view=vat-tax", icon: FaDollarSign },
        { label: "Photos", href: "/owner/property?view=photos", icon: FaImages },
        { label: "Property policies", href: "/owner/property?view=policies", icon: FaFileAlt },
        { label: "Reservation policies", href: "/owner/property?view=policies", icon: FaFileAlt },
        { label: "Facilities & services", href: "/owner/property?view=facilities", icon: FaCog },
        { label: "Room details", href: "/owner/property?view=room-details", icon: FaBed },
        { label: "Room amenities", href: "/owner/property?view=facilities", icon: FaCog },
        { label: "Your profile", href: "/owner/property?view=profile", icon: FaUser },
        { label: "View your descriptions", href: "/owner/property?view=general-info", icon: FaFileAlt },
        { label: "Messaging preferences", href: "/settings?tab=messaging", icon: FaEnvelope },
        { label: "Sustainability", href: "/owner/property?view=sustainability", icon: FaGlobe },
      ]
    },
    {
      label: "Boost performance",
      icon: FaChartLine,
      href: "/dashboard?tab=boost",
      badge: opportunityCount,
      children: [
        { label: "Opportunity Centre", href: "/dashboard?tab=boost&view=opportunity", icon: FaShoppingBag, badge: opportunityCount },
        { label: "Commission-free bookings", href: "/dashboard?tab=boost&view=commission-free", icon: FaDollarSign },
        { label: "Genius partner programme", href: "/dashboard?tab=boost&view=genius", icon: FaStar },
        { label: "Preferred Partner Programme", href: "/dashboard?tab=boost&view=preferred", icon: FaStar },
        { label: "Long stays toolkit", href: "/dashboard?tab=boost&view=long-stays", icon: FaCalendarAlt },
        { label: "Visibility booster", href: "/dashboard?tab=boost&view=visibility", icon: FaChartLine },
        { label: "Work-Friendly Programme", href: "/dashboard?tab=boost&view=work-friendly", icon: FaBuilding },
        { label: "Unit differentiation tool", href: "/dashboard?tab=boost&view=unit-diff", icon: FaCog },
      ]
    },
    {
      label: "Inbox",
      icon: FaEnvelope,
      href: "/messages",
      badge: unreadMsgCount,
      children: [
        { label: "Reservation messages", href: "/messages?category=reservations", icon: FaEnvelope, badge: messageCounts.reservations },
        { label: "Booking.com messages", href: "/messages?category=platform", icon: FaEnvelope, badge: messageCounts.platform },
        { label: "Guest Q&A", href: "/messages?category=qna", icon: FaQuestionCircle, badge: messageCounts.qna },
      ]
    },
    {
      label: "Guest reviews",
      icon: FaStar,
      href: "/owner/reviews",
      badge: unrepliedReviews,
      children: [
        { label: "Guest reviews", href: "/owner/reviews", icon: FaStar, badge: unrepliedReviews },
        { label: "Guest experience", href: "/owner/reviews?view=experience", icon: FaUsers },
      ]
    },
    {
      label: "Finance",
      icon: FaDollarSign,
      href: "/dashboard?tab=finance",
      children: [
        { label: "Invoices", href: "/dashboard?tab=finance&view=invoices", icon: FaFileAlt },
        { label: "Reservations statement", href: "/dashboard?tab=finance&view=statement", icon: FaFileAlt },
        { label: "Financial overview", href: "/dashboard?tab=finance&view=overview", icon: FaChartLine },
        { label: "Finance settings", href: "/settings?tab=finance", icon: FaCog },
      ]
    },
    {
      label: "Analytics",
      icon: FaChartLine,
      href: "/dashboard?tab=analytics",
      children: [
        { label: "Analytics dashboard", href: "/dashboard?tab=analytics", icon: FaChartLine },
        { label: "Demand for location", href: "/dashboard?tab=analytics&view=demand", icon: FaMapMarkerAlt },
        { label: "Your pace of bookings", href: "/dashboard?tab=analytics&view=pace", icon: FaCalendarAlt },
        { label: "Sales statistics", href: "/dashboard?tab=analytics&view=sales", icon: FaChartLine },
        { label: "Booker insights", href: "/dashboard?tab=analytics&view=booker", icon: FaUsers },
        { label: "Bookwindow information", href: "/dashboard?tab=analytics&view=bookwindow", icon: FaCalendarAlt },
        { label: "Cancellation characteristics", href: "/dashboard?tab=analytics&view=cancellation", icon: FaCalendarTimes },
        { label: "Manage your competitive set", href: "/dashboard?tab=analytics&view=competitive", icon: FaChartLine },
        { label: "Genius report", href: "/dashboard?tab=analytics&view=genius", icon: FaStar },
        { label: "Ranking dashboard", href: "/dashboard?tab=analytics&view=ranking", icon: FaChartLine, badge: "New" },
        { label: "Performance dashboard", href: "/dashboard?tab=analytics&view=performance", icon: FaChartLine },
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

  // Fetch dynamic badge counts for navigation
  useEffect(() => {
    if (!isAuthenticated || user?.userType !== 'host') return;
    
    const fetchDynamicCounts = async () => {
      try {
        // Fetch message counts by category
        const msgRes = await fetch(`${API_URL}/api/messages/category-counts`, { credentials: 'include' });
        if (msgRes.ok) {
          const msgData = await msgRes.json();
          setMessageCounts({
            reservations: msgData.reservations || 0,
            platform: msgData.platform || 0,
            qna: msgData.qna || 0
          });
          setUnreadMsgCount((msgData.reservations || 0) + (msgData.platform || 0) + (msgData.qna || 0));
        }

        // Fetch property alerts (incomplete profiles, missing info, etc.)
        const propRes = await fetch(`${API_URL}/api/properties/my-properties`, { credentials: 'include' });
        if (propRes.ok) {
          const propData = await propRes.json();
          const properties = propData.properties || [];
          let alerts = 0;
          properties.forEach(prop => {
            if (!prop.images || prop.images.length < 5) alerts++;
            if (!prop.description || prop.description.length < 50) alerts++;
            if (!prop.amenities || prop.amenities.length < 3) alerts++;
          });
          setPropertyAlerts(alerts);
        }

        // Fetch unreplied reviews count
        const reviewRes = await fetch(`${API_URL}/api/bookings/owner?hasReview=true&reviewReplied=false`, { credentials: 'include' });
        if (reviewRes.ok) {
          const reviewData = await reviewRes.json();
          setUnrepliedReviews(reviewData.bookings?.length || 0);
        }

        // Fetch opportunity count (properties that can be improved)
        setOpportunityCount(alerts > 0 ? Math.min(alerts, 9) : 0);
        
      } catch (error) {
        console.error('Failed to fetch dynamic counts:', error);
      }
    };

    fetchDynamicCounts();
    // Refresh every 2 minutes
    const interval = setInterval(fetchDynamicCounts, 120000);
    return () => clearInterval(interval);
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
      // Close third nav bar dropdowns when clicking outside
      if (!event.target.closest('.owner-nav-dropdown') && !event.target.closest('.owner-nav-dropdown-button')) {
        const thirdNavDropdowns = bookingComNavItems.map(item => item.label);
        if (thirdNavDropdowns.includes(activeDropdown)) {
          setActiveDropdown(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeDropdown]);

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
    const ownerRoutes = ['/dashboard', '/user-dashboard', '/my-bookings', '/upload', '/owner', '/messages'];
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
    console.log('Toggle dropdown:', dropdownName, 'Current:', activeDropdown);
    
    // Calculate position if opening dropdown
    if (activeDropdown !== dropdownName) {
      const buttonElement = dropdownButtonRefs.current[dropdownName];
      if (buttonElement) {
        const rect = buttonElement.getBoundingClientRect();
        setDropdownPosition({
          top: rect.bottom,
          left: rect.left
        });
      }
    }
    
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
    // Navigate to step-based listing wizard
    navigate('/upload');
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
      <div className="w-full bg-[#4b2a00] text-white py-2 px-4 border-b border-[#3a2000] relative z-[1000]">
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
      <nav className="w-full bg-[#f5f0e8] border-b border-[#e0d5c7] navbar-shadow relative z-[999]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            {/* Logo */}
            <div className="flex items-center space-x-8">
              <Link
                to={user?.userType === 'host' && isInPropertyOwnerDashboard() ? "/dashboard" : "/"}
                className="text-xl font-bold text-[#4b2a00] hover:text-[#6b3f1f]"
              >
                AKWANDA.rw
              </Link>

              {/* Property Name and Code Display */}
              {user?.userType === 'host' && isInPropertyOwnerDashboard() && myProperties.length > 0 && (
                <div className="hidden lg:flex items-center space-x-3">
                  <div className="flex items-center space-x-2 px-3 py-2 bg-[#e8dcc8] rounded-lg border border-[#d0c4b0]">
                    <FaBuilding className="text-[#8b6f47] text-sm" />
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-[#4b2a00]">{myProperties[0]?.title || myProperties[0]?.name || 'Property'}</span>
                      <span className="text-xs text-[#8b6f47]">#{myProperties[0]?.propertyNumber || myProperties[0]?._id?.slice(-6) || 'N/A'}</span>
                    </div>
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

                        {/* Dropdown Menu */}
                        {isDropdownOpen && (
                          <div className="main-nav-dropdown absolute top-full left-0 mt-1 w-64 bg-[#f6e9d8] rounded-xl shadow-2xl border border-[#d4c4b0] py-3">
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
              {isAuthenticated && user?.userType === 'host' && isInPropertyOwnerDashboard() && myProperties.length > 0 && (
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
                    <div className="property-selector-dropdown absolute top-full right-0 mt-1 w-80 max-h-80 overflow-y-auto bg-[#f6e9d8] rounded-xl shadow-2xl border border-[#d4c4b0] p-2">
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
                    <div className="notification-dropdown absolute top-full right-0 sm:right-0 left-0 sm:left-auto mt-2 w-full sm:w-80 max-w-md mx-auto sm:mx-0 bg-[#f6e9d8] rounded-xl shadow-2xl border border-[#d4c4b0] py-2">
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
                    <div className="profile-dropdown absolute top-full right-0 mt-2 w-64 bg-[#f6e9d8] rounded-xl shadow-2xl border border-[#d4c4b0] py-3">
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
                            <FaHome className="text-green-600" />
                            <span className="font-medium">Home</span>
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

            {/* Host-specific links */}
            {user?.userType === 'host' && isInPropertyOwnerDashboard() && userStats.properties > 0 && (
              <Link
                to="/dashboard"
                className="flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                onClick={() => setIsMenuOpen(false)}
              >
                <FaHome className="text-lg" />
                <span>Home</span>
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
                {/* Property Owner Navigation - Mobile */}
                {isInPropertyOwnerDashboard() && (
                  <div className="border-t border-gray-200 pt-2 mt-2">
                    {/* Property Info */}
                    {myProperties.length > 0 && (
                      <div className="px-4 py-2 mb-2 bg-[#e8dcc8] rounded-lg mx-2">
                        <div className="flex items-center space-x-2">
                          <FaBuilding className="text-[#8b6f47] text-sm" />
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-[#4b2a00]">{myProperties[0]?.title || myProperties[0]?.name || 'Property'}</span>
                            <span className="text-xs text-[#8b6f47]">#{myProperties[0]?.propertyNumber || myProperties[0]?._id?.slice(-6) || 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                    )}
                    {bookingComNavItems.map((item, index) => {
                      const Icon = item.icon;
                      const isActive = isActiveRoute(item.href);
                      const [isExpanded, setIsExpanded] = React.useState(false);
                      
                      return (
                        <div key={index} className="mb-1">
                          <div className="flex items-center">
                            <Link
                              to={item.href}
                              className={`flex-1 flex items-center space-x-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                                isActive ? 'bg-[#e8dcc8] text-[#4b2a00]' : 'text-gray-700 hover:bg-gray-50'
                              }`}
                              onClick={() => {
                                if (item.children.length === 0) {
                                  setIsMenuOpen(false);
                                }
                              }}
                            >
                              <Icon className="text-base" />
                              <span>{item.label}</span>
                              {item.badge && (
                                <span className="bg-red-600 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[16px] text-center">
                                  {item.badge}
                                </span>
                              )}
                            </Link>
                            {item.children.length > 0 && (
                              <button
                                onClick={() => setIsExpanded(!isExpanded)}
                                className="px-3 py-2.5 text-gray-600 hover:text-gray-900"
                              >
                                {isExpanded ? <FaChevronUp className="text-xs" /> : <FaChevronDown className="text-xs" />}
                              </button>
                            )}
                          </div>
                          
                          {/* Sub-items - expandable, show all */}
                          {item.children.length > 0 && isExpanded && (
                            <div className="ml-6 mt-1 space-y-0.5 max-h-64 overflow-y-auto">
                              {item.children.map((child, childIndex) => {
                                const ChildIcon = child.icon;
                                return (
                                  <Link
                                    key={childIndex}
                                    to={child.href}
                                    className="flex items-center justify-between px-3 py-1.5 rounded text-xs text-gray-600 hover:bg-gray-50"
                                    onClick={() => setIsMenuOpen(false)}
                                  >
                                    <div className="flex items-center space-x-2">
                                      {ChildIcon && <ChildIcon className="text-xs" />}
                                      <span>{child.label}</span>
                                    </div>
                                    {child.badge && (
                                      <span className={`text-xs px-1 py-0.5 rounded ${
                                        child.badge === 'New' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                      }`}>
                                        {child.badge}
                                      </span>
                                    )}
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
                
                <Link
                  to="/my-bookings"
                  className="flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                  onClick={() => setIsMenuOpen(false)}
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
                {isInPropertyOwnerDashboard() && myProperties.length > 0 && (
                  <div className="mt-2 border-t border-gray-200 pt-2">
                    <div className="text-xs font-semibold text-gray-500 px-4 mb-1">Select Property</div>
                    <div className="max-h-56 overflow-y-auto">
                      {myProperties.map((p) => (
                        <Link
                          key={p._id}
                          to={`/my-bookings?tab=calendar&property=${p._id}`}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 truncate"
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

      {/* Third Bar - Property Owner Dashboard Navigation (Separate Bar) */}
      {user?.userType === 'host' && isInPropertyOwnerDashboard() && (
        <div className="owner-third-navbar w-full bg-white border-b border-gray-200 shadow-sm relative z-[9999]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center space-x-1 overflow-x-auto py-2 scrollbar-hide">
              {bookingComNavItems.map((item, index) => {
                const Icon = item.icon;
                const isActive = isActiveRoute(item.href);
                const isDropdownOpen = activeDropdown === item.label;

                return (
                  <div key={index} className="relative group flex-shrink-0">
                    <button
                      ref={el => dropdownButtonRefs.current[item.label] = el}
                      onClick={() => toggleDropdown(item.label)}
                      className={`owner-nav-dropdown-button flex items-center space-x-1.5 px-3 py-2 rounded-lg transition-all duration-200 font-medium text-sm whitespace-nowrap ${
                        isActive
                          ? "bg-[#a06b42] text-white shadow-md"
                          : "text-gray-700 hover:text-[#a06b42] hover:bg-[#f5f0e8]"
                      }`}
                    >
                      <Icon className="text-sm flex-shrink-0" />
                      <span>{item.label}</span>
                      {item.badge > 0 && (
                        <span className="bg-red-600 text-white text-[10px] rounded-full px-1.5 py-0.5 min-w-[18px] text-center font-semibold">
                          {item.badge}
                        </span>
                      )}
                      {item.children.length > 0 && (
                        <FaCaretDown className={`text-xs transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                      )}
                    </button>

                    {/* Dropdown Menu */}
                    {isDropdownOpen && item.children.length > 0 && (
                      <div className="owner-nav-dropdown absolute top-full left-0 mt-1 w-72 bg-[#f6e9d8] rounded-xl shadow-2xl border border-[#d4c4b0] py-2 max-h-96 overflow-y-auto">
                        {item.children.map((child, childIndex) => {
                          const ChildIcon = child.icon;
                          const isChildActive = isActiveRoute(child.href);
                          return (
                            <Link
                              key={childIndex}
                              to={child.href}
                              className={`flex items-center justify-between px-4 py-2 text-sm hover:bg-gray-100 hover:text-gray-800 transition-colors ${
                                isChildActive ? 'bg-gray-100 text-[#a06b42] font-medium' : 'text-gray-700'
                              }`}
                              onClick={() => setActiveDropdown(null)}
                            >
                              <div className="flex items-center space-x-3">
                                {ChildIcon && <ChildIcon className="text-gray-700 flex-shrink-0" />}
                                <span className="font-medium">{child.label}</span>
                              </div>
                              {child.badge && (
                                <span className={`text-xs px-2 py-0.5 rounded-full min-w-[20px] text-center font-semibold ${
                                  child.badge === 'New' ? 'bg-green-100 text-green-700' : 
                                  typeof child.badge === 'number' || !isNaN(child.badge) ? 'bg-red-100 text-red-700' : 
                                  'bg-blue-100 text-blue-700'
                                }`}>
                                  {child.badge}
                                </span>
                              )}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;