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
    title: 'How AKWANDA.rw Works',
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
        title: (how.title || 'How AKWANDA.rw Works') + ' — Guests',
        body: (how.subtitle || '') + (how.guestsTagline ? `\n${how.guestsTagline}` : ''),
        images: guestImages
      };
      const howHostSection = {
        key: 'howItWorksHosts',
        title: (how.title || 'How AKWANDA.rw Works') + ' — Hosts',
        body: (how.subtitle || '') + (how.hostsTagline ? `\n${how.hostsTagline}` : ''),
        images: hostImages
      };
      // Pass through other sections only if they already match schema {key,title,body,images}
      const otherSections = (Array.isArray(content.sections) ? content.sections : [])
        .filter(s => s && s.key && s.title)
        .map(s => ({ key: s.key, title: s.title, body: s.body || '', images: Array.isArray(s.images) ? s.images : [] }));
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

          <div>
            <label className="block text-sm text-gray-700 mb-2">Hero Slideshow Images & Captions</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-3">
              {(content.heroSlides || []).map((slide, i) => (
                <div key={i} className="flex gap-3 items-start min-w-0">
                  <div className="relative w-28 h-20 shrink-0 flex-none min-w-[7rem] min-h-[5rem] bg-gray-100">
                    <img src={(slide.image || '').startsWith('http') ? slide.image : `${API_URL}${slide.image}`} className="w-full h-full object-cover rounded block bg-transparent" alt="Hero slide" />
                    <button onClick={() => removeImage(i)} className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-700 transition-colors" type="button">×</button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <label className="block text-xs text-gray-600 mb-1">Caption</label>
                    <input
                      value={slide.caption || ''}
                      onChange={e => setContent(c => ({
                        ...c,
                        heroSlides: c.heroSlides.map((s, idx) => idx === i ? { ...s, caption: e.target.value } : s)
                      }))}
                      className="w-full px-3 py-2 rounded-lg bg-white shadow-sm ring-0 focus:outline-none focus:ring-2 focus:ring-blue-500"
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm text-gray-700 mb-1">Slideshow Transition</label>
              <select
                value={content.heroTransition || 'fade'}
                onChange={e => setContent({ ...content, heroTransition: e.target.value })}
                className="w-full px-4 py-2 rounded-lg bg-white shadow-sm ring-0 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="fade">Fade</option>
                <option value="slide">Slide</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Slideshow Interval (ms)</label>
              <input
                type="number"
                min={2000}
                step={500}
                value={content.heroIntervalMs || 5000}
                onChange={e => setContent({ ...content, heroIntervalMs: Number(e.target.value) })}
                className="w-full px-4 py-2 rounded-lg bg-white shadow-sm ring-0 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="5000"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={!!content.published} onChange={e => setContent({ ...content, published: !!e.target.checked })} />
              Published
            </label>
            <button onClick={saveContent} disabled={saving} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg shadow">{saving ? 'Saving...' : 'Save'}</button>
          </div>

          {/* How It Works CMS */}
          <div className="bg-white rounded-xl shadow p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-900">How It Works</h2>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={!!howItWorks.enabled}
                  onChange={e => setHowItWorks({ ...howItWorks, enabled: !!e.target.checked })}
                />
                Enabled
              </label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm text-gray-700 mb-1">Title</label>
                <input
                  value={howItWorks.title || ''}
                  onChange={e => setHowItWorks({ ...howItWorks, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-white shadow-sm ring-0 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="How AKWANDA.rw Works"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Subtitle</label>
                <input
                  value={howItWorks.subtitle || ''}
                  onChange={e => setHowItWorks({ ...howItWorks, subtitle: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-white shadow-sm ring-0 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Simple steps for both guests and hosts"
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm text-gray-700 mb-1">Section Image</label>
              <div
                className="relative rounded-xl bg-gray-50 p-3 flex items-center gap-3"
                onDragOver={e => e.preventDefault()}
                onDrop={async e => {
                  e.preventDefault();
                  try {
                    const files = Array.from(e.dataTransfer.files || []).filter(f => f.type.startsWith('image/'));
                    if (!files.length) return;
                    const imgs = await uploadAssets(files);
                    if (imgs && imgs[0]) setHowItWorks({ ...howItWorks, image: imgs[0] });
                  } catch (err) { toast.error(err.message); }
                }}
              >
                {howItWorks.image ? (
                  <div className="relative w-28 h-20 shrink-0 flex-none min-w-[7rem] min-h-[5rem]">
                    <img src={howItWorks.image.startsWith('http') ? howItWorks.image : `${API_URL}${howItWorks.image}`} className="w-full h-full object-cover rounded block" />
                    <button
                      type="button"
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white shadow text-gray-700 flex items-center justify-center"
                      onClick={() => setHowItWorks({ ...howItWorks, image: '' })}
                      title="Remove"
                    >×</button>
                  </div>
                ) : (
                  <div className="w-28 h-20 flex items-center justify-center text-gray-400 text-sm bg-white rounded">Drop image here</div>
                )}
                <div className="ml-auto">
                  <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white shadow text-sm cursor-pointer">
                    <input type="file" className="hidden" accept="image/*" onChange={async e => {
                      try {
                        const imgs = await uploadAssets(e.target.files);
                        if (imgs && imgs[0]) setHowItWorks({ ...howItWorks, image: imgs[0] });
                      } catch (err) { toast.error(err.message); }
                    }} />
                    {uploading ? 'Uploading…' : 'Choose Image'}
                  </label>
                </div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm text-gray-700 mb-1">Media Autoplay Interval (ms)</label>
                <input
                  type="number"
                  min={2000}
                  step={500}
                  value={Number.isFinite(howItWorks.mediaIntervalMs) ? howItWorks.mediaIntervalMs : 5000}
                  onChange={e => setHowItWorks({ ...howItWorks, mediaIntervalMs: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg bg-white shadow-sm ring-0 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="5000"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Guests Tagline (optional)</label>
                <input
                  value={howItWorks.guestsTagline || ''}
                  onChange={e => setHowItWorks({ ...howItWorks, guestsTagline: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-white shadow-sm ring-0 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Short tagline shown for Guests tab"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Hosts Tagline (optional)</label>
                <input
                  value={howItWorks.hostsTagline || ''}
                  onChange={e => setHowItWorks({ ...howItWorks, hostsTagline: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-white shadow-sm ring-0 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Short tagline shown for Hosts tab"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">Guest Steps</h3>
                  <div className="flex items-center gap-3">
                    <button
                      className="text-gray-600 text-sm"
                      type="button"
                      title="Insert a sample image into the first guest step"
                      onClick={() => setHowItWorks(prev => {
                        const steps = [...(prev.guestSteps||[])];
                        if (steps.length === 0) steps.push({ title: 'Step 1', description: '' });
                        // Prefer an existing hero slide image if present
                        const hs = Array.isArray(content.heroSlides) ? content.heroSlides : [];
                        const first = hs.find(s => s?.image);
                        const src = first ? (typeof first.image === 'string' ? first.image : (first.image?.path || first.image?.url || first.image?.src || first.image?.location || '')) : '/uploads/sample-guest.jpg';
                        steps[0] = { ...steps[0], image: src };
                        return { ...prev, guestSteps: steps };
                      })}
                    >Insert Test Image</button>
                    <button className="text-blue-600 text-sm" onClick={() => setHowItWorks({ ...howItWorks, guestSteps: [...(howItWorks.guestSteps||[]), { title: '', description: '' }] })}>+ Add</button>
                  </div>
                </div>
                <div className="space-y-3">
                  {(howItWorks.guestSteps || []).map((s, i) => (
                    <div key={i} className="rounded-xl p-3 bg-white shadow-sm">
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-2 mb-2">
                        <input value={s.title} onChange={e => setHowItWorks({ ...howItWorks, guestSteps: howItWorks.guestSteps.map((x, idx)=> idx===i? { ...x, title: e.target.value }: x) })} className="md:col-span-3 w-full px-3 py-2 rounded-lg bg-white shadow-sm ring-0 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder={`Step ${i+1} title`} />
                        <select value={s.icon || ''} onChange={e => setHowItWorks({ ...howItWorks, guestSteps: howItWorks.guestSteps.map((x, idx)=> idx===i? { ...x, icon: e.target.value }: x) })} className="md:col-span-2 w-full px-3 py-2 rounded-lg bg-white shadow-sm ring-0 focus:outline-none focus:ring-2 focus:ring-blue-500">
                          <option value="">Icon (auto)</option>
                          <option value="search">Search</option>
                          <option value="handshake">Handshake</option>
                          <option value="creditcard">Credit Card</option>
                          <option value="key">Key</option>
                          <option value="upload">Upload</option>
                          <option value="check">Check</option>
                        </select>
                      </div>
                      <div
                        className="flex items-center gap-3 mb-2 rounded-lg bg-gray-50 p-2"
                        onDragOver={e => e.preventDefault()}
                        onDrop={async e => {
                          e.preventDefault();
                          try {
                            const files = Array.from(e.dataTransfer.files || []).filter(f => f.type.startsWith('image/'));
                            if (!files.length) return;
                            const imgs = await uploadAssets(files);
                            if (imgs && imgs[0]) setHowItWorks({ ...howItWorks, guestSteps: howItWorks.guestSteps.map((x, idx)=> idx===i? { ...x, image: imgs[0] }: x) });
                          } catch (err) { toast.error(err.message); }
                        }}
                      >
                        {s.image ? (
                          <div className="relative w-28 h-20 shrink-0 flex-none min-w-[7rem] min-h-[5rem]">
                            <img src={s.image.startsWith('http') ? s.image : `${API_URL}${s.image}`} className="w-full h-full object-cover rounded block" />
                            <button type="button" className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white shadow text-gray-700 flex items-center justify-center" onClick={() => setHowItWorks({ ...howItWorks, guestSteps: howItWorks.guestSteps.map((x, idx)=> idx===i? { ...x, image: '' }: x) })}>×</button>
                          </div>
                        ) : (
                          <div className="w-28 h-20 flex items-center justify-center text-gray-400 text-xs bg-white rounded">Drop image</div>
                        )}
                        <label className="ml-auto inline-flex items-center gap-2 px-3 py-1.5 rounded bg-white shadow-sm hover:shadow text-xs cursor-pointer">
                          <input type="file" className="hidden" accept="image/*" onChange={async e => {
                            try {
                              const imgs = await uploadAssets(e.target.files);
                              if (imgs && imgs[0]) setHowItWorks({ ...howItWorks, guestSteps: howItWorks.guestSteps.map((x, idx)=> idx===i? { ...x, image: imgs[0] }: x) });
                            } catch (err) { toast.error(err.message); }
                          }} />
                          {uploading ? 'Uploading…' : 'Choose'}
                        </label>
                      </div>
                      <div className="mb-2">
                        <textarea value={s.description} onChange={e => setHowItWorks({ ...howItWorks, guestSteps: howItWorks.guestSteps.map((x, idx)=> idx===i? { ...x, description: e.target.value }: x) })} className="w-full px-3 py-2 h-[86px] rounded-lg bg-white shadow-sm ring-1 ring-gray-200 ring-inset focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Description" />
                      </div>
                      <div className="flex items-center justify-between mt-1 text-xs">
                        <div className="flex gap-2">
                          <button className="text-gray-600" disabled={i===0} onClick={() => setHowItWorks({ ...howItWorks, guestSteps: howItWorks.guestSteps.map((x, idx, arr)=> idx===i? arr[i-1] : idx===i-1? arr[i] : x) })}>↑ Up</button>
                          <button className="text-gray-600" disabled={i===(howItWorks.guestSteps.length-1)} onClick={() => setHowItWorks({ ...howItWorks, guestSteps: howItWorks.guestSteps.map((x, idx, arr)=> idx===i? arr[i+1] : idx===i+1? arr[i] : x) })}>↓ Down</button>
                        </div>
                        <button className="text-red-600" onClick={() => setHowItWorks({ ...howItWorks, guestSteps: howItWorks.guestSteps.filter((_, idx)=> idx!==i) })}>Remove</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">Host Steps</h3>
                  <div className="flex items-center gap-3">
                    <button
                      className="text-gray-600 text-sm"
                      type="button"
                      title="Insert a sample image into the first host step"
                      onClick={() => setHowItWorks(prev => {
                        const steps = [...(prev.hostSteps||[])];
                        if (steps.length === 0) steps.push({ title: 'Step 1', description: '' });
                        // Prefer an existing hero slide image if present
                        const hs = Array.isArray(content.heroSlides) ? content.heroSlides : [];
                        const first = hs.find(s => s?.image);
                        const src = first ? (typeof first.image === 'string' ? first.image : (first.image?.path || first.image?.url || first.image?.src || first.image?.location || '')) : '/uploads/sample-host.jpg';
                        steps[0] = { ...steps[0], image: src };
                        return { ...prev, hostSteps: steps };
                      })}
                    >Insert Test Image</button>
                    <button className="text-blue-600 text-sm" onClick={() => setHowItWorks({ ...howItWorks, hostSteps: [...(howItWorks.hostSteps||[]), { title: '', description: '' }] })}>+ Add</button>
                  </div>
                </div>
                <div className="space-y-3">
                  {(howItWorks.hostSteps || []).map((s, i) => (
                    <div key={i} className="rounded-xl p-3 bg-white shadow-sm">
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-2 mb-1">
                        <input value={s.title} onChange={e => setHowItWorks({ ...howItWorks, hostSteps: howItWorks.hostSteps.map((x, idx)=> idx===i? { ...x, title: e.target.value }: x) })} className="md:col-span-3 w-full px-3 py-2 rounded-lg bg-white shadow-sm ring-0 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder={`Step ${i+1} title`} />
                        <select value={s.icon || ''} onChange={e => setHowItWorks({ ...howItWorks, hostSteps: howItWorks.hostSteps.map((x, idx)=> idx===i? { ...x, icon: e.target.value }: x) })} className="md:col-span-2 w-full px-3 py-2 rounded-lg bg-white shadow-sm ring-0 focus:outline-none focus:ring-2 focus:ring-blue-500">
                          <option value="">Icon (auto)</option>
                          <option value="search">Search</option>
                          <option value="handshake">Handshake</option>
                          <option value="creditcard">Credit Card</option>
                          <option value="key">Key</option>
                          <option value="upload">Upload</option>
                          <option value="check">Check</option>
                        </select>
                      </div>
                      <div
                        className="flex items-center gap-3 mb-1 rounded-lg bg-gray-50 p-2"
                        onDragOver={e => e.preventDefault()}
                        onDrop={async e => {
                          e.preventDefault();
                          try {
                            const files = Array.from(e.dataTransfer.files || []).filter(f => f.type.startsWith('image/'));
                            if (!files.length) return;
                            const imgs = await uploadAssets(files);
                            if (imgs && imgs[0]) setHowItWorks({ ...howItWorks, hostSteps: howItWorks.hostSteps.map((x, idx)=> idx===i? { ...x, image: imgs[0] }: x) });
                          } catch (err) { toast.error(err.message); }
                        }}
                      >
                        {s.image ? (
                          <div className="relative w-28 h-20 shrink-0 flex-none">
                            <img src={s.image.startsWith('http') ? s.image : `${API_URL}${s.image}`} className="w-full h-full object-cover rounded" />
                            <button type="button" className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white shadow text-gray-700" onClick={() => setHowItWorks({ ...howItWorks, hostSteps: howItWorks.hostSteps.map((x, idx)=> idx===i? { ...x, image: '' }: x) })}>×</button>
                          </div>
                        ) : (
                          <div className="w-24 h-16 flex items-center justify-center text-gray-400 text-xs bg-white rounded">Drop image</div>
                        )}
                        <label className="ml-auto inline-flex items-center gap-2 px-3 py-1.5 rounded bg-white shadow-sm hover:shadow text-xs cursor-pointer">
                          <input type="file" className="hidden" accept="image/*" onChange={async e => {
                            try {
                              const imgs = await uploadAssets(e.target.files);
                              if (imgs && imgs[0]) setHowItWorks({ ...howItWorks, hostSteps: howItWorks.hostSteps.map((x, idx)=> idx===i? { ...x, image: imgs[0] }: x) });
                            } catch (err) { toast.error(err.message); }
                          }} />
                          {uploading ? 'Uploading…' : 'Choose'}
                        </label>
                      </div>
                      <div className="mb-2">
                        <textarea value={s.description} onChange={e => setHowItWorks({ ...howItWorks, hostSteps: howItWorks.hostSteps.map((x, idx)=> idx===i? { ...x, description: e.target.value }: x) })} className="w-full px-3 py-2 h-[86px] rounded-lg bg-white shadow-sm ring-1 ring-gray-200 ring-inset focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Description" />
                      </div>
                      <div className="flex items-center justify-between mt-1 text-xs">
                        <div className="flex gap-2">
                          <button className="text-gray-600" disabled={i===0} onClick={() => setHowItWorks({ ...howItWorks, hostSteps: howItWorks.hostSteps.map((x, idx, arr)=> idx===i? arr[i-1] : idx===i-1? arr[i] : x) })}>↑ Up</button>
                          <button className="text-gray-600" disabled={i===(howItWorks.hostSteps.length-1)} onClick={() => setHowItWorks({ ...howItWorks, hostSteps: howItWorks.hostSteps.map((x, idx, arr)=> idx===i? arr[i+1] : idx===i+1? arr[i] : x) })}>↓ Down</button>
                        </div>
                        <button className="text-red-600" onClick={() => setHowItWorks({ ...howItWorks, hostSteps: howItWorks.hostSteps.filter((_, idx)=> idx!==i) })}>Remove</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">FAQs</h3>
                <button className="text-blue-600 text-sm" onClick={() => setHowItWorks({ ...howItWorks, faqs: [...(howItWorks.faqs||[]), { q: '', a: '' }] })}>+ Add</button>
              </div>
              <div className="space-y-3">
                {(howItWorks.faqs || []).map((f, i) => (
                  <div key={i} className="rounded-xl p-3 bg-white shadow-sm">
                    <input value={f.q} onChange={e => setHowItWorks({ ...howItWorks, faqs: howItWorks.faqs.map((x, idx)=> idx===i? { ...x, q: e.target.value }: x) })} className="w-full px-3 py-2 rounded-lg bg-white shadow-sm ring-1 ring-gray-200 ring-inset focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2" placeholder="Question" />
                    <textarea value={f.a} onChange={e => setHowItWorks({ ...howItWorks, faqs: howItWorks.faqs.map((x, idx)=> idx===i? { ...x, a: e.target.value }: x) })} className="w-full px-3 py-2 rounded-lg bg-white shadow-sm ring-1 ring-gray-200 ring-inset focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Answer" />
                    <div className="text-right mt-1">
                      <button className="text-red-600 text-xs" onClick={() => setHowItWorks({ ...howItWorks, faqs: howItWorks.faqs.filter((_, idx)=> idx!==i) })}>Remove</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
