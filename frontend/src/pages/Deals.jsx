import React, { useState } from 'react';
import { FaBed, FaPlane, FaCar, FaMapMarkerAlt, FaStar, FaClock, FaTag, FaHeart, FaArrowRight } from 'react-icons/fa';

const Deals = () => {
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = [
    { id: 'all', name: 'All Deals', icon: '🔥' },
    { id: 'hotel', name: 'Hotel Deals', icon: '🏨' },
    { id: 'flight', name: 'Flight Deals', icon: '✈️' },
    { id: 'package', name: 'Package Deals', icon: '📦' },
    { id: 'lastminute', name: 'Last Minute', icon: '⏰' },
    { id: 'earlybird', name: 'Early Bird', icon: '🐦' }
  ];

  const deals = [
    {
      id: 1,
      title: "Luxury Hotel Package",
      location: "Kigali Marriott Hotel",
      category: "hotel",
      originalPrice: 250000,
      discountedPrice: 180000,
      discount: 28,
      rating: 4.8,
      reviews: 156,
      image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=500&h=400&fit=crop",
      description: "3 nights in luxury with breakfast included",
      validUntil: "2024-02-15",
      type: "earlybird"
    },
    {
      id: 2,
      title: "Flight to Nairobi",
      location: "Kigali → Nairobi",
      category: "flight",
      originalPrice: 450000,
      discountedPrice: 320000,
      discount: 29,
      rating: 4.6,
      reviews: 89,
      image: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=500&h=400&fit=crop",
      description: "Round trip with RwandAir",
      validUntil: "2024-01-30",
      type: "lastminute"
    },
    {
      id: 3,
      title: "Complete Safari Package",
      location: "Akagera National Park",
      category: "package",
      originalPrice: 800000,
      discountedPrice: 550000,
      discount: 31,
      rating: 4.9,
      reviews: 234,
      image: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=500&h=400&fit=crop",
      description: "2 days safari with accommodation and meals",
      validUntil: "2024-03-20",
      type: "earlybird"
    },
    {
      id: 4,
      title: "City Center Apartment",
      location: "Kigali City Center",
      category: "hotel",
      originalPrice: 120000,
      discountedPrice: 85000,
      discount: 29,
      rating: 4.5,
      reviews: 67,
      image: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=500&h=400&fit=crop",
      description: "Modern apartment with city views",
      validUntil: "2024-02-10",
      type: "lastminute"
    },
    {
      id: 5,
      title: "Car Rental Special",
      location: "Kigali Airport",
      category: "flight",
      originalPrice: 150000,
      discountedPrice: 100000,
      discount: 33,
      rating: 4.7,
      reviews: 123,
      image: "https://images.unsplash.com/photo-1549317336-206569e8475c?w=500&h=400&fit=crop",
      description: "7 days car rental with unlimited mileage",
      validUntil: "2024-02-28",
      type: "earlybird"
    },
    {
      id: 6,
      title: "Mountain Gorilla Experience",
      location: "Volcanoes National Park",
      category: "package",
      originalPrice: 1800000,
      discountedPrice: 1350000,
      discount: 25,
      rating: 4.9,
      reviews: 189,
      image: "https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=500&h=400&fit=crop",
      description: "Gorilla trekking with luxury accommodation",
      validUntil: "2024-04-15",
      type: "earlybird"
    }
  ];

  const filteredDeals = selectedCategory === 'all' 
    ? deals 
    : deals.filter(deal => deal.category === selectedCategory || deal.type === selectedCategory);

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <FaStar
        key={i}
        className={`${i < Math.floor(rating) ? 'text-yellow-400' : 'text-gray-300'}`}
      />
    ));
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'hotel': return <FaBed className="text-blue-600" />;
      case 'flight': return <FaPlane className="text-green-600" />;
      case 'package': return <FaTag className="text-purple-600" />;
      default: return <FaTag className="text-gray-600" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Exclusive Deals</h1>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Don't miss out on these amazing offers! Limited time deals on hotels, flights, and packages
          </p>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap justify-center gap-4 mb-12">
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                selectedCategory === category.id
                  ? 'bg-red-600 text-white shadow-lg transform scale-105'
                  : 'bg-white text-gray-700 hover:bg-gray-100 hover:scale-105 shadow-md'
              }`}
            >
              <span className="text-lg">{category.icon}</span>
              {category.name}
            </button>
          ))}
        </div>

        {/* Deals Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredDeals.map((deal, index) => (
            <div
              key={deal.id}
              className="modern-card-elevated overflow-hidden hover:scale-105 transition-all duration-500 relative"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Discount Badge */}
              <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-1 rounded-full text-sm font-bold z-10">
                -{deal.discount}%
              </div>

              {/* Category Icon */}
              <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-full p-2 z-10">
                {getCategoryIcon(deal.category)}
              </div>

              {/* Image */}
              <div className="relative h-48 overflow-hidden">
                <img
                  src={deal.image}
                  alt={deal.title}
                  className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                />
                <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 text-sm font-semibold text-gray-800">
                  Valid until {new Date(deal.validUntil).toLocaleDateString()}
                </div>
                <button className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm rounded-full p-2 hover:bg-white transition-all duration-300">
                  <FaHeart className="text-gray-600 hover:text-red-500" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2">
                  {deal.title}
                </h3>
                
                <div className="flex items-center text-gray-600 mb-3">
                  <FaMapMarkerAlt className="text-blue-600 mr-2" />
                  <span className="text-sm">{deal.location}</span>
                </div>

                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                  {deal.description}
                </p>

                {/* Rating */}
                <div className="flex items-center mb-4">
                  <div className="flex items-center mr-2">
                    {renderStars(deal.rating)}
                  </div>
                  <span className="text-sm text-gray-600">
                    {deal.rating} ({deal.reviews} reviews)
                  </span>
                </div>

                {/* Price */}
                <div className="mb-6">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-red-600">
                      RWF {deal.discountedPrice.toLocaleString()}
                    </span>
                    <span className="text-lg text-gray-500 line-through">
                      RWF {deal.originalPrice.toLocaleString()}
                    </span>
                  </div>
                  <div className="text-sm text-green-600 font-semibold">
                    You save RWF {(deal.originalPrice - deal.discountedPrice).toLocaleString()}
                  </div>
                </div>

                {/* Book Button */}
                <button className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-semibold transition-all duration-300 hover:scale-105 shadow-lg flex items-center justify-center gap-2">
                  Book Now
                  <FaArrowRight className="text-sm" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Newsletter Signup */}
        <div className="mt-16">
          <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-2xl p-8 text-center text-white shadow-xl">
            <h3 className="text-2xl font-bold mb-4">Never Miss a Deal!</h3>
            <p className="text-red-100 mb-6 text-lg">
              Subscribe to our newsletter and be the first to know about exclusive offers
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-4 py-3 rounded-xl text-gray-900 focus:ring-2 focus:ring-white focus:outline-none"
              />
              <button className="bg-white text-red-700 px-6 py-3 rounded-xl font-semibold hover:bg-red-50 transition-all duration-300 hover:scale-105 shadow-lg">
                Subscribe
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Deals;
