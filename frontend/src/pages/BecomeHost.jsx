import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaBuilding, FaArrowRight } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const BecomeHost = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  const handleBecomeHost = async () => {
    setIsLoading(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const response = await fetch(`${API_URL}/api/user/become-host`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (response.ok) {
        toast.success('Congratulations! You are now a property owner!');
        await refreshUser(); // Refresh user data to get updated userType
        navigate('/upload-property'); // Redirect to step-based property listing wizard
      } else {
        toast.error(data.message || 'Failed to upgrade account');
      }
    } catch (error) {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="mx-auto h-16 w-16 bg-blue-600 rounded-full flex items-center justify-center mb-5">
            <FaBuilding className="text-white text-2xl" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Become a Property Owner</h1>
          <p className="text-gray-600 mb-8">
            Hello {user?.firstName}! Upgrade your account to start listing your property.
          </p>
          <button
            onClick={handleBecomeHost}
            disabled={isLoading}
            className="inline-flex items-center px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white text-lg font-semibold rounded-xl transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                Upgrading Account...
              </>
            ) : (
              <>
                Become a Property Owner
                <FaArrowRight className="ml-3" />
              </>
            )}
          </button>
          
          <p className="text-sm text-gray-500 mt-4">
            By clicking above, you agree to our Property Owner Terms and Conditions
          </p>
        </div>
      </div>
    </div>
  );
};

export default BecomeHost;
