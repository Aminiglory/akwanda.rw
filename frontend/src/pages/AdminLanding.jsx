import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function AdminLanding() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [content, setContent] = useState({
    heroTitle: '',
    heroSubtitle: '',
    heroImages: [],
    heroSlides: [],
    heroTransition: 'fade',
    heroIntervalMs: 5000,
    sections: [],
    published: false,
  });

  // Find or create the How It Works section in memory
  const howItWorks = (content.sections || []).find(s => s?.type === 'howItWorks') || {
    type: 'howItWorks',
    enabled: true,
    title: 'How AkwandaTravels.com Works',
    subtitle: 'Simple steps for both guests and hosts',
    image: '',
    guestSteps: [
      { title: 'Search & Filter', description: 'Find the perfect apartment using our advanced filters' },
      { title: 'Book & Connect', description: 'Reserve instantly or message the host for details' },
      { title: 'Enjoy Your Stay', description: 'Check in and enjoy tailored amenities' },
    ],
    hostSteps: [
      { title: 'List Your Place', description: 'Create your listing with photos and details' },
      { title: 'Manage Bookings', description: 'Approve, message, and manage availability' },
      { title: 'Get Paid', description: 'Secure payouts with transparent fees' },
    ],
    faqs: [
      { q: 'How do I become a host?', a: 'Register, create a listing, and publish when ready.' },
      { q: 'What fees apply?', a: 'We keep fees transparent; see pricing in your dashboard.' },
    ],
  };

  function setHowItWorks(updater) {
    setContent(c => {
      const sections = Array.isArray(c.sections) ? [...c.sections] : [];
      const idx = sections.findIndex(s => s?.type === 'howItWorks');
      const next = typeof updater === 'function' ? updater(idx >= 0 ? sections[idx] : howItWorks) : updater;
      if (idx >= 0) sections[idx] = next; else sections.push(next);
      return { ...c, sections };
    });
  }

  // Generic section helpers (for ourMission and landingAttractions)
  function getSectionByKey(key) {
    const sections = Array.isArray(content.sections) ? content.sections : [];
    return sections.find(s => s?.key === key) || null;
  }

  function setSectionByKey(key, updater) {
    setContent(c => {
      const sections = Array.isArray(c.sections) ? [...c.sections] : [];
      const idx = sections.findIndex(s => s?.key === key);
      const current = idx >= 0 ? sections[idx] : { key, title: '', body: '', images: [] };
      const next = typeof updater === 'function' ? updater(current) : updater;
      if (idx >= 0) sections[idx] = next; else sections.push(next);
      return { ...c, sections };
    });
  }

  async function loadContent() {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/admin/landing-content`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch landing content');
      const data = await res.json();
      const c = data.content || {};
      // Merge top-level howItWorks into sections if backend returns it separately
      const existingSections = Array.isArray(c.sections) ? c.sections : [];
      const hasHow = existingSections.some(s => s?.type === 'howItWorks');
      const mergedSections = !hasHow && c.howItWorks ? [...existingSections, { ...c.howItWorks, type: 'howItWorks' }] : existingSections;
      setContent({
        heroTitle: c.heroTitle || '',
        heroSubtitle: c.heroSubtitle || '',
        heroImages: Array.isArray(c.heroImages) ? c.heroImages : [],
        heroSlides: Array.isArray(c.heroSlides) ? c.heroSlides : [],
        heroTransition: c.heroTransition || 'fade',
        heroIntervalMs: typeof c.heroIntervalMs === 'number' ? c.heroIntervalMs : 5000,
        sections: mergedSections,
        published: !!c.published,
      });
    } catch (e) {
      toast.error(e.message);
    } finally { setLoading(false); }
  }

  // Generic asset uploader that returns uploaded image paths without mutating hero state
  async function uploadAssets(files) {
    if (!files || files.length === 0) return [];
    const form = new FormData();
    for (const f of files) form.append('images', f);
    const res = await fetch(`${API_URL}/api/admin/landing-content/images`, {
      method: 'POST',
      credentials: 'include',
      body: form,
    });
    if (!res.ok) throw new Error('Upload failed');
    const data = await res.json();
    const arr = Array.isArray(data.images) ? data.images : [];
    // Normalize to array of string paths
    const paths = arr
      .map(i => typeof i === 'string' ? i : (i?.path || i?.url || i?.src || ''))
      .filter(Boolean);
    return paths;
  }

  useEffect(() => { loadContent(); }, []);

  async function saveContent() {
    try {
      setSaving(true);
      // Build sanitized payload to avoid backend schema rejections
      const allowedHowKeys = new Set(['type','enabled','title','subtitle','image','guestSteps','hostSteps','faqs','guestsTagline','hostsTagline','mediaIntervalMs']);
      const normalizePath = (v) => {
        if (typeof v === 'string') return v;
        const x = v || {};
        return x.path || x.url || x.src || x.location || x.publicUrl || x.secure_url || x.downloadUrl || '';
      };
      // Build a Section that matches backend schema
      const how = howItWorks || {};
      const guestImages = (Array.isArray(how.guestSteps) ? how.guestSteps : [])
        .map(s => normalizePath(s.image)).filter(p => typeof p === 'string' && p.trim().length > 0);
      const hostImages = (Array.isArray(how.hostSteps) ? how.hostSteps : [])
        .map(s => normalizePath(s.image)).filter(p => typeof p === 'string' && p.trim().length > 0);
      const howGuestSection = {
        key: 'howItWorksGuests',
        title: (how.title || 'How AkwandaTravels.com Works') + ' — Guests',
        body: (how.subtitle || '') + (how.guestsTagline ? `\n${how.guestsTagline}` : ''),
        images: guestImages
      };
      const howHostSection = {
        key: 'howItWorksHosts',
        title: (how.title || 'How AkwandaTravels.com Works') + ' — Hosts',
        body: (how.subtitle || '') + (how.hostsTagline ? `\n${how.hostsTagline}` : ''),
        images: hostImages
      };
      // Pass through sections that match schema; provide defaults for known keys
      const otherSections = (Array.isArray(content.sections) ? content.sections : [])
        .filter(s => s && s.key)
        .map(s => {
          const key = s.key;
          const title = s.title || (
            key === 'ourMission'
              ? 'Our Mission'
              : key === 'landingAttractions'
                ? 'Top Attractions'
                : key === 'featuredDestinations'
                  ? 'Featured destinations'
                  : ''
          );
          if (!title) return null; // keep backend schema happy (title is required)
          return {
            key,
            title,
            body: s.body || '',
            images: Array.isArray(s.images) ? s.images : []
          };
        })
        .filter(Boolean);
      const sanitizedSections = [howGuestSection, howHostSection, ...otherSections];
      const payload = {
        heroTitle: content.heroTitle || '',
        heroSubtitle: content.heroSubtitle || '',
        heroImages: Array.isArray(content.heroImages) ? content.heroImages : [],
        heroSlides: Array.isArray(content.heroSlides) ? content.heroSlides.map(s => ({ image: s.image || '', caption: s.caption || '' })) : [],
        heroTransition: content.heroTransition || 'fade',
        heroIntervalMs: typeof content.heroIntervalMs === 'number' ? content.heroIntervalMs : 5000,
        sections: sanitizedSections,
        published: !!content.published,
      };
      const res = await fetch(`${API_URL}/api/admin/landing-content`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        // Surface server details for debugging
        // eslint-disable-next-line no-console
        console.error('Save landing content failed', { status: res.status });
        throw new Error(`Failed to save (status ${res.status})`);
      }
      const data = await res.json();
      if (!data.content) {
        throw new Error('Invalid response from server');
      }
      setContent(data.content || payload);
      toast.success('Landing content saved');
      // Debug: verify what the public endpoint will return, with small retries
      try {
        const fetchPublic = async () => {
          const verifyRes = await fetch(`${API_URL}/api/content/landing?t=${Date.now()}`);
          if (!verifyRes.ok) return;
          const verifyData = await verifyRes.json();
          const sections = Array.isArray(verifyData?.content?.sections) ? verifyData.content.sections : [];
          const guestSec = sections.find(s => s?.key === 'howItWorksGuests');
          const hostSec = sections.find(s => s?.key === 'howItWorksHosts');
          const gImgs = Array.isArray(guestSec?.images) ? guestSec.images : [];
          const hImgs = Array.isArray(hostSec?.images) ? hostSec.images : [];
          const hero = Array.isArray(verifyData?.content?.heroSlides) ? verifyData.content.heroSlides : [];
          const heroImgs = hero.map(s => (typeof s.image === 'string' ? s.image : (s?.image?.path || s?.image?.url || s?.image?.src || s?.image?.location || ''))).filter(Boolean);
          return { gCount: gImgs.length, hCount: hImgs.length, heroCount: heroImgs.length };
        };
        let attempts = 0;
        let counts = { gCount: 0, hCount: 0, heroCount: 0 };
        while (attempts < 3) {
          counts = await fetchPublic();
          if (counts.gCount > 0 || counts.hCount > 0) break;
          await new Promise(r => setTimeout(r, 500));
          attempts++;
        }
        toast(() => `Slides detected → Guests: ${counts.gCount}, Hosts: ${counts.hCount}, Hero: ${counts.heroCount}`);
      } catch (_) {
        // ignore debug failures
      }
    } catch (e) {
      toast.error(e.message);
    } finally { setSaving(false); }
  }

  async function uploadImages(files) {
    if (!files || files.length === 0) return;
    try {
      setUploading(true);
      const paths = await uploadAssets(files);
      setContent(c => ({
        ...c,
        heroImages: [...(c.heroImages || []), ...(paths || [])],
        heroSlides: [
          ...(Array.isArray(c.heroSlides) ? c.heroSlides : []),
          ...(paths || []).map(img => ({ image: img, caption: '' }))
        ]
      }));
      toast.success('Images uploaded');
    } catch (e) { toast.error(e.message); } finally { setUploading(false); }
  }

  function removeImage(idx) {
    setContent(c => {
      const newHeroImages = (c.heroImages || []).filter((_, i) => i !== idx);
      const newHeroSlides = (c.heroSlides || []).filter((_, i) => i !== idx);
      return {
        ...c,
        heroImages: newHeroImages,
        heroSlides: newHeroSlides
      };
    });
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">Admin: Landing Page Content</h1>
      {loading ? (
        <div className="text-gray-600">Loading...</div>
      ) : (
        <div className="space-y-6">
          {/* 1. Hero Section - First in landing page */}
          <div className="bg-white rounded-xl shadow p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Hero Section</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm text-gray-700 mb-1">Hero Title</label>
                <input
                  value={content.heroTitle || ''}
                  onChange={e => setContent({ ...content, heroTitle: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-white shadow-sm ring-0 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Welcome to AKWANDA"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Hero Subtitle</label>
                <input
                  value={content.heroSubtitle || ''}
                  onChange={e => setContent({ ...content, heroSubtitle: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-white shadow-sm ring-0 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Find places to stay, cars, and attractions"
                />
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-sm text-gray-700 mb-3">Hero Slideshow Images & Captions</label>
              <div className="grid grid-cols-1 gap-4 mb-4">
                {(content.heroSlides || []).map((slide, i) => (
                  <div key={i} className="flex gap-4 items-start p-4 bg-white rounded-lg shadow-sm border border-gray-200">
                    <div className="relative w-32 h-24 shrink-0 flex-none bg-gray-100 rounded-lg overflow-hidden">
                      <img src={(slide.image || '').startsWith('http') ? slide.image : `${API_URL}${slide.image}`} className="w-full h-full object-cover bg-transparent" alt="Hero slide" />
                      <button onClick={() => removeImage(i)} className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-7 h-7 flex items-center justify-center hover:bg-red-700 transition-colors shadow-md" type="button">×</button>
                    </div>
                    <div className="flex-1 min-w-0">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Caption for Slide {i + 1}</label>
                      <input
                        value={slide.caption || ''}
                        onChange={e => setContent(c => ({
                          ...c,
                          heroSlides: c.heroSlides.map((s, idx) => idx === i ? { ...s, caption: e.target.value } : s)
                        }))}
                        className="w-full px-4 py-2.5 rounded-lg bg-white shadow-sm border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Optional caption for this slide"
                      />
                    </div>
                  </div>
                ))}
                {(!content.heroSlides || content.heroSlides.length === 0) && (
                  <div className="text-gray-500 text-sm">No slides yet. Upload images to create slides.</div>
                )}
              </div>
              <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white shadow text-sm cursor-pointer">
                <input type="file" className="hidden" multiple onChange={e => uploadImages(e.target.files)} disabled={uploading} />
                {uploading ? 'Uploading…' : 'Add Slides'}
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">
              <div>
                <label className="block text-sm text-gray-700 mb-1">Slideshow Transition</label>
                <select
                  value={content.heroTransition || 'fade'}
                  onChange={e => setContent({ ...content, heroTransition: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-white shadow-sm border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="fade">Fade</option>
                  <option value="slide">Slide</option>
                  <option value="zoom">Zoom</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Interval (ms)</label>
                <input
                  type="number"
                  value={content.heroIntervalMs || 5000}
                  onChange={e => setContent({ ...content, heroIntervalMs: parseInt(e.target.value) || 5000 })}
                  className="w-full px-4 py-2 rounded-lg bg-white shadow-sm border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="1000"
                  max="10000"
                  step="500"
                />
              </div>
            </div>
          </div>

          {/* 2. Featured Apartments - Second in landing page (managed separately) */}
          <div className="bg-gray-50 rounded-xl p-5 border-2 border-dashed border-gray-300">
            <h2 className="text-lg font-semibold text-gray-600 mb-2">Featured Apartments</h2>
            <p className="text-sm text-gray-500">Automatically populated from property listings. No CMS management needed.</p>
          </div>

          {/* 3. Landing Attractions - Third in landing page */}
          <div className="bg-white rounded-xl shadow p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-900">Landing Attractions</h2>
              <span className="text-xs text-gray-500">Key: landingAttractions</span>
            </div>
            {(() => {
              const sec = getSectionByKey('landingAttractions') || { key: 'landingAttractions', title: '', body: '', images: [] };
              return (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">Section Title</label>
                      <input
                        value={sec.title || ''}
                        onChange={e => setSectionByKey('landingAttractions', { ...sec, title: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg bg-white shadow-sm ring-0 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Top Attractions"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">Captions (one per line; aligns to images)</label>
                      <textarea
                        value={sec.body || ''}
                        onChange={e => setSectionByKey('landingAttractions', { ...sec, body: e.target.value })}
                        className="w-full px-3 py-2 h-[92px] rounded-lg bg-white shadow-sm ring-1 ring-gray-200 ring-inset focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder={"Kigali Genocide Memorial\nVolcanoes National Park\nLake Kivu"}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Attraction Images</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {(sec.images || []).map((img, i) => (
                        <div key={i} className="relative w-full aspect-video rounded-lg overflow-hidden bg-gray-100">
                          <img src={(img||'').startsWith('http') ? img : `${API_URL}${img}`} className="w-full h-full object-cover" />
                          <button type="button" className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-red-600 text-white shadow flex items-center justify-center" onClick={() => setSectionByKey('landingAttractions', { ...sec, images: (sec.images||[]).filter((_, idx)=> idx!==i) })}>×</button>
                        </div>
                      ))}
                      <label className="flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg h-28 cursor-pointer bg-white">
                        <input type="file" className="hidden" accept="image/*" multiple onChange={async e => {
                          try {
                            const paths = await uploadAssets(e.target.files);
                            setSectionByKey('landingAttractions', { ...sec, images: [...(sec.images||[]), ...paths] });
                          } catch (err) { toast.error(err.message); }
                        }} />
                        <span className="text-sm text-gray-600">Add images</span>
                      </label>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
          {/* 4. Featured Destinations - Fourth in landing page */}
          <div className="bg-white rounded-xl shadow p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-900">Featured Destinations</h2>
              <span className="text-xs text-gray-500">Key: featuredDestinations</span>
            </div>
            {(() => {
              const sec = getSectionByKey('featuredDestinations') || { key: 'featuredDestinations', title: '', body: '', images: [] };
              return (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">Section Title</label>
                      <input
                        value={sec.title || ''}
                        onChange={e => setSectionByKey('featuredDestinations', { ...sec, title: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg bg-white shadow-sm ring-0 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Featured destinations"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">Destinations (one per line: City | Tagline)</label>
                      <textarea
                        value={sec.body || ''}
                        onChange={e => setSectionByKey('featuredDestinations', { ...sec, body: e.target.value })}
                        className="w-full px-3 py-2 h-[92px] rounded-lg bg-white shadow-sm ring-1 ring-gray-200 ring-inset focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder={"Kigali | City lights, hills and vibrant cultural spots\nMusanze | Gateway to gorilla trekking and volcanic peaks"}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Destination Images</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {(sec.images || []).map((img, i) => (
                        <div key={i} className="relative w-full aspect-video rounded-lg overflow-hidden bg-gray-100">
                          <img src={(img||'').startsWith('http') ? img : `${API_URL}${img}`} className="w-full h-full object-cover" />
                          <button type="button" className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-red-600 text-white shadow flex items-center justify-center" onClick={() => setSectionByKey('featuredDestinations', { ...sec, images: (sec.images||[]).filter((_, idx)=> idx!==i) })}>×</button>
                        </div>
                      ))}
                      <label className="flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg h-28 cursor-pointer bg-white">
                        <input type="file" className="hidden" accept="image/*" multiple onChange={async e => {
                          try {
                            const paths = await uploadAssets(e.target.files);
                            setSectionByKey('featuredDestinations', { ...sec, images: [...(sec.images||[]), ...paths] });
                          } catch (err) { toast.error(err.message); }
                        }} />
                        <span className="text-sm text-gray-600">Add images</span>
                      </label>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* 5. How It Works – Guests Media (images used in Guests tab slideshow) */}
          <div className="bg-white rounded-xl shadow p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-900">How It Works – Guests Media</h2>
              <span className="text-xs text-gray-500">Key: howItWorksGuests</span>
            </div>
            {(() => {
              const sec = getSectionByKey('howItWorksGuests') || { key: 'howItWorksGuests', images: [] };
              return (
                <div className="space-y-3">
                  <label className="block text-sm text-gray-700">Slideshow Images (Guests)</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {(sec.images || []).map((img, i) => (
                      <div key={i} className="relative w-full aspect-video rounded-lg overflow-hidden bg-gray-100">
                        <img src={(img||'').startsWith('http') ? img : `${API_URL}${img}`} className="w-full h-full object-cover" />
                        <button type="button" className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-red-600 text-white shadow flex items-center justify-center" onClick={() => setSectionByKey('howItWorksGuests', { ...sec, images: (sec.images||[]).filter((_, idx)=> idx!==i) })}>×</button>
                      </div>
                    ))}
                    <label className="flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg h-28 cursor-pointer bg-white">
                      <input type="file" className="hidden" accept="image/*" multiple onChange={async e => {
                        try {
                          const paths = await uploadAssets(e.target.files);
                          setSectionByKey('howItWorksGuests', { ...sec, images: [...(sec.images||[]), ...paths] });
                        } catch (err) { toast.error(err.message); }
                      }} />
                      <span className="text-sm text-gray-600">Add images</span>
                    </label>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* 6. How It Works – Hosts Media (images used in Hosts tab slideshow) */}
          <div className="bg-white rounded-xl shadow p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-900">How It Works – Hosts Media</h2>
              <span className="text-xs text-gray-500">Key: howItWorksHosts</span>
            </div>
            {(() => {
              const sec = getSectionByKey('howItWorksHosts') || { key: 'howItWorksHosts', images: [] };
              return (
                <div className="space-y-3">
                  <label className="block text-sm text-gray-700">Slideshow Images (Hosts)</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {(sec.images || []).map((img, i) => (
                      <div key={i} className="relative w-full aspect-video rounded-lg overflow-hidden bg-gray-100">
                        <img src={(img||'').startsWith('http') ? img : `${API_URL}${img}`} className="w-full h-full object-cover" />
                        <button type="button" className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-red-600 text-white shadow flex items-center justify-center" onClick={() => setSectionByKey('howItWorksHosts', { ...sec, images: (sec.images||[]).filter((_, idx)=> idx!==i) })}>×</button>
                      </div>
                    ))}
                    <label className="flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg h-28 cursor-pointer bg-white">
                      <input type="file" className="hidden" accept="image/*" multiple onChange={async e => {
                        try {
                          const paths = await uploadAssets(e.target.files);
                          setSectionByKey('howItWorksHosts', { ...sec, images: [...(sec.images||[]), ...paths] });
                        } catch (err) { toast.error(err.message); }
                      }} />
                      <span className="text-sm text-gray-600">Add images</span>
                    </label>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* 7. Our Mission - Sixth in landing page */}
          <div className="bg-white rounded-xl shadow p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-900">Our Mission</h2>
              <span className="text-xs text-gray-500">Key: ourMission</span>
            </div>
            {(() => {
              const sec = getSectionByKey('ourMission') || { key: 'ourMission', title: '', body: '', images: [] };
              return (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">Title</label>
                      <input
                        value={sec.title || ''}
                        onChange={e => setSectionByKey('ourMission', { ...sec, title: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg bg-white shadow-sm ring-0 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Our Mission"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">Body</label>
                      <textarea
                        value={sec.body || ''}
                        onChange={e => setSectionByKey('ourMission', { ...sec, body: e.target.value })}
                        className="w-full px-3 py-2 h-[92px] rounded-lg bg-white shadow-sm ring-1 ring-gray-200 ring-inset focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Describe your mission"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Slideshow Images</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {(sec.images || []).map((img, i) => (
                        <div key={i} className="relative w-full aspect-video rounded-lg overflow-hidden bg-gray-100">
                          <img src={(img||'').startsWith('http') ? img : `${API_URL}${img}`} className="w-full h-full object-cover" />
                          <button type="button" className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-red-600 text-white shadow flex items-center justify-center" onClick={() => setSectionByKey('ourMission', { ...sec, images: (sec.images||[]).filter((_, idx)=> idx!==i) })}>×</button>
                        </div>
                      ))}
                      <label className="flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg h-28 cursor-pointer bg-white">
                        <input type="file" className="hidden" accept="image/*" multiple onChange={async e => {
                          try {
                            const paths = await uploadAssets(e.target.files);
                            setSectionByKey('ourMission', { ...sec, images: [...(sec.images||[]), ...paths] });
                          } catch (err) { toast.error(err.message); }
                        }} />
                        <span className="text-sm text-gray-600">Add images</span>
                      </label>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* 8. Partners - Seventh in landing page */}
          <div className="bg-white rounded-xl shadow p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-900">Partners</h2>
              <span className="text-xs text-gray-500">Key: partners</span>
            </div>
            {(() => {
              const sec = getSectionByKey('partners') || { key: 'partners', title: '', body: '', images: [] };
              return (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">Section Title</label>
                      <input
                        value={sec.title || ''}
                        onChange={e => setSectionByKey('partners', { ...sec, title: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg bg-white shadow-sm ring-0 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Trusted by partners"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">Partners (one per line: Name | Tagline | URL)</label>
                      <textarea
                        value={sec.body || ''}
                        onChange={e => setSectionByKey('partners', { ...sec, body: e.target.value })}
                        className="w-full px-3 py-2 h-[92px] rounded-lg bg-white shadow-sm ring-1 ring-gray-200 ring-inset focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder={"Bank X | Finance partner | https://bankx.com\nHotel Group Y | Hospitality partner | https://example.com"}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Partner Logos</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {(sec.images || []).map((img, i) => (
                        <div key={i} className="relative w-full aspect-video rounded-lg overflow-hidden bg-gray-100">
                          <img src={(img||'').startsWith('http') ? img : `${API_URL}${img}`} className="w-full h-full object-cover" />
                          <button type="button" className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-red-600 text-white shadow flex items-center justify-center" onClick={() => setSectionByKey('partners', { ...sec, images: (sec.images||[]).filter((_, idx)=> idx!==i) })}>×</button>
                        </div>
                      ))}
                      <label className="flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg h-28 cursor-pointer bg-white">
                        <input type="file" className="hidden" accept="image/*" multiple onChange={async e => {
                          try {
                            const paths = await uploadAssets(e.target.files);
                            setSectionByKey('partners', { ...sec, images: [...(sec.images||[]), ...paths] });
                          } catch (err) { toast.error(err.message); }
                        }} />
                        <span className="text-sm text-gray-600">Add logos</span>
                      </label>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* 9. Testimonials - Eighth in landing page (managed separately) */}
          <div className="bg-gray-50 rounded-xl p-5 border-2 border-dashed border-gray-300">
            <h2 className="text-lg font-semibold text-gray-600 mb-2">Testimonials</h2>
            <p className="text-sm text-gray-500">Automatically populated from user reviews. No CMS management needed.</p>
          </div>

          {/* Save and Publish Controls */}
          <div className="bg-white rounded-xl shadow p-5">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={!!content.published} onChange={e => setContent({ ...content, published: !!e.target.checked })} />
                Published
              </label>
              <button onClick={saveContent} disabled={saving} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg shadow">{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
