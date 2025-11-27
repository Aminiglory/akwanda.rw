import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import EnhancedUploadProperty from './EnhancedUploadProperty';
import { FaCar, FaPlane } from 'react-icons/fa';

const ListProperty = () => {
  const navigate = useNavigate();
  const [listingType, setListingType] = useState('stay'); // 'stay' | 'rental' | 'attraction' | 'flight'

  const renderListingTypeSelector = () => (
    <div className="mb-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-2">What would you like to list?</h2>
      <p className="text-sm text-gray-600 mb-4">
        Choose the type of listing you want to create. Stays, rentals, attractions and flights each have their own flow.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { id: 'stay', label: 'Stay', desc: 'Apartments, hotels, homes', color: 'from-blue-500 to-blue-600' },
          { id: 'rental', label: 'Rental', desc: 'Cars & vehicles', color: 'from-green-500 to-green-600' },
          { id: 'attraction', label: 'Attraction', desc: 'Tours & activities', color: 'from-purple-500 to-purple-600' },
          { id: 'flight', label: 'Flight', desc: 'Flight services', color: 'from-indigo-500 to-indigo-600' },
        ].map((type) => (
          <button
            key={type.id}
            type="button"
            onClick={() => setListingType(type.id)}
            className={`relative rounded-xl p-3 text-left text-sm border transition-all duration-200
              ${listingType === type.id
                ? 'border-blue-600 bg-blue-50 shadow-sm'
                : 'border-gray-200 hover:border-blue-400 hover:bg-gray-50'}`}
          >
            <div className={`w-8 h-8 mb-2 rounded-lg bg-gradient-to-br ${type.color} flex items-center justify-center text-white text-xs font-semibold`}>
              {type.label[0]}
            </div>
            <div className="font-semibold text-gray-900 text-sm">{type.label}</div>
            <div className="text-xs text-gray-500 mt-1">{type.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );

  const renderNonStayContent = () => {
    if (listingType === 'rental') {
      return (
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-2xl font-bold mb-2">List a vehicle rental</h2>
          <p className="text-gray-600 mb-4 text-sm">
            Vehicle listings are managed from the vehicles dashboard, where you can add cars, set prices, and manage bookings.
          </p>
          <button
            type="button"
            onClick={() => navigate('/owner/cars')}
            className="inline-flex items-center px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            Go to vehicles dashboard
          </button>
        </div>
      );
    }

    if (listingType === 'attraction') {
      return (
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-2xl font-bold mb-2">List an attraction</h2>
          <p className="text-gray-600 mb-4 text-sm">
            Use the attractions dashboard to create tours, experiences and activities, configure pricing, and manage reservations.
          </p>
          <button
            type="button"
            onClick={() => navigate('/owner/attractions')}
            className="inline-flex items-center px-5 py-2.5 rounded-lg bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 transition-colors"
          >
            Go to attractions dashboard
          </button>
        </div>
      );
    }

    if (listingType === 'flight') {
      return (
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-2xl font-bold mb-2">List flights</h2>
          <p className="text-gray-600 mb-4 text-sm">
            Flight listing is handled from the flights workspace. Use the flights section to manage flight-related services.
          </p>
          <button
            type="button"
            onClick={() => navigate('/flights')}
            className="inline-flex items-center px-5 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors"
          >
            Go to flights
          </button>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">List your property</h1>
          <p className="text-gray-600">Choose what you want to list, then follow the steps to publish it on AKWANDA.rw.</p>
        </div>

        {renderListingTypeSelector()}

        {listingType === 'stay' ? (
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <EnhancedUploadProperty />
          </div>
        ) : (
          renderNonStayContent()
        )}
      </div>
    </div>
  );
};

export default ListProperty;
