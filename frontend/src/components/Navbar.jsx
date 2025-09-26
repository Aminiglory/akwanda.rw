import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  FaBed,
  FaPlane,
  FaBuffer,
  FaTaxi,
  FaGlobe,
  FaUser,
  FaBell,
  FaBars,
  FaCaretDown,
  FaSignOutAlt,
  FaTimes,
} from "react-icons/fa";
import { useAuth } from "../contexts/AuthContext";

const Navbar = () => {
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const { user, logout, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [userNotifs, setUserNotifs] = useState([]);
  const [showAllUserNotifs, setShowAllUserNotifs] = useState(false);
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

  useEffect(() => {
    if (user?.userType === "admin") {
      (async () => {
        try {
          const res = await fetch(`${API_URL}/api/admin/notifications`, {
            credentials: "include",
          });
          const data = await res.json();
          if (res.ok) setNotifications(data.notifications || []);
        } catch (_) {}
      })();
    }
  }, [user?.userType]);

  useEffect(() => {
    if (isAuthenticated && user?.userType !== "admin") {
      (async () => {
        try {
          const res = await fetch(`${API_URL}/api/user/notifications`, {
            credentials: "include",
          });
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
    { icon: FaTaxi, text: "Airport taxis", href: "/taxis" },
  ];

  const isActiveRoute = (href) => {
    if (href === "/" && location.pathname === "/") return true;
    if (href !== "/" && location.pathname.startsWith(href)) return true;
    return false;
  };

  // Group notifications by category
  const groupByCategory = (notifs) => {
    return notifs.reduce((acc, n) => {
      const cat = n.category || "General";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(n);
      return acc;
    }, {});
  };

  return (
    <>
      <nav className="w-full bg-white shadow-lg border-b border-gray-200 relative">
        {/* Top Bar */}
        <div className="bg-blue-800 text-white py-3 px-4">
          <div className="max-w-7xl mx-auto flex justify-between items-center text-sm">
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
              <span className="hover:text-blue-200 cursor-pointer font-medium">
                Customer Support
              </span>
              <span className="hidden lg:inline hover:text-blue-200 cursor-pointer font-medium">
                Partner Portal
              </span>
            </div>
            <div className="flex items-center space-x-3 lg:space-x-4">
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

        {/* Main Navigation */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex justify-between items-center">
            {/* Logo */}
            <div className="flex items-center space-x-6 lg:space-x-8">
              <Link
                to="/"
                className="text-xl sm:text-2xl font-bold text-blue-800 hover:text-blue-600"
              >
                AKWANDA.rw
              </Link>

              {/* Nav Buttons (desktop) */}
              {user?.userType !== "admin" && (
                <div className="hidden lg:flex items-center space-x-1 bg-gray-100 rounded-full p-1.5">
                  {navButtons.map((button, index) => {
                    const Icon = button.icon;
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
                        <Icon className="text-sm" />
                        <span className="font-medium text-sm">
                          {button.text}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right Side */}
            <div className="flex items-center space-x-3 lg:space-x-4">
              {/* Notifications (admin only) */}
              {user?.userType === "admin" && (
                <div className="hidden lg:block relative group">
                  <button className="relative p-2.5 text-gray-700 hover:text-blue-600 hover:bg-gray-100 rounded-xl">
                    <FaBell className="text-lg" />
                    {notifications.filter((n) => !n.isRead).length > 0 && (
                      <span className="absolute -top-1 -right-1 bg-green-600 text-white text-xs rounded-full px-1.5">
                        {notifications.filter((n) => !n.isRead).length}
                      </span>
                    )}
                  </button>
                  <div className="hidden group-hover:block absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-200 py-2 z-50">
                    <div className="px-4 py-2 border-b border-gray-100 font-semibold">
                      Notifications
                    </div>
                    <div className="max-h-96 overflow-auto">
                      {Object.entries(groupByCategory(notifications)).map(
                        ([category, notifs]) => (
                          <div key={category} className="mb-3">
                            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                              {category}
                            </div>
                            {notifs.map((n) => (
                              <div
                                key={n._id}
                                className="px-4 py-3 hover:bg-gray-50"
                              >
                                <div className="flex items-start justify-between">
                                  <div>
                                    <div className="font-medium text-gray-900">
                                      {n.title}
                                    </div>
                                    <div className="text-sm text-gray-600">
                                      {n.message}
                                    </div>
                                    <div className="text-xs text-gray-400 mt-1">
                                      {n.createdAt
                                        ? new Date(
                                            n.createdAt
                                          ).toLocaleString()
                                        : ""}
                                    </div>
                                  </div>
                                  {!n.isRead && (
                                    <span className="ml-2 bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">
                                      NEW
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )
                      )}
                      {notifications.length === 0 && (
                        <div className="px-4 py-6 text-gray-500 text-sm">
                          No notifications
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Notifications (user only) */}
              {isAuthenticated && user?.userType !== "admin" && (
                <div className="hidden lg:block relative group">
                  <button className="relative p-2.5 text-gray-700 hover:text-blue-600 hover:bg-gray-100 rounded-xl">
                    <FaBell className="text-lg" />
                    {userNotifs.filter((n) => !n.isRead).length > 0 && (
                      <span className="absolute -top-1 -right-1 bg-green-600 text-white text-xs rounded-full px-1.5">
                        {userNotifs.filter((n) => !n.isRead).length}
                      </span>
                    )}
                  </button>
                  <div className="hidden group-hover:block absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-200 py-2 z-50">
                    <div className="px-4 py-2 border-b border-gray-100 font-semibold">
                      Notifications
                    </div>
                    <div className="max-h-96 overflow-auto">
                      {(() => {
                        const sortedNotifs = [...userNotifs].sort(
                          (a, b) =>
                            new Date(b.createdAt || b.timestamp) -
                            new Date(a.createdAt || a.timestamp)
                        );
                        const displayNotifs = showAllUserNotifs
                          ? sortedNotifs
                          : sortedNotifs.slice(0, 5);
                        return Object.entries(
                          groupByCategory(displayNotifs)
                        ).map(([category, notifs]) => (
                          <div key={category} className="mb-3">
                            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                              {category}
                            </div>
                            {notifs.map((n) => (
                              <div
                                key={n._id}
                                className="px-4 py-3 hover:bg-gray-50"
                              >
                                <div className="flex items-start justify-between">
                                  <div>
                                    <div className="font-medium text-gray-900">
                                      {n.title}
                                    </div>
                                    <div className="text-sm text-gray-600">
                                      {n.message}
                                    </div>
                                    <div className="text-xs text-gray-400 mt-1">
                                      {n.createdAt
                                        ? new Date(
                                            n.createdAt
                                          ).toLocaleString()
                                        : ""}
                                    </div>
                                  </div>
                                  {!n.isRead && (
                                    <span className="ml-2 bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">
                                      NEW
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ));
                      })()}
                      {userNotifs.length === 0 && (
                        <div className="px-4 py-6 text-gray-500 text-sm">
                          No notifications
                        </div>
                      )}
                      {userNotifs.length > 5 && (
                        <button
                          className="w-full mt-2 px-4 py-2 bg-blue-600 text-white rounded-full text-sm"
                          onClick={() => setShowAllUserNotifs((s) => !s)}
                        >
                          {showAllUserNotifs ? "Show Less" : "Show More"}
                        </button>
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
                      className="flex items-center space-x-3 bg-white hover:bg-gray-50 border border-gray-200 px-4 py-2.5 rounded-xl font-medium"
                    >
                      {user?.avatar ? (
                        <img
                          src={user.avatar}
                          alt={user?.name || user?.email}
                          className="w-8 h-8 rounded-full object-cover ring-2 ring-blue-100"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center ring-2 ring-blue-100">
                          <span className="text-sm font-semibold">
                            {(
                              user?.name?.trim?.()?.[0] ||
                              user?.email?.trim?.()?.[0] ||
                              "U"
                            ).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <FaCaretDown className="text-gray-500 text-sm" />
                    </button>

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
                          to={
                            user?.userType === "admin" ? "/admin" : "/dashboard"
                          }
                          className="flex items-center px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-700"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          <FaUser className="mr-3 text-blue-600" />
                          {user?.userType === "admin"
                            ? "Admin Dashboard"
                            : "Dashboard"}
                        </Link>
                        <hr className="my-2 border-gray-100" />
                        <button
                          onClick={() => {
                            logout();
                            setIsUserMenuOpen(false);
                          }}
                          className="flex items-center w-full px-4 py-3 text-red-600 hover:bg-red-50"
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
                      className="flex items-center space-x-2 text-gray-700 hover:text-blue-600 px-4 py-2.5 rounded-xl font-medium hover:bg-blue-50"
                    >
                      <FaUser className="text-sm" />
                      <span className="hidden sm:inline">Sign in</span>
                    </Link>
                    <Link
                      to="/register"
                      className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-semibold hover:scale-105 shadow-lg"
                    >
                      <FaUser className="text-sm" />
                      <span className="hidden sm:inline">Sign up</span>
                    </Link>
                  </div>
                )}

                {/* Hamburger Button */}
                <button
                  className="lg:hidden p-2.5 text-gray-700 hover:text-blue-600 hover:bg-gray-100 rounded-xl"
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                >
                  {isMenuOpen ? (
                    <FaTimes className="text-lg" />
                  ) : (
                    <FaBars className="text-lg" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="lg:hidden absolute w-full bg-white shadow-md border-t border-gray-200 py-4 z-50">
            <div className="flex flex-col space-y-4 px-6">
              {navButtons.map((button, i) => (
                <Link
                  key={i}
                  to={button.href}
                  className={`flex items-center space-x-3 px-4 py-2 rounded-xl ${
                    isActiveRoute(button.href)
                      ? "bg-blue-50 text-blue-600 font-medium"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  <button.icon className="text-sm" />
                  <span>{button.text}</span>
                </Link>
              ))}

              {!isAuthenticated && (
                <>
                  <Link
                    to="/login"
                    className="px-4 py-2 text-gray-700 hover:text-blue-600"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Sign in
                  </Link>
                  <Link
                    to="/register"
                    className="px-4 py-2 bg-blue-600 text-white rounded-xl text-center"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Sign up
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
