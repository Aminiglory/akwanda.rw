import React, { useState, useEffect, useMemo, useRef } from "react";
import { FaBuilding, FaSmile, FaThumbsUp } from 'react-icons/fa';
import img from "../assets/images/home.jpg"

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Hero = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [metrics, setMetrics] = useState({ activeListings: 0, happyGuests: 0, satisfactionRate: 0 });
  const [slides, setSlides] = useState([]); // array of { image, caption }
  const [index, setIndex] = useState(0);
  const timerRef = useRef(null);
  const [intervalMs, setIntervalMs] = useState(5000);
  const [transition, setTransition] = useState('fade');
  const [heroTitle, setHeroTitle] = useState('');
  const [heroSubtitle, setHeroSubtitle] = useState('');
  const [animated, setAnimated] = useState({ activeListings: 0, happyGuests: 0, satisfactionRate: 0 });
  const [reduceMotion, setReduceMotion] = useState(false);
  const [parallax, setParallax] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef(null);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  // Detect prefers-reduced-motion
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = () => setReduceMotion(!!mq.matches);
    handler();
    mq.addEventListener?.('change', handler);
    return () => mq.removeEventListener?.('change', handler);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/admin/metrics`);
        const data = await res.json();
        if (!res.ok) return;
        if (data.metrics) setMetrics(data.metrics);
        else {
          const m = {
            activeListings: data.activeListings ?? 0,
            happyGuests: data.happyGuests ?? 0,
            satisfactionRate: data.satisfactionRate ?? 0,
          };
          setMetrics(m);
        }
      } catch (_) {}
    })();
  }, []);

  // Load published landing content (hero images/slides managed by admin)
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/content/landing`);
        const data = await res.json();
        if (res.ok && data?.content) {
          const c = data.content;
          const fromSlides = Array.isArray(c.heroSlides) && c.heroSlides.length > 0
            ? c.heroSlides.map(s => ({ image: s.image, caption: s.caption || '' }))
            : (Array.isArray(c.heroImages) ? c.heroImages.map(img => ({ image: img, caption: '' })) : []);
          setSlides(fromSlides);
          setIntervalMs(typeof c.heroIntervalMs === 'number' && c.heroIntervalMs >= 2000 ? c.heroIntervalMs : 5000);
          setTransition(c.heroTransition === 'slide' ? 'slide' : 'fade');
          setHeroTitle(c.heroTitle || '');
          setHeroSubtitle(c.heroSubtitle || '');
        } else setSlides([]);
      } catch (_) {
        setSlides([]);
      }
    })();
  }, []);

  // Autoplay slideshow
  useEffect(() => {
    if (reduceMotion || paused) return;
    if (!slides || slides.length <= 1) return;
    timerRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, intervalMs || 5000);
    return () => clearInterval(timerRef.current);
  }, [slides, intervalMs, reduceMotion, paused]);

  // Parallax effect on scroll
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY || 0;
      setParallax(Math.max(-20, Math.min(20, y * 0.05)));
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Count-up animation for metrics
  useEffect(() => {
    const start = performance.now();
    const duration = 1200; // ms
    const from = { ...animated };
    const to = {
      activeListings: Number(metrics.activeListings || 0),
      happyGuests: Number(metrics.happyGuests || 0),
      satisfactionRate: Number(metrics.satisfactionRate || 0)
    };
    let rafId;
    const tick = (t) => {
      const elapsed = Math.min(1, (t - start) / duration);
      const ease = 1 - Math.pow(1 - elapsed, 3); // easeOutCubic
      setAnimated({
        activeListings: Math.round(from.activeListings + (to.activeListings - from.activeListings) * ease),
        happyGuests: Math.round(from.happyGuests + (to.happyGuests - from.happyGuests) * ease),
        satisfactionRate: Math.round(from.satisfactionRate + (to.satisfactionRate - from.satisfactionRate) * ease),
      });
      if (elapsed < 1) rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metrics.activeListings, metrics.happyGuests, metrics.satisfactionRate]);

  return (
    <div className="relative w-full min-h-[600px] overflow-hidden">
      {/* Slides */}
      <div
        className="absolute inset-0"
        style={{ transform: `translateY(${reduceMotion ? 0 : parallax}px)`, willChange: 'transform' }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={() => setPaused(false)}
        onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
        onTouchEnd={(e) => {
          const endX = e.changedTouches[0].clientX;
          const delta = (touchStartX.current ?? endX) - endX;
          if (Math.abs(delta) > 40) {
            if (delta > 0) setIndex(i => (i + 1) % (slides.length || 1));
            else setIndex(i => (i - 1 + (slides.length || 1)) % (slides.length || 1));
          }
          touchStartX.current = null;
        }}
      >
        {(slides.length ? slides : [{ image: img, caption: '' }]).map((s, i) => {
          const src = s.image;
          const url = typeof src === 'string' && src.startsWith('http') ? src : `${API_URL}${src}`;
          const active = i === index;
          return (
            <img
              key={i}
              src={slides.length ? url : src}
              alt={`slide-${i+1}`}
              className={`absolute inset-0 w-full h-full object-cover ${transition === 'fade' ? 'transition-opacity duration-700' : 'transition-transform duration-700'} ${active ? (transition === 'fade' ? 'opacity-100' : 'translate-x-0') : (transition === 'fade' ? 'opacity-0' : 'translate-x-full')}`}
              loading={i === 0 ? 'eager' : 'lazy'}
            />
          );
        })}
        {/* Dark overlay for readability */}
        <div className="absolute inset-0 bg-black/40"></div>
      </div>

      {/* Overlay content */}
      <div
        className={`relative z-10 max-w-7xl mx-auto px-4 py-20 md:py-28 lg:py-36 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}
        role="region"
        aria-label="Hero slideshow"
        tabIndex={0}
        onKeyDown={(e) => {
          if (slides.length <= 1) return;
          if (e.key === 'ArrowRight') setIndex(i => (i + 1) % slides.length);
          if (e.key === 'ArrowLeft') setIndex(i => (i - 1 + slides.length) % slides.length);
        }}
      >
        <h1 className="text-white text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight">
          {heroTitle || 'Welcome to AKWANDA.rw'}
        </h1>
        <p className="mt-4 text-blue-100 text-lg md:text-xl max-w-2xl">
          {heroSubtitle || 'Find places to stay, cars, and attractions'}
        </p>

        {slides[index]?.caption && (
          <div className="mt-3 inline-block bg-white/20 text-white px-4 py-2 rounded-lg text-sm md:text-base backdrop-blur">
            {slides[index].caption}
          </div>
        )}

        {/* Metrics */}
        <div className="grid grid-cols-3 gap-4 mt-8 text-white max-w-md">
          <div className="relative p-4 rounded-2xl text-center bg-white/15 backdrop-blur border border-white/30 shadow-xl hover:shadow-2xl transition-transform duration-300 hover:-translate-y-0.5">
            <div className="absolute top-2 left-2 w-2 h-2 bg-white/60 rounded"></div>
            <div className="mx-auto mb-1 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center"><FaBuilding /></div>
            <div className="text-3xl font-extrabold tracking-tight">{(animated.activeListings ?? 0).toLocaleString?.() || animated.activeListings || 0}</div>
            <div className="text-xs mt-1 text-blue-100 uppercase tracking-wide">Active Listings</div>
          </div>
          <div className="relative p-4 rounded-2xl text-center bg-white/15 backdrop-blur border border-white/30 shadow-xl hover:shadow-2xl transition-transform duration-300 hover:-translate-y-0.5">
            <div className="absolute top-2 left-2 w-2 h-2 bg-white/60 rounded"></div>
            <div className="mx-auto mb-1 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center"><FaSmile /></div>
            <div className="text-3xl font-extrabold tracking-tight">{(animated.happyGuests ?? 0).toLocaleString?.() || animated.happyGuests || 0}</div>
            <div className="text-xs mt-1 text-blue-100 uppercase tracking-wide">Happy Guests</div>
          </div>
          <div className="relative p-4 rounded-2xl text-center bg-white/15 backdrop-blur border border-white/30 shadow-xl hover:shadow-2xl transition-transform duration-300 hover:-translate-y-0.5">
            <div className="absolute top-2 left-2 w-2 h-2 bg-white/60 rounded"></div>
            <div className="mx-auto mb-1 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center"><FaThumbsUp /></div>
            <div className="text-3xl font-extrabold tracking-tight">{animated.satisfactionRate ?? 0}%</div>
            <div className="text-xs mt-1 text-blue-100 uppercase tracking-wide">Satisfaction Rate</div>
          </div>
        </div>

        {/* Controls & indicators */}
        {slides.length > 1 && (
          <>
            <button
              aria-label="Previous slide"
              onClick={() => setIndex((i) => (i - 1 + slides.length) % slides.length)}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 rounded-full w-10 h-10 flex items-center justify-center shadow"
            >
              ‹
            </button>
            <button
              aria-label="Next slide"
              onClick={() => setIndex((i) => (i + 1) % slides.length)}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 rounded-full w-10 h-10 flex items-center justify-center shadow"
            >
              ›
            </button>
            <div className="absolute bottom-5 left-0 right-0 flex items-center justify-center gap-3 z-10">
              {slides.map((_, i) => (
                <button
                  key={i}
                  aria-label={`Go to slide ${i+1}`}
                  aria-pressed={i === index}
                  onClick={() => setIndex(i)}
                  className={`rounded-full ${i === index ? 'bg-white' : 'bg-white/60'} border border-white/70 w-3 h-3 md:w-2.5 md:h-2.5`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Hero;
