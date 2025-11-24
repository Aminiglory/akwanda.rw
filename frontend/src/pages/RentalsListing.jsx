import React, { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FaCar,
  FaStar,
  FaMapMarkerAlt,
  FaFilter,
  FaSearch,
  FaSortAmountDown,
} from "react-icons/fa";
import toast from "react-hot-toast";
import { useLocale } from "../contexts/LocaleContext";
import PropertyCard from "../components/PropertyCard";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const RentalsListing = () => {
  const { formatCurrencyRWF } = useLocale() || {};
  const PRICE_STEP = 5000;
  const snapToStep = (v) => Math.max(0, Math.round(Number(v || 0) / PRICE_STEP) * PRICE_STEP);

  const [filters, setFilters] = useState({
    location: "",
    priceMin: 0,
    priceMax: null,
    type: "",
    sortBy: "price-asc",
  });

  const [showFilters, setShowFilters] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [searchHighlight, setSearchHighlight] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  const [loading, setLoading] = useState(true);
  const [fetchTimer, setFetchTimer] = useState(null);
  const [budgetBounds, setBudgetBounds] = useState({ min: 0, max: 2500000 });
  const autoInitPricesRef = useRef(true);
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search || "");
      const q = sp.get("pickupLocation") || sp.get("location") || "";
      const minPrice = sp.get("minPrice");
      const maxPrice = sp.get("maxPrice");
      setFilters((prev) => ({
        ...prev,
        location: q || prev.location,
        priceMin: minPrice != null ? snapToStep(minPrice) : prev.priceMin,
        priceMax:
          maxPrice != null
            ? isNaN(Number(maxPrice))
              ? null
              : snapToStep(maxPrice)
            : prev.priceMax,
      }));
      setSearchHighlight(q || "");
    } catch (_) {}
  }, []);

  const makeAbsolute = (u) => {
    if (!u) return null;
    let s = String(u).trim().replace(/\\+/g, "/");
    if (/^https?:\/\//i.test(s)) return s;
    if (!s.startsWith("/")) s = `/${s}`;
    return `${API_URL}${s}`;
  };

  const fetchVehicles = async (signal) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.location) params.set("location", filters.location);
      if (filters.type) params.set("type", filters.type);
      if (filters.priceMin != null) params.set("minPrice", String(filters.priceMin));
      if (filters.priceMax != null) params.set("maxPrice", String(filters.priceMax));

      const res = await fetch(`${API_URL}/api/cars?${params.toString()}`, { signal });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load vehicles");
      const cars = Array.isArray(data.cars) ? data.cars : [];

      const mapped = cars.map((c) => {
        const firstImg = Array.isArray(c.images) && c.images.length ? makeAbsolute(c.images[0]) : null;
        const pricePerDay = Number(c.pricePerDay || 0);
        return {
          id: c._id || c.id,
          title: c.vehicleName || `${c.brand || ""} ${c.model || ""}`.trim() || "Vehicle",
          location: c.location || "—",
          price: pricePerDay,
          pricePerNight: pricePerDay,
          category: c.vehicleType || c.type || "vehicle",
          rating: Number(c.rating || 0),
          reviews: Number(c.reviews || 0),
          bedrooms: c.capacity || 0,
          bathrooms: 0,
          size: "—",
          image:
            firstImg ||
            "https://images.unsplash.com/photo-1549317336-206569e8475c?w=500&h=300&fit=crop",
          images: Array.isArray(c.images) ? c.images.map(makeAbsolute) : firstImg ? [firstImg] : [],
          amenities: [c.vehicleType || c.type || "vehicle", c.transmission || "", c.fuelType || ""].filter(Boolean),
          isAvailable: c.isAvailable !== false,
          host: c.ownerName || "—",
          hostId: c.ownerId || null,
          href: `/cars/${c._id || c.id}`,
        };
      });

      setVehicles(mapped);

      if (mapped.length) {
        const prices = mapped
          .map((m) => m.price)
          .filter((n) => typeof n === "number" && !isNaN(n));
        if (prices.length) {
          const max = 2500000;
          setBudgetBounds({ min: 0, max });
          setFilters((prev) => {
            if (autoInitPricesRef.current) {
              autoInitPricesRef.current = false;
              const useMin = snapToStep(Math.max(0, prev.priceMin));
              const useMax = prev.priceMax == null ? max : snapToStep(prev.priceMax);
              return {
                ...prev,
                priceMin: Math.max(Math.min(useMin, max - PRICE_STEP), 0),
                priceMax: Math.min(Math.max(useMax, useMin + PRICE_STEP), max),
              };
            }
            return {
              ...prev,
              priceMin: Math.max(Math.min(prev.priceMin, max), 0),
              priceMax:
                prev.priceMax == null
                  ? null
                  : Math.min(
                      Math.max(snapToStep(prev.priceMax), snapToStep(prev.priceMin) + PRICE_STEP),
                      max
                    ),
            };
          });
        }
      }
    } catch (e) {
      if (e.name !== "AbortError") {
        console.error("Failed to fetch vehicles:", e);
        toast.error("Failed to load vehicles. Please try again.");
        setVehicles([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    if (fetchTimer) clearTimeout(fetchTimer);
    const t = setTimeout(() => fetchVehicles(controller.signal), 300);
    setFetchTimer(t);
    return () => {
      controller.abort();
      clearTimeout(t);
    };
  }, [filters.location, filters.priceMin, filters.priceMax, filters.type]);

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  useEffect(() => {
    setVehicles((prev) => {
      const list = [...prev];
      switch (filters.sortBy) {
        case "price-asc":
          list.sort((x, y) => x.price - y.price);
          break;
        case "price-desc":
          list.sort((x, y) => y.price - x.price);
          break;
        case "rating-desc":
          list.sort((x, y) => (Number(y.rating) || 0) - (Number(x.rating) || 0));
          break;
        case "rating-asc":
          list.sort((x, y) => (Number(x.rating) || 0) - (Number(y.rating) || 0));
          break;
        case "name-asc":
          list.sort((x, y) => x.title.localeCompare(y.title));
          break;
        case "name-desc":
          list.sort((x, y) => y.title.localeCompare(x.title));
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
        className={`${i < Math.floor(rating) ? "text-yellow-400" : "text-gray-300"}`}
      />
    ));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 uppercase tracking-wide">
                Find Your Perfect Ride
              </h1>
              <p className="text-gray-600 mt-2 text-lg font-medium">
                Discover vehicle rentals across Rwanda
              </p>
            </div>

            <div className="flex items-center w-full lg:w-auto space-x-2">
              <div className="relative flex-1">
                <FaMapMarkerAlt className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-primary" />
                <input
                  type="text"
                  placeholder="Search by pick-up location..."
                  className="w-full h-10 pl-10 pr-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={filters.location}
                  onChange={(e) => handleFilterChange("location", e.target.value)}
                />
              </div>
              <button
                onClick={() => setFilters({ ...filters, location: filters.location })}
                className="flex items-center btn-primary px-4 py-2 rounded-lg transition-colors"
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

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1">
            <div
              className={`modern-card p-6 ${showFilters ? "block" : "hidden lg:block"}`}
            >
              <h3 className="text-lg font-semibold text-gray-800 mb-6">Filters</h3>

              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Pick-up Location
                </label>
                <div className="relative">
                  <FaMapMarkerAlt className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-blue-600" />
                  <input
                    type="text"
                    placeholder="Enter location"
                    className="w-full h-10 pl-10 pr-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={filters.location}
                    onChange={(e) => handleFilterChange("location", e.target.value)}
                  />
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Budget</label>
                <div className="px-1">
                  <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                    <span>
                      {formatCurrencyRWF
                        ? formatCurrencyRWF(filters.priceMin || 0)
                        : `RWF ${Number(filters.priceMin || 0).toLocaleString()}`}
                    </span>
                    <span>
                      {filters.priceMax == null
                        ? "No max"
                        : formatCurrencyRWF
                        ? formatCurrencyRWF(Number(filters.priceMax) || 0)
                        : `RWF ${Number(filters.priceMax || 0).toLocaleString()}`}
                    </span>
                  </div>
                  <div className="relative h-8">
                    <div
                      className="absolute h-1 bg-blue-500 rounded"
                      style={{
                        top: 14,
                        left: `${((filters.priceMin - budgetBounds.min) / (budgetBounds.max - budgetBounds.min)) * 100}%`,
                        width: `${(((filters.priceMax == null ? budgetBounds.max : filters.priceMax) - filters.priceMin) / (budgetBounds.max - budgetBounds.min)) * 100}%`,
                      }}
                    />
                    <input
                      type="range"
                      min={budgetBounds.min}
                      max={budgetBounds.max}
                      step={PRICE_STEP}
                      value={filters.priceMin}
                      onChange={(e) => {
                        const val = snapToStep(e.target.value);
                        const upper = (filters.priceMax ?? budgetBounds.max) - PRICE_STEP;
                        handleFilterChange("priceMin", Math.min(val, Math.max(upper, budgetBounds.min)));
                      }}
                      className="absolute w-full pointer-events-auto appearance-none bg-transparent z-20 range-thumb-sm"
                      style={{ top: 10 }}
                    />
                    <input
                      type="range"
                      min={budgetBounds.min}
                      max={budgetBounds.max}
                      step={PRICE_STEP}
                      value={filters.priceMax == null ? budgetBounds.max : filters.priceMax}
                      onChange={(e) => {
                        const val = snapToStep(e.target.value);
                        handleFilterChange(
                          "priceMax",
                          Math.max(val, snapToStep(filters.priceMin) + PRICE_STEP)
                        );
                      }}
                      disabled={filters.priceMax == null}
                      className="absolute w-full pointer-events-auto appearance-none bg-transparent disabled:opacity-40 z-10 range-thumb-sm"
                      style={{ top: 16 }}
                    />
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Vehicle Type
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={filters.type}
                  onChange={(e) => handleFilterChange("type", e.target.value)}
                >
                  <option value="">All types</option>
                  <option value="economy">Economy</option>
                  <option value="compact">Compact</option>
                  <option value="mid-size">Mid-size</option>
                  <option value="full-size">Full-size</option>
                  <option value="luxury">Luxury</option>
                  <option value="suv">SUV</option>
                  <option value="minivan">Minivan</option>
                  <option value="motorcycle">Motorcycle</option>
                  <option value="bicycle">Bicycle</option>
                </select>
              </div>

              <button
                onClick={() =>
                  setFilters({
                    location: "",
                    priceMin: 0,
                    priceMax: null,
                    type: "",
                    sortBy: "price-asc",
                  })
                }
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-lg transition-colors"
              >
                Clear All Filters
              </button>
            </div>
          </div>

          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-6">
              <p className="text-gray-600">
                {loading ? "Loading..." : `${vehicles.length} rentals found`}
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
                  <option value="name-asc">Name A-Z</option>
                  <option value="name-desc">Name Z-A</option>
                </select>
                <div className="hidden lg:flex items-center gap-2 ml-4">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`${
                      viewMode === "grid" ? "btn-primary text-white" : "bg-gray-100 text-gray-700"
                    } px-3 py-2 rounded-lg`}
                    title="Grid view"
                  >
                    Grid
                  </button>
                  <button
                    onClick={() => setViewMode("table")}
                    className={`${
                      viewMode === "table" ? "btn-primary text-white" : "bg-gray-100 text-gray-700"
                    } px-3 py-2 rounded-lg`}
                    title="Table view (large screens)"
                  >
                    Table
                  </button>
                </div>
              </div>
            </div>

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
            ) : (
              Object.entries(
                vehicles.reduce((acc, v) => {
                  const key = (v.category || "Other").toString();
                  if (!acc[key]) acc[key] = [];
                  acc[key].push(v);
                  return acc;
                }, {})
              )
                .filter(([_, list]) => list.length > 0)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([category, list]) => (
                  <div key={category} className="mb-10">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </h2>
                    {viewMode === "table" ? (
                      <div className="hidden lg:block overflow-x-auto rounded-xl border border-gray-200">
                        <table className="min-w-full text-sm">
                          <thead className="bg-[var(--ak-secondary-200)] text-gray-700">
                            <tr>
                              <th className="text-left px-4 py-3">Vehicle</th>
                              <th className="text-left px-4 py-3">Location</th>
                              <th className="text-left px-4 py-3">Type</th>
                              <th className="text-left px-4 py-3">Price/day</th>
                              <th className="text-left px-4 py-3">Rating</th>
                              <th className="text-left px-4 py-3">Capacity</th>
                              <th className="text-left px-4 py-3">Status</th>
                              <th className="text-left px-4 py-3">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {list.map((v) => (
                              <tr key={v.id} className="bg-white hover:bg-gray-50">
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-3">
                                    <img
                                      src={v.image}
                                      alt={v.title}
                                      className="w-14 h-14 rounded-lg object-cover"
                                    />
                                    <div>
                                      <Link
                                        to={v.href || `/cars/${v.id}`}
                                        className="font-semibold text-gray-900 hover:underline line-clamp-1"
                                      >
                                        {v.title}
                                      </Link>
                                      <div className="text-xs text-gray-500">
                                        {v.host && `Hosted by ${v.host}`}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-gray-700">{v.location}</td>
                                <td className="px-4 py-3 capitalize text-gray-700">{v.category}</td>
                                <td className="px-4 py-3 font-semibold text-primary-700">
                                  {formatCurrencyRWF
                                    ? formatCurrencyRWF(v.price || 0)
                                    : `RWF ${Number(v.price || 0).toLocaleString()}`}
                                </td>
                                <td className="px-4 py-3 text-gray-700">
                                  {Number(v.rating || 0).toFixed(1)} ({v.reviews})
                                </td>
                                <td className="px-4 py-3 text-gray-700">{v.bedrooms}</td>
                                <td className="px-4 py-3">
                                  <span
                                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                                      v.isAvailable
                                        ? "bg-green-100 text-green-700"
                                        : "bg-red-100 text-red-700"
                                    }`}
                                  >
                                    {v.isAvailable ? "Available" : "Unavailable"}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <Link
                                    to={v.href || `/cars/${v.id}`}
                                    className="btn-primary text-white px-3 py-1.5 rounded-lg"
                                  >
                                    View
                                  </Link>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {list.map((vehicle, index) => (
                          <div
                            key={vehicle.id}
                            className="h-full"
                            style={{ animationDelay: `${index * 0.1}s` }}
                          >
                            <PropertyCard
                              listing={{
                                id: vehicle.id,
                                title: vehicle.title,
                                location: vehicle.location,
                                image:
                                  vehicle.images && vehicle.images.length
                                    ? vehicle.images[0]
                                    : vehicle.image,
                                price: vehicle.pricePerNight || vehicle.price,
                                bedrooms: vehicle.bedrooms,
                                bathrooms: vehicle.bathrooms,
                                area: vehicle.size,
                                status: vehicle.isAvailable ? "active" : "inactive",
                                bookings: vehicle.reviews,
                                host: vehicle.host,
                              }}
                              highlight={searchHighlight}
                              onView={() =>
                                navigate(vehicle.href || `/cars/${vehicle.id}`)
                              }
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RentalsListing;
