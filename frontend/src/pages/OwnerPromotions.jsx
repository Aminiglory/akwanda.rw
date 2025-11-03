import React, { useEffect, useMemo, useState } from 'react';
import { FaBullhorn, FaPlus, FaClock, FaToggleOn, FaToggleOff, FaTrash, FaEdit, FaFire, FaTag, FaCopy, FaChartLine, FaEye, FaEyeSlash } from 'react-icons/fa';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function OwnerPromotions() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [properties, setProperties] = useState([]);
  const [propertyId, setPropertyId] = useState(searchParams.get('propertyId') || '');
  const [promos, setPromos] = useState([]);
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showDealForm, setShowDealForm] = useState(false);
  const [activeTab, setActiveTab] = useState('promotions'); // 'promotions' or 'deals'
  const [form, setForm] = useState({ _id: '', type: '', title: '', description: '', discountPercent: '', startDate: '', endDate: '', lastMinuteWithinDays: '', minAdvanceDays: '', couponCode: '', active: true });
  const [dealForm, setDealForm] = useState(getEmptyDealForm());
  const [editingDeal, setEditingDeal] = useState(null);

  function getEmptyDealForm() {
    return {
      property: propertyId,
      dealType: 'early_bird',
      title: '',
      description: '',
      tagline: '',
      discountType: 'percentage',
      discountValue: 10,
      maxDiscountAmount: null,
      validFrom: new Date().toISOString().split('T')[0],
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      conditions: {
        minAdvanceBookingDays: null,
        maxAdvanceBookingDays: null,
        minNights: null,
        mobileOnly: false,
        prepaymentRequired: false,
        nonRefundable: false
      },
      badge: 'hot_deal',
      badgeColor: '#FF6B6B',
      priority: 0,
      isActive: true,
      isPublished: false
    };
  }

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
    if (!propertyId) { setPromos([]); setDeals([]); return; }
    (async () => {
      try {
        setLoading(true);
        // Load old promotions
        const res = await fetch(`${API_URL}/api/properties/${propertyId}/promotions`, { credentials: 'include' });
        const ct = res.headers.get('content-type') || '';
        if (!ct.includes('application/json')) throw new Error('Server returned non-JSON. Check login and API URL.');
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to load promotions');
        setPromos(data.promotions || []);

        // Load new deals
        const dealsRes = await fetch(`${API_URL}/api/deals/my-deals`, { credentials: 'include' });
        const dealsCt = dealsRes.headers.get('content-type') || '';
        if (dealsCt.includes('application/json')) {
          const dealsData = await dealsRes.json();
          if (dealsRes.ok) {
            const propertyDeals = (dealsData.deals || []).filter(d => String(d.property._id || d.property) === String(propertyId));
            setDeals(propertyDeals);
          }
        }
      } catch (e) {
        toast.error(e.message);
        setPromos([]);
        setDeals([]);
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

  // Deal management functions
  const openNewDeal = () => {
    setEditingDeal(null);
    setDealForm({ ...getEmptyDealForm(), property: propertyId });
    setShowDealForm(true);
  };

  const openEditDeal = (deal) => {
    setEditingDeal(deal);
    setDealForm({
      ...deal,
      validFrom: deal.validFrom?.split('T')[0] || '',
      validUntil: deal.validUntil?.split('T')[0] || '',
      conditions: deal.conditions || {}
    });
    setShowDealForm(true);
  };

  const saveDeal = async (e) => {
    e?.preventDefault?.();
    if (!propertyId) return toast.error('Select a property');
    if (!dealForm.title) return toast.error('Enter deal title');
    
    try {
      const url = editingDeal 
        ? `${API_URL}/api/deals/${editingDeal._id}`
        : `${API_URL}/api/deals`;
      
      const method = editingDeal ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...dealForm, property: propertyId })
      });
      
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.message || 'Failed to save deal');
      
      toast.success(editingDeal ? 'Deal updated!' : 'Deal created!');
      setShowDealForm(false);
      
      // Refresh deals
      const dealsRes = await fetch(`${API_URL}/api/deals/my-deals`, { credentials: 'include' });
      const dealsData = await dealsRes.json();
      if (dealsRes.ok) {
        const propertyDeals = (dealsData.deals || []).filter(d => String(d.property._id || d.property) === String(propertyId));
        setDeals(propertyDeals);
      }
    } catch (e) {
      toast.error(e.message);
    }
  };

  const deleteDeal = async (dealId) => {
    if (!window.confirm('Delete this deal?')) return;
    
    try {
      const res = await fetch(`${API_URL}/api/deals/${dealId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (!res.ok) throw new Error('Failed to delete deal');
      
      toast.success('Deal deleted');
      setDeals(deals.filter(d => String(d._id) !== String(dealId)));
    } catch (e) {
      toast.error(e.message);
    }
  };

  const toggleDealActive = async (dealId) => {
    try {
      const res = await fetch(`${API_URL}/api/deals/${dealId}/toggle-active`, {
        method: 'PATCH',
        credentials: 'include'
      });
      
      if (!res.ok) throw new Error('Failed to toggle deal');
      
      toast.success('Deal status updated');
      
      // Refresh deals
      const dealsRes = await fetch(`${API_URL}/api/deals/my-deals`, { credentials: 'include' });
      const dealsData = await dealsRes.json();
      if (dealsRes.ok) {
        const propertyDeals = (dealsData.deals || []).filter(d => String(d.property._id || d.property) === String(propertyId));
        setDeals(propertyDeals);
      }
    } catch (e) {
      toast.error(e.message);
    }
  };

  const toggleDealPublished = async (dealId) => {
    try {
      const res = await fetch(`${API_URL}/api/deals/${dealId}/toggle-published`, {
        method: 'PATCH',
        credentials: 'include'
      });
      
      if (!res.ok) throw new Error('Failed to toggle deal');
      
      toast.success('Deal published status updated');
      
      // Refresh deals
      const dealsRes = await fetch(`${API_URL}/api/deals/my-deals`, { credentials: 'include' });
      const dealsData = await dealsRes.json();
      if (dealsRes.ok) {
        const propertyDeals = (dealsData.deals || []).filter(d => String(d.property._id || d.property) === String(propertyId));
        setDeals(propertyDeals);
      }
    } catch (e) {
      toast.error(e.message);
    }
  };

  const duplicateDeal = async (dealId) => {
    try {
      const res = await fetch(`${API_URL}/api/deals/${dealId}/duplicate`, {
        method: 'POST',
        credentials: 'include'
      });
      
      if (!res.ok) throw new Error('Failed to duplicate deal');
      
      toast.success('Deal duplicated');
      
      // Refresh deals
      const dealsRes = await fetch(`${API_URL}/api/deals/my-deals`, { credentials: 'include' });
      const dealsData = await dealsRes.json();
      if (dealsRes.ok) {
        const propertyDeals = (dealsData.deals || []).filter(d => String(d.property._id || d.property) === String(propertyId));
        setDeals(propertyDeals);
      }
    } catch (e) {
      toast.error(e.message);
    }
  };

  const dealTypes = [
    { value: 'early_bird', label: 'Early Bird', desc: 'Book in advance' },
    { value: 'last_minute', label: 'Last Minute', desc: 'Book close to check-in' },
    { value: 'mobile_only', label: 'Mobile Only', desc: 'App exclusive' },
    { value: 'free_cancellation', label: 'Free Cancellation', desc: 'Flexible policy' },
    { value: 'long_stay', label: 'Long Stay', desc: '7+ nights' },
    { value: 'weekend_special', label: 'Weekend', desc: 'Fri-Sun' },
    { value: 'weekday_special', label: 'Weekday', desc: 'Mon-Thu' },
    { value: 'seasonal', label: 'Seasonal', desc: 'Holiday promo' },
    { value: 'flash_sale', label: 'Flash Sale', desc: 'Limited time' }
  ];

  const badges = [
    { value: 'hot_deal', label: 'Hot Deal', color: '#FF6B6B' },
    { value: 'limited_time', label: 'Limited Time', color: '#FF8C42' },
    { value: 'best_value', label: 'Best Value', color: '#4ECDC4' },
    { value: 'popular', label: 'Popular', color: '#95E1D3' },
    { value: 'new', label: 'New', color: '#F38181' },
    { value: 'exclusive', label: 'Exclusive', color: '#AA96DA' }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FaBullhorn className="text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Promotions & Deals</h1>
          </div>
          <button 
            onClick={activeTab === 'promotions' ? openNewForm : openNewDeal} 
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            <FaPlus />
            <span>Create {activeTab === 'promotions' ? 'Promotion' : 'Deal'}</span>
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

          {/* Tabs */}
          <div className="flex border-b mb-6">
            <button
              onClick={() => setActiveTab('promotions')}
              className={`px-6 py-3 font-semibold transition-colors ${
                activeTab === 'promotions'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <FaBullhorn className="inline mr-2" />
              Legacy Promotions ({promos.length})
            </button>
            <button
              onClick={() => setActiveTab('deals')}
              className={`px-6 py-3 font-semibold transition-colors ${
                activeTab === 'deals'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <FaFire className="inline mr-2" />
              Deals ({deals.length})
            </button>
          </div>

          {activeTab === 'promotions' && (
            <>
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
            </>
          )}

          {/* Deals Tab */}
          {activeTab === 'deals' && (
            <>
              <div className="text-gray-600 mb-4">Create modern deals with advanced conditions, analytics tracking, and Booking.com-style features.</div>

              {loading ? (
                <div className="py-10 text-center text-gray-500">Loading…</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {deals.map(deal => (
                    <div key={deal._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow">
                      <div className="flex justify-between items-start mb-3">
                        <span
                          className="text-xs px-2 py-1 rounded-full text-white font-semibold"
                          style={{ backgroundColor: deal.badgeColor }}
                        >
                          {deal.title}
                        </span>
                        <div className="flex space-x-1">
                          <button
                            onClick={() => toggleDealActive(deal._id)}
                            className={`p-1.5 rounded text-xs ${deal.isActive ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-50'}`}
                            title={deal.isActive ? 'Active' : 'Inactive'}
                          >
                            {deal.isActive ? <FaEye /> : <FaEyeSlash />}
                          </button>
                        </div>
                      </div>

                      <div className="text-2xl font-bold text-blue-600 mb-2">
                        {deal.discountType === 'percentage' ? `${deal.discountValue}%` : `$${deal.discountValue}`} OFF
                      </div>

                      <div className="text-sm text-gray-600 mb-2">{deal.tagline || deal.description}</div>

                      <div className="text-xs text-gray-500 mb-3">
                        <div>Valid: {new Date(deal.validFrom).toLocaleDateString()} - {new Date(deal.validUntil).toLocaleDateString()}</div>
                        <div className="mt-1">Type: {dealTypes.find(dt => dt.value === deal.dealType)?.label || deal.dealType}</div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center text-xs mb-3 py-2 bg-gray-50 rounded">
                        <div>
                          <div className="font-semibold text-gray-900">{deal.views || 0}</div>
                          <div className="text-gray-600">Views</div>
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">{deal.clicks || 0}</div>
                          <div className="text-gray-600">Clicks</div>
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">{deal.bookings || 0}</div>
                          <div className="text-gray-600">Bookings</div>
                        </div>
                      </div>

                      <div className="flex space-x-2 text-xs">
                        <button
                          onClick={() => openEditDeal(deal)}
                          className="flex-1 flex items-center justify-center space-x-1 bg-blue-600 text-white px-2 py-1.5 rounded hover:bg-blue-700"
                        >
                          <FaEdit />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => duplicateDeal(deal._id)}
                          className="flex items-center justify-center bg-gray-200 text-gray-700 px-2 py-1.5 rounded hover:bg-gray-300"
                          title="Duplicate"
                        >
                          <FaCopy />
                        </button>
                        <button
                          onClick={() => toggleDealPublished(deal._id)}
                          className={`px-2 py-1.5 rounded ${deal.isPublished ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}
                          title={deal.isPublished ? 'Published' : 'Draft'}
                        >
                          {deal.isPublished ? 'Live' : 'Draft'}
                        </button>
                        <button
                          onClick={() => deleteDeal(deal._id)}
                          className="flex items-center justify-center bg-red-100 text-red-600 px-2 py-1.5 rounded hover:bg-red-200"
                          title="Delete"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </div>
                  ))}
                  {deals.length === 0 && (
                    <div className="col-span-full p-6 text-sm text-gray-500 border rounded">
                      No deals yet. Click "Create Deal" to get started.
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Promotion Form Modal */}
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

      {/* Deal Form Modal */}
      {showDealForm && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-2xl my-8">
            <h2 className="text-lg font-semibold mb-4">{editingDeal ? 'Edit Deal' : 'Create New Deal'}</h2>
            <form onSubmit={saveDeal} className="space-y-4">
              {/* Deal Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Deal Type</label>
                <select
                  value={dealForm.dealType}
                  onChange={(e) => setDealForm({ ...dealForm, dealType: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                >
                  {dealTypes.map(dt => (
                    <option key={dt.value} value={dt.value}>{dt.label} - {dt.desc}</option>
                  ))}
                </select>
              </div>

              {/* Title & Tagline */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                  <input
                    type="text"
                    required
                    value={dealForm.title}
                    onChange={(e) => setDealForm({ ...dealForm, title: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="e.g., Early Bird - Save 25%"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tagline</label>
                  <input
                    type="text"
                    value={dealForm.tagline}
                    onChange={(e) => setDealForm({ ...dealForm, tagline: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="e.g., Book 30 days ahead!"
                  />
                </div>
              </div>

              {/* Discount */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Discount Type</label>
                  <select
                    value={dealForm.discountType}
                    onChange={(e) => setDealForm({ ...dealForm, discountType: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="percentage">Percentage</option>
                    <option value="fixed_amount">Fixed Amount</option>
                    <option value="free_night">Free Night(s)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Value *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={dealForm.discountValue}
                    onChange={(e) => setDealForm({ ...dealForm, discountValue: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Badge</label>
                  <select
                    value={dealForm.badge}
                    onChange={(e) => {
                      const badge = badges.find(b => b.value === e.target.value);
                      setDealForm({ ...dealForm, badge: e.target.value, badgeColor: badge?.color || '#FF6B6B' });
                    }}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    {badges.map(b => (
                      <option key={b.value} value={b.value}>{b.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Validity Dates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valid From *</label>
                  <input
                    type="date"
                    required
                    value={dealForm.validFrom}
                    onChange={(e) => setDealForm({ ...dealForm, validFrom: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valid Until *</label>
                  <input
                    type="date"
                    required
                    value={dealForm.validUntil}
                    onChange={(e) => setDealForm({ ...dealForm, validUntil: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>

              {/* Conditions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {dealForm.dealType === 'early_bird' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Min. Advance Days</label>
                    <input
                      type="number"
                      min="0"
                      value={dealForm.conditions.minAdvanceBookingDays || ''}
                      onChange={(e) => setDealForm({
                        ...dealForm,
                        conditions: { ...dealForm.conditions, minAdvanceBookingDays: e.target.value ? parseInt(e.target.value) : null }
                      })}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="e.g., 30"
                    />
                  </div>
                )}
                {dealForm.dealType === 'last_minute' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max. Advance Days</label>
                    <input
                      type="number"
                      min="0"
                      value={dealForm.conditions.maxAdvanceBookingDays || ''}
                      onChange={(e) => setDealForm({
                        ...dealForm,
                        conditions: { ...dealForm.conditions, maxAdvanceBookingDays: e.target.value ? parseInt(e.target.value) : null }
                      })}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="e.g., 7"
                    />
                  </div>
                )}
                {dealForm.dealType === 'long_stay' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Min. Nights</label>
                    <input
                      type="number"
                      min="1"
                      value={dealForm.conditions.minNights || ''}
                      onChange={(e) => setDealForm({
                        ...dealForm,
                        conditions: { ...dealForm.conditions, minNights: e.target.value ? parseInt(e.target.value) : null }
                      })}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="e.g., 7"
                    />
                  </div>
                )}
              </div>

              {/* Status Toggles */}
              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={dealForm.isActive}
                    onChange={(e) => setDealForm({ ...dealForm, isActive: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700">Active</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={dealForm.isPublished}
                    onChange={(e) => setDealForm({ ...dealForm, isPublished: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700">Published</span>
                </label>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t">
                <button type="button" onClick={() => setShowDealForm(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
                  {editingDeal ? 'Update Deal' : 'Create Deal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
