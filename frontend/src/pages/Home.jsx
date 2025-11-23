import React, { useEffect, useMemo, useState } from 'react';
import Hero from '../components/Hero';
import SearchSection from '../components/SearchSection';
import FeaturedApartments from '../components/FeaturedApartments';
import LandingAttractions from '../components/LandingAttractions';
import OurMission from '../components/OurMission';
import HowItWorks from '../components/HowItWorks';
import Testimonials from '../components/Testimonials';
import ImageLoadingBar from '../components/ImageLoadingBar';
import { useLocale } from '../contexts/LocaleContext';
import { 
  initializeLandingPageOptimization, 
  makeAbsoluteImageUrl, 
  preloadImages,
  getImageLoadStats,
  getFallbackImage,
  setExpectedImageCount,
  resetImageLoadStats,
  trackImageLoad 
} from '../utils/imageUtils';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Home = () => {
  const { t } = useLocale() || {};

  const [featuredSection, setFeaturedSection] = useState(null);
  const [partnersSection, setPartnersSection] = useState(null);
  const [imageOptimizationInitialized, setImageOptimizationInitialized] = useState(false);
  const [totalExpectedImages, setTotalExpectedImages] = useState(0);
  const [showLoadingBar, setShowLoadingBar] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/content/landing`);
        if (!res.ok) return;
        const data = await res.json();
        const sections = Array.isArray(data?.content?.sections) ? data.content.sections : [];
        const sec = sections.find((s) => s?.key === 'featuredDestinations') || null;
        const partnersSec = sections.find((s) => s?.key === 'partners') || null;
        setFeaturedSection(sec);
        setPartnersSection(partnersSec);
        
        // Initialize comprehensive image optimization
        if (!imageOptimizationInitialized) {
          // Reset stats for fresh tracking
          resetImageLoadStats();
          
          const criticalImages = [];
          let expectedTotal = 0;
          
          // Add hero images
          if (data?.content?.heroImages?.length > 0) {
            data.content.heroImages.slice(0, 2).forEach((img, index) => {
              criticalImages.push({
                url: makeAbsoluteImageUrl(img),
                priority: 10 - index,
                category: 'hero'
              });
              expectedTotal++;
            });
          }
          
          // Add featured destinations images
          if (sec?.images?.length > 0) {
            sec.images.slice(0, 2).forEach((img, index) => {
              criticalImages.push({
                url: makeAbsoluteImageUrl(img),
                priority: 8 - index,
                category: 'attraction'
              });
              expectedTotal++;
            });
          }
          
          // Add partners images (count actual partners)
          if (partnersSec?.images?.length > 0) {
            expectedTotal += partnersSec.images.length; // Count all partner images
          }
          
          // Add featured apartments (fetch actual count)
          try {
            const propertiesRes = await fetch(`${API_URL}/api/properties`);
            if (propertiesRes.ok) {
              const propertiesData = await propertiesRes.json();
              const propertyCount = Math.min(propertiesData?.properties?.length || 4, 8); // Max 8 featured
              expectedTotal += propertyCount;
            } else {
              expectedTotal += 4; // Fallback estimate
            }
          } catch (error) {
            expectedTotal += 4; // Fallback estimate
          }
          
          // Add landing attractions images
          try {
            const attractionsRes = await fetch(`${API_URL}/api/content/landing`);
            if (attractionsRes.ok) {
              const attractionsData = await attractionsRes.json();
              const attractionImages = attractionsData?.content?.sections?.find(s => s.key === 'attractions')?.images?.length || 0;
              expectedTotal += Math.min(attractionImages, 6); // Estimate visible attractions
            }
          } catch (error) {
            expectedTotal += 3; // Fallback estimate
          }
          
          // Set expected count and show loading bar
          setExpectedImageCount(expectedTotal);
          setTotalExpectedImages(expectedTotal);
          setShowLoadingBar(true);
          
          // Initialize optimization with critical images
          await initializeLandingPageOptimization(criticalImages);
          setImageOptimizationInitialized(true);
          
          // Log performance stats after 3 seconds
          setTimeout(() => {
            const stats = getImageLoadStats();
            console.log('Landing page image performance:', stats);
          }, 3000);
        }
      } catch (_) {
        setFeaturedSection(null);
      }
    })();
  }, [imageOptimizationInitialized]);

  const featuredCards = useMemo(() => {
    if (!featuredSection) return [];
    const imgs = Array.isArray(featuredSection.images) ? featuredSection.images : [];
    const lines = String(featuredSection.body || '')
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);

    return imgs.map((img, i) => {
      const raw = lines[i] || '';
      const [namePart, taglinePart] = raw.split('|');
      const name = (namePart || '').trim() || `Destination ${i + 1}`;
      const tagline = (taglinePart || '').trim();
      const src = typeof img === 'string' && /^https?:\/\//i.test(img)
        ? img
        : `${API_URL}${String(img || '').startsWith('/') ? img : `/${img}`}`;
      return { name, tagline, img: src };
    });
  }, [featuredSection]);

  const partners = useMemo(() => {
    if (!partnersSection) return [];
    const imgs = Array.isArray(partnersSection.images) ? partnersSection.images : [];
    const lines = String(partnersSection.body || '')
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);

    return imgs.map((img, i) => {
      const raw = lines[i] || '';
      const parts = raw.split('|');
      const name = (parts[0] || '').trim() || `Partner ${i + 1}`;
      const tagline = (parts[1] || '').trim();
      const url = (parts[2] || '').trim();
      const src = typeof img === 'string' && /^https?:\/\//i.test(img)
        ? img
        : `${API_URL}${String(img || '').startsWith('/') ? img : `/${img}`}`;
      return { name, tagline, url, img: src };
    });
  }, [partnersSection]);
  return (
    <div>
      {/* Image Loading Bar */}
      <ImageLoadingBar 
        isVisible={showLoadingBar}
        totalImages={totalExpectedImages}
        onComplete={() => {
          console.log('All images loaded successfully!');
          setTimeout(() => setShowLoadingBar(false), 1500);
        }}
        showPercentage={true}
        autoHide={true}
        hideDelay={1500}
      />
      
      {/* Hero Section with chocolate theme background */}
      <div className="bg-gradient-to-br from-[#6b3f1f] via-[#a06b42] to-[#c59b77]">
        <Hero />
      </div>

      {/* Main content */}
      <div className="bg-white">
        <SearchSection />
        <FeaturedApartments />
        <LandingAttractions />

        {featuredCards.length > 0 && (
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
              {featuredCards.map((d, i) => (
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
                      decoding="async"
                      onLoad={() => {
                        trackImageLoad(d.img, 'attraction');
                      }}
                      onError={(e) => {
                        console.warn(`Featured destination image failed to load: ${d.img}`);
                        e.target.src = getFallbackImage('attraction', 'medium');
                        trackImageLoad(d.img, 'attraction');
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent" />
                    <div className="absolute top-3 left-3 inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white/90 text-[#4b2a00] shadow-sm">
                      #{i + 1} Rwanda getaways
                    </div>
                    <div className="absolute bottom-3 left-3 right-3 flex flex-col gap-1">
                      <h3 className="text-lg sm:text-xl font-bold text-white drop-shadow-md">{d.name}</h3>
                      {d.tagline && (
                        <p className="text-xs sm:text-sm text-white/80 line-clamp-2">{d.tagline}</p>
                      )}
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
        )}

        <HowItWorks />
        <OurMission />

        {/* Partners strip (admin-managed) */}
        {partners.length > 0 && (
          <section className="bg-[#fff7ee] border-y theme-chocolate-border">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <h3 className="text-lg md:text-xl font-semibold text-[#4b2a00] mb-4">{t ? t('home.trustedByPartners') : 'Trusted by partners'}</h3>
              <div className="overflow-x-auto">
                <div className="flex gap-4 md:gap-6 items-center min-w-max animate-[scroll-horizontal_40s_linear_infinite]">
                  {[...partners, ...partners].map((p, idx) => {
                    const content = (
                      <div className="h-12 sm:h-14 px-3 sm:px-4 bg-white rounded-lg border theme-chocolate-border flex items-center gap-2 sm:gap-3 shadow-sm">
                        <img
                          src={p.img}
                          alt={p.name}
                          className="h-8 sm:h-10 w-auto object-contain"
                          loading="lazy"
                          decoding="async"
                          onLoad={() => {
                            trackImageLoad(p.img, 'default');
                          }}
                          onError={(e) => {
                            console.warn(`Partner image failed to load: ${p.img}`);
                            e.target.src = getFallbackImage('default', 'small');
                            trackImageLoad(p.img, 'default');
                          }}
                        />
                        <div className="flex flex-col">
                          <span className="text-[#4b2a00] text-xs sm:text-sm font-semibold leading-tight">{p.name}</span>
                          {p.tagline && (
                            <span className="text-[#8b6f47] text-[11px] sm:text-xs leading-tight line-clamp-2">{p.tagline}</span>
                          )}
                        </div>
                      </div>
                    );
                    return p.url ? (
                      <a key={idx} href={p.url} target="_blank" rel="noreferrer" className="block">
                        {content}
                      </a>
                    ) : (
                      <div key={idx}>{content}</div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        )}

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
