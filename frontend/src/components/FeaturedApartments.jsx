import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaStar, FaMapMarkerAlt, FaBed, FaBath } from 'react-icons/fa';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const FeaturedApartments = () => {
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
      try {
        const res = await fetch(`${API_URL}/api/properties`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to load properties');
        setApartments((data.properties || []).slice(0, 4).map(p => {
          // Calculate average rating and review count from ratings array
          const ratingsArr = p.ratings || [];
          const avgRating = ratingsArr.length > 0 ? (ratingsArr.reduce((sum, r) => sum + r.rating, 0) / ratingsArr.length) : null;
          return {
            id: p._id,
            title: p.title,
            location: `${p.address}, ${p.city}`,
            price: p.pricePerNight,
            rating: avgRating ? Number(avgRating.toFixed(1)) : null,
            reviews: ratingsArr.length,
            image: p.images && p.images.length ? makeAbsolute(p.images[0]) : 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=500&h=300&fit=crop',
            bedrooms: p.bedrooms ?? 2,
            bathrooms: p.bathrooms ?? 1,
            amenities: p.amenities || ["WiFi", "Parking", "Kitchen"],
            isAvailable: p.isActive,
            discountPercent: p.discountPercent || 0
          };
        }));
      } catch (_) {}
    })();
  }, []);

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
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2 text-gray-900">Featured Apartments</h2>
          <p className="text-gray-600 text-lg">Discover our most popular and highly-rated stays</p>
        </div>

        <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {apartments.map((apartment, index) => (
            <div
              key={apartment.id}
              className={`modern-card-elevated overflow-hidden hover:scale-105 transition-all duration-500 ${gridInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
              style={{ transitionDelay: `${index * 80}ms` }}
            >
              {/* Image */}
              <div className="relative h-48 overflow-hidden">
                <img
                  src={apartment.image}
                  alt={apartment.title}
                  loading="lazy"
                  decoding="async"
                  sizes="(min-width:1024px) 25vw, (min-width:768px) 50vw, 100vw"
                  className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                  onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=500&h=300&fit=crop'; }}
                />
                {!apartment.isAvailable && (
                  <div className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                    Unavailable
                  </div>
                )}
                <div className="absolute top-4 left-4 bg-black/60 text-white backdrop-blur-sm rounded-full px-3 py-1 text-xs font-semibold">
                  From RWF {apartment.price.toLocaleString()}/night
                </div>
                {apartment.discountPercent > 0 && (
                  <div className="absolute top-4 left-40 bg-green-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
                    {apartment.discountPercent}% OFF
                  </div>
                )}
                {/* Removed gradient overlay */}
              </div>

              {/* Content */}
              <div className="p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-1 line-clamp-2">
                  {apartment.title}
                </h3>
                
                <div className="flex items-center text-gray-600 mb-2">
                  <FaMapMarkerAlt className="text-blue-600 mr-1" />
                  <span className="text-sm truncate">{apartment.location}</span>
                </div>

                {/* Rating */}
                <div className="flex items-center mb-3">
                  <div className="flex items-center mr-2">
                    {apartment.rating ? renderStars(apartment.rating) : <span className="text-gray-400">No ratings</span>}
                  </div>
                  <span className="text-sm text-gray-600">
                    {apartment.rating ? `${apartment.rating} (${apartment.reviews} reviews)` : 'No ratings'}
                  </span>
                </div>

                {/* Bedrooms & Bathrooms */}
                <div className="flex items-center gap-4 mb-4 text-sm text-gray-600">
                  <div className="flex items-center">
                    <FaBed className="mr-1" />
                    {apartment.bedrooms} BR
                  </div>
                  <div className="flex items-center">
                    <FaBath className="mr-1" />
                    {apartment.bathrooms} Bath
                  </div>
                </div>

                {/* Amenities */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {apartment.amenities.slice(0, 3).map((amenity, idx) => (
                    <span
                      key={idx}
                      className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full"
                    >
                      {amenity}
                    </span>
                  ))}
                  {apartment.amenities.length > 3 && (
                    <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
                      +{apartment.amenities.length - 3} more
                    </span>
                  )}
                </div>

                {/* Book Button */}
                <Link
                  to={`/apartment/${apartment.id}`}
                  className={`w-full py-3 rounded-xl font-semibold transition-all duration-300 block text-center ${
                    apartment.isAvailable
                      ? 'bg-blue-600 hover:bg-blue-700 text-white hover:scale-[1.02]'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {apartment.isAvailable ? 'View Details' : 'Unavailable'}
                </Link>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-8 flex flex-col md:flex-row items-center justify-between text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
            <div className="mb-4 md:mb-0">
              <h4 className="text-2xl font-bold mb-2">Looking for more options?</h4>
              <p className="text-blue-100 text-lg">Browse all apartments and filter by location, price, and amenities.</p>
            </div>
            <Link to="/apartments" className="bg-white text-blue-700 px-8 py-4 rounded-xl font-bold hover:bg-blue-50 transition-all duration-300 shadow-lg hover:scale-105 transform">
              View All Apartments
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeaturedApartments;
