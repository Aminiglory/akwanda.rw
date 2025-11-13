import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const EditProperty = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [property, setProperty] = useState(null);
  const [propertyAmenityOptions, setPropertyAmenityOptions] = useState([]);
  const [roomAmenityOptions, setRoomAmenityOptions] = useState([]);

  // Editable fields state
  const [form, setForm] = useState({
    title: '',
    description: '',
    address: '',
    city: '',
    country: '',
    pricePerNight: '',
    bedrooms: '',
    bathrooms: '',
    visibilityLevel: 'standard',
    amenities: '', // comma-separated text (legacy)
    amenitiesArr: [], // checkbox-driven array
    images: [],
  });

  // New room state
  const [newRoom, setNewRoom] = useState({
    roomNumber: '',
    roomType: '',
    pricePerNight: '',
    capacity: '',
    amenities: '',
    files: [],
    imageUrls: ''
  });

  const fetchProperty = async () => {
    try {
      setLoading(true);
      // Owner-focused fetch to avoid public isActive checks
      const res = await fetch(`${API_URL}/api/properties/my-properties`, { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Failed to load properties');
      const found = (data.properties || []).find(p => String(p._id) === String(id));
      if (!found) throw new Error('Property not found in your list');
      setProperty(found);
      setForm({
        title: found.title || '',
        description: found.description || '',
        address: found.address || '',
        city: found.city || '',
        country: found.country || '',
        pricePerNight: found.pricePerNight ?? '',
        bedrooms: found.bedrooms ?? '',
        bathrooms: found.bathrooms ?? '',
        visibilityLevel: found.visibilityLevel || 'standard',
        amenities: Array.isArray(found.amenities) ? found.amenities.join(', ') : (found.amenities || ''),
        amenitiesArr: Array.isArray(found.amenities) ? found.amenities : [],
        images: Array.isArray(found.images) ? found.images : []
      });
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProperty(); /* eslint-disable-next-line */ }, [id]);
  useEffect(() => {
    (async () => {
      try {
        const [propRes, roomRes] = await Promise.all([
          fetch(`${API_URL}/api/amenities?scope=property&active=true`, { credentials: 'include' }),
          fetch(`${API_URL}/api/amenities?scope=room&active=true`, { credentials: 'include' })
        ]);
        const propData = await propRes.json().catch(()=>({ amenities: [] }));
        const roomData = await roomRes.json().catch(()=>({ amenities: [] }));
        if (propRes.ok) setPropertyAmenityOptions(Array.isArray(propData.amenities) ? propData.amenities : []);
        if (roomRes.ok) setRoomAmenityOptions(Array.isArray(roomData.amenities) ? roomData.amenities : []);
      } catch (_) {}
    })();
  }, []);

  const onFormChange = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const uploadFiles = async (files) => {
    if (!files || !files.length) return [];
    const fd = new FormData();
    Array.from(files).forEach(f => fd.append('images', f));
    const res = await fetch(`${API_URL}/api/properties/upload/images`, {
      method: 'POST',
      credentials: 'include',
      body: fd
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || 'Failed to upload images');
    const urls = data?.imageUrls || [];
    if (!Array.isArray(urls)) return [];
    return urls;
  };

  const handleAddPropertyImages = async (e) => {
    try {
      const files = e.target.files;
      const urls = await uploadFiles(files);
      setForm(prev => ({ ...prev, images: Array.from(new Set([...(prev.images||[]), ...urls])) }));
      toast.success('Images added (not saved yet)');
    } catch (err) {
      toast.error(err.message);
    } finally {
      e.target.value = '';
    }
  };

  // Ensure image URLs are absolute for preview
  const makeAbsolute = (u) => {
    if (!u) return u;
    let s = String(u).replace(/\\+/g, '/');
    if (s.startsWith('http')) return s;
    if (!s.startsWith('/')) s = `/${s}`;
    return `${API_URL}${s}`;
  };

  // Remove an image from the property (pending until Save Changes)
  const handleRemovePropertyImage = (idx) => {
    setForm(prev => {
      const copy = [...(prev.images || [])];
      copy.splice(idx, 1);
      return { ...prev, images: copy };
    });
    toast.success('Removed image (click Save Changes to persist)');
  };

  const handleSaveProperty = async () => {
    try {
      setSaving(true);
      const payload = {
        title: form.title,
        description: form.description,
        address: form.address,
        city: form.city,
        country: form.country,
        visibilityLevel: form.visibilityLevel,
        pricePerNight: form.pricePerNight !== '' ? Number(form.pricePerNight) : undefined,
        bedrooms: form.bedrooms !== '' ? Number(form.bedrooms) : undefined,
        bathrooms: form.bathrooms !== '' ? Number(form.bathrooms) : undefined,
        amenities: (form.amenitiesArr && form.amenitiesArr.length)
          ? form.amenitiesArr
          : (form.amenities ? form.amenities.split(',').map(s=>s.trim()).filter(Boolean) : undefined),
        images: form.images || []
      };
      const res = await fetch(`${API_URL}/api/properties/${id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Failed to save');
      toast.success('Property updated');
      await fetchProperty();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRoomAddImages = async (roomId, files, extraUrlsStr) => {
    try {
      const fd = new FormData();
      if (files && files.length) Array.from(files).forEach(f => fd.append('images', f));
      if (extraUrlsStr) {
        const urls = extraUrlsStr.split(',').map(s=>s.trim()).filter(Boolean);
        urls.forEach(u => fd.append('imageUrls', u));
      }
      const res = await fetch(`${API_URL}/api/properties/${id}/rooms/${roomId}/images`, {
        method: 'POST',
        credentials: 'include',
        body: fd
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Failed to add room images');
      toast.success('Room images updated');
      await fetchProperty();
    } catch (e) {
      toast.error(e.message);
    }
  };

  // Remove a specific image from a room immediately
  const handleRemoveRoomImage = async (roomId, imageUrl) => {
    try {
      const room = (property.rooms || []).find(r => String(r._id) === String(roomId));
      if (!room) return toast.error('Room not found');
      const nextImages = (room.images || []).filter(u => String(u) !== String(imageUrl));
      const res = await fetch(`${API_URL}/api/properties/${id}/rooms/${roomId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: nextImages })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Failed to update room images');
      toast.success('Image removed');
      await fetchProperty();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const handleCreateRoom = async () => {
    try {
      if (!newRoom.roomNumber || !newRoom.roomType || !newRoom.pricePerNight || !newRoom.capacity) {
        toast.error('Fill required room fields');
        return;
      }
      // If files present, upload first and send imageUrls
      let imageUrls = [];
      if (newRoom.files && newRoom.files.length) {
        imageUrls = await uploadFiles(newRoom.files);
      }
      const mergedUrls = Array.from(new Set([
        ...imageUrls,
        ...((newRoom.imageUrls||'').split(',').map(s=>s.trim()).filter(Boolean))
      ]));

      const fd = new FormData();
      fd.append('roomNumber', newRoom.roomNumber);
      fd.append('roomType', newRoom.roomType);
      fd.append('pricePerNight', String(newRoom.pricePerNight));
      fd.append('capacity', String(newRoom.capacity));
      if (newRoom.amenities) fd.append('amenities', newRoom.amenities);
      mergedUrls.forEach(u => fd.append('images', u));
      // Note: files already uploaded via uploadFiles; backend also accepts files in this endpoint if desired

      const res = await fetch(`${API_URL}/api/properties/${id}/rooms`, {
        method: 'POST',
        credentials: 'include',
        body: fd
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Failed to create room');
      toast.success('Room created');
      setNewRoom({ roomNumber:'', roomType:'', pricePerNight:'', capacity:'', amenities:'', files:[], imageUrls:'' });
      await fetchProperty();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const RoomCard = ({ room }) => {
    const [files, setFiles] = useState([]);
    const [extraUrls, setExtraUrls] = useState('');
    const AMENITY_OPTIONS = roomAmenityOptions.map(opt => opt.slug || opt.name);
    const [roomAmenities, setRoomAmenities] = useState(Array.isArray(room.amenities) ? room.amenities : []);

    const toggleRoomAmenity = (a) => {
      setRoomAmenities(prev => prev.includes(a) ? prev.filter(x=>x!==a) : [...prev, a]);
    };
    const saveRoomAmenities = async () => {
      try {
        const res = await fetch(`${API_URL}/api/properties/${property._id}/rooms/${room._id}`, {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amenities: roomAmenities })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || 'Failed to update room');
        toast.success('Room amenities updated');
        await fetchProperty();
      } catch (e) {
        toast.error(e.message);
      }
    };
    return (
      <div className="border rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="font-medium text-gray-800">{room.roomNumber} • {room.roomType} • {room.capacity} guests</div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 my-3">
          {(room.images||[]).map((u,idx)=> (
            <div key={idx} className="relative group">
              <img src={makeAbsolute(u)} alt="room" className="w-full h-24 object-cover rounded" />
              <button
                onClick={() => handleRemoveRoomImage(room._id, u)}
                className="absolute top-1 right-1 bg-white/90 border text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition"
                title="Remove"
              >Remove</button>
            </div>
          ))}
          {(room.images||[]).length===0 && <div className="text-sm text-gray-500">No images yet</div>}
        </div>
        <div className="flex flex-col md:flex-row gap-2 items-start md:items-center">
          <input type="file" multiple onChange={e=>setFiles(e.target.files)} />
          <input className="border rounded px-3 py-2 flex-1" placeholder="Additional image URLs (comma separated)" value={extraUrls} onChange={e=>setExtraUrls(e.target.value)} />
          <button onClick={()=>handleRoomAddImages(room._id, files, extraUrls)} className="bg-blue-600 text-white px-4 py-2 rounded">Add Images</button>
        </div>
        {/* Room amenities checkboxes */}
        <div className="mt-4">
          <div className="text-sm font-medium text-gray-800 mb-2">Room Amenities</div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {AMENITY_OPTIONS.map((a)=> (
              <label key={a} className="inline-flex items-center gap-2 text-sm">
                <input type="checkbox" checked={roomAmenities.includes(a)} onChange={()=>toggleRoomAmenity(a)} />
                <span className="capitalize">{a.replace('_',' ')}</span>
              </label>
            ))}
          </div>
          <div className="mt-2">
            <button onClick={saveRoomAmenities} className="px-3 py-2 border rounded">Save Room Amenities</button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading property...</p>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <p className="text-red-600">Property not found.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Edit Property</h1>
        <div className="flex gap-2">
          <button onClick={()=>navigate(`/apartment/${property._id}`)} className="px-4 py-2 rounded bg-gray-100">View</button>
          <button disabled={saving} onClick={handleSaveProperty} className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-60">{saving? 'Saving...' : 'Save Changes'}</button>
        </div>
      </div>

      {/* Basic info */}
      <div className="bg-white rounded-xl shadow p-5 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input className="border rounded px-3 py-2" placeholder="Title" value={form.title} onChange={e=>onFormChange('title', e.target.value)} />
          <input className="border rounded px-3 py-2" placeholder="Address" value={form.address} onChange={e=>onFormChange('address', e.target.value)} />
          <input className="border rounded px-3 py-2" placeholder="City" value={form.city} onChange={e=>onFormChange('city', e.target.value)} />
          <input className="border rounded px-3 py-2" placeholder="Country" value={form.country} onChange={e=>onFormChange('country', e.target.value)} />
          <input className="border rounded px-3 py-2" type="number" placeholder="Price per night" value={form.pricePerNight} onChange={e=>onFormChange('pricePerNight', e.target.value)} />
          <select className="border rounded px-3 py-2" value={form.visibilityLevel} onChange={e=>onFormChange('visibilityLevel', e.target.value)}>
            <option value="standard">Standard</option>
            <option value="premium">Premium</option>
            <option value="featured">Featured</option>
          </select>
          <input className="border rounded px-3 py-2" type="number" placeholder="Bedrooms" value={form.bedrooms} onChange={e=>onFormChange('bedrooms', e.target.value)} />
          <input className="border rounded px-3 py-2" type="number" placeholder="Bathrooms" value={form.bathrooms} onChange={e=>onFormChange('bathrooms', e.target.value)} />
          <textarea className="border rounded px-3 py-2 md:col-span-2" rows={3} placeholder="Description" value={form.description} onChange={e=>onFormChange('description', e.target.value)} />
          {/* Property amenities checkboxes */}
          <div className="md:col-span-2">
            <div className="text-sm font-medium text-gray-800 mb-2">Property Amenities</div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {propertyAmenityOptions.map((opt)=> {
                const a = opt.slug || opt.name;
                const isChecked = Array.isArray(form.amenitiesArr) && form.amenitiesArr.includes(a);
                return (
                  <label key={a} className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={()=> setForm(prev => ({ ...prev, amenitiesArr: isChecked ? prev.amenitiesArr.filter(x=>x!==a) : [...(prev.amenitiesArr||[]), a] }))}
                    />
                    <span className="capitalize">{(opt.name || a).replace('_',' ')}</span>
                  </label>
                );
              })}
            </div>
            <div className="text-xs text-gray-500 mt-2">You can also type custom amenities below (comma separated).</div>
            <input className="border rounded px-3 py-2 w-full mt-2" placeholder="Custom amenities (comma separated)" value={form.amenities} onChange={e=>onFormChange('amenities', e.target.value)} />
          </div>
        </div>
      </div>

      {/* Property images */}
      <div className="bg-white rounded-xl shadow p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold text-gray-900">Property Images</div>
          <input type="file" multiple onChange={handleAddPropertyImages} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {(form.images||[]).map((u, idx) => (
            <div key={idx} className="relative group">
              <img src={makeAbsolute(u)} alt="prop" className="w-full h-28 object-cover rounded" />
              <button
                onClick={()=>handleRemovePropertyImage(idx)}
                className="absolute top-1 right-1 bg-white/90 border text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition"
                title="Remove"
              >Remove</button>
            </div>
          ))}
          {(form.images||[]).length===0 && <div className="text-sm text-gray-500">No images yet</div>}
        </div>
      </div>

      {/* Rooms */}
      <div className="bg-white rounded-xl shadow p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="font-semibold text-gray-900">Rooms</div>
        </div>
        <div className="space-y-4 mb-6">
          {(property.rooms||[]).map(r => (
            <RoomCard key={r._id || r.roomNumber} room={r} />
          ))}
          {(!property.rooms || property.rooms.length===0) && (
            <div className="text-sm text-gray-500">No rooms yet</div>
          )}
        </div>

        {/* New Room */}
        <div className="border rounded-lg p-4">
          <div className="font-medium text-gray-800 mb-3">Create New Room</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <input className="border rounded px-3 py-2" placeholder="Room Number" value={newRoom.roomNumber} onChange={e=>setNewRoom(s=>({...s, roomNumber: e.target.value}))} />
            <select className="border rounded px-3 py-2" value={newRoom.roomType} onChange={e=>setNewRoom(s=>({...s, roomType: e.target.value}))}>
              <option value="">Select type</option>
              {['single','double','suite','family','deluxe'].map(t=> (<option key={t} value={t}>{t}</option>))}
            </select>
            <input className="border rounded px-3 py-2" type="number" placeholder="Price per night" value={newRoom.pricePerNight} onChange={e=>setNewRoom(s=>({...s, pricePerNight: e.target.value}))} />
            <input className="border rounded px-3 py-2" type="number" placeholder="Capacity" value={newRoom.capacity} onChange={e=>setNewRoom(s=>({...s, capacity: e.target.value}))} />
            <input className="border rounded px-3 py-2 md:col-span-2" placeholder="Amenities (comma separated)" value={newRoom.amenities} onChange={e=>setNewRoom(s=>({...s, amenities: e.target.value}))} />
            <div className="md:col-span-3">
              <div className="text-sm font-medium text-gray-800 mb-2">Select Room Amenities</div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {['wifi','parking','kitchen','air_conditioning','laundry','pool','tv','balcony','desk','breakfast'].map((a)=> (
                  <label key={a} className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={String(newRoom.amenities).split(',').map(s=>s.trim()).filter(Boolean).includes(a)}
                      onChange={()=>{
                        const current = String(newRoom.amenities||'').split(',').map(s=>s.trim()).filter(Boolean);
                        const next = current.includes(a) ? current.filter(x=>x!==a) : [...current, a];
                        setNewRoom(s=>({...s, amenities: next.join(', ')}));
                      }}
                    />
                    <span className="capitalize">{a.replace('_',' ')}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="md:col-span-3 flex flex-col gap-2">
              <input type="file" multiple onChange={e=>setNewRoom(s=>({...s, files: e.target.files}))} />
              <input className="border rounded px-3 py-2" placeholder="Image URLs (comma separated)" value={newRoom.imageUrls} onChange={e=>setNewRoom(s=>({...s, imageUrls: e.target.value}))} />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreateRoom} className="bg-blue-600 text-white px-4 py-2 rounded">Create Room</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditProperty;
