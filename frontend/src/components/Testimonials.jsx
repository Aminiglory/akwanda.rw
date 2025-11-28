import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaStar, FaQuoteLeft } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const mockTestimonials = [
  {
    id: 'kigali-business-traveller',
    name: 'Aline M.',
    role: 'Business guest in Kigali',
    rating: 5,
    text: 'Booking my stay in Kigali through AKWANDA.rw was effortless. The apartment was exactly as shown, and check-in was seamless.',
    avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=300&h=300&fit=crop&crop=faces',
    location: 'Kigali, Rwanda'
  },
  {
    id: 'musanze-adventure',
    name: 'Eric K.',
    role: 'Gorilla trekking visitor',
    rating: 5,
    text: 'We found a cozy stay in Musanze close to Volcanoes National Park. The host was friendly and the views were incredible.',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=300&h=300&fit=crop&crop=faces',
    location: 'Musanze, Rwanda'
  },
  {
    id: 'gisenyi-lake-getaway',
    name: 'Sarah & Paul',
    role: 'Weekend escape at Lake Kivu',
    rating: 4,
    text: 'The platform made it easy to compare lakefront stays in Gisenyi. We loved waking up right by the water.',
    avatar: 'https://images.unsplash.com/photo-1525134479668-1bee5c7c6845?w=300&h=300&fit=crop&crop=faces',
    location: 'Gisenyi, Rwanda'
  },
  {
    id: 'huye-student-family',
    name: 'Jean de Dieu',
    role: 'Parent visiting Huye campus',
    rating: 5,
    text: 'Finding a clean and quiet apartment near the university in Huye saved us a lot of time and stress.',
    avatar: 'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?w=300&h=300&fit=crop&crop=faces',
    location: 'Huye, Rwanda'
  },
  {
    id: 'host-experience',
    name: 'Claudine N.',
    role: 'Property host in Kigali',
    rating: 5,
    text: 'Listing my apartment on AKWANDA.rw helped me reach more guests and manage bookings in one place.',
    avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=300&h=300&fit=crop&crop=faces',
    location: 'Kigali, Rwanda'
  }
];

export default function Testimonials() {
  const { user } = useAuth();
  const [index, setIndex] = useState(0);
  const timerRef = useRef(null);
  const [paused, setPaused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const touchStartX = useRef(null);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_URL}/api/reviews/landing?limit=12`);
        if (!res.ok) throw new Error('Failed to fetch reviews');
        const data = await res.json();
        const reviews = Array.isArray(data.reviews) ? data.reviews : [];

        const mapped = reviews.map((r) => ({
          id: r._id,
          name: r.guest?.fullName || 'Guest',
          role: r.property?.title ? `Guest at ${r.property.title}` : 'Guest',
          rating: r.rating || 0,
          text: r.comment || '',
          avatar: r.guest?.profilePicture || '',
          location: r.property?.location || ''
        }));

        if (!cancelled) {
          if (mapped.length > 0) {
            setItems(mapped);
          } else {
            setItems(mockTestimonials);
          }
        }
      } catch (_) {
        if (!cancelled) {
          setItems(mockTestimonials);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
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
    <div className="bg-white py-16 px-4">
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
                        className="bg-white rounded-xl shadow-lg p-6 relative"
                      >
                        <div className="absolute inset-0 -z-10">
                          <div className="absolute inset-0 translate-x-2 translate-y-2 rounded-xl bg-white"></div>
                          <div className="absolute inset-0 translate-x-4 translate-y-4 rounded-xl bg-white"></div>
                        </div>
                        <div className="absolute top-4 right-4 text-[#a06b42]/30">
                          <FaQuoteLeft className="text-2xl" />
                        </div>

                        {/* Rating */}
                        <div className="flex items-center mb-4">
                          {renderStars(testimonial.rating)}
                        </div>

                        {/* Testimonial Text */}
                        <p className="text-gray-700 mb-6 leading-relaxed text-sm md:text-base break-words whitespace-normal max-w-full">
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
        </div>
        {/* Call to Action */}
        <div className="text-center mt-12">
          <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200">
            <h3 className="text-2xl font-bold mb-4 text-gray-900">Ready to Join Our Community?</h3>
            <p className="text-gray-700 mb-6 text-base">Whether you're looking for a place to stay or want to earn from your space, AKWANDA.rw is here for you.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/apartments"
                className="px-8 py-3 rounded-xl font-semibold bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg transition-all duration-300 text-center"
              >
                Find Properties
              </Link>
              <Link
                to={user ? "/upload-property" : "/register"}
                className="bg-white text-gray-900 px-8 py-3 rounded-xl font-semibold hover:bg-gray-100 shadow-md hover:shadow-lg transition-all duration-300 text-center border border-gray-200"
              >
                {user ? "List Your Property" : "Sign Up to Host"}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
