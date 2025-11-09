import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaMapMarkerAlt, FaFire, FaPercent, FaClock } from 'react-icons/fa';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

const DealsPage = () => {
  const [destinations, setDestinations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = [
    { value: 'all', label: 'All Deals' },
    { value: 'early_bird', label: 'Early Bird' },
    { value: 'last_minute', label: 'Last Minute' },
    { value: 'long_stay', label: 'Long Stay' },
    { value: 'weekend_special', label: 'Weekend Deals' }
  ];

  useEffect(() => {
    fetchDealsDestinations();
  }, []);

  const fetchDealsDestinations = async () => {
    try {
      setLoading(true);
      // Fetch all properties with active deals
      const res = await fetch(`${API_URL}/api/properties?hasDeals=true`);
      const data = await res.json();
      
      if (res.ok) {
        // Group properties by city
        const citiesMap = new Map();
        
        data.properties?.forEach(property => {
          const city = property.city;
          if (!citiesMap.has(city)) {
            citiesMap.set(city, {
              city,
              properties: [],
              dealCount: 0,
              minPrice: Infinity,
              image: property.images?.[0] || '/placeholder-city.jpg'
            });
          }
          
          const cityData = citiesMap.get(city);
          cityData.properties.push(property);
          cityData.dealCount += property.activeDealsCount || 0;
          if (property.pricePerNight < cityData.minPrice) {
            cityData.minPrice = property.pricePerNight;
          }
        });
        
        const citiesArray = Array.from(citiesMap.values())
          .filter(city => city.dealCount > 0)
          .sort((a, b) => b.dealCount - a.dealCount);
        
        setDestinations(citiesArray);
      }
    } catch (error) {
      console.error('Failed to fetch deals:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Removed hero banner */}

      {/* Deals Stats Bar */}
      <div className="bg-white border-b border-gray-200 py-4">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-3xl font-bold text-blue-600">{destinations.length}</div>
              <div className="text-sm text-gray-600">Destinations</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-green-600">
                {destinations.reduce((sum, d) => sum + d.dealCount, 0)}
              </div>
              <div className="text-sm text-gray-600">Active Deals</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-orange-600">Up to 50%</div>
              <div className="text-sm text-gray-600">Discount</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-purple-600">
                {destinations.reduce((sum, d) => sum + d.properties.length, 0)}
              </div>
              <div className="text-sm text-gray-600">Properties</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-8">Top Destinations with Deals</h2>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-gray-300 h-48 rounded-t-lg"></div>
                <div className="bg-white p-4 rounded-b-lg">
                  <div className="h-4 bg-gray-300 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              </div>
            ))}
          </div>
        ) : destinations.length === 0 ? (
          <div className="text-center py-16">
            <FaPercent className="text-6xl text-gray-300 mx-auto mb-4" />
            <h3 className="text-2xl font-semibold text-gray-700 mb-2">No Deals Available</h3>
            <p className="text-gray-600">Check back soon for amazing offers!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {destinations.map((destination, index) => (
              <Link
                key={destination.city}
                to={`/apartments?city=${encodeURIComponent(destination.city)}&deals=true`}
                className="group relative overflow-hidden rounded-lg shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
              >
                {/* Image */}
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={destination.image}
                    alt={destination.city}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    onError={(e) => {
                      e.target.src = 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=400&h=300&fit=crop';
                    }}
                  />
                  
                  {/* Deal Count Badge */}
                  <div className="absolute top-3 left-3 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg">
                    {destination.dealCount} {destination.dealCount === 1 ? 'Deal' : 'Deals'}
                  </div>

                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                </div>

                {/* Content */}
                <div className="bg-white p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                      {destination.city}
                    </h3>
                    <FaMapMarkerAlt className="text-blue-600 mt-1" />
                  </div>
                  
                  <div className="flex items-baseline space-x-2">
                    <span className="text-sm text-gray-600">From</span>
                    <span className="text-2xl font-bold text-green-600">
                      ${destination.minPrice}
                    </span>
                    <span className="text-sm text-gray-600">per night</span>
                  </div>

                  <div className="mt-3 text-sm text-gray-600">
                    {destination.properties.length} {destination.properties.length === 1 ? 'property' : 'properties'} with deals
                  </div>
                </div>

                {/* Hover Effect */}
                <div className="absolute inset-0 border-2 border-blue-600 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
              </Link>
            ))}
          </div>
        )}

        {/* Popular Deal Types Section */}
        <div className="mt-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">Popular Deal Types</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gradient-to-br from-orange-500 to-red-600 text-white p-6 rounded-lg shadow-lg">
              <FaFire className="text-4xl mb-3" />
              <h3 className="text-xl font-bold mb-2">Last Minute</h3>
              <p className="text-sm opacity-90">Book within 7 days and save up to 30%</p>
            </div>

            <div className="bg-gradient-to-br from-blue-500 to-blue-700 text-white p-6 rounded-lg shadow-lg">
              <FaClock className="text-4xl mb-3" />
              <h3 className="text-xl font-bold mb-2">Early Bird</h3>
              <p className="text-sm opacity-90">Book 30+ days ahead for best prices</p>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-green-700 text-white p-6 rounded-lg shadow-lg">
              <FaPercent className="text-4xl mb-3" />
              <h3 className="text-xl font-bold mb-2">Long Stay</h3>
              <p className="text-sm opacity-90">Stay 7+ nights and get extra discounts</p>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-purple-700 text-white p-6 rounded-lg shadow-lg">
              <FaMapMarkerAlt className="text-4xl mb-3" />
              <h3 className="text-xl font-bold mb-2">Weekend Deals</h3>
              <p className="text-sm opacity-90">Special rates for weekend getaways</p>
            </div>
          </div>
        </div>

        {/* How It Works Section */}
        <div className="mt-16 bg-blue-50 rounded-lg p-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">How to Get the Best Deals</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-blue-600 text-white w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                1
              </div>
              <h3 className="text-xl font-semibold mb-2">Choose Your Destination</h3>
              <p className="text-gray-600">Browse deals by city and find the perfect location</p>
            </div>

            <div className="text-center">
              <div className="bg-blue-600 text-white w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="text-xl font-semibold mb-2">Select Your Deal</h3>
              <p className="text-gray-600">Compare offers and choose the best deal for you</p>
            </div>

            <div className="text-center">
              <div className="bg-blue-600 text-white w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="text-xl font-semibold mb-2">Book & Save</h3>
              <p className="text-gray-600">Complete your booking and enjoy amazing savings</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DealsPage;
