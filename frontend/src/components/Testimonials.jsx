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

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        setLoading(true);
        // First try to fetch real reviews
        const reviewsRes = await fetch(`${API_URL}/api/reviews/landing?limit=12`);
        if (reviewsRes.ok) {
          const reviewsData = await reviewsRes.json();
          if (reviewsData.reviews && reviewsData.reviews.length > 0) {
            // Map reviews to testimonial format
            const mappedReviews = reviewsData.reviews.map(review => ({
              _id: review._id,
              name: review.guest?.fullName || 'Anonymous',
              role: `Guest at ${review.property?.title || 'Property'}`,
              content: review.comment,
              rating: review.rating,
              image: review.guest?.profilePicture || '',
              createdAt: review.createdAt
            }));
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
          setItems(normalized);
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
                        key={testimonial.id}
                        className={`modern-card-elevated p-6 hover:scale-105 transition-all duration-500 relative ${pIdx === index ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
                        style={{ transitionDelay: `${idx * 80}ms` }}
                      >
                        {/* Quote Icon */}
                        <div className="absolute top-4 right-4 text-blue-200">
                          <FaQuoteLeft className="text-2xl" />
                        </div>

                        {/* Rating */}
                        <div className="flex items-center mb-4">
                          {renderStars(testimonial.rating)}
                        </div>

                        {/* Testimonial Text */}
                        <p className="text-gray-700 mb-6 leading-relaxed">
                          "{testimonial.text}"
                        </p>

                        {/* User Info */}
                        <div className="flex items-center">
                          <img
                            src={testimonial.avatar}
                            alt={testimonial.name}
                            className="w-12 h-12 rounded-full object-cover mr-4"
                          />
                          <div>
                            <h4 className="font-semibold text-gray-800">
                              {testimonial.name}
                            </h4>
                            <p className="text-sm text-gray-600">
                              {testimonial.role}
                            </p>
                            {testimonial.location && (
                              <p className="text-sm text-blue-600">
                                📍 {testimonial.location}
                              </p>
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

          {/* Controls */}
          {items.length > 3 && (
            <div className="flex items-center justify-between mt-6">
              <button
                aria-label="Previous testimonials"
                onClick={() => setIndex(i => (i - 1 + pages.length) % pages.length)}
                className="group inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 shadow-lg hover:shadow-xl hover:bg-gray-50 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                  <FaChevronLeft />
                </span>
                <span className="text-sm font-semibold text-gray-800 hidden sm:inline">Prev</span>
              </button>
              <div className="flex items-center gap-3">
                {pages.map((_, i) => (
                  <button
                    key={i}
                    aria-label={`Go to testimonials page ${i + 1}`}
                    aria-pressed={i === index}
                    onClick={() => setIndex(i)}
                    className={`rounded-full transition-all ${i === index ? 'bg-blue-600' : 'bg-gray-300'} w-3 h-3 md:w-2.5 md:h-2.5`}
                  />
                ))}
              </div>
              <button
                aria-label="Next testimonials"
                onClick={() => setIndex(i => (i + 1) % pages.length)}
                className="group inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 shadow-lg hover:shadow-xl hover:bg-gray-50 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <span className="text-sm font-semibold text-gray-800 hidden sm:inline">Next</span>
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                  <FaChevronRight />
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Call to Action */}
        <div className="text-center mt-12">
          <div className="chocolate-gradient rounded-2xl p-8 shadow-lg">
            <h3 className="text-2xl font-bold mb-4 high-contrast-text">
              Ready to Join Our Community?
            </h3>
            <p className="medium-contrast-text mb-6 text-base">
              Whether you're looking for a place to stay or want to earn from your space, AKWANDA.rw is here for you.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/apartments" className="modern-btn text-center">
                Find an Apartment
              </Link>
              <Link 
                to={user ? "/upload-property" : "/register"} 
                className="border-2 border-gray-600 high-contrast-text px-8 py-3 rounded-xl font-semibold hover:bg-gray-600 hover:text-white transition-all duration-300 text-center"
              >
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
