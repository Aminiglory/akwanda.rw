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
} from "react-icons/fa";
import { useSocket } from "../contexts/SocketContext";

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isOwnerMenuOpen, setIsOwnerMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadMsgCount, setUnreadMsgCount] = useState(0);
  const { socket } = useSocket();

  // Navigation buttons for main categories
  const navButtons = [
    { href: "/apartments", label: "Apartments", icon: FaHome },
    { href: "/cars", label: "Cars", icon: FaCar },
    { href: "/flights", label: "Flights", icon: FaPlane },
    { href: "/hotels", label: "Hotels", icon: FaBed },
    { href: "/restaurants", label: "Restaurants", icon: FaUtensils },
    { href: "/homes", label: "Homes", icon: FaHome },
    { href: "/experiences", label: "Experiences", icon: FaShoppingBag },
    { href: "/deals", label: "Deals", icon: FaShoppingBag },
  ];

  // Owner management links (integrated into main nav)
  const ownerLinks = [
    { href: "/my-bookings", label: "Bookings", icon: FaBed },
    { href: "/owner/cars", label: "My Cars", icon: FaCar },
    { href: "/owner/promotions", label: "Promotions", icon: FaShoppingBag },
    { href: "/owner/reviews", label: "Reviews", icon: FaUser },
    { href: "/upload", label: "List Property", icon: FaHome },
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
    if (isAuthenticated && user?.userType === "admin") {
      // Mock notifications for admin
      setNotifications([
        {
          id: 1,
          message: "New property listing pending approval",
          timestamp: new Date(),
          isRead: false,
        },
        {
          id: 2,
          message: "User reported an issue",
          timestamp: new Date(),
          isRead: true,
        },
      ]);
    }
  }, [isAuthenticated, user]);

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

  const toggleOwnerMenu = () => {
    setIsOwnerMenuOpen(!isOwnerMenuOpen);
  };

  const groupedNotifications = () => {
    return notifications.reduce((acc, n) => {
      const cat = n.message.includes("property") ? "Properties" : "Users";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(n);
      return acc;
    }, {});
  };

  return (
    <>
      <nav className="w-full bg-white navbar-shadow border-b border-gray-200 relative">
        {/* Compact Top Bar */}
        <div className="bg-blue-800 text-white py-2 px-4">
          <div className="max-w-7xl mx-auto flex justify-between items-center text-xs">
            <div className="flex items-center space-x-3 lg:space-x-4">
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
                    List Property
                  </Link>
                  {user?.userType === 'host' && (
                    <Link
                      to="/my-bookings"
                      className="hidden sm:inline hover:text-blue-200 font-medium"
                    >
                      Bookings
                    </Link>
                  )}
                  {user?.userType === 'host' && (
                    <Link
                      to="/owner/cars"
                      className="hidden sm:inline hover:text-blue-200 font-medium"
                    >
                      Cars
                    </Link>
                  )}
                </>
              )}
              {isAuthenticated && user?.userType === "admin" && (
                <Link
                  to="/admin"
                  className="hidden sm:inline hover:text-blue-200 font-medium"
                >
                  Admin
                </Link>
              )}
              <Link
                to="/support"
                className="hover:text-blue-200 font-medium"
              >
                Support
              </Link>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-1 hover:text-blue-200 cursor-pointer">
                <FaGlobe className="text-xs" />
                <span className="hidden sm:inline">EN</span>
              </div>
              <div className="flex items-center space-x-1 hover:text-blue-200 cursor-pointer">
                <span className="font-semibold text-xs">RWF</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Navigation - Compact */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex justify-between items-center">
            {/* Logo */}
            <div className="flex items-center space-x-4 lg:space-x-6">
              <Link
                to="/"
                className="text-lg sm:text-xl font-bold text-blue-800 hover:text-blue-600"
              >
                AKWANDA.rw
              </Link>

              {/* Nav Buttons (desktop) - Compact */}
              {user?.userType !== "admin" && (
                <div className="hidden lg:flex items-center space-x-1 modern-card p-1">
                  {navButtons.map((button, index) => {
                    const Icon = button.icon;
                    const isActive = isActiveRoute(button.href);
                    return (
                      <div key={index} className="relative group">
                        <Link
                          to={button.href}
                          className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg transition-all duration-300 font-medium text-sm ${
                            isActive
                              ? "bg-blue-600 text-white shadow-md"
                              : "text-gray-700 hover:text-blue-600 hover:bg-gray-50"
                          }`}
                        >
                          <Icon className="text-sm" />
                          <span>{button.label}</span>
                        </Link>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right Side - Compact */}
            <div className="flex items-center space-x-2 lg:space-x-3">
              {/* Owner Management Links (integrated) */}
              {isAuthenticated && user?.userType === 'host' && (
                <div className="hidden lg:flex items-center space-x-1">
                  {ownerLinks.slice(0, 3).map((link, index) => {
                    const Icon = link.icon;
                    const isActive = isActiveRoute(link.href);
                    return (
                      <Link
                        key={index}
                        to={link.href}
                        className={`flex items-center space-x-1 px-2 py-1.5 rounded-md transition-all duration-300 text-xs font-medium ${
                          isActive
                            ? "bg-blue-100 text-blue-700"
                            : "text-gray-600 hover:text-blue-600 hover:bg-gray-50"
                        }`}
                      >
                        <Icon className="text-xs" />
                        <span>{link.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}

              {/* Messages */}
              {isAuthenticated && (
                <Link
                  to="/messages"
                  className="hidden lg:flex items-center space-x-1 px-3 py-2 modern-card text-gray-700 hover:text-blue-600 relative"
                  title="Messages"
                >
                  <FaEnvelope className="text-sm" />
                  <span className="font-medium text-xs">Messages</span>
                  {unreadMsgCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                      {unreadMsgCount}
                    </span>
                  )}
                </Link>
              )}

              {/* Notifications (admin only) */}
              {user?.userType === "admin" && (
                <div className="hidden lg:block relative group">
                  <button className="relative p-2 text-gray-700 hover:text-blue-600 hover:bg-gray-100 rounded-lg">
                    <FaBell className="text-sm" />
                    {notifications.filter((n) => !n.isRead).length > 0 && (
                      <span className="absolute -top-1 -right-1 bg-green-600 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[16px] text-center">
                        {notifications.filter((n) => !n.isRead).length}
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
                            <div
                              key={n.id}
                              className={`text-xs py-1 ${
                                !n.isRead ? "font-semibold" : "text-gray-600"
                              }`}
                            >
                              {n.message}
                            </div>
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
                    className="flex items-center space-x-2 px-3 py-2 modern-card text-gray-700 hover:text-blue-600"
                  >
                    <FaUserCircle className="text-sm" />
                    <span className="hidden sm:inline font-medium text-sm">
                      {user?.name || user?.email}
                    </span>
                    {isProfileOpen ? (
                      <FaChevronUp className="text-xs" />
                    ) : (
                      <FaChevronDown className="text-xs" />
                    )}
                  </button>

                  {isProfileOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl dropdown-shadow border border-gray-200 py-2 z-50">
                      <Link
                        to="/profile"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        onClick={() => setIsProfileOpen(false)}
                      >
                        <FaUser className="inline mr-2" />
                        Profile
                      </Link>
                      <Link
                        to="/settings"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        onClick={() => setIsProfileOpen(false)}
                      >
                        <FaCog className="inline mr-2" />
                        Settings
                      </Link>
                      <hr className="my-2" />
                      <button
                        onClick={handleLogout}
                        className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <FaSignOutAlt className="inline mr-2" />
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center space-x-2">
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
                {isMenuOpen ? <FaTimes /> : <FaBars />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="lg:hidden bg-white border-t border-gray-200">
            <div className="px-4 py-2 space-y-1">
              {user?.userType !== "admin" && (
                <>
                  {navButtons.map((button, index) => {
                    const Icon = button.icon;
                    const isActive = isActiveRoute(button.href);
                    return (
                      <Link
                        key={index}
                        to={button.href}
                        className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium ${
                          isActive
                            ? "bg-blue-100 text-blue-700"
                            : "text-gray-700 hover:bg-gray-50"
                        }`}
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <Icon className="text-lg" />
                        <span>{button.label}</span>
                      </Link>
                    );
                  })}
                </>
              )}

              {isAuthenticated && user?.userType === 'host' && (
                <>
                  <div className="border-t border-gray-200 my-2"></div>
                  <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Owner Tools
                  </div>
                  {ownerLinks.map((link, index) => {
                    const Icon = link.icon;
                    const isActive = isActiveRoute(link.href);
                    return (
                      <Link
                        key={index}
                        to={link.href}
                        className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium ${
                          isActive
                            ? "bg-blue-100 text-blue-700"
                            : "text-gray-700 hover:bg-gray-50"
                        }`}
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <Icon className="text-lg" />
                        <span>{link.label}</span>
                      </Link>
                    );
                  })}
                </>
              )}

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