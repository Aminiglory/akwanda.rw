import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  FaBed, FaPlane, FaBuffer, FaTaxi, FaGlobe, FaUser, 
  FaBell, FaBars, FaCaretDown, FaSignOutAlt
} from "react-icons/fa";
import { useAuth } from "../contexts/AuthContext";

const Navbar = () => {
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const { user, logout, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [userNotifs, setUserNotifs] = useState([]);
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  useEffect(() => {
    if (user?.userType === 'admin') {
      (async () => {
        try {
          const res = await fetch(`${API_URL}/api/admin/notifications`, { credentials: 'include' });
          const data = await res.json();
          if (res.ok) setNotifications(data.notifications || []);
        } catch (_) {}
      })();
    }
  }, [user?.userType]);

  useEffect(() => {
    if (isAuthenticated && user?.userType !== 'admin') {
      (async () => {
        try {
          const res = await fetch(`${API_URL}/api/user/notifications`, { credentials: 'include' });
          const data = await res.json();
          if (res.ok) setUserNotifs(data.notifications || []);
        } catch (_) {}
      })();
    }
  }, [isAuthenticated, user?.userType]);

  const navButtons = [
    { icon: FaBed, text: "Stays", href: "/apartments" },
    { icon: FaPlane, text: "Flights", href: "/flights" },
    { icon: FaBuffer, text: "Attractions", href: "/attractions" },
    { icon: FaTaxi, text: "Airport taxis", href: "/taxis" }
  ];

  const isActiveRoute = (href) => {
    if (href === "/" && location.pathname === "/") return true;
    if (href !== "/" && location.pathname.startsWith(href)) return true;
    return false;
  };

  return (
    <>
      <nav className="w-full bg-white shadow-lg border-b border-gray-200">
        {/* Top Bar */}
        <div className="bg-blue-800 text-white py-3 px-4">
          <div className="max-w-7xl mx-auto flex justify-between items-center text-sm">
            <div className="flex items-center space-x-4 lg:space-x-6">
              {isAuthenticated && user?.userType !== 'admin' && (
                <>
                  <Link to="/dashboard" className="hidden sm:inline hover:text-blue-200 cursor-pointer transition-colors font-medium">
                    Dashboard
                  </Link>
                  <Link to="/upload" className="hidden sm:inline hover:text-blue-200 cursor-pointer transition-colors font-medium">
                    List your property
                  </Link>
                </>
              )}
              {isAuthenticated && user?.userType === 'admin' && (
                <Link to="/admin" className="hidden sm:inline hover:text-blue-200 cursor-pointer transition-colors font-medium">
                  Admin Dashboard
                </Link>
              )}
              <span className="hover:text-blue-200 cursor-pointer transition-colors font-medium">
                Customer Support
              </span>
              <span className="hidden lg:inline hover:text-blue-200 cursor-pointer transition-colors font-medium">
                Partner Portal
              </span>
            </div>
            <div className="flex items-center space-x-3 lg:space-x-4">
              <div className="flex items-center space-x-2 hover:text-blue-200 cursor-pointer transition-colors">
                <FaGlobe className="text-sm" />
                <span className="hidden sm:inline">English</span>
              </div>
              <div className="flex items-center space-x-2 hover:text-blue-200 cursor-pointer transition-colors">
                <span className="font-semibold">RWF</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Navigation */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex justify-between items-center">
            {/* Logo */}
            <div className="flex items-center space-x-6 lg:space-x-8">
              <Link
                to="/"
                className="text-xl sm:text-2xl font-bold text-blue-800 hover:text-blue-600 transition-colors cursor-pointer"
              >
                AKWANDA.rw
              </Link>

              {/* Navigation Buttons (hide for admin) */}
              {user?.userType !== 'admin' && (
              <div className="hidden lg:flex items-center space-x-1 bg-gray-100 rounded-full p-1.5">
                {navButtons.map((button, index) => {
                  const IconComponent = button.icon;
                  const isActive = isActiveRoute(button.href);
                  return (
                    <Link
                      key={index}
                      to={button.href}
                      className={`flex items-center space-x-2 px-4 py-2.5 rounded-full transition-all duration-300 ${
                        isActive
                          ? "bg-white text-blue-600 shadow-md scale-105"
                          : "text-gray-600 hover:text-blue-600 hover:bg-gray-200 hover:scale-105"
                      }`}
                    >
                      <IconComponent className="text-sm" />
                      <span className="font-medium text-sm">{button.text}</span>
                    </Link>
                  );
                })}
              </div>
              )}
            </div>

            {/* Right Side */}
            <div className="flex items-center space-x-3 lg:space-x-4">
              {/* Currency Dropdown */}
              <div className="hidden lg:block relative group">
                <button className="flex items-center space-x-1 text-gray-700 hover:text-blue-600 transition-colors px-3 py-2.5 rounded-xl hover:bg-gray-100 font-medium">
                  <span className="font-semibold">RWF</span>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
              </div>

              {/* Notifications */}
              {/* Notifications (admin only) */}
              {user?.userType === 'admin' && (
                <div className="hidden lg:block relative group">
                  <button className="relative p-2.5 text-gray-700 hover:text-blue-600 hover:bg-gray-100 rounded-xl transition-all duration-300 hover:scale-110">
                    <FaBell className="text-lg" />
                    {notifications.filter(n => !n.isRead).length > 0 && (
                      <span className="absolute -top-1 -right-1 bg-green-600 text-white text-xs rounded-full px-1.5">
                        {notifications.filter(n => !n.isRead).length}
                      </span>
                    )}
                  </button>
                  <div className="hidden group-hover:block absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-200 py-2 z-50">
                    <div className="px-4 py-2 border-b border-gray-100 font-semibold">Notifications</div>
                    <div className="max-h-96 overflow-auto">
                      {notifications.map(n => (
                        <div key={n._id} className="px-4 py-3 hover:bg-gray-50">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="font-medium text-gray-900">{n.title}</div>
                              <div className="text-sm text-gray-600">{n.message}</div>
                            </div>
                            {!n.isRead && <span className="ml-2 bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">NEW</span>}
                          </div>
                        </div>
                      ))}
                      {notifications.length === 0 && (
                        <div className="px-4 py-6 text-gray-500 text-sm">No notifications</div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {isAuthenticated && user?.userType !== 'admin' && (
                <div className="hidden lg:block relative group">
                  <button className="relative p-2.5 text-gray-700 hover:text-blue-600 hover:bg-gray-100 rounded-xl transition-all duration-300 hover:scale-110">
                    <FaBell className="text-lg" />
                    {userNotifs.filter(n => !n.isRead).length > 0 && (
                      <span className="absolute -top-1 -right-1 bg-green-600 text-white text-xs rounded-full px-1.5">
                        {userNotifs.filter(n => !n.isRead).length}
                      </span>
                    )}
                  </button>
                  <div className="hidden group-hover:block absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-200 py-2 z-50">
                    <div className="px-4 py-2 border-b border-gray-100 font-semibold">Notifications</div>
                    <div className="max-h-96 overflow-auto">
                      {userNotifs.map(n => (
                        <div key={n._id} className="px-4 py-3 hover:bg-gray-50">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="font-medium text-gray-900">{n.title}</div>
                              <div className="text-sm text-gray-600">{n.message}</div>
                            </div>
                            {!n.isRead && <span className="ml-2 bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">NEW</span>}
                          </div>
                        </div>
                      ))}
                      {userNotifs.length === 0 && (
                        <div className="px-4 py-6 text-gray-500 text-sm">No notifications</div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* User Menu */}
              <div className="flex items-center space-x-3">
                {isAuthenticated ? (
                  <div className="relative">
                    <button
                      onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                      className="flex items-center space-x-3 bg-white hover:bg-gray-50 border border-gray-200 px-4 py-2.5 rounded-xl transition-all duration-300 font-medium hover:shadow-md"
                    >
                      {user?.avatar ? (
                        <img
                          src={user.avatar}
                          alt={user?.name || user?.email}
                          className="w-8 h-8 rounded-full object-cover ring-2 ring-blue-100"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center ring-2 ring-blue-100">
                          <span className="text-sm font-semibold">{(user?.name?.trim?.()?.[0] || user?.email?.trim?.()?.[0] || 'U').toUpperCase()}</span>
                        </div>
                      )}
                      {/* Remove Settings link and name display as requested */}
                      <FaCaretDown className="text-gray-500 text-sm" />
                    </button>

                    {/* User Dropdown Menu */}
                    {isUserMenuOpen && (
                      <div className="absolute right-0 mt-3 w-56 bg-white rounded-2xl shadow-xl border border-gray-200 py-3 z-50">
                        <div className="px-4 py-2 border-b border-gray-100">
                          <p className="text-sm font-medium text-gray-900">
                            {user?.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {user?.email}
                          </p>
                        </div>
                        <Link
                          to={user?.userType === 'admin' ? '/admin' : '/dashboard'}
                          className="flex items-center px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          <FaUser className="mr-3 text-blue-600" />
                          {user?.userType === 'admin' ? 'Admin Dashboard' : 'Dashboard'}
                        </Link>
                        {/* Removed Settings link per requirements */}
                        <hr className="my-2 border-gray-100" />
                        <button
                          onClick={() => {
                            logout();
                            setIsUserMenuOpen(false);
                          }}
                          className="flex items-center w-full px-4 py-3 text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <FaSignOutAlt className="mr-3" />
                          Sign out
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center space-x-3">
                    <Link
                      to="/login"
                      className="flex items-center space-x-2 text-gray-700 hover:text-blue-600 px-4 py-2.5 rounded-xl transition-all duration-300 font-medium hover:bg-blue-50"
                    >
                      <FaUser className="text-sm" />
                      <span className="hidden sm:inline">Sign in</span>
                    </Link>
                    <Link
                      to="/register"
                      className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl transition-all duration-300 font-semibold hover:scale-105 shadow-lg hover:shadow-xl"
                    >
                      <FaUser className="text-sm" />
                      <span className="hidden sm:inline">Sign up</span>
                    </Link>
                  </div>
                )}

                {/* Mobile Menu Button */}
                <button
                  className="lg:hidden p-2.5 text-gray-700 hover:text-blue-600 hover:bg-gray-100 rounded-xl transition-all duration-300 hover:scale-110"
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                >
                  <FaBars className="text-lg" />
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Navigation */}
          {isMenuOpen && (
            <div className="lg:hidden border-t border-gray-200 bg-white">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
                <div className="grid grid-cols-2 gap-3">
                  {navButtons.map((button, index) => {
                    const IconComponent = button.icon;
                    const isActive = isActiveRoute(button.href);
                    return (
                      <Link
                        key={index}
                        to={button.href}
                        className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                          isActive
                            ? "bg-blue-100 text-blue-600 border-2 border-blue-200"
                            : "text-gray-600 hover:text-blue-600 hover:bg-gray-100 border-2 border-transparent"
                        }`}
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <IconComponent className="text-lg" />
                        <span className="font-medium">{button.text}</span>
                      </Link>
                    );
                  })}
                </div>

                {/* Mobile Currency & Notifications */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                  <button className="flex items-center space-x-2 text-gray-700 hover:text-blue-600 transition-colors">
                    <span className="font-medium">RWF</span>
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>
                  <button className="p-2 text-gray-700 hover:text-blue-600 hover:bg-gray-100 rounded-lg transition-colors">
                    <FaBell className="text-lg" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>
    </>
  );
};

export default Navbar;