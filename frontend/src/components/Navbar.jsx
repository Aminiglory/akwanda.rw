import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { FaBed, FaPlane, FaBuffer, FaTaxi, FaGlobe, FaUser, FaBell, FaBars, FaCaretDown, FaSignOutAlt, FaCog } from "react-icons/fa";
import { useAuth } from "../contexts/AuthContext";

const Navbar = () => {
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const { user, logout, isAuthenticated } = useAuth();

  const navButtons = [
    { icon: FaBed, text: "Apartments", href: "/apartments", active: true },
    { icon: FaPlane, text: "Flights", href: "/flights", active: false },
    { icon: FaBuffer, text: "Attractions", href: "/attractions", active: false },
    { icon: FaTaxi, text: "Airport taxis", href: "/taxis", active: false }
  ];

  const isActiveRoute = (href) => {
    if (href === "/" && location.pathname === "/") return true;
    if (href !== "/" && location.pathname.startsWith(href)) return true;
    return false;
  };

  return (
    <nav className="w-full bg-white shadow-lg border-b border-gray-200">
      {/* Top Bar */}
      <div className="bg-blue-800 text-white py-2 px-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center text-sm">
          <div className="flex items-center space-x-6">
            <span className="hover:text-blue-200 cursor-pointer transition-colors">List your property</span>
            <span className="hover:text-blue-200 cursor-pointer transition-colors">Customer Support</span>
            <span className="hover:text-blue-200 cursor-pointer transition-colors">Partner Portal</span>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 hover:text-blue-200 cursor-pointer transition-colors">
              <FaGlobe className="text-sm" />
              <span>English</span>
            </div>
            <div className="flex items-center space-x-2 hover:text-blue-200 cursor-pointer transition-colors">
              <span>RWF</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <div className="flex items-center space-x-8">
            <Link to="/" className="text-2xl font-bold text-blue-800 hover:text-blue-600 transition-colors cursor-pointer">
              AKWANDA.rw
            </Link>
            
            {/* Navigation Buttons */}
            <div className="hidden lg:flex items-center space-x-1 bg-gray-100 rounded-full p-1">
              {navButtons.map((button, index) => {
                const IconComponent = button.icon;
                const isActive = isActiveRoute(button.href);
                return (
                  <Link
                    key={index}
                    to={button.href}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-full transition-all duration-300 ${
                      isActive
                        ? 'bg-white text-blue-600 shadow-md'
                        : 'text-gray-600 hover:text-blue-600 hover:bg-gray-200'
                    }`}
                  >
                    <IconComponent className="text-sm" />
                    <span className="font-medium">{button.text}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Right Side */}
          <div className="flex items-center space-x-4">
            {/* Currency Dropdown */}
            <div className="hidden md:block relative group">
              <button className="flex items-center space-x-1 text-gray-700 hover:text-blue-600 transition-colors px-3 py-2 rounded-lg hover:bg-gray-100">
                <span className="font-medium">RWF</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
        </button>
            </div>

            {/* Notifications */}
            <button className="hidden md:block p-2 text-gray-700 hover:text-blue-600 hover:bg-gray-100 rounded-lg transition-colors">
              <FaBell className="text-lg" />
        </button>

            {/* User Menu */}
            <div className="flex items-center space-x-2">
              {isAuthenticated ? (
                <div className="relative">
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center space-x-2 bg-white hover:bg-gray-50 border border-gray-200 px-4 py-2 rounded-lg transition-colors font-medium"
                  >
                    <img
                      src={user?.avatar}
                      alt={user?.name}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                    <span className="hidden sm:inline text-gray-700">{user?.name?.split(' ')[0]}</span>
                    <FaCaretDown className="text-gray-500" />
                  </button>

                  {/* User Dropdown Menu */}
                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
                      <Link
                        to="/dashboard"
                        className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        <FaUser className="mr-3" />
                        Dashboard
                      </Link>
                      <Link
                        to="/profile"
                        className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        <FaCog className="mr-3" />
                        Settings
                      </Link>
                      <hr className="my-2" />
                      <button
                        onClick={() => {
                          logout();
                          setIsUserMenuOpen(false);
                        }}
                        className="flex items-center w-full px-4 py-2 text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <FaSignOutAlt className="mr-3" />
                        Sign out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  to="/login"
                  className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
                >
                  <FaUser className="text-sm" />
                  <span className="hidden sm:inline">Sign in</span>
                </Link>
              )}
              
              {/* Mobile Menu Button */}
              <button 
                className="lg:hidden p-2 text-gray-700 hover:text-blue-600 hover:bg-gray-100 rounded-lg transition-colors"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                <FaBars className="text-lg" />
        </button>
      </div>
    </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="lg:hidden mt-4 pb-4 border-t border-gray-200">
            <div className="flex flex-wrap gap-2 mt-4">
              {navButtons.map((button, index) => {
                const IconComponent = button.icon;
                const isActive = isActiveRoute(button.href);
                return (
                  <Link
                    key={index}
                    to={button.href}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-300 ${
                      isActive
                        ? 'bg-blue-100 text-blue-600'
                        : 'text-gray-600 hover:text-blue-600 hover:bg-gray-100'
                    }`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <IconComponent className="text-sm" />
                    <span className="font-medium">{button.text}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
