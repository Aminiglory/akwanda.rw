import React, { useEffect, useRef, useState } from 'react';
import { FaBuilding, FaSmile, FaThumbsUp, FaArrowRight } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { FaSearch, FaHandshake, FaCreditCard, FaKey, FaUpload, FaCheckCircle } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const HowItWorks = () => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState({ activeListings: 0, happyGuests: 0, satisfactionRate: 0 });
  const [animated, setAnimated] = useState({ activeListings: 0, happyGuests: 0, satisfactionRate: 0 });
  const statsRef = useRef(null);
  const [statsInView, setStatsInView] = useState(false);
  const [how, setHow] = useState({
    enabled: true,
    title: 'How AKWANDA.rw Works',
    subtitle: 'Simple steps for both guests and hosts',
    image: '',
    guestSteps: [],
    hostSteps: [],
    faqs: []
  });
  const [activeTab, setActiveTab] = useState('guests'); // guests | hosts
  const [heroSlides, setHeroSlides] = useState([]);
  const [openFaq, setOpenFaq] = useState(null);
  const [slideIndex, setSlideIndex] = useState(0);
  const slideTimer = useRef(null);
  const [paused, setPaused] = useState(false);
  const slideshowRef = useRef(null);
  const [slideshowInView, setSlideshowInView] = useState(true);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [sectionImagesGuests, setSectionImagesGuests] = useState([]);
  const [sectionImagesHosts, setSectionImagesHosts] = useState([]);
  useEffect(() => {
    (async () => {
      try {
  const res = await fetch(`${API_URL}/api/metrics/landing`);
  const data = await res.json();
  if (res.ok && data.metrics) setMetrics(data.metrics);
      } catch (_) {}
    })();
  }, []);

  // Reduced motion preference
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const h = () => setReduceMotion(!!mq.matches);
    h();
    mq.addEventListener?.('change', h);
    return () => mq.removeEventListener?.('change', h);
  }, []);

  // Load CMS how-it-works content
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/content/landing?t=${Date.now()}`);
        const raw = await res.json();
        if (!res.ok) return;
        const data = raw?.content || raw || {};
        const sections = Array.isArray(data?.sections) ? data.sections : [];
        const found = sections.find(s => s?.type === 'howItWorks' || s?.key === 'howItWorks') || data?.howItWorks;
        if (found && found.enabled !== false) {
          setHow({
            enabled: true,
            title: found.title || 'How AKWANDA.rw Works',
            subtitle: found.subtitle || 'Simple steps for both guests and hosts',
            image: found.image || '',
            guestSteps: Array.isArray(found.guestSteps) ? found.guestSteps : [],
            hostSteps: Array.isArray(found.hostSteps) ? found.hostSteps : [],
            faqs: Array.isArray(found.faqs) ? found.faqs : [],
            guestsTagline: found.guestsTagline || '',
            hostsTagline: found.hostsTagline || '',
            mediaIntervalMs: typeof found.mediaIntervalMs === 'number' ? found.mediaIntervalMs : 5000,
          });
        }
        // capture hero slides as a fallback media source
        const hs = Array.isArray(data?.heroSlides) ? data.heroSlides : [];
        setHeroSlides(hs.filter(s => !!(s?.image))); 
        // capture section images per tab (public schema)
        const secG = sections.find(s => s?.key === 'howItWorksGuests');
        const secH = sections.find(s => s?.key === 'howItWorksHosts');
        setSectionImagesGuests(Array.isArray(secG?.images) ? secG.images : []);
        setSectionImagesHosts(Array.isArray(secH?.images) ? secH.images : []);
      } catch (_) {}
    })();
  }, []);

  // Count-up animation for stats
  useEffect(() => {
    if (!statsInView) return;
    const start = performance.now();
    const duration = 1200;
    const from = { ...animated };
    const to = {
      activeListings: Number(metrics.activeListings || 0),
      happyGuests: Number(metrics.happyGuests || 0),
      satisfactionRate: Number(metrics.satisfactionRate || 0)
    };
    let rafId;
    const tick = (t) => {
      const elapsed = Math.min(1, (t - start) / duration);
      const ease = 1 - Math.pow(1 - elapsed, 3);
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
  }, [metrics.activeListings, metrics.happyGuests, metrics.satisfactionRate, statsInView]);

  // Observe stats section visibility
  useEffect(() => {
    const el = statsRef.current;
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) setStatsInView(true);
      });
    }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  const guestSteps = [
    {
      icon: FaSearch,
      title: "Search & Filter",
      description: "Find the perfect apartment using our advanced search filters",
      step: "1"
    },
    {
      icon: FaHandshake,
      title: "Book & Connect",
      description: "Book your stay and connect directly with the host",
      step: "2"
    },
    {
      icon: FaCreditCard,
      title: "Secure Payment",
      description: "Make secure payments through our platform",
      step: "3"
    },
    {
      icon: FaKey,
      title: "Enjoy Your Stay",
      description: "Check-in and enjoy your comfortable apartment",
      step: "4"
    }
  ];

  // Helper to normalize a media value into a string path
  const normalizePath = (val) => {
    if (typeof val === 'string') return val;
    const v = val || {};
    return v.path || v.url || v.src || v.location || v.publicUrl || v.secure_url || v.downloadUrl || '';
  };

  const hostSteps = [
    {
      icon: FaUpload,
      title: "List Your Place",
      description: "Create a listing with photos, description, and amenities",
      step: "1"
    },
    {
      icon: FaCheckCircle,
      title: "Get Approved",
      description: "Our team reviews and approves your listing",
      step: "2"
    },
    {
      icon: FaHandshake,
      title: "Receive Bookings",
      description: "Guests book your space and you get notified",
      step: "3"
    },
    {
      icon: FaCreditCard,
      title: "Get Paid",
      description: "Receive payments directly to your account",
      step: "4"
    }
  ];

  const renderSteps = (steps, forGuest) => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {steps.map((s, i) => {
        const Icon = s.icon;
        return (
          <div key={i} className="group relative modern-card-elevated p-6 hover:scale-105 transition-all duration-300">
            {/* Decorative blob */}
            <div className="pointer-events-none absolute -top-6 -right-6 w-24 h-24 bg-blue-50 rounded-full opacity-60"></div>
            <div className="relative mb-6">
              <div className="mx-auto mb-2 inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold text-gray-700 bg-gray-50">
                <span className={`inline-block w-2 h-2 rounded-full ${forGuest ? 'bg-blue-600' : 'bg-indigo-600'}`}></span>
                {forGuest ? 'Guest step' : 'Host step'}
              </div>
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto group-hover:bg-blue-600 transition-all duration-300 group-hover:scale-110">
                <Icon className="text-blue-600 text-2xl group-hover:text-white transition-colors duration-300" />
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                {s.step}
              </div>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {s.title}
            </h3>
            <div className="h-0.5 w-10 bg-blue-600 rounded mb-3"></div>
            <p className="text-gray-600 leading-relaxed">
              {s.description}
            </p>
            {s.image && (
              <div className="mt-4 overflow-hidden rounded-xl">
                <img src={s.image.startsWith('http') ? s.image : `${API_URL}${s.image}`} alt={s.title} loading="lazy" decoding="async" className="w-full h-40 object-cover" />
              </div>
            )}
            {/* CTA link removed for v1 */}
          </div>
        );
      })}
    </div>
  );

  // Map CMS icon string to actual icon component
  const iconFromString = (name, fallback) => {
    switch ((name || '').toLowerCase()) {
      case 'search': return FaSearch;
      case 'handshake': return FaHandshake;
      case 'creditcard': return FaCreditCard;
      case 'key': return FaKey;
      case 'upload': return FaUpload;
      case 'check': return FaCheckCircle;
      default: return fallback;
    }
  };

  const cmsGuestSteps = (how.guestSteps && how.guestSteps.length)
    ? how.guestSteps.map((s, i) => {
        const img = normalizePath(s.image);
        return {
          icon: iconFromString(s.icon, guestSteps[i % guestSteps.length]?.icon || FaSearch),
          title: s.title,
          description: s.description,
          image: img,
          step: String(i+1)
        };
      })
    : guestSteps;

  const cmsHostSteps = (how.hostSteps && how.hostSteps.length)
    ? how.hostSteps.map((s, i) => {
        const img = normalizePath(s.image);
        return {
          icon: iconFromString(s.icon, hostSteps[i % hostSteps.length]?.icon || FaUpload),
          title: s.title,
          description: s.description,
          image: img,
          step: String(i+1)
        };
      })
    : hostSteps;

  // Observe slideshow visibility to pause when offscreen
  useEffect(() => {
    const el = slideshowRef.current;
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => setSlideshowInView(!!e.isIntersecting));
    }, { threshold: 0.25 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Autoplay for media slideshow when there are images
  useEffect(() => {
    // Resolve slides using the same logic as render
    const steps = activeTab === 'guests' ? cmsGuestSteps : cmsHostSteps;
    let slides = steps.filter(s => (typeof s.image === 'string' && s.image.trim().length > 0));
    const tabImages = activeTab === 'guests' ? sectionImagesGuests : sectionImagesHosts;
    if (slides.length === 0 && Array.isArray(tabImages) && tabImages.length > 0) {
      slides = tabImages
        .map(src => (typeof src === 'string' ? src : (src?.path || src?.url || src?.src || src?.location || '')))
        .filter(src => typeof src === 'string' && src.trim().length > 0)
        .map(src => ({ title: how.title, description: how.subtitle, image: src }));
    }
    if (slides.length === 0 && Array.isArray(heroSlides) && heroSlides.length > 0) {
      slides = heroSlides
        .map(s => (typeof s.image === 'string' ? s.image : (s?.image?.path || s?.image?.url || s?.image?.src || s?.image?.location || '')))
        .filter(src => typeof src === 'string' && src.trim().length > 0)
        .map(src => ({ title: how.title, description: how.subtitle, image: src }));
    }
    const count = slides.length;
    setSlideIndex(0);
    if (reduceMotion || paused || !slideshowInView || count <= 1) return;
    slideTimer.current = setInterval(() => {
      setSlideIndex((i) => (i + 1) % count);
    }, Number.isFinite(how?.mediaIntervalMs) ? how.mediaIntervalMs : 5000);
    return () => clearInterval(slideTimer.current);
  }, [activeTab, cmsGuestSteps, cmsHostSteps, sectionImagesGuests, sectionImagesHosts, heroSlides, paused, reduceMotion, slideshowInView, how?.mediaIntervalMs]);

  return (
    <div className="bg-[#FFF9F3] py-16 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-extrabold text-[#2B1B0E] mb-2">{how.title}</h2>
          <p className="text-[#55381F] text-lg">{how.subtitle}</p>
        </div>

        {/* Tabs + media */}
        <div className="mb-12">
          {/* Segmented toggle */}
          <div className="flex items-center justify-center mb-2">
            <div className="inline-flex items-center bg-[#F2E8DC] rounded-full p-1">
              <button onClick={() => setActiveTab('guests')} className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${activeTab==='guests' ? 'bg-white text-[#2B1B0E] shadow' : 'text-[#6F4E2C] hover:text-[#2B1B0E]'}`}>For Guests</button>
              <button onClick={() => setActiveTab('hosts')} className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${activeTab==='hosts' ? 'bg-white text-[#2B1B0E] shadow' : 'text-[#6F4E2C] hover:text-[#2B1B0E]'}`}>For Hosts</button>
            </div>
          </div>
          {(activeTab==='guests' ? how.guestsTagline : how.hostsTagline) && (
            <div className="text-center text-gray-600 mb-4 text-sm">
              {activeTab==='guests' ? how.guestsTagline : how.hostsTagline}
            </div>
          )}

          {/* Section media slideshow on top */}
          <div
            ref={slideshowRef}
            className="relative rounded-2xl overflow-hidden bg-white/70 backdrop-blur shadow-md mb-8"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            role="region"
            aria-label="How it works media slideshow"
            tabIndex={0}
            onKeyDown={(e) => {
              const steps = activeTab==='guests' ? cmsGuestSteps : cmsHostSteps;
              let slides = steps
                .filter(s => (typeof s.image === 'string' && s.image.trim().length > 0))
                .map(s => ({ title: s.title, description: s.description, image: s.image, Icon: s.icon }));
              const tabImages = activeTab==='guests' ? sectionImagesGuests : sectionImagesHosts;
              if (slides.length === 0 && Array.isArray(tabImages) && tabImages.length > 0) {
                const DefaultIcon = activeTab==='guests' ? FaSearch : FaUpload;
                slides = tabImages
                  .map(src => (typeof src === 'string' ? src : (src?.path || src?.url || src?.src || src?.location || '')))
                  .filter(src => typeof src === 'string' && src.trim().length > 0)
                  .map(src => ({ title: how.title, description: how.subtitle, image: src, Icon: DefaultIcon }));
              }
              if (slides.length === 0 && Array.isArray(heroSlides) && heroSlides.length > 0) {
                const DefaultIcon2 = activeTab==='guests' ? FaSearch : FaUpload;
                slides = heroSlides
                  .map(s => (typeof s.image === 'string' ? s.image : (s?.image?.path || s?.image?.url || s?.image?.src || s?.image?.location || '')))
                  .filter(src => typeof src === 'string' && src.trim().length > 0)
                  .map(src => ({ title: how.title, description: how.subtitle, image: src, Icon: DefaultIcon2 }));
              }
              const count = slides.length;
              if (!count) return;
              if (e.key === 'ArrowRight') setSlideIndex(i => (i + 1) % count);
              if (e.key === 'ArrowLeft') setSlideIndex(i => (i - 1 + count) % count);
            }}
          >
            {(() => {
              const steps = activeTab==='guests' ? cmsGuestSteps : cmsHostSteps;
              let slides = steps.filter(s => (typeof s.image === 'string' && s.image.trim().length > 0));
              // fallback to tab-specific section images (public schema) if no step media
              const tabImages = activeTab==='guests' ? sectionImagesGuests : sectionImagesHosts;
              if (slides.length === 0 && Array.isArray(tabImages) && tabImages.length > 0) {
                slides = tabImages
                  .map(src => (typeof src === 'string' ? src : (src?.path || src?.url || src?.src || src?.location || '')))
                  .filter(src => typeof src === 'string' && src.trim().length > 0)
                  .map(src => ({ title: how.title, description: how.subtitle, image: src }));
              }
              // fallback to heroSlides if still empty
              if (slides.length === 0 && Array.isArray(heroSlides) && heroSlides.length > 0) {
                slides = heroSlides
                  .map(s => (typeof s.image === 'string' ? s.image : (s?.image?.path || s?.image?.url || s?.image?.src || s?.image?.location || '')))
                  .filter(src => typeof src === 'string' && src.trim().length > 0)
                  .map(src => ({ title: how.title, description: how.subtitle, image: src }));
              }
              const count = slides.length;
              // Debug: log counts to console to help diagnose zeros in production
              if (process.env.NODE_ENV !== 'production') {
                console.debug('[HowItWorks] slides count', { tab: activeTab, count, steps: steps.map(s => s.image) });
              }
              if (count === 0) {
                return <div className="aspect-video bg-[#F2E8DC] flex items-center justify-center text-[#8B5E34]">Section Media</div>;
              }
              return (
                <div className="aspect-video">
                  {slides.map((s, i) => (
                    <img
                      key={`i-${i}`}
                      src={s.image.startsWith('http') ? s.image : `${API_URL}${s.image}`}
                      alt={s.title}
                      className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${i===slideIndex ? 'opacity-100' : 'opacity-0'}`}
                      loading={i===0 ? 'eager' : 'lazy'}
                    />
                  ))}
                  <div className="absolute inset-x-0 bottom-0 p-3 z-10">
                    <div className="bg-[#FFF9F3]/90 backdrop-blur rounded-xl p-3 shadow">
                      <div className="flex items-center gap-2 mb-1">
                        {(() => { const Ico = slides[slideIndex]?.Icon; return Ico ? <Ico className="text-[#8B5E34] text-sm" /> : null; })()}
                        <div className="text-sm font-semibold text-[#2B1B0E] truncate">{slides[slideIndex]?.title}</div>
                      </div>
                      <div className="text-xs text-[#55381F] line-clamp-2">{slides[slideIndex]?.description}</div>
                    </div>
                  </div>
                  {count > 1 && (
                    <>
                      <button
                        aria-label="Previous media"
                        onClick={() => setSlideIndex(i => (i - 1 + count) % count)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 text-[#2B1B0E] shadow hover:bg-white z-10 focus:outline-none focus:ring-2 focus:ring-[#8B5E34]"
                      >
                        ‹
                      </button>
                      <button
                        aria-label="Next media"
                        onClick={() => setSlideIndex(i => (i + 1) % count)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 text-[#2B1B0E] shadow hover:bg-white z-10 focus:outline-none focus:ring-2 focus:ring-[#8B5E34]"
                      >
                        ›
                      </button>
                      <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-2 z-10">
                        {slides.map((_, i) => (
                          <button key={i} onClick={() => setSlideIndex(i)} aria-label={`Go to media ${i+1}`} className={`w-2.5 h-2.5 rounded-full ${i===slideIndex ? 'bg-[#8B5E34]' : 'bg-white/70'} focus:outline-none focus:ring-2 focus:ring-[#8B5E34]`} />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Cards under media */}
          {activeTab==='guests' ? renderSteps(cmsGuestSteps, true) : renderSteps(cmsHostSteps, false)}
        </div>

        {/* CTA for hosts */}
<<<<<<< HEAD
        <div className="rounded-2xl p-8 chocolate-gradient backdrop-blur shadow-md text-center">
          <Link 
            to={user ? "/upload-property" : "/register"} 
            className="modern-btn inline-block"
          >
            Become a Host
          </Link>
          <p className="high-contrast-text text-sm mt-3 font-medium">
            {user ? "List your apartment and start earning" : "Sign up to start listing your apartment"}
          </p>
=======
        <div className="rounded-2xl p-8 bg-[#F2E8DC] shadow-md text-center">
          <Link to="/register" className="bg-[#8B5E34] hover:bg-[#6F4E2C] text-white px-8 py-3 rounded-xl font-semibold transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl inline-block">
            Become a Host
          </Link>
          <p className="text-[#55381F] text-sm mt-2">Sign up to start listing your apartment</p>
>>>>>>> 4dc9325dd639458291d85614c2108bcb898d74d0
        </div>

        {/* Stats Section */}
        <div ref={statsRef} className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className={`relative p-6 rounded-2xl text-center bg-[#FFF9F3] shadow-xl hover:shadow-2xl transition-all duration-500 ${statsInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
               style={{ transitionDelay: '0ms' }}>
            <div className="absolute top-3 left-3 w-2 h-2 bg-[#CDAF8B] rounded"></div>
            <div className="mx-auto mb-2 w-10 h-10 rounded-full bg-[#F2E8DC] text-[#8B5E34] flex items-center justify-center"><FaBuilding /></div>
            <div className="text-4xl font-extrabold text-[#8B5E34] tracking-tight">{(animated.activeListings ?? 0).toLocaleString?.() || animated.activeListings || 0}</div>
            <div className="text-xs mt-1 text-[#6F4E2C] uppercase tracking-wide">Active Listings</div>
          </div>
          <div className={`relative p-6 rounded-2xl text-center bg-[#FFF9F3] shadow-xl hover:shadow-2xl transition-all duration-500 ${statsInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
               style={{ transitionDelay: '120ms' }}>
            <div className="absolute top-3 left-3 w-2 h-2 bg-[#CDAF8B] rounded"></div>
            <div className="mx-auto mb-2 w-10 h-10 rounded-full bg-[#F2E8DC] text-[#8B5E34] flex items-center justify-center"><FaSmile /></div>
            <div className="text-4xl font-extrabold text-[#8B5E34] tracking-tight">{(animated.happyGuests ?? 0).toLocaleString?.() || animated.happyGuests || 0}</div>
            <div className="text-xs mt-1 text-[#6F4E2C] uppercase tracking-wide">Happy Guests</div>
          </div>
          <div className={`relative p-6 rounded-2xl text-center bg-[#FFF9F3] shadow-xl hover:shadow-2xl transition-all duration-500 ${statsInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
               style={{ transitionDelay: '240ms' }}>
            <div className="absolute top-3 left-3 w-2 h-2 bg-[#CDAF8B] rounded"></div>
            <div className="mx-auto mb-2 w-10 h-10 rounded-full bg-[#F2E8DC] text-[#8B5E34] flex items-center justify-center"><FaThumbsUp /></div>
            <div className="text-4xl font-extrabold text-[#8B5E34] tracking-tight">{animated.satisfactionRate ?? 0}%</div>
            <div className="text-xs mt-1 text-[#6F4E2C] uppercase tracking-wide">Satisfaction Rate</div>
          </div>
        </div>

        {/* FAQ Accordion */}
        {how.faqs && how.faqs.length > 0 && (
          <div className="mt-14 max-w-4xl mx-auto">
            <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">Frequently Asked Questions</h3>
            <div className="rounded-xl bg-white/90 backdrop-blur shadow">
              {how.faqs.map((f, i) => (
                <div key={i}>
                  <button
                    className="w-full text-left px-5 py-4 flex items-center justify-between hover:bg-gray-50"
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    aria-expanded={openFaq === i}
                  >
                    <span className="font-semibold text-gray-800">{f.q}</span>
                    <span className="text-blue-600 text-xl">{openFaq === i ? '−' : '+'}</span>
                  </button>
                  <div className={`px-5 pb-4 text-gray-600 ${openFaq === i ? 'block' : 'hidden'}`}>{f.a}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HowItWorks;
