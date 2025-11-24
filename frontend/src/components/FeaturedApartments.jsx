import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaStar } from 'react-icons/fa';
import PropertyCard from './PropertyCard';
import { useLocale } from '../contexts/LocaleContext';
import { safeApiGet } from '../utils/apiUtils';
import { makeAbsoluteImageUrl, preloadImages, processImagesForComponent } from '../utils/imageUtils';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const FeaturedApartments = () => {
  const { t } = useLocale() || {};
  const [apartments, setApartments] = useState([]); // combined premium + standard
  const [premiumIndex, setPremiumIndex] = useState(0);
  // Use optimized image URL processing
  const processImageUrl = (url) => {
    return makeAbsoluteImageUrl(url);
  };

  // Auto-scroll premium slider
  useEffect(() => {
    const premium = apartments.filter(a => a.isPremium);
    const count = premium.length;
    if (count <= 1) return;

    const container = premiumStripRef.current;
    if (!container) return;

    const cards = () => Array.from(container.querySelectorAll('[data-premium-card="true"]'));

    const scrollToIndex = (idx) => {
      const items = cards();
      const target = items[idx];
      if (target && target.scrollIntoView) {
        target.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    };

    const id = setInterval(() => {
      setPremiumIndex((prev) => {
        const next = (prev + 1) % count;
        scrollToIndex(next);
        return next;
      });
    }, 6000);

    // Initial alignment
    if (premiumIndex < count) {
      scrollToIndex(premiumIndex);
    }

    return () => clearInterval(id);
  }, [apartments, premiumIndex]);

  useEffect(() => {
    (async () => {
      const data = await safeApiGet('/api/properties', { properties: [] });
      if (data && data.properties) {
        // Newest first
        const sorted = [...data.properties].sort((a, b) => {
          const da = a && a.createdAt ? new Date(a.createdAt) : new Date(0);
          const db = b && b.createdAt ? new Date(b.createdAt) : new Date(0);
          return db - da;
        });
        const processedApartments = sorted.map(p => {
          // Calculate average rating and review count from ratings array
          const ratingsArr = p.ratings || [];
          const avgRating = ratingsArr.length > 0 ? (ratingsArr.reduce((sum, r) => sum + r.rating, 0) / ratingsArr.length) : null;
          
          // Commission-based premium logic: 12% ("higher") is considered premium
          const commissionRate = Number(p.commissionRate || 0);
          const isPremium = commissionRate >= 12; // premium tier

          // Process images with optimized utilities
          const primaryImage = p.images && p.images.length ? processImageUrl(p.images[0]) : null;
          const allImages = Array.isArray(p.images) ? p.images.map(processImageUrl).filter(Boolean) : [];
          
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
            category: p.category || 'apartment', // For fallback image selection
            commissionRate,
            isPremium
          };
        });
        // Split into premium vs standard (ads) and order premium first
        const premium = processedApartments.filter(a => a.isPremium);
        const standard = processedApartments.filter(a => !a.isPremium);
        const ordered = [...premium, ...standard].slice(0, 8); // show up to 8 cards total

        setApartments(ordered);
        
        // Preload critical images using optimized preloading
        const criticalImages = processedApartments.slice(0, 2).map((apt, index) => ({
          url: apt.image,
          priority: 2 - index,
          category: apt.category || 'apartment'
        })).filter(item => item.url);
        
        if (criticalImages.length > 0) {
          preloadImages(criticalImages, { maxConcurrent: 2, timeout: 3000 });
        }
      }
    })();
  }, []);


  // Reveal animation on scroll & premium slider ref
  const gridRef = useRef(null);
  const premiumStripRef = useRef(null);
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
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2 text-gray-900">
            {apartments.some(a => a.isPremium)
              ? (t ? t('featured.premiumTitle') : 'Premium Properties')
              : (t ? t('featured.title') : 'Featured Properties')}
          </h2>
          <p className="text-gray-600 text-lg">
            {apartments.some(a => a.isPremium)
              ? (t ? t('featured.premiumSubtitle') : 'Top-performing stays with higher commission and visibility')
              : (t ? t('featured.subtitle') : 'Discover our most popular and highly-rated stays')}
          </p>
        </div>

        {/* Premium slider */}
        {apartments.some(a => a.isPremium) && (
          <div className="mb-10">
            <h3 className="text-lg font-semibold text-[#4b2a00] mb-3">
              {t ? t('featured.premiumStripTitle') : 'Premium picks'}
            </h3>
            <div
              ref={gridRef}
              className={`${gridInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'} transition-all duration-500`}
            >
              <div className="relative">
                <div
                  ref={premiumStripRef}
                  className="flex gap-4 min-w-max overflow-x-auto pb-2 scroll-smooth"
                >
                  {apartments.filter(a => a.isPremium).map((apartment, index) => (
                    <div
                      key={apartment.id}
                      data-premium-card="true"
                      className="w-72 flex-shrink-0"
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
                          host: apartment.host,
                          isPremium: true,
                          isAd: false
                        }}
                        onView={() => (window.location.href = `/apartment/${apartment.id}`)}
                      />
                    </div>
                  ))}
                </div>

                {/* Slider arrows */}
                {apartments.filter(a => a.isPremium).length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        const premium = apartments.filter(a => a.isPremium);
                        const count = premium.length;
                        if (count <= 1) return;
                        setPremiumIndex((prev) => {
                          const next = (prev - 1 + count) % count;
                          const container = premiumStripRef.current;
                          if (container) {
                            const items = Array.from(container.querySelectorAll('[data-premium-card="true"]'));
                            const target = items[next];
                            if (target && target.scrollIntoView) {
                              target.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                            }
                          }
                          return next;
                        });
                      }}
                      className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-9 h-9 rounded-full bg-white shadow border border-gray-200 items-center justify-center text-gray-700 hover:bg-gray-50"
                      aria-label="Previous premium property"
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const premium = apartments.filter(a => a.isPremium);
                        const count = premium.length;
                        if (count <= 1) return;
                        setPremiumIndex((prev) => {
                          const next = (prev + 1) % count;
                          const container = premiumStripRef.current;
                          if (container) {
                            const items = Array.from(container.querySelectorAll('[data-premium-card="true"]'));
                            const target = items[next];
                            if (target && target.scrollIntoView) {
                              target.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                            }
                          }
                          return next;
                        });
                      }}
                      className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-9 h-9 rounded-full bg-white shadow border border-gray-200 items-center justify-center text-gray-700 hover:bg-gray-50"
                      aria-label="Next premium property"
                    >
                      ›
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Standard / Ad listings */}
        {apartments.filter(a => !a.isPremium).length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-[#6b5744] mb-3">
              {t ? t('featured.standardTitle') : 'More stays & ads'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {apartments.filter(a => !a.isPremium).map((apartment, index) => (
                <div
                  key={apartment.id}
                  className={`${gridInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'} h-full`}
                  style={{ transition: 'all 500ms', transitionDelay: `${index * 60}ms` }}
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
                      host: apartment.host,
                      isPremium: false,
                      isAd: true
                    }}
                    onView={() => (window.location.href = `/apartment/${apartment.id}`)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

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

export default FeaturedApartments;
