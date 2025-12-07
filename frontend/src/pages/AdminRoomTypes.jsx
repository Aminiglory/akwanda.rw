import React, { useEffect, useState } from 'react';
import { FaPlus, FaTrash, FaEdit, FaSave, FaTimes } from 'react-icons/fa';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function AdminRoomTypes() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', key: '', description: '', defaultBathroomType: 'inside', active: true, order: 0 });
  const [editingId, setEditingId] = useState(null);
  const [seeding, setSeeding] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const load = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/room-types`, { credentials: 'include' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Failed to load room types');
      setItems(Array.isArray(data.roomTypes) ? data.roomTypes : []);
    } catch (e) {
      toast.error(e.message || 'Failed to load room types');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedItems = items.slice(startIndex, startIndex + pageSize);

  const submit = async (e) => {
    e.preventDefault();
    try {
      const method = editingId ? 'PUT' : 'POST';
      const url = editingId ? `${API_URL}/api/room-types/${editingId}` : `${API_URL}/api/room-types`;
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Save failed');
      toast.success(editingId ? 'Updated' : 'Created');
      setForm({ name: '', key: '', description: '', defaultBathroomType: 'inside', active: true, order: 0 });
      setEditingId(null);
      load();
    } catch (e) {
      toast.error(e.message || 'Save failed');
    }
  };

  const startEdit = (it) => {
    setEditingId(it._id);
    setForm({
      name: it.name || '',
      key: it.key || '',
      description: it.description || '',
      defaultBathroomType: it.defaultBathroomType || 'inside',
      active: it.active ?? true,
      order: it.order || 0,
    });
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this room type?')) return;
    try {
      const res = await fetch(`${API_URL}/api/room-types/${id}`, { method: 'DELETE', credentials: 'include' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Delete failed');
      toast.success('Deleted');
      load();
    } catch (e) {
      toast.error(e.message || 'Delete failed');
    }
  };

  const seedDefaults = async () => {
    if (seeding) return;
    try {
      setSeeding(true);
      const res = await fetch(`${API_URL}/api/room-types/seed-defaults`, { method: 'POST', credentials: 'include' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Seed failed');
      toast.success(`Seeded ${data.seeded || 0} room types`);
      load();
    } catch (e) {
      toast.error(e.message || 'Seed failed');
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Admin: Room Types</h1>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-gray-600">Manage standard room type labels used in listings and calendars.</p>
        <button
          type="button"
          onClick={seedDefaults}
          disabled={seeding}
          className={`px-3 py-2 border rounded flex items-center gap-2 ${seeding ? 'opacity-60 cursor-not-allowed' : ''}`}
        >
          <FaPlus /> {seeding ? 'Seeding…' : 'Seed defaults'}
        </button>
      </div>

      <form onSubmit={submit} className="bg-white rounded-xl shadow p-4 mb-6 grid grid-cols-1 md:grid-cols-6 gap-3">
        <input className="border rounded px-3 py-2 md:col-span-2" placeholder="Name" value={form.name} onChange={e=>setForm(s=>({...s, name: e.target.value}))} required />
        <input className="border rounded px-3 py-2 md:col-span-2" placeholder="Key (unique)" value={form.key} onChange={e=>setForm(s=>({...s, key: e.target.value}))} required />
        <select className="border rounded px-3 py-2" value={form.defaultBathroomType} onChange={e=>setForm(s=>({...s, defaultBathroomType: e.target.value}))}>
          <option value="inside">Inside (private)</option>
          <option value="shared">Shared</option>
        </select>
        <input className="border rounded px-3 py-2" type="number" placeholder="Order" value={form.order} onChange={e=>setForm(s=>({...s, order: e.target.value}))} />
        <input className="border rounded px-3 py-2 md:col-span-4" placeholder="Description (optional)" value={form.description} onChange={e=>setForm(s=>({...s, description: e.target.value}))} />
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" checked={form.active} onChange={e=>setForm(s=>({...s, active: e.target.checked}))} />
          <span>Active</span>
        </label>
        <div className="md:col-span-6 flex gap-2">
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2">
            <FaSave /> {editingId ? 'Update' : 'Create'}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={() => { setEditingId(null); setForm({ name: '', key: '', description: '', defaultBathroomType: 'inside', active: true, order: 0 }); }}
              className="px-4 py-2 border rounded flex items-center gap-2"
            >
              <FaTimes /> Cancel
            </button>
          )}
        </div>
      </form>

      <div className="bg-white rounded-xl shadow border border-gray-200">
        <div className="p-3 border-b border-gray-200 font-medium">{loading ? 'Loading…' : `Room types (${items.length})`}</div>
        <div>
          {paginatedItems.map(it => (
            <div key={it._id} className="p-3 flex items-center justify-between border-b border-gray-200 last:border-b-0">
              <div className="flex items-center gap-3">
                <div className="font-medium">{it.name}</div>
                <div className="text-xs text-gray-500">{it.key}</div>
                <div className="text-xs px-2 py-0.5 rounded bg-gray-100">{it.defaultBathroomType || 'inside'}</div>
                {!it.active && (
                  <div className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-700">inactive</div>
                )}
                {it.description && (
                  <div className="text-xs text-gray-500 max-w-xs truncate" title={it.description}>{it.description}</div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => startEdit(it)} className="px-3 py-1 border border-gray-200 rounded flex items-center gap-2"><FaEdit /> Edit</button>
                <button onClick={() => remove(it._id)} className="px-3 py-1 border border-gray-200 rounded text-red-600 flex items-center gap-2"><FaTrash /> Delete</button>
              </div>
            </div>
          ))}
          {items.length === 0 && !loading && (
            <div className="p-4 text-sm text-gray-500">No room types yet.</div>
          )}
        </div>
        {items.length > pageSize && (
          <div className="flex items-center justify-between px-4 py-2 text-sm text-gray-700">
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-200 rounded disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-gray-200 rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminRoomTypes;
