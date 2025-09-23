import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const UploadProperty = () => {
  const { user } = useAuth();
  const [form, setForm] = useState({
    title: '',
    description: '',
    address: '',
    city: '',
    pricePerNight: ''
  });
  const [files, setFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const onChange = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!user) return toast.error('Please login');
    if (!form.title || !form.address || !form.city || !form.pricePerNight) {
      return toast.error('Please fill all required fields');
    }
    const body = new FormData();
    Object.entries(form).forEach(([k, v]) => body.append(k, v));
    Array.from(files).forEach(f => body.append('images', f));
    try {
      setSubmitting(true);
      const res = await fetch(`${API_URL}/api/properties`, {
        method: 'POST',
        body,
        credentials: 'include'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create property');
      toast.success('Property created');
      setForm({ title: '', description: '', address: '', city: '', pricePerNight: '' });
      setFiles([]);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Upload Apartment</h1>
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Images</label>
            <input type="file" accept="image/*" multiple onChange={e => setFiles(e.target.files)} />
            {files && files.length > 0 && (
              <p className="text-sm text-gray-500 mt-1">{files.length} file(s) selected</p>
            )}
          </div>
          <button disabled={submitting} type="submit" className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-6 py-3 rounded-xl font-semibold">
            {submitting ? 'Uploading...' : 'Create Listing'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default UploadProperty;
