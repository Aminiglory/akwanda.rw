import React, { useEffect, useMemo, useState } from 'react';
import { FaBullhorn, FaPlus, FaClock, FaToggleOn, FaToggleOff, FaTrash, FaEdit } from 'react-icons/fa';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function OwnerPromotions() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [properties, setProperties] = useState([]);
  const [propertyId, setPropertyId] = useState(searchParams.get('propertyId') || '');
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ _id: '', type: '', title: '', description: '', discountPercent: '', startDate: '', endDate: '', lastMinuteWithinDays: '', minAdvanceDays: '', couponCode: '', active: true });

  // Load properties for owner
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/properties/my-properties`, { credentials: 'include' });
        const ct = res.headers.get('content-type') || '';
        if (!ct.includes('application/json')) throw new Error('Server returned non-JSON. Check login and API URL.');
        const data = await res.json();
        if (res.ok) {
          setProperties(data.properties || []);
          const first = searchParams.get('propertyId') || (data.properties?.[0]?._id || '');
          if (!propertyId && first) {
            setPropertyId(first);
            const next = new URLSearchParams(searchParams);
            next.set('propertyId', first);
            setSearchParams(next, { replace: true });
          }
        }
      } catch (_) {}
    })();
  }, []);

  // Load promotions when propertyId changes
  useEffect(() => {
    if (!propertyId) { setPromos([]); return; }
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_URL}/api/properties/${propertyId}/promotions`, { credentials: 'include' });
        const ct = res.headers.get('content-type') || '';
        if (!ct.includes('application/json')) throw new Error('Server returned non-JSON. Check login and API URL.');
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to load promotions');
        setPromos(data.promotions || []);
      } catch (e) {
        toast.error(e.message);
        setPromos([]);
      } finally { setLoading(false); }
    })();
  }, [propertyId]);

  const openNewForm = () => {
    setForm({ _id: '', type: '', title: '', description: '', discountPercent: '', startDate: '', endDate: '', lastMinuteWithinDays: '', minAdvanceDays: '', couponCode: '', active: true });
    setShowForm(true);
  };
  const openEditForm = (p) => {
    setForm({
      _id: p._id || '',
      type: p.type || '',
      title: p.title || '',
      description: p.description || '',
      discountPercent: p.discountPercent ?? '',
      startDate: p.startDate ? String(p.startDate).slice(0,10) : '',
      endDate: p.endDate ? String(p.endDate).slice(0,10) : '',
      lastMinuteWithinDays: p.lastMinuteWithinDays ?? '',
      minAdvanceDays: p.minAdvanceDays ?? '',
      couponCode: p.couponCode || '',
      active: p.active !== false
    });
    setShowForm(true);
  };

  const savePromotion = async (e) => {
    e?.preventDefault?.();
    if (!propertyId) return toast.error('Select a property');
    if (!form.type) return toast.error('Select a promotion type');
    if (!form.discountPercent) return toast.error('Enter discount');
    try {
      const payload = { ...form };
      // Coerce numbers
      if (payload.discountPercent !== '') payload.discountPercent = Number(payload.discountPercent);
      if (payload.lastMinuteWithinDays !== '') payload.lastMinuteWithinDays = Number(payload.lastMinuteWithinDays);
      if (payload.minAdvanceDays !== '') payload.minAdvanceDays = Number(payload.minAdvanceDays);
      const res = await fetch(`${API_URL}/api/properties/${propertyId}/promotions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('application/json')) throw new Error('Server returned non-JSON. Check login and API URL.');
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to save promotion');
      toast.success('Promotion saved');
      setPromos(data.promotions || []);
      setShowForm(false);
    } catch (e) { toast.error(e.message); }
  };

  const togglePromotion = async (promoId) => {
    try {
      const res = await fetch(`${API_URL}/api/properties/${propertyId}/promotions/${promoId}/toggle`, { method: 'PATCH', credentials: 'include' });
      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('application/json')) throw new Error('Server returned non-JSON. Check login and API URL.');
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to toggle');
      toast.success('Updated');
      // refresh
      const list = await fetch(`${API_URL}/api/properties/${propertyId}/promotions`, { credentials: 'include' });
      const lct = list.headers.get('content-type') || '';
      if (!lct.includes('application/json')) throw new Error('Server returned non-JSON. Check login and API URL.');
      const d = await list.json();
      setPromos(d.promotions || []);
    } catch (e) { toast.error(e.message); }
  };

  const deletePromotion = async (promoId) => {
    if (!window.confirm('Delete this promotion?')) return;
    try {
      const res = await fetch(`${API_URL}/api/properties/${propertyId}/promotions/${promoId}`, { method: 'DELETE', credentials: 'include' });
      const ct = res.headers.get('content-type') || '';
      const data = ct.includes('application/json') ? await res.json() : {};
      if (!res.ok) throw new Error(data.message || 'Failed to delete');
      toast.success('Deleted');
      setPromos(promos.filter(p => String(p._id) !== String(promoId)));
    } catch (e) { toast.error(e.message); }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FaBullhorn className="text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Promotions</h1>
          </div>
          <button onClick={openNewForm} className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
            <FaPlus />
            <span>Create promotion</span>
          </button>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="text-sm text-gray-700">Property:</div>
            <select className="px-3 py-2 border rounded" value={propertyId} onChange={(e)=>{ setPropertyId(e.target.value); const next=new URLSearchParams(searchParams); next.set('propertyId', e.target.value); setSearchParams(next, { replace: true }); }}>
              <option value="">Select property</option>
              {properties.map(p => (<option key={p._id} value={p._id}>{p.title} • {p.city}</option>))}
            </select>
          </div>

          <div className="text-gray-600 mb-4">Manage rate plans, coupon codes, and time-bound deals to boost occupancy and appeal to Rwanda-based guests.</div>

          {loading ? (
            <div className="py-10 text-center text-gray-500">Loading…</div>
          ) : (
            <div className="space-y-3">
              {promos.map(p => (
                <div key={p._id} className="border rounded-lg p-4 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-gray-900">{p.title || p.type}</div>
                    <div className="text-sm text-gray-600">{p.description || '—'}</div>
                    <div className="text-xs text-gray-500 mt-1">Discount: {p.discountPercent}% • {p.startDate ? `From ${String(p.startDate).slice(0,10)}` : 'No start'} • {p.endDate ? `To ${String(p.endDate).slice(0,10)}` : 'No end'}</div>
                    {p.type === 'last_minute' && <div className="text-xs text-gray-500">Last-minute within {p.lastMinuteWithinDays ?? 0} days</div>}
                    {p.type === 'advance_purchase' && <div className="text-xs text-gray-500">Advance purchase ≥ {p.minAdvanceDays ?? 0} days</div>}
                    {p.type === 'coupon' && <div className="text-xs text-gray-500">Coupon: {p.couponCode || '—'}</div>}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={()=>openEditForm(p)} className="px-3 py-1 border rounded text-sm flex items-center gap-1"><FaEdit /> Edit</button>
                    <button onClick={()=>togglePromotion(p._id)} className={`px-3 py-1 rounded text-sm flex items-center gap-1 ${p.active ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-800'}`}>
                      {p.active ? <FaToggleOn /> : <FaToggleOff />} {p.active ? 'Active' : 'Inactive'}
                    </button>
                    <button onClick={()=>deletePromotion(p._id)} className="px-3 py-1 border rounded text-sm text-red-600 flex items-center gap-1"><FaTrash /> Delete</button>
                  </div>
                </div>
              ))}
              {promos.length === 0 && (
                <div className="p-6 text-sm text-gray-500 border rounded">No promotions yet. Click "Create promotion" to get started.</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-lg">
            <h2 className="text-lg font-semibold mb-4">{form._id ? 'Edit Promotion' : 'Create Promotion'}</h2>
            <form onSubmit={savePromotion} className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-600">Type</label>
                  <select className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" value={form.type} onChange={e=>setForm(f=>({...f, type:e.target.value}))}>
                    <option value="">Select type</option>
                    <option value="last_minute">Last-minute</option>
                    <option value="advance_purchase">Advance purchase</option>
                    <option value="coupon">Coupon</option>
                    <option value="member_rate">Member rate</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-600">Discount %</label>
                  <input type="number" min="1" max="90" className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" value={form.discountPercent} onChange={e=>setForm(f=>({...f, discountPercent:e.target.value}))} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-600">Start</label>
                  <input type="date" className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" value={form.startDate} onChange={e=>setForm(f=>({...f, startDate:e.target.value}))} />
                </div>
                <div>
                  <label className="text-xs text-gray-600">End</label>
                  <input type="date" className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" value={form.endDate} onChange={e=>setForm(f=>({...f, endDate:e.target.value}))} />
                </div>
              </div>
              {form.type === 'last_minute' && (
                <div>
                  <label className="text-xs text-gray-600">Within days</label>
                  <input type="number" min="0" className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" value={form.lastMinuteWithinDays} onChange={e=>setForm(f=>({...f, lastMinuteWithinDays:e.target.value}))} />
                </div>
              )}
              {form.type === 'advance_purchase' && (
                <div>
                  <label className="text-xs text-gray-600">Min advance days</label>
                  <input type="number" min="0" className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" value={form.minAdvanceDays} onChange={e=>setForm(f=>({...f, minAdvanceDays:e.target.value}))} />
                </div>
              )}
              {form.type === 'coupon' && (
                <div>
                  <label className="text-xs text-gray-600">Coupon code</label>
                  <input className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" value={form.couponCode} onChange={e=>setForm(f=>({...f, couponCode:e.target.value}))} />
                </div>
              )}
              <div>
                <label className="text-xs text-gray-600">Title</label>
                <input className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" value={form.title} onChange={e=>setForm(f=>({...f, title:e.target.value}))} />
              </div>
              <div>
                <label className="text-xs text-gray-600">Description</label>
                <textarea className="w-full px-3 py-2 border rounded" rows={3} value={form.description} onChange={e=>setForm(f=>({...f, description:e.target.value}))} />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button type="button" onClick={()=>setShowForm(false)} className="px-4 py-2 border rounded">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
