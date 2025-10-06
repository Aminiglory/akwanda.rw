import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function AdminAttractions() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [content, setContent] = useState({
    pageTitle: '',
    introText: '',
    heroImages: [],
    attractions: [],
    published: false,
  });

  async function loadContent() {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/admin/attractions-content`, { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to fetch');
      setContent(data.content || { pageTitle: '', introText: '', heroImages: [], attractions: [], published: false });
    } catch (e) { toast.error(e.message); } finally { setLoading(false); }
  }
  useEffect(() => { loadContent(); }, []);

  async function saveContent() {
    try {
      setSaving(true);
      const res = await fetch(`${API_URL}/api/admin/attractions-content`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(content),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to save');
      setContent(data.content || content);
      toast.success('Attractions content saved');
    } catch (e) { toast.error(e.message); } finally { setSaving(false); }
  }

  async function uploadImages(files) {
    if (!files || files.length === 0) return;
    try {
      setUploading(true);
      const form = new FormData();
      for (const f of files) form.append('images', f);
      const res = await fetch(`${API_URL}/api/admin/attractions-content/images`, {
        method: 'POST', credentials: 'include', body: form
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Upload failed');
      setContent(c => ({ ...c, heroImages: [...(c.heroImages || []), ...data.images] }));
      toast.success('Images uploaded');
    } catch (e) { toast.error(e.message); } finally { setUploading(false); }
  }

  function addAttraction() {
    setContent(c => ({ ...c, attractions: [...(c.attractions || []), { title: '', shortDesc: '', image: '', linkUrl: '' }] }));
  }
  function updateAttraction(i, field, value) {
    setContent(c => ({ ...c, attractions: c.attractions.map((a, idx) => idx === i ? { ...a, [field]: value } : a) }));
  }
  function removeAttraction(i) {
    setContent(c => ({ ...c, attractions: c.attractions.filter((_, idx) => idx !== i) }));
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Admin: Attractions Page</h1>
      {loading ? (
        <div className="text-gray-600">Loading...</div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-700 mb-1">Page Title</label>
              <input value={content.pageTitle || ''} onChange={e => setContent({ ...content, pageTitle: e.target.value })} className="w-full px-4 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Intro Text</label>
              <input value={content.introText || ''} onChange={e => setContent({ ...content, introText: e.target.value })} className="w-full px-4 py-2 border rounded-lg" />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-2">Hero Images</label>
            <div className="flex flex-wrap gap-3 mb-3">
              {(content.heroImages || []).map((src, i) => (
                <div key={i} className="relative w-28 h-20">
                  <img src={src.startsWith('http') ? src : `${API_URL}${src}`} className="w-28 h-20 object-cover rounded" />
                  <button onClick={() => setContent(c => ({ ...c, heroImages: c.heroImages.filter((_, idx) => idx !== i) }))} className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-6 h-6">×</button>
                </div>
              ))}
            </div>
            <input type="file" multiple onChange={e => uploadImages(e.target.files)} disabled={uploading} />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold">Attractions</h2>
              <button onClick={addAttraction} className="px-3 py-1 bg-blue-600 text-white rounded">Add</button>
            </div>
            <div className="space-y-4">
              {(content.attractions || []).map((a, i) => (
                <div key={i} className="border rounded-lg p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
                  <input value={a.title} onChange={e => updateAttraction(i, 'title', e.target.value)} placeholder="Title" className="px-3 py-2 border rounded" />
                  <input value={a.shortDesc} onChange={e => updateAttraction(i, 'shortDesc', e.target.value)} placeholder="Short description" className="px-3 py-2 border rounded" />
                  <input value={a.linkUrl} onChange={e => updateAttraction(i, 'linkUrl', e.target.value)} placeholder="Link URL" className="px-3 py-2 border rounded" />
                  <div className="flex items-center gap-2">
                    <input value={a.image} onChange={e => updateAttraction(i, 'image', e.target.value)} placeholder="Image path or URL" className="flex-1 px-3 py-2 border rounded" />
                    <button onClick={() => removeAttraction(i)} className="px-3 py-2 bg-red-600 text-white rounded">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={!!content.published} onChange={e => setContent({ ...content, published: !!e.target.checked })} />
              Published
            </label>
            <button onClick={saveContent} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg">{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </div>
      )}
    </div>
  );
}
