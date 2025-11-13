import React, { useEffect, useState } from 'react';
import { AdminRoute } from '../components/ProtectedRoute';
import { FaPlus, FaTrash, FaEdit, FaSave, FaTimes } from 'react-icons/fa';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function AdminAmenities() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', slug: '', scope: 'property', type: 'amenity', icon: '', active: true, order: 0 });
  const [editingId, setEditingId] = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/amenities` , { credentials: 'include' });
      const data = await res.json();
      if (res.ok) setItems(Array.isArray(data.amenities) ? data.amenities : []);
      else toast.error(data.message || 'Failed to load amenities');
    } catch (e) {
      toast.error(e.message || 'Failed to load amenities');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    try {
      const method = editingId ? 'PUT' : 'POST';
      const url = editingId ? `${API_URL}/api/amenities/${editingId}` : `${API_URL}/api/amenities`;
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Save failed');
      toast.success(editingId ? 'Updated' : 'Created');
      setForm({ name: '', slug: '', scope: 'property', type: 'amenity', icon: '', active: true, order: 0 });
      setEditingId(null);
      load();
    } catch (e) { toast.error(e.message); }
  };

  const startEdit = (it) => {
    setEditingId(it._id);
    setForm({ name: it.name, slug: it.slug, scope: it.scope, type: it.type, icon: it.icon || '', active: !!it.active, order: it.order || 0 });
  };

  const remove = async (id) => {
    if (!confirm('Delete this item?')) return;
    try {
      const res = await fetch(`${API_URL}/api/amenities/${id}`, { method: 'DELETE', credentials: 'include' });
      const data = await res.json().catch(()=>({}));
      if (!res.ok) throw new Error(data.message || 'Delete failed');
      toast.success('Deleted');
      load();
    } catch (e) { toast.error(e.message); }
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Admin: Amenities & Services</h1>

      <form onSubmit={submit} className="bg-white rounded-xl shadow p-4 mb-6 grid grid-cols-1 md:grid-cols-6 gap-3">
        <input className="border rounded px-3 py-2 md:col-span-2" placeholder="Name" value={form.name} onChange={e=>setForm(s=>({...s, name: e.target.value}))} required />
        <input className="border rounded px-3 py-2 md:col-span-2" placeholder="Slug (unique)" value={form.slug} onChange={e=>setForm(s=>({...s, slug: e.target.value}))} required />
        <select className="border rounded px-3 py-2" value={form.scope} onChange={e=>setForm(s=>({...s, scope: e.target.value}))}>
          <option value="property">Property</option>
          <option value="room">Room</option>
        </select>
        <select className="border rounded px-3 py-2" value={form.type} onChange={e=>setForm(s=>({...s, type: e.target.value}))}>
          <option value="amenity">Amenity</option>
          <option value="service">Service</option>
        </select>
        <input className="border rounded px-3 py-2 md:col-span-2" placeholder="Icon (optional)" value={form.icon} onChange={e=>setForm(s=>({...s, icon: e.target.value}))} />
        <input className="border rounded px-3 py-2" type="number" placeholder="Order" value={form.order} onChange={e=>setForm(s=>({...s, order: e.target.value}))} />
        <label className="inline-flex items-center gap-2"><input type="checkbox" checked={form.active} onChange={e=>setForm(s=>({...s, active: e.target.checked}))} /><span>Active</span></label>
        <div className="md:col-span-6 flex gap-2">
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2"><FaSave /> {editingId ? 'Update' : 'Create'}</button>
          {editingId && <button type="button" onClick={()=>{ setEditingId(null); setForm({ name: '', slug: '', scope: 'property', type: 'amenity', icon: '', active: true, order: 0 }); }} className="px-4 py-2 border rounded flex items-center gap-2"><FaTimes /> Cancel</button>}
        </div>
      </form>

      <div className="bg-white rounded-xl shadow">
        <div className="p-3 border-b font-medium">{loading ? 'Loading…' : `Items (${items.length})`}</div>
        <div className="divide-y">
          {items.map(it => (
            <div key={it._id} className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-sm text-gray-500 w-16">{it.scope}</div>
                <div className="font-medium">{it.name}</div>
                <div className="text-xs text-gray-500">{it.slug}</div>
                <div className="text-xs px-2 py-0.5 rounded bg-gray-100">{it.type}</div>
                {!it.active && <div className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-700">inactive</div>}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={()=>startEdit(it)} className="px-3 py-1 border rounded flex items-center gap-2"><FaEdit /> Edit</button>
                <button onClick={()=>remove(it._id)} className="px-3 py-1 border rounded text-red-600 flex items-center gap-2"><FaTrash /> Delete</button>
              </div>
            </div>
          ))}
          {items.length === 0 && !loading && <div className="p-4 text-sm text-gray-500">No items yet.</div>}
        </div>
      </div>
    </div>
  );
}
