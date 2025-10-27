import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaEnvelope, FaLock, FaEye, FaEyeSlash } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

const OwnerLogin = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
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
        navigate('/user-dashboard');
      } else if (result.user?.userType === 'admin') {
        // Admins can also manage properties; send them to admin area
        toast.success('Admin access');
        navigate('/admin');
      } else {
        const msg = 'This area is for Property Owners. Please sign in with a host account or upgrade your account.';
        setError(msg);
        toast.error(msg);
      }
    } else {
      const message = result.error || 'Login failed. Please try again.';
      setError(message);
      toast.error(message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Property Owner Login</h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sign in to access your property management dashboard
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div className="relative">
              <label htmlFor="email-address" className="sr-only">Email address</label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-t-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
              />
              <FaEnvelope className="absolute right-3 top-3 text-gray-400" />
            </div>
            <div className="relative">
              <label htmlFor="password" className="sr-only">Password</label>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                className="appearance-none rounded-b-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
              />
              {showPassword ? (
                <FaEyeSlash className="absolute right-3 top-3 text-gray-400 cursor-pointer" onClick={() => setShowPassword(false)} />
              ) : (
                <FaEye className="absolute right-3 top-3 text-gray-400 cursor-pointer" onClick={() => setShowPassword(true)} />
              )}
              <FaLock className="absolute right-9 top-3 text-gray-400" />
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-600">{error}</div>
          )}

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Sign in
            </button>
          </div>
        </form>

        <div className="text-center text-sm text-gray-600">
          Not a host yet? <Link to="/register" className="text-blue-600 hover:text-blue-800 font-medium">Create an account</Link>
        </div>
      </div>
    </div>
  );
};

export default OwnerLogin;
