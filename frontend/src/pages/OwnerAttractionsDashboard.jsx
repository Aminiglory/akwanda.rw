import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function OwnerAttractionsDashboard() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingId, setUploadingId] = useState(null);
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'table'

  const empty = useMemo(() => ({
    name: '',
    description: '',
    category: 'tour',
    location: '',
    city: '',
    country: 'Rwanda',
    price: 0,
    currency: 'RWF',
    isActive: true,
    highlights: ''
  }), []);
  const [form, setForm] = useState(empty);

  async function loadMine() {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/attractions/mine`, { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to load');
      setItems(data.attractions || []);
    } catch (e) { toast.error(e.message); } finally { setLoading(false); }
  }

  useEffect(() => { loadMine(); }, []);

  function reset() { setForm(empty); }

  async function createItem(e) {
    e.preventDefault();
    try {
      setSaving(true);
      const payload = {
        ...form,
        price: Number(form.price || 0),
        highlights: String(form.highlights || '').split(',').map(s => s.trim()).filter(Boolean)
      };
      const res = await fetch(`${API_URL}/api/attractions`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create');
      setItems(list => [data.attraction, ...list]);
      toast.success('Attraction created');
      reset();
    } catch (e) { toast.error(e.message); } finally { setSaving(false); }
  }

  async function updateItem(id, patch) {
    try {
      const res = await fetch(`${API_URL}/api/attractions/${id}`, {
        method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Update failed');
      setItems(list => list.map(x => x._id === id ? data.attraction : x));
      toast.success('Updated');
    } catch (e) { toast.error(e.message); }
  }

  async function deleteItem(id) {
    if (!confirm('Delete this attraction?')) return;
    try {
      const res = await fetch(`${API_URL}/api/attractions/${id}`, { method: 'DELETE', credentials: 'include' });
      const data = await res.json().catch(()=>({}));
      if (!res.ok) throw new Error(data.message || 'Delete failed');
      setItems(list => list.filter(x => x._id !== id));
      toast.success('Deleted');
    } catch (e) { toast.error(e.message); }
  }

  async function uploadImages(id, files) {
    if (!files?.length) return;
    try {
      setUploadingId(id);
      const fd = new FormData();
      Array.from(files).forEach(f => fd.append('images', f));
      const res = await fetch(`${API_URL}/api/attractions/${id}/images`, { method: 'POST', credentials: 'include', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Upload failed');
      setItems(list => list.map(x => x._id === id ? data.attraction : x));
      toast.success('Images uploaded');
    } catch (e) { toast.error(e.message); } finally { setUploadingId(null); }
  }

  const isActiveTab = (path) => location.pathname.startsWith(path);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Owner tabs */}
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="inline-flex rounded-lg overflow-hidden border border-[#d4c4b0]">
          <a href="/owner/cars" className={`px-3 py-2 text-sm ${isActiveTab('/owner/cars') ? 'bg-[#a06b42] text-white' : 'bg-[#f6e9d8] text-[#4b2a00] hover:bg-[#e8dcc8]'}`}>Cars</a>
          <a href="/owner/attractions" className={`px-3 py-2 text-sm ${isActiveTab('/owner/attractions') ? 'bg-[#a06b42] text-white' : 'bg-[#f6e9d8] text-[#4b2a00] hover:bg-[#e8dcc8]'}`}>Attractions</a>
        </div>
        <div className="inline-flex rounded-lg overflow-hidden border">
          <button onClick={()=>setViewMode('cards')} className={`px-3 py-2 text-sm ${viewMode==='cards' ? 'bg-[#a06b42] text-white' : 'bg-white text-gray-700'}`}>Cards</button>
          <button onClick={()=>setViewMode('table')} className={`px-3 py-2 text-sm ${viewMode==='table' ? 'bg-[#a06b42] text-white' : 'bg-white text-gray-700'}`}>Table</button>
        </div>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-4">My Attractions</h1>

      {/* Create */}
      <form onSubmit={createItem} className="bg-white rounded-lg shadow p-4 mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <input className="px-3 py-2 border rounded" placeholder="Name" value={form.name} onChange={e=>setForm({ ...form, name: e.target.value })} />
        <input className="px-3 py-2 border rounded" placeholder="Category" value={form.category} onChange={e=>setForm({ ...form, category: e.target.value })} />
        <input className="px-3 py-2 border rounded" placeholder="City" value={form.city} onChange={e=>setForm({ ...form, city: e.target.value })} />
        <input className="px-3 py-2 border rounded" placeholder="Location" value={form.location} onChange={e=>setForm({ ...form, location: e.target.value })} />
        <input className="px-3 py-2 border rounded" type="number" placeholder="Price" value={form.price} onChange={e=>setForm({ ...form, price: e.target.value })} />
        <div className="flex items-center gap-2"><label className="text-sm">Active</label><input type="checkbox" checked={!!form.isActive} onChange={e=>setForm({ ...form, isActive: !!e.target.checked })} /></div>
        <div className="md:col-span-3">
          <textarea className="w-full px-3 py-2 border rounded" rows={3} placeholder="Description" value={form.description} onChange={e=>setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="md:col-span-3">
          <input className="w-full px-3 py-2 border rounded" placeholder="Highlights (comma-separated)" value={form.highlights} onChange={e=>setForm({ ...form, highlights: e.target.value })} />
        </div>
        <div className="md:col-span-3"><button disabled={saving} className="px-4 py-2 bg-[#a06b42] hover:bg-[#8f5a32] text-white rounded disabled:opacity-50">{saving ? 'Saving...' : 'Add Attraction'}</button></div>
      </form>

      {/* List */}
      {loading ? <div>Loading...</div> : (
        viewMode==='cards' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {items.map(item => (
              <div key={item._id} className="bg-white rounded-lg shadow p-4">
                <div className="flex gap-4">
                  <div className="w-32 h-24 bg-gray-100 rounded overflow-hidden">
                    {item.images?.[0] ? <img src={`${API_URL}${item.images[0]}`} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-400">No image</div>}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">{item.name}</h3>
                      <button onClick={()=>updateItem(item._id, { isActive: !item.isActive })} className={`px-2 py-1 rounded text-sm ${item.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'}`}>{item.isActive ? 'Active' : 'Inactive'}</button>
                    </div>
                    <p className="text-sm text-gray-600">{item.city || item.location}</p>
                    {item.price != null && (<p className="text-sm font-medium mt-1">{item.price} {item.currency || 'RWF'}</p>)}
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <label className="text-sm">Upload Images:</label>
                  <input type="file" multiple disabled={uploadingId===item._id} onChange={e=>uploadImages(item._id, e.target.files)} />
                  <button onClick={()=>deleteItem(item._id)} className="ml-auto px-3 py-1 bg-red-600 text-white rounded text-sm">Delete</button>
                </div>
                {item.images?.length>0 && (
                  <div className="mt-3 grid grid-cols-4 gap-2">
                    {item.images.map((img, i)=>(
                      <img key={i} src={`${API_URL}${img}`} className="w-full h-20 object-cover rounded" />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="p-3">Name</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">City</th>
                  <th className="p-3">Price</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item._id} className="border-t">
                    <td className="p-3 font-medium">{item.name}</td>
                    <td className="p-3">{item.category}</td>
                    <td className="p-3">{item.city || item.location}</td>
                    <td className="p-3">{item.price} {item.currency || 'RWF'}</td>
                    <td className="p-3"><button onClick={()=>updateItem(item._id, { isActive: !item.isActive })} className={`px-2 py-1 rounded text-xs ${item.isActive ? 'bg-green-100 text-green-700':'bg-gray-200 text-gray-700'}`}>{item.isActive ? 'Active':'Inactive'}</button></td>
                    <td className="p-3"><button onClick={()=>deleteItem(item._id)} className="px-3 py-1 bg-red-600 text-white rounded text-xs">Delete</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}
