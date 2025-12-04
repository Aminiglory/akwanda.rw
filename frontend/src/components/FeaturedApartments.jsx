import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaStar } from 'react-icons/fa';
import PropertyCard from './PropertyCard';
import { useLocale } from '../contexts/LocaleContext';
import { safeApiGet } from '../utils/apiUtils';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const FeaturedApartments = () => {
  const { t } = useLocale() || {};
  const [apartments, setApartments] = useState([]); // combined premium + standard
  // Simple image URL passthrough
  const processImageUrl = (url) => url;

  useEffect(() => {
    console.log('[FeaturedApartments] mount');
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
          
          // Commission-based premium logic: 10%+ is considered premium (mid & higher tiers)
          const commissionRate = Number(p.commissionRate || 0);
          const isPremium = commissionRate >= 10;

          // Process images with optimized utilities
          const primaryImage = p.images && p.images.length ? processImageUrl(p.images[0]) : null;
          const allImages = Array.isArray(p.images) ? p.images.map(processImageUrl).filter(Boolean) : [];
          
          const hasBreakfastIncluded = (
            Array.isArray(p.amenities) && p.amenities.includes('breakfast')
          ) || (
            Array.isArray(p.addOnServices) &&
            p.addOnServices.some(s => s && s.key === 'breakfast' && s.enabled && Number(s.price || 0) === 0)
          );

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
            rooms: Array.isArray(p.rooms) ? p.rooms : [],
            hasBreakfastIncluded,
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

        console.log('[FeaturedApartments] apartments processed', {
          total: processedApartments.length,
          premium: premium.length,
          standard: standard.length,
          rendered: ordered.length,
        });
        setApartments(ordered);
        
        // Preload critical images using optimized preloading
      }
    })();
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
    <div className="bg-white py-16 px-4 animate-fade-in-up">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2 text-gray-900">
            {t ? t('featured.title') : 'Featured Properties'}
          </h2>
          <p className="text-gray-600 text-lg">
            {t ? t('featured.subtitle') : 'Discover our most popular and highly-rated stays'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {apartments.map((apartment, index) => (
            <div
              key={apartment.id}
              className="h-full transition-transform duration-300 ease-out hover:-translate-y-0.5"
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
                  rooms: apartment.rooms,
                  hasBreakfastIncluded: apartment.hasBreakfastIncluded
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

export default FeaturedApartments;
