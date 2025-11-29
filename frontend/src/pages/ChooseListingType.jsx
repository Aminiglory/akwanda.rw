import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaHome, FaCar, FaMountain, FaPlane } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';

const ChooseListingType = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const listingTypes = [
    {
      id: 'property',
      title: 'List a Property',
      description: 'Rent out apartments, houses, or rooms to guests',
      icon: FaHome,
      color: 'from-blue-500 to-blue-600',
      hoverColor: 'hover:from-blue-600 hover:to-blue-700',
      route: '/upload',
      available: true
    },
    {
      id: 'vehicle',
      title: 'List a Vehicle',
      description: 'Rent out cars, motorcycles, or bicycles',
      icon: FaCar,
      color: 'from-green-500 to-green-600',
      hoverColor: 'hover:from-green-600 hover:to-green-700',
      route: '/owner/cars',
      available: true
    },
    {
      id: 'attraction',
      title: 'List an Attraction',
      description: 'Offer tours, experiences, and local attractions',
      icon: FaMountain,
      color: 'from-purple-500 to-purple-600',
      hoverColor: 'hover:from-purple-600 hover:to-purple-700',
      route: '/owner/attractions',
      available: true
    },
    {
      id: 'flight',
      title: 'List Flights',
      description: 'Offer flight bookings and travel services',
      icon: FaPlane,
      color: 'from-indigo-500 to-indigo-600',
      hoverColor: 'hover:from-indigo-600 hover:to-indigo-700',
      route: '/flights',
      available: true
    }
  ];

  const handleSelect = (type) => {
    if (!type.available) return;
    navigate(type.route);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="mx-auto h-16 w-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg mb-6">
            <span className="text-white text-2xl font-bold">A</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            What would you like to list?
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Choose what you want to offer on AKWANDA.rw. You can always add more listings later.
          </p>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {listingTypes.slice(0, 1).map((type) => {
            const Icon = type.icon;
            return (
              <button
                key={type.id}
                onClick={() => handleSelect(type)}
                disabled={!type.available}
                className={`
                  group relative overflow-hidden rounded-2xl bg-white shadow-lg
                  border-2 border-transparent hover:border-gray-200
                  transition-all duration-300 transform hover:scale-105 hover:shadow-2xl
                  ${!type.available ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                {/* Gradient Background */}
                <div className={`absolute inset-0 bg-gradient-to-br ${type.color} ${type.hoverColor} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
                
                <div className="relative p-8">
                  {/* Icon */}
                  <div className={`
                    w-16 h-16 rounded-xl bg-gradient-to-br ${type.color} 
                    flex items-center justify-center mb-6 shadow-md
                    group-hover:scale-110 transition-transform duration-300
                  `}>
                    <Icon className="text-white text-2xl" />
                  </div>

                  {/* Content */}
                  <h3 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-gray-800 transition-colors">
                    {type.title}
                  </h3>
                  <p className="text-gray-600 text-base leading-relaxed mb-6">
                    {type.description}
                  </p>

                  {/* Arrow */}
                  <div className="flex items-center text-gray-400 group-hover:text-gray-600 transition-colors">
                    <span className="text-sm font-medium mr-2">Get started</span>
                    <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Skip / Do it later Option */}
        <div className="text-center">
          <button
            onClick={() => navigate('/apartments')}
            className="text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors"
          >
            Do it later, browse properties
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChooseListingType;

