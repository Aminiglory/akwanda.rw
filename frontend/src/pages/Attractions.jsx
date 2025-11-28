import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaStar } from 'react-icons/fa';
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
  const [pageContent, setPageContent] = useState({
    pageTitle: 'Local Amenities Near Your Apartment',
    introText: 'Discover what is around your apartment in Rwanda',
    heroImages: [],
    published: true,
  });
  const [attractionSearch, setAttractionSearch] = useState({ destination: '', dates: '' });
  const [selectedFilters, setSelectedFilters] = useState({ location: [], category: [] });

  const topDestinations = [
    { city: 'Kigali', experiences: 58 },
    { city: 'Nyungwe', experiences: 24 },
    { city: 'Akagera', experiences: 17 },
    { city: 'Lake Kivu', experiences: 33 }
  ];

  const attractionDeals = [
    { title: 'Kigali Cultural Mosaic Tour', price: 'RWF 45,000', duration: '3h', discount: '15% off', badge: 'Local favorite' },
    { title: 'Luxury Sunset Cruise - Lake Kivu', price: 'RWF 85,000', duration: '2h', discount: '20% off', badge: 'Limited seats' },
    { title: 'Nyungwe Canopy Walk & Coffee', price: 'RWF 120,000', duration: '4h', discount: '25% off', badge: 'Eco adventure' }
  ];

  const filterGroups = {
    location: ['Kigali', 'Nyungwe', 'Akagera', 'Lake Kivu'],
    category: ['Culture', 'Adventure', 'Nature', 'Relaxation']
  };

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
        // Load page content from CMS
        const contentRes = await fetch(`${API_URL}/api/content/attractions`, { credentials: 'include' });
        const contentData = await contentRes.json();
        const content = contentData?.content || {};
        if (contentRes.ok) {
          setPageContent({
            pageTitle: content.pageTitle || 'Local Amenities Near Your Apartment',
            introText: content.introText || 'Discover what is around your apartment in Rwanda',
            heroImages: Array.isArray(content.heroImages) ? content.heroImages : [],
            published: !!content.published,
          });
        }
        
        // Load actual attractions from API
        const attractionsRes = await fetch(`${API_URL}/api/attractions`, { credentials: 'include' });
        const attractionsData = await attractionsRes.json();
        if (attractionsRes.ok) {
          // Use API attractions if available, otherwise fall back to CMS content
          const apiAttractions = Array.isArray(attractionsData?.attractions) ? attractionsData.attractions : [];
          const cmsAttractions = Array.isArray(content.attractions) ? content.attractions : [];
          setItems(apiAttractions.length > 0 ? apiAttractions : cmsAttractions);
        } else {
          // Fallback to CMS content if API fails
          setItems(Array.isArray(content.attractions) ? content.attractions : []);
        }
      } catch (_) { 
        setItems([]); 
      } finally { 
        setLoading(false); 
      }
    })();
  }, []);

  const handleAttractionPreview = (e) => {
    e.preventDefault();
    if (!attractionSearch.destination || !attractionSearch.dates) {
      toast.error('Select a destination and dates to preview curated highlights.');
      return;
    }
    toast.success(`Previewing ${attractionSearch.destination} highlights for ${attractionSearch.dates}`);
  };

  const toggleFilter = (group, value) => {
    setSelectedFilters(prev => ({
      ...prev,
      [group]: prev[group].includes(value)
        ? prev[group].filter(item => item !== value)
        : [...prev[group], value]
    }));
  };

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
    : attractions.filter(attraction => {
        const cat = (attraction.category || '').toLowerCase();
        return cat === selectedCategory.toLowerCase();
      });

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <FaStar
        key={i}
        className={`${i < Math.floor(rating) ? 'text-yellow-400' : 'text-gray-300'}`}
      />
    ));
  };

  const heroImage = useMemo(() => {
    const imgs = Array.isArray(pageContent.heroImages) ? pageContent.heroImages : [];
    if (!imgs.length) return null;
    const img = imgs[0];
    if (!img) return null;
    if (/^https?:\/\//i.test(img)) return img;
    return `${API_URL}${img.startsWith('/') ? img : `/${img}`}`;
  }, [pageContent.heroImages]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Modern Hero Section */}
      <div className="relative bg-gradient-to-r from-[#a06b42] via-[#8f5a32] to-[#a06b42] shadow-xl overflow-hidden">
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }}
        ></div>
          {heroImage && (
          <div className="absolute inset-0 opacity-30">
              <img
                src={heroImage}
                alt={pageContent.pageTitle}
                className="w-full h-full object-cover"
              />
            <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-transparent" />
            </div>
          )}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <div className="max-w-3xl mx-auto text-center text-white">
            <span className="inline-flex items-center px-4 py-2 mb-6 rounded-full bg-white/10 backdrop-blur-sm border border-white/30 text-xs uppercase tracking-wider text-white/90 font-semibold">
              🏔️ Rwanda Experiences
              </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 md:mb-6 drop-shadow-lg">
                {pageContent.pageTitle}
              </h1>
            <p className="text-lg md:text-xl lg:text-2xl text-white/90 leading-relaxed font-medium">
                {pageContent.introText}
              </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-10 md:py-12 space-y-8">
        {/* Attractions marketplace preview */}
        <div className="bg-white rounded-3xl shadow-xl border border-[#f0e2cf] p-6 md:p-8 space-y-6">
          <div className="flex flex-col gap-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#a06b42]">Discover experiences</p>
            <h2 className="text-2xl md:text-3xl font-bold text-[#3a1e10]">Top priorities you can visit</h2>
            <p className="text-gray-600">Search attractions the way guests expect—destination, date, and curated deals all in one place.</p>
          </div>
          <form className="grid gap-3 sm:grid-cols-3" onSubmit={handleAttractionPreview}>
            <input
              value={attractionSearch.destination}
              onChange={e => setAttractionSearch(prev => ({ ...prev, destination: e.target.value }))}
              placeholder="Destination"
              className="rounded-2xl border border-[#e8d6c1] px-4 py-3 text-sm focus:border-[#a06b42] focus:outline-none"
            />
            <input
              value={attractionSearch.dates}
              onChange={e => setAttractionSearch(prev => ({ ...prev, dates: e.target.value }))}
              placeholder="Dates"
              className="rounded-2xl border border-[#e8d6c1] px-4 py-3 text-sm focus:border-[#a06b42] focus:outline-none"
            />
            <button type="submit" className="rounded-2xl bg-gradient-to-r from-[#a06b42] to-[#c68b4c] text-white font-semibold px-4 py-3 text-sm shadow-lg">Preview highlights</button>
          </form>
          <div className="flex flex-wrap gap-3">
            {topDestinations.map(dest => (
              <div key={dest.city} className="flex-1 min-w-[150px] rounded-2xl border border-[#fde5cc] bg-[#fff9f2] px-4 py-3">
                <p className="text-sm font-semibold text-[#a06b42]">{dest.city}</p>
                <p className="text-xs text-[#7a5a3a]">{dest.experiences} experiences</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[300px,1fr]">
          <div className="bg-white rounded-3xl border border-[#f0e2cf] p-5 space-y-5 shadow-sm">
            <h3 className="text-lg font-semibold text-[#3a1e10]">Filters</h3>
            {Object.entries(filterGroups).map(([group, items]) => (
              <div key={group} className="space-y-2">
                <p className="text-sm font-semibold text-gray-700 capitalize">{group}</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {items.map(item => (
                    <label key={item} className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <input
                        type="checkbox"
                        checked={selectedFilters[group].includes(item)}
                        onChange={() => toggleFilter(group, item)}
                        className="h-4 w-4 rounded border-gray-300 text-[#a06b42] focus:ring-[#a06b42]"
                      />
                      {item}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              {attractionDeals.map(deal => (
                <div key={deal.title} className="bg-white rounded-3xl border border-[#f0e2cf] p-5 shadow-sm">
                  <p className="text-xs uppercase font-semibold tracking-wide text-[#a06b42] mb-2">{deal.badge}</p>
                  <h4 className="text-xl font-semibold text-[#3a1e10] mb-1">{deal.title}</h4>
                  <p className="text-sm text-gray-500 mb-3">{deal.duration} • {deal.discount}</p>
                  <div className="text-base font-semibold text-[#3a1e10]">{deal.price}</div>
                  <button className="mt-3 text-sm font-semibold text-[#a06b42]">See deal →</button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Category Filter */}
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3 md:gap-4 justify-center">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`flex items-center space-x-2 px-4 md:px-6 py-2.5 md:py-3 rounded-full text-sm md:text-base transition-all duration-300 shadow-sm hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#a06b42] ${
                  selectedCategory === category.id
                    ? 'bg-[#a06b42] text-white ring-0 scale-[1.03]'
                    : 'bg-white/90 text-[#4b2a00] border border-[#e0d2c0] hover:bg-[#f7ede1]'
                }`}
              >
                <span className="text-lg">{category.icon}</span>
                <span className="font-semibold tracking-wide">{category.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Attractions Grid */}
        {loading ? (
          <div className="text-center text-gray-600 py-16 text-lg">Loading attractions…</div>
        ) : filteredAttractions.length === 0 ? (
          <div className="text-center text-gray-600 py-16 text-lg">
            No attractions available yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {filteredAttractions.map((a, index) => {
              const id = a.id || a._id || index;
              // Handle images - can be single image string or array
              let image = null;
              if (a.images && Array.isArray(a.images) && a.images.length > 0) {
                image = makeAbsolute(a.images[0]);
              } else if (a.image) {
                image = makeAbsolute(a.image);
              }
              const wishlisted = favIds.some(x => String(x) === String(id));
              return (
                <div
                  key={id}
                  className="group transform transition-all duration-500 hover:-translate-y-1 hover:shadow-xl rounded-2xl bg-white/90 backdrop-blur-sm border border-[#ecd9c4] overflow-hidden"
                  style={{ boxShadow: '0 18px 45px rgba(82, 45, 13, 0.08)' }}
                >
                  <PropertyCard
                    listing={{
                      id,
                      title: a.title || a.name || 'Attraction',
                      location: a.location || a.city || '',
                      image,
                      price: a.price || 0,
                      bedrooms: null,
                      bathrooms: null,
                      area: a.category || '',
                      status: a.isActive !== false ? 'active' : 'inactive',
                      bookings: 0,
                      host: '',
                      description: a.description || a.shortDesc || '',
                      wishlisted
                    }}
                    onView={() => {
                      if (a.linkUrl) {
                        window.open(a.linkUrl, '_blank');
                      } else {
                        navigate(`/attractions/${id}`);
                      }
                    }}
                    onToggleWishlist={() => toggleWishlist(id)}
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* Call to Action */}
        <div className="mt-14 md:mt-16">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#a06b42] via-[#c08a58] to-[#e5b88c] text-white px-6 py-10 md:px-10 md:py-12 flex flex-col md:flex-row md:items-center md:justify-between gap-6 shadow-xl">
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top,_#ffffff_0,_transparent_55%)] pointer-events-none" />
            <div className="relative max-w-xl">
              <h3 className="text-2xl md:text-3xl font-bold tracking-tight mb-3">
                Find your stay near the attractions you love
              </h3>
              <p className="text-sm md:text-base lg:text-lg text-white/90 leading-relaxed">
                Browse apartments and stays located close to museums, nature, nightlife, and more across Rwanda.
              </p>
            </div>
            <div className="relative flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center">
              <button
                className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-white text-[#a06b42] font-semibold text-sm md:text-base shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
                onClick={() => { window.location.href = '/apartments'; }}
              >
                Browse apartments
                <span className="ml-2 translate-x-0 group-hover:translate-x-0.5 transition-transform">→</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Attractions;
