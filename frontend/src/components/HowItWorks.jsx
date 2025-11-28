import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocale } from '../contexts/LocaleContext';
import { FaBuilding, FaSmile, FaThumbsUp, FaArrowRight } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { FaSearch, FaHandshake, FaCreditCard, FaKey, FaUpload, FaCheckCircle } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import LazyImage from './LazyImage';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const HowItWorks = () => {
  const { user } = useAuth();
  const { localize, t } = useLocale() || {};
  const [metrics, setMetrics] = useState({ activeListings: 0, happyGuests: 0, satisfactionRate: 0 });
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
  const touchStartX = useRef(null);
  const [sectionImagesGuests, setSectionImagesGuests] = useState([]);
  const [sectionImagesHosts, setSectionImagesHosts] = useState([]);
  const [howMedia, setHowMedia] = useState([]); // server-provided media items
  const [testimonials, setTestimonials] = useState([]);
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/metrics/landing`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.metrics) setMetrics(data.metrics);
      } catch (_) {}
    })();
  }, []);

  // Load How It Works media from server (non-breaking: prefers this if available)
  useEffect(() => {
    (async () => {
      try {
        const audience = activeTab === 'hosts' ? 'hosts' : 'guests';
        const res = await fetch(`${API_URL}/api/how-it-works?audience=${audience}`);
        if (!res.ok) return;
        const data = await res.json();
        const items = Array.isArray(data.items) ? data.items : [];
        setHowMedia(items);
        // Reset slide to first when switching source
        setSlideIndex(0);
      } catch (_) {
        setHowMedia([]);
      }
    })();
  }, [activeTab]);

  // Load testimonials (real user comments)
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/testimonials?limit=12`);
        if (!res.ok) return;
        const data = await res.json();
        setTestimonials(Array.isArray(data.testimonials) ? data.testimonials : []);
      } catch (_) {}
    })();
  }, []);

  // Reduced motion preference
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const h = () => setReduceMotion(!!mq.matches);
    h();
    if (mq && typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', h);
    } else if (mq && typeof mq.addListener === 'function') {
      // Safari/older browsers
      mq.addListener(h);
    }
    return () => {
      if (mq && typeof mq.removeEventListener === 'function') {
        mq.removeEventListener('change', h);
      } else if (mq && typeof mq.removeListener === 'function') {
        mq.removeListener(h);
      }
    };
  }, []);

  // Load CMS how-it-works content
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/content/landing?t=${Date.now()}`);
        if (!res.ok) return;
        const raw = await res.json();
        const data = (raw && raw.content) || raw || {};
        const sections = Array.isArray(data && data.sections) ? data.sections : [];
        const found = sections.find(s => (s && (s.type === 'howItWorks' || s.key === 'howItWorks'))) || (data && data.howItWorks);
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
        const hs = Array.isArray(data && data.heroSlides) ? data.heroSlides : [];
        setHeroSlides(hs.filter(s => !!(s && s.image))); 
        // capture section images per tab (public schema)
        const secG = sections.find(s => s && s.key === 'howItWorksGuests');
        const secH = sections.find(s => s && s.key === 'howItWorksHosts');
        setSectionImagesGuests(Array.isArray(secG && secG.images) ? secG.images : []);
        setSectionImagesHosts(Array.isArray(secH && secH.images) ? secH.images : []);
      } catch (_) {}
    })();
  }, []);

  // Render stats directly without scroll-triggered count-up animation
  const guestSteps = [
    {
      icon: FaSearch,
      title: "Search & Filter",
      description: "Find the perfect property using our advanced search filters",
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
                <LazyImage 
                  src={s.image.startsWith('http') ? s.image : `${API_URL}${s.image}`} 
                  alt={s.title} 
                  className="w-full h-40 object-cover"
                  category="default"
                  size="medium"
                />
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
          icon: iconFromString(s.icon, (guestSteps[i % guestSteps.length] && guestSteps[i % guestSteps.length].icon) || FaSearch),
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
          icon: iconFromString(s.icon, (hostSteps[i % hostSteps.length] && hostSteps[i % hostSteps.length].icon) || FaUpload),
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

  // Compute slideshow images using OurMission pattern (per tab)
  const currentImages = useMemo(() => {
    const tabImages = activeTab === 'guests' ? sectionImagesGuests : sectionImagesHosts;
    // 1) Prefer tab-specific images (uploaded via AdminLanding)
    let list = Array.isArray(tabImages) ? tabImages.slice() : [];
    // 2) If empty, try server-provided howMedia
    if (!list.length && Array.isArray(howMedia) && howMedia.length) {
      list = howMedia.map(m => m?.image).filter(Boolean);
    }
    // 3) If still empty, fallback to heroSlides
    if (!list.length && Array.isArray(heroSlides) && heroSlides.length) {
      list = heroSlides.map(s => s?.image).filter(Boolean);
    }
    // Normalize to full URLs compatible with <img src>
    return list
      .map(img => {
        if (!img) return null;
        const s = String(img).trim();
        if (/^https?:\/\//i.test(s)) return s;
        const path = s.startsWith('/') ? s : `/${s}`;
        return `${API_URL}${path}`;
      })
      .filter(Boolean);
  }, [activeTab, sectionImagesGuests, sectionImagesHosts, howMedia, heroSlides]);

  // Autoplay for media slideshow (OurMission-like)
  useEffect(() => {
    const count = currentImages.length;
    // Reset to first slide when tab or images change
    setSlideIndex(0);
    if (reduceMotion || paused || !slideshowInView || count <= 1) return;
    slideTimer.current = setInterval(() => {
      setSlideIndex((i) => (i + 1) % count);
    }, (typeof how.mediaIntervalMs === 'number' && Number.isFinite(how.mediaIntervalMs)) ? how.mediaIntervalMs : 5000);
    return () => { if (slideTimer.current) clearInterval(slideTimer.current); };
  }, [activeTab, currentImages, paused, reduceMotion, slideshowInView, how.mediaIntervalMs]);

  return (
    <div className="px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-center mb-2">
          <div className="inline-flex items-center bg-[#F2E8DC] rounded-full p-1">
            <button onClick={() => setActiveTab('guests')} className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${activeTab==='guests' ? 'bg-white text-[#2B1B0E] shadow' : 'text-[#6F4E2C] hover:text-[#2B1B0E]'}`}>{t ? t('how.forGuests') : 'For Guests'}</button>
            <button onClick={() => setActiveTab('hosts')} className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${activeTab==='hosts' ? 'bg-white text-[#2B1B0E] shadow' : 'text-[#6F4E2C] hover:text-[#2B1B0E]'}`}>{t ? t('how.forHosts') : 'For Hosts'}</button>
          </div>
        </div>
        {(activeTab==='guests' ? (localize ? localize(how.guestsTagline) : how.guestsTagline) : (localize ? localize(how.hostsTagline) : how.hostsTagline)) && (
          <div className="text-center text-gray-600 mb-4 text-sm">
            {activeTab==='guests' ? (localize ? localize(how.guestsTagline) : how.guestsTagline) : (localize ? localize(how.hostsTagline) : how.hostsTagline)}
          </div>
        )}

        {/* Section media slideshow on top (OurMission-like) */}
        <div
          ref={slideshowRef}
          className="relative rounded-2xl overflow-hidden bg-white/70 backdrop-blur shadow-md mb-8"
          role="region"
          aria-label="How it works slideshow"
          tabIndex={0}
          onKeyDown={(e) => {
            if (currentImages.length <= 1) return;
            if (e.key === 'ArrowRight') setSlideIndex(i => (i + 1) % currentImages.length);
            if (e.key === 'ArrowLeft') setSlideIndex(i => (i - 1 + currentImages.length) % currentImages.length);
          }}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
          onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
          onTouchEnd={(e) => {
            const endX = e.changedTouches[0].clientX;
            const delta = (touchStartX.current ?? endX) - endX;
            if (Math.abs(delta) > 40) {
              if (delta > 0) setSlideIndex(i => (i + 1) % currentImages.length);
              else setSlideIndex(i => (i - 1 + currentImages.length) % currentImages.length);
            }
            touchStartX.current = null;
          }}
        >
          {currentImages.length > 0 ? (
            currentImages.map((src, i) => (
              <LazyImage
                key={i}
                src={src}
                alt={activeTab === 'guests' ? 'How it works for guests' : 'How it works for hosts'}
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${i === slideIndex ? 'opacity-100' : 'opacity-0'}`}
                eager={i === 0}
                category="default"
                size="large"
              />
            ))
          ) : (
            <div className="aspect-video bg-[#F2E8DC] flex items-center justify-center text-[#8B5E34]">Section Media</div>
          )}

          {currentImages.length > 1 && (
            <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-2 z-10">
              {currentImages.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setSlideIndex(i)}
                  aria-label={`Go to media ${i+1}`}
                  className={`w-2.5 h-2.5 rounded-full ${i === slideIndex ? 'bg-[#8B5E34]' : 'bg-white/70'} focus:outline-none focus:ring-2 focus:ring-[#8B5E34]`}
                />
              ))}
            </div>
          )}

          {currentImages.length > 1 && (
            <>
              <button
                aria-label="Previous media"
                onClick={() => setSlideIndex(i => (i - 1 + currentImages.length) % currentImages.length)}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 text-[#2B1B0E] shadow hover:bg-white z-10 focus:outline-none focus:ring-2 focus:ring-[#8B5E34]"
              >
                {'<'}
              </button>
              <button
                aria-label="Next media"
                onClick={() => setSlideIndex(i => (i + 1) % currentImages.length)}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 text-[#2B1B0E] shadow hover:bg-white z-10 focus:outline-none focus:ring-2 focus:ring-[#8B5E34]"
              >
                {'>'}
              </button>
            </>
          )}
        </div>

          {/* Cards under media */}
          {activeTab==='guests' ? renderSteps(cmsGuestSteps, true) : renderSteps(cmsHostSteps, false)}


        {/* How It Works gallery (server-provided items) */}
        {howMedia && howMedia.length > 0 && (
          <div className="mb-12">
            <h3 className="text-xl font-bold text-[#2B1B0E] mb-3">{t ? t('how.moreOnHow') : 'More on how it works'}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {howMedia.map((m, i) => (
                <div key={i} className="bg-white rounded-xl shadow p-3 border border-gray-100">
                  <div className="aspect-video rounded-lg overflow-hidden bg-gray-100">
                    <LazyImage 
                      src={(m.image && m.image.startsWith('http')) ? m.image : `${API_URL}${m.image}`} 
                      alt={m.title || 'How it works'} 
                      className="w-full h-full object-cover"
                      category="default"
                      size="medium"
                    />
                  </div>
                  {(m.title || m.description) && (
                    <div className="mt-2">
                      {m.title && (<div className="font-semibold text-gray-900 text-sm">{m.title}</div>)}
                      {m.description && (<div className="text-xs text-gray-600 mt-0.5">{m.description}</div>)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA for hosts */}
        <div className="rounded-2xl p-8 chocolate-gradient backdrop-blur shadow-md text-center">
          <Link 
            to={user ? "/upload-property" : "/register"} 
            className="modern-btn inline-block"
          >
            {t ? t('how.ctaBecomeHost') : 'Become a Host'}
          </Link>
          <p className="high-contrast-text text-sm mt-3 font-medium">
            {user ? (t ? t('how.ctaGuests') : 'List your property and start earning') : (t ? t('how.ctaAuth') : 'Sign up to start listing your apartment')}
          </p>
        </div>

        {/* Stats Section (static) */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="relative p-6 rounded-2xl text-center bg-[#FFF9F3] shadow-xl">
            <div className="absolute top-3 left-3 w-2 h-2 bg-[#CDAF8B] rounded"></div>
            <div className="mx-auto mb-2 w-10 h-10 rounded-full bg-[#F2E8DC] text-[#8B5E34] flex items-center justify-center"><FaBuilding /></div>
            <div className="text-4xl font-extrabold text-[#8B5E34] tracking-tight">{Number(metrics.activeListings || 0).toLocaleString()}</div>
            <div className="text-xs mt-1 text-[#6F4E2C] uppercase tracking-wide">{t ? t('hero.activeListings') : 'Active Listings'}</div>
          </div>
          <div className="relative p-6 rounded-2xl text-center bg-[#FFF9F3] shadow-xl">
            <div className="absolute top-3 left-3 w-2 h-2 bg-[#CDAF8B] rounded"></div>
            <div className="mx-auto mb-2 w-10 h-10 rounded-full bg-[#F2E8DC] text-[#8B5E34] flex items-center justify-center"><FaSmile /></div>
            <div className="text-4xl font-extrabold text-[#8B5E34] tracking-tight">{Number(metrics.happyGuests || 0).toLocaleString()}</div>
            <div className="text-xs mt-1 text-[#6F4E2C] uppercase tracking-wide">{t ? t('hero.happyGuests') : 'Happy Guests'}</div>
          </div>
          <div className="relative p-6 rounded-2xl text-center bg-[#FFF9F3] shadow-xl">
            <div className="absolute top-3 left-3 w-2 h-2 bg-[#CDAF8B] rounded"></div>
            <div className="mx-auto mb-2 w-10 h-10 rounded-full bg-[#F2E8DC] text-[#8B5E34] flex items-center justify-center"><FaThumbsUp /></div>
            <div className="text-4xl font-extrabold text-[#8B5E34] tracking-tight">{Number(metrics.satisfactionRate || 0)}%</div>
            <div className="text-xs mt-1 text-[#6F4E2C] uppercase tracking-wide">{t ? t('hero.satisfactionRate') : 'Satisfaction Rate'}</div>
          </div>
        </div>

        {/* FAQ Accordion */}
        {how.faqs && how.faqs.length > 0 && (
          <div className="mt-14 max-w-4xl mx-auto">
            <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">{t ? t('how.faq') : 'Frequently Asked Questions'}</h3>
            <div className="rounded-xl bg-white/90 backdrop-blur shadow">
              {how.faqs.map((f, i) => (
                <div key={i}>
                  <button
                    className="w-full text-left px-5 py-4 flex items-center justify-between hover:bg-gray-50"
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    aria-expanded={openFaq === i}
                  >
                    <span className="font-semibold text-gray-800">{f.q}</span>
                    <span className="text-blue-600 text-xl">{openFaq === i ? '-' : '+'}</span>
                    
                  </button>
                  <div className={`px-5 pb-4 text-gray-600 ${openFaq === i ? 'block' : 'hidden'}`}>{f.a}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* What our users say */}
        {testimonials && testimonials.length > 0 && (
          <div className="bg-white py-12 px-4">
            <div className="max-w-6xl mx-auto">
              <h3 className="text-2xl md:text-3xl font-extrabold text-[#2B1B0E] mb-6">What our users say</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {testimonials.map((t, i) => (
                  <div key={i} className="rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-semibold text-gray-900 text-sm truncate max-w-[70%]">{t.propertyTitle}</div>
                      <div className="text-yellow-500 text-xs">
                        {Array.from({ length: 5 }).map((_, s) => (
                          <span key={s}>{s < Math.round(t.rating || 0) ? '★' : '☆'}</span>
                        ))}
                      </div>
                    </div>
                    <div className="text-sm text-gray-700 line-clamp-4">{t.comment}</div>
                    {t.createdAt && (<div className="text-xs text-gray-400 mt-2">{new Date(t.createdAt).toLocaleDateString()}</div>)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HowItWorks;
