import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaSearch, FaBed, FaCar, FaMapMarkerAlt } from 'react-icons/fa';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const GlobalSearch = () => {
  const location = useLocation();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [properties, setProperties] = useState([]);
  const [cars, setCars] = useState([]);
  const [error, setError] = useState('');

  const searchTerm = useMemo(() => {
    const sp = new URLSearchParams(location.search || '');
    return (sp.get('query') || sp.get('q') || '').trim();
  }, [location.search]);

  const isOwnerMode = useMemo(() => {
    const sp = new URLSearchParams(location.search || '');
    return (sp.get('mode') || '').toLowerCase() === 'owner';
  }, [location.search]);

  useEffect(() => {
    setQuery(searchTerm);
  }, [searchTerm]);

  useEffect(() => {
    const term = searchTerm;
    if (!term) {
      setProperties([]);
      setCars([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError('');
        // Properties: reuse q filter on /api/properties
        const propParams = new URLSearchParams();
        propParams.set('q', term);
        const propRes = await fetch(`${API_URL}/api/properties?${propParams.toString()}`);
        const propData = await propRes.json().catch(() => ({}));
        const propsList = Array.isArray(propData.properties) ? propData.properties : [];

        // Cars: fetch all and filter client-side by location/title/brand/model
        const carsRes = await fetch(`${API_URL}/api/cars`);
        const carsData = await carsRes.json().catch(() => ({}));
        const carsList = Array.isArray(carsData.cars) ? carsData.cars : [];
        const lower = term.toLowerCase();
        const filteredCars = carsList.filter((c) => {
          const title = `${c.vehicleName || ''} ${c.brand || ''} ${c.model || ''}`.toLowerCase();
          const loc = String(c.location || '').toLowerCase();
          return title.includes(lower) || loc.includes(lower);
        });

        if (cancelled) return;
        setProperties(propsList);
        setCars(filteredCars);
      } catch (e) {
        if (!cancelled) setError('Failed to run global search.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [searchTerm]);

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
    window.history.replaceState(null, '', `/search?${params.toString()}`);
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
            Search across stays and cars on AKWANDA.rw.
          </p>
        )}

        {/* Search box */}
        <form onSubmit={handleSubmit} className="mb-8">
          <div className="flex items-center gap-3 bg-white rounded-full px-4 py-2 shadow-sm border border-gray-200 max-w-xl">
            <FaSearch className="text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search properties, locations, cars..."
              className="flex-1 bg-transparent border-none outline-none text-sm text-gray-900 placeholder:text-gray-400"
            />
            <button
              type="submit"
              className="px-4 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-full"
            >
              Search
            </button>
          </div>
        </form>

        {loading && (
          <div className="text-gray-600 text-sm">Searching...</div>
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

            {/* Cars section */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <FaCar className="text-blue-600" />
                <span>Cars</span>
                <span className="text-sm text-gray-500">({cars.length})</span>
              </h2>
              {cars.length === 0 ? (
                <div className="text-gray-500 text-sm">
                  No cars found for this search.
                </div>
              ) : (
                <div className="space-y-3">
                  {cars.slice(0, 10).map((c) => {
                    const title = c.vehicleName || `${c.brand || ''} ${c.model || ''}`.trim() || 'Car';
                    return (
                      <Link
                        key={c._id || c.id}
                        to={`/cars/${c._id || c.id}`}
                        className="block bg-white rounded-lg border border-gray-200 px-4 py-3 hover:bg-gray-50 transition-colors"
                      >
                        <div className="font-semibold text-gray-900 line-clamp-1">{highlight(title)}</div>
                        <div className="flex items-center text-xs text-gray-600 mt-1 gap-1">
                          <FaMapMarkerAlt className="text-gray-400" />
                          <span className="line-clamp-1">{highlight(c.location || '')}</span>
                        </div>
                      </Link>
                    );
                  })}
                  {cars.length > 10 && (
                    <div className="text-xs text-gray-500">
                      {t ? t('search.moreResults') : 'More results available on the cars page.'}
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
