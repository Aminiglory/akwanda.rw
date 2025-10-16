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
    priceMin: 0,
    priceMax: 500000,
    bedrooms: "",
    amenities: [],
    sortBy: "price-asc",
    checkIn: "",
    checkOut: "",
    guests: 1,
    propertyType: "",
    rating: "",
    availability: "",
    features: [],
  });

  const [showFilters, setShowFilters] = useState(false);
  const [apartments, setApartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchTimer, setFetchTimer] = useState(null);
  const [budgetBounds, setBudgetBounds] = useState({ min: 0, max: 1000000 });

  const makeAbsolute = (u) => {
    if (!u) return u;
    let s = String(u).replace(/\\/g, '/');
    if (!s.startsWith('http')) {
      if (!s.startsWith('/')) s = `/${s}`;
      return `${API_URL}${s}`;
    }
    return s;
  };

  const isImageUrl = (url) => {
    if (!url) return false;
    const s = String(url).toLowerCase();
    return s.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/);
  };

  const fetchProperties = async (signal) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.location) params.set('q', filters.location);
      if (filters.priceMin != null) params.set('minPrice', String(filters.priceMin));
      if (filters.priceMax != null) params.set('maxPrice', String(filters.priceMax));
      if (filters.bedrooms) params.set('bedrooms', filters.bedrooms);
      if (filters.amenities.length) params.set('amenities', filters.amenities.join(','));
      if (filters.checkIn && filters.checkOut) {
        params.set('startDate', filters.checkIn);
        params.set('endDate', filters.checkOut);
      }
      const res = await fetch(`${API_URL}/api/properties?${params.toString()}`, { credentials: 'include', signal });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to load properties');
      const list = (data.properties || []);
      const mapped = list.map((p) => {
        // choose first valid image (skip videos or invalid)
        let img = undefined;
        if (Array.isArray(p.images) && p.images.length) {
          const firstImg = p.images.find(isImageUrl) || p.images.find(Boolean);
          img = firstImg ? makeAbsolute(firstImg) : undefined;
        }
        return ({
        id: p._id,
        title: p.title,
        location: `${p.address}, ${p.city}`,
        price: p.pricePerNight,
        category: p.category || 'apartment',
        rating: p.ratings?.length ? (p.ratings.reduce((s, r) => s + r.rating, 0) / p.ratings.length).toFixed(1) : 0,
        reviews: p.ratings?.length || 0,
        bedrooms: p.bedrooms ?? 0,
        bathrooms: p.bathrooms ?? 0,
        size: p.size || "—",
        image: img || "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=500&h=300&fit=crop",
        amenities:
          Array.isArray(p.amenities) && p.amenities.length
            ? p.amenities
            : ["WiFi", "Parking", "Kitchen"],
        isAvailable: p.isActive && (!p.rooms || p.rooms.length === 0 || p.rooms.some(room => room.isAvailable !== false)),
        host: p.host ? `${p.host.firstName} ${p.host.lastName}` : "—",
      });
      });
      setApartments(mapped);
      // Auto-scale slider bounds from returned data
      if (mapped.length) {
        const prices = mapped.map(m => m.price).filter(n => typeof n === 'number' && !isNaN(n));
        if (prices.length) {
          const min = Math.max(0, Math.min(...prices));
          const max = Math.max(...prices);
          setBudgetBounds({ min: 0, max: Math.max(max, 100000) });
          // Keep selected range within new bounds but not force to 0 if user selected higher lower-bound
          setFilters(prev => ({
            ...prev,
            priceMin: Math.max(Math.min(prev.priceMin, Math.max(max, 100000)), 0),
            priceMax: Math.min(Math.max(prev.priceMax, prev.priceMin + 5000), Math.max(max, 100000))
          }));
        }
      }
    } catch (e) {
      if (e.name !== 'AbortError') toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    // simple debounce
    if (fetchTimer) clearTimeout(fetchTimer);
    const t = setTimeout(() => fetchProperties(controller.signal), 300);
    setFetchTimer(t);
    return () => {
      controller.abort();
      clearTimeout(t);
    };
  }, [filters.location, filters.priceMin, filters.priceMax, filters.bedrooms, filters.amenities.join(','), filters.checkIn, filters.checkOut]);

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
    // client-side sort only (data is already filtered server-side)
    setApartments((prev) => {
      const list = [...prev];
      switch (filters.sortBy) {
        case 'price-asc':
          list.sort((x, y) => x.price - y.price);
          break;
        case 'price-desc':
          list.sort((x, y) => y.price - x.price);
          break;
        case 'rating-desc':
          list.sort((x, y) => (Number(y.rating) || 0) - (Number(x.rating) || 0));
          break;
        case 'rating-asc':
          list.sort((x, y) => (Number(x.rating) || 0) - (Number(y.rating) || 0));
          break;
        case 'name-asc':
          list.sort((x, y) => x.title.localeCompare(y.title));
          break;
        case 'name-desc':
          list.sort((x, y) => y.title.localeCompare(x.title));
          break;
        case 'newest':
          list.sort((x, y) => new Date(y.createdAt) - new Date(x.createdAt));
          break;
        case 'oldest':
          list.sort((x, y) => new Date(x.createdAt) - new Date(y.createdAt));
          break;
        case 'popular':
          list.sort((x, y) => (y.reviews || 0) - (x.reviews || 0));
          break;
        default:
          break;
      }
      return list;
    });
  }, [filters.sortBy]);

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
              <h1 className="text-4xl font-bold text-gray-900 uppercase tracking-wide">
                FIND YOUR PERFECT STAY
              </h1>
              <p className="text-gray-600 mt-2 text-lg font-medium">
                DISCOVER AMAZING APARTMENTS ACROSS RWANDA
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
              className={`modern-card p-6 ${
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

              {/* Budget Range Slider (Booking.com-like) */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Budget (per night)</label>
                <div className="px-1">
                  <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                    <span>RWF {filters.priceMin.toLocaleString()}</span>
                    <span>RWF {filters.priceMax.toLocaleString()}</span>
                  </div>
                  <div className="relative h-6">
                    <input
                      type="range"
                      min={budgetBounds.min}
                      max={budgetBounds.max}
                      step="5000"
                      value={filters.priceMin}
                      onChange={(e) => handleFilterChange('priceMin', Math.min(Number(e.target.value), filters.priceMax - 5000))}
                      className="absolute w-full pointer-events-auto appearance-none bg-transparent"
                      style={{ top: 12 }}
                    />
                    <input
                      type="range"
                      min={budgetBounds.min}
                      max={budgetBounds.max}
                      step="5000"
                      value={filters.priceMax}
                      onChange={(e) => handleFilterChange('priceMax', Math.max(Number(e.target.value), filters.priceMin + 5000))}
                      className="absolute w-full pointer-events-auto appearance-none bg-transparent"
                      style={{ top: 12 }}
                    />
                  </div>
                  {/* Slider auto-scales bounds based on results; no extra inputs required */}
                </div>
              </div>

              {/* Dates & Guests */}
              <div className="mb-6 grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Check-in</label>
                  <input type="date" className="w-full px-3 py-2 border rounded-lg"
                    value={filters.checkIn}
                    onChange={(e) => handleFilterChange('checkIn', e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Check-out</label>
                  <input type="date" className="w-full px-3 py-2 border rounded-lg"
                    min={filters.checkIn || undefined}
                    value={filters.checkOut}
                    onChange={(e) => handleFilterChange('checkOut', e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Guests</label>
                  <select className="w-full px-3 py-2 border rounded-lg" value={filters.guests}
                    onChange={(e) => handleFilterChange('guests', Number(e.target.value))}>
                    {Array.from({ length: 10 }, (_, i) => (
                      <option key={i+1} value={i+1}>{i+1} {i===0?'Guest':'Guests'}</option>
                    ))}
                  </select>
                </div>
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
                    priceMin: 0,
                    priceMax: 500000,
                    bedrooms: "",
                    amenities: [],
                    sortBy: "price-asc",
                    checkIn: "",
                    checkOut: "",
                    guests: 1,
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
                {loading ? "Loading..." : `${apartments.length} stays found`}
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
              {loading ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="modern-card-elevated overflow-hidden">
                    <div className="h-48 bg-gray-200 animate-pulse" />
                    <div className="p-6 space-y-3">
                      <div className="h-5 bg-gray-200 rounded w-2/3 animate-pulse" />
                      <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse" />
                      <div className="h-4 bg-gray-200 rounded w-1/3 animate-pulse" />
                      <div className="h-8 bg-gray-200 rounded w-full animate-pulse" />
                    </div>
                  </div>
                ))
              ) : (
              apartments.map((apartment, index) => (
                <div
                  key={apartment.id}
                  className="modern-card-elevated overflow-hidden hover:scale-105 transition-all duration-300"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  {/* Image */}
                  <div className="relative h-48 overflow-hidden">
                    <img
                      loading="lazy"
                      src={apartment.image}
                      alt={apartment.title}
                      className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=500&h=300&fit=crop';
                      }}
                    />
                    {!apartment.isAvailable && (
                      <div className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                        Unavailable
                      </div>
                    )}
                    <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 text-sm font-semibold text-gray-800">
                      RWF {apartment.price.toLocaleString()}/month
                    </div>
                    <div className="absolute bottom-4 left-4 bg-gray-800/80 text-white px-2 py-0.5 rounded text-xs font-medium">
                      {apartment.category.charAt(0).toUpperCase() + apartment.category.slice(1)}
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
              ))
              )}
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
