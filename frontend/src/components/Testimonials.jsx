import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaStar, FaQuoteLeft, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Testimonials = () => {
  const { user } = useAuth();
  const [index, setIndex] = useState(0);
  const timerRef = useRef(null);
  const [paused, setPaused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const touchStartX = useRef(null);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const makeAbsolute = (u) => {
    if (!u) return '';
    let s = String(u).trim();
    if (/^https?:\/\//i.test(s)) return s;
    if (!s.startsWith('/')) s = `/${s}`;
    return `${API_URL}${s}`;
  };

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        setLoading(true);
        // First try to fetch real reviews
        const reviewsRes = await fetch(`${API_URL}/api/reviews/landing?limit=30`);
        if (reviewsRes.ok) {
          const reviewsData = await reviewsRes.json();
          if (reviewsData.reviews && reviewsData.reviews.length > 0) {
            // Map reviews to testimonial format
            const mappedReviewsRaw = reviewsData.reviews.map(review => ({
              _id: review._id,
              name: review.guest?.fullName || 'Anonymous',
              role: `Guest at ${review.property?.title || 'Property'}`,
              content: review.comment,
              rating: review.rating,
              image: makeAbsolute(review.guest?.profilePicture || ''),
              createdAt: review.createdAt
            }));
            const mappedReviews = mappedReviewsRaw
              .filter(r => (Number(r.rating) || 0) >= 4)
              .sort((a, b) => {
                const r = (b.rating || 0) - (a.rating || 0);
                if (r !== 0) return r;
                return new Date(b.createdAt) - new Date(a.createdAt);
              })
              .slice(0, 12);
            if (!ignore) {
              setItems(mappedReviews);
              setLoading(false);
              return;
            }
          }
        }
        
        // Fallback to testimonials if no reviews
        const res = await fetch(`${API_URL}/api/testimonials`);
        if (!res.ok) {
          if (!ignore) setItems([]);
          return;
        }
        const data = await res.json();
        if (!ignore) {
          const list = Array.isArray(data.testimonials) ? data.testimonials : [];
          // Map to UI shape with fallbacks
          const normalized = list.map((t, i) => ({
            id: `${t.propertyTitle || 'prop'}-${i}`,
            name: t.propertyTitle || 'Guest',
            role: `Rated ${t.rating || 0}/5`,
            rating: Math.max(1, Math.min(5, Math.round(Number(t.rating || 0)))) || 5,
            text: t.comment || '',
            avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face',
            location: ''
          }));
          const top = normalized.filter(r => r.rating >= 4).slice(0, 12);
          setItems(top);
        }
      } catch (_) {
        setItems([]);
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, []);


  const renderStars = (rating) => {
    const safe = Math.max(0, Math.min(5, Number(rating) || 0));
    return Array.from({ length: 5 }, (_, i) => (
      <FaStar
        key={i}
        className={`${i < safe ? 'text-yellow-400' : 'text-gray-300'}`}
      />
    ));
  };

  // Reduced motion
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = () => setReduceMotion(!!mq.matches);
    handler();
    mq.addEventListener?.('change', handler);
    return () => mq.removeEventListener?.('change', handler);
  }, []);

  // Autoplay
  useEffect(() => {
    if (paused || reduceMotion) return;
    const pagesCount = Math.max(1, Math.ceil(items.length / 3));
    timerRef.current = setInterval(() => {
      setIndex(i => (i + 1) % pagesCount);
    }, 6000);
    return () => clearInterval(timerRef.current);
  }, [paused, reduceMotion, items.length]);

  const pageSize = 3; // show 3 cards on desktop
  const pages = [];
  for (let i = 0; i < items.length; i += pageSize) {
    pages.push(items.slice(i, i + pageSize));
  }

  // Hide section entirely if no real testimonials
  if (!loading && items.length === 0) return null;

  return (
    <div className="bg-gray-50 py-16 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">
            What Our Users Say
          </h2>
          <p className="text-gray-600 text-lg">
            Real experiences from our community
          </p>
        </div>

        {/* Carousel */}
        <div className="relative">
          <div
            className="overflow-hidden"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocusCapture={() => setPaused(true)}
            onBlurCapture={() => setPaused(false)}
            onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
            onTouchEnd={(e) => {
              const endX = e.changedTouches[0].clientX;
              const delta = (touchStartX.current ?? endX) - endX;
              if (Math.abs(delta) > 40) {
                if (delta > 0) setIndex(i => (i + 1) % pages.length);
                else setIndex(i => (i - 1 + pages.length) % pages.length);
              }
              touchStartX.current = null;
            }}
          >
            <div
              role="region"
              aria-label="User testimonials"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'ArrowRight') setIndex(i => (i + 1) % pages.length);
                if (e.key === 'ArrowLeft') setIndex(i => (i - 1 + pages.length) % pages.length);
              }}
              className="whitespace-nowrap transition-transform duration-500"
              style={{ transform: `translateX(-${index * 100}%)` }}
            >
              {(loading && items.length === 0) ? (
                <div className="p-6 text-center text-gray-500">Loading testimonials…</div>
              ) : (
                pages.map((page, pIdx) => (
                  <div className="inline-grid w-full align-top grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pr-0 md:pr-8" key={pIdx} style={{ width: '100%' }}>
                    {page.map((testimonial, idx) => (
                      <div
                        key={testimonial._id || testimonial.id}
                        className={`bg-white rounded-xl shadow-lg p-6 hover:scale-105 hover:shadow-xl transition-all duration-500 relative ${pIdx === index ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
                        style={{ transitionDelay: `${idx * 80}ms` }}
                      >
                        <div className="absolute inset-0 -z-10">
                          <div className="absolute inset-0 translate-x-2 translate-y-2 rounded-xl bg-[#f3ede6]"></div>
                          <div className="absolute inset-0 translate-x-4 translate-y-4 rounded-xl bg-[#e9dfd5]"></div>
                        </div>
                        <div className="absolute top-4 right-4 text-[#a06b42]/30">
                          <FaQuoteLeft className="text-2xl" />
                        </div>

                        {/* Rating */}
                        <div className="flex items-center mb-4">
                          {renderStars(testimonial.rating)}
                        </div>

                        {/* Testimonial Text */}
                        <p className="text-gray-700 mb-6 leading-relaxed">
                          "{testimonial.content || testimonial.text}"
                        </p>

                        {/* User Info */}
                        <div className="flex items-center">
                          {testimonial.image || testimonial.avatar ? (
                            <img
                              src={testimonial.image || testimonial.avatar}
                              alt={testimonial.name}
                              className="w-12 h-12 rounded-full object-cover mr-4"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div className={`w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-lg font-semibold mr-4 ${testimonial.image || testimonial.avatar ? 'hidden' : ''}`}>
                            {testimonial.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-800">{testimonial.name}</h4>
                            <p className="text-sm text-gray-600">{testimonial.role}</p>
                            {testimonial.location && (
                              <p className="text-sm text-[#a06b42]">📍 {testimonial.location}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>
        {/* Call to Action */}
        <div className="text-center mt-12">
          <div className="chocolate-gradient rounded-2xl p-8 shadow-lg">
            <h3 className="text-2xl font-bold mb-4 high-contrast-text">Ready to Join Our Community?</h3>
            <p className="medium-contrast-text mb-6 text-base">Whether you're looking for a place to stay or want to earn from your space, AKWANDA.rw is here for you.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/apartments" className="modern-btn text-center">Find an Apartment</Link>
              <Link to={user ? "/upload-property" : "/register"} className="bg-white high-contrast-text px-8 py-3 rounded-xl font-semibold hover:bg-gray-100 shadow-md hover:shadow-lg transition-all duration-300 text-center">
                {user ? "List Your Property" : "Sign Up to Host"}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Testimonials;
