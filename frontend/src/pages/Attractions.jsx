import React, { useState } from 'react';
import { FaMapMarkerAlt, FaStar, FaClock, FaTicketAlt, FaCamera, FaHeart } from 'react-icons/fa';

const Attractions = () => {
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = [
    { id: 'all', name: 'All Amenities', icon: '🏢' },
    { id: 'shopping', name: 'Shopping', icon: '🛍️' },
    { id: 'dining', name: 'Dining', icon: '🍽️' },
    { id: 'healthcare', name: 'Healthcare', icon: '🏥' },
    { id: 'education', name: 'Education', icon: '🎓' },
    { id: 'transport', name: 'Transport', icon: '🚌' }
  ];

  const attractions = [
    {
      id: 1,
      name: "Kigali City Mall",
      location: "Kigali, Rwanda",
      category: "shopping",
      rating: 4.7,
      reviews: 1247,
      distance: "2.5 km",
      price: "Free",
      image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=500&h=400&fit=crop",
      description: "Modern shopping mall with international brands, restaurants, cinema, and entertainment facilities.",
      highlights: ["Supermarket", "Fashion Stores", "Food Court", "Cinema"]
    },
    {
      id: 2,
      name: "King Faisal Hospital",
      location: "Kigali, Rwanda",
      category: "healthcare",
      rating: 4.8,
      reviews: 892,
      distance: "3.2 km",
      price: "Medical",
      image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=500&h=400&fit=crop",
      description: "Leading private hospital with modern facilities, emergency services, and specialized medical care.",
      highlights: ["Emergency Services", "Specialists", "Pharmacy", "Laboratory"]
    },
    {
      id: 3,
      name: "University of Rwanda",
      location: "Kigali, Rwanda",
      category: "education",
      rating: 4.6,
      reviews: 2156,
      distance: "4.1 km",
      price: "Educational",
      image: "https://images.unsplash.com/photo-1562774053-701939374585?w=500&h=400&fit=crop",
      description: "Premier university with excellent facilities, library, and research centers for higher education.",
      highlights: ["Library", "Research Centers", "Student Services", "Cafeteria"]
    },
    {
      id: 4,
      name: "Kimisagara Market",
      location: "Kigali, Rwanda",
      category: "shopping",
      rating: 4.4,
      reviews: 634,
      distance: "1.8 km",
      price: "Local Prices",
      image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=500&h=400&fit=crop",
      description: "Local market with fresh produce, traditional crafts, and authentic Rwandan goods at affordable prices.",
      highlights: ["Fresh Produce", "Local Crafts", "Traditional Goods", "Street Food"]
    },
    {
      id: 5,
      name: "Kigali Bus Station",
      location: "Kigali, Rwanda",
      category: "transport",
      rating: 4.3,
      reviews: 445,
      distance: "2.1 km",
      price: "Transport",
      image: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=500&h=400&fit=crop",
      description: "Main bus terminal connecting to all major cities and towns across Rwanda with reliable service.",
      highlights: ["Intercity Buses", "Local Transport", "Ticket Office", "Waiting Area"]
    },
    {
      id: 6,
      name: "Restaurant des Mille Collines",
      location: "Kigali, Rwanda",
      category: "dining",
      rating: 4.5,
      reviews: 312,
      distance: "1.2 km",
      price: "RWF 15,000+",
      image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=500&h=400&fit=crop",
      description: "Upscale restaurant serving international and local cuisine with beautiful city views and excellent service.",
      highlights: ["International Cuisine", "Local Dishes", "City Views", "Bar"]
    }
  ];

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
                  src={attraction.image}
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
                  <span className="text-blue-600 font-bold">
                    {attraction.price === 'Free' ? 'Free' : `RWF ${attraction.price}`}
                  </span>
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
                  <span className="text-sm text-gray-600">{attraction.distance} from city center</span>
                </div>

                <p className="text-gray-700 text-sm mb-4 line-clamp-2">
                  {attraction.description}
                </p>

                {/* Highlights */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {attraction.highlights.slice(0, 2).map((highlight, idx) => (
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
