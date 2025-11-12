import React, { useEffect, useMemo, useState } from 'react';
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
    return imgs.map((img, i) => {
      const src = /^https?:\/\//i.test(img) ? img : `${API_BASE}${img.startsWith('/') ? img : `/${img}`}`;
      const rawTitle = captions[i] || `Attraction ${i + 1}`;
      const title = localize ? localize(rawTitle) : rawTitle;
      return { src, title };
    });
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
          <article key={i} className="group relative rounded-2xl overflow-hidden bg-white border theme-chocolate-border shadow-sm hover:shadow-lg focus-within:shadow-lg transition-shadow">
            <figure className="relative aspect-[4/3] overflow-hidden">
              <img src={c.src} alt={c.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-60 group-hover:opacity-70 transition-opacity" aria-hidden="true"></div>
              <figcaption className="absolute bottom-3 left-3 right-3">
                <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-white/90 text-[#4b2a00] text-sm font-semibold shadow">{c.title}</span>
              </figcaption>
            </figure>
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">{t ? t('landing.curatedBy') : 'Curated by AKWANDA.rw'}</div>
                <a href="/attractions" className="text-[#a06b42] text-sm font-semibold hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#a06b42] rounded" aria-label={`Explore attractions including ${c.title}`}>{t ? t('landing.explore') : 'Explore'}</a>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
