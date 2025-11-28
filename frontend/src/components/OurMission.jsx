import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocale } from '../contexts/LocaleContext';
import { makeAbsoluteImageUrl } from '../utils/imageUtils';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function OurMission() {
  const { localize, t } = useLocale() || {};
  const [section, setSection] = useState(null); // { key, title, body, images }
  const [index, setIndex] = useState(0);
  const timerRef = useRef(null);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/content/landing`);
        if (!res.ok) return;
        const data = await res.json();
        const sections = Array.isArray(data?.content?.sections) ? data.content.sections : [];
        const our = sections.find(s => s?.key === 'ourMission');
        setSection(our || null);
      } catch (_) {}
    })();
  }, []);

  const images = useMemo(() => {
    const list = Array.isArray(section?.images) ? section.images : [];
    return list
      .map(img => makeAbsoluteImageUrl(img))
      .filter(Boolean);
  }, [section]);

  useEffect(() => {
    if (!images || images.length <= 1) return;
    if (paused) return;
    timerRef.current = setInterval(() => setIndex(i => (i + 1) % images.length), 5000);
    return () => clearInterval(timerRef.current);
  }, [images, paused]);

  if (!section) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        <div
          className="relative w-full h-64 sm:h-80 md:h-96 rounded-2xl overflow-hidden shadow"
          role="region"
          aria-label="Our mission slideshow"
          tabIndex={0}
          onKeyDown={(e) => {
            if (images.length <= 1) return;
            if (e.key === 'ArrowRight') setIndex(i => (i + 1) % images.length);
            if (e.key === 'ArrowLeft') setIndex(i => (i - 1 + images.length) % images.length);
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
              if (delta > 0) setIndex(i => (i + 1) % images.length);
              else setIndex(i => (i - 1 + images.length) % images.length);
            }
            touchStartX.current = null;
          }}
        >
          {images.length > 0 ? (
            images.map((src, i) => (
              <img
                key={i}
                src={src}
                alt={section.title || 'Our mission'}
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${i === index ? 'opacity-100' : 'opacity-0'}`}
                loading="eager"
                decoding="async"
              />
            ))
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-gray-200 via-gray-100 to-white" />
          )}
          {images.length > 1 && (
            <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-2">
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIndex(i)}
                  className={`w-2.5 h-2.5 rounded-full ${i === index ? 'bg-white' : 'bg-white/60'} border border-white/70`}
                  aria-label={`Go to slide ${i + 1}`}
                />
              ))}
            </div>
          )}
          <div className="absolute inset-0 bg-black/10" />
          {images.length > 1 && (
            <>
              <button
                aria-label="Previous slide"
                onClick={() => setIndex(i => (i - 1 + images.length) % images.length)}
                className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 rounded-full w-10 h-10 flex items-center justify-center shadow"
              >
                ‹
              </button>
              <button
                aria-label="Next slide"
                onClick={() => setIndex(i => (i + 1) % images.length)}
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 rounded-full w-10 h-10 flex items-center justify-center shadow"
              >
                ›
              </button>
            </>
          )}
        </div>
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-[#4b2a00]">{localize ? localize(section.title || 'Our Mission') : (section.title || 'Our Mission')}</h2>
          {section.body && (
            <p className="mt-4 text-gray-700 whitespace-pre-line">{localize ? localize(section.body) : section.body}</p>
          )}
          <div className="mt-6 flex flex-wrap gap-3">
            <a href="/about" className="px-5 py-2.5 rounded-lg bg-[#a06b42] text-white font-semibold hover:bg-[#8f5d36] transition-colors">{t ? t('cta.learnMore') : 'Learn more'}</a>
            <a href="/contact" className="px-5 py-2.5 rounded-lg border theme-chocolate-border text-[#4b2a00] font-semibold hover:bg-[#fff7ee] transition-colors">{t ? t('cta.contactUs') : 'Contact us'}</a>
          </div>
        </div>
      </div>
    </section>
  );
}
