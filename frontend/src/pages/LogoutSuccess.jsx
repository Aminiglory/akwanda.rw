import React from 'react';
import { Link } from 'react-router-dom';
import { FaCheckCircle } from 'react-icons/fa';

const LogoutSuccess = () => {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mb-4">
          <FaCheckCircle className="text-3xl text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">You have been logged out</h1>
        <p className="text-gray-600 mb-6">Thanks for visiting. You can continue browsing or sign in again anytime.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/" className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">Go to Home</Link>
          <Link to="/login" className="px-4 py-2 rounded-lg bg-gray-100 text-gray-800 hover:bg-gray-200">Sign In</Link>
        </div>
      </div>
    </div>
  );
};

export default LogoutSuccess;
