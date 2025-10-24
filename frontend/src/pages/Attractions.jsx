import React, { useEffect, useMemo, useState } from 'react';
import { FaMapMarkerAlt, FaStar, FaClock, FaTicketAlt, FaCamera, FaHeart } from 'react-icons/fa';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Attractions = () => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_URL}/api/content/attractions`, { credentials: 'include' });
        const data = await res.json();
        const content = data?.content || {};
        // Expect an array of attractions at content.items; fallback to []
        if (res.ok) setItems(Array.isArray(content.items) ? content.items : []);
        else setItems([]);
      } catch (_) { setItems([]); } finally { setLoading(false); }
    })();
  }, []);

  const categories = useMemo(() => {
    const all = new Map();
    for (const a of items) {
      const id = (a.category || 'other').toLowerCase();
      if (!all.has(id)) all.set(id, { id, name: id.charAt(0).toUpperCase()+id.slice(1), icon: '📍' });
    }
    const arr = Array.from(all.values());
    return [{ id: 'all', name: 'All', icon: '🏷️' }, ...arr];
  }, [items]);

  const attractions = items;

  const filteredAttractions = selectedCategory === 'all' 
    ? attractions 
    : attractions.filter(attraction => attraction.category === selectedCategory);

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <FaStar
        key={i}
        className={`${i < Math.floor(rating) ? 'text-yellow-400' : 'text-gray-300'}`}
      />
    ));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4">Local Amenities Near Your Apartment</h1>
            <p className="text-xl text-blue-100">Discover what's around your apartment in Rwanda</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Category Filter */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-4 justify-center">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`flex items-center space-x-2 px-6 py-3 rounded-full transition-all duration-300 ${
                  selectedCategory === category.id
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-white text-gray-700 hover:bg-gray-100 shadow-md'
                }`}
              >
                <span className="text-lg">{category.icon}</span>
                <span className="font-semibold">{category.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Attractions Grid */}
        {loading ? (
          <div className="text-center text-gray-600 py-16">Loading...</div>
        ) : filteredAttractions.length === 0 ? (
          <div className="text-center text-gray-600 py-16">No attractions available yet.</div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredAttractions.map((attraction, index) => (
            <div
              key={attraction.id}
              className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Image */}
              <div className="relative h-48 overflow-hidden">
                <img
                  src={attraction.image?.startsWith?.('http') ? attraction.image : `${API_URL}${attraction.image || ''}`}
                  alt={attraction.name}
                  className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
                />
                <div className="absolute top-4 right-4 flex space-x-2">
                  <button className="bg-white/90 backdrop-blur-sm rounded-full p-2 hover:bg-white transition-colors">
                    <FaHeart className="text-red-500" />
                  </button>
                  <button className="bg-white/90 backdrop-blur-sm rounded-full p-2 hover:bg-white transition-colors">
                    <FaCamera className="text-blue-500" />
                  </button>
                </div>
                <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1">
                  {attraction.price && (
                    <span className="text-blue-600 font-bold">
                      {typeof attraction.price === 'string' ? attraction.price : `RWF ${attraction.price}`}
                    </span>
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-2">{attraction.name}</h3>
                
                <div className="flex items-center text-gray-600 mb-3">
                  <FaMapMarkerAlt className="text-blue-600 mr-2" />
                  <span className="text-sm">{attraction.location}</span>
                </div>

                {/* Rating */}
                <div className="flex items-center mb-3">
                  <div className="flex items-center mr-2">
                    {renderStars(attraction.rating)}
                  </div>
                  <span className="text-sm text-gray-600">
                    {attraction.rating} ({attraction.reviews} reviews)
                  </span>
                </div>

                {/* Distance */}
                <div className="flex items-center mb-4">
                  <FaMapMarkerAlt className="text-gray-400 mr-2" />
                  {attraction.distance && <span className="text-sm text-gray-600">{attraction.distance}</span>}
                </div>

                <p className="text-gray-700 text-sm mb-4 line-clamp-2">
                  {attraction.description}
                </p>

                {/* Highlights */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {(attraction.highlights || []).slice(0, 2).map((highlight, idx) => (
                    <span
                      key={idx}
                      className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full"
                    >
                      {highlight}
                    </span>
                  ))}
                  {attraction.highlights.length > 2 && (
                    <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
                      +{attraction.highlights.length - 2} more
                    </span>
                  )}
                </div>

                {/* View Details Button */}
                <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold transition-all duration-300 hover:scale-105 flex items-center justify-center gap-2">
                  <FaMapMarkerAlt />
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
        )}
        
        {/* Call to Action */}
        <div className="mt-12 text-center">
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl p-8 text-white">
            <h3 className="text-2xl font-bold mb-4">Find Your Perfect Apartment Location</h3>
            <p className="text-blue-100 mb-6">
              Choose apartments near the amenities that matter most to you
            </p>
            <button className="bg-white text-blue-600 px-8 py-3 rounded-xl font-semibold hover:bg-gray-100 transition-all duration-300 hover:scale-105">
              Browse Apartments
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Attractions;
