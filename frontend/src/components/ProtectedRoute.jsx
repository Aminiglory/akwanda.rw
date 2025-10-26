import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();
  if (isLoading) {
    return (
      <div className="w-full h-screen bg-gradient-to-br from-blue-800 to-blue-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg animate-pulse">Checking your session...</p>
        </div>
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  // Blocked account global guard: only allow notifications and commission payment routes
  if (user?.isBlocked) {
    const allowed = [
      '/notifications',
      '/billing/pay-commission',
      '/payment/mtn-mobile-money',
      '/logout-success'
    ];
    const path = location.pathname || '';
    const isAllowed = allowed.some(a => path.startsWith(a));
    if (!isAllowed) return <Navigate to="/billing/pay-commission" replace />;
  }
  return children;
};

export const AdminRoute = ({ children }) => {
  const { isAuthenticated, user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="w-full h-screen bg-gradient-to-br from-blue-800 to-blue-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg animate-pulse">Checking admin access...</p>
        </div>
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.userType !== 'admin') return <Navigate to="/" replace />;
  // Blocked account global guard: only allow notifications and commission payment routes
  if (user?.isBlocked) {
    const allowed = [
      '/notifications',
      '/billing/pay-commission',
      '/payment/mtn-mobile-money',
      '/logout-success'
    ];
    const path = window.location.pathname || '';
    const isAllowed = allowed.some(a => path.startsWith(a));
    if (!isAllowed) return <Navigate to="/billing/pay-commission" replace />;
  }
  return children;
};
