import React from 'react';
import { Link } from 'react-router-dom';
import { FaStar, FaMapMarkerAlt, FaBed, FaBath, FaWifi, FaCar } from 'react-icons/fa';

const FeaturedApartments = () => {
  const apartments = [
    {
      id: 1,
      title: "Luxury Studio in Kigali",
      location: "Kigali, Rwanda",
      price: 85000,
      rating: 4.8,
      reviews: 124,
      image: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=500&h=300&fit=crop",
      bedrooms: 1,
      bathrooms: 1,
      amenities: ["WiFi", "Parking", "Kitchen", "Balcony"],
      isAvailable: true
    },
    {
      id: 2,
      title: "Modern 2BR Apartment",
      location: "Musanze, Rwanda",
      price: 120000,
      rating: 4.9,
      reviews: 89,
      image: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=500&h=300&fit=crop",
      bedrooms: 2,
      bathrooms: 2,
      amenities: ["WiFi", "Parking", "Kitchen", "Garden"],
      isAvailable: true
    },
    {
      id: 3,
      title: "Cozy 1BR with Mountain View",
      location: "Gisenyi, Rwanda",
      price: 95000,
      rating: 4.7,
      reviews: 67,
      image: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=500&h=300&fit=crop",
      bedrooms: 1,
      bathrooms: 1,
      amenities: ["WiFi", "Kitchen", "Mountain View"],
      isAvailable: false
    },
    {
      id: 4,
      title: "Spacious 3BR Family Home",
      location: "Huye, Rwanda",
      price: 150000,
      rating: 4.9,
      reviews: 156,
      image: "https://images.unsplash.com/photo-1577495508048-b635879837f1?w=500&h=300&fit=crop",
      bedrooms: 3,
      bathrooms: 2,
      amenities: ["WiFi", "Parking", "Kitchen", "Garden", "Pool"],
      isAvailable: true
    }
  ];

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <FaStar
        key={i}
        className={`${i < Math.floor(rating) ? 'text-yellow-400' : 'text-gray-300'}`}
      />
    ));
  };

  return (
    <div className="bg-white py-16 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">
            Featured Apartments
          </h2>
          <p className="text-gray-600 text-lg">
            Discover our most popular and highly-rated apartments
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {apartments.map((apartment, index) => (
            <div
              key={apartment.id}
              className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105 overflow-hidden border border-gray-100"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Image */}
              <div className="relative h-48 overflow-hidden">
                <img
                  src={apartment.image}
                  alt={apartment.title}
                  className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
                />
                {!apartment.isAvailable && (
                  <div className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                    Unavailable
                  </div>
                )}
                <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 text-sm font-semibold text-gray-800">
                  RWF {apartment.price.toLocaleString()}/month
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-2 line-clamp-2">
                  {apartment.title}
                </h3>
                
                <div className="flex items-center text-gray-600 mb-3">
                  <FaMapMarkerAlt className="text-blue-600 mr-2" />
                  <span className="text-sm">{apartment.location}</span>
                </div>

                {/* Rating */}
                <div className="flex items-center mb-3">
                  <div className="flex items-center mr-2">
                    {renderStars(apartment.rating)}
                  </div>
                  <span className="text-sm text-gray-600">
                    {apartment.rating} ({apartment.reviews} reviews)
                  </span>
                </div>

                {/* Bedrooms & Bathrooms */}
                <div className="flex items-center gap-4 mb-4 text-sm text-gray-600">
                  <div className="flex items-center">
                    <FaBed className="mr-1" />
                    {apartment.bedrooms} BR
                  </div>
                  <div className="flex items-center">
                    <FaBath className="mr-1" />
                    {apartment.bathrooms} Bath
                  </div>
                </div>

                {/* Amenities */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {apartment.amenities.slice(0, 3).map((amenity, idx) => (
                    <span
                      key={idx}
                      className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full"
                    >
                      {amenity}
                    </span>
                  ))}
                  {apartment.amenities.length > 3 && (
                    <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
                      +{apartment.amenities.length - 3} more
                    </span>
                  )}
                </div>

                {/* Book Button */}
                <Link
                  to={`/apartment/${apartment.id}`}
                  className={`w-full py-3 rounded-xl font-semibold transition-all duration-300 block text-center ${
                    apartment.isAvailable
                      ? 'bg-blue-600 hover:bg-blue-700 text-white hover:scale-105'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {apartment.isAvailable ? 'View Details' : 'Unavailable'}
                </Link>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <Link to="/apartments" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-semibold transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl inline-block">
            View All Apartments
          </Link>
        </div>
      </div>
    </div>
  );
};

export default FeaturedApartments;
