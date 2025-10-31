import React, { useState } from 'react';
import { FaPlane, FaCalendarAlt, FaUser, FaSearch, FaArrowRight, FaClock, FaMapMarkerAlt } from 'react-icons/fa';

const Flights = () => {
  const [searchData, setSearchData] = useState({
    from: '',
    to: '',
    departure: '',
    return: '',
    passengers: 1,
    tripType: 'roundtrip'
  });

  const handleSearch = (e) => {
    e.preventDefault();
    console.log('Flight search:', searchData);
  };

  const handleInputChange = (field, value) => {
    setSearchData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const popularDestinations = [
    { city: 'Nairobi', country: 'Kenya', price: '450,000', image: 'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=400&h=300&fit=crop' },
    { city: 'Kampala', country: 'Uganda', price: '380,000', image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop' },
    { city: 'Addis Ababa', country: 'Ethiopia', price: '520,000', image: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400&h=300&fit=crop' },
    { city: 'Dubai', country: 'UAE', price: '1,200,000', image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=400&h=300&fit=crop' },
    { city: 'Istanbul', country: 'Turkey', price: '980,000', image: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=400&h=300&fit=crop' },
    { city: 'Paris', country: 'France', price: '1,500,000', image: 'https://images.unsplash.com/photo-1502602898536-47ad22581b52?w=400&h=300&fit=crop' }
  ];

  const flightDeals = [
    {
      airline: 'RwandAir',
      route: 'Kigali → Nairobi',
      duration: '1h 30m',
      stops: 'Direct',
      price: '450,000',
      departure: '08:30',
      arrival: '10:00',
      date: 'Today'
    },
    {
      airline: 'Ethiopian Airlines',
      route: 'Kigali → Addis Ababa',
      duration: '2h 15m',
      stops: 'Direct',
      price: '520,000',
      departure: '14:20',
      arrival: '16:35',
      date: 'Tomorrow'
    },
    {
      airline: 'Kenya Airways',
      route: 'Kigali → Kampala',
      duration: '1h 45m',
      stops: 'Direct',
      price: '380,000',
      departure: '11:15',
      arrival: '13:00',
      date: 'Today'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-[#a06b42] text-white py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-8">
            <h1 className="text-2xl md:text-4xl font-bold mb-2 md:mb-4">Flights for Your Apartment Stay</h1>
            <p className="text-base md:text-xl text-white/90">Book flights to reach your apartment destination in Rwanda</p>
          </div>
        </div>
      </div>

      {/* Flight Search */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="modern-card-elevated p-8 mb-12">
          <form onSubmit={handleSearch} className="space-y-6">
            {/* Trip Type */}
            <div className="flex flex-wrap gap-3 mb-6">
              <button
                type="button"
                className={`px-4 md:px-6 py-2.5 md:py-3 rounded-lg font-semibold transition-all duration-300 ${
                  searchData.tripType === 'roundtrip'
                    ? 'bg-[#a06b42] text-white'
                    : 'bg-[#f6e9d8] text-[#4b2a00] hover:bg-[#e8dcc8] border border-[#d4c4b0]'
                }`}
                onClick={() => handleInputChange('tripType', 'roundtrip')}
              >
                Round Trip
              </button>
              <button
                type="button"
                className={`px-4 md:px-6 py-2.5 md:py-3 rounded-lg font-semibold transition-all duration-300 ${
                  searchData.tripType === 'oneway'
                    ? 'bg-[#a06b42] text-white'
                    : 'bg-[#f6e9d8] text-[#4b2a00] hover:bg-[#e8dcc8] border border-[#d4c4b0]'
                }`}
                onClick={() => handleInputChange('tripType', 'oneway')}
              >
                One Way
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              {/* From */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  From
                </label>
                <div className="relative">
                  <FaMapMarkerAlt className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#a06b42]" />
                  <input
                    type="text"
                    placeholder="City or Airport"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                    value={searchData.from}
                    onChange={(e) => handleInputChange('from', e.target.value)}
                  />
                </div>
              </div>

              {/* To */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  To
                </label>
                <div className="relative">
                  <FaMapMarkerAlt className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#a06b42]" />
                  <input
                    type="text"
                    placeholder="City or Airport"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                    value={searchData.to}
                    onChange={(e) => handleInputChange('to', e.target.value)}
                  />
                </div>
              </div>

              {/* Departure */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Departure
                </label>
                <div className="relative">
                  <FaCalendarAlt className="absolute left-3 top-1/2 transform -translate-y-1/2 text-primary" />
                  <input
                    type="date"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                    value={searchData.departure}
                    onChange={(e) => handleInputChange('departure', e.target.value)}
                  />
                </div>
              </div>

              {/* Return (if round trip) */}
              {searchData.tripType === 'roundtrip' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Return
                  </label>
                  <div className="relative">
                    <FaCalendarAlt className="absolute left-3 top-1/2 transform -translate-y-1/2 text-primary" />
                    <input
                      type="date"
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                      value={searchData.return}
                      onChange={(e) => handleInputChange('return', e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Passengers */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Passengers
                </label>
                <div className="relative">
                  <FaUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-primary" />
                  <select
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 appearance-none bg-white"
                    value={searchData.passengers}
                    onChange={(e) => handleInputChange('passengers', e.target.value)}
                  >
                    <option value="1">1 Passenger</option>
                    <option value="2">2 Passengers</option>
                    <option value="3">3 Passengers</option>
                    <option value="4">4+ Passengers</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Search Button */}
            <div className="text-center">
              <button
                type="submit"
                className="bg-[#a06b42] hover:bg-[#8f5a32] text-white px-8 md:px-12 py-3 md:py-4 rounded-xl font-semibold flex items-center gap-2 mx-auto transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl"
              >
                <FaSearch />
                Search Flights
              </button>
            </div>
          </form>
        </div>

        {/* Popular Destinations */}
        <div className="mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6 md:mb-8 text-center">Popular Cities with Apartments</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {popularDestinations.map((dest, index) => (
              <div
                key={index}
                className="modern-card-elevated overflow-hidden hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer"
              >
                <div className="relative h-44 md:h-48 overflow-hidden">
                  <img
                    src={dest.image}
                    alt={dest.city}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/25"></div>
                  <div className="absolute bottom-4 left-4 text-white">
                    <h3 className="text-base md:text-xl font-bold">{dest.city}</h3>
                    <p className="text-[11px] md:text-sm opacity-90">{dest.country}</p>
                  </div>
                  <div className="absolute top-4 right-4 bg-white rounded-full px-3 py-1 border border-[#d4c4b0]">
                    <span className="text-[#a06b42] font-bold">RWF {dest.price}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Flight Deals */}
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6 md:mb-8 text-center">Flights to Rwanda</h2>
          <div className="space-y-4">
            {flightDeals.map((deal, index) => (
              <div
                key={index}
                className="modern-card-elevated p-6 hover:shadow-xl transition-all duration-300 hover:scale-[1.02] cursor-pointer"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex items-center gap-4 md:gap-6">
                    <div className="text-center">
                      <div className="text-lg md:text-2xl font-bold text-[#a06b42]">{deal.departure}</div>
                      <div className="text-xs md:text-sm text-gray-500">Kigali</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <FaPlane className="text-[#a06b42]" />
                      <div className="text-xs md:text-sm text-gray-600">
                        <div>{deal.duration}</div>
                        <div>{deal.stops}</div>
                      </div>
                      <FaArrowRight className="text-gray-400" />
                    </div>
                    <div className="text-center">
                      <div className="text-lg md:text-2xl font-bold text-[#a06b42]">{deal.arrival}</div>
                      <div className="text-xs md:text-sm text-gray-500">{deal.route.split(' → ')[1]}</div>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-800 text-sm md:text-base">{deal.airline}</div>
                      <div className="text-xs md:text-sm text-gray-600">{deal.date}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg md:text-2xl font-bold text-[#a06b42]">RWF {deal.price}</div>
                    <button className="mt-2 bg-[#a06b42] hover:bg-[#8f5a32] text-white px-5 py-2 rounded-lg font-semibold transition-colors duration-300">
                      Book Now
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Flights;
