import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLocale } from '../contexts/LocaleContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const UploadProperty = () => {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const editId = params.get('edit');
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t, formatCurrencyRWF } = useLocale() || {};
  const [form, setForm] = useState({
    title: '',
    description: '',
    address: '',
    city: '',
    pricePerNight: '',
    discountPercent: '',
    commissionChoice: 'standard' // 'standard' = 8%, 'mid' = 10%, 'higher' = 12%
  });
  const [details, setDetails] = useState({ bedrooms: '1', bathrooms: '1', size: '', amenities: '' });
  useEffect(() => {
    if (editId) {
      (async () => {
        try {
          const res = await fetch(`${API_URL}/api/properties/${editId}`);
          const data = await res.json();
          if (!res.ok) throw new Error(data.message || 'Failed to load property');
          const p = data.property;
          setForm({
            title: p.title || '',
            description: p.description || '',
            address: p.address || '',
            city: p.city || '',
            pricePerNight: p.pricePerNight || '',
            discountPercent: p.discountPercent || '',
            commissionChoice: (() => {
              const r = Number(p.commissionRate || 0);
              if (r >= 12) return 'higher';
              if (r >= 10) return 'mid';
              return 'standard';
            })()
          });
          setDetails({
            bedrooms: p.bedrooms?.toString() || '1',
            bathrooms: p.bathrooms?.toString() || '1',
            size: p.size || '',
            amenities: Array.isArray(p.amenities) ? p.amenities.join(', ') : (p.amenities || '')
          });
        } catch (e) {
          toast.error(e.message);
        }
      })();
    }
  }, [editId]);
  const [files, setFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const onChange = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      toast.error(t ? t('msg.mustLoginToList') : 'Please login to list a property');
      navigate('/owner-login');
      return;
    }
    if (user.userType !== 'host' && user.userType !== 'admin') {
      toast.error(t ? t('msg.ownerOnly') : 'Only property owners can list properties. Please use Owner Login.');
      navigate('/owner-login');
      return;
    }
    if (!form.title || !form.address || !form.city || !form.pricePerNight) {
      return toast.error(t ? t('msg.fillRequiredFields') : 'Please fill all required fields');
    }
    const body = new FormData();
    Object.entries(form).forEach(([k, v]) => v !== '' && body.append(k, v));
    // derive numeric commission rate (8, 10, 12)
    const commissionRate = form.commissionChoice === 'higher' ? 12 : (form.commissionChoice === 'mid' ? 10 : 8);
    body.set('commissionRate', String(commissionRate));
    // extra details
    body.append('bedrooms', Number(details.bedrooms || 0));
    body.append('bathrooms', Number(details.bathrooms || 0));
    if (details.size) body.append('size', details.size);
    if (details.amenities) {
      details.amenities.split(',').map(a => a.trim()).filter(Boolean).forEach(a => body.append('amenities', a));
    }
    Array.from(files).forEach(f => body.append('images', f));
    
    // Log form data for debugging
    console.log('Submitting property with data:', {
      title: form.title,
      address: form.address,
      city: form.city,
      pricePerNight: form.pricePerNight,
      commissionRate,
      bedrooms: details.bedrooms,
      bathrooms: details.bathrooms,
      filesCount: files.length
    });
    
    try {
      setSubmitting(true);
  let res, data;
      if (editId) {
        res = await fetch(`${API_URL}/api/properties/${editId}`, {
          method: 'PUT',
          body,
          credentials: 'include'
        });
        data = await res.json();
        if (!res.ok) throw new Error(data.message || (t ? t('msg.saveFailed') : 'Failed to update property'));
        toast.success(t ? t('msg.propertyUpdated') : 'Property updated');
      } else {
        res = await fetch(`${API_URL}/api/properties`, {
          method: 'POST',
          body,
          credentials: 'include'
        });
        data = await res.json();
        console.log('Backend response:', data);
        if (!res.ok) {
          // Show detailed error from backend
          const errorMsg = data.details 
            ? `${data.message}: ${data.details.map(d => `${d.field} - ${d.message}`).join(', ')}`
            : data.message || 'Failed to create property';
          throw new Error(errorMsg);
        }
        toast.success(t ? t('msg.propertyCreated') : 'Property created');
      }
      setForm({ title: '', description: '', address: '', city: '', pricePerNight: '', discountPercent: '', commissionChoice: 'standard' });
      setDetails({ bedrooms: '1', bathrooms: '1', size: '', amenities: '' });
      setFiles([]);
      // Best-effort: notify owner about commission selection (do not block UX)
      try {
        const note = {
          type: 'commission_choice',
          title: 'Commission rate set',
          message: `You chose a ${commissionRate}% commission rate for ${data?.property?.title || 'your property'}.`,
          property: data?.property?._id
        };
        await fetch(`${API_URL}/api/notifications`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(note) }).catch(() => {});
      } catch (_) {}
      if (data.property?._id) navigate(`/apartment/${data.property._id}`);
    } catch (e) {
      console.error('Property creation error:', e);
      // Show detailed error message
      const errorMessage = e.message || 'Failed to create property';
      toast.error(errorMessage || (t ? t('msg.saveFailed') : 'Failed to save'), { duration: 5000 });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">{t ? t('listing.uploadTitle') : 'Upload Apartment'}</h1>
        
        {!user && (
          <div className="mb-4 rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-yellow-800">
            <p className="font-semibold">⚠️ {t ? t('msg.mustLoginToList') : 'Please login to list a property'}</p>
            <p className="text-sm mt-1">{t ? t('msg.ownerOnly') : 'Only property owners can list properties. Please use Owner Login.'}</p>
          </div>
        )}
        
        {user && user.userType !== 'host' && user.userType !== 'admin' && (
          <div className="mb-4 rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-yellow-800">
            <p className="font-semibold">⚠️ {t ? t('msg.ownerOnly') : 'Only property owners can list properties. Please use Owner Login.'}</p>
          </div>
        )}
        
        {user?.isBlocked && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            {t ? t('msg.accountDeactivatedNotice') : 'Your account is currently deactivated. You cannot create or edit listings until reactivated.'}
          </div>
        )}
        <form onSubmit={onSubmit} className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input value={form.title} onChange={e => onChange('title', e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-3" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea value={form.description} onChange={e => onChange('description', e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-3" rows={4} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <input value={form.address} onChange={e => onChange('address', e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-3" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input value={form.city} onChange={e => onChange('city', e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-3" required />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Price per night (RWF)</label>
            <input type="number" value={form.pricePerNight} onChange={e => onChange('pricePerNight', e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-3" required />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Commission</label>
              <select
                value={form.commissionChoice}
                onChange={(e)=> onChange('commissionChoice', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3"
              >
                <option value="standard">Standard — 8%</option>
                <option value="mid">Mid — 10%</option>
                <option value="higher">Higher — 12%</option>
              </select>
            </div>
            <div className="flex items-end">
              <div className="w-full text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
                {(() => {
                  const pct = form.commissionChoice === 'higher' ? 12 : (form.commissionChoice === 'mid' ? 10 : 8);
                  const price = Number(form.pricePerNight || 0);
                  const est = Math.round((price * pct) / 100);
                  const estFmt = formatCurrencyRWF ? formatCurrencyRWF(est) : `RWF ${isNaN(est) ? 0 : est.toLocaleString()}`;
                  return <span>Estimated commission per night: <span className="font-semibold text-blue-700">{estFmt}</span> ({pct}%)</span>;
                })()}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bedrooms</label>
              <input type="number" min="0" value={details.bedrooms} onChange={e => setDetails(prev => ({ ...prev, bedrooms: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-4 py-3" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bathrooms</label>
              <input type="number" min="0" value={details.bathrooms} onChange={e => setDetails(prev => ({ ...prev, bathrooms: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-4 py-3" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Size (e.g., 120 sqm)</label>
              <input value={details.size} onChange={e => setDetails(prev => ({ ...prev, size: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-4 py-3" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amenities (comma-separated)</label>
            <input value={details.amenities} onChange={e => setDetails(prev => ({ ...prev, amenities: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-4 py-3" placeholder="WiFi, Parking, Kitchen" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Discount (%)</label>
            <input type="number" min="0" max="100" value={form.discountPercent} onChange={e => onChange('discountPercent', e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-3" placeholder="Optional" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Images</label>
            <input type="file" accept="image/*" multiple onChange={e => setFiles(e.target.files)} />
            {files && files.length > 0 && (
              <p className="text-sm text-gray-500 mt-1">{files.length} file(s) selected</p>
            )}
          </div>
          <button disabled={submitting || user?.isBlocked} type="submit" className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-6 py-3 rounded-xl font-semibold">
            {submitting ? 'Uploading...' : 'Create Listing'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default UploadProperty;
