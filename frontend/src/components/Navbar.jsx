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
  FaPlus,
} from "react-icons/fa";
import { useLocale } from "../contexts/LocaleContext";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Navbar = () => {
  const { user, logout, isAuthenticated, refreshUser } = useAuth();
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
  const [myCars, setMyCars] = useState([]);
  const [myAttractions, setMyAttractions] = useState([]);
  const [propDropdownOpen, setPropDropdownOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const dropdownButtonRefs = useRef({});
  const [expandedMobileItems, setExpandedMobileItems] = useState({});
  const [billing, setBilling] = useState({ commissionsDue: 0, finesDue: 0, totalDue: 0, minimumPartial: 0, limitedAccess: false });
  const [payingCommission, setPayingCommission] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [ownerSearchTerm, setOwnerSearchTerm] = useState('');
  const [globalSearchTerm, setGlobalSearchTerm] = useState('');
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

  const attachPropertyParam = (basePath) => {
    const raw = String(basePath || '');
    const [path, queryString] = raw.split('?');
    const params = new URLSearchParams(queryString || '');
    if (selectedPropertyId) {
      params.set('property', String(selectedPropertyId));
    } else {
      params.delete('property');
    }
    const qs = params.toString();
    return qs ? `${path}?${qs}` : path;
  };

  // Main navigation items like Booking.com
  const mainNavItems = [
    {
      label: t ? t('nav.stays') : "Stays",
      icon: FaHome,
      href: "/apartments",
      children: []
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
      href: "/rentals",
      children: [
        { label: t ? t('nav.rentCar') : "Rent a car", href: "/rentals", icon: FaCar },
        { label: t ? t('nav.rentMotorcycle') : "Rent a motorcycle", href: "/cars?type=motorcycle", icon: FaMotorcycle },
        { label: t ? t('nav.rentBicycle') : "Rent a bicycle", href: "/cars?type=bicycle", icon: FaBicycle },
        { label: t ? t('nav.myCars') : "My Cars", href: "/owner/cars", icon: FaCar },
        { label: t ? t('nav.carDeals') : "Car deals", href: "/cars?deals=true", icon: FaCar },
      ]
    },
    {
      label: t ? t('nav.attractions') : "Attractions",
      icon: FaUmbrellaBeach,
      href: "/attractions",
      children: [
        { label: t ? t('nav.tours') : "Tours & Activities", href: "/attractions", icon: FaUmbrellaBeach },
        { label: t ? t('nav.restaurants') : "Restaurants", href: "/restaurants", icon: FaUtensils },
        { label: labelOr('nav.deals', 'Deals'), href: "/deals", icon: FaShoppingBag },
      ]
    }
  ];

  // Attraction owner navigation items (attractions dashboard scopes)
  const attractionOwnerNavItems = [
    {
      // Mirrors "Home" in property dashboard
      label: labelOr('nav.attractionsHome', 'Attractions'),
      icon: FaHome,
      href: '/owner/attractions',
      children: [
        { label: labelOr('nav.attractionsHome', 'Dashboard'), href: '/owner/attractions', icon: FaHome },
        { label: labelOr('nav.myAttractions', 'My attractions'), href: '/owner/attractions?view=attractions', icon: FaUmbrellaBeach },
      ]
    },
    {
      // Mirrors "Reservations" section in property dashboard
      label: labelOr('nav.reservations', 'Reservations'),
      icon: FaCalendarAlt,
      href: '/owner/attractions?view=bookings',
      children: [
        { label: labelOr('nav.allReservations', 'All reservations'), href: '/owner/attractions?view=bookings', icon: FaCalendarAlt },
      ]
    },
    {
      // Mirrors "Finance" in property dashboard
      label: labelOr('nav.finance', 'Finance'),
      icon: FaDollarSign,
      href: '/owner/attractions?view=finance',
      children: [
        { label: labelOr('nav.allPayments', 'All payments'), href: '/owner/attractions?view=finance&filter=all', icon: FaDollarSign },
        { label: labelOr('nav.paid', 'Paid'), href: '/owner/attractions?view=finance&filter=paid', icon: FaDollarSign },
        { label: labelOr('nav.pending', 'Pending'), href: '/owner/attractions?view=finance&filter=pending', icon: FaDollarSign },
        { label: labelOr('nav.unpaid', 'Unpaid'), href: '/owner/attractions?view=finance&filter=unpaid', icon: FaDollarSign },
        { label: labelOr('nav.last30Days', 'Last 30 days'), href: '/owner/attractions?view=finance&range=30', icon: FaDollarSign },
        { label: labelOr('nav.monthToDate', 'Month to date'), href: '/owner/attractions?view=finance&range=mtd', icon: FaDollarSign },
        { label: labelOr('nav.yearToDate', 'Year to date'), href: '/owner/attractions?view=finance&range=ytd', icon: FaDollarSign },
        { label: labelOr('nav.expenses', 'Expenses & profit'), href: '/owner/attractions?view=finance&mode=expenses', icon: FaDollarSign },
      ],
    },
    {
      // Mirrors "Sales Reporting & Analytics" section label
      label: labelOr('nav.analytics', 'Analytics'),
      icon: FaChartLine,
      href: '/owner/attractions?view=analytics',
      children: [
        { label: labelOr('nav.last30Days', 'Last 30 days'), href: '/owner/attractions?view=analytics&range=30', icon: FaChartLine },
        { label: labelOr('nav.last90Days', 'Last 90 days'), href: '/owner/attractions?view=analytics&range=90', icon: FaChartLine },
        { label: labelOr('nav.yearToDate', 'Year to date'), href: '/owner/attractions?view=analytics&range=ytd', icon: FaChartLine },
        { label: labelOr('nav.customRange', 'Custom range'), href: '/owner/attractions?view=analytics&range=custom', icon: FaChartLine },
      ],
    },
    {
      // Mirrors "Guest reviews" entry
      label: labelOr('nav.guestReviews', 'Guest reviews'),
      icon: FaStar,
      href: '/owner/attractions?view=reviews',
    },
    {
      // Mirrors "Inbox" / Messages
      label: labelOr('nav.inbox', 'Inbox'),
      icon: FaEnvelope,
      href: '/owner/attractions?view=messages',
    },
    {
      // Mirrors "Settings"
      label: labelOr('nav.settings', 'Settings'),
      icon: FaSettings,
      href: '/owner/attractions?view=settings',
    },
  ];

  const carOwnerNavItems = [
    {
      // Mirrors "Home" in property dashboard
      label: labelOr('nav.vehiclesHome', 'Vehicles'),
      icon: FaHome,
      href: '/owner/cars?view=dashboard',
      children: [
        { label: labelOr('nav.vehiclesHome', 'Dashboard'), href: '/owner/cars?view=dashboard', icon: FaHome },
        { label: labelOr('nav.myVehicles', 'My vehicles'), href: '/owner/cars?view=vehicles', icon: FaCar },
      ]
    },
    {
      label: labelOr('nav.reservations', 'Reservations'),
      icon: FaCalendarAlt,
      href: '/owner/cars?view=reservations',
      children: [
        { label: labelOr('nav.allReservations', 'All reservations'), href: '/owner/cars?view=reservations', icon: FaCalendarAlt },
        { label: labelOr('nav.pendingReservations', 'Pending'), href: '/owner/cars?view=reservations&status=pending', icon: FaCalendarAlt },
        { label: labelOr('nav.confirmedReservations', 'Confirmed'), href: '/owner/cars?view=reservations&status=confirmed', icon: FaCalendarAlt },
        { label: labelOr('nav.activeReservations', 'Active'), href: '/owner/cars?view=reservations&status=active', icon: FaCalendarAlt },
        { label: labelOr('nav.completedReservations', 'Completed'), href: '/owner/cars?view=reservations&status=completed', icon: FaCalendarAlt },
        { label: labelOr('nav.cancelledReservations', 'Cancelled'), href: '/owner/cars?view=reservations&status=cancelled', icon: FaCalendarAlt },
      ]
    },
    {
      label: labelOr('nav.promotions', 'Promotions'),
      icon: FaShoppingBag,
      href: '/owner/promotions',
      children: [
        { label: labelOr('nav.managePromotions', 'Manage promotions'), href: '/owner/promotions', icon: FaShoppingBag },
        { label: labelOr('nav.createNewPromotion', 'Create new promotion'), href: '/owner/promotions?mode=new', icon: FaPlus },
        { label: labelOr('nav.activePromotions', 'Active promotions'), href: '/owner/promotions?status=active', icon: FaShoppingBag },
        { label: labelOr('nav.expiredPromotions', 'Expired promotions'), href: '/owner/promotions?status=expired', icon: FaShoppingBag },
      ],
    },
    {
      label: labelOr('nav.calendar', 'Calendar'),
      icon: FaCalendarAlt,
      href: '/owner/cars?view=calendar',
      children: [
        { label: labelOr('nav.thisMonth', 'This month'), href: '/owner/cars?view=calendar&monthOffset=0', icon: FaCalendarAlt },
        { label: labelOr('nav.nextMonth', 'Next month'), href: '/owner/cars?view=calendar&monthOffset=1', icon: FaCalendarAlt },
      ]
    },
    {
      label: labelOr('nav.finance', 'Finance'),
      icon: FaDollarSign,
      href: '/owner/cars?view=finance',
      children: [
        { label: labelOr('nav.allPayments', 'All payments'), href: '/owner/cars?view=finance&filter=all', icon: FaDollarSign },
        { label: labelOr('nav.paid', 'Paid'), href: '/owner/cars?view=finance&filter=paid', icon: FaDollarSign },
        { label: labelOr('nav.pending', 'Pending'), href: '/owner/cars?view=finance&filter=pending', icon: FaDollarSign },
        { label: labelOr('nav.unpaid', 'Unpaid'), href: '/owner/cars?view=finance&filter=unpaid', icon: FaDollarSign },
        { label: labelOr('nav.last30Days', 'Last 30 days'), href: '/owner/cars?view=finance&range=30', icon: FaDollarSign },
        { label: labelOr('nav.monthToDate', 'Month to date'), href: '/owner/cars?view=finance&range=mtd', icon: FaDollarSign },
        { label: labelOr('nav.yearToDate', 'Year to date'), href: '/owner/cars?view=finance&range=ytd', icon: FaDollarSign },
        { label: labelOr('nav.expenses', 'Expenses & profit'), href: '/owner/cars?view=finance&mode=expenses', icon: FaDollarSign },
      ],
    },
    {
      label: labelOr('nav.analytics', 'Analytics'),
      icon: FaChartLine,
      href: '/owner/cars?view=analytics',
      children: [
        { label: labelOr('nav.last30Days', 'Last 30 days'), href: '/owner/cars?view=analytics&range=30', icon: FaChartLine },
        { label: labelOr('nav.last90Days', 'Last 90 days'), href: '/owner/cars?view=analytics&range=90', icon: FaChartLine },
        { label: labelOr('nav.yearToDate', 'Year to date'), href: '/owner/cars?view=analytics&range=ytd', icon: FaChartLine },
        { label: labelOr('nav.customRange', 'Custom range'), href: '/owner/cars?view=analytics&range=custom', icon: FaChartLine },
      ],
    },
    {
      label: labelOr('nav.reviews', 'Reviews'),
      icon: FaStar,
      href: '/owner/cars?view=reviews',
    },
    {
      label: labelOr('nav.messages', 'Messages'),
      icon: FaEnvelope,
      href: '/owner/cars?view=messages',
    },
    {
      label: labelOr('nav.settings', 'Settings'),
      icon: FaSettings,
      href: '/owner/cars?view=settings',
    },
  ];

  // Booking.com-style navigation for property owners (matches original dashboard nav structure)
  const bookingComNavItems = [
    {
      label: labelOr('nav.home', 'Home'),
      icon: FaHome,
      href: attachPropertyParam('/dashboard'),
      children: []
    },
    {
      label: labelOr('nav.pricingAndCalendar', 'Pricing and booking calendar'),
      icon: FaCalendarAlt,
      href: attachPropertyParam('/owner/rates'),
      children: [
        { label: labelOr('nav.calendar', 'Calendar'), href: attachPropertyParam('/owner/rates?view=calendar'), icon: FaCalendarAlt },
        { label: labelOr('nav.openCloseRooms', 'Open/close rooms'), href: attachPropertyParam('/owner/rates?view=open-close'), icon: FaCalendarAlt },
        { label: labelOr('nav.pricingPerGuest', 'Pricing per guest'), href: attachPropertyParam('/owner/rates?view=pricing-per-guest'), icon: FaUsers },
      ]
    },
    {
      label: labelOr('nav.reservations', 'Reservations'),
      icon: FaCalendarAlt,
      href: attachPropertyParam('/dashboard?tab=reservations&scope=all'),
      children: [
        { label: labelOr('nav.allReservations', 'All reservations'), href: attachPropertyParam('/dashboard?tab=reservations&scope=all'), icon: FaCalendarAlt },
        { label: labelOr('nav.checkIn', 'Check-in'), href: attachPropertyParam('/dashboard?tab=reservations&scope=checked-in'), icon: FaCalendarCheck },
        { label: labelOr('nav.checkOut', 'Check-out'), href: attachPropertyParam('/dashboard?tab=reservations&scope=checked-out'), icon: FaCalendarTimes },
        { label: labelOr('nav.cancelledReservations', 'Cancelled'), href: attachPropertyParam('/dashboard?tab=reservations&scope=cancelled'), icon: FaCalendarTimes },
        { label: labelOr('nav.directBooking', 'Direct booking'), href: "/owner/direct-booking", icon: FaCalendarCheck },
      ]
    },
    {
      label: labelOr('nav.property', 'Property'),
      icon: FaBed,
      href: attachPropertyParam('/owner/property'),
      children: [
        { label: labelOr('nav.propertyPolicies', 'Property policies'), href: attachPropertyParam('/owner/property?view=policies'), icon: FaFileAlt },
        { label: labelOr('nav.reservationPolicies', 'Reservation policies'), href: attachPropertyParam('/owner/property?view=reservation-policies'), icon: FaFileAlt },
        { label: labelOr('nav.facilitiesServices', 'Facilities and services'), href: attachPropertyParam('/owner/property?view=facilities'), icon: FaCog },
        { label: labelOr('nav.roomDetails', 'Room details'), href: attachPropertyParam('/owner/property?view=room-details'), icon: FaBed },
        { label: labelOr('nav.roomAmenities', 'Room Amenities'), href: attachPropertyParam('/owner/property?view=room-amenities'), icon: FaBed },
        { label: labelOr('nav.yourProfile', 'your profile'), href: attachPropertyParam('/owner/property?view=profile'), icon: FaUser },
        { label: labelOr('nav.viewDescriptions', 'View your descriptions'), href: attachPropertyParam('/owner/property?view=descriptions'), icon: FaFileAlt },
        { label: labelOr('nav.photos', 'Photos'), href: attachPropertyParam('/owner/property?view=photos'), icon: FaImages },
        { label: labelOr('nav.messagingPreferences', 'Messaging preferences'), href: '/settings?tab=messaging', icon: FaEnvelope },
        { label: labelOr('nav.propertyManagement', 'Property management'), href: attachPropertyParam('/owner/property?view=general-info'), icon: FaImages },
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
      href: attachPropertyParam('/dashboard?tab=finance'),
      children: [
        { label: labelOr('nav.financialOverview', 'Financial overview'), href: attachPropertyParam('/dashboard?tab=finance'), icon: FaChartLine },
        { label: labelOr('nav.invoices', 'Invoices'), href: attachPropertyParam('/dashboard?tab=finance&view=invoices'), icon: FaFileAlt },
        { label: labelOr('nav.payouts', 'Payouts'), href: attachPropertyParam('/dashboard?tab=finance&view=payouts'), icon: FaMoneyBillWave },
        { label: labelOr('nav.expenses', 'Expenses & profit'), href: attachPropertyParam('/dashboard?tab=finance&view=expenses'), icon: FaDollarSign },
        { label: labelOr('nav.paymentSettings', 'Payment settings'), href: '/settings?tab=payment', icon: FaCog },
      ]
    },
    {
      label: labelOr('nav.salesReportingAnalytics', 'Sales Reporting & Analytics'),
      icon: FaChartLine,
      href: attachPropertyParam('/dashboard?tab=analytics'),
      children: [
        { label: labelOr('nav.analyticsDashboard', 'Overview dashboard'), href: attachPropertyParam('/dashboard?tab=analytics'), icon: FaChartLine },
        { label: labelOr('nav.salesStatistics', 'Sales statistics'), href: attachPropertyParam('/dashboard?tab=analytics&view=sales'), icon: FaChartLine },
        { label: labelOr('nav.reports', 'Reports'), href: attachPropertyParam('/dashboard?tab=analytics&view=reports'), icon: FaFileAlt },
        { label: labelOr('nav.directVsOnline', 'Direct vs Online'), href: attachPropertyParam('/dashboard?tab=analytics&view=comparison'), icon: FaChartLine },
        { label: labelOr('nav.occupancyRevenuePerRoom', 'Occupancy & Revenue per Room'), href: attachPropertyParam('/dashboard?tab=analytics&view=occupancy'), icon: FaChartLine },
        { label: labelOr('nav.taxLiabilityTracking', 'Tax liability tracking'), href: attachPropertyParam('/dashboard?tab=analytics&view=tax'), icon: FaFileAlt },
      ]
    },
  ];

  // Fetch unread notification counts and owner stats for navbar badges
  useEffect(() => {
    if (!isAuthenticated) {
      // Reset counts when user logs out
      setUnreadNotifCount(0);
      setUnreadMsgCount(0);
      setUserStats({ properties: 0, bookings: 0, rating: 0 });
      return;
    }
    let timer;

    const loadUnread = async () => {
      try {
        // Use owner-scoped unread count when host is in the owner dashboard,
        // otherwise use the generic guest/global unread count.
        const endpoint = (isAuthenticated && user?.userType === 'host' && isInPropertyOwnerDashboard())
          ? '/api/user/notifications/unread-count'
          : '/api/notifications/unread-count';

        const data = await safeApiGet(endpoint, { count: 0 });
        setUnreadNotifCount(Number(data?.count || 0));
      } catch (error) {
        // Silently handle errors for unauthenticated users
      }
    };

    const loadUnreadMessages = async () => {
      try {
        const data = await safeApiGet('/api/messages/unread-count', { count: 0 });
        setUnreadMsgCount(Number(data?.count || 0));
      } catch (error) {
        // Silently handle errors for unauthenticated users
      }
    };

    const loadUserStats = async () => {
      if (user?.userType === 'host') {
        try {
          // Try stats endpoint first, fallback to dashboard
          let data = await safeApiGet('/api/reports/stats', null);
          if (!data) {
            data = await safeApiGet('/api/reports/dashboard', { properties: 0, bookings: 0, rating: 0 });
          }

          setUserStats({
            properties: data?.totalProperties || 0,
            bookings: data?.totalBookings || 0,
            rating: data?.averageRating || 0
          });
        } catch (error) {
          // Silently handle errors
        }
      }
    };

    const loadList = async () => {
      // Use owner-scoped notifications when host is in the owner dashboard,
      // otherwise use the generic notifications feed (guest/global context).
      const endpoint = (isAuthenticated && user?.userType === 'host' && isInPropertyOwnerDashboard())
        ? '/api/user/notifications'
        : '/api/notifications/list';

      const data = await safeApiGet(endpoint, { notifications: [] });
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

  // Load host's cars for vehicle selector (navbar context)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!isAuthenticated || user?.userType !== 'host') return;
        const res = await fetch(`${API_URL}/api/cars/mine`, { credentials: 'include' });
        if (!res.ok) return;
        const data = await res.json().catch(() => ({}));
        const list = Array.isArray(data.cars) ? data.cars : [];
        if (!cancelled) setMyCars(list);
      } catch (_) {
        if (!cancelled) setMyCars([]);
      }
    })();
    return () => { cancelled = true; };
  }, [isAuthenticated, user?.userType]);

  // Load host's attractions for attraction selector (navbar context)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!isAuthenticated || user?.userType !== 'host') return;
        const res = await fetch(`${API_URL}/api/attractions/mine`, { credentials: 'include' });
        if (!res.ok) return;
        const data = await res.json().catch(() => ({}));
        const list = Array.isArray(data.attractions) ? data.attractions : [];
        if (!cancelled) setMyAttractions(list);
      } catch (_) {
        if (!cancelled) setMyAttractions([]);
      }
    })();
    return () => { cancelled = true; };
  }, [isAuthenticated, user?.userType]);

  // Keep selected property in sync with URL and loaded properties
  useEffect(() => {
    if (!isAuthenticated || user?.userType !== 'host') return;
    if (!Array.isArray(myProperties) || myProperties.length === 0) {
      setSelectedPropertyId('');
      return;
    }

    // On the group home page and non-property dashboards (vehicles/attractions),
    // do not auto-select a property. The property-specific navigation should be
    // neutral in those contexts.
    if (
      location.pathname.startsWith('/group-home') ||
      location.pathname.startsWith('/owner/cars') ||
      location.pathname.startsWith('/owner/attractions')
    ) {
      setSelectedPropertyId('');
      return;
    }

    const params = new URLSearchParams(location.search || '');
    const urlProp = params.get('property');
    const existsInList = urlProp && myProperties.some(p => String(p._id) === String(urlProp));
    const firstId = String(myProperties[0]._id || '');
    setSelectedPropertyId(existsInList ? String(urlProp) : firstId);
  }, [isAuthenticated, user?.userType, myProperties, location.search, location.pathname]);

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
      try {
      const unreadNotif = await safeApiGet('/api/notifications/unread-count', { count: 0 });
        setUnreadNotifCount(Number(unreadNotif?.count || 0));
      const unreadMsgs = await safeApiGet('/api/messages/unread-count', { count: 0 });
        setUnreadMsgCount(Number(unreadMsgs?.count || 0));
      if (user?.userType === 'host') {
        let data = await safeApiGet('/api/reports/stats', null);
        if (!data) data = await safeApiGet('/api/reports/dashboard', { properties: 0, bookings: 0, rating: 0 });
        setUserStats({
            properties: data?.totalProperties || 0,
            bookings: data?.totalBookings || 0,
            rating: data?.averageRating || 0
          });
        }
      } catch (error) {
        // Silently handle errors - user might not be authenticated
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
    // Always deep-link into the notifications page so the selected notification
    // is opened and focused there (the Notifications page already supports
    // ?open=<id> / ?id=<id> to highlight and scroll to a specific item).
    const id = n.id || n._id || '';
    return `/notifications?open=${encodeURIComponent(id)}`;
  };

  const isActiveRoute = (path) => {
    return location.pathname === path;
  };

  // Check if user is in *property* owner dashboard context (exclude vehicles/attractions dashboards)
  const isInPropertyOwnerDashboard = () => {
    // Treat the main step-based listing wizard (/upload) as OUTSIDE the dashboard.
    // The dashboard is only for management after at least one listing exists.
    // Note: /my-bookings is now a guest bookings page and should NOT be considered part of the owner dashboard.
    const ownerPropertyRoutes = [
      '/group-home',
      '/dashboard',
      '/user-dashboard',
      '/owner/property',
      '/owner/rates',
    ];
    return ownerPropertyRoutes.some(route => location.pathname.startsWith(route));
  };

  // True when user is on the listing wizard routes (outside dashboard but still listing context)
  const isOnListingWizard = (
    location.pathname.startsWith('/upload') ||
    location.pathname.startsWith('/upload-property') ||
    location.pathname.startsWith('/list-property')
  );

  // True when a host is on the listing wizard routes (kept for any host-specific checks)
  const isOnHostListingWizard = isAuthenticated && user?.userType === 'host' && isOnListingWizard;

  // Vehicles owner dashboard context
  const isInCarOwnerDashboard = () => {
    return location.pathname.startsWith('/owner/cars');
  };

  // Attractions owner dashboard context
  const isInAttractionOwnerDashboard = () => {
    return location.pathname.startsWith('/owner/attractions');
  };

  // Any owner dashboard (properties, vehicles, or attractions)
  const isInAnyOwnerDashboard = () => {
    return isInPropertyOwnerDashboard() || isInCarOwnerDashboard() || isInAttractionOwnerDashboard();
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
        }`}
      >
        <div className="flex items-start gap-1.5">
          <div className="min-w-0">
            <div className="text-gray-800 break-words whitespace-normal text-[11px] leading-snug">{n.title || n.message}</div>
            <div className="text-[9px] text-gray-500 break-words">{n.createdAt ? new Date(n.createdAt).toLocaleString() : ''}</div>
                  )}
                </div>
              )}

              {/* Profile menu */}
              {isAuthenticated && (
                <div className="relative inline-flex items-center">
                  <button
                    onClick={toggleProfile}
                    className={`profile-button flex items-center gap-1.5 px-2 py-1.5 rounded-md transition-colors ${isProfileOpen
                        ? 'bg-[#a06b42] text-white'
                        : 'text-[#6b5744] hover:text-[#4b2a00] hover:bg-[#e8dcc8]'
                      }`}
                    title={user?.firstName || user?.lastName ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Account'}
                  >
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt="avatar"
                        className="w-5 h-5 rounded-full object-cover"
                        onError={() => setAvatarOk(false)}
                        style={{ display: avatarOk ? 'block' : 'none' }}
                      />
                    ) : null}
                    {!avatarOk || !avatarUrl ? (
                      <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center border border-gray-200">
                        <FaUserCircle className="text-xs text-gray-500" />
                      </div>
                    ) : null}
                    <FaCaretDown className="text-[10px]" />
                  </button>
                  {isProfileOpen && (
                    <div className="profile-dropdown absolute top-full right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-[99999]">
                      <div className="px-3 py-1.5 border-b border-gray-100 text-xs">
                        <div className="font-semibold text-[#4b2a00] truncate">{user?.firstName || user?.lastName ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : (user?.email || '')}</div>
                        <div className="text-[10px] text-gray-600 truncate">{user?.email}</div>
                      </div>
                      <Link
                        to={isAuthenticated && user?.userType === 'host' && isInPropertyOwnerDashboard() ? '/owner/profile' : '/profile'}
                        className="block px-3 py-1.5 text-xs text-[#4b2a00] hover:bg-gray-50"
                      >
                        {t ? t('nav.profile') : 'Profile'}
                      </Link>
                      <Link to="/settings" className="block px-3 py-1.5 text-xs text-[#4b2a00] hover:bg-gray-50">{t ? t('nav.accountSettings') : 'Account settings'}</Link>
                      <button onClick={handleLogout} className="w-full text-left px-3 py-1.5 text-xs text-red-700 hover:bg-gray-50 flex items-center gap-2">
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
                  <button
                    type="button"
                    onClick={() => { setLangOpenSecond(o=>!o); setCurrOpenSecond(false); }}
                    className={`flex items-center space-x-2 cursor-pointer ${
                      isAuthenticated && user?.userType === 'host' && isInPropertyOwnerDashboard()
                        ? ''
                        : 'hover:text-[#4b2a00]'
                    }`}
                  >
                    <FaGlobe className="text-sm" />
                    <span className="hidden sm:inline">{(language || 'en').toUpperCase()}</span>
                    <FaCaretDown className="text-[10px] hidden sm:inline" />
                  </button>
                  {langOpenSecond && (
                    <div className="main-nav-dropdown absolute right-0 mt-2 bg-white text-[#4b2a00] rounded-md shadow-lg border border-gray-200">
                      <button onClick={() => { setLanguage && setLanguage('en'); setLangOpenSecond(false); }} className="block px-3 py-2 text-left w-full hover:bg-[#fff7ef]">English</button>
                      <button onClick={() => { setLanguage && setLanguage('fr'); setLangOpenSecond(false); }} className="block px-3 py-2 text-left w-full hover:bg-[#fff7ef]">Français</button>
                    </div>
                  )}
                </div>
                {/* Currency selector */}
                <div className="relative currency-selector-second">
                  <button
                    type="button"
                    onClick={() => { setCurrOpenSecond(o=>!o); setLangOpenSecond(false); }}
                    className={`flex items-center space-x-2 cursor-pointer ${
                      isAuthenticated && user?.userType === 'host' && isInPropertyOwnerDashboard()
                        ? ''
                        : 'hover:text-[#4b2a00]'
                    }`}
                  >
                    <span className="font-semibold">{(currency || 'RWF').toUpperCase()}</span>
                    <FaCaretDown className="text-[10px]" />
                  </button>
                  {currOpenSecond && (
                    <div className="main-nav-dropdown absolute right-0 mt-2 bg-white text-[#4b2a00] rounded-md shadow-lg border border-gray-200 min-w-[120px]">
                      <button onClick={() => { setCurrency && setCurrency('RWF'); setCurrOpenSecond(false); }} className="block px-3 py-2 text-left w-full hover:bg-[#fff7ef]">RWF</button>
                      <button onClick={() => { setCurrency && setCurrency('USD'); setCurrOpenSecond(false); }} className="block px-3 py-2 text-left w-full hover:bg-[#fff7ef]">USD</button>
                      <button onClick={() => { setCurrency && setCurrency('EUR'); setCurrOpenSecond(false); }} className="block px-3 py-2 text-left w-full hover:bg-[#fff7ef]">EUR</button>
                    </div>
                  )}
                </div>
              </div>

            {/* Mobile Menu Button */}
            <button
              onClick={toggleMenu}
              className="lg:hidden p-1.5 text-[#6b5744] hover:text-[#4b2a00]"
            >
              {isMenuOpen ? <FaTimes className="text-base" /> : <FaBars className="text-base" />}
            </button>
              </div>
            </div>

            {/* Owner navigation (Booking.com style) in second navbar */}
            {isAuthenticated && user?.userType === 'host' && (isInAnyOwnerDashboard() || location.pathname === '/') && (isInPropertyOwnerDashboard() ? !!selectedPropertyId : true) && (
              <div className="w-full flex flex-wrap items-center gap-1 pt-1 mt-1">
                {(isInCarOwnerDashboard()
                  ? carOwnerNavItems
                  : isInAttractionOwnerDashboard()
                    ? attractionOwnerNavItems
                    : bookingComNavItems
                ).map((item, idx) => {
                  const Icon = item.icon;
                  const isOpen = activeDropdown === item.label;
                  const isParentActive = isActiveRoute(item.href);
                  return (
                    <div key={idx} className="relative owner-nav-dropdown">
                      <button
                        type="button"
                        onClick={() => {
                          if (!item.children || item.children.length === 0) {
                            if (item.href) navigate(item.href);
                            setActiveDropdown(null);
                          } else {
                            toggleDropdown(item.label);
                          }
                        }}
                        className={`owner-nav-dropdown-button inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium transition-colors border ${isOpen || isParentActive ? 'bg-[#e8dcc8] border-gray-200 text-[#4b2a00]' : 'bg-white border-gray-200 text-[#6b5744] hover:bg-[#f2e5d3]'}`}
                      >
                        <Icon className="text-xs" />
                        <span>{item.label}</span>
                        {item.badge && (
                          <span className="ml-0.5 inline-flex items-center justify-center text-[9px] px-1 py-0.5 rounded-full bg-[#a06b42] text-white">{item.badge}</span>
                        )}
                        {item.children && item.children.length > 0 && (
                          <FaCaretDown className={`text-[9px] ml-0.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                        )}
                      </button>
                      {isOpen && item.children && item.children.length > 0 && (
                        <div className="main-nav-dropdown absolute left-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-[2000]">
                          {item.children.map((child, cidx) => {
                            const ChildIcon = child.icon;
                            const href = child.href || item.href;
                            const isChildActive = isActiveRoute(href);
                            return (
                              <button
                                key={cidx}
                                type="button"
                                onClick={() => { navigate(href); setActiveDropdown(null); }}
                                className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left hover:bg-gray-50 ${isChildActive ? 'bg-gray-50 text-[#4b2a00]' : 'text-[#4b2a00]'}`}
                              >
                                {ChildIcon && <ChildIcon className="text-xs" />}
                                <span className="flex-1">{child.label}</span>
                                {child.badge && (
                                  <span className="ml-auto inline-flex items-center justify-center text-[9px] px-1 py-0.5 rounded-full bg-[#a06b42] text-white">{child.badge}</span>
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
      {isMenuOpen && (
        <div className="lg:hidden border-t border-[#e0d5c7] bg-[#f9f4ee]">
          {/* Mobile property selector */}
          {user?.userType === 'host' && isInPropertyOwnerDashboard() && myProperties.length > 0 && (
            <div className="px-2 py-2">
              <div className="text-[10px] font-semibold text-[#6b5744] mb-1.5">{t ? t('banner.manageProperty') : 'Manage property'}</div>
              <div className="grid grid-cols-1 gap-1.5 mb-2">
                {myProperties.map((p) => (
                  <button
                    key={p._id}
                    type="button"
                    className="block w-full px-2 py-1.5 rounded-md bg-white border border-[#e0d5c7] text-sm text-left text-[#4b2a00] hover:bg-[#fffaf5]"
                    onClick={() => {
                      try {
                        const params = new URLSearchParams();
                        params.set('tab', 'calendar');
                        params.set('property', String(p._id));
                        const qs = params.toString();
                        const url = qs ? `/my-bookings?${qs}` : '/my-bookings';
                        window.open(url, '_blank');
                      } catch (_) {}
                      setIsMenuOpen(false);
                    }}
                  >
                    {p.title || p.name || p.propertyNumber}
                  </button>
                ))}
              </div>

              {/* Dashboard categories for host management: Vehicles & Attractions (mobile) */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  className="flex-1 px-2 py-1.5 rounded-md border border-[#d4c4b0] bg-white text-sm font-medium text-[#4b2a00] hover:bg-[#f4e5d4]"
                  onClick={() => window.open('/owner/cars', '_blank', 'noopener,noreferrer')}
                >
                  Vehicles
                </button>
                <button
                  type="button"
                  className="flex-1 px-2 py-1.5 rounded-md border border-[#d4c4b0] bg-white text-sm font-medium text-[#4b2a00] hover:bg-[#f4e5d4]"
                  onClick={() => window.open('/owner/attractions', '_blank', 'noopener,noreferrer')}
                >
                  Attractions
                </button>
              </div>
            </div>
          )}

          {/* Owner navigation (Booking.com style) - shown in owner dashboards and on landing page for hosts */}
          {user?.userType === 'host' && (isInAnyOwnerDashboard() || location.pathname === '/') && (isInPropertyOwnerDashboard() ? !!selectedPropertyId : true) && (
            <div className="px-2 pb-2">
              {(isInCarOwnerDashboard()
                ? carOwnerNavItems
                : isInAttractionOwnerDashboard()
                  ? attractionOwnerNavItems
                  : bookingComNavItems
              ).map((item, idx) => {
                const Icon = item.icon;
                const open = !!expandedMobileItems[item.label];
                return (
                  <div key={idx} className="mb-2">
                    <button
                      type="button"
                      onClick={() => setExpandedMobileItems((s) => ({ ...s, [item.label]: !open }))}
                      className="w-full flex items-center justify-between px-2 py-1.5 rounded-md bg-white border border-[#e0d5c7] text-[#4b2a00]"
                    >
                      <span className="flex items-center gap-2"><Icon className="text-xs" />{item.label}</span>
                      <FaCaretDown className={`text-[10px] transition-transform ${open ? 'rotate-180' : ''}`} />
                    </button>
                    {open && (
                      <div className="mt-1 rounded-md bg-[#fff8f1] border border-[#e0d5c7] overflow-hidden">
                        {(item.children && item.children.length > 0 ? item.children : [{ label: item.label, href: item.href, icon: item.icon }]).map((child, cidx) => {
                          const ChildIcon = child.icon;
                          return (
                            <Link
                              key={cidx}
                              to={child.href}
                              className="flex items-center gap-2 px-2 py-1.5 text-sm text-[#4b2a00] hover:bg-white border-t border-[#f0e6d9] first:border-t-0"
                              onClick={() => setIsMenuOpen(false)}
                            >
                              <ChildIcon className="text-xs" />
                              <span className="flex-1">{child.label}</span>
                              {child.badge ? (
                                <span className="ml-auto inline-flex items-center justify-center text-[9px] px-1 py-0.5 rounded-full bg-[#a06b42] text-white">{child.badge}</span>
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

          {/* Guest/General quick links (mobile dropdown - all links here) */}
          {!isInPropertyOwnerDashboard() && (
            <div className="px-2 pb-4">
              {mainNavItems.map((m, i) => {
                const hasChildren = m.children && m.children.length > 0;
                const isExpanded = expandedMobileItems[`main-${i}`];
                return (
                  <div key={i} className="mb-2">
                    {hasChildren ? (
                      <div>
                        <button
                          type="button"
                          onClick={() => setExpandedMobileItems((s) => ({ ...s, [`main-${i}`]: !isExpanded }))}
                          className="w-full flex items-center justify-between px-2 py-1.5 rounded-md bg-white border border-[#e0d5c7] text-[#4b2a00]"
                        >
                          <span className="flex items-center gap-1.5">
                            {m.icon && <m.icon className="text-xs" />}
                            <span className="text-[10px]">{m.label}</span>
                          </span>
                          <FaCaretDown className={`text-[10px] transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </button>
                        {isExpanded && (
                          <div className="mt-1 rounded-md bg-[#fff8f1] border border-[#e0d5c7] overflow-hidden">
                            {m.children.map((child, cidx) => (
                              <Link
                                key={cidx}
                                to={child.href || m.href}
                                className="flex items-center gap-2 px-2 py-1.5 text-sm text-[#4b2a00] hover:bg-white border-t border-[#f0e6d9] first:border-t-0"
                                onClick={() => setIsMenuOpen(false)}
                              >
                                {child.icon && <child.icon className="text-xs" />}
                                <span>{child.label}</span>
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <Link
                        to={m.href}
                        className="flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-white border border-[#e0d5c7] text-[#4b2a00]"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        {m.icon && <m.icon className="text-xs" />}
                        <span className="text-[10px]">{m.label}</span>
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

    </>
  );
};

export default Navbar;