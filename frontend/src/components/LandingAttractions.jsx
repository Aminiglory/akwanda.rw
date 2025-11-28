import React, { useState, useEffect, useMemo } from 'react';
import { useLocale } from '../contexts/LocaleContext';
import React, { useState, useEffect, useMemo } from 'react';
import { useLocale } from '../contexts/LocaleContext';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

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
      return { src, title, category: 'attraction', priority: i < 3 };
    });
    
    return processedCards;
  }, [section, localize]);

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
            className="group relative rounded-2xl overflow-hidden bg-white border theme-chocolate-border shadow-sm"
          >
            <figure className="relative aspect-[4/3] overflow-hidden">
              <img
                src={c.src}
                alt={c.title}
                className="w-full h-full object-cover"
                loading="eager"
                decoding="async"
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
                <span className="ml-1">→</span>
              </a>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
