import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaBed, FaBath, FaWifi, FaCar, FaStar, FaMapMarkerAlt, FaFilter, FaSearch, FaSortAmountDown } from 'react-icons/fa';

const ApartmentsListing = () => {
  const [filters, setFilters] = useState({
    location: '',
    priceRange: '',
    bedrooms: '',
    amenities: [],
    sortBy: 'price-asc'
  });

  const [showFilters, setShowFilters] = useState(false);

  const apartments = [
    {
      id: 1,
      title: "Luxury 2BR Apartment in Nyarutarama",
      location: "Nyarutarama, Kigali, Rwanda",
      price: 120000,
      rating: 4.8,
      reviews: 124,
      bedrooms: 2,
      bathrooms: 2,
      size: "120 sqm",
      image: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=500&h=300&fit=crop",
      amenities: ["WiFi", "Parking", "Kitchen", "Balcony"],
      isAvailable: true,
      host: "Jean Paul M."
    },
    {
      id: 2,
      title: "Modern Studio in Kigali City Center",
      location: "Kigali City Center, Rwanda",
      price: 85000,
      rating: 4.7,
      reviews: 89,
      bedrooms: 1,
      bathrooms: 1,
      size: "45 sqm",
      image: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=500&h=300&fit=crop",
      amenities: ["WiFi", "Kitchen", "Gym"],
      isAvailable: true,
      host: "Grace N."
    },
    {
      id: 3,
      title: "Cozy 1BR with Mountain View",
      location: "Gisenyi, Rwanda",
      price: 95000,
      rating: 4.6,
      reviews: 67,
      bedrooms: 1,
      bathrooms: 1,
      size: "60 sqm",
      image: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=500&h=300&fit=crop",
      amenities: ["WiFi", "Kitchen", "Mountain View"],
      isAvailable: false,
      host: "Paul R."
    },
    {
      id: 4,
      title: "Spacious 3BR Family Home",
      location: "Huye, Rwanda",
      price: 150000,
      rating: 4.9,
      reviews: 156,
      bedrooms: 3,
      bathrooms: 2,
      size: "180 sqm",
      image: "https://images.unsplash.com/photo-1577495508048-b635879837f1?w=500&h=300&fit=crop",
      amenities: ["WiFi", "Parking", "Kitchen", "Garden", "Pool"],
      isAvailable: true,
      host: "Marie C."
    },
    {
      id: 5,
      title: "Contemporary 2BR in Kimisagara",
      location: "Kimisagara, Kigali, Rwanda",
      price: 75000,
      rating: 4.5,
      reviews: 92,
      bedrooms: 2,
      bathrooms: 1,
      size: "90 sqm",
      image: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=500&h=300&fit=crop",
      amenities: ["WiFi", "Kitchen", "Balcony"],
      isAvailable: true,
      host: "David M."
    },
    {
      id: 6,
      title: "Executive 1BR in Kacyiru",
      location: "Kacyiru, Kigali, Rwanda",
      price: 110000,
      rating: 4.7,
      reviews: 78,
      bedrooms: 1,
      bathrooms: 1,
      size: "55 sqm",
      image: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=500&h=300&fit=crop",
      amenities: ["WiFi", "Parking", "Kitchen", "Concierge"],
      isAvailable: true,
      host: "Sarah K."
    }
  ];

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAmenityToggle = (amenity) => {
    setFilters(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }));
  };

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
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Find Your Perfect Apartment</h1>
              <p className="text-gray-600 mt-1">Discover amazing apartments across Rwanda</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <FaFilter />
                <span>Filters</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <div className={`bg-white rounded-2xl shadow-lg p-6 ${showFilters ? 'block' : 'hidden lg:block'}`}>
              <h3 className="text-lg font-semibold text-gray-800 mb-6">Filters</h3>
              
              {/* Location */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Location</label>
                <div className="relative">
                  <FaMapMarkerAlt className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-600" />
                  <input
                    type="text"
                    placeholder="Enter location"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={filters.location}
                    onChange={(e) => handleFilterChange('location', e.target.value)}
                  />
                </div>
              </div>

              {/* Price Range */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Price Range</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={filters.priceRange}
                  onChange={(e) => handleFilterChange('priceRange', e.target.value)}
                >
                  <option value="">Any Price</option>
                  <option value="0-50000">RWF 0 - 50,000</option>
                  <option value="50000-100000">RWF 50,000 - 100,000</option>
                  <option value="100000-150000">RWF 100,000 - 150,000</option>
                  <option value="150000+">RWF 150,000+</option>
                </select>
              </div>

              {/* Bedrooms */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Bedrooms</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={filters.bedrooms}
                  onChange={(e) => handleFilterChange('bedrooms', e.target.value)}
                >
                  <option value="">Any</option>
                  <option value="1">1 Bedroom</option>
                  <option value="2">2 Bedrooms</option>
                  <option value="3">3 Bedrooms</option>
                  <option value="4+">4+ Bedrooms</option>
                </select>
              </div>

              {/* Amenities */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Amenities</label>
                <div className="space-y-2">
                  {['WiFi', 'Parking', 'Kitchen', 'Balcony', 'Pool', 'Gym'].map((amenity) => (
                    <label key={amenity} className="flex items-center">
                      <input
                        type="checkbox"
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        checked={filters.amenities.includes(amenity)}
                        onChange={() => handleAmenityToggle(amenity)}
                      />
                      <span className="ml-2 text-sm text-gray-700">{amenity}</span>
                    </label>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setFilters({
                  location: '',
                  priceRange: '',
                  bedrooms: '',
                  amenities: [],
                  sortBy: 'price-asc'
                })}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-lg transition-colors"
              >
                Clear All Filters
              </button>
            </div>
          </div>

          {/* Apartments Grid */}
          <div className="lg:col-span-3">
            {/* Sort and Results */}
            <div className="flex items-center justify-between mb-6">
              <p className="text-gray-600">{apartments.length} apartments found</p>
              <div className="flex items-center space-x-2">
                <FaSortAmountDown className="text-gray-400" />
                <select
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={filters.sortBy}
                  onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                >
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="rating-desc">Highest Rated</option>
                  <option value="newest">Newest First</option>
                </select>
              </div>
            </div>

            {/* Apartments Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {apartments.map((apartment, index) => (
                <div
                  key={apartment.id}
                  className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 hover:scale-105"
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
                      <span>{apartment.size}</span>
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

                    {/* Host */}
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm text-gray-600">
                        Hosted by {apartment.host}
                      </span>
                    </div>

                    {/* View Details Button */}
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

            {/* Load More */}
            <div className="text-center mt-12">
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-semibold transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl">
                Load More Apartments
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApartmentsListing;
