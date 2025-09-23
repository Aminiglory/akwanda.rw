import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaSearch, FaHandshake, FaCreditCard, FaKey, FaUpload, FaCheckCircle } from 'react-icons/fa';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const HowItWorks = () => {
  const [metrics, setMetrics] = useState({ activeListings: 0, happyGuests: 0, satisfactionRate: 0 });
  useEffect(() => {
    (async () => {
      try {
  const res = await fetch(`${API_URL}/api/metrics/landing`);
  const data = await res.json();
  if (res.ok && data.metrics) setMetrics(data.metrics);
      } catch (_) {}
    })();
  }, []);
  const guestSteps = [
    {
      icon: FaSearch,
      title: "Search & Filter",
      description: "Find the perfect apartment using our advanced search filters",
      step: "1"
    },
    {
      icon: FaHandshake,
      title: "Book & Connect",
      description: "Book your stay and connect directly with the host",
      step: "2"
    },
    {
      icon: FaCreditCard,
      title: "Secure Payment",
      description: "Make secure payments through our platform",
      step: "3"
    },
    {
      icon: FaKey,
      title: "Enjoy Your Stay",
      description: "Check-in and enjoy your comfortable apartment",
      step: "4"
    }
  ];

  const hostSteps = [
    {
      icon: FaUpload,
      title: "List Your Space",
      description: "Upload photos and details of your apartment",
      step: "1"
    },
    {
      icon: FaCheckCircle,
      title: "Get Approved",
      description: "Our team reviews and approves your listing",
      step: "2"
    },
    {
      icon: FaHandshake,
      title: "Receive Bookings",
      description: "Guests book your space and you get notified",
      step: "3"
    },
    {
      icon: FaCreditCard,
      title: "Get Paid",
      description: "Receive payments directly to your account",
      step: "4"
    }
  ];

  const renderSteps = (steps, isGuest = true) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
      {steps.map((step, index) => {
        const IconComponent = step.icon;
        return (
          <div
            key={index}
            className="text-center group"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className="relative mb-6">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto group-hover:bg-blue-600 transition-all duration-300 group-hover:scale-110">
                <IconComponent className="text-blue-600 text-2xl group-hover:text-white transition-colors duration-300" />
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                {step.step}
              </div>
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-3">
              {step.title}
            </h3>
            <p className="text-gray-600 leading-relaxed">
              {step.description}
            </p>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="bg-white py-16 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">
            How AKWANDA.rw Works
          </h2>
          <p className="text-gray-600 text-lg">
            Simple steps for both guests and hosts
          </p>
        </div>

        {/* For Guests */}
        <div className="mb-16">
          <div className="text-center mb-12">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">
              For Guests
            </h3>
            <p className="text-gray-600">
              Find and book the perfect apartment for your stay
            </p>
          </div>
          {renderSteps(guestSteps, true)}
        </div>

        {/* For Hosts */}
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-2xl p-8">
          <div className="text-center mb-12">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">
              For Hosts
            </h3>
            <p className="text-gray-600">
              Turn your apartment into extra income
            </p>
          </div>
          {renderSteps(hostSteps, false)}
          
          <div className="text-center mt-8">
            <Link to="/register" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-semibold transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl inline-block">
              Become a Host
            </Link>
            <p className="text-gray-600 text-sm mt-2">
              Sign up to start listing your apartment
            </p>
          </div>
        </div>

        {/* Stats Section */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center p-6 bg-blue-50 rounded-xl">
            <div className="text-4xl font-bold text-blue-600 mb-2">{metrics.activeListings?.toLocaleString?.() || 0}</div>
            <div className="text-gray-700 font-semibold">Active Listings</div>
          </div>
          <div className="text-center p-6 bg-blue-50 rounded-xl">
            <div className="text-4xl font-bold text-blue-600 mb-2">{metrics.happyGuests?.toLocaleString?.() || 0}</div>
            <div className="text-gray-700 font-semibold">Happy Guests</div>
          </div>
          <div className="text-center p-6 bg-blue-50 rounded-xl">
            <div className="text-4xl font-bold text-blue-600 mb-2">{metrics.satisfactionRate ?? 0}%</div>
            <div className="text-gray-700 font-semibold">Satisfaction Rate</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HowItWorks;
