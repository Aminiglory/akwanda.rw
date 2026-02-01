import React, { useEffect, useMemo, useState } from 'react';
import { useLocale } from '../contexts/LocaleContext';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function OurMission() {
  const { localize, t } = useLocale() || {};
  const [section, setSection] = useState(null); // { key, title, body, images }
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    console.log('[OurMission] mount');
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/content/landing`);
        if (!res.ok) return;
        const data = await res.json();
        const sections = Array.isArray(data?.content?.sections) ? data.content.sections : [];
        const our = sections.find(s => s?.key === 'ourMission');
        console.log('[OurMission] section resolved', { hasSection: !!our });
        setSection(our || null);
      } catch (_) {}
    })();
  }, []);

  const images = useMemo(() => {
    const list = Array.isArray(section?.images) ? section.images : [];
    const processed = list
      .map((img) => {
        const s = String(img || '').trim();
        if (!s) return null;
        if (/^https?:\/\//i.test(s)) return s;
        return `${API_BASE}${s.startsWith('/') ? s : `/${s}`}`;
      })
      .filter(Boolean);
    console.log('[OurMission] images computed', { count: processed.length });
    return processed;
  }, [section]);

  useEffect(() => {
    if (!images || images.length <= 1) {
      setCurrentIndex(0);
      return;
    }
    let i = 0;
    const interval = setInterval(() => {
      i = (i + 1) % images.length;
      setCurrentIndex(i);
    }, 5000);
    return () => clearInterval(interval);
  }, [images]);

  useEffect(() => {
    if (!images || images.length === 0) return;
    console.log('[OurMission] slide index changed', { index: currentIndex, total: images.length });
  }, [currentIndex, images && images.length]);

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 bg-white">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center rounded-3xl px-4 sm:px-6 lg:px-8 py-8 shadow-[0_14px_32px_rgba(75,46,5,0.12)] bg-white">
        <div className="relative w-full h-64 sm:h-80 md:h-96 rounded-2xl overflow-hidden shadow-xl bg-black/5">
          {images.length > 0 ? (
            <img
              src={images[currentIndex]}
              alt={(section && section.title) || 'Our mission'}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out will-change-transform hover:scale-[1.02]"
              loading="eager"
              decoding="async"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-gray-200 via-gray-100 to-white" />
          )}
          <div className="absolute inset-0 bg-black/20 mix-blend-multiply" />
          <div className="absolute inset-4 rounded-2xl border border-white/40" />
        </div>
        <div className="relative">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#FFF3E4] text-xs font-semibold text-[#8b5e34] shadow-sm mb-3">
            <span className="inline-block w-2 h-2 rounded-full bg-[#a06b42]" />
            Our mission at AkwandaTravels.com
          </div>
          <h2 className="text-xl md:text-2xl lg:text-3xl font-extrabold text-[#2b1b0e] leading-snug">
            {localize
              ? localize((section && section.title) || 'Our Mission')
              : ((section && section.title) || 'Our Mission')}
          </h2>
          {section && section.body && (
            <p className="mt-4 text-sm md:text-base text-[#4b2a00]/90 whitespace-pre-line leading-relaxed">
              {localize ? localize(section.body) : section.body}
            </p>
          )}
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="/about"
              className="px-5 py-2.5 rounded-xl bg-[#a06b42] text-white font-semibold shadow-md shadow-[#a06b42]/40 hover:bg-[#8f5d36] hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
            >
              {t ? t('cta.learnMore') : 'Learn more'}
            </a>
            <a
              href="/contact"
              className="px-5 py-2.5 rounded-xl border border-[#e0c7a8] bg-white/80 text-[#4b2a00] font-semibold hover:bg-[#fff7ee] hover:border-[#d0ab7f] transition-all duration-300 shadow-sm"
            >
              {t ? t('cta.contactUs') : 'Contact us'}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
