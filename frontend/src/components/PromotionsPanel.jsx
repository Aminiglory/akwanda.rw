import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const PromotionsPanel = ({ propertyOptions = [], onChanged }) => {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({
    propertyId: '',
    name: '',
    type: 'early_bird', // early_bird | last_minute | long_stay
    discountPercent: 10,
    startDate: '',
    endDate: ''
  });

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/promotions`, { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to load promotions');
      setItems(data.promotions || []);
    } catch (e) { toast.error(e.message); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const createPromo = async (e) => {
    e.preventDefault();
    if (!form.propertyId || !form.name || !form.startDate || !form.endDate) { toast.error('Fill all required'); return; }
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/promotions`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          property: form.propertyId,
          name: form.name,
          type: form.type,
          discountPercent: Number(form.discountPercent),
          startDate: new Date(form.startDate).toISOString(),
          endDate: new Date(form.endDate).toISOString()
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create promotion');
      toast.success('Promotion created');
      setForm({ propertyId: '', name: '', type: 'early_bird', discountPercent: 10, startDate: '', endDate: '' });
      load();
      onChanged && onChanged();
    } catch (e) { toast.error(e.message); } finally { setLoading(false); }
  };

  const removePromo = async (id) => {
    try {
      const res = await fetch(`${API_URL}/api/promotions/${id}`, { method: 'DELETE', credentials: 'include' });
      const data = await res.json().catch(()=>({}));
      if (!res.ok) throw new Error(data.message || 'Failed to delete promotion');
      toast.success('Promotion deleted');
      load();
      onChanged && onChanged();
    } catch (e) { toast.error(e.message); }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Promotions</h2>
        {loading && <div className="text-sm text-gray-500">Loading...</div>}
      </div>

      <form onSubmit={createPromo} className="grid grid-cols-1 md:grid-cols-6 gap-3 mb-6">
        <select className="border rounded-lg px-3 py-2" value={form.propertyId} onChange={e=>setForm(prev=>({...prev, propertyId:e.target.value}))}>
          <option value="">Select Property</option>
          {propertyOptions.map(p => <option key={p._id} value={p._id}>{p.title}</option>)}
        </select>
        <input className="border rounded-lg px-3 py-2 md:col-span-2" placeholder="Promotion name" value={form.name} onChange={e=>setForm(prev=>({...prev, name:e.target.value}))} />
        <select className="border rounded-lg px-3 py-2" value={form.type} onChange={e=>setForm(prev=>({...prev, type:e.target.value}))}>
          <option value="early_bird">Early-bird</option>
          <option value="last_minute">Last-minute</option>
          <option value="long_stay">Long-stay</option>
        </select>
        <input type="number" min="0" max="100" className="border rounded-lg px-3 py-2" value={form.discountPercent} onChange={e=>setForm(prev=>({...prev, discountPercent:e.target.value}))} />
        <div className="grid grid-cols-2 gap-2 md:col-span-2">
          <input type="date" className="border rounded-lg px-3 py-2" value={form.startDate} onChange={e=>setForm(prev=>({...prev, startDate:e.target.value}))} />
          <input type="date" className="border rounded-lg px-3 py-2" value={form.endDate} onChange={e=>setForm(prev=>({...prev, endDate:e.target.value}))} />
        </div>
        <button disabled={loading} className="bg-blue-600 text-white rounded-lg px-4 py-2 md:col-span-1">Create</button>
      </form>

      {items.length === 0 ? (
        <div className="text-sm text-gray-600">No promotions found.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Property</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Discount</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map(it => (
                <tr key={it._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">{it.property?.title || '-'}</td>
                  <td className="px-4 py-3">{it.name}</td>
                  <td className="px-4 py-3">{it.type}</td>
                  <td className="px-4 py-3">{(it.discountPercent || 0)}%</td>
                  <td className="px-4 py-3">{it.startDate ? new Date(it.startDate).toLocaleDateString() : ''} - {it.endDate ? new Date(it.endDate).toLocaleDateString() : ''}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => removePromo(it._id)} className="px-3 py-1 border rounded">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default PromotionsPanel;
