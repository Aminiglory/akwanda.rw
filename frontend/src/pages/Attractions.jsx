import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaMapMarkerAlt, FaUsers, FaClock, FaCalendarAlt } from 'react-icons/fa';
import PropertyCard from '../components/PropertyCard';
import FeaturedDestinationsSection from '../components/FeaturedDestinationsSection';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Attractions = () => {
  const [loading, setLoading] = useState(false);
  const [loadingAttractions, setLoadingAttractions] = useState(false);
  const navigate = useNavigate();
  const [pageContent, setPageContent] = useState({
    pageTitle: 'Find Your Next Experience',
    introText: 'Discover amazing attractions across Rwanda',
    heroImages: [],
    published: true,
  });
  const [landingFeatured, setLandingFeatured] = useState(null);
  const [destinations, setDestinations] = useState([]);
  const [officialAttractions, setOfficialAttractions] = useState([]);

  const [search, setSearch] = useState({
    location: '',
    visitDate: '',
    timeSlot: '',
    tickets: 1,
  });

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        // Load page content from CMS
        const contentRes = await fetch(`${API_URL}/api/content/attractions`, { credentials: 'include' });
        const contentData = await contentRes.json();
        const content = contentData?.content || {};
        if (contentRes.ok) {
          setPageContent({
            pageTitle: content.pageTitle || 'Find Your Next Experience',
            introText: content.introText || 'Discover amazing attractions across Rwanda',
            heroImages: Array.isArray(content.heroImages) ? content.heroImages : [],
            published: !!content.published,
          });
        }

        // Load featured landing section
        const landingRes = await fetch(`${API_URL}/api/content/landing`);
        if (landingRes.ok) {
          const landingData = await landingRes.json();
          const sections = Array.isArray(landingData?.content?.sections) ? landingData.content.sections : [];
          const featured = sections.find((s) => s?.key === 'featuredDestinations');
          setLandingFeatured(featured || null);
        }

        // Load destinations based on real attractions
        const dRes = await fetch(`${API_URL}/api/attractions/destinations`);
        if (dRes.ok) {
          const dData = await dRes.json().catch(() => ({}));
          setDestinations(Array.isArray(dData?.destinations) ? dData.destinations : []);
        } else {
          setDestinations([]);
        }

        // Load a small set of official attractions to show on landing
        try {
          setLoadingAttractions(true);
          const aRes = await fetch(`${API_URL}/api/attractions`, { credentials: 'include' });
          const aData = await aRes.json().catch(() => ({}));
          const list = aRes.ok && Array.isArray(aData?.attractions) ? aData.attractions : [];
          setOfficialAttractions(list.slice(0, 6));
        } catch (_) {
          setOfficialAttractions([]);
        } finally {
          setLoadingAttractions(false);
        }
      } catch (_) { 
        setDestinations([]);
        setOfficialAttractions([]);
      } finally { 
        setLoading(false); 
      }
    })();
  }, []);

  const heroImage = useMemo(() => {
    const imgs = Array.isArray(pageContent.heroImages) ? pageContent.heroImages : [];
    if (!imgs.length) return null;
    const img = imgs[0];
    if (!img) return null;
    if (/^https?:\/\//i.test(img)) return img;
    return `${API_URL}${img.startsWith('/') ? img : `/${img}`}`;
  }, [pageContent.heroImages]);

  const makeAbsolute = (u) => {
    if (!u) return null;
    let s = String(u).trim().replace(/\\+/g, '/');
    if (/^https?:\/\//i.test(s)) return s;
    if (!s.startsWith('/')) s = `/${s}`;
    return `${API_URL}${s}`;
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (search.location) params.set('q', search.location);
    if (search.visitDate) params.set('visitDate', search.visitDate);
    if (search.timeSlot) params.set('timeSlot', search.timeSlot);
    if (search.tickets) params.set('tickets', String(search.tickets));
    navigate(`/attractions/search${params.toString() ? `?${params.toString()}` : ''}`);
  };

  const buildDestinationUrl = (d) => {
    const params = new URLSearchParams();
    if (d?.city) params.set('city', d.city);
    if (d?.country) params.set('country', d.country);
    return `/attractions/search${params.toString() ? `?${params.toString()}` : ''}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <div className="relative h-[360px] md:h-[520px] bg-[#a06b42] overflow-hidden shadow-xl">
        {heroImage ? (
          <img
            src={heroImage}
            alt={pageContent.pageTitle}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-r from-[#a06b42] via-[#8f5a32] to-[#a06b42]" />
        )}
        <div className="absolute inset-0 bg-black/25" />
      </div>

      <div className="relative -mt-10 md:-mt-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-gradient-to-r from-[#a06b42] via-[#8f5a32] to-[#a06b42] shadow-xl overflow-hidden">
            <div className="px-4 py-10 md:px-10 md:py-12">
              <div className="max-w-3xl mx-auto text-center text-white">
                <span className="inline-flex items-center px-4 py-2 mb-6 rounded-full bg-white/10 backdrop-blur-sm border border-white/30 text-xs uppercase tracking-wider text-white/90 font-semibold">
                  🏔️ Rwanda Experiences
                </span>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 md:mb-6 drop-shadow-lg">
                  {pageContent.pageTitle}
                </h1>
                <p className="text-lg md:text-xl lg:text-2xl text-white/90 leading-relaxed font-medium">
                  {pageContent.introText}
                </p>
              </div>

              <div className="relative max-w-4xl mx-auto mt-8">
                <form onSubmit={handleSearch} className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-4 md:p-5">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="relative">
                      <FaMapMarkerAlt className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a06b42]" />
                      <input
                        value={search.location}
                        onChange={(e) => setSearch((p) => ({ ...p, location: e.target.value }))}
                        placeholder="Where do you want to go?"
                        className="w-full h-12 pl-10 pr-3 rounded-xl border border-gray-200 focus:border-[#a06b42] outline-none"
                      />
                    </div>

                    <div className="relative">
                      <FaCalendarAlt className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a06b42]" />
                      <input
                        type="date"
                        value={search.visitDate}
                        onChange={(e) => setSearch((p) => ({ ...p, visitDate: e.target.value }))}
                        className="w-full h-12 pl-10 pr-3 rounded-xl border border-gray-200 focus:border-[#a06b42] outline-none"
                      />
                    </div>

                    <div className="relative">
                      <FaClock className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a06b42]" />
                      <input
                        type="time"
                        value={search.timeSlot}
                        onChange={(e) => setSearch((p) => ({ ...p, timeSlot: e.target.value }))}
                        className="w-full h-12 pl-10 pr-3 rounded-xl border border-gray-200 focus:border-[#a06b42] outline-none"
                      />
                    </div>

                    <div className="relative">
                      <FaUsers className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a06b42]" />
                      <input
                        type="number"
                        min={1}
                        value={search.tickets}
                        onChange={(e) => setSearch((p) => ({ ...p, tickets: Math.max(1, Number(e.target.value) || 1) }))}
                        className="w-full h-12 pl-10 pr-3 rounded-xl border border-gray-200 focus:border-[#a06b42] outline-none"
                      />
                    </div>
                  </div>

                  <div className="mt-3 flex justify-center">
                    <button
                      type="submit"
                      className="px-8 py-3 rounded-xl bg-[#a06b42] hover:bg-[#8f5a32] text-white font-semibold shadow-md"
                    >
                      Search attractions
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-10 md:py-12">
        <div className="flex items-center justify-between mb-6 gap-4">
          <h2 className="text-2xl md:text-3xl font-bold text-[#4b2a00]">Official attractions</h2>
          <button
            type="button"
            onClick={() => navigate('/attractions/search')}
            className="inline-flex items-center px-4 py-2 rounded-xl bg-white border border-[#e0d2c0] text-[#4b2a00] text-sm font-semibold hover:bg-[#f7ede1]"
          >
            View all attractions
          </button>
        </div>

        {loadingAttractions ? (
          <div className="text-center text-gray-600 py-10">Loading attractions…</div>
        ) : officialAttractions.length === 0 ? (
          <div className="text-center text-gray-600 py-10">No attractions available yet.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {officialAttractions.map((a) => {
              const id = a?._id;
              if (!id) return null;
              const image = Array.isArray(a.images) && a.images.length ? makeAbsolute(a.images[0]) : null;
              return (
                <div
                  key={String(id)}
                  className="group transform transition-all duration-500 hover:-translate-y-1 hover:shadow-xl rounded-2xl bg-white/90 backdrop-blur-sm border border-[#ecd9c4] overflow-hidden"
                  style={{ boxShadow: '0 18px 45px rgba(82, 45, 13, 0.08)' }}
                >
                  <PropertyCard
                    listing={{
                      id,
                      title: a.name || 'Attraction',
                      location: a.location || a.city || '',
                      image,
                      price: Number(a.price || 0),
                      bedrooms: null,
                      bathrooms: null,
                      area: a.category || '',
                      status: a.isActive !== false ? 'active' : 'inactive',
                      bookings: 0,
                      host: '',
                      description: a.description || '',
                    }}
                    onView={() => navigate(`/attractions/${id}`)}
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* Featured landing destinations */}
        <FeaturedDestinationsSection
          section={landingFeatured}
          showExploreLink
          ctaUrl="/attractions/search"
          destinations={destinations}
          buildCtaUrl={buildDestinationUrl}
        />

        {loading && (
          <div className="text-center text-gray-600 py-8 text-sm">Loading destinations…</div>
        )}

        {/* Call to Action */}
        <div className="mt-14 md:mt-16">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#a06b42] via-[#c08a58] to-[#e5b88c] text-white px-6 py-10 md:px-10 md:py-12 flex flex-col md:flex-row md:items-center md:justify-between gap-6 shadow-xl">
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top,_#ffffff_0,_transparent_55%)] pointer-events-none" />
            <div className="relative max-w-xl">
              <h3 className="text-2xl md:text-3xl font-bold tracking-tight mb-3">
                Ready to explore?
              </h3>
              <p className="text-sm md:text-base lg:text-lg text-white/90 leading-relaxed">
                Search and book attractions by destination, date, time, and group size.
              </p>
            </div>
            <div className="relative flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center">
              <button
                className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-white text-[#a06b42] font-semibold text-sm md:text-base shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
                onClick={() => { window.location.href = '/attractions/search'; }}
              >
                Browse attractions
                <span className="ml-2 translate-x-0 group-hover:translate-x-0.5 transition-transform">→</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Attractions;
