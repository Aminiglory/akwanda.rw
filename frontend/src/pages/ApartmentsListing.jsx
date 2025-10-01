import React, { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import {
  FaBed,
  FaBath,
  FaWifi,
  FaCar,
  FaStar,
  FaMapMarkerAlt,
  FaFilter,
  FaSearch,
  FaSortAmountDown,
} from "react-icons/fa";
import toast from "react-hot-toast";
import { useAuth } from "../contexts/AuthContext";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const ApartmentsListing = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [filters, setFilters] = useState({
    location: "",
    priceRange: "",
    bedrooms: "",
    amenities: [],
    sortBy: "price-asc",
  });

  const [showFilters, setShowFilters] = useState(false);
  const [apartments, setApartments] = useState([]);
  const [allApartments, setAllApartments] = useState([]);
  const [loading, setLoading] = useState(true);

  const makeAbsolute = (u) =>
    u && !u.startsWith("http") ? `${API_URL}${u}` : u;

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/properties`, {
          credentials: "include",
        });
        const data = await res.json();
        if (!res.ok)
          throw new Error(data.message || "Failed to load properties");
        const mapped = (data.properties || []).map((p) => ({
          id: p._id,
          title: p.title,
          location: `${p.address}, ${p.city}`,
          price: p.pricePerNight,
          rating: 4.7,
          reviews: 0,
          bedrooms: p.bedrooms ?? 0,
          bathrooms: p.bathrooms ?? 0,
          size: p.size || "—",
          image:
            p.images && p.images.length
              ? makeAbsolute(p.images[0])
              : "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=500&h=300&fit=crop",
          amenities:
            Array.isArray(p.amenities) && p.amenities.length
              ? p.amenities
              : ["WiFi", "Parking", "Kitchen"],
          isAvailable: p.isActive,
          host: p.host ? `${p.host.firstName} ${p.host.lastName}` : "—",
        }));
        setAllApartments(mapped);
        setApartments(mapped);
      } catch (e) {
        toast.error(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleAmenityToggle = (amenity) => {
    setFilters((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter((a) => a !== amenity)
        : [...prev.amenities, amenity],
    }));
  };

  useEffect(() => {
    let list = [...allApartments];
    // Location
    if (filters.location) {
      const q = filters.location.toLowerCase();
      list = list.filter(
        (a) =>
          a.location.toLowerCase().includes(q) ||
          a.title.toLowerCase().includes(q)
      );
    }
    // Price
    if (filters.priceRange) {
      const [minStr, maxStr] = filters.priceRange.split("-");
      const min = Number(minStr || 0);
      const max = maxStr === "+" ? Infinity : Number(maxStr || Infinity);
      list = list.filter((a) => a.price >= min && a.price <= max);
    }
    // Bedrooms
    if (filters.bedrooms) {
      const b = filters.bedrooms === "4+" ? 4 : Number(filters.bedrooms);
      list = list.filter((a) => a.bedrooms >= b);
    }
    // Amenities
    if (filters.amenities.length) {
      list = list.filter((a) =>
        filters.amenities.every((am) => a.amenities.includes(am))
      );
    }
    // Sort
    switch (filters.sortBy) {
      case "price-asc":
        list.sort((x, y) => x.price - y.price);
        break;
      case "price-desc":
        list.sort((x, y) => y.price - x.price);
        break;
      case "newest":
        // not in mapping; keep as-is
        break;
      default:
        break;
    }
    setApartments(list);
  }, [filters, allApartments]);

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <FaStar
        key={i}
        className={`${
          i < Math.floor(rating) ? "text-yellow-400" : "text-gray-300"
        }`}
      />
    ));
  };

  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Find Your Perfect Stay
              </h1>
              <p className="text-gray-600 mt-1">
                Discover amazing apartments across Rwanda
              </p>
            </div>

            {/* Search Bar */}
            <div className="flex items-center w-full lg:w-auto space-x-2">
              <div className="relative flex-1">
                <FaMapMarkerAlt className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-600" />
                <input
                  type="text"
                  placeholder="Search by location..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={filters.location}
                  onChange={(e) =>
                    handleFilterChange("location", e.target.value)
                  }
                />
              </div>
              <button
                onClick={() =>
                  setFilters({ ...filters, location: filters.location })
                }
                className="flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <FaSearch className="mr-2" />
                Search
              </button>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors"
              >
                <FaFilter />
                <span>Filters</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Filters */}
          <div className="lg:col-span-1">
            <div
              className={`bg-white rounded-2xl shadow-lg p-6 ${
                showFilters ? "block" : "hidden lg:block"
              }`}
            >
              <h3 className="text-lg font-semibold text-gray-800 mb-6">
                Filters
              </h3>

              {/* Location inside Filters too */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Location
                </label>
                <div className="relative">
                  <FaMapMarkerAlt className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-600" />
                  <input
                    type="text"
                    placeholder="Enter location"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={filters.location}
                    onChange={(e) =>
                      handleFilterChange("location", e.target.value)
                    }
                  />
                </div>
              </div>

              {/* Price Range */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Price Range
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={filters.priceRange}
                  onChange={(e) =>
                    handleFilterChange("priceRange", e.target.value)
                  }
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
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Bedrooms
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={filters.bedrooms}
                  onChange={(e) =>
                    handleFilterChange("bedrooms", e.target.value)
                  }
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
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Amenities
                </label>
                <div className="space-y-2">
                  {["WiFi", "Parking", "Kitchen", "Balcony", "Pool", "Gym"].map(
                    (amenity) => (
                      <label key={amenity} className="flex items-center">
                        <input
                          type="checkbox"
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          checked={filters.amenities.includes(amenity)}
                          onChange={() => handleAmenityToggle(amenity)}
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          {amenity}
                        </span>
                      </label>
                    )
                  )}
                </div>
              </div>

              <button
                onClick={() =>
                  setFilters({
                    location: "",
                    priceRange: "",
                    bedrooms: "",
                    amenities: [],
                    sortBy: "price-asc",
                  })
                }
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
              <p className="text-gray-600">
                {loading
                  ? "Loading..."
                  : `${apartments.length} apartments found`}
              </p>
              <div className="flex items-center space-x-2">
                <FaSortAmountDown className="text-gray-400" />
                <select
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={filters.sortBy}
                  onChange={(e) => handleFilterChange("sortBy", e.target.value)}
                >
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="rating-desc">Highest Rated</option>
                  <option value="newest">Newest First</option>
                </select>
              </div>
            </div>

            {/* Apartments Cards */}
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

                    {/* View Details */}
                    <Link
                      to={`/apartment/${apartment.id}`}
                      className={`w-full py-3 rounded-xl font-semibold transition-all duration-300 block text-center ${
                        apartment.isAvailable
                          ? "bg-blue-600 hover:bg-blue-700 text-white hover:scale-105"
                          : "bg-gray-300 text-gray-500 cursor-not-allowed"
                      }`}
                    >
                      {apartment.isAvailable ? "View Details" : "Unavailable"}
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
