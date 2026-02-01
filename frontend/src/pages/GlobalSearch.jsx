import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FaSearch, FaBed, FaCar, FaMapMarkerAlt, FaMountain } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const GlobalSearch = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [properties, setProperties] = useState([]);
  const [cars, setCars] = useState([]);
  const [attractions, setAttractions] = useState([]);
  const [error, setError] = useState('');

  const searchTerm = useMemo(() => {
    const sp = new URLSearchParams(location.search || '');
    return (sp.get('query') || sp.get('q') || '').trim();
  }, [location.search]);

  const isOwnerMode = useMemo(() => {
    const sp = new URLSearchParams(location.search || '');
    return (sp.get('mode') || '').toLowerCase() === 'owner' || (isAuthenticated && user?.userType === 'host');
  }, [location.search, isAuthenticated, user]);

  const extractPriorityParams = () => {
    const sp = new URLSearchParams(location.search || '');
    return {
      propertyCategory: (sp.get('category') || '').trim().toLowerCase(),
      carType: (sp.get('type') || '').trim().toLowerCase(),
      attractionCategory: (sp.get('category') || '').trim().toLowerCase(),
    };
  };

  const reorderByPriority = (list, field, priority) => {
    if (!priority) return list;
    const normalizedPriority = priority.toLowerCase();
    const matches = list.filter((item) => String(item[field] || '').toLowerCase() === normalizedPriority);
    const others = list.filter((item) => String(item[field] || '').toLowerCase() !== normalizedPriority);
    return [...matches, ...others];
  };

  useEffect(() => {
    setQuery(searchTerm);
  }, [searchTerm]);

  useEffect(() => {
    const term = searchTerm;
    if (!term) {
      setProperties([]);
      setCars([]);
      setAttractions([]);
      return;
    }
    let cancelled = false;
    const priorityParams = extractPriorityParams();
    (async () => {
      try {
        setLoading(true);
        setError('');
        const lower = term.toLowerCase();
        
        // Properties: reuse q filter on /api/properties
        const propParams = new URLSearchParams();
        propParams.set('q', term);
        // If owner mode, search only their properties
        if (isOwnerMode && isAuthenticated) {
          const propRes = await fetch(`${API_URL}/api/properties/my-properties`, { credentials: 'include' });
          const propData = await propRes.json().catch(() => ({}));
          const allProps = Array.isArray(propData.properties) ? propData.properties : [];
          const propsList = allProps.filter((p) => {
            const title = String(p.title || '').toLowerCase();
            const address = String(p.address || '').toLowerCase();
            const city = String(p.city || '').toLowerCase();
            return title.includes(lower) || address.includes(lower) || city.includes(lower);
          });
          if (!cancelled) setProperties(reorderByPriority(propsList, 'category', priorityParams.propertyCategory));
        } else {
          const propRes = await fetch(`${API_URL}/api/properties?${propParams.toString()}`);
          const propData = await propRes.json().catch(() => ({}));
          const propsList = Array.isArray(propData.properties) ? propData.properties : [];
          if (!cancelled) setProperties(reorderByPriority(propsList, 'category', priorityParams.propertyCategory));
        }

        // Cars: fetch and filter
        if (isOwnerMode && isAuthenticated) {
          const carsRes = await fetch(`${API_URL}/api/cars/mine`, { credentials: 'include' });
          const carsData = await carsRes.json().catch(() => ({}));
          const allCars = Array.isArray(carsData.cars) ? carsData.cars : [];
          const filteredCars = allCars.filter((c) => {
            const title = `${c.vehicleName || ''} ${c.brand || ''} ${c.model || ''}`.toLowerCase();
            const loc = String(c.location || '').toLowerCase();
            return title.includes(lower) || loc.includes(lower);
          });
          if (!cancelled) setCars(reorderByPriority(filteredCars, 'type', priorityParams.carType));
        } else {
          const carsRes = await fetch(`${API_URL}/api/cars`);
          const carsData = await carsRes.json().catch(() => ({}));
          const carsList = Array.isArray(carsData.cars) ? carsData.cars : [];
          const filteredCars = carsList.filter((c) => {
            const title = `${c.vehicleName || ''} ${c.brand || ''} ${c.model || ''}`.toLowerCase();
            const loc = String(c.location || '').toLowerCase();
            return title.includes(lower) || loc.includes(lower);
          });
          if (!cancelled) setCars(reorderByPriority(filteredCars, 'type', priorityParams.carType));
        }

        // Attractions: fetch and filter
        if (isOwnerMode && isAuthenticated) {
          const attrRes = await fetch(`${API_URL}/api/attractions/mine`, { credentials: 'include' });
          const attrData = await attrRes.json().catch(() => ({}));
          const allAttrs = Array.isArray(attrData.attractions) ? attrData.attractions : [];
          const filteredAttrs = allAttrs.filter((a) => {
            const name = String(a.name || '').toLowerCase();
            const desc = String(a.description || '').toLowerCase();
            const loc = String(a.location || a.city || '').toLowerCase();
            const cat = String(a.category || '').toLowerCase();
            return name.includes(lower) || desc.includes(lower) || loc.includes(lower) || cat.includes(lower);
          });
          if (!cancelled) setAttractions(reorderByPriority(filteredAttrs, 'category', priorityParams.attractionCategory));
        } else {
          const attrParams = new URLSearchParams();
          attrParams.set('q', term);
          const attrRes = await fetch(`${API_URL}/api/attractions?${attrParams.toString()}`);
          const attrData = await attrRes.json().catch(() => ({}));
          const allAttrs = Array.isArray(attrData.attractions) ? attrData.attractions : [];
          const filteredAttrs = allAttrs.filter((a) => {
            const name = String(a.name || '').toLowerCase();
            const desc = String(a.description || '').toLowerCase();
            const loc = String(a.location || a.city || '').toLowerCase();
            const cat = String(a.category || '').toLowerCase();
            return name.includes(lower) || desc.includes(lower) || loc.includes(lower) || cat.includes(lower);
          });
          if (!cancelled) setAttractions(reorderByPriority(filteredAttrs, 'category', priorityParams.attractionCategory));
        }
      } catch (e) {
        if (!cancelled) setError('Failed to run global search.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [searchTerm, isOwnerMode, isAuthenticated]);

  const highlight = (text) => {
    const term = String(searchTerm || '').trim();
    const value = String(text || '');
    if (!term) return value;
    const lower = value.toLowerCase();
    const idx = lower.indexOf(term.toLowerCase());
    if (idx === -1) return value;
    const before = value.slice(0, idx);
    const match = value.slice(idx, idx + term.length);
    const after = value.slice(idx + term.length);
    return (
      <>
        {before}
        <mark className="bg-yellow-200 text-gray-900 px-0.5 rounded">{match}</mark>
        {after}
      </>
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const term = String(query || '').trim();
    const params = new URLSearchParams();
    if (term) params.set('query', term);
    if (isOwnerMode) params.set('mode', 'owner');
    navigate(`/search?${params.toString()}`);
  };

  return (
    <div className={isOwnerMode ? 'min-h-screen bg-[#f5f0e8]' : 'min-h-screen bg-gray-50'}>
      <div className="max-w-5xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
          <FaSearch />
          <span>
            {searchTerm
              ? `Search results for "${searchTerm}"`
              : 'Global search'}
          </span>
        </h1>
        {!searchTerm && (
          <p className="text-gray-600 mb-6 text-sm">
            {isOwnerMode 
              ? 'Search across your properties, vehicles, and attractions.'
              : 'Search across stays, vehicles, and attractions on AkwandaTravels.com.'}
          </p>
        )}

        {/* Modern Search box */}
        <form onSubmit={handleSubmit} className="mb-8">
          <div className="relative max-w-2xl mx-auto">
            <div className="flex items-center gap-3 bg-white rounded-2xl px-6 py-4 shadow-lg border-2 border-gray-200 hover:border-[#a06b42] transition-all duration-300 focus-within:border-[#a06b42] focus-within:shadow-xl">
              <FaSearch className="text-gray-400 text-lg flex-shrink-0" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={isOwnerMode 
                  ? "Search your listings, locations, vehicles, attractions..." 
                  : "Search properties, locations, vehicles, attractions..."}
                className="flex-1 bg-transparent border-none outline-none text-base text-gray-900 placeholder:text-gray-400"
              />
              <button
                type="submit"
                className="px-6 py-2.5 bg-gradient-to-r from-[#a06b42] to-[#8f5a32] hover:from-[#8f5a32] hover:to-[#7d4a22] text-white rounded-xl font-medium transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105"
              >
                Search
              </button>
            </div>
          </div>
        </form>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-[#a06b42] border-t-transparent rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <FaSearch className="text-[#a06b42] text-xl animate-pulse" />
              </div>
            </div>
            <span className="ml-4 text-gray-600 font-medium">Searching...</span>
          </div>
        )}
        {error && !loading && (
          <div className="text-red-600 text-sm mb-4">{error}</div>
        )}

        {!loading && !error && !searchTerm && (
          <div className="text-gray-500 text-sm">
            Type something above to search.
          </div>
        )}

        {!loading && !error && searchTerm && (
          <>
            {/* Properties section */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <FaBed className="text-blue-600" />
                <span>Stays</span>
                <span className="text-sm text-gray-500">({properties.length})</span>
              </h2>
              {properties.length === 0 ? (
                <div className="text-gray-500 text-sm">
                  No stays found for this search.
                </div>
              ) : (
                <div className="space-y-3">
                  {properties.slice(0, 10).map((p) => (
                    <Link
                      key={p._id}
                      to={`/apartment/${p._id}`}
                      className="block bg-white rounded-lg border border-gray-200 px-4 py-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="font-semibold text-gray-900 line-clamp-1">{highlight(p.title)}</div>
                      <div className="flex items-center text-xs text-gray-600 mt-1 gap-1">
                        <FaMapMarkerAlt className="text-gray-400" />
                        <span className="line-clamp-1">{highlight(`${p.address || ''}${p.city ? `, ${p.city}` : ''}`)}</span>
                      </div>
                    </Link>
                  ))}
                  {properties.length > 10 && (
                    <div className="text-xs text-gray-500">
                      {t ? t('search.moreResults') : 'More results available on the stays page.'}
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* Vehicles section */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FaCar className="text-green-600" />
                <span>Vehicles</span>
                <span className="text-sm text-gray-500 font-normal">({cars.length})</span>
              </h2>
              {cars.length === 0 ? (
                <div className="text-gray-500 text-sm bg-gray-50 rounded-lg p-4">
                  No vehicles found for this search.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {cars.slice(0, 10).map((c) => {
                    const title = c.vehicleName || `${c.brand || ''} ${c.model || ''}`.trim() || 'Vehicle';
                    return (
                      <Link
                        key={c._id || c.id}
                        to={`/cars/${c._id || c.id}`}
                        className="block bg-white rounded-xl border border-gray-200 px-5 py-4 hover:border-[#a06b42] hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1"
                      >
                        <div className="font-semibold text-gray-900 line-clamp-1 mb-2">{highlight(title)}</div>
                        <div className="flex items-center text-sm text-gray-600 gap-2">
                          <FaMapMarkerAlt className="text-gray-400 flex-shrink-0" />
                          <span className="line-clamp-1">{highlight(c.location || '')}</span>
                        </div>
                      </Link>
                    );
                  })}
                  {cars.length > 10 && (
                    <div className="col-span-full text-sm text-gray-500 text-center py-2">
                      <Link to={`/cars?q=${encodeURIComponent(searchTerm)}`} className="text-[#a06b42] hover:underline font-medium">
                        View all {cars.length} vehicles →
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* Attractions section */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FaMountain className="text-purple-600" />
                <span>Attractions</span>
                <span className="text-sm text-gray-500 font-normal">({attractions.length})</span>
              </h2>
              {attractions.length === 0 ? (
                <div className="text-gray-500 text-sm bg-gray-50 rounded-lg p-4">
                  No attractions found for this search.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {attractions.slice(0, 10).map((a) => {
                    const id = a._id || a.id;
                    const name = a.name || a.title || 'Attraction';
                    return (
                      <Link
                        key={id}
                        to={`/attractions/${id}`}
                        className="block bg-white rounded-xl border border-gray-200 px-5 py-4 hover:border-[#a06b42] hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1"
                      >
                        <div className="font-semibold text-gray-900 line-clamp-1 mb-2">{highlight(name)}</div>
                        <div className="flex items-center text-sm text-gray-600 gap-2">
                          <FaMapMarkerAlt className="text-gray-400 flex-shrink-0" />
                          <span className="line-clamp-1">{highlight(a.location || a.city || '')}</span>
                        </div>
                      </Link>
                    );
                  })}
                  {attractions.length > 10 && (
                    <div className="col-span-full text-sm text-gray-500 text-center py-2">
                      <Link to={`/attractions?q=${encodeURIComponent(searchTerm)}`} className="text-[#a06b42] hover:underline font-medium">
                        View all {attractions.length} attractions →
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
};

export default GlobalSearch;
