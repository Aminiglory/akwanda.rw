import React, { useEffect, useState } from 'react';
import { FaMapMarkerAlt, FaCalendarAlt, FaUser, FaSearch, FaCar, FaUmbrellaBeach, FaHome } from 'react-icons/fa';
import { useLocale } from '../contexts/LocaleContext';

const SearchSection = () => {
  const { t } = useLocale() || {};
  const safeT = (key, fallback) => {
    if (!t) return fallback;
    const value = t(key);
    if (!value || value === key || String(value).includes('.')) {
      return fallback;
    }
    return value;
  };
  const [activeTab, setActiveTab] = useState('stays'); // stays | cars | attractions
  const [searchData, setSearchData] = useState({
    location: '',
    checkIn: '',
    checkOut: '',
    guests: '',
    pickupLocation: '',
    returnLocation: '',
    pickupDate: '',
    returnDate: ''
  });
  // Render statically without scroll/entry animation

  const handleSearch = (e) => {
    e.preventDefault();
    if (activeTab === 'stays') {
      const params = new URLSearchParams();
      if (searchData.location) params.set('q', searchData.location);
      if (searchData.checkIn) params.set('startDate', searchData.checkIn);
      if (searchData.checkOut) params.set('endDate', searchData.checkOut);
      if (searchData.guests) params.set('guests', String(searchData.guests));
      window.location.href = `/apartments${params.toString() ? `?${params.toString()}` : ''}`;
    } else if (activeTab === 'cars') {
      const params = new URLSearchParams();
      if (searchData.pickupLocation) params.set('pickupLocation', searchData.pickupLocation);
      if (searchData.returnLocation) params.set('returnLocation', searchData.returnLocation);
      if (searchData.pickupDate) params.set('pickupDate', searchData.pickupDate);
      if (searchData.returnDate) params.set('returnDate', searchData.returnDate);
      window.location.href = `/cars${params.toString() ? `?${params.toString()}` : ''}`;
    } else {
      window.location.href = '/attractions';
    }
  };

  const handleInputChange = (field, value) => {
    setSearchData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="relative py-10 px-4">
      <div className="max-w-6xl mx-auto -mt-16 md:-mt-20">
        <div className="mx-auto backdrop-blur-md bg-white/90 rounded-2xl modern-card-elevated p-6 md:p-8 border border-white/60">
          {/* Tabs */}
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => setActiveTab('stays')} type="button" className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${activeTab==='stays' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border'}`}>
              <FaHome /> {safeT('search.staysTab', 'Stays')}
            </button>
            <button onClick={() => setActiveTab('cars')} type="button" className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${activeTab==='cars' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border'}`}>
              <FaCar /> {safeT('search.carsTab', 'Cars')}
            </button>
            <button onClick={() => setActiveTab('attractions')} type="button" className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${activeTab==='attractions' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border'}`}>
              <FaUmbrellaBeach /> {safeT('search.attractionsTab', 'Attractions')}
            </button>
          </div>

          <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Location */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {activeTab==='cars' ? safeT('search.pickupLocation', 'Pickup Location') : safeT('search.location', 'Location')}
              </label>
              <div className="field">
                <FaMapMarkerAlt className="icon-left" />
                <input
                  type="text"
                  placeholder={activeTab==='cars' ? safeT('search.wherePickup', 'Where to pick up?') : safeT('search.whereGoing', 'Where are you going?')}
                  className="w-full pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                  value={activeTab==='cars' ? searchData.pickupLocation : searchData.location}
                  onChange={(e) => handleInputChange(activeTab==='cars' ? 'pickupLocation' : 'location', e.target.value)}
                />
              </div>
            </div>

            {/* Check-in / Pickup Date */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {activeTab==='cars' ? safeT('search.pickupDate', 'Pickup Date') : safeT('search.checkIn', 'Check-in')}
              </label>
              <div className="field">
                <FaCalendarAlt className="icon-left" />
                <input
                  type="date"
                  className="w-full pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                  value={activeTab==='cars' ? searchData.pickupDate : searchData.checkIn}
                  onChange={(e) => handleInputChange(activeTab==='cars' ? 'pickupDate' : 'checkIn', e.target.value)}
                />
              </div>
            </div>

            {/* Check-out / Return Date */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {activeTab==='cars' ? safeT('search.returnDate', 'Return Date') : safeT('search.checkOut', 'Check-out')}
              </label>
              <div className="field">
                <FaCalendarAlt className="icon-left" />
                <input
                  type="date"
                  className="w-full pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                  value={activeTab==='cars' ? searchData.returnDate : searchData.checkOut}
                  onChange={(e) => handleInputChange(activeTab==='cars' ? 'returnDate' : 'checkOut', e.target.value)}
                />
              </div>
            </div>

            {/* Guests or Return Location */}
            {activeTab !== 'cars' ? (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {safeT('search.guests', 'Guests')}
                </label>
                <div className="field">
                  <FaUser className="icon-left" />
                  <select
                    className="w-full pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 appearance-none bg-white"
                    value={searchData.guests}
                    onChange={(e) => handleInputChange('guests', e.target.value)}
                    required
                  >
                    <option value="" disabled>
                      {safeT('search.guestsPlaceholder', 'Select guests')}
                    </option>
                    <option value="1">1 {safeT('search.guests', 'Guests')}</option>
                    <option value="2">2 {safeT('search.guests', 'Guests')}</option>
                    <option value="3">3 {safeT('search.guests', 'Guests')}</option>
                    <option value="4">4 {safeT('search.guests', 'Guests')}</option>
                    <option value="5">5+ {safeT('search.guests', 'Guests')}</option>
                  </select>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {safeT('search.returnLocationOptional', 'Return Location (optional)')}
                </label>
                <div className="field">
                  <FaMapMarkerAlt className="icon-left" />
                  <input
                    type="text"
                    placeholder={safeT('search.returnDifferentPlace', 'Return to a different place?')}
                    className="w-full pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                    value={searchData.returnLocation}
                    onChange={(e) => handleInputChange('returnLocation', e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Search Button */}
            <div className="md:col-span-2 lg:col-span-4 flex justify-center mt-2">
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl"
              >
                <FaSearch />
                {activeTab==='stays'
                  ? safeT('search.searchStays', 'Search Stays')
                  : activeTab==='cars'
                    ? safeT('search.searchCars', 'Search Cars')
                    : safeT('search.exploreAttractions', 'Explore Attractions')}
              </button>
            </div>
          </form>
        </div>
        {/* Quick links */}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <a href="/cars" className="px-4 py-2 rounded-full bg-white/80 border hover:border-blue-300 hover:text-blue-700 transition">{safeT('search.quickPopularCars', 'Popular Cars')}</a>
          <a href="/apartments" className="px-4 py-2 rounded-full bg-white/80 border hover:border-blue-300 hover:text-blue-700 transition">{safeT('search.quickFeaturedStays', 'Featured Stays')}</a>
          <a href="/attractions" className="px-4 py-2 rounded-full bg-white/80 border hover:border-blue-300 hover:text-blue-700 transition">{safeT('search.quickTopAttractions', 'Top Attractions')}</a>
        </div>
      </div>
    </div>
  );
}

export default SearchSection;
