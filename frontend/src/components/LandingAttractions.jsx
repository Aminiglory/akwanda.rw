import React, { useEffect, useMemo, useState } from 'react';
import { useLocale } from '../contexts/LocaleContext';
import { 
  makeAbsoluteImageUrl, 
  preloadImages, 
  getFallbackImage,
  generateResponsiveImages,
  processImagesForComponent,
  trackImageLoad
} from '../utils/imageUtils';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Optimized Attraction Image Component
const OptimizedAttractionImage = ({ src, alt, className, priority = false }) => {
  const [imageSrc, setImageSrc] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!src) {
      setImageSrc(getFallbackImage('attraction', 'medium'));
      setIsLoading(false);
      return;
    }

    const img = new Image();
    const responsiveImages = generateResponsiveImages(src);
    const optimizedSrc = responsiveImages ? responsiveImages.medium : src;
    
    img.onload = () => {
      setImageSrc(optimizedSrc);
      setIsLoading(false);
      setHasError(false);
    };
    
    img.onerror = () => {
      console.warn(`Attraction image failed to load: ${src}`);
      setImageSrc(getFallbackImage('attraction', 'medium'));
      setIsLoading(false);
      setHasError(true);
    };
    
    img.src = optimizedSrc;
  }, [src]);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
        </div>
      )}
      {imageSrc && (
        <img
          src={imageSrc}
          alt={alt}
          className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-110 ${
            isLoading ? 'opacity-0' : 'opacity-100'
          }`}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
        />
      )}
      {hasError && (
        <div className="absolute top-2 right-2 bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">
          Fallback
        </div>
      )}
    </div>
  );
};

export default function LandingAttractions() {
  const { localize, t } = useLocale() || {};
  const [section, setSection] = useState(null); // { key,title,body,images }

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/content/landing`);
        if (!res.ok) return;
        const data = await res.json();
        const sections = Array.isArray(data?.content?.sections) ? data.content.sections : [];
        const s = sections.find(x => x?.key === 'landingAttractions');
        setSection(s || null);
      } catch (_) {}
    })();
  }, []);

  const cards = useMemo(() => {
    const imgs = Array.isArray(section?.images) ? section.images : [];
    const captions = String(section?.body || '')
      .split(/\r?\n/)
      .map(s => s.trim())
      .filter(Boolean);
    const processedCards = imgs.map((img, i) => {
      const src = /^https?:\/\//i.test(img) ? img : `${API_BASE}${img.startsWith('/') ? img : `/${img}`}`;
      const rawTitle = captions[i] || `Attraction ${i + 1}`;
      const title = localize ? localize(rawTitle) : rawTitle;
      return { src: makeAbsoluteImageUrl(src), title, category: 'attraction', priority: i < 3 };
    });
    
    return processedCards;
  }, [section, localize]);

  // Preload first 3 attraction images
  useEffect(() => {
    if (cards.length > 0) {
      const criticalImages = cards.slice(0, 3).map((card, index) => ({
        url: card.src,
        priority: 3 - index,
        category: 'attraction'
      }));
      
      preloadImages(criticalImages, { maxConcurrent: 2, timeout: 3000 });
    }
  }, [cards]);

  if (!section || cards.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl md:text-3xl font-bold text-[#4b2a00]">{localize ? localize(section.title || 'Top Attractions') : (section.title || 'Top Attractions')}</h2>
        <a href="/attractions" className="text-[#a06b42] font-semibold hover:underline">{t ? t('landing.viewAll') : 'View all'}</a>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((c, i) => (
          <article
            key={i}
            className="group relative rounded-2xl overflow-hidden bg-white border theme-chocolate-border shadow-sm hover:shadow-2xl focus-within:shadow-2xl transform hover:-translate-y-1.5 transition-all duration-500"
          >
            <figure className="relative aspect-[4/3] overflow-hidden">
              <img
                src={c.src}
                alt={c.title}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                loading="lazy"
                decoding="async"
                onLoad={() => {
                  trackImageLoad(c.src, 'attraction');
                }}
                onError={(e) => {
                  console.warn(`Attraction image failed to load: ${c.src}`);
                  e.target.src = getFallbackImage('attraction', 'medium');
                  trackImageLoad(c.src, 'attraction');
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/35 to-transparent opacity-80 group-hover:opacity-95 transition-opacity duration-500" aria-hidden="true"></div>
              <figcaption className="absolute inset-x-3 bottom-3 flex flex-col gap-1">
                <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-white text-[#4b2a00] text-xs sm:text-sm font-semibold shadow">
                  {c.title}
                </span>
                <span className="text-[11px] sm:text-xs text-white/80 tracking-wide uppercase">
                  {t ? t('landing.curatedBy') : 'Curated by AKWANDA.rw'}
                </span>
              </figcaption>
            </figure>
            <div className="p-4 flex items-center justify-between">
              <div className="text-xs sm:text-sm text-gray-600 uppercase tracking-wide">
                {t ? t('landing.explore') : 'Explore'}
              </div>
              <a
                href="/attractions"
                className="text-[#a06b42] text-sm font-semibold hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#a06b42] rounded inline-flex items-center"
                aria-label={`Explore attractions including ${c.title}`}
              >
                {t ? t('landing.viewAll') : 'View all'}
                <span className="ml-1 group-hover:translate-x-1 transition-transform duration-300">→</span>
              </a>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
