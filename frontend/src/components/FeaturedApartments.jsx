import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaStar } from 'react-icons/fa';
import PropertyCard from './PropertyCard';
import { useLocale } from '../contexts/LocaleContext';
import { safeApiGet } from '../utils/apiUtils';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const FeaturedApartments = () => {
  const { t } = useLocale() || {};
  const [apartments, setApartments] = useState([]);
  const makeAbsolute = (u) => {
    if (!u) return u;
    let s = String(u).replace(/\\/g, '/');
    if (!s.startsWith('http')) {
      if (!s.startsWith('/')) s = `/${s}`;
      return `${API_URL}${s}`;
    }
    return s;
  };

  useEffect(() => {
    (async () => {
      const data = await safeApiGet('/api/properties', { properties: [] });
      if (data && data.properties) {
        const sorted = [...data.properties].sort((a, b) => {
          const da = a && a.createdAt ? new Date(a.createdAt) : new Date(0);
          const db = b && b.createdAt ? new Date(b.createdAt) : new Date(0);
          return db - da;
        });
        const processedApartments = sorted.slice(0, 4).map(p => {
          // Calculate average rating and review count from ratings array
          const ratingsArr = p.ratings || [];
          const avgRating = ratingsArr.length > 0 ? (ratingsArr.reduce((sum, r) => sum + r.rating, 0) / ratingsArr.length) : null;
          
          // Process images with better error handling
          const primaryImage = p.images && p.images.length ? makeAbsolute(p.images[0]) : null;
          const allImages = Array.isArray(p.images) ? p.images.map(makeAbsolute).filter(Boolean) : [];
          
          return {
            id: p._id,
            title: p.title,
            location: `${p.address}, ${p.city}`,
            price: p.pricePerNight,
            rating: avgRating ? Number(avgRating.toFixed(1)) : null,
            reviews: ratingsArr.length,
            image: primaryImage,
            images: allImages,
            bedrooms: p.bedrooms ?? 2,
            bathrooms: p.bathrooms ?? 1,
            amenities: p.amenities || ["WiFi", "Parking", "Kitchen"],
            isAvailable: p.isActive,
            discountPercent: p.discountPercent || 0,
            host: p.host ? `${p.host.firstName || ''} ${p.host.lastName || ''}`.trim() : '—',
            category: p.category || 'apartment' // For fallback image selection
          };
        });
        
        setApartments(processedApartments);
        
        // Preload critical images
        processedApartments.forEach((apt, index) => {
          if (apt.image && index < 2) { // Preload first 2 images
            const img = new Image();
            img.src = apt.image;
          }
        });
      }
    })();
  }, []);

  const handleImageLoad = () => {
    setImagesLoaded(prev => prev + 1);
  };

  const handleImageError = () => {
    console.warn('Image failed to load, using fallback');
  };

  // Reveal animation on scroll
  const gridRef = useRef(null);
  const [gridInView, setGridInView] = useState(false);
  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) setGridInView(true); });
    }, { threshold: 0.2 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <FaStar
        key={i}
        className={`${i < Math.floor(rating) ? 'text-yellow-400' : 'text-gray-300'}`}
      />
    ));
  };

  return (
    <div className="bg-white py-16 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2 text-gray-900">{t ? t('featured.title') : 'Featured Properties'}</h2>
          <p className="text-gray-600 text-lg">{t ? t('featured.subtitle') : 'Discover our most popular and highly-rated stays'}</p>
        </div>

        <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {apartments.map((apartment, index) => (
            <div
              key={apartment.id}
              className={`${gridInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'} h-full`}
              style={{ transition: 'all 500ms', transitionDelay: `${index * 80}ms` }}
            >
              <PropertyCard
                listing={{
                  id: apartment.id,
                  title: apartment.title,
                  location: apartment.location,
                  image: (apartment.images && apartment.images.length ? apartment.images[0] : apartment.image),
                  price: Number(apartment.price || 0),
                  bedrooms: apartment.bedrooms,
                  bathrooms: apartment.bathrooms,
                  area: apartment.size,
                  status: apartment.isAvailable ? 'active' : 'inactive',
                  bookings: apartment.reviews,
                  host: apartment.host
                }}
                onView={() => (window.location.href = `/apartment/${apartment.id}`)}
              />
            </div>
          ))}
        </div>

        <div className="mt-12">
          <div className="bg-primary rounded-2xl p-8 flex flex-col md:flex-row items-center justify-between text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
            <div className="mb-4 md:mb-0">
              <h4 className="text-2xl font-bold mb-2">{t ? t('featured.moreOptionsTitle') : 'Looking for more options?'}</h4>
              <p className="text-white/90 text-lg">{t ? t('featured.moreOptionsSubtitle') : 'Browse all properties and filter by location, price, and amenities.'}</p>
            </div>
            <Link to="/apartments" className="bg-[#a06b42] text-white px-8 py-3 rounded-xl font-semibold hover:bg-[#8f5a32] transition-all duration-300 shadow-lg hover:scale-105 transform">
              {t ? t('featured.viewAll') : 'View All Properties'}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export { OptimizedImage };
export default FeaturedApartments;
