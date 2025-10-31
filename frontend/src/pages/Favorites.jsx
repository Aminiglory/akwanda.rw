import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { safeApiGet } from '../utils/apiUtils';
import { FaHeart, FaMapMarkerAlt, FaBed, FaBath, FaHome } from 'react-icons/fa';
import { CardGridSkeleton } from '../components/Skeletons';
import AkwandaCard from '../components/AkwandaCard';

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
  const [carIds, setCarIds] = useState([]);
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
    try {
      const rawCars = localStorage.getItem('car-favorites');
      const listCars = rawCars ? JSON.parse(rawCars) : [];
      setCarIds(Array.isArray(listCars) ? listCars : []);
    } catch {
      setCarIds([]);
    }
  }, [storageKey]);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        if (isAuthenticated) {
          // Merge any local favorites into server on first load
          try {
            const raw = localStorage.getItem(storageKey);
            const localIds = raw ? JSON.parse(raw) : [];
            if (Array.isArray(localIds) && localIds.length) {
              await fetch(`${API_URL}/api/user/wishlist/merge`, {
                method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: localIds })
              }).catch(()=>{});
              // Optional: clear local after merge
              localStorage.removeItem(storageKey);
            }
          } catch {}
          // Load server wishlist with populated property basics
          const res = await fetch(`${API_URL}/api/user/wishlist`, { credentials: 'include' });
          const data = await res.json();
          if (!res.ok) throw new Error(data.message || 'Failed to load wishlist');
          const props = Array.isArray(data.properties) ? data.properties : [];
          const mapped = props.map(p => ({
            id: String(p._id || p.id),
            title: p.title || 'Property',
            location: `${p.address || ''}${p.city ? (p.address ? ', ' : '') + p.city : ''}` || '—',
            type: p.category || 'Apartment',
            price: p.pricePerNight || 0,
            bedrooms: p.bedrooms ?? 0,
            bathrooms: p.bathrooms ?? 0,
            image: Array.isArray(p.images) && p.images.length ? makeAbsolute(p.images[0]) : 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=600&fit=crop'
          }));
          // Load car favorites from local storage (server wishlist doesn't include cars yet)
          const carResults = await Promise.all(
            (carIds||[]).map(async (cid) => {
              try {
                const resC = await fetch(`${API_URL}/api/cars/${cid}`);
                const dataC = await resC.json();
                if (!resC.ok) return null;
                const c = dataC.car || dataC;
                return {
                  id: String(c._id || cid),
                  title: c.vehicleName || `${c.brand || ''} ${c.model || ''}`.trim() || 'Car',
                  location: c.location || '—',
                  type: 'cars',
                  price: Number(c.pricePerDay || 0),
                  bedrooms: 0,
                  bathrooms: 0,
                  image: (Array.isArray(c.images) && c.images[0]) ? makeAbsolute(c.images[0]) : 'https://images.unsplash.com/photo-1549317336-206569e8475c?w=800&h=600&fit=crop',
                  href: `/cars/${c._id || cid}`
                };
              } catch { return null; }
            })
          );
          setItems([...mapped, ...carResults.filter(Boolean)]);
        } else {
          // Guest mode: hydrate from local ids
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
          const carResults = await Promise.all(
            (carIds||[]).map(async (cid) => {
              try {
                const resC = await fetch(`${API_URL}/api/cars/${cid}`);
                const dataC = await resC.json();
                if (!resC.ok) return null;
                const c = dataC.car || dataC;
                return {
                  id: String(c._id || cid),
                  title: c.vehicleName || `${c.brand || ''} ${c.model || ''}`.trim() || 'Car',
                  location: c.location || '—',
                  type: 'cars',
                  price: Number(c.pricePerDay || 0),
                  bedrooms: 0,
                  bathrooms: 0,
                  image: (Array.isArray(c.images) && c.images[0]) ? makeAbsolute(c.images[0]) : 'https://images.unsplash.com/photo-1549317336-206569e8475c?w=800&h=600&fit=crop',
                  href: `/cars/${c._id || cid}`
                };
              } catch { return null; }
            })
          );
          const filtered = results.filter(Boolean);
          setItems([...filtered, ...carResults.filter(Boolean)]);
        }
      } catch (e) {
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    if (isAuthenticated || ids.length || carIds.length) run(); else { setItems([]); setLoading(false); }
  }, [ids, carIds, isAuthenticated, storageKey]);

  const removeFavorite = async (removeId) => {
    try {
      const pid = String(removeId);
      if (isAuthenticated) {
        await fetch(`${API_URL}/api/user/wishlist/${pid}`, { method: 'DELETE', credentials: 'include' }).catch(()=>{});
        // Reload server wishlist
        const res = await fetch(`${API_URL}/api/user/wishlist`, { credentials: 'include' });
        const data = await res.json();
        const props = Array.isArray(data.properties) ? data.properties : [];
        const mapped = props.map(p => ({
          id: String(p._id || p.id),
          title: p.title || 'Property',
          location: `${p.address || ''}${p.city ? (p.address ? ', ' : '') + p.city : ''}` || '—',
          type: p.category || 'Apartment',
          price: p.pricePerNight || 0,
          bedrooms: p.bedrooms ?? 0,
          bathrooms: p.bathrooms ?? 0,
          image: Array.isArray(p.images) && p.images.length ? makeAbsolute(p.images[0]) : 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=600&fit=crop'
        }));
        setItems(mapped);
      } else {
        const next = ids.filter((x) => String(x) !== pid);
        localStorage.setItem(storageKey, JSON.stringify(next));
        setIds(next);
      }
      // Also remove from car favorites store
      try {
        const rawCars = localStorage.getItem('car-favorites');
        const listCars = rawCars ? JSON.parse(rawCars) : [];
        const nextCars = Array.isArray(listCars) ? listCars.filter((x) => String(x) !== pid) : [];
        localStorage.setItem('car-favorites', JSON.stringify(nextCars));
        setCarIds(nextCars);
      } catch {}
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
            className="text-sm text-primary hover:underline"
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
            <Link to="/apartments" className="px-4 py-2 btn-primary text-white rounded-lg hover:bg-primary-600">Browse Apartments</Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((p) => (
            <div key={p.id}>
              <AkwandaCard
                id={p.id}
                title={p.title}
                location={p.location}
                images={[p.image]}
                pricePerMonth={Number(p.price || 0) * 30}
                category={p.type || 'Apartment'}
                rating={0}
                reviews={0}
                amenities={[]}
                host={null}
                isAvailable={true}
                href={p.href || `/apartment/${p.id}`}
              />
              <div className="mt-2 flex items-center justify-between">
                <Link to={`/apartment/${p.id}`} className="text-sm text-primary hover:underline">View details</Link>
                <button onClick={() => removeFavorite(p.id)} className="text-xs text-red-600 hover:underline">Remove</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Favorites;
