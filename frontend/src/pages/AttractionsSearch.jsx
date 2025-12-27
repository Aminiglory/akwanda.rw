import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FaMapMarkerAlt,
  FaFilter,
  FaSortAmountDown,
  FaDollarSign,
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import PropertyCard from '../components/PropertyCard';
import { useLocale } from '../contexts/LocaleContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function AttractionsSearch() {
  const { formatCurrencyRWF } = useLocale() || {};

  const [filters, setFilters] = useState({
    location: '',
    city: '',
    country: '',
    category: '',
    sortBy: 'recommended',
    priceMin: 0,
    priceMax: null,
    visitDate: '',
    timeSlot: '',
    tickets: 1,
  });

  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [availabilityCache, setAvailabilityCache] = useState({});
  const fetchTimer = useRef(null);

  const PRICE_STEP = 5000;
  const snapToStep = (v) => Math.max(0, Math.round(Number(v || 0) / PRICE_STEP) * PRICE_STEP);

  const makeAbsolute = (u) => {
    if (!u) return null;
    let s = String(u).trim().replace(/\\+/g, '/');
    if (/^https?:\/\//i.test(s)) return s;
    if (!s.startsWith('/')) s = `/${s}`;
    return `${API_URL}${s}`;
  };

  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search || '');
      const q = sp.get('q') || '';
      const city = sp.get('city') || '';
      const country = sp.get('country') || '';
      const category = sp.get('category') || '';
      const visitDate = sp.get('visitDate') || '';
      const timeSlot = sp.get('timeSlot') || '';
      const tickets = sp.get('tickets');
      const minPrice = sp.get('minPrice');
      const maxPrice = sp.get('maxPrice');
      setFilters((prev) => ({
        ...prev,
        location: q || prev.location,
        city: city || prev.city,
        country: country || prev.country,
        category: category || prev.category,
        visitDate: visitDate || prev.visitDate,
        timeSlot: timeSlot || prev.timeSlot,
        tickets: tickets ? Math.max(1, Number(tickets) || 1) : prev.tickets,
        priceMin: minPrice != null ? snapToStep(minPrice) : prev.priceMin,
        priceMax: maxPrice != null ? (Number.isFinite(Number(maxPrice)) ? snapToStep(maxPrice) : null) : prev.priceMax,
      }));
    } catch (_) {
      // ignore
    }
  }, []);

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const fetchAttractions = async (signal) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.location) params.set('q', filters.location);
      if (filters.city) params.set('city', filters.city);
      if (filters.country) params.set('country', filters.country);
      if (filters.category) params.set('category', filters.category);

      const res = await fetch(`${API_URL}/api/attractions?${params.toString()}`, { signal, credentials: 'include' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Failed to load attractions');
      const list = Array.isArray(data?.attractions) ? data.attractions : [];

      // local price filter (backend doesn't support price filtering)
      const min = Number(filters.priceMin || 0);
      const max = filters.priceMax == null ? null : Number(filters.priceMax || 0);
      const filtered = list.filter((a) => {
        const p = Number(a?.price || 0);
        if (p < min) return false;
        if (max != null && p > max) return false;
        return true;
      });

      setItems(filtered);
    } catch (e) {
      if (e?.name !== 'AbortError') {
        console.error('[AttractionsSearch] fetchAttractions failed', e);
        toast.error(e?.message || 'Failed to load attractions');
        setItems([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    if (fetchTimer.current) clearTimeout(fetchTimer.current);
    fetchTimer.current = setTimeout(() => fetchAttractions(controller.signal), 250);
    return () => {
      controller.abort();
      if (fetchTimer.current) clearTimeout(fetchTimer.current);
    };
  }, [
    filters.location,
    filters.city,
    filters.country,
    filters.category,
    filters.priceMin,
    filters.priceMax,
  ]);

  const sortedItems = useMemo(() => {
    const list = Array.isArray(items) ? [...items] : [];
    const sortBy = String(filters.sortBy || '').toLowerCase();
    if (sortBy === 'price-asc') list.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
    if (sortBy === 'price-desc') list.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
    if (sortBy === 'newest') list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return list;
  }, [items, filters.sortBy]);

  // Availability filtering: only when user provides visitDate and tickets.
  useEffect(() => {
    async function hydrateAvailability() {
      if (!filters.visitDate) return;
      const qty = Math.max(1, Number(filters.tickets || 1));
      const slot = String(filters.timeSlot || '').trim();

      const pending = sortedItems
        .map((a) => a?._id)
        .filter(Boolean)
        .filter((id) => {
          const key = `${id}|${filters.visitDate}|${slot}|${qty}`;
          return availabilityCache[key] == null;
        });

      if (pending.length === 0) return;

      const next = { ...availabilityCache };
      await Promise.all(
        pending.slice(0, 12).map(async (id) => {
          const key = `${id}|${filters.visitDate}|${slot}|${qty}`;
          try {
            const res = await fetch(`${API_URL}/api/attractions/${encodeURIComponent(String(id))}/availability`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ visitDate: filters.visitDate, tickets: qty, timeSlot: slot }),
            });
            const data = await res.json().catch(() => ({}));
            next[key] = data;
          } catch (_) {
            next[key] = { available: false };
          }
        })
      );

      setAvailabilityCache(next);
    }

    hydrateAvailability();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortedItems, filters.visitDate, filters.timeSlot, filters.tickets]);

  const availabilityFilteredItems = useMemo(() => {
    if (!filters.visitDate) return sortedItems;
    const qty = Math.max(1, Number(filters.tickets || 1));
    const slot = String(filters.timeSlot || '').trim();
    return sortedItems.filter((a) => {
      const id = a?._id;
      if (!id) return false;
      const key = `${id}|${filters.visitDate}|${slot}|${qty}`;
      const r = availabilityCache[key];
      if (r == null) return true; // show while pending
      // If attraction has slots but slot is missing, backend returns slot_required. In that case, do not hide the attraction; user needs to pick a slot.
      if (r?.reason === 'slot_required') return true;
      // If a slot is provided (or attraction doesn't require slots), filter by availability
      return !!r?.available;
    });
  }, [sortedItems, availabilityCache, filters.visitDate, filters.timeSlot, filters.tickets]);

  const categories = useMemo(() => {
    const all = new Set();
    availabilityFilteredItems.forEach((a) => {
      const c = String(a?.category || '').trim();
      if (c) all.add(c);
    });
    return Array.from(all.values()).sort((x, y) => x.localeCompare(y));
  }, [availabilityFilteredItems]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <div className="relative bg-gradient-to-r from-[#a06b42] via-[#8f5a32] to-[#a06b42] shadow-xl overflow-hidden">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
          }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="text-white">
              <h1 className="text-3xl md:text-5xl font-bold mb-3 drop-shadow-lg">Find Your Perfect Attraction</h1>
              <p className="text-lg md:text-xl text-white/90 font-medium">Discover amazing experiences across Rwanda</p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
              <div className="search-input-with-icon relative flex-1 bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg">
                <FaMapMarkerAlt className="input-icon text-[#a06b42] text-lg" />
                <input
                  type="text"
                  placeholder="Search by location, city..."
                  className="w-full h-12 pr-4 bg-transparent border-none outline-none text-gray-900 placeholder:text-gray-400 text-base"
                  value={filters.location}
                  onChange={(e) => handleFilterChange('location', e.target.value)}
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 md:gap-8">
          <div className={`lg:col-span-1 transition-all duration-300 ${showFilters ? 'block' : 'hidden lg:block'}`}>
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100 sticky top-24">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <FaFilter className="text-[#a06b42]" />
                  <span>Filters</span>
                </h3>
                <button onClick={() => setShowFilters(false)} className="lg:hidden text-gray-400 hover:text-gray-600">
                  ×
                </button>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <FaMapMarkerAlt className="text-[#a06b42]" />
                  <span>Location</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter location"
                  className="w-full h-12 px-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#a06b42] focus:border-[#a06b42] transition-all duration-300"
                  value={filters.location}
                  onChange={(e) => handleFilterChange('location', e.target.value)}
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-3">Visit date</label>
                <input
                  type="date"
                  className="w-full h-12 px-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#a06b42] focus:border-[#a06b42] transition-all duration-300"
                  value={filters.visitDate}
                  onChange={(e) => handleFilterChange('visitDate', e.target.value)}
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-3">Time slot (optional)</label>
                <input
                  type="time"
                  className="w-full h-12 px-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#a06b42] focus:border-[#a06b42] transition-all duration-300"
                  value={filters.timeSlot}
                  onChange={(e) => handleFilterChange('timeSlot', e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-2">If the attraction requires slots, you can pick one after opening a specific attraction.</p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-3">People</label>
                <input
                  type="number"
                  min={1}
                  className="w-full h-12 px-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#a06b42] focus:border-[#a06b42] transition-all duration-300"
                  value={filters.tickets}
                  onChange={(e) => handleFilterChange('tickets', Math.max(1, Number(e.target.value) || 1))}
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <FaDollarSign className="text-[#a06b42]" />
                  <span>Budget Range</span>
                </label>
                <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
                  <span>{formatCurrencyRWF ? formatCurrencyRWF(filters.priceMin || 0) : `RWF ${Number(filters.priceMin || 0).toLocaleString()}`}</span>
                  <span>
                    {filters.priceMax == null
                      ? 'No max'
                      : formatCurrencyRWF
                        ? formatCurrencyRWF(Number(filters.priceMax) || 0)
                        : `RWF ${Number(filters.priceMax || 0).toLocaleString()}`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={0}
                    max={2500000}
                    step={PRICE_STEP}
                    value={filters.priceMin}
                    onChange={(e) => handleFilterChange('priceMin', snapToStep(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    className={`px-3 py-1 rounded-lg border text-xs ${filters.priceMax == null ? 'bg-[#a06b42] text-white border-[#a06b42]' : 'bg-white text-gray-700 border-gray-200'}`}
                    onClick={() => handleFilterChange('priceMax', null)}
                  >
                    No max
                  </button>
                  <button
                    type="button"
                    className={`px-3 py-1 rounded-lg border text-xs ${filters.priceMax != null ? 'bg-[#a06b42] text-white border-[#a06b42]' : 'bg-white text-gray-700 border-gray-200'}`}
                    onClick={() => handleFilterChange('priceMax', 2500000)}
                  >
                    Set max
                  </button>
                </div>
              </div>

              <div className="mb-2">
                <label className="block text-sm font-semibold text-gray-700 mb-3">Category</label>
                <select
                  className="w-full h-12 px-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#a06b42] focus:border-[#a06b42] transition-all duration-300 bg-white"
                  value={filters.category}
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                >
                  <option value="">All</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100 mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <div className="text-sm text-gray-600">
                    {loading ? 'Loading…' : `${availabilityFilteredItems.length} attractions found`}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <FaSortAmountDown className="text-[#a06b42]" />
                    <select
                      className="px-4 py-2 border-2 border-gray-200 rounded-xl bg-white"
                      value={filters.sortBy}
                      onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                    >
                      <option value="recommended">Recommended</option>
                      <option value="newest">Newest</option>
                      <option value="price-asc">Price: Low to High</option>
                      <option value="price-desc">Price: High to Low</option>
                    </select>
                  </div>

                  <div className="inline-flex rounded-xl overflow-hidden border border-gray-200">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`px-4 py-2 font-semibold transition-all duration-300 ${
                        viewMode === 'grid'
                          ? 'bg-gradient-to-r from-[#a06b42] to-[#8f5a32] text-white'
                          : 'text-gray-600 hover:text-gray-900 bg-white'
                      }`}
                    >
                      Grid
                    </button>
                    <button
                      onClick={() => setViewMode('table')}
                      className={`px-4 py-2 font-semibold transition-all duration-300 ${
                        viewMode === 'table'
                          ? 'bg-gradient-to-r from-[#a06b42] to-[#8f5a32] text-white'
                          : 'text-gray-600 hover:text-gray-900 bg-white'
                      }`}
                    >
                      Table
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="text-center text-gray-600 py-16 text-lg">Loading attractions…</div>
            ) : availabilityFilteredItems.length === 0 ? (
              <div className="text-center text-gray-600 py-16 text-lg">No attractions match your search.</div>
            ) : viewMode === 'table' ? (
              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-[#f7efe4] text-left text-[11px] uppercase tracking-wide text-[#6b5744]">
                      <th className="p-3">Name</th>
                      <th className="p-3">City</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Price</th>
                      <th className="p-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {availabilityFilteredItems.map((a) => (
                      <tr key={String(a._id)} className="border-t border-[#f0e6d9] hover:bg-[#fffaf4]">
                        <td className="p-3 font-medium text-[#3b2a18]">{a.name}</td>
                        <td className="p-3 text-gray-700">{a.city || '-'}</td>
                        <td className="p-3 text-gray-700">{a.category || '-'}</td>
                        <td className="p-3 text-[#4b2a00] font-semibold">
                          {formatCurrencyRWF ? formatCurrencyRWF(Number(a.price || 0)) : `RWF ${Number(a.price || 0).toLocaleString()}`}
                        </td>
                        <td className="p-3">
                          <Link
                            to={`/attractions/${a._id}`}
                            className="inline-flex items-center px-3 py-2 rounded-lg bg-[#a06b42] hover:bg-[#8f5a32] text-white text-xs font-medium"
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                {availabilityFilteredItems.map((a) => {
                  const id = a._id;
                  let image = null;
                  if (Array.isArray(a.images) && a.images.length > 0) image = makeAbsolute(a.images[0]);
                  return (
                    <div
                      key={String(id)}
                      className="group transform transition-all duration-500 hover:-translate-y-1 hover:shadow-xl rounded-2xl bg-white/90 backdrop-blur-sm border border-[#ecd9c4] overflow-hidden"
                      style={{ boxShadow: '0 18px 45px rgba(82, 45, 13, 0.08)' }}
                    >
                      <PropertyCard
                        listing={{
                          id,
                          title: a.name || 'Attraction',
                          location: a.location || a.city || '',
                          image,
                          price: Number(a.price || 0),
                          bedrooms: null,
                          bathrooms: null,
                          area: a.category || '',
                          status: a.isActive !== false ? 'active' : 'inactive',
                          bookings: 0,
                          host: '',
                          description: a.description || '',
                        }}
                        onView={() => (window.location.href = `/attractions/${id}`)}
                      />
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-10 text-center text-xs text-gray-500">
              {filters.visitDate
                ? 'Availability filtering is based on your selected date and people. If a time slot is required, open an attraction to choose from available slots.'
                : 'Tip: Select a visit date to filter attractions by availability.'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
