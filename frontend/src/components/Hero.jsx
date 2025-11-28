import React, { useState, useEffect } from "react";
import { useLocale } from '../contexts/LocaleContext';
import { FaBuilding, FaSmile, FaThumbsUp } from 'react-icons/fa';
import { makeAbsoluteImageUrl } from '../utils/imageUtils';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Hero = ({ onReady }) => {
  const { localize, t } = useLocale() || {};
  const [metrics, setMetrics] = useState({ activeListings: 0, happyGuests: 0, satisfactionRate: 0 });
  const [heroTitle, setHeroTitle] = useState('');
  const [heroSubtitle, setHeroSubtitle] = useState('');
  const [heroImage, setHeroImage] = useState(null);

  // Load metrics
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/metrics/landing`);
        if (!res.ok) return;
        const data = await res.json();
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

  // Load hero content (title, subtitle, optional single background image)
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/content/landing`);
        if (!res.ok) return;
        const data = await res.json();
        const content = data?.content || {};
        setHeroTitle(content.heroTitle || '');
        setHeroSubtitle(content.heroSubtitle || '');

        // Normalize hero media from CMS and ignore empty entries
        const slides = Array.isArray(content.heroSlides)
          ? content.heroSlides.filter(s => s && typeof s.image === 'string' && s.image.trim().length > 0)
          : [];
        const images = Array.isArray(content.heroImages)
          ? content.heroImages.filter(img => typeof img === 'string' && img.trim().length > 0)
          : [];

        let img = null;
        if (slides.length) {
          img = makeAbsoluteImageUrl(slides[0].image);
        } else if (images.length) {
          img = makeAbsoluteImageUrl(images[0]);
        }
        setHeroImage(img || null);
      } catch (_) {}
    })();
  }, []);

  useEffect(() => {
    if (!onReady) return;
    if (!heroImage) {
      onReady();
      return;
    }
    let cancelled = false;
    const img = new Image();
    img.src = heroImage;
    img.onload = () => {
      if (!cancelled) onReady();
    };
    img.onerror = () => {
      if (!cancelled) onReady();
    };
    return () => {
      cancelled = true;
    };
  }, [heroImage, onReady]);

  const bgStyle = heroImage
    ? {
        backgroundImage: `url('${heroImage}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : {};

  return (
    <div className="relative w-full h-[450px] sm:h-[500px] md:h-[550px] lg:h-[600px] overflow-hidden">
      {/* Background */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-[#6b3f1f] via-[#a06b42] to-[#c59b77]"
        style={bgStyle}
      />

      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-black/35" />

      {/* Overlay content */}
      <div
        className="relative z-10 max-w-7xl mx-auto px-4 py-20 md:py-28 lg:py-36"
        role="region"
        aria-label="Hero"
      >
        <h1 className="text-white text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight">
          {localize ? localize(heroTitle) : heroTitle || (t ? t('hero.title') : 'Welcome to AKWANDA.rw')}
        </h1>
        <p className="mt-4 text-blue-100 text-lg md:text-xl max-w-2xl">
          {localize ? localize(heroSubtitle) : heroSubtitle || (t ? t('hero.subtitle') : 'Find places to stay, cars, and attractions')}
        </p>

        {/* Metrics (static values, no count-up) */}
        <div className="grid grid-cols-3 gap-4 mt-8 text-white max-w-md">
          <div className="relative p-4 rounded-2xl text-center bg-white/15 backdrop-blur border border-white/30 shadow-xl">
            <div className="absolute top-2 left-2 w-2 h-2 bg-white/60 rounded"></div>
            <div className="mx-auto mb-1 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center"><FaBuilding /></div>
            <div className="text-3xl font-extrabold tracking-tight">{Number(metrics.activeListings || 0).toLocaleString()}</div>
            <div className="text-xs mt-1 text-blue-100 uppercase tracking-wide">{t ? t('hero.activeListings') : 'Active Listings'}</div>
          </div>
          <div className="relative p-4 rounded-2xl text-center bg-white/15 backdrop-blur border border-white/30 shadow-xl">
            <div className="absolute top-2 left-2 w-2 h-2 bg-white/60 rounded"></div>
            <div className="mx-auto mb-1 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center"><FaSmile /></div>
            <div className="text-3xl font-extrabold tracking-tight">{Number(metrics.happyGuests || 0).toLocaleString()}</div>
            <div className="text-xs mt-1 text-blue-100 uppercase tracking-wide">{t ? t('hero.happyGuests') : 'Happy Guests'}</div>
          </div>
          <div className="relative p-4 rounded-2xl text-center bg-white/15 backdrop-blur border border-white/30 shadow-xl">
            <div className="absolute top-2 left-2 w-2 h-2 bg-white/60 rounded"></div>
            <div className="mx-auto mb-1 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center"><FaThumbsUp /></div>
            <div className="text-3xl font-extrabold tracking-tight">{Number(metrics.satisfactionRate || 0)}%</div>
            <div className="text-xs mt-1 text-blue-100 uppercase tracking-wide">{t ? t('hero.satisfactionRate') : 'Satisfaction Rate'}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;
