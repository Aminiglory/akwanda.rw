import React, { useEffect, useMemo, useState } from 'react';
import ReceiptPreview from '../components/ReceiptPreview';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const makeAbsolute = (u) => {
  if (!u) return null;
  let s = String(u).trim().replace(/\\+/g, '/');
  if (/^https?:\/\//i.test(s)) return s;
  if (!s.startsWith('/')) s = `/${s}`;
  return `${API_URL}${s}`;
};

export default function OwnerAttractionsDashboard() {
  const [items, setItems] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [bookingFilters, setBookingFilters] = useState({ status: '', from: '', to: '' });
  const [receiptBooking, setReceiptBooking] = useState(null);
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
      const [res, resB] = await Promise.all([
        fetch(`${API_URL}/api/attractions/mine`, { credentials: 'include' }),
        fetch(`${API_URL}/api/attraction-bookings/for-my-attractions`, { credentials: 'include' })
      ]);
      const [data, dataB] = await Promise.all([res.json(), resB.json()]);
      if (!res.ok) throw new Error(data.message || 'Failed to load');
      if (!resB.ok) throw new Error(dataB.message || 'Failed to load bookings');
      setItems(data.attractions || []);
      setBookings(dataB.bookings || []);
    } catch (e) { toast.error(e.message); } finally { setLoading(false); }
  }

  function exportBookingsCsv() {
    const rows = [['Attraction','Guest','Visit Date','Tickets','Amount','Status']];
    const filtered = bookings.filter(b => {
      if (bookingFilters.status && b.status !== bookingFilters.status) return false;
      if (bookingFilters.from) {
        const from = new Date(bookingFilters.from);
        if (new Date(b.visitDate) < from) return false;
      }
      if (bookingFilters.to) {
        const to = new Date(bookingFilters.to);
        if (new Date(b.visitDate) > to) return false;
      }
      return true;
    });
    filtered.forEach(b => rows.push([
      (b.attraction?.name || '').replace(/,/g,' '),
      `${b.guest?.firstName || ''} ${b.guest?.lastName || ''}`.trim().replace(/,/g,' '),
      new Date(b.visitDate).toLocaleDateString(),
      String(b.numberOfPeople || 0),
      String(b.totalAmount || 0),
      b.status || ''
    ]));
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'attraction-bookings.csv'; a.click();
    URL.revokeObjectURL(url);
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
                    {item.images?.[0] ? <img src={makeAbsolute(item.images[0])} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-400">No image</div>}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">{item.name}</h3>
                      <button onClick={()=>updateItem(item._id, { isActive: !item.isActive })} className={`px-2 py-1 rounded text-sm ${item.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'}`}>{item.isActive ? 'Active' : 'Inactive'}</button>
                    </div>
                    <p className="text-sm text-gray-600">{item.city || item.location}</p>
                    {item.price != null && (<p className="text-sm font-medium mt-1">RWF {Number(item.price || 0).toLocaleString()}</p>)}
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <label className="text-sm">Upload Images:</label>
                  <input type="file" multiple disabled={uploadingId===item._id} onChange={e=>uploadImages(item._id, e.target.files)} />
                  <button onClick={()=>deleteItem(item._id)} className="ml-auto px-3 py-1 bg-red-600 text-white rounded text-sm">Delete</button>
                </div>
                {item.images?.length>0 && (
                  <div className="mt-3 grid grid-cols-4 gap-2">
                    {item.images.map((img, i)=> (
                      <img key={i} src={makeAbsolute(img)} className="w-full h-20 object-cover rounded" />
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
                    <td className="p-3">RWF {Number(item.price || 0).toLocaleString()}</td>
                    <td className="p-3"><button onClick={()=>updateItem(item._id, { isActive: !item.isActive })} className={`px-2 py-1 rounded text-xs ${item.isActive ? 'bg-green-100 text-green-700':'bg-gray-200 text-gray-700'}`}>{item.isActive ? 'Active':'Inactive'}</button></td>
                    <td className="p-3"><button onClick={()=>deleteItem(item._id)} className="px-3 py-1 bg-red-600 text-white rounded text-xs">Delete</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Bookings */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-2">Bookings</h2>
        <div className="mb-3 flex flex-wrap items-end gap-2">
          <div>
            <label className="block text-xs text-gray-600">Status</label>
            <select value={bookingFilters.status} onChange={e=>setBookingFilters({ ...bookingFilters, status: e.target.value })} className="px-3 py-2 border rounded">
              <option value="">All</option>
              {['pending','confirmed','completed','cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-600">From</label>
            <input type="date" value={bookingFilters.from} onChange={e=>setBookingFilters({ ...bookingFilters, from: e.target.value })} className="px-3 py-2 border rounded" />
          </div>
          <div>
            <label className="block text-xs text-gray-600">To</label>
            <input type="date" value={bookingFilters.to} onChange={e=>setBookingFilters({ ...bookingFilters, to: e.target.value })} className="px-3 py-2 border rounded" />
          </div>
          <button onClick={exportBookingsCsv} className="ml-auto px-3 py-2 bg-[#a06b42] hover:bg-[#8f5a32] text-white rounded">Export CSV</button>
        </div>
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="p-3">Attraction</th>
                <th className="p-3">Guest</th>
                <th className="p-3">Visit Date</th>
                <th className="p-3">Tickets</th>
                <th className="p-3">Amount</th>
                <th className="p-3">Status</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {bookings.filter(b => {
                if (bookingFilters.status && b.status !== bookingFilters.status) return false;
                if (bookingFilters.from) {
                  const from = new Date(bookingFilters.from);
                  if (new Date(b.visitDate) < from) return false;
                }
                if (bookingFilters.to) {
                  const to = new Date(bookingFilters.to);
                  if (new Date(b.visitDate) > to) return false;
                }
                return true;
              }).map(b => (
                <tr key={b._id} className="border-t">
                  <td className="p-3">{b.attraction?.name}</td>
                  <td className="p-3">{b.guest?.firstName} {b.guest?.lastName}</td>
                  <td className="p-3">{new Date(b.visitDate).toLocaleDateString()}</td>
                  <td className="p-3">{b.numberOfPeople}</td>
                  <td className="p-3">RWF {Number(b.totalAmount || 0).toLocaleString()}</td>
                  <td className="p-3"><span className="px-2 py-1 rounded bg-gray-100">{b.status}</span></td>
                  <td className="p-3 flex items-center gap-2">
                    {['pending','confirmed','completed','cancelled'].map(s => (
                      <button key={s} onClick={async () => {
                        const res = await fetch(`${API_URL}/api/attraction-bookings/${b._id}/status`, { method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: s }) });
                        const data = await res.json();
                        if (!res.ok) return toast.error(data.message || 'Failed');
                        setBookings(list => list.map(x => x._id === b._id ? data.booking : x));
                        toast.success('Status updated');
                      }} className="px-2 py-1 bg-blue-600 text-white rounded text-xs">{s}</button>
                    ))}
                    <button onClick={() => setReceiptBooking(b)} className="px-2 py-1 bg-green-600 text-white rounded text-xs">Receipt</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {receiptBooking && (
        <ReceiptPreview
          title="Attraction Booking Receipt"
          lines={[
            { label: 'Receipt', value: `#${String(receiptBooking._id).slice(-8)}` },
            { label: 'Date', value: new Date().toLocaleString() },
            '---',
            { label: 'Attraction', value: receiptBooking.attraction?.name || '' },
            { label: 'Guest', value: `${receiptBooking.guest?.firstName || ''} ${receiptBooking.guest?.lastName || ''}`.trim() },
            { label: 'Visit', value: new Date(receiptBooking.visitDate).toLocaleDateString() },
            { label: 'Tickets', value: String(receiptBooking.numberOfPeople || 0) },
            { label: 'Amount', value: `RWF ${Number(receiptBooking.totalAmount || 0).toLocaleString()}` },
            { label: 'Status', value: receiptBooking.status || '' },
          ]}
          onPrint={() => window.print()}
          onClose={() => setReceiptBooking(null)}
        />
      )}
    </div>
  );
}
