import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaHeart, FaMapMarkerAlt, FaStar, FaEnvelope } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import { LazyImage } from './LazyImage';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function makeAbsolute(u) {
  if (!u) return u;
  let s = String(u).replace(/\\/g, '/');
  if (!s.startsWith('http')) {
    if (!s.startsWith('/')) s = `/${s}`;
    return `${API_URL}${s}`;
  }
  return s;
}

export default function AkwandaCard({
  id,
  title,
  location,
  images = [],
  pricePerNight,
  category,
  rating = 0,
  reviews = 0,
  amenities = [],
  host,
  isAvailable = true,
  href,
  ownerId
}) {
  const { user, isAuthenticated } = useAuth();
  const [hovered, setHovered] = useState(false);
  const [index, setIndex] = useState(0);
  const intervalRef = useRef(null);

  const imgList = (Array.isArray(images) && images.length ? images : [null])
    .map(makeAbsolute)
    .map(v => v || 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=500&h=300&fit=crop');

  const storageKey = useMemo(() => {
    const uid = (user && (user._id || user.id)) ? String(user._id || user.id) : 'guest';
    return `favorites:${uid}`;
  }, [user]);

  const [wishlisted, setWishlisted] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      const ids = raw ? JSON.parse(raw) : [];
      setWishlisted(Array.isArray(ids) && ids.some(x => String(x) === String(id)));
    } catch {}
  }, [storageKey, id]);

  const toggleWishlist = async (e) => {
    e?.preventDefault?.();
    const propertyId = String(id);
    // Optimistic update
    setWishlisted(prev => !prev);
    try {
      if (isAuthenticated) {
        const url = `${API_URL}/api/user/wishlist/${propertyId}`;
        const res = await fetch(url, {
          method: wishlisted ? 'DELETE' : 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        });
        if (!res.ok) throw new Error('Wishlist update failed');
      } else {
        const raw = localStorage.getItem(storageKey);
        const ids = Array.isArray(raw ? JSON.parse(raw) : []) ? JSON.parse(raw) : [];
        const exists = ids.some(x => String(x) === propertyId);
        const next = exists ? ids.filter(x => String(x) !== propertyId) : [...ids, propertyId];
        localStorage.setItem(storageKey, JSON.stringify(next));
        if (!exists) toast.success('Saved to favorites'); else toast.success('Removed from favorites');
      }
    } catch (err) {
      // Revert optimistic on error
      setWishlisted(prev => !prev);
      toast.error('Could not update wishlist');
    }
  };

  useEffect(() => {
    if (hovered && imgList.length > 1) {
      intervalRef.current = setInterval(() => {
        setIndex(i => (i + 1) % imgList.length);
      }, 1600);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      setIndex(0);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [hovered, imgList.length]);

  return (
    <Link to={href || `/apartment/${id}`}
      className="modern-card-elevated overflow-hidden hover:scale-105 transition-all duration-300"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="relative h-48 overflow-hidden">
        <LazyImage
          src={imgList[index]}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
          category="property"
          size="medium"
        />
        {!isAvailable && (
          <div className="absolute top-4 right-4 bg-[var(--ak-danger)] text-white px-3 py-1 rounded-full text-sm font-semibold">
            Unavailable
          </div>
        )}
        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 text-sm font-semibold text-gray-800">
          RWF {Number(pricePerNight || 0).toLocaleString()}/night
        </div>
        <div className="absolute top-4 right-4 flex items-center gap-2">
          {ownerId && (
            <Link
              to={`/messages?to=${encodeURIComponent(String(ownerId))}`}
              className="bg-white/90 hover:bg-white rounded-full p-2 shadow"
              title="Chat with host"
              aria-label="Chat with host"
              onClick={(e) => e.stopPropagation()}
            >
              <FaEnvelope className="text-primary" />
            </Link>
          )}
          <button
            aria-label="Toggle wishlist"
            onClick={(e) => { e.stopPropagation(); toggleWishlist(e); }}
            className="bg-white/90 hover:bg-white rounded-full p-2 shadow"
          >
            <FaHeart className={wishlisted ? 'text-primary' : 'text-gray-400'} />
          </button>
        </div>
        <div className="absolute bottom-4 left-4 bg-gray-800/80 text-white px-2 py-0.5 rounded text-xs font-medium">
          {String(category || '').slice(0,1).toUpperCase() + String(category || '').slice(1)}
        </div>
      </div>

      <div className="p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-2 line-clamp-2">{title}</h3>

        <div className="flex items-center text-gray-600 mb-3">
          <FaMapMarkerAlt className="text-primary mr-2" />
          <span className="text-sm">{location}</span>
        </div>

        <div className="flex items-center mb-3">
          <div className="flex items-center mr-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <FaStar key={i} className={i < Math.floor(Number(rating) || 0) ? 'text-yellow-400' : 'text-gray-300'} />
            ))}
          </div>
          <span className="text-sm text-gray-600">{Number(rating || 0).toFixed(1)} ({reviews} reviews)</span>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {(amenities || []).slice(0, 3).map((a, idx) => (
            <span key={idx} className="chip-primary text-xs px-2 py-1 rounded-full">{a}</span>
          ))}
          {Array.isArray(amenities) && amenities.length > 3 && (
            <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">+{amenities.length - 3} more</span>
          )}
        </div>

        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-gray-600">Hosted by {host || '—'}</span>
        </div>

        <div className="w-full py-3 rounded-xl font-semibold transition-all duration-300 text-center">
          <span className={`inline-block px-4 py-2 rounded-xl ${isAvailable ? 'btn-primary text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}>
            {isAvailable ? 'View Details' : 'Unavailable'}
          </span>
        </div>
      </div>
    </Link>
  );
}
