import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaEnvelope, FaLock, FaEye, FaEyeSlash } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { useLocale } from '../contexts/LocaleContext';

const OwnerLogin = () => {
  const { login, logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useLocale() || {};
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({ email: '', password: '' });

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const result = await login(formData.email, formData.password);
    if (result.success) {
      if (result.user?.userType === 'host') {
        toast.success('Welcome to your Property Dashboard');
        navigate('/group-home');
      } else if (result.user?.userType === 'admin') {
        // Admins can also manage properties
        toast.success('Admin access granted');
        navigate('/admin');
      } else if (result.user?.userType === 'worker') {
        // Workers have limited access based on privileges
        toast.success('Worker access granted');
        navigate('/worker/dashboard');
      } else {
        // Regular guest trying to access owner portal
        const msg = 'This login is for Property Owners only. Please use the regular login or upgrade your account to become a property owner.';
        setError(msg);
        toast.error(msg);
        await logout();
      }
    } else {
      const message = result.error || 'Login failed. Please try again.';
      setError(message);
      toast.error(message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 flex items-center justify-center py-10 px-4">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="hidden lg:flex flex-col justify-center rounded-2xl bg-white/60 border border-blue-100 p-8">
          <h1 className="text-3xl font-extrabold text-gray-900">{t ? t('auth.ownerLoginTitle') : 'Property Owner Login'}</h1>
          <p className="mt-2 text-gray-600">{t ? t('auth.ownerLoginSubtitle') : 'Sign in to access your owner dashboard'}</p>
          <ul className="mt-6 space-y-3 text-sm text-gray-700">
            <li className="flex items-start gap-2"><span className="mt-1 h-2 w-2 rounded-full bg-blue-600"></span> Real-time bookings overview</li>
            <li className="flex items-start gap-2"><span className="mt-1 h-2 w-2 rounded-full bg-blue-600"></span> Easy listing management</li>
            <li className="flex items-start gap-2"><span className="mt-1 h-2 w-2 rounded-full bg-blue-600"></span> Finance insights and payouts</li>
          </ul>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-blue-100 p-6 sm:p-8">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center">
              <span className="text-blue-700 font-extrabold">AK</span>
            </div>
            <h2 className="mt-4 text-2xl font-bold text-gray-900">{t ? t('auth.ownerLoginTitle') : 'Property Owner Login'}</h2>
            <p className="mt-1 text-sm text-gray-600">{t ? t('auth.ownerLoginSubtitle') : 'Sign in to access your owner dashboard'}</p>
          </div>

          <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div className="relative">
                <label htmlFor="email-address" className="sr-only">{t ? t('auth.email') : 'Email address'}</label>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="peer block w-full rounded-lg border border-gray-300 bg-white pl-3 pr-10 py-2.5 text-gray-900 placeholder-transparent focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  placeholder={t ? t('auth.email') : 'Email address'}
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  aria-label="Email address"
                />
                <span className="pointer-events-none absolute left-3 top-2.5 text-gray-500 text-sm transition-all bg-white px-1
                  peer-placeholder-shown:top-2.5 peer-placeholder-shown:text-sm
                  peer-focus:-top-2 peer-focus:text-xs peer-focus:text-blue-700
                  peer-[:not(:placeholder-shown)]:-top-2 peer-[:not(:placeholder-shown)]:text-xs">
                  Email address
                </span>
                <FaEnvelope className="absolute right-3 top-3.5 text-gray-400" />
              </div>

              <div className="relative">
                <label htmlFor="password" className="sr-only">{t ? t('auth.password') : 'Password'}</label>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  className="peer block w-full rounded-lg border border-gray-300 bg-white pl-3 pr-16 py-2.5 text-gray-900 placeholder-transparent focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  placeholder={t ? t('auth.password') : 'Password'}
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  aria-label="Password"
                />
                <span className="pointer-events-none absolute left-3 top-2.5 text-gray-500 text-sm transition-all bg-white px-1
                  peer-placeholder-shown:top-2.5 peer-placeholder-shown:text-sm
                  peer-focus:-top-2 peer-focus:text-xs peer-focus:text-blue-700
                  peer-[:not(:placeholder-shown)]:-top-2 peer-[:not(:placeholder-shown)]:text-xs">
                  Password
                </span>
                {showPassword ? (
                  <FaEyeSlash className="absolute right-3 top-3.5 text-gray-400 cursor-pointer" onClick={() => setShowPassword(false)} />
                ) : (
                  <FaEye className="absolute right-3 top-3.5 text-gray-400 cursor-pointer" onClick={() => setShowPassword(true)} />
                )}
                <FaLock className="absolute right-10 top-3.5 text-gray-400" />
              </div>
            </div>

            {error && (
              <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>
            )}

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                <span className="text-gray-700">{t ? t('auth.rememberMe') : 'Remember me'}</span>
              </label>
              <Link to="/reset-password" className="text-blue-700 hover:text-blue-900">{t ? t('auth.forgotPassword') : 'Forgot password?'}</Link>
            </div>

            <button
              type="submit"
              className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-white font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              {t ? t('auth.signIn') : 'Sign in'}
            </button>

            <div className="text-center text-sm text-gray-600">
              {t ? t('auth.notHostYet') : 'Not a host yet?'} <Link to="/register" className="text-blue-700 hover:text-blue-900 font-medium">{t ? t('auth.createAccount') : 'Create an account'}</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default OwnerLogin;
