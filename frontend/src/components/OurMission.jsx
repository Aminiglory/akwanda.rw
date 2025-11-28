import React, { useEffect, useMemo, useState } from 'react';
import { useLocale } from '../contexts/LocaleContext';
import { makeAbsoluteImageUrl } from '../utils/imageUtils';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function OurMission() {
  const { localize, t } = useLocale() || {};
  const [section, setSection] = useState(null); // { key, title, body, images }

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

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        <div className="relative w-full h-64 sm:h-80 md:h-96 rounded-2xl overflow-hidden shadow">
          {images.length > 0 ? (
            <img
              src={images[0]}
              alt={(section && section.title) || 'Our mission'}
              className="absolute inset-0 w-full h-full object-cover"
              loading="eager"
              decoding="async"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-gray-200 via-gray-100 to-white" />
          )}
          <div className="absolute inset-0 bg-black/10" />
        </div>
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-[#4b2a00]">
            {localize
              ? localize((section && section.title) || 'Our Mission')
              : ((section && section.title) || 'Our Mission')}
          </h2>
          {section && section.body && (
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
