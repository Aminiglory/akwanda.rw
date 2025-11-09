import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaMapMarkerAlt, FaStar, FaClock, FaTicketAlt, FaCamera, FaHeart } from 'react-icons/fa';
import PropertyCard from '../components/PropertyCard';
import { useAuth } from '../contexts/AuthContext';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Attractions = () => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [favIds, setFavIds] = useState([]);
  const { isAuthenticated } = useAuth();

  const makeAbsolute = (u) => {
    if (!u) return null;
    let s = String(u).trim().replace(/\\+/g, '/');
    if (/^https?:\/\//i.test(s)) return s;
    if (!s.startsWith('/')) s = `/${s}`;
    return `${API_URL}${s}`;
  };

  // Load favorites from server if authenticated, else localStorage
  useEffect(() => {
    (async () => {
      try {
        if (isAuthenticated) {
          const res = await fetch(`${API_URL}/api/user/wishlist-attractions`, { credentials: 'include' });
          const data = await res.json();
          if (res.ok) { setFavIds((data.wishlist || []).map(String)); return; }
        }
        const raw = localStorage.getItem('attraction-favorites');
        const list = raw ? JSON.parse(raw) : [];
        setFavIds(Array.isArray(list) ? list : []);
      } catch { setFavIds([]); }
    })();
  }, [isAuthenticated]);

  const toggleWishlist = async (id) => {
    const sid = String(id);
    const set = new Set(favIds.map(String));
    const exists = set.has(sid);
    // optimistic
    if (exists) set.delete(sid); else set.add(sid);
    const next = Array.from(set);
    setFavIds(next);
    try {
      if (isAuthenticated) {
        const res = await fetch(`${API_URL}/api/user/wishlist-attractions/${encodeURIComponent(sid)}`, {
          method: exists ? 'DELETE' : 'POST',
          credentials: 'include'
        });
        if (!res.ok) throw new Error('Wishlist update failed');
      } else {
        localStorage.setItem('attraction-favorites', JSON.stringify(next));
      }
    } catch (_) {
      // revert
      const revert = new Set(next);
      if (exists) revert.add(sid); else revert.delete(sid);
      setFavIds(Array.from(revert));
    }
  };

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_URL}/api/content/attractions`, { credentials: 'include' });
        const data = await res.json();
        const content = data?.content || {};
        // Expect an array of attractions at content.items; fallback to []
        if (res.ok) setItems(Array.isArray(content.items) ? content.items : []);
        else setItems([]);
      } catch (_) { setItems([]); } finally { setLoading(false); }
    })();
  }, []);

  const categories = useMemo(() => {
    const all = new Map();
    for (const a of items) {
      const id = (a.category || 'other').toLowerCase();
      if (!all.has(id)) all.set(id, { id, name: id.charAt(0).toUpperCase()+id.slice(1), icon: '📍' });
    }
    const arr = Array.from(all.values());
    return [{ id: 'all', name: 'All', icon: '🏷️' }, ...arr];
  }, [items]);

  const attractions = items;

  const filteredAttractions = selectedCategory === 'all' 
    ? attractions 
    : attractions.filter(attraction => attraction.category === selectedCategory);

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
      {/* Hero Section */}
      <div className="bg-[#a06b42] text-white py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-8">
            <h1 className="text-2xl md:text-4xl font-bold mb-2 md:mb-4">Local Amenities Near Your Apartment</h1>
            <p className="text-base md:text-xl text-white/90">Discover what's around your apartment in Rwanda</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Category Filter */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-4 justify-center">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`flex items-center space-x-2 px-4 md:px-6 py-2.5 md:py-3 rounded-full transition-all duration-300 ${
                  selectedCategory === category.id
                    ? 'bg-[#a06b42] text-white shadow-lg'
                    : 'bg-[#f6e9d8] text-[#4b2a00] hover:bg-[#e8dcc8] border border-[#d4c4b0]'
                }`}
              >
                <span className="text-lg">{category.icon}</span>
                <span className="font-semibold">{category.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Attractions Grid */}
        {loading ? (
          <div className="text-center text-gray-600 py-16">Loading...</div>
        ) : filteredAttractions.length === 0 ? (
          <div className="text-center text-gray-600 py-16">No attractions available yet.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredAttractions.map((a) => {
              const id = a.id || a._id || '';
              const image = a.images && a.images.length ? makeAbsolute(a.images[0]) : makeAbsolute(a.image);
              const wishlisted = favIds.some(x => String(x) === String(id));
              return (
                <PropertyCard
                  key={id}
                  listing={{
                    id,
                    title: a.name,
                    location: a.location || a.city || '',
                    image,
                    price: typeof a.price === 'number' ? Number(a.price) : 0,
                    bedrooms: null,
                    bathrooms: null,
                    area: a.category || '',
                    status: 'active',
                    bookings: Number(a.reviews || 0),
                    host: a.ownerName || '',
                    wishlisted
                  }}
                  onView={() => navigate(`/attractions/${id}`)}
                  onToggleWishlist={() => toggleWishlist(id)}
                />
              );
            })}
          </div>
        )}
        
        {/* Call to Action */}
        <div className="mt-12 text-center">
          <div className="bg-[#a06b42] rounded-2xl p-8 text-white">
            <h3 className="text-2xl font-bold mb-4">Find Your Perfect Apartment Location</h3>
            <p className="text-white/90 mb-6">
              Choose apartments near the amenities that matter most to you
            </p>
            <button className="bg-white text-[#a06b42] px-8 py-3 rounded-xl font-semibold hover:bg-gray-100 transition-all duration-300 hover:scale-105">
              Browse Apartments
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Attractions;
