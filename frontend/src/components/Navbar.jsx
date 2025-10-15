import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
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
import { useSocket } from "../contexts/SocketContext";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [unreadMsgCount, setUnreadMsgCount] = useState(0);
  const { socket } = useSocket();

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
      try {
        const res = await fetch(`${API_URL}/api/notifications/unread-count`, { credentials: 'include' });
        const data = await res.json();
        if (res.ok) setUnreadNotifCount(Number(data.count || 0));
      } catch (_) {}
    };
    const loadList = async () => {
      try {
        const res = await fetch(`${API_URL}/api/notifications/list`, { credentials: 'include' });
        const data = await res.json();
        if (res.ok) {
          const list = (data.notifications || []).map(n => ({
            id: n._id,
            type: n.type,
            title: n.title || n.message,
            message: n.message || n.title,
            isRead: !!n.isRead,
            booking: n.booking,
            property: n.property,
            createdAt: n.createdAt
          }));
          setNotifications(list);
          setUnreadNotifCount(list.filter(x => !x.isRead).length);
        }
      } catch (_) {}
    };
    loadUnread();
    loadList();
    timer = setInterval(loadUnread, 30000);
    return () => { if (timer) clearInterval(timer); };
  }, [isAuthenticated]);

  const markNotificationRead = async (id) => {
    try {
      await fetch(`${API_URL}/api/notifications/${id}/read`, { method: 'PATCH', credentials: 'include' });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnreadNotifCount(prev => Math.max(0, prev - 1));
    } catch (_) {}
  };

  const getNotificationLink = (n) => {
    if (!n) return '#';
    // Route mapping by type and attached entities
    if (n.type?.startsWith('booking') && (n.booking?._id || n.booking)) {
      const bid = n.booking?._id || n.booking;
      return `/booking/${bid}`;
    }
    if (n.type?.includes('receipt') && (n.booking?._id || n.booking)) {
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

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const toggleProfile = () => {
    setIsProfileOpen(!isProfileOpen);
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

  return (
    <>
      <nav className="w-full bg-white navbar-shadow border-b border-gray-200 relative">
        {/* Top Bar - Like Booking.com */}
        <div className="bg-blue-800 text-white py-2 px-4">
          <div className="max-w-7xl mx-auto flex justify-between items-center text-xs">
            <div className="flex items-center space-x-4 lg:space-x-6">
              {isAuthenticated && user?.userType !== "admin" && (
                <>
                  <Link
                    to="/dashboard"
                    className="hidden sm:inline hover:text-blue-200 font-medium"
                  >
                    Dashboard
                  </Link>
                  <Link
                    to="/upload"
                    className="hidden sm:inline hover:text-blue-200 font-medium"
                  >
                    List your property
                  </Link>
                  {user?.userType === 'host' && (
                    <Link
                      to="/my-bookings"
                      className="hidden sm:inline hover:text-blue-200 font-medium"
                    >
                      My Bookings
                    </Link>
                  )}
                  {user?.userType === 'host' && (
                    <Link
                      to="/owner/cars"
                      className="hidden sm:inline hover:text-blue-200 font-medium"
                    >
                      My Cars
                    </Link>
                  )}
                </>
              )}
              {isAuthenticated && user?.userType === "admin" && (
                <Link
                  to="/admin"
                  className="hidden sm:inline hover:text-blue-200 font-medium"
                >
                  Admin Dashboard
                </Link>
              )}
              <Link
                to="/support"
                className="hover:text-blue-200 font-medium"
              >
                Customer Support
              </Link>
              <span className="hidden lg:inline hover:text-blue-200 cursor-pointer font-medium">
                Partner Portal
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 hover:text-blue-200 cursor-pointer">
                <FaGlobe className="text-sm" />
                <span className="hidden sm:inline">English</span>
              </div>
              <div className="flex items-center space-x-2 hover:text-blue-200 cursor-pointer">
                <span className="font-semibold">RWF</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Navigation - Booking.com Style */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            {/* Logo */}
            <div className="flex items-center space-x-8">
              <Link
                to="/"
                className="text-2xl font-bold text-blue-800 hover:text-blue-600"
              >
                AKWANDA.rw
              </Link>

              {/* Main Navigation Items - Booking.com Style */}
              {user?.userType !== "admin" && (
                <div className="hidden lg:flex items-center space-x-1">
                  {mainNavItems.map((item, index) => {
                    const Icon = item.icon;
                    const isActive = isActiveRoute(item.href);
                    const isDropdownOpen = activeDropdown === item.label;
                    
                    return (
                      <div key={index} className="relative group">
                        <button
                          onClick={() => toggleDropdown(item.label)}
                          className={`flex items-center space-x-2 px-4 py-3 rounded-lg transition-all duration-300 font-medium ${
                            isActive
                              ? "bg-blue-600 text-white shadow-md"
                              : "text-gray-700 hover:text-blue-600 hover:bg-gray-50"
                          }`}
                        >
                          <Icon className="text-lg" />
                          <span>{item.label}</span>
                          <FaCaretDown className={`text-sm transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Dropdown Menu - Booking.com Style */}
                        {isDropdownOpen && (
                          <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-xl dropdown-shadow border border-gray-200 py-3 z-50">
                            {item.children.map((child, childIndex) => {
                              const ChildIcon = child.icon;
                              const isChildActive = isActiveRoute(child.href);
                              return (
                                <Link
                                  key={childIndex}
                                  to={child.href}
                                  className={`flex items-center space-x-3 px-4 py-3 text-sm hover:bg-gray-50 transition-colors ${
                                    isChildActive ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
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
            <div className="flex items-center space-x-4">
              {/* Owner Management Dropdown - Booking.com Style */}
              {isAuthenticated && user?.userType === 'host' && (
                <div className="hidden lg:block relative">
                  <button
                    onClick={() => toggleDropdown('owner')}
                    className={`flex items-center space-x-2 px-4 py-3 rounded-lg transition-all duration-300 font-medium ${
                      activeDropdown === 'owner'
                        ? "bg-blue-600 text-white shadow-md"
                        : "text-gray-700 hover:text-blue-600 hover:bg-gray-50"
                    }`}
                  >
                    <FaUser className="text-lg" />
                    <span>Owner</span>
                    <FaCaretDown className={`text-sm transition-transform ${activeDropdown === 'owner' ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Owner Management Dropdown - Booking.com Style */}
                  {activeDropdown === 'owner' && (
                    <div className="absolute top-full right-0 mt-1 w-[900px] bg-white rounded-xl dropdown-shadow border border-gray-200 p-6 z-50">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-sm">
                        {ownerManagementLinks.map((category, index) => {
                          const CategoryIcon = category.icon;
                          return (
                            <div key={index}>
                              <div className="flex items-center space-x-2 mb-4">
                                <CategoryIcon className="text-blue-600 text-lg" />
                                <div className="text-sm font-semibold text-gray-700">
                                  {category.category}
                                </div>
                              </div>
                              <div className="space-y-1">
                                {category.links.map((link, linkIndex) => (
                                  <Link
                                    key={linkIndex}
                                    to={link.href}
                                    className="block px-3 py-2 rounded hover:bg-blue-50 hover:text-blue-700 text-gray-600 transition-colors"
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

              {/* Messages */}
              {isAuthenticated && (
                <Link
                  to="/messages"
                  className="hidden lg:flex items-center space-x-2 px-4 py-3 modern-card text-gray-700 hover:text-blue-600 relative"
                  title="Messages"
                >
                  <FaEnvelope className="text-lg" />
                  <span className="font-medium">Messages</span>
                  {unreadMsgCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                      {unreadMsgCount}
                    </span>
                  )}
                </Link>
              )}

              {/* Notifications (admin and host) */}
              {(user?.userType === "admin" || user?.userType === 'host') && (
                <div className="hidden lg:block relative group">
                  <button className="relative p-3 text-gray-700 hover:text-blue-600 hover:bg-gray-100 rounded-lg">
                    <FaBell className="text-lg" />
                    {unreadNotifCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-green-600 text-white text-xs rounded-full px-2 py-1 min-w-[18px] text-center">
                        {unreadNotifCount}
                      </span>
                    )}
                  </button>
                  <div className="hidden group-hover:block absolute right-0 mt-2 w-80 bg-white rounded-xl dropdown-shadow border border-gray-200 py-2 z-50">
                    <div className="px-4 py-2 border-b border-gray-100 font-semibold text-sm">
                      Notifications
                    </div>
                    <div className="max-h-96 overflow-auto">
                      {Object.entries(groupedNotifications()).map(([category, notifs]) => (
                        <div key={category} className="px-4 py-2">
                          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                            {category}
                          </div>
                          {notifs.map((n) => (
                            <Link
                              key={n.id}
                              to={getNotificationLink(n)}
                              onClick={() => markNotificationRead(n.id)}
                              className={`block text-xs py-2 rounded hover:bg-gray-50 ${!n.isRead ? 'font-semibold' : 'text-gray-600'}`}
                            >
                              <div className="flex items-start gap-2">
                                <div className={`w-2 h-2 mt-1 rounded-full ${!n.isRead ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
                                <div>
                                  <div className="text-gray-800 line-clamp-2">{n.title || n.message}</div>
                                  <div className="text-[10px] text-gray-500">{n.createdAt ? new Date(n.createdAt).toLocaleString() : ''}</div>
                                </div>
                              </div>
                            </Link>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Profile Menu */}
              {isAuthenticated ? (
                <div className="relative">
                  <button
                    onClick={toggleProfile}
                    className="flex items-center space-x-2 px-4 py-3 modern-card text-gray-700 hover:text-blue-600"
                  >
                    <FaUserCircle className="text-lg" />
                    <span className="hidden sm:inline font-medium">
                      {user?.name || user?.email}
                    </span>
                    {isProfileOpen ? (
                      <FaChevronUp className="text-sm" />
                    ) : (
                      <FaChevronDown className="text-sm" />
                    )}
                  </button>

                  {isProfileOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl dropdown-shadow border border-gray-200 py-2 z-50">
                      <Link
                        to="/profile"
                        className="flex items-center space-x-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50"
                        onClick={() => setIsProfileOpen(false)}
                      >
                        <FaUser className="text-sm" />
                        <span>Profile</span>
                      </Link>
                      <Link
                        to="/settings"
                        className="flex items-center space-x-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50"
                        onClick={() => setIsProfileOpen(false)}
                      >
                        <FaCog className="text-sm" />
                        <span>Settings</span>
                      </Link>
                      <hr className="my-2" />
                      <button
                        onClick={handleLogout}
                        className="flex items-center space-x-3 w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50"
                      >
                        <FaSignOutAlt className="text-sm" />
                        <span>Logout</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center space-x-3">
                  <Link
                    to="/login"
                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-blue-600"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Sign Up
                  </Link>
                </div>
              )}

              {/* Mobile Menu Button */}
              <button
                onClick={toggleMenu}
                className="lg:hidden p-2 text-gray-700 hover:text-blue-600"
              >
                {isMenuOpen ? <FaTimes className="text-xl" /> : <FaBars className="text-xl" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu - Booking.com Style */}
        {isMenuOpen && (
          <div className="lg:hidden bg-white border-t border-gray-200 mobile-menu">
            <div className="px-4 py-2 space-y-1">
              {/* Main Navigation Items */}
              {user?.userType !== "admin" && (
                <>
                  {mainNavItems.map((item, index) => {
                    const Icon = item.icon;
                    const isActive = isActiveRoute(item.href);
                    return (
                      <div key={index}>
                        <Link
                          to={item.href}
                          className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium ${
                            isActive
                              ? "bg-blue-100 text-blue-700"
                              : "text-gray-700 hover:bg-gray-50"
                          }`}
                          onClick={() => setIsMenuOpen(false)}
                        >
                          <Icon className="text-lg" />
                          <span>{item.label}</span>
                        </Link>
                        {/* Mobile submenu */}
                        <div className="ml-8 space-y-1">
                          {item.children.map((child, childIndex) => {
                            const ChildIcon = child.icon;
                            const isChildActive = isActiveRoute(child.href);
                            return (
                              <Link
                                key={childIndex}
                                to={child.href}
                                className={`flex items-center space-x-3 px-4 py-2 rounded-lg text-sm ${
                                  isChildActive
                                    ? "bg-blue-50 text-blue-700"
                                    : "text-gray-600 hover:bg-gray-50"
                                }`}
                                onClick={() => setIsMenuOpen(false)}
                              >
                                <ChildIcon className="text-sm" />
                                <span>{child.label}</span>
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </>
              )}

              {/* Owner Management Links */}
              {isAuthenticated && user?.userType === 'host' && (
                <>
                  <div className="border-t border-gray-200 my-2"></div>
                  <div className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-50">
                    Owner Management
                  </div>
                  {ownerManagementLinks.map((category, index) => (
                    <div key={index}>
                      <div className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100">
                        {category.category}
                      </div>
                      {category.links.map((link, linkIndex) => (
                        <Link
                          key={linkIndex}
                          to={link.href}
                          className="flex items-center space-x-3 px-6 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          <span>{link.label}</span>
                        </Link>
                      ))}
                    </div>
                  ))}
                </>
              )}

              {/* Messages */}
              {isAuthenticated && (
                <>
                  <div className="border-t border-gray-200 my-2"></div>
                  <Link
                    to="/messages"
                    className="flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <FaEnvelope className="text-lg" />
                    <span>Messages</span>
                    {unreadMsgCount > 0 && (
                      <span className="ml-auto bg-red-600 text-white text-xs rounded-full px-2 py-1">
                        {unreadMsgCount}
                      </span>
                    )}
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </nav>
    </>
  );
};

export default Navbar;