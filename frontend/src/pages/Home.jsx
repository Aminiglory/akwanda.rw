import React from 'react';
import Hero from '../components/Hero';
import SearchSection from '../components/SearchSection';
import FeaturedApartments from '../components/FeaturedApartments';
import LandingAttractions from '../components/LandingAttractions';
import OurMission from '../components/OurMission';
import HowItWorks from '../components/HowItWorks';
import Testimonials from '../components/Testimonials';
import { useLocale } from '../contexts/LocaleContext';

const Home = () => {
  const { t } = useLocale() || {};
  return (
    <div>
      {/* Hero Section with chocolate theme background */}
      <div className="bg-gradient-to-br from-[#6b3f1f] via-[#a06b42] to-[#c59b77]">
        <Hero />
      </div>

      {/* Main content */}
      <div className="bg-white">
        <SearchSection />
        <FeaturedApartments />
        <LandingAttractions />
        <HowItWorks />
        <OurMission />

        {/* Featured Destinations (static content) */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between mb-6 gap-4">
            <h2 className="text-2xl md:text-3xl font-bold text-[#4b2a00]">{t ? t('home.featuredDestinations') : 'Featured destinations'}</h2>
            <a
              href="/apartments"
              className="hidden sm:inline-flex items-center text-sm font-medium text-[#a06b42] hover:text-[#8f5a32] hover:underline"
            >
              {t ? t('home.explore') : 'Explore'}
            </a>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6">
            {[{
              name: 'Kigali',
              tagline: 'City lights, hills and vibrant cultural spots',
              img: 'https://images.unsplash.com/photo-1564769625420-5f4e2f98b9ec?q=80&w=1400&auto=format&fit=crop'
            }, {
              name: 'Musanze',
              tagline: 'Gateway to gorilla trekking and volcanic peaks',
              img: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=1400&auto=format&fit=crop'
            }, {
              name: 'Gisenyi',
              tagline: 'Lake Kivu beaches, boats and golden sunsets',
              img: 'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?q=80&w=1400&auto=format&fit=crop'
            }, {
              name: 'Huye',
              tagline: 'Heritage museums, campuses and quiet gardens',
              img: 'https://images.unsplash.com/photo-1484821582734-6c6c9f99a672?q=80&w=1400&auto=format&fit=crop'
            }].map((d, i) => (
              <a
                key={i}
                href="/apartments"
                className="group relative rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 bg-gray-900/80"
              >
                <div className="relative aspect-[4/5] sm:aspect-[4/5] overflow-hidden">
                  <img
                    src={d.img}
                    alt={d.name}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent" />
                  <div className="absolute top-3 left-3 inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white/90 text-[#4b2a00] shadow-sm">
                    #{i + 1} Rwanda getaways
                  </div>
                  <div className="absolute bottom-3 left-3 right-3 flex flex-col gap-1">
                    <h3 className="text-lg sm:text-xl font-bold text-white drop-shadow-md">{d.name}</h3>
                    <p className="text-xs sm:text-sm text-white/80 line-clamp-2">{d.tagline}</p>
                    <span className="mt-2 inline-flex items-center text-xs sm:text-sm font-semibold text-white/90">
                      {t ? t('home.explore') : 'Explore'}
                      <span className="ml-1 group-hover:translate-x-0.5 transition-transform">→</span>
                    </span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </section>

        {/* Partners strip (static logos) */}
        <section className="bg-[#fff7ee] border-y theme-chocolate-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h3 className="text-lg md:text-xl font-semibold text-[#4b2a00] mb-4">{t ? t('home.trustedByPartners') : 'Trusted by partners'}</h3>
            <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-6 gap-4 items-center">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-10 sm:h-12 bg-white rounded-lg border theme-chocolate-border flex items-center justify-center">
                  <span className="text-[#8b6f47] text-sm sm:text-base">Partner {i + 1}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials (existing) */}
        <Testimonials />

        {/* CTA band */}
        <section className="bg-[#a06b42] text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h3 className="text-2xl font-bold">{t ? t('home.listCtaTitle') : 'List your property with AKWANDA.rw'}</h3>
              <p className="opacity-90">{t ? t('home.listCtaSubtitle') : 'Reach guests faster with our own tools and promotions.'}</p>
            </div>
            <a href="/upload" className="inline-flex items-center px-5 py-3 rounded-lg bg-white text-[#4b2a00] font-semibold hover:bg-[#fff3ea] transition-colors w-full sm:w-auto text-center">
              {t ? t('home.getStarted') : 'Get started'}
            </a>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Home;
