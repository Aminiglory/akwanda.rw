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
    // Try restore from storage immediately for fast paint
    const sessionUser = sessionStorage.getItem('user');
    const localUser = localStorage.getItem('user');
    const savedUser = sessionUser || localUser;
    if (savedUser) setUser(JSON.parse(savedUser));

    // Then verify with backend using whichever token is present
    (async () => {
      try {
        const token = sessionStorage.getItem('token') || localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await fetch(`${API_URL}/api/auth/me`, { credentials: 'include', headers });
        const data = await res.json();
        if (res.ok && data.user) {
          const normalized = { ...data.user, avatar: makeAbsolute(data.user.avatar) };
          setUser(normalized);
          // Persist back into whichever storage already had a user, defaulting to localStorage
          const targetStorage = sessionUser ? sessionStorage : localStorage;
          targetStorage.setItem('user', JSON.stringify(normalized));
        } else if (!res.ok) {
          setUser(null);
          sessionStorage.removeItem('user');
          sessionStorage.removeItem('token');
          localStorage.removeItem('user');
          localStorage.removeItem('token');
        }
      } catch (_) {
        // network issues: keep local state
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = async (email, password, remember = true) => {
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
      // Clear any previous auth data
      sessionStorage.removeItem('user');
      sessionStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('token');

      const storage = remember ? localStorage : sessionStorage;
      storage.setItem('user', JSON.stringify(normalized));
      if (data.token) storage.setItem('token', data.token);
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
      if (data.token) localStorage.setItem('token', data.token);
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
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('token');
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
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(`${API_URL}/api/auth/me`, { credentials: 'include', headers });
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
