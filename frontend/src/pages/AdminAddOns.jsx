import React, { useEffect, useState } from 'react';
import { FaPlus, FaSearch, FaToggleOn, FaToggleOff } from 'react-icons/fa';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const defaultForm = {
  key: '',
  name: '',
  description: '',
  defaultPrice: '',
  defaultScope: 'per-booking',
  active: true,
  order: ''
};

const AdminAddOns = () => {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [search, setSearch] = useState('');
  const [includeInactive, setIncludeInactive] = useState(true);

  useEffect(() => {
    fetchPage(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, includeInactive]);

  const fetchPage = async (pageNumber) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('page', String(pageNumber || 1));
      params.set('limit', String(limit));
      if (includeInactive) params.set('includeInactive', 'true');
      const res = await fetch(`${API_URL}/api/add-ons/admin/catalog?${params.toString()}`, {
        credentials: 'include'
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Failed to load add-on catalog');
      setItems(Array.isArray(data.items) ? data.items : []);
      setTotalPages(data.totalPages || 1);
    } catch (e) {
      console.error(e);
      toast.error(e.message || 'Failed to load add-on catalog');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      if (!form.key.trim() || !form.name.trim()) {
        toast.error('Key and name are required');
        return;
      }
      setCreating(true);
      const payload = {
        key: form.key.trim(),
        name: form.name.trim(),
        description: form.description.trim(),
        defaultPrice: Number(form.defaultPrice || 0),
        defaultScope: form.defaultScope || 'per-booking',
        active: !!form.active,
        order: form.order === '' ? 0 : Number(form.order)
      };
      const res = await fetch(`${API_URL}/api/add-ons/catalog`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Failed to create add-on');
      toast.success('Add-on type created');
      setForm(defaultForm);
      // Reload first page to show newly added item in predictable position
      setPage(1);
      fetchPage(1);
    } catch (e) {
      console.error(e);
      toast.error(e.message || 'Failed to create add-on');
    } finally {
      setCreating(false);
    }
  };

  const filteredItems = items.filter((item) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (item.name || '').toLowerCase().includes(q) ||
      (item.key || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Add-on catalog</h1>
            <p className="text-sm text-gray-600 mt-1">
              Manage the master list of add-on services that property owners can enable on their properties.
            </p>
          </div>
        </div>

        {/* Create form */}
        <div className="bg-white rounded-2xl shadow p-4 md:p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FaPlus className="text-blue-600" />
            Create new add-on type
          </h2>
          <form className="grid grid-cols-1 md:grid-cols-3 gap-4" onSubmit={handleCreate}>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Key</label>
              <input
                type="text"
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.key}
                onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))}
                placeholder="e.g. breakfast_continental_standard"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
              <input
                type="text"
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Continental breakfast – standard"
              />
            </div>
            <div className="md:col-span-3">
              <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
              <textarea
                className="w-full border rounded-lg px-3 py-2 text-sm"
                rows={2}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Short description that owners will see"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Default price (RWF)</label>
              <input
                type="number"
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.defaultPrice}
                onChange={(e) => setForm((f) => ({ ...f, defaultPrice: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Default scope</label>
              <select
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.defaultScope}
                onChange={(e) => setForm((f) => ({ ...f, defaultScope: e.target.value }))}
              >
                <option value="per-booking">Per booking</option>
                <option value="per-night">Per night</option>
                <option value="per-guest">Per guest</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Order (sort priority)</label>
              <input
                type="number"
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.order}
                onChange={(e) => setForm((f) => ({ ...f, order: e.target.value }))}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                id="addon-active"
                type="checkbox"
                className="h-4 w-4"
                checked={form.active}
                onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
              />
              <label htmlFor="addon-active" className="text-xs font-medium text-gray-700">Active</label>
            </div>
            <div className="md:col-span-3 flex justify-end">
              <button
                type="submit"
                disabled={creating}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium disabled:opacity-60"
              >
                {creating ? 'Creating…' : 'Create add-on type'}
              </button>
            </div>
          </form>
        </div>

        {/* List with pagination */}
        <div className="bg-white rounded-2xl shadow p-4 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div className="relative max-w-xs w-full">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm"
                placeholder="Search by name or key…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIncludeInactive((v) => !v)}
                className="inline-flex items-center gap-2 text-xs font-medium text-gray-700"
              >
                {includeInactive ? (
                  <>
                    <FaToggleOn className="text-green-500" />
                    Showing active + inactive
                  </>
                ) : (
                  <>
                    <FaToggleOff className="text-gray-400" />
                    Showing active only
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="p-3">Name</th>
                  <th className="p-3">Key</th>
                  <th className="p-3">Default price</th>
                  <th className="p-3">Scope</th>
                  <th className="p-3">Active</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-gray-500 text-sm">Loading…</td>
                  </tr>
                ) : filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-gray-500 text-sm">No add-on types found.</td>
                  </tr>
                ) : (
                  filteredItems.map((item) => (
                    <tr key={item._id || item.key} className="border-t">
                      <td className="p-3 align-top">
                        <div className="font-medium text-gray-900">{item.name}</div>
                        {item.description && (
                          <div className="text-xs text-gray-500 mt-0.5 max-w-md line-clamp-2">
                            {item.description}
                          </div>
                        )}
                      </td>
                      <td className="p-3 align-top text-xs text-gray-600">
                        <code className="bg-gray-100 px-2 py-1 rounded">{item.key}</code>
                      </td>
                      <td className="p-3 align-top">RWF {Number(item.defaultPrice || 0).toLocaleString()}</td>
                      <td className="p-3 align-top text-xs text-gray-700">{item.defaultScope}</td>
                      <td className="p-3 align-top">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${item.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                          {item.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between mt-4 text-xs text-gray-600">
            <div>
              Page {page} of {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 border rounded-lg disabled:opacity-50"
              >
                Prev
              </button>
              <button
                type="button"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => (p < totalPages ? p + 1 : p))}
                className="px-3 py-1 border rounded-lg disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAddOns;
