import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { safeApiGet } from '../utils/apiUtils';
import { FaHeart, FaMapMarkerAlt, FaBed, FaBath, FaHome } from 'react-icons/fa';
import { CardGridSkeleton } from '../components/Skeletons';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const makeAbsolute = (u) => {
  if (!u) return u;
  let s = String(u).replace(/\\/g, '/');
  if (!s.startsWith('http')) {
    if (!s.startsWith('/')) s = `/${s}`;
    return `${API_URL}${s}`;
  }
  return s;
};

const Favorites = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [ids, setIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);

  const storageKey = useMemo(() => {
    const uid = (user && (user._id || user.id)) ? String(user._id || user.id) : 'guest';
    return `favorites:${uid}`;
  }, [user]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      const list = raw ? JSON.parse(raw) : [];
      setIds(Array.isArray(list) ? list : []);
    } catch (e) {
      setIds([]);
    }
  }, [storageKey]);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const results = await Promise.all(
          ids.map(async (id) => {
            const data = await safeApiGet(`/api/properties/${id}`, null);
            if (!data) return null;
            const p = data.property || data; // support either shape
            return {
              id: String(p._id || p.id || id),
              title: p.title || p.name || 'Property',
              location: p.location || p.city || p.address || '—',
              type: p.type || 'Apartment',
              price: p.basePrice || p.price || p.startingPrice || 0,
              bedrooms: p.bedrooms ?? p.beds ?? 0,
              bathrooms: p.bathrooms ?? p.baths ?? 0,
              image: Array.isArray(p.images) && p.images.length
                ? makeAbsolute(p.images[0])
                : 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=600&fit=crop',
            };
          })
        );
        const filtered = results.filter(Boolean);
        setItems(filtered);
      } catch (e) {
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    if (ids.length) run(); else { setItems([]); setLoading(false); }
  }, [ids]);

  const removeFavorite = (removeId) => {
    try {
      const next = ids.filter((x) => String(x) !== String(removeId));
      localStorage.setItem(storageKey, JSON.stringify(next));
      setIds(next);
    } catch {}
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FaHeart className="text-red-500" /> Your Favorites
        </h1>
        {!isAuthenticated && (
          <button
            className="text-sm text-blue-600 hover:underline"
            onClick={() => navigate('/login')}
          >
            Sign in to sync
          </button>
        )}
      </div>

            {loading ? (
              <div className="py-6"><CardGridSkeleton count={6} /></div>
            ) : items.length === 0 ? (
        <div className="py-16 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-4">
            <FaHome className="text-blue-600 text-2xl" />
          </div>
          <h2 className="text-lg font-semibold text-gray-800">No favorites yet</h2>
          <div className="mt-6">
            <Link to="/apartments" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Browse Apartments</Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((p) => (
            <div key={p.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
              <Link to={`/apartment/${p.id}`}>
                <div className="relative h-44 bg-gray-100">
                  <img src={p.image} alt={p.title} className="w-full h-full object-cover" />
                  <button
                    onClick={(e) => { e.preventDefault(); removeFavorite(p.id); }}
                    className="absolute top-3 right-3 bg-white/90 hover:bg-white text-red-500 rounded-full p-2 shadow"
                    title="Remove from favorites"
                  >
                    <FaHeart />
                  </button>
                </div>
              </Link>
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-semibold text-gray-900 line-clamp-1">{p.title}</h3>
                  <div className="text-blue-700 font-bold whitespace-nowrap">RWF {Number(p.price || 0).toLocaleString()}</div>
                </div>
                <div className="mt-1 text-sm text-gray-600 flex items-center gap-2">
                  <FaMapMarkerAlt className="text-gray-400" />
                  <span className="line-clamp-1">{p.location}</span>
                </div>
                <div className="mt-3 text-xs text-gray-600 flex items-center gap-4">
                  <span className="flex items-center gap-1"><FaBed /> {p.bedrooms}</span>
                  <span className="flex items-center gap-1"><FaBath /> {p.bathrooms}</span>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <Link to={`/apartment/${p.id}`} className="text-sm text-blue-600 hover:underline">View details</Link>
                  <button onClick={() => removeFavorite(p.id)} className="text-xs text-red-600 hover:underline">Remove</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Favorites;
