import React, { useEffect, useState } from 'react';
import { FaMapMarkerAlt, FaCalendarAlt, FaUser, FaSearch, FaCar, FaUmbrellaBeach, FaHome } from 'react-icons/fa';

const SearchSection = () => {
  const [activeTab, setActiveTab] = useState('stays'); // stays | cars | attractions
  const [searchData, setSearchData] = useState({
    location: '',
    checkIn: '',
    checkOut: '',
    guests: 1,
    pickupLocation: '',
    returnLocation: '',
    pickupDate: '',
    returnDate: ''
  });
  const [visible, setVisible] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVisible(true), 50); return () => clearTimeout(t); }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    // TODO: route based on activeTab
    if (activeTab === 'stays') {
      window.location.href = '/apartments';
    } else if (activeTab === 'cars') {
      window.location.href = '/cars';
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
        <div className={`mx-auto backdrop-blur-md bg-white/90 rounded-2xl modern-card-elevated p-6 md:p-8 border border-white/60 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
          {/* Tabs */}
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => setActiveTab('stays')} type="button" className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${activeTab==='stays' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border'}`}>
              <FaHome /> Stays
            </button>
            <button onClick={() => setActiveTab('cars')} type="button" className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${activeTab==='cars' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border'}`}>
              <FaCar /> Cars
            </button>
            <button onClick={() => setActiveTab('attractions')} type="button" className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${activeTab==='attractions' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border'}`}>
              <FaUmbrellaBeach /> Attractions
            </button>
          </div>

          <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Location */}
            <div className="relative">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {activeTab==='cars' ? 'Pickup Location' : 'Location'}
              </label>
              <div className="relative">
                <FaMapMarkerAlt className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-blue-600" />
                <input
                  type="text"
                  placeholder={activeTab==='cars' ? 'Where to pick up?' : 'Where are you going?'}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                  value={activeTab==='cars' ? searchData.pickupLocation : searchData.location}
                  onChange={(e) => handleInputChange(activeTab==='cars' ? 'pickupLocation' : 'location', e.target.value)}
                />
              </div>
            </div>

            {/* Check-in / Pickup Date */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {activeTab==='cars' ? 'Pickup Date' : 'Check-in'}
              </label>
              <div className="relative">
                <FaCalendarAlt className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-blue-600" />
                <input
                  type="date"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                  value={activeTab==='cars' ? searchData.pickupDate : searchData.checkIn}
                  onChange={(e) => handleInputChange(activeTab==='cars' ? 'pickupDate' : 'checkIn', e.target.value)}
                />
              </div>
            </div>

            {/* Check-out / Return Date */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {activeTab==='cars' ? 'Return Date' : 'Check-out'}
              </label>
              <div className="relative">
                <FaCalendarAlt className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-blue-600" />
                <input
                  type="date"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                  value={activeTab==='cars' ? searchData.returnDate : searchData.checkOut}
                  onChange={(e) => handleInputChange(activeTab==='cars' ? 'returnDate' : 'checkOut', e.target.value)}
                />
              </div>
            </div>

            {/* Guests or Return Location */}
            {activeTab !== 'cars' ? (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Guests
                </label>
                <div className="relative">
                  <FaUser className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-blue-600" />
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
            ) : (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Return Location (optional)
                </label>
                <div className="relative">
                  <FaMapMarkerAlt className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-600" />
                  <input
                    type="text"
                    placeholder="Return to a different place?"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
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
                {activeTab==='stays' ? 'Search Stays' : activeTab==='cars' ? 'Search Cars' : 'Explore Attractions'}
              </button>
            </div>
          </form>
        </div>
        {/* Quick links */}
        <div className={`mt-6 flex flex-wrap justify-center gap-3 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
          <a href="/cars" className="px-4 py-2 rounded-full bg-white/80 border hover:border-blue-300 hover:text-blue-700 transition">Popular Cars</a>
          <a href="/apartments" className="px-4 py-2 rounded-full bg-white/80 border hover:border-blue-300 hover:text-blue-700 transition">Featured Stays</a>
          <a href="/attractions" className="px-4 py-2 rounded-full bg-white/80 border hover:border-blue-300 hover:text-blue-700 transition">Top Attractions</a>
        </div>
      </div>
    </div>
  );
};

export default SearchSection;
