import React, { useState } from 'react';
import { FaMapMarkerAlt, FaCalendarAlt, FaUser, FaSearch } from 'react-icons/fa';

const SearchSection = () => {
  const [searchData, setSearchData] = useState({
    location: '',
    checkIn: '',
    checkOut: '',
    guests: 1
  });

  const handleSearch = (e) => {
    e.preventDefault();
    console.log('Search data:', searchData);
    // This will be connected to backend later
  };

  const handleInputChange = (field, value) => {
    setSearchData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="bg-white py-16 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">
            Find Your Perfect Apartment
          </h2>
          <p className="text-gray-600 text-lg">
            Discover amazing apartments for rent across Rwanda
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-100">
          <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Location */}
            <div className="relative">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Location
              </label>
              <div className="relative">
                <FaMapMarkerAlt className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-600" />
                <input
                  type="text"
                  placeholder="Where are you going?"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                  value={searchData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                />
              </div>
            </div>

            {/* Check-in */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Check-in
              </label>
              <div className="relative">
                <FaCalendarAlt className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-600" />
                <input
                  type="date"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                  value={searchData.checkIn}
                  onChange={(e) => handleInputChange('checkIn', e.target.value)}
                />
              </div>
            </div>

            {/* Check-out */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Check-out
              </label>
              <div className="relative">
                <FaCalendarAlt className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-600" />
                <input
                  type="date"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                  value={searchData.checkOut}
                  onChange={(e) => handleInputChange('checkOut', e.target.value)}
                />
              </div>
            </div>

            {/* Guests */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Guests
              </label>
              <div className="relative">
                <FaUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-600" />
                <select
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 appearance-none bg-white"
                  value={searchData.guests}
                  onChange={(e) => handleInputChange('guests', e.target.value)}
                >
                  <option value="1">1 Guest</option>
                  <option value="2">2 Guests</option>
                  <option value="3">3 Guests</option>
                  <option value="4">4 Guests</option>
                  <option value="5+">5+ Guests</option>
                </select>
              </div>
            </div>

            {/* Search Button */}
            <div className="md:col-span-2 lg:col-span-4 flex justify-center mt-4">
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl"
              >
                <FaSearch />
                Search Apartments
              </button>
            </div>
          </form>
        </div>

        {/* Quick Filters */}
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <button className="bg-gray-100 hover:bg-blue-100 text-gray-700 hover:text-blue-700 px-6 py-2 rounded-full transition-all duration-300 hover:scale-105">
            Entire Apartment
          </button>
          <button className="bg-gray-100 hover:bg-blue-100 text-gray-700 hover:text-blue-700 px-6 py-2 rounded-full transition-all duration-300 hover:scale-105">
            Studio
          </button>
          <button className="bg-gray-100 hover:bg-blue-100 text-gray-700 hover:text-blue-700 px-6 py-2 rounded-full transition-all duration-300 hover:scale-105">
            1 Bedroom
          </button>
          <button className="bg-gray-100 hover:bg-blue-100 text-gray-700 hover:text-blue-700 px-6 py-2 rounded-full transition-all duration-300 hover:scale-105">
            2+ Bedrooms
          </button>
          <button className="bg-gray-100 hover:bg-blue-100 text-gray-700 hover:text-blue-700 px-6 py-2 rounded-full transition-all duration-300 hover:scale-105">
            Pet Friendly
          </button>
        </div>
      </div>
    </div>
  );
};

export default SearchSection;
