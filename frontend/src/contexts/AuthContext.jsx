import React, { createContext, useContext, useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const AuthContext = createContext();

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    return {
      user: null,
      isLoading: false,
      login: async () => ({ success: false, error: 'Auth not ready' }),
      register: async () => ({ success: false, error: 'Auth not ready' }),
      logout: async () => {},
      updateAvatar: async () => { throw new Error('Auth not ready'); },
      updateProfile: async () => { throw new Error('Auth not ready'); },
      refreshUser: async () => null,
      isAuthenticated: false
    };
  }
  return context;
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const makeAbsolute = (u) => {
    if (!u) return u;
    const s = String(u).replace(/\\+/g, '/');
    if (s.startsWith('http')) return s;
    return `${API_URL}${s.startsWith('/') ? s : '/' + s}`;
  };

  useEffect(() => {
    // Try restore from localStorage immediately for fast paint
    const savedUser = localStorage.getItem('user');
    if (savedUser) setUser(JSON.parse(savedUser));
    // Then verify with backend
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/auth/me`, { credentials: 'include' });
        const data = await res.json();
        if (res.ok && data.user) {
          const normalized = { ...data.user, avatar: makeAbsolute(data.user.avatar) };
          setUser(normalized);
          localStorage.setItem('user', JSON.stringify(normalized));
        } else if (!res.ok) {
          setUser(null);
          localStorage.removeItem('user');
        }
      } catch (_) {
        // network issues: keep local state
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = async (email, password) => {
    try {
      setIsLoading(true);
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Login failed');
      const normalized = { ...data.user, avatar: makeAbsolute(data.user.avatar) };
      setUser(normalized);
      localStorage.setItem('user', JSON.stringify(normalized));
      return { success: true, user: data.user };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData) => {
    try {
      setIsLoading(true);
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(userData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Registration failed');
      setUser(data.user);
      localStorage.setItem('user', JSON.stringify(data.user));
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await fetch(`${API_URL}/api/auth/logout`, { method: 'POST', credentials: 'include' });
    } catch (e) { /* ignore */ }
    setUser(null);
    localStorage.removeItem('user');
  };

  const updateAvatar = async (file, isAdmin = false) => {
    const body = new FormData();
    body.append('avatar', file);
    const endpoint = isAdmin ? `${API_URL}/api/admin/me/avatar` : `${API_URL}/api/user/me/avatar`;
    const res = await fetch(endpoint, { method: 'POST', credentials: 'include', body });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to update avatar');
    const updated = { ...(user || {}), avatar: makeAbsolute(data.user?.avatar) };
    setUser(updated);
    localStorage.setItem('user', JSON.stringify(updated));
    return updated;
  };

  const updateProfile = async (payload) => {
    const res = await fetch(`${API_URL}/api/user/me`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to update profile');
    const normalized = { ...data.user, avatar: makeAbsolute(data.user.avatar) };
    setUser(normalized);
    localStorage.setItem('user', JSON.stringify(normalized));
    return normalized;
  };

  const refreshUser = async () => {
    try {
      const res = await fetch(`${API_URL}/api/auth/me`, { credentials: 'include' });
      const data = await res.json();
      if (res.ok && data.user) {
        const normalized = { ...data.user, avatar: makeAbsolute(data.user.avatar) };
        setUser(normalized);
        localStorage.setItem('user', JSON.stringify(normalized));
        return normalized;
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
    return null;
  };

  const value = {
    user,
    isLoading,
    login,
    register,
    logout,
    updateAvatar,
    updateProfile,
    refreshUser,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
