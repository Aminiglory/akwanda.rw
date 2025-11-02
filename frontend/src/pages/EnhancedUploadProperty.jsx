import React, { useState, useEffect } from 'react';
import { FaPlus, FaTrash, FaUpload, FaBed, FaBath, FaMapMarkerAlt, FaDollarSign, FaStar, FaSave, FaTimes } from 'react-icons/fa';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const EnhancedUploadProperty = () => {
  const navigate = useNavigate();
  const { refreshUser, updateProfile: ctxUpdateProfile, user } = useAuth();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const isEditing = !!editId;

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    address: '',
    city: '',
    pricePerNight: '',
    bedrooms: 1,
    bathrooms: 1,
    size: '',
    amenities: [],
    category: 'apartment',
    groupBookingEnabled: false,
    groupBookingDiscount: 0,
    commissionRate: 10,
    visibilityLevel: 'standard',
    featuredUntil: '',
    ratePlanNonRefundable: false,
    ratePlanFreeCancellation: true,
    minStayNights: 1,
    cancellationWindowDays: 1,
    prepaymentRequired: false,
    depositPercent: 0,
    checkinTime: '14:00',
    checkoutTime: '11:00',
    smokingAllowed: false,
    petsAllowed: false,
    localTaxPercent: 0,
    cleaningFee: 0,
    verificationMethod: 'later',
    unitMode: 'one',
    unitCount: 1,
    country: 'Rwanda',
    latitude: null,
    longitude: null
  });

  const [rooms, setRooms] = useState([]);
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deals, setDeals] = useState([]);
  const [dealsLoading, setDealsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  // Align with implemented steps (1..8)
  const totalSteps = 8;
  const [addrQuery, setAddrQuery] = useState('');
  const [addrSuggestions, setAddrSuggestions] = useState([]);
  const [addrLoading, setAddrLoading] = useState(false);
  const [partner, setPartner] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: user?.phone || '',
    email: user?.email || ''
  });

  const primaryBtn = 'bg-[#a06b42] hover:bg-[#8f5a32] text-white';
  const secondaryBtn = 'border border-gray-300 text-gray-700 hover:bg-gray-50';

  const categories = [
    { value: 'hotel', label: 'Hotel' },
    { value: 'apartment', label: 'Apartment' },
    { value: 'villa', label: 'Villa' },
    { value: 'hostel', label: 'Hostel' },
    { value: 'resort', label: 'Resort' },
    { value: 'guesthouse', label: 'Guesthouse' }
  ];

  const roomTypes = [
    { value: 'single', label: 'Single' },
    { value: 'double', label: 'Double' },
    { value: 'suite', label: 'Suite' },
    { value: 'family', label: 'Family' },
    { value: 'deluxe', label: 'Deluxe' }
  ];

  const visibilityLevels = [
    { value: 'standard', label: 'Standard', description: 'Basic visibility' },
    { value: 'premium', label: 'Premium', description: 'Higher visibility (+20% commission)' },
    { value: 'featured', label: 'Featured', description: 'Top visibility (+30% commission)' }
  ];

  const commonAmenities = [
    'WiFi', 'Parking', 'Kitchen', 'Air Conditioning', 'Pool', 'Gym', 'Spa', 
    'Restaurant', 'Bar', 'Room Service', 'Laundry', 'Business Center', 
    'Conference Room', 'Pet Friendly', 'Airport Shuttle', 'Beach Access'
  ];

  useEffect(() => {
    if (isEditing) {
      fetchPropertyData();
    }
  }, [isEditing, editId]);

  // Load draft from localStorage if present (autosave resume)
  useEffect(() => {
    if (isEditing) return;
    try {
      const raw = localStorage.getItem('listing_draft_v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.formData) setFormData(prev => ({ ...prev, ...parsed.formData }));
        if (Array.isArray(parsed?.rooms)) setRooms(parsed.rooms);
        if (Array.isArray(parsed?.images)) setImages(parsed.images);
        if (Number.isInteger(parsed?.currentStep)) setCurrentStep(parsed.currentStep);
      }
    } catch (_) {}
  }, [isEditing]);

  // Autosave to localStorage on changes
  useEffect(() => {
    try {
      localStorage.setItem('listing_draft_v1', JSON.stringify({ formData, rooms, images, currentStep }));
    } catch (_) {}
  }, [formData, rooms, images, currentStep]);

  useEffect(() => {
    const loadDeals = async () => {
      if (!isEditing || !editId) return;
      try {
        setDealsLoading(true);
        const res = await fetch(`${API_URL}/api/deals/property/${editId}`);
        const data = await res.json();
        if (res.ok) setDeals(Array.isArray(data.deals) ? data.deals : []);
        else setDeals([]);
      } catch (_) { setDeals([]); }
      finally { setDealsLoading(false); }
    };
    loadDeals();
  }, [isEditing, editId]);

  const fetchPropertyData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/properties/${editId}`, { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to fetch property');

      setFormData({
        title: data.property.title || '',
        description: data.property.description || '',
        address: data.property.address || '',
        city: data.property.city || '',
        pricePerNight: data.property.pricePerNight || '',
        bedrooms: data.property.bedrooms || 1,
        bathrooms: data.property.bathrooms || 1,
        size: data.property.size || '',
        amenities: data.property.amenities || [],
        category: data.property.category || 'apartment',
        groupBookingEnabled: data.property.groupBookingEnabled || false,
        groupBookingDiscount: data.property.groupBookingDiscount || 0,
        commissionRate: (() => {
          const r = Number(data.property.commissionRate || 10);
          if (r >= 12) return 12;
          if (r >= 10) return 10;
          return 8;
        })(),
        visibilityLevel: data.property.visibilityLevel || 'standard',
        featuredUntil: data.property.featuredUntil ? new Date(data.property.featuredUntil).toISOString().split('T')[0] : '',
        ratePlanNonRefundable: !!data.property.ratePlanNonRefundable,
        ratePlanFreeCancellation: data.property.ratePlanFreeCancellation !== false,
        minStayNights: Number(data.property.minStayNights || 1),
        cancellationWindowDays: Number(data.property.cancellationWindowDays || 1),
        prepaymentRequired: !!data.property.prepaymentRequired,
        depositPercent: Number(data.property.depositPercent || 0),
        checkinTime: data.property.checkinTime || '14:00',
        checkoutTime: data.property.checkoutTime || '11:00',
        smokingAllowed: !!data.property.smokingAllowed,
        petsAllowed: !!data.property.petsAllowed,
        localTaxPercent: Number(data.property.localTaxPercent || 0),
        cleaningFee: Number(data.property.cleaningFee || 0),
        verificationMethod: data.property.verificationMethod || 'later',
        unitMode: data.property.unitMode || 'one',
        unitCount: Number(data.property.unitCount || 1),
        country: data.property.country || 'Rwanda',
        latitude: data.property.latitude ?? null,
        longitude: data.property.longitude ?? null
      });

      setRooms(data.property.rooms || []);
      setImages(data.property.images || []);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleAmenityToggle = (amenity) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }));
  };

  const addRoom = () => {
    setRooms(prev => [...prev, {
      roomNumber: `Room ${prev.length + 1}`,
      roomType: 'single',
      pricePerNight: formData.pricePerNight || 0,
      capacity: 1,
      amenities: [],
      beds: { twin: 0, full: 0, queen: 0, king: 0, bunk: 0, sofa: 0, futon: 0 },
      images: [],
      isAvailable: true,
      closedDates: []
    }]);
  };

  const updateRoom = (index, field, value) => {
    setRooms(prev => prev.map((room, i) => 
      i === index ? { ...room, [field]: value } : room
    ));
  };

  const removeRoom = (index) => {
    setRooms(prev => prev.filter((_, i) => i !== index));
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);
    try {
      const formData = new FormData();
      files.forEach(file => formData.append('images', file));

      console.log('Uploading images to:', `${API_URL}/api/properties/upload/images`);
      console.log('Files to upload:', files.length);

      const res = await fetch(`${API_URL}/api/properties/upload/images`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      console.log('Upload response status:', res.status);
      console.log('Upload response headers:', res.headers);

      // Check if response is HTML (error page)
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('text/html')) {
        const htmlText = await res.text();
        console.error('Received HTML instead of JSON:', htmlText.substring(0, 200));
        throw new Error('Server returned HTML instead of JSON. Please check if the backend server is running.');
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to upload images');

      setImages(prev => [...prev, ...data.imageUrls]);
      toast.success('Images uploaded successfully');
    } catch (error) {
      console.error('Image upload error:', error);
      toast.error(error.message || 'Failed to upload images. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  // Address autocomplete using Nominatim (no key)
  useEffect(() => {
    const q = addrQuery.trim();
    if (q.length < 3) { setAddrSuggestions([]); return; }
    let cancelled = false;
    (async () => {
      try {
        setAddrLoading(true);
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q + ' ' + (formData.country || ''))}`;
        const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
        const json = await res.json().catch(()=>[]);
        if (!cancelled) setAddrSuggestions(Array.isArray(json) ? json.slice(0,6) : []);
      } catch (_) {
        if (!cancelled) setAddrSuggestions([]);
      } finally {
        if (!cancelled) setAddrLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [addrQuery, formData.country]);
  const prevStep = () => setCurrentStep(s => Math.max(1, s - 1));

  const saveDraftLocal = () => {
    try {
      localStorage.setItem('listing_draft_v1', JSON.stringify({ formData, rooms, images, currentStep, partner }));
      toast.success('Draft saved');
    } catch (_) { toast.error('Could not save draft'); }
  };

  if (loading && isEditing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading property data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {isEditing ? 'Edit Property' : 'Add New Property'}
              </h1>
              <p className="text-gray-600 mt-1">
                {isEditing ? 'Update your property details' : 'Create a new property listing'}
              </p>
            </div>

            {/* Deals summary (edit mode) */}
            {isEditing && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-900 border-b pb-2">Promotions & Deals</h2>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    {dealsLoading ? 'Loading deals…' : `${deals.length} active deal(s) available for this property`}
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => window.location.href = `/owner/deals/create?property=${editId}`} className="px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm">Create Deal</button>
                    <button type="button" onClick={() => window.location.href = `/owner/deals?property=${editId}`} className="px-3 py-2 rounded-lg border text-sm">Manage Deals</button>
                  </div>
                </div>
                {deals.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {deals.map(d => (
                      <div key={d._id} className="modern-card-elevated p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-semibold text-gray-900">{d.title || 'Promotion'}</div>
                            <div className="text-xs text-gray-600 mt-1">{d.dealType || d.type || 'deal'} • {d.discountType} {d.discountValue}{d.discountType==='percent' ? '%' : ''}</div>
                            <div className="text-xs text-gray-500 mt-1">{d.isActive ? 'Active' : 'Inactive'} • {d.isPublished ? 'Published' : 'Unpublished'}</div>
                          </div>
                          {d.badge && (
                            <span className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">{d.badge}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <FaTimes className="text-xl" />
            </button>
          </div>

          <div className="mb-6">
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div className="bg-[#a06b42] h-2 rounded-full" style={{ width: `${Math.round((currentStep-1)/(totalSteps-1)*100)}%` }}></div>
            </div>
            <div className="mt-2 text-sm text-gray-600">Step {currentStep} of {totalSteps}</div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {currentStep === 1 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900 border-b pb-2">Contact details</h2>
                <div className="text-gray-700 text-sm">Your full name and phone number are needed for your partner account.</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">First name</label>
                    <input value={partner.firstName} onChange={(e)=> setPartner(p=>({...p, firstName: e.target.value}))} className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last name</label>
                    <input value={partner.lastName} onChange={(e)=> setPartner(p=>({...p, lastName: e.target.value}))} className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone number</label>
                    <input type="tel" value={partner.phone} onChange={(e)=> setPartner(p=>({...p, phone: e.target.value}))} placeholder="+250..." className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900 border-b pb-2">Create your partner account</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
                    <input value={partner.email} disabled className="w-full px-4 py-3 border rounded-lg bg-gray-50 text-gray-600" />
                  </div>
                </div>
                <div className="text-gray-700 text-sm">We use your existing account. Continue to set up your listing.</div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900 border-b pb-2">Property Type</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {categories.map(cat => (
                    <button type="button" key={cat.value} onClick={() => setFormData(prev=>({...prev, category: cat.value }))} className={`text-left border rounded-xl p-4 hover:bg-gray-50 ${formData.category===cat.value?'border-[#a06b42] ring-1 ring-[#a06b42]':'border-gray-200'}`}>
                    <div className="font-semibold text-gray-900">{cat.label}</div>
                    <div className="text-xs text-gray-600">Select {cat.label.toLowerCase()}</div>
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">How many units?</label>
                  <div className="flex items-center gap-4">
                    <label className="inline-flex items-center gap-2"><input type="radio" name="unitMode" checked={formData.unitMode==='one'} onChange={()=> setFormData(prev=>({...prev, unitMode:'one', unitCount:1}))} />One unit</label>
                    <label className="inline-flex items-center gap-2"><input type="radio" name="unitMode" checked={formData.unitMode==='multiple'} onChange={()=> setFormData(prev=>({...prev, unitMode:'multiple'}))} />Multiple units</label>
                  </div>
                </div>
                {formData.unitMode==='multiple' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Number of units</label>
                    <input type="number" min={1} value={formData.unitCount} onChange={(e)=> setFormData(prev=>({...prev, unitCount: Math.max(1, Number(e.target.value)||1)}))} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
                )}
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 border-b pb-2">Property Location</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                  <select value={formData.country} onChange={(e)=> setFormData(prev=>({...prev, country: e.target.value }))} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    {['Rwanda','Kenya','Uganda','Tanzania','DR Congo','Burundi'].map(c=> (<option key={c} value={c}>{c}</option>))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Find your address</label>
                  <input value={addrQuery} onChange={(e)=> setAddrQuery(e.target.value)} placeholder="Start typing address" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  {addrLoading && <div className="text-xs text-gray-500 mt-1">Searching…</div>}
                  {addrSuggestions.length > 0 && (
                    <div className="mt-1 border rounded-lg bg-white shadow max-h-48 overflow-auto">
                      {addrSuggestions.map((sug, i)=> (
                        <button type="button" key={i} onClick={()=>{
                          setFormData(prev=> ({...prev, address: sug.display_name, city: prev.city || '', latitude: Number(sug.lat), longitude: Number(sug.lon)}));
                          setAddrSuggestions([]);
                          setAddrQuery(sug.display_name);
                        }} className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm">
                          {sug.display_name}
                        </button>
                      ))}
                    </div>
                  )}
                  {/* Mock map preview */}
                  <div className="mt-3">
                    <div className="w-full h-48 bg-gray-200 rounded-lg relative overflow-hidden">
                      <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-sm">Mock Map Preview</div>
                      {formData.latitude && formData.longitude && (
                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                          <div className="w-3 h-3 bg-red-600 rounded-full shadow" title={`${formData.latitude}, ${formData.longitude}`}></div>
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">Coords: {formData.latitude ?? '—'}, {formData.longitude ?? '—'}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 5 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 border-b pb-2">Property Name</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Property Title *</label>
                <input type="text" name="title" value={formData.title} onChange={handleInputChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Enter property title" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea name="description" value={formData.description} onChange={handleInputChange} rows={4} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Describe your property..."></textarea>
              </div>
            </div>
          )}

          {currentStep === 6 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 border-b pb-2">Facilities & Amenities</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {commonAmenities.map(a => (
                  <label key={a} className="flex items-center"><input type="checkbox" checked={formData.amenities.includes(a)} onChange={(e)=>{ setFormData(prev=> ({...prev, amenities: e.target.checked ? [...prev.amenities, a] : prev.amenities.filter(x=>x!==a)})); }} className="h-4 w-4 text-blue-600 border-gray-300 rounded" /><span className="ml-2 text-sm text-gray-700">{a}</span></label>
                ))}
              </div>
            </div>
          )}

          {currentStep === 7 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900 border-b pb-2">Room/Unit Types</h2>
                <button type="button" onClick={addRoom} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium">Add Room</button>
              </div>
              {rooms.length === 0 ? (
                <div className="text-center py-8 text-gray-500"><FaBed className="text-4xl mx-auto mb-4 text-gray-300" /><p>No rooms added yet.</p></div>
              ) : (
                <div className="space-y-4">
                  {rooms.map((room, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-gray-900">Room {index + 1}</h3>
                        <button type="button" onClick={() => removeRoom(index)} className="text-red-600 hover:text-red-800"><FaTrash /></button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div><label className="block text-sm font-medium text-gray-700 mb-2">Room Number</label><input type="text" value={room.roomNumber} onChange={(e) => updateRoom(index, 'roomNumber', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" /></div>
                        <div><label className="block text-sm font-medium text-gray-700 mb-2">Room Type</label><select value={room.roomType} onChange={(e) => updateRoom(index, 'roomType', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">{roomTypes.map(type => (<option key={type.value} value={type.value}>{type.label}</option>))}</select></div>
                        <div><label className="block text-sm font-medium text-gray-700 mb-2">Price per Night (RWF)</label><input type="number" value={room.pricePerNight} onChange={(e) => updateRoom(index, 'pricePerNight', Number(e.target.value))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" min="0" /></div>
                        <div><label className="block text-sm font-medium text-gray-700 mb-2">Capacity</label><input type="number" value={room.capacity} onChange={(e) => updateRoom(index, 'capacity', Number(e.target.value))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" min="1" /></div>
                      </div>
                      <div className="mt-4">
                        <div className="text-sm font-medium text-gray-700 mb-2">Beds</div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {Object.entries(room.beds || {}).map(([type, count]) => (
                            <div key={type} className="flex items-center justify-between border rounded-lg px-3 py-2">
                              <span className="capitalize text-sm text-gray-700">{type} bed(s)</span>
                              <div className="flex items-center gap-2">
                                <button type="button" className="px-2 py-1 border rounded" onClick={()=> updateRoom(index, 'beds', { ...(room.beds||{}), [type]: Math.max(0, (room.beds?.[type]||0)-1) })}>-</button>
                                <span className="w-6 text-center text-sm">{count}</span>
                                <button type="button" className="px-2 py-1 border rounded" onClick={()=> updateRoom(index, 'beds', { ...(room.beds||{}), [type]: (room.beds?.[type]||0)+1 })}>+</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {currentStep === 8 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 border-b pb-2">Upload Property Photos</h2>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                <input type="file" multiple accept="image/*" onChange={handleImageUpload} className="hidden" id="property-image-upload" disabled={uploading} />
                <label htmlFor="property-image-upload" className="cursor-pointer">
                  <FaUpload className="text-2xl text-gray-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-700 mb-1">{uploading ? 'Uploading...' : 'Upload Property Images'}</p>
                </label>
              </div>
              {images && images.length > 0 && (
                <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-2">
                  {images.map((image, idx) => (
                    <div key={idx} className="relative group">
                      <img src={image.startsWith('http') ? image : `${API_URL}${image}`} alt={`Property Image ${idx+1}`} className="w-full h-24 object-cover rounded-lg" />
                      <button type="button" onClick={() => removeImage(idx)} className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"><FaTimes className="text-xs" /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Footer Controls */}
          <div className="flex items-center justify-between space-x-4 pt-6 border-t">
            <div className="flex items-center gap-2">
              <button type="button" onClick={prevStep} disabled={currentStep===1} className={`px-6 py-3 rounded-lg disabled:opacity-50 ${secondaryBtn}`}>Back</button>
              <button type="button" onClick={saveDraftLocal} className={`px-6 py-3 rounded-lg ${secondaryBtn}`}>Save draft</button>
            </div>
            {currentStep < totalSteps && (
              <button type="button" onClick={nextStep} className={`px-6 py-3 rounded-lg ${primaryBtn}`}>Next</button>
            )}
            {currentStep === totalSteps && (
              <button type="submit" disabled={loading || uploading} className={`px-6 py-3 rounded-lg ${primaryBtn} disabled:opacity-50`}>{loading ? (isEditing ? 'Saving…' : 'Publishing…') : (isEditing ? 'Save Changes' : 'Publish Property')}</button>
            )}
          </div>
        </form>
      </div>
    </div>
  </div>
);
};

export default EnhancedUploadProperty;
