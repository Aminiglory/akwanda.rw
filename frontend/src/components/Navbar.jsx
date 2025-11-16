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
  FaMotorcycle,
  FaBicycle,
} from "react-icons/fa";
import { useLocale } from "../contexts/LocaleContext";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const { language, setLanguage, currency, setCurrency, t, formatCurrencyRWF } = useLocale() || {};
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
  const [expandedMobileItems, setExpandedMobileItems] = useState({});
  const [billing, setBilling] = useState({ commissionsDue: 0, finesDue: 0, totalDue: 0, minimumPartial: 0, limitedAccess: false });
  const [payingCommission, setPayingCommission] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [ownerSearchTerm, setOwnerSearchTerm] = useState('');
  // Locale dropdown states (open on click, not hover)
  const [langOpenTop, setLangOpenTop] = useState(false);
  const [currOpenTop, setCurrOpenTop] = useState(false);
  const [langOpenSecond, setLangOpenSecond] = useState(false);
  const [currOpenSecond, setCurrOpenSecond] = useState(false);

  const makeAbsolute = (u) => {
    if (!u) return u;
    let s = String(u).replace(/\\+/g, '/');
    if (s.startsWith('http')) return s;
    if (!s.startsWith('/')) s = `/${s}`;
    return `${API_URL}${s}`;
  };

  const labelOr = (key, fallback) => {
    if (!t) return fallback;
    try {
      const v = t(key);
      if (!v || v === key) return fallback;
      return v;
    } catch (_) {
      return fallback;
    }
  };

  // Main navigation items like Booking.com
  const mainNavItems = [
    {
      label: t ? t('nav.stays') : "Stays",
      icon: FaHome,
      href: "/apartments",
      children: [
        { label: t ? t('nav.apartments') : "Apartments", href: "/apartments", icon: FaBuilding },
        { label: t ? t('nav.hotels') : "Hotels", href: "/hotels", icon: FaBed },
        { label: t ? t('nav.homes') : "Homes", href: "/homes", icon: FaHome },
        { label: t ? t('nav.resorts') : "Resorts", href: "/resorts", icon: FaUmbrellaBeach },
      ]
    },
    {
      label: t ? t('nav.flights') : "Flights",
      icon: FaPlane,
      href: "/flights",
      children: [
        { label: t ? t('nav.searchFlights') : "Search flights", href: "/flights", icon: FaPlane },
        { label: t ? t('nav.flightDeals') : "Flight deals", href: "/flights?deals=true", icon: FaPlane },
        { label: t ? t('nav.multiCity') : "Multi-city", href: "/flights?multi=true", icon: FaPlane },
      ]
    },
    {
      label: t ? t('nav.rentals') : "Rentals",
      icon: FaCar,
      href: "/cars",
      children: [
        { label: t ? t('nav.rentCar') : "Rent a car", href: "/cars", icon: FaCar },
        { label: t ? t('nav.rentMotorcycle') : "Rent a motorcycle", href: "/cars?type=motorcycle", icon: FaMotorcycle },
        { label: t ? t('nav.rentBicycle') : "Rent a bicycle", href: "/cars?type=bicycle", icon: FaBicycle },
        { label: t ? t('nav.myCars') : "My Cars", href: "/owner/cars", icon: FaCar },
        { label: t ? t('nav.carDeals') : "Car deals", href: "/cars?deals=true", icon: FaCar },
      ]
    },
    {
      label: t ? t('nav.attractions') : "Attractions",
      icon: FaUmbrellaBeach,
      href: "/experiences",
      children: [
        { label: t ? t('nav.tours') : "Tours & Activities", href: "/experiences", icon: FaUmbrellaBeach },
        { label: t ? t('nav.restaurants') : "Restaurants", href: "/restaurants", icon: FaUtensils },
        { label: t ? t('nav.deals') : "Deals", href: "/deals", icon: FaShoppingBag },
      ]
    }
  ];

  // Booking.com-style navigation for property owners (matches original dashboard nav structure)
  const bookingComNavItems = [
    {
      label: labelOr('nav.home', 'Home'),
      icon: FaHome,
      href: '/dashboard',
      children: []
    },
    {
      label: labelOr('nav.pricingAndCalendar', 'Pricing and booking calendar'),
      icon: FaCalendarAlt,
      href: '/owner/rates',
      children: [
        { label: labelOr('nav.calendar', 'Calendar'), href: '/owner/rates?view=calendar', icon: FaCalendarAlt },
        { label: labelOr('nav.openCloseRooms', 'Open/close rooms'), href: '/owner/rates?view=open-close', icon: FaCalendarAlt },
        { label: labelOr('nav.pricingPerGuest', 'Pricing per guest'), href: '/owner/rates?view=pricing-per-guest', icon: FaUsers },
      ]
    },
    {
      label: labelOr('nav.reservations', 'Reservations'),
      icon: FaCalendarCheck,
      href: '/my-bookings',
      children: [
        { label: labelOr('nav.allReservations', 'All reservations'), href: '/my-bookings?tab=reservations&scope=all', icon: FaCalendarCheck },
        { label: labelOr('nav.upcoming', 'Upcoming'), href: '/my-bookings?tab=reservations&scope=upcoming', icon: FaCalendarCheck },
        { label: labelOr('nav.checkIn', 'Check in'), href: '/my-bookings?tab=reservations&scope=checked-in', icon: FaCalendarCheck },
        { label: labelOr('nav.checkOut', 'Check out'), href: '/my-bookings?tab=reservations&scope=checked-out', icon: FaCalendarCheck },
        { label: labelOr('nav.cancelled', 'Cancelled'), href: '/my-bookings?tab=reservations&scope=cancelled', icon: FaCalendarTimes },
      ]
    },
    {
      label: labelOr('nav.property', 'Property'),
      icon: FaBed,
      href: '/owner/property',
      badge: propertyAlerts,
      children: [
        { label: labelOr('nav.propertyPolicies', 'Property policies'), href: '/owner/property?view=policies', icon: FaFileAlt },
        { label: labelOr('nav.reservationPolicies', 'Reservation policies'), href: '/owner/property?view=reservation-policies', icon: FaFileAlt },
        { label: labelOr('nav.facilitiesServices', 'Facilities and services'), href: '/owner/property?view=facilities', icon: FaCog },
        { label: labelOr('nav.roomDetails', 'Room details'), href: '/owner/property?view=room-details', icon: FaBed },
        { label: labelOr('nav.roomAmenities', 'Room Amenities'), href: '/owner/property?view=room-amenities', icon: FaBed },
        { label: labelOr('nav.yourProfile', 'your profile'), href: '/owner/property?view=profile', icon: FaUser },
        { label: labelOr('nav.viewDescriptions', 'View your descriptions'), href: '/owner/property?view=descriptions', icon: FaFileAlt },
        { label: labelOr('nav.messagingPreferences', 'Messaging preferences'), href: '/settings?tab=messaging', icon: FaEnvelope },
        { label: labelOr('nav.photos', 'Property photos'), href: '/owner/property?view=photos', icon: FaImages },
      ]
    },
    {
      label: labelOr('nav.inbox', 'Inbox'),
      icon: FaEnvelope,
      href: '/messages',
      badge: unreadMsgCount,
      children: [
        { label: labelOr('nav.reservationMessages', 'Reservation messages'), href: '/messages?category=reservations', icon: FaEnvelope, badge: messageCounts.reservations },
        { label: labelOr('nav.bookingComMessages', 'Akwanda.rw messages'), href: '/messages?category=platform', icon: FaEnvelope, badge: messageCounts.platform },
        { label: labelOr('nav.guestQandA', 'Guest Q&A'), href: '/messages?category=qna', icon: FaQuestionCircle, badge: messageCounts.qna },
      ]
    },
    {
      label: labelOr('nav.guestReviews', 'Guest reviews'),
      icon: FaStar,
      href: '/owner/reviews',
      badge: unrepliedReviews,
      children: [
        { label: labelOr('nav.guestReviews', 'Guest reviews'), href: '/owner/reviews', icon: FaStar, badge: unrepliedReviews },
        { label: labelOr('nav.guestExperience', 'Guest experience'), href: '/owner/reviews?view=experience', icon: FaUsers },
      ]
    },
    {
      label: labelOr('nav.finance', 'Finance'),
      icon: FaDollarSign,
      href: '/dashboard?tab=finance',
      children: [
        { label: labelOr('nav.invoices', 'Invoices'), href: '/dashboard?tab=finance&view=invoices', icon: FaFileAlt },
        { label: labelOr('nav.reservationsStatement', 'Reservations statement'), href: '/dashboard?tab=finance&view=statement', icon: FaFileAlt },
        { label: labelOr('nav.financialOverview', 'Financial overview'), href: '/dashboard?tab=finance&view=overview', icon: FaChartLine },
        { label: labelOr('nav.transactions', 'Transactions'), href: '/transactions', icon: FaMoneyBillWave },
        { label: labelOr('nav.financeSettings', 'Finance settings'), href: '/settings?tab=finance', icon: FaCog },
      ]
    },
    {
      label: labelOr('nav.salesReportingAnalytics', 'Sales Reporting & Analytics'),
      icon: FaChartLine,
      href: '/dashboard?tab=analytics',
      children: [
        { label: labelOr('nav.analyticsDashboard', 'Overview dashboard'), href: '/dashboard?tab=analytics', icon: FaChartLine },
        { label: labelOr('nav.salesStatistics', 'Sales statistics'), href: '/dashboard?tab=analytics&view=sales', icon: FaChartLine },
        { label: labelOr('nav.reports', 'Reports'), href: '/dashboard?tab=analytics&view=reports', icon: FaFileAlt },
        { label: labelOr('nav.directVsOnline', 'Direct vs Online'), href: '/dashboard?tab=analytics&view=comparison', icon: FaChartLine },
        { label: labelOr('nav.occupancyRevenuePerRoom', 'Occupancy & Revenue per Room'), href: '/dashboard?tab=analytics&view=occupancy', icon: FaChartLine },
        { label: labelOr('nav.taxLiabilityTracking', 'Tax liability tracking'), href: '/dashboard?tab=analytics&view=tax', icon: FaFileAlt },
      ]
    },
  ];

  // Owner management links organized exactly like Booking.com
  const ownerManagementLinks = [
    {
      category: t ? t('nav.reservations') : "Reservations",
      icon: FaCalendarAlt,
      links: [
        { label: t ? t('nav.allReservations') : "All reservations", href: "/my-bookings?tab=bookings&scope=all" },
        { label: t ? t('nav.paidReservations') : "Paid reservations", href: "/my-bookings?tab=bookings&scope=paid" },
        { label: t ? t('nav.pendingReservations') : "Pending reservations", href: "/my-bookings?tab=bookings&scope=pending" },
        { label: t ? t('nav.unpaidReservations') : "Unpaid reservations", href: "/my-bookings?tab=bookings&scope=unpaid" },
        { label: t ? t('nav.cancelledReservations') : "Cancelled reservations", href: "/my-bookings?tab=bookings&scope=cancelled" },
      ]
    },
    {
      category: t ? t('nav.calendar') : "Calendar",
      icon: FaCalendarAlt,
      links: [
        { label: t ? t('nav.thisMonth') : "This month", href: "/my-bookings?tab=calendar&monthOffset=0" },
        { label: t ? t('nav.nextMonth') : "Next month", href: "/my-bookings?tab=calendar&monthOffset=1" },
        { label: t ? t('nav.thisYear') : "This year", href: "/my-bookings?tab=calendar" },
      ]
    },
    {
      category: t ? t('nav.finance') : "Finance",
      icon: FaDollarSign,
      links: [
        { label: t ? t('nav.allPayments') : "All payments", href: "/my-bookings?tab=finance&finance_status=all" },
        { label: t ? t('nav.paid') : "Paid", href: "/my-bookings?tab=finance&finance_status=paid" },
        { label: t ? t('nav.pending') : "Pending", href: "/my-bookings?tab=finance&finance_status=pending" },
        { label: t ? t('nav.unpaid') : "Unpaid", href: "/my-bookings?tab=finance&finance_status=unpaid" },
        { label: t ? t('nav.last30Days') : "Last 30 days", href: "/my-bookings?tab=finance&view=last30" },
        { label: t ? t('nav.monthToDate') : "Month to date", href: "/my-bookings?tab=finance&view=mtd" },
        { label: t ? t('nav.yearToDate') : "Year to date", href: "/my-bookings?tab=finance&view=ytd" },
      ]
    },
    {
      category: t ? t('nav.analytics') : "Analytics",
      icon: FaChartLine,
      links: [
        { label: t ? t('nav.last30Days') : "Last 30 days", href: "/my-bookings?tab=analytics&range=30" },
        { label: t ? t('nav.last90Days') : "Last 90 days", href: "/my-bookings?tab=analytics&range=90" },
        { label: t ? t('nav.yearToDate') : "Year to date", href: "/my-bookings?tab=analytics&range=ytd" },
        { label: t ? t('nav.customRange') : "Custom range", href: "/my-bookings?tab=analytics&range=custom" },
      ]
    },
    {
      category: t ? t('nav.promotions') : "Promotions",
      icon: FaShoppingBag,
      links: [
        { label: t ? t('nav.managePromotions') : "Manage promotions", href: "/owner/promotions" },
        { label: t ? t('nav.createNewPromotion') : "Create new promotion", href: "/owner/promotions?mode=new" },
        { label: t ? t('nav.activePromotions') : "Active promotions", href: "/owner/promotions?status=active" },
        { label: t ? t('nav.expiredPromotions') : "Expired promotions", href: "/owner/promotions?status=expired" },
      ]
    },
    {
      category: t ? t('nav.reviews') : "Reviews",
      icon: FaStar,
      links: [
        { label: t ? t('nav.allReviews') : "All reviews", href: "/owner/reviews" },
        { label: t ? t('nav.unrepliedReviews') : "Unreplied reviews", href: "/owner/reviews?filter=unreplied" },
        { label: t ? t('nav.fiveStarReviews') : "5-star reviews", href: "/owner/reviews?filter=5star" },
        { label: t ? t('nav.lowRatings') : "Low ratings", href: "/owner/reviews?filter=low" },
      ]
    },
    {
      category: t ? t('nav.messages') : "Messages",
      icon: FaEnvelope,
      links: [
        { label: t ? t('nav.inbox') : "Inbox", href: "/messages" },
        { label: t ? t('nav.unreadMessages') : "Unread messages", href: "/messages?filter=unread" },
        { label: t ? t('nav.archivedMessages') : "Archived messages", href: "/messages?filter=archived" },
      ]
    },
    {
      category: t ? t('nav.settings') : "Settings",
      icon: FaSettings,
      links: [
        { label: t ? t('nav.propertySettings') : "Property settings", href: "/upload" },
        { label: t ? t('nav.accountSettings') : "Account settings", href: "/settings" },
        { label: t ? t('nav.paymentSettings') : "Payment settings", href: "/settings?tab=payment" },
        { label: t ? t('nav.notificationSettings') : "Notification settings", href: "/settings?tab=notifications" },
        { label: t ? t('nav.workers') : "Workers", href: "/owner/workers" },
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

  // Keep selected property in sync with URL and loaded properties
  useEffect(() => {
    if (!isAuthenticated || user?.userType !== 'host' || myProperties.length === 0) return;
    const params = new URLSearchParams(location.search || '');
    const urlProp = params.get('property');
    const existsInList = urlProp && myProperties.some(p => String(p._id) === String(urlProp));
    const firstId = String(myProperties[0]._id || '');
    setSelectedPropertyId(existsInList ? String(urlProp) : firstId);
  }, [isAuthenticated, user?.userType, myProperties, location.search]);

  // Fetch dynamic badge counts for navigation
  useEffect(() => {
    if (!isAuthenticated || user?.userType !== 'host') return;
    
    const fetchDynamicCounts = async () => {
      try {
        let alerts = 0; // accumulate property alerts across fetches
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
          properties.forEach(prop => {
            if (!prop.images || prop.images.length < 5) alerts++;
            if (!prop.description || prop.description.length < 50) alerts++;
            if (!prop.amenities || prop.amenities.length < 3) alerts++;
          });
          setPropertyAlerts(alerts);
        }

        // Fetch unreplied reviews count (use existing owner reviews endpoint)
        const reviewRes = await fetch(`${API_URL}/api/bookings/owner/reviews`, { credentials: 'include' });
        if (reviewRes.ok) {
          const reviewData = await reviewRes.json().catch(() => ({}));
          const count = Number(reviewData.countUnreplied || 0) || (Array.isArray(reviewData.reviews) ? reviewData.reviews.filter(r => !r?.reply && !r?.replied).length : 0);
          setUnrepliedReviews(count);
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

  // Load billing summary when user is blocked (or limited access)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!isAuthenticated || !user?.isBlocked) return;
        const res = await fetch(`${API_URL}/api/billing/summary`, { credentials: 'include' });
        if (!res.ok) return;
        const data = await res.json().catch(() => ({}));
        if (!cancelled) setBilling({
          commissionsDue: Number(data?.commissionsDue || 0),
          finesDue: Number(data?.finesDue || 0),
          totalDue: Number(data?.totalDue || 0),
          minimumPartial: Number(data?.minimumPartial || 0),
          limitedAccess: !!data?.limitedAccess
        });
      } catch (_) {}
    })();
    return () => { cancelled = true; };
  }, [isAuthenticated, user?.isBlocked]);

  const handlePayCommission = async (amount) => {
    try {
      setPayingCommission(true);
      const res = await fetch(`${API_URL}/api/billing/pay-commission`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || 'Payment failed');
      if (data?.fullyCleared) {
        toast.success('All dues cleared. Your account is reactivated.');
        window.location.reload();
      } else if (data?.partialUnlock) {
        toast.success('Partial payment accepted. Limited features are now unlocked.');
        // Refresh summary
        try {
          const r = await fetch(`${API_URL}/api/billing/summary`, { credentials: 'include' });
          const s = await r.json().catch(()=>({}));
          setBilling({
            commissionsDue: Number(s?.commissionsDue || 0),
            finesDue: Number(s?.finesDue || 0),
            totalDue: Number(s?.totalDue || 0),
            minimumPartial: Number(s?.minimumPartial || 0),
            limitedAccess: !!s?.limitedAccess
          });
        } catch (_) {}
      } else {
        toast.success('Payment processed');
      }
    } catch (e) {
      toast.error(e.message || 'Could not process payment');
    } finally {
      setPayingCommission(false);
    }
  };

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

  const handleOwnerSearch = () => {
    const term = String(ownerSearchTerm || '').trim();
    if (!term) return;
    const params = new URLSearchParams();
    if (selectedPropertyId) params.set('property', selectedPropertyId);
    params.set('search', term);
    navigate(`/dashboard?${params.toString()}`);
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
    if (!email || !password) { toast.error(t ? t('msg.enterOwnerCredentials') : 'Enter owner email and password'); return; }
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
      if (!res.ok) throw new Error(data.message || (t ? t('msg.ownerLoginFailed') : 'Owner login failed'));
      // Ensure account is host
      if (data?.user?.userType !== 'host') {
        toast.error(t ? t('msg.notOwnerAccount') : 'That account is not a property owner');
        return;
      }
      toast.success(t ? t('msg.switchToOwnerSuccess') : 'Switched to Property Owner');
      setShowOwnerSwitch(false);
      setOwnerPassword('');
      // Redirect to owner dashboard
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.message || (t ? t('msg.couldNotSwitchAccount') : 'Could not switch account'));
    } finally {
      setSwitchLoading(false);
    }
  };

  return (
    <> 
      {/* Top Bar - First Level (hidden on landing page) */}
      {location.pathname !== '/' && (
      <div className="w-full bg-[#4b2a00] text-white py-2 px-4 border-b border-[#3a2000] relative z-[1000]">
        <div className="max-w-7xl mx-auto flex justify-between items-center text-xs">
          <div className="flex items-center space-x-4 lg:space-x-6">
            {/* Property Owner Links - Show when authenticated as host (only show Dashboard label in owner context) */}
            {isAuthenticated && user?.userType === 'host' && (
              <>
                {userStats.properties > 0 && isInPropertyOwnerDashboard() && (
                  <Link to="/dashboard" className="hidden sm:inline hover:text-white font-medium">
                    {t ? t('nav.dashboard') : 'Dashboard'}
                  </Link>
                )}
                <Link
                  to="/my-bookings"
                  className="hidden sm:inline hover:text-white font-medium"
                >
                  {t ? t('nav.myBookings') : 'My Bookings'}
                </Link>
                <Link
                  to="/owner/cars"
                  className="hidden sm:inline hover:text-white font-medium"
                >
                  {t ? t('nav.myCars') : 'My Cars'}
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
                  {t ? t('nav.adminDashboard') : 'Admin Dashboard'}
                </Link>
                <Link
                  to="/admin/reports"
                  className="hidden sm:inline hover:text-white font-medium"
                >
                  {t ? t('nav.adminReports') : 'Reports'}
                </Link>
                <Link
                  to="/admin/landing"
                  className="hidden sm:inline hover:text-white font-medium"
                >
                  {t ? t('nav.landingContent') : 'Content'}
                </Link>
              </>
            )}

            {/* Universal Links - Show to all users */}
            {/* Customer Support moved to footer */}

            {/* Hide guest-specific links when in property owner dashboard */}
            {!isInPropertyOwnerDashboard() && (
              <>
                {isAuthenticated && (
                  <Link
                    to="/notifications"
                    className="hidden sm:inline hover:text-white font-medium"
                  >
                    {t ? t('nav.notifications') : 'Notifications'}
                  </Link>
                )}
              </>
            )}
          </div>
          <div className="flex items-center space-x-4">
            {/* Language selector */}
            <div className="relative lang-selector-top">
              <button type="button" onClick={() => { setLangOpenTop(o=>!o); setCurrOpenTop(false); }} className="flex items-center space-x-2 hover:text-white cursor-pointer">
                <FaGlobe className="text-sm" />
                <span className="hidden sm:inline">{(language || 'en').toUpperCase()}</span>
                <FaCaretDown className="text-[10px] hidden sm:inline" />
              </button>
              {langOpenTop && (
                <div className="main-nav-dropdown absolute right-0 mt-2 bg-white text-[#4b2a00] rounded-md shadow-lg border border-[#e0d5c7]">
                  <button onClick={() => { setLanguage && setLanguage('en'); setLangOpenTop(false); }} className="block px-3 py-2 text-left w-full hover:bg-[#fff7ef]">English</button>
                  <button onClick={() => { setLanguage && setLanguage('fr'); setLangOpenTop(false); }} className="block px-3 py-2 text-left w-full hover:bg-[#fff7ef]">Français</button>
                </div>
              )}
            </div>
            {/* Currency selector */}
            <div className="relative currency-selector-top">
              <button type="button" onClick={() => { setCurrOpenTop(o=>!o); setLangOpenTop(false); }} className="flex items-center space-x-2 hover:text-white cursor-pointer">
                <span className="font-semibold">{(currency || 'RWF').toUpperCase()}</span>
                <FaCaretDown className="text-[10px]" />
              </button>
              {currOpenTop && (
                <div className="main-nav-dropdown absolute right-0 mt-2 bg-white text-[#4b2a00] rounded-md shadow-lg border border-[#e0d5c7] min-w-[120px]">
                  <button onClick={() => { setCurrency && setCurrency('RWF'); setCurrOpenTop(false); }} className="block px-3 py-2 text-left w-full hover:bg-[#fff7ef]">RWF</button>
                  <button onClick={() => { setCurrency && setCurrency('USD'); setCurrOpenTop(false); }} className="block px-3 py-2 text-left w-full hover:bg-[#fff7ef]">USD</button>
                  <button onClick={() => { setCurrency && setCurrency('EUR'); setCurrOpenTop(false); }} className="block px-3 py-2 text-left w-full hover:bg-[#fff7ef]">EUR</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Friendly error banner */}
      {uiError && (
        <div className="w-full bg-red-50 text-red-700 px-4 py-2 text-sm border-b border-red-200">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <span>{uiError}</span>
            <button className="text-xs underline" onClick={() => setUiError(null)}>Dismiss</button>
          </div>
        </div>
      )}

      {/* Blocked account banner with payments */}
      {isAuthenticated && user?.isBlocked && (
        <div className="w-full bg-[#f4ebe1] text-[#3a240e] px-4 py-3 border-b border-[#e1d5c3]" role="region" aria-live="polite">
          <div className="max-w-7xl mx-auto flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex-1">
                <div className="font-semibold flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-[#a06b42]"></span>
                  Account deactivated
                </div>
                <div className="text-sm opacity-90">
                  {billing.limitedAccess ? 'Limited features are unlocked due to a partial payment. Complete your payment to restore full visibility.' : 'Clear outstanding dues to restore full access and visibility.'}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:gap-3 text-sm">
                <div className="px-3 py-2 rounded-lg bg-white/80 border border-[#e1d5c3]">
                  <div className="text-xs opacity-70">Commission due</div>
                  <div className="font-bold">{formatCurrencyRWF ? formatCurrencyRWF(billing.commissionsDue) : `RWF ${Number(billing.commissionsDue||0).toLocaleString()}`}</div>
                </div>
                <div className="px-3 py-2 rounded-lg bg-white/80 border border-[#e1d5c3]">
                  <div className="text-xs opacity-70">Fines due</div>
                  <div className="font-bold">{formatCurrencyRWF ? formatCurrencyRWF(billing.finesDue) : `RWF ${Number(billing.finesDue||0).toLocaleString()}`}</div>
                </div>
                <div className="px-3 py-2 rounded-lg bg-white/80 border border-[#e1d5c3]">
                  <div className="text-xs opacity-70">Total due</div>
                  <div className="font-bold">{formatCurrencyRWF ? formatCurrencyRWF(billing.totalDue) : `RWF ${Number(billing.totalDue||0).toLocaleString()}`}</div>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handlePayCommission(billing.minimumPartial || Math.ceil((billing.totalDue||0)/2))}
                disabled={payingCommission || (billing.totalDue||0) <= 0}
                className={`inline-flex items-center justify-center px-3 py-2 rounded-md text-white shadow-sm transition-colors ${payingCommission ? 'bg-[#b58a66] opacity-80' : 'bg-[#a06b42] hover:bg-[#8f5a32]'}`}
                title={`${t ? t('banner.payHalf') : 'Pay Half'}: ${formatCurrencyRWF ? formatCurrencyRWF(billing.minimumPartial||0) : `RWF ${Number(billing.minimumPartial||0).toLocaleString()}`}`}
              >
                {payingCommission ? 'Processing…' : `${t ? t('banner.payHalf') : 'Pay Half'} (${formatCurrencyRWF ? formatCurrencyRWF(billing.minimumPartial||0) : `RWF ${Number(billing.minimumPartial||0).toLocaleString()}`})`}
              </button>
              <button
                type="button"
                onClick={() => handlePayCommission(billing.totalDue || 0)}
                disabled={payingCommission || (billing.totalDue||0) <= 0}
                className={`inline-flex items-center justify-center px-3 py-2 rounded-md text-[#3a240e] border border-[#e1d5c3] bg-white/90 hover:bg-white`}
              >
                {t ? t('banner.payFull') : 'Pay Full'} ({formatCurrencyRWF ? formatCurrencyRWF(billing.totalDue||0) : `RWF ${Number(billing.totalDue||0).toLocaleString()}`})
              </button>
              <Link to="/notifications" className="inline-flex justify-center px-3 py-2 rounded-md border border-[#e1d5c3] text-[#3a240e] hover:bg-white">
                {t ? t('banner.viewNotice') : 'View notice'}
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Second Bar - Navigation Level */}
      <nav className="w-full bg-[#f5f0e8] border-b border-[#e0d5c7] navbar-shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center">
              {/* Logo */}
              <div className="flex items-center space-x-8">
                <Link
                  to={user?.userType === 'host' && isInPropertyOwnerDashboard() ? "/dashboard" : "/"}
                  className="text-xl font-bold text-[#4b2a00] hover:text-[#6b3f1f]"
                >
                  AKWANDA.rw
                </Link>

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
                                    className={`flex items-center space-x-3 px-4 py-3 text-sm text-[#4b2a00] hover:bg-white transition-colors ${isChildActive ? 'bg-white text-[#4b2a00]' : 'text-[#4b2a00]'
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
                <div className="hidden lg:block">
                  <div className="flex items-center gap-2">
                    <FaBuilding className="text-[#6b5744]" />
                    <select
                      className="px-3 py-2 border border-[#d4c4b0] rounded-lg bg-white text-sm text-[#4b2a00] focus:outline-none focus:ring-2 focus:ring-[#a06b42]"
                      title={t ? t('banner.choosePropertyToManage') : 'Choose property to manage'}
                      value={selectedPropertyId}
                      onChange={(e) => {
                        const id = e.target.value;
                        setSelectedPropertyId(id);
                        if (id) {
                          window.open(`/dashboard?property=${id}`, '_blank');
                        }
                      }}
                    >
                      {myProperties.map((p) => {
                        const id = String(p._id || '');
                        const code = p.propertyNumber || id.slice(-6) || 'N/A';
                        const name = p.title || p.name || 'Property';
                        return (
                          <option key={id} value={id}>{`#${code} - ${name}`}</option>
                        );
                      })}
                    </select>
                  </div>
                </div>
              )}

              {/* Global search within owner dashboard */}
              {isAuthenticated && user?.userType === 'host' && isInPropertyOwnerDashboard() && (
                <div className="hidden lg:flex items-center bg-white border border-[#d4c4b0] rounded-lg px-2 py-1.5 ml-1 max-w-xs">
                  <FaSearch className="text-xs text-gray-500 mr-1" />
                  <input
                    type="text"
                    value={ownerSearchTerm}
                    onChange={(e) => setOwnerSearchTerm(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleOwnerSearch(); }}
                    placeholder={labelOr('nav.ownerSearchPlaceholder', 'Search bookings, guests or properties')}
                    className="flex-1 text-xs bg-transparent outline-none placeholder:text-gray-400"
                  />
                </div>
              )}

              {/* Favorites */}
              {isAuthenticated && !isInPropertyOwnerDashboard() && (
                <Link
                  to="/favorites"
                  className="hidden lg:flex items-center px-3 py-2 rounded-lg text-[#6b5744] hover:text-[#4b2a00] hover:bg-[#e8dcc8] transition-colors"
                  title={t ? t('nav.favorites') : 'Favorites'}
                >
                  <FaHeart className="text-lg" />
                </Link>
              )}

              {/* Messages */}
              {isAuthenticated && (user?.userType !== 'worker' ? true : !!user?.privileges?.canMessageGuests) && (
                <Link
                  to="/messages"
                  className="flex items-center px-3 py-2 rounded-lg text-[#6b5744] hover:text-[#4b2a00] hover:bg-[#e8dcc8] relative transition-colors"
                  title={t ? t('nav.messages') : 'Messages'}
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
                    {t ? t('nav.login') : 'Login'}
                  </Link>
                  <Link
                    to="/register"
                    className="px-2 lg:px-3 py-2 bg-[#a06b42] text-white text-xs lg:text-sm font-medium rounded-lg hover:bg-[#8f5a32] transition-colors whitespace-nowrap shadow-md"
                  >
                    <span className="hidden sm:inline">{t ? t('nav.signUp') : 'Sign Up'}</span>
                    <span className="sm:hidden">{t ? t('nav.signUp') : 'Join'}</span>
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
                    <div className="notification-dropdown absolute top-full right-0 sm:right-0 left-0 sm:left-auto mt-2 w-[calc(100vw-1rem)] sm:w-80 max-w-md mx-2 sm:mx-0 bg-[#f6e9d8] rounded-xl shadow-2xl border border-[#d4c4b0] py-2 z-[99999]">
                      <div className="px-4 py-2 border-b border-gray-100 font-semibold text-sm flex items-center justify-between">
                        <span>{t ? t('nav.notifications') : 'Notifications'}</span>
                        <Link
                          to="/notifications"
                          className="text-xs text-gray-700 hover:text-gray-900"
                          onClick={() => setIsNotificationOpen(false)}
                        >
                          {t ? t('nav.viewAll') : 'View All'}
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

              {/* Profile menu */}
              {isAuthenticated && (
                <div className="relative inline-flex items-center">
                  <button
                    onClick={toggleProfile}
                    className={`profile-button flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${isProfileOpen
                        ? 'bg-[#a06b42] text-white'
                        : 'text-[#6b5744] hover:text-[#4b2a00] hover:bg-[#e8dcc8]'
                      }`}
                    title={user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Account'}
                  >
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt="avatar"
                        className="w-6 h-6 rounded-full object-cover"
                        onError={() => setAvatarOk(false)}
                        style={{ display: avatarOk ? 'block' : 'none' }}
                      />
                    ) : null}
                    {!avatarOk || !avatarUrl ? <FaUserCircle className="text-xl" /> : null}
                    <FaCaretDown className="text-[10px]" />
                  </button>
                  {isProfileOpen && (
                    <div className="profile-dropdown absolute top-full right-0 mt-2 w-56 bg-[#f6e9d8] rounded-xl shadow-2xl border border-[#d4c4b0] py-2 z-[99999]">
                      <div className="px-4 py-2 border-b border-gray-100 text-sm">
                        <div className="font-semibold text-[#4b2a00] truncate">{user?.firstName || user?.email}</div>
                        <div className="text-xs text-gray-600 truncate">{user?.email}</div>
                      </div>
                      <Link to="/profile" className="block px-4 py-2 text-sm text-[#4b2a00] hover:bg-white">{t ? t('nav.profile') : 'Profile'}</Link>
                      <Link to="/settings" className="block px-4 py-2 text-sm text-[#4b2a00] hover:bg-white">{t ? t('nav.accountSettings') : 'Account settings'}</Link>
                      <Link to="/my-bookings" className="block px-4 py-2 text-sm text-[#4b2a00] hover:bg-white">{t ? t('nav.reservations') : 'My bookings'}</Link>
                      {user?.userType === 'host' && (
                        <Link to="/dashboard" className="block px-4 py-2 text-sm text-[#4b2a00] hover:bg-white">{t ? t('nav.dashboard') : 'Owner dashboard'}</Link>
                      )}
                      <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-white flex items-center gap-2">
                        <FaSignOutAlt /> <span>{t ? t('nav.logout') : 'Log out'}</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Language & Currency selectors (click to open) */}
              <div className="hidden lg:flex items-center space-x-4 ml-2">
                {/* Language selector */}
                <div className="relative lang-selector-second">
                  <button type="button" onClick={() => { setLangOpenSecond(o=>!o); setCurrOpenSecond(false); }} className="flex items-center space-x-2 hover:text-[#4b2a00] cursor-pointer">
                    <FaGlobe className="text-sm" />
                    <span className="hidden sm:inline">{(language || 'en').toUpperCase()}</span>
                    <FaCaretDown className="text-[10px] hidden sm:inline" />
                  </button>
                  {langOpenSecond && (
                    <div className="main-nav-dropdown absolute right-0 mt-2 bg-white text-[#4b2a00] rounded-md shadow-lg border border-[#e0d5c7]">
                      <button onClick={() => { setLanguage && setLanguage('en'); setLangOpenSecond(false); }} className="block px-3 py-2 text-left w-full hover:bg-[#fff7ef]">English</button>
                      <button onClick={() => { setLanguage && setLanguage('fr'); setLangOpenSecond(false); }} className="block px-3 py-2 text-left w-full hover:bg-[#fff7ef]">Français</button>
                    </div>
                  )}
                </div>
                {/* Currency selector */}
                <div className="relative currency-selector-second">
                  <button type="button" onClick={() => { setCurrOpenSecond(o=>!o); setLangOpenSecond(false); }} className="flex items-center space-x-2 hover:text-[#4b2a00] cursor-pointer">
                    <span className="font-semibold">{(currency || 'RWF').toUpperCase()}</span>
                    <FaCaretDown className="text-[10px]" />
                  </button>
                  {currOpenSecond && (
                    <div className="main-nav-dropdown absolute right-0 mt-2 bg-white text-[#4b2a00] rounded-md shadow-lg border border-[#e0d5c7] min-w-[120px]">
                      <button onClick={() => { setCurrency && setCurrency('RWF'); setCurrOpenSecond(false); }} className="block px-3 py-2 text-left w-full hover:bg-[#fff7ef]">RWF</button>
                      <button onClick={() => { setCurrency && setCurrency('USD'); setCurrOpenSecond(false); }} className="block px-3 py-2 text-left w-full hover:bg-[#fff7ef]">USD</button>
                      <button onClick={() => { setCurrency && setCurrency('EUR'); setCurrOpenSecond(false); }} className="block px-3 py-2 text-left w-full hover:bg-[#fff7ef]">EUR</button>
                    </div>
                  )}
                </div>
              </div>

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

            {/* Owner navigation (Booking.com style) in second navbar */}
            {isAuthenticated && user?.userType === 'host' && isInPropertyOwnerDashboard() && (
              <div className="w-full flex flex-wrap items-center gap-2 pt-2 border-t border-[#e0d5c7] mt-2">
                {bookingComNavItems.map((item, idx) => {
                  const Icon = item.icon;
                  const isOpen = activeDropdown === item.label;
                  const isParentActive = isActiveRoute(item.href);
                  return (
                    <div key={idx} className="relative owner-nav-dropdown">
                      <button
                        type="button"
                        onClick={() => toggleDropdown(item.label)}
                        className={`owner-nav-dropdown-button flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${isOpen || isParentActive ? 'bg-[#e8dcc8] border-[#d0c4b0] text-[#4b2a00]' : 'bg-white border-[#e0d5c7] text-[#6b5744] hover:bg-[#f2e5d3]'}`}
                      >
                        <Icon className="text-sm" />
                        <span>{item.label}</span>
                        {item.badge && (
                          <span className="ml-1 inline-flex items-center justify-center text-[10px] px-2 py-0.5 rounded-full bg-[#a06b42] text-white">{item.badge}</span>
                        )}
                        {item.children && item.children.length > 0 && (
                          <FaCaretDown className={`text-[10px] ml-1 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                        )}
                      </button>
                      {isOpen && item.children && item.children.length > 0 && (
                        <div className="main-nav-dropdown absolute left-0 mt-2 w-64 bg-[#f6e9d8] rounded-xl shadow-2xl border border-[#d4c4b0] py-2 z-[2000]">
                          {item.children.map((child, cidx) => {
                            const ChildIcon = child.icon;
                            const href = child.href || item.href;
                            const isChildActive = isActiveRoute(href);
                            return (
                              <button
                                key={cidx}
                                type="button"
                                onClick={() => { navigate(href); setActiveDropdown(null); }}
                                className={`w-full flex items-center gap-3 px-4 py-2 text-xs text-left hover:bg-white ${isChildActive ? 'bg-white text-[#4b2a00]' : 'text-[#4b2a00]'}`}
                              >
                                {ChildIcon && <ChildIcon className="text-sm" />}
                                <span className="flex-1">{child.label}</span>
                                {child.badge && (
                                  <span className="ml-auto inline-flex items-center justify-center text-[10px] px-2 py-0.5 rounded-full bg-[#a06b42] text-white">{child.badge}</span>
                                )}
                              </button>
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
        </div>
      </nav>
      {/* Mobile Menu - mirrors desktop owner navigation */}
      {isAuthenticated && isMenuOpen && (
        <div className="lg:hidden border-t border-[#e0d5c7] bg-[#f9f4ee]">
          {/* Mobile property selector */}
          {user?.userType === 'host' && isInPropertyOwnerDashboard() && myProperties.length > 0 && (
            <div className="px-4 py-3">
              <div className="text-xs font-semibold text-[#6b5744] mb-2">{t ? t('banner.manageProperty') : 'Manage property'}</div>
              <div className="grid grid-cols-1 gap-2">
                {myProperties.map((p) => (
                  <Link
                    key={p._id}
                    to={`/my-bookings?tab=calendar&property=${p._id}`}
                    className="block px-3 py-2 rounded-lg bg-white border border-[#e0d5c7] text-[#4b2a00] hover:bg-[#fffaf5]"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {p.title || p.name || p.propertyNumber}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Owner navigation (Booking.com style) */}
          {user?.userType === 'host' && (
            <div className="px-2 pb-2">
              {bookingComNavItems.map((item, idx) => {
                const Icon = item.icon;
                const open = !!expandedMobileItems[item.label];
                return (
                  <div key={idx} className="mb-2">
                    <button
                      type="button"
                      onClick={() => setExpandedMobileItems((s) => ({ ...s, [item.label]: !open }))}
                      className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-white border border-[#e0d5c7] text-[#4b2a00]"
                    >
                      <span className="flex items-center gap-3"><Icon className="text-sm" />{item.label}</span>
                      <FaCaretDown className={`text-xs transition-transform ${open ? 'rotate-180' : ''}`} />
                    </button>
                    {open && (
                      <div className="mt-1 rounded-lg bg-[#fff8f1] border border-[#e0d5c7] overflow-hidden">
                        {(item.children && item.children.length > 0 ? item.children : [{ label: item.label, href: item.href, icon: item.icon }]).map((child, cidx) => {
                          const ChildIcon = child.icon;
                          return (
                            <Link
                              key={cidx}
                              to={child.href}
                              className="flex items-center gap-3 px-4 py-3 text-sm text-[#4b2a00] hover:bg-white border-t border-[#f0e6d9] first:border-t-0"
                              onClick={() => setIsMenuOpen(false)}
                            >
                              <ChildIcon className="text-sm" />
                              <span className="flex-1">{child.label}</span>
                              {child.badge ? (
                                <span className="ml-auto inline-flex items-center justify-center text-[10px] px-2 py-0.5 rounded-full bg-[#a06b42] text-white">{child.badge}</span>
                              ) : null}
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

          {/* Guest/General quick links (subset for mobile) */}
          {!isInPropertyOwnerDashboard() && (
            <div className="px-2 pb-4">
              {mainNavItems.map((m, i) => (
                <Link
                  key={i}
                  to={m.href}
                  className="block px-4 py-3 rounded-lg bg-white border border-[#e0d5c7] text-[#4b2a00] mb-2"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {m.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

    </>
  );
};

export default Navbar;