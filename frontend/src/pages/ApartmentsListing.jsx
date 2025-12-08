import React, { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
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
  FaDollarSign,
} from "react-icons/fa";
import toast from "react-hot-toast";
// Auth not required to view listings
import { safeApiGet, apiGet } from "../utils/apiUtils";
import PropertyCard from "../components/PropertyCard";
import { useLocale } from "../contexts/LocaleContext";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const ApartmentsListing = () => {
  const { formatCurrencyRWF } = useLocale() || {};
  const PRICE_STEP = 5000;
  const snapToStep = (v) => Math.max(0, Math.round(Number(v || 0) / PRICE_STEP) * PRICE_STEP);
  // Viewing listings is public; booking will require login on the booking flow
  const [filters, setFilters] = useState({
    location: "",
    priceMin: 0,
    priceMax: null,
    bedrooms: "",
    amenities: [],
    sortBy: "price-asc",
    checkIn: "",
    checkOut: "",
    guests: 1,
    category: "",
    rating: "",
    availability: "",
    features: [],
  });

  const [showFilters, setShowFilters] = useState(false);
  const [apartments, setApartments] = useState([]);
  const [searchHighlight, setSearchHighlight] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'
  const [loading, setLoading] = useState(true);
  const [fetchTimer, setFetchTimer] = useState(null);
  const [budgetBounds, setBudgetBounds] = useState({ min: 0, max: 2500000 });
  const autoInitPricesRef = useRef(true);

  // Initialize filters from URL query params (q, startDate, endDate, guests)
  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search || '');
      const q = sp.get('q') || '';
      const startDate = sp.get('startDate') || '';
      const endDate = sp.get('endDate') || '';
      const guests = sp.get('guests');
      const minPrice = sp.get('minPrice');
      const maxPrice = sp.get('maxPrice');
      setFilters(prev => ({
        ...prev,
        location: q || prev.location,
        checkIn: startDate || prev.checkIn,
        checkOut: endDate || prev.checkOut,
        guests: guests ? Number(guests) || prev.guests : prev.guests,
        priceMin: minPrice != null ? snapToStep(minPrice) : prev.priceMin,
        priceMax: maxPrice != null ? (isNaN(Number(maxPrice)) ? null : snapToStep(maxPrice)) : prev.priceMax,
      }));
      setSearchHighlight(q || '');
    } catch (_) {}
  }, []);

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
      // Only send maxPrice if a maximum is selected
      if (filters.priceMax != null) params.set('maxPrice', String(filters.priceMax));
      if (filters.bedrooms) params.set('bedrooms', filters.bedrooms);
      if (filters.amenities.length) params.set('amenities', filters.amenities.join(','));
      if (filters.category) params.set('category', filters.category);
      if (filters.checkIn && filters.checkOut) {
        params.set('startDate', filters.checkIn);
        params.set('endDate', filters.checkOut);
      }
      
      // Use enhanced API utilities with retry logic and error handling
      const data = await safeApiGet(
        `/api/properties?${params.toString()}`,
        { properties: [] },
        { signal, timeout: 15000 }
      );
      
      const list = (data.properties || []);
      const mapped = list.map((p) => {
        // choose first valid image (skip videos or invalid)
        let img = undefined;
        if (Array.isArray(p.images) && p.images.length) {
          const firstImg = p.images.find(isImageUrl) || p.images.find(Boolean);
          img = firstImg ? makeAbsolute(firstImg) : undefined;
        }
        const pricePerNight = p.pricePerNight || p.price || 0;
        const hasBreakfastIncluded = (
          Array.isArray(p.amenities) && p.amenities.includes('breakfast')
        ) || (
          Array.isArray(p.addOnServices) &&
          p.addOnServices.some(s => s && s.key === 'breakfast' && s.enabled && Number(s.price || 0) === 0)
        );
        const rooms = Array.isArray(p.rooms) ? p.rooms : [];
        const totalRooms = rooms.length;
        const availableRooms = rooms.filter(r => r.isAvailable !== false).length;

        return ({
          id: p._id,
          title: p.title,
          location: `${p.address}, ${p.city}`,
          price: pricePerNight,
          pricePerNight: pricePerNight,
          category: p.category || 'apartment',
          rating: p.ratings?.length ? (p.ratings.reduce((s, r) => s + r.rating, 0) / p.ratings.length).toFixed(1) : 0,
          reviews: p.ratings?.length || 0,
          viewCount: p.viewCount || 0,
          bedrooms: p.bedrooms ?? 0,
          bathrooms: p.bathrooms ?? 0,
          size: p.size || "—",
          image: img || "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=500&h=300&fit=crop",
          images: Array.isArray(p.images) ? p.images.map(makeAbsolute) : (img ? [img] : []),
          amenities:
            Array.isArray(p.amenities) && p.amenities.length
              ? p.amenities
              : ["WiFi", "Parking", "Kitchen"],
          rooms,
          totalRooms,
          availableRooms,
          hasBreakfastIncluded,
          isAvailable: p.isActive && (totalRooms === 0 || availableRooms > 0),
          host: p.host ? `${p.host.firstName || ''} ${p.host.lastName || ''}`.trim() : "—",
          hostId: p.host?._id || p.host?.id || null,
          isPremium: !!(p.isPremium || (p.commissionLevel && p.commissionLevel.isPremium)),
        });
      });
      // Only use stay properties for this page; do not mix in vehicles/cars
      const filtered = mapped.filter((p) => !['cars', 'car', 'vehicle', 'vehicles'].includes(String(p.category || '').toLowerCase()));
      setApartments(filtered);
      
      // Auto-scale slider bounds from returned data
      if (mapped.length) {
        const prices = mapped.map(m => m.price).filter(n => typeof n === 'number' && !isNaN(n));
        if (prices.length) {
          const min = Math.max(0, snapToStep(Math.min(...prices)));
          const max = 2500000; // Fixed upper bound
          setBudgetBounds({ min: 0, max });
          // Initialize handles only once: start min at 0 by default (unless URL provided values), max at data max
          setFilters(prev => {
            if (autoInitPricesRef.current) {
              autoInitPricesRef.current = false;
              const useMin = snapToStep(Math.max(0, prev.priceMin)); // keep 0 as default starting point
              const useMax = prev.priceMax == null ? max : snapToStep(prev.priceMax);
              return {
                ...prev,
                priceMin: Math.max(Math.min(useMin, max - PRICE_STEP), 0),
                priceMax: Math.min(Math.max(useMax, useMin + PRICE_STEP), max)
              };
            }
            // Keep selected range within new bounds. If no max selected (null), keep it null.
            return {
              ...prev,
              priceMin: Math.max(Math.min(prev.priceMin, max), 0),
              priceMax: prev.priceMax == null
                ? null
                : Math.min(Math.max(snapToStep(prev.priceMax), snapToStep(prev.priceMin) + PRICE_STEP), max)
            };
          });
        }
      }
    } catch (e) {
      if (e.name !== 'AbortError') {
        console.error('Failed to fetch properties:', e);
        toast.error('Failed to load properties. Please try again.');
        // Set empty array as fallback
        setApartments([]);
      }
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
  }, [filters.location, filters.priceMin, filters.priceMax, filters.bedrooms, filters.amenities.join(','), filters.category, filters.checkIn, filters.checkOut]);

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

  // Do not gate this page by authentication; allow guest browsing

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Modern Header with Gradient */}
      <div className="relative bg-gradient-to-r from-[#a06b42] via-[#8f5a32] to-[#a06b42] shadow-xl overflow-hidden">
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }}
        ></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="text-white">
              <h1 className="text-3xl md:text-5xl font-bold mb-3 drop-shadow-lg">
                Find Your Perfect Stay
              </h1>
              <p className="text-lg md:text-xl text-white/90 font-medium">
                Discover Amazing Stays Across Rwanda
              </p>
            </div>

            {/* Modern Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
              <div className="search-input-with-icon relative flex-1 bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg">
                <FaMapMarkerAlt className="input-icon text-[#a06b42] text-lg" />
                <input
                  type="text"
                  placeholder="Search by location, city..."
                  className="w-full h-12 pr-4 bg-transparent border-none outline-none text-gray-900 placeholder:text-gray-400 text-base"
                  value={filters.location}
                  onChange={(e) => handleFilterChange("location", e.target.value)}
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="px-6 py-3 bg-white/10 backdrop-blur-sm text-white rounded-2xl hover:bg-white/20 font-semibold flex items-center justify-center gap-2 border border-white/20 transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                <FaFilter className="text-lg" />
                <span>Filters</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 md:gap-8">
          {/* Modern Sidebar Filters */}
          <div className={`lg:col-span-1 transition-all duration-300 ${showFilters ? "block" : "hidden lg:block"}`}>
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100 sticky top-24">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <FaFilter className="text-[#a06b42]" />
                  <span>Filters</span>
                </h3>
                <button
                  onClick={() => setShowFilters(false)}
                  className="lg:hidden text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              {/* Location Filter */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <FaMapMarkerAlt className="text-[#a06b42]" />
                  <span>Location</span>
                </label>
                <div className="search-input-with-icon relative">
                  <FaMapMarkerAlt className="input-icon text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Enter location"
                    className="w-full h-12 pr-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#a06b42] focus:border-[#a06b42] transition-all duration-300"
                    value={filters.location}
                    onChange={(e) =>
                      handleFilterChange("location", e.target.value)
                    }
                  />
                </div>
              </div>

              {/* Modern Budget Range Slider */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <FaDollarSign className="text-[#a06b42]" />
                  <span>Budget Range</span>
                </label>
                <div className="px-1">
                  <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                    <span>{formatCurrencyRWF ? formatCurrencyRWF(filters.priceMin || 0) : `RWF ${Number(filters.priceMin || 0).toLocaleString()}`}</span>
                    <span>{filters.priceMax == null ? 'No max' : (formatCurrencyRWF ? formatCurrencyRWF(Number(filters.priceMax) || 0) : `RWF ${Number(filters.priceMax || 0).toLocaleString()}`)}</span>
                  </div>
                  <div className="relative h-8">
                    {/* Selected range track */}
                    <div
                      className="absolute h-1 bg-blue-500 rounded"
                      style={{
                        top: 14,
                        left: `${((filters.priceMin - budgetBounds.min) / (budgetBounds.max - budgetBounds.min)) * 100}%`,
                        width: `${(((filters.priceMax == null ? budgetBounds.max : filters.priceMax) - filters.priceMin) / (budgetBounds.max - budgetBounds.min)) * 100}%`
                      }}
                    />
                    <input
                      type="range"
                      min={budgetBounds.min}
                      max={budgetBounds.max}
                      step={PRICE_STEP}
                      list="budget-ticks"
                      value={filters.priceMin}
                      onChange={(e) => {
                        const val = snapToStep(e.target.value);
                        const upper = (filters.priceMax ?? budgetBounds.max) - PRICE_STEP;
                        handleFilterChange('priceMin', Math.min(val, Math.max(upper, budgetBounds.min)));
                      }}
                      className="absolute w-full pointer-events-auto appearance-none bg-transparent z-20 range-thumb-sm"
                      style={{ top: 10 }}
                    />
                    <input
                      type="range"
                      min={budgetBounds.min}
                      max={budgetBounds.max}
                      step={PRICE_STEP}
                      list="budget-ticks"
                      value={filters.priceMax == null ? budgetBounds.max : filters.priceMax}
                      onChange={(e) => {
                        const val = snapToStep(e.target.value);
                        handleFilterChange('priceMax', Math.max(val, snapToStep(filters.priceMin) + PRICE_STEP));
                      }}
                      disabled={filters.priceMax == null}
                      className="absolute w-full pointer-events-auto appearance-none bg-transparent disabled:opacity-40 z-10 range-thumb-sm"
                      style={{ top: 16 }}
                    />
                  </div>
                  {/* Tick marks (may not be supported in all browsers) */}
                  <datalist id="budget-ticks">
                    {Array.from({ length: Math.floor(budgetBounds.max / 50000) + 1 }, (_, i) => (
                      <option key={i} value={i * 50000} />
                    ))}
                  </datalist>
                  {/* Fine controls */}
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        className="px-2 py-1 bg-gray-100 rounded hover:bg-gray-200"
                        onClick={() => {
                          const next = snapToStep(filters.priceMin - PRICE_STEP);
                          handleFilterChange('priceMin', Math.max(0, next));
                        }}
                        aria-label="Decrease minimum budget"
                      >−</button>
                      <button
                        type="button"
                        className="px-2 py-1 bg-gray-100 rounded hover:bg-gray-200"
                        onClick={() => {
                          const upper = (filters.priceMax ?? budgetBounds.max) - PRICE_STEP;
                          const next = snapToStep(filters.priceMin + PRICE_STEP);
                          handleFilterChange('priceMin', Math.min(next, Math.max(upper, budgetBounds.min)));
                        }}
                        aria-label="Increase minimum budget"
                      >+</button>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        className="px-2 py-1 bg-gray-100 rounded hover:bg-gray-200"
                        disabled={filters.priceMax == null}
                        onClick={() => {
                          if (filters.priceMax == null) return;
                          const lower = snapToStep(filters.priceMin) + PRICE_STEP;
                          const next = snapToStep((filters.priceMax || budgetBounds.max) - PRICE_STEP);
                          handleFilterChange('priceMax', Math.max(next, lower));
                        }}
                        aria-label="Decrease maximum budget"
                      >−</button>
                      <button
                        type="button"
                        className="px-2 py-1 bg-gray-100 rounded hover:bg-gray-200"
                        disabled={filters.priceMax == null}
                        onClick={() => {
                          if (filters.priceMax == null) return;
                          const next = snapToStep((filters.priceMax || budgetBounds.max) + PRICE_STEP);
                          handleFilterChange('priceMax', Math.min(next, budgetBounds.max));
                        }}
                        aria-label="Increase maximum budget"
                      >+</button>
                    </div>
                  </div>
                  {/* Unlimited max toggle */}
                  <div className="mt-2 flex items-center gap-2 text-sm">
                    <input
                      id="no-max-price"
                      type="checkbox"
                      className="h-4 w-4"
                      checked={filters.priceMax == null}
                      onChange={(e) => {
                        if (e.target.checked) {
                          handleFilterChange('priceMax', null);
                        } else {
                          // Restore to current upper bound when toggled off
                          handleFilterChange('priceMax', Math.max(filters.priceMin + 5000, budgetBounds.max));
                        }
                      }}
                    />
                    <label htmlFor="no-max-price" className="text-gray-700">No maximum price</label>
                  </div>
                </div>
              </div>

              {/* Dates & Guests */}
              <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
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

              {/* Property Category */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Property Type
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={filters.category}
                  onChange={(e) =>
                    handleFilterChange("category", e.target.value)
                  }
                >
                  <option value="">All Types</option>
                  <option value="apartment">Apartment</option>
                  <option value="hotel">Hotel</option>
                  <option value="villa">Villa</option>
                  <option value="hostel">Hostel</option>
                  <option value="resort">Resort</option>
                  <option value="guesthouse">Guesthouse</option>
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
                    priceMax: null,
                    bedrooms: "",
                    amenities: [],
                    sortBy: "price-asc",
                    checkIn: "",
                    checkOut: "",
                    guests: 1,
                  })
                }
                className="w-full bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-700 py-3 rounded-xl font-semibold transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105"
              >
                Clear All Filters
              </button>
            </div>
          </div>

          {/* Modern Apartments Grid */}
          <div className="lg:col-span-3">
            {/* Modern Sort and Results Header */}
            <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6 mb-6 border border-gray-100">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <p className="text-lg font-bold text-gray-900">
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="animate-spin rounded-full h-4 w-4 border-2 border-[#a06b42] border-t-transparent"></span>
                        Loading...
                      </span>
                    ) : (
                      <span className="text-[#a06b42]">{apartments.length}</span>
                    )}
                    <span className="text-gray-600 ml-2">stays found</span>
                  </p>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <div className="relative flex-1 sm:flex-initial">
                    <FaSortAmountDown className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a06b42] pointer-events-none" />
                    <select
                      className="w-full sm:w-auto pl-10 pr-8 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#a06b42] focus:border-[#a06b42] bg-white font-medium text-gray-700 transition-all duration-300 appearance-none cursor-pointer"
                      value={filters.sortBy}
                      onChange={(e) => handleFilterChange("sortBy", e.target.value)}
                    >
                      <option value="price-asc">Price: Low to High</option>
                      <option value="price-desc">Price: High to Low</option>
                      <option value="rating-desc">Highest Rated</option>
                      <option value="newest">Newest First</option>
                    </select>
                  </div>
                  {/* Modern View mode toggle */}
                  <div className="hidden lg:flex items-center gap-2 bg-gray-100 rounded-xl p-1">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`px-4 py-2 rounded-lg font-semibold transition-all duration-300 ${
                        viewMode==='grid' 
                          ? 'bg-gradient-to-r from-[#a06b42] to-[#8f5a32] text-white shadow-md' 
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                      title="Grid view"
                    >
                      Grid
                    </button>
                    <button
                      onClick={() => setViewMode('table')}
                      className={`px-4 py-2 rounded-lg font-semibold transition-all duration-300 ${
                        viewMode==='table' 
                          ? 'bg-gradient-to-r from-[#a06b42] to-[#8f5a32] text-white shadow-md' 
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                      title="Table view"
                    >
                      Table
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Apartments list (no category grouping) */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="modern-card-elevated overflow-hidden">
                    <div className="h-48 bg-gray-200 animate-pulse" />
                    <div className="p-6 space-y-3">
                      <div className="h-5 bg-gray-200 rounded w-2/3 animate-pulse" />
                      <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse" />
                      <div className="h-4 bg-gray-200 rounded w-1/3 animate-pulse" />
                      <div className="h-8 bg-gray-200 rounded w-full animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : viewMode === 'table' ? (
              <div className="hidden lg:block overflow-x-auto rounded-xl border border-gray-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-[var(--ak-secondary-200)] text-gray-700">
                    <tr>
                      <th className="text-left px-4 py-3">Property</th>
                      <th className="text-left px-4 py-3">Location</th>
                      <th className="text-left px-4 py-3">Type</th>
                      <th className="text-left px-4 py-3">Price/night</th>
                      <th className="text-left px-4 py-3">Rating</th>
                      <th className="text-left px-4 py-3">BR</th>
                      <th className="text-left px-4 py-3">Bath</th>
                      <th className="text-left px-4 py-3">Status</th>
                      <th className="text-left px-4 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {apartments.map((a) => (
                      <tr key={a.id} className="bg-white hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <img src={a.image} alt={a.title} className="w-14 h-14 rounded-lg object-cover" />
                            <div>
                              <Link to={`/apartment/${a.id}`} className="font-semibold text-gray-900 hover:underline line-clamp-1">{a.title}</Link>
                              <div className="text-xs text-gray-500">Hosted by {a.host}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-700">{a.location}</td>
                        <td className="px-4 py-3 capitalize text-gray-700">{a.category}</td>
                        <td className="px-4 py-3 font-semibold text-primary-700">{formatCurrencyRWF ? formatCurrencyRWF(a.price || 0) : `RWF ${Number(a.price || 0).toLocaleString()}`}</td>
                        <td className="px-4 py-3 text-gray-700">{Number(a.rating || 0).toFixed(1)} ({a.reviews})</td>
                        <td className="px-4 py-3 text-gray-700">{a.bedrooms}</td>
                        <td className="px-4 py-3 text-gray-700">{a.bathrooms}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${a.isAvailable ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {a.isAvailable ? 'Available' : 'Unavailable'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Link to={`/apartment/${a.id}`} className="btn-primary text-white px-3 py-1.5 rounded-lg">View</Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {apartments.map((apartment, index) => (
                  <div
                    key={apartment.id}
                    className="h-full"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <PropertyCard
                      listing={{
                        ...apartment,
                        image: (apartment.images && apartment.images.length ? apartment.images[0] : apartment.image),
                        price: apartment.pricePerNight || apartment.price,
                        status: apartment.isAvailable ? 'active' : 'inactive',
                      }}
                      highlight={searchHighlight}
                      onView={() => (window.location.href = apartment.href || `/apartment/${apartment.id}`)}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Load More */}
            <div className="text-center mt-12">
              <button className="btn-primary text-white px-8 py-3 rounded-xl font-semibold transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl">
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
