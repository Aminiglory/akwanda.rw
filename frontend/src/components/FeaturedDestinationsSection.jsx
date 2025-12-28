import React, { useMemo } from 'react';
import { useLocale } from '../contexts/LocaleContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const resolveImageUrl = (source) => {
  if (!source) return null;
  const str = String(source).trim();
  if (!str) return null;
  if (/^https?:\/\//i.test(str)) return str;
  return `${API_URL}${str.startsWith('/') ? str : `/${str}`}`;
};

const buildCards = (section) => {
  if (!section) return [];
  const imgs = Array.isArray(section.images) ? section.images : [];
  const lines = String(section.body || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return imgs.map((img, index) => {
    const rawLine = lines[index] || '';
    const [namePart, taglinePart] = rawLine.split('|');
    const name = (namePart || '').trim() || `Destination ${index + 1}`;
    const tagline = (taglinePart || '').trim();
    const resolvedImage = resolveImageUrl(img);
    return { name, tagline, img: resolvedImage };
  }).filter((card) => card.img);
};

const FeaturedDestinationsSection = ({
  section,
  sectionTitle,
  ctaUrl = '/apartments',
  showExploreLink = true,
  destinations,
  buildCtaUrl,
}) => {
  const { t } = useLocale() || {};
  const cards = useMemo(() => {
    if (Array.isArray(destinations) && destinations.length > 0) {
      return destinations
        .map((d) => {
          const img = resolveImageUrl(d?.img || d?.image);
          return {
            name: d?.name || d?.city || 'Destination',
            tagline: d?.tagline || '',
            img,
            raw: d,
          };
        })
        .filter((c) => c.img);
    }
    return buildCards(section).map((c) => ({ ...c, raw: null }));
  }, [section, destinations]);
  if (!cards.length) return null;

  const heading = sectionTitle || (t ? t('home.featuredDestinations') : 'Featured destinations');
  const exploreLabel = t ? t('home.explore') : 'Explore';

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-center justify-between mb-6 gap-4">
        <h2 className="text-2xl md:text-3xl font-bold text-[#4b2a00]">{heading}</h2>
        {showExploreLink && (
          <a
            href={ctaUrl}
            className="hidden sm:inline-flex items-center text-sm font-medium text-[#a06b42] hover:text-[#8f5a32] hover:underline"
          >
            {exploreLabel}
          </a>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6">
        {cards.map((destination, index) => (
          <a
            key={index}
            href={typeof buildCtaUrl === 'function' ? buildCtaUrl(destination.raw || destination) : ctaUrl}
            className="group relative rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 bg-gray-900/80"
          >
            <div className="relative aspect-[4/5] sm:aspect-[4/5] overflow-hidden">
              <img
                src={destination.img}
                alt={destination.name}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent" />
              <div className="absolute top-3 left-3 inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white/90 text-[#4b2a00] shadow-sm">
                #{index + 1} Rwanda getaways
              </div>
              <div className="absolute bottom-3 left-3 right-3 flex flex-col gap-1">
                <h3 className="text-lg sm:text-xl font-bold text-white drop-shadow-md">{destination.name}</h3>
                {destination.tagline && (
                  <p className="text-xs sm:text-sm text-white/80 line-clamp-2">{destination.tagline}</p>
                )}
                <span className="mt-2 inline-flex items-center text-xs sm:text-sm font-semibold text-white/90">
                  {exploreLabel}
                  <span className="ml-1 group-hover:translate-x-0.5 transition-transform">→</span>
                </span>
              </div>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
};

export default FeaturedDestinationsSection;
