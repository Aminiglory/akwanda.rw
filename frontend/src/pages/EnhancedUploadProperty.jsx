import React, { useState, useEffect } from 'react';
import { FaPlus, FaTrash, FaUpload, FaBed, FaBath, FaMapMarkerAlt, FaDollarSign, FaStar, FaSave, FaTimes } from 'react-icons/fa';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useLocale } from '../contexts/LocaleContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Simple red pin SVG (clean location pin similar to booking-style pins)
const redPinSvg = encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="48" viewBox="0 0 32 48" fill="none"><path d="M16 2C10 2 5 7 5 13c0 8 11 18 11 18s11-10 11-18C27 7 22 2 16 2z" fill="#FF5A5F"/><circle cx="16" cy="13" r="4" fill="white"/></svg>'
);

// Red pin icon for map marker using the inline SVG above
const redPinIcon = new L.Icon({
  iconUrl: `data:image/svg+xml;charset=UTF-8,${redPinSvg}`,
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [32, 48],
  // Anchor at the bottom center so the tip of the pin matches the map location
  iconAnchor: [16, 48],
  shadowSize: [41, 41],
});

// Fallback center (Kigali) when no coordinates are set yet
const KigaliFallbackCenter = { lat: -1.9536, lng: 30.0606 };

const DraggableLocationMarker = ({ position, onPositionChange }) => {
  const [markerPos, setMarkerPos] = useState(position);

  useEffect(() => {
    setMarkerPos(position);
  }, [position.lat, position.lng]);

  useMapEvents({
    click(e) {
      setMarkerPos(e.latlng);
      onPositionChange(e.latlng);
    },
  });

  return (
    <Marker
      position={markerPos}
      draggable
      icon={redPinIcon}
      eventHandlers={{
        dragend(event) {
          const latlng = event.target.getLatLng();
          setMarkerPos(latlng);
          onPositionChange(latlng);
        },
      }}
    />
  );
};

const RecenterOnChange = ({ center }) => {
  const map = useMap();

  useEffect(() => {
    if (!center || typeof center[0] !== 'number' || typeof center[1] !== 'number') return;
    map.setView(center);
  }, [center?.[0], center?.[1]]);

  return null;
};

const EnhancedUploadProperty = () => {
  const navigate = useNavigate();
  const { refreshUser, updateProfile: ctxUpdateProfile, user } = useAuth();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const isEditing = !!editId;
  const { t } = useLocale() || {};

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
  const [autoUpdateAddressFromMap, setAutoUpdateAddressFromMap] = useState(true);
  const [locationError, setLocationError] = useState(null);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
  const [partner, setPartner] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: user?.phone || '',
    email: user?.email || ''
  });

  // Responsive button styles: smaller on small screens, larger on md+
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

  const [propertyAmenityOptions, setPropertyAmenityOptions] = useState([]);
  const [roomAmenityOptions, setRoomAmenityOptions] = useState([]);

  useEffect(() => {
    // Load amenity options from API
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

  const updateLocationFromMap = async (lat, lng) => {
    setFormData(prev => ({ ...prev, latitude: lat, longitude: lng }));
    setLocationError(null);

    if (!autoUpdateAddressFromMap) return;

    try {
      setIsReverseGeocoding(true);
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`;
      const res = await fetch(url, {
        headers: {
          'Accept-Language': 'en',
        },
      });
      const data = await res.json().catch(() => null);
      if (!data) return;

      const addr = data.display_name || '';
      const city =
        data.address?.city ||
        data.address?.town ||
        data.address?.village ||
        data.address?.hamlet ||
        '';

      setFormData(prev => ({
        ...prev,
        address: addr || prev.address,
        city: city || prev.city,
        latitude: lat,
        longitude: lng,
      }));
      setAddrQuery(prevQuery => (addr || prevQuery));
    } catch (_) {
      setLocationError('Could not update address from map. You can still continue with the selected pin location.');
    } finally {
      setIsReverseGeocoding(false);
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

  // Room-level image upload handlers
  const handleRoomImageUpload = async (roomIndex, e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploading(true);
    try {
      const fd = new FormData();
      files.forEach(file => fd.append('images', file));
      const res = await fetch(`${API_URL}/api/properties/upload/images`, {
        method: 'POST',
        body: fd,
        credentials: 'include'
      });
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('text/html')) {
        const htmlText = await res.text();
        console.error('Received HTML instead of JSON (room upload):', htmlText.substring(0, 200));
        throw new Error(`Server returned HTML instead of JSON. Check backend at ${API_URL}`);
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || (t ? t('msg.roomImagesUploadFailed') : 'Failed to upload room images'));
      setRooms(prev => prev.map((r, i) => i === roomIndex ? { ...r, images: [...(r.images||[]), ...data.imageUrls] } : r));
      toast.success(t ? t('msg.roomImagesUploaded') : 'Room images uploaded');
    } catch (err) {
      toast.error(err.message || (t ? t('msg.roomImagesUploadFailed') : 'Failed to upload room images'));
    } finally {
      setUploading(false);
    }
  };

  const removeRoomImage = (roomIndex, imgIndex) => {
    setRooms(prev => prev.map((r, i) => i === roomIndex ? { ...r, images: (r.images||[]).filter((_, j) => j !== imgIndex) } : r));
  };

  // Address autocomplete using Nominatim (no key)
  useEffect(() => {
    const q = addrQuery.trim();
    if (q.length < 3) { setAddrSuggestions([]); return; }
    let cancelled = false;
    (async () => {
      try {
        setAddrLoading(true);
        const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&q=${encodeURIComponent(q + ' ' + (formData.country || ''))}`;
        const res = await fetch(url, { headers: { 'Accept-Language': (typeof document !== 'undefined' ? document.documentElement.lang : 'en') || 'en' } });
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

  const canProceed = () => {
    if (currentStep === 1 || currentStep === 2) return true;
    if (currentStep === 3) return !!formData.category;
    // Step 4: require city AND (address OR coordinates)
    if (currentStep === 4) return !!formData.city && (!!formData.address || (formData.latitude != null && formData.longitude != null));
    if (currentStep === 5) return !!formData.title;
    if (currentStep === 8) return images.length > 0 || uploading === false;
    return true;
  };

  const nextStep = async () => {
    if (!canProceed()) { toast.error(t ? t('msg.completeRequiredInfo') : 'Complete required info'); return; }
    try {
      if (currentStep === 1) {
        await ctxUpdateProfile({
          firstName: partner.firstName,
          lastName: partner.lastName,
          phone: partner.phone,
        });
        await refreshUser();
      }
      setCurrentStep(s => Math.min(totalSteps, s + 1));
    } catch (e) {
      toast.error(e.message || (t ? t('msg.contactSaveFailed') : 'Failed to save contact details'));
    }
  };

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    try {
      setLoading(true);
      const url = isEditing ? `${API_URL}/api/properties/${editId}` : `${API_URL}/api/properties`;
      const method = isEditing ? 'PUT' : 'POST';

      // Build multipart/form-data to satisfy backend multer
      const fd = new FormData();
      // Basic required validation to match backend schema
      if (!formData.title) {
        throw new Error('Property title is required');
      }
      if (!formData.address) {
        throw new Error('Property address is required');
      }
      if (!formData.city) {
        throw new Error('City is required');
      }
      // Accept price from either top-level or first room as fallback
      const resolvedBasePrice = (() => {
        const top = formData.pricePerNight;
        if (top !== '' && top != null && !isNaN(Number(top))) return Number(top);
        const room0 = (rooms && rooms.length > 0) ? rooms[0].pricePerNight : undefined;
        if (room0 !== '' && room0 != null && !isNaN(Number(room0))) return Number(room0);
        return NaN;
      })();
      if (isNaN(resolvedBasePrice)) {
        throw new Error('Price per night is required and must be a number');
      }

      Object.entries(formData).forEach(([k, v]) => {
        if (v === undefined || v === null) return;
        if (Array.isArray(v)) {
          // Append arrays as repeated fields
          v.forEach(item => fd.append(k, String(item)));
        } else {
          fd.append(k, String(v));
        }
      });
      // Ensure pricePerNight is set consistently based on resolved value
      fd.set('pricePerNight', String(resolvedBasePrice));
      // Map to backend field names for times
      if (formData.checkinTime != null) fd.set('checkInTime', String(formData.checkinTime));
      if (formData.checkoutTime != null) fd.set('checkOutTime', String(formData.checkoutTime));
      // Rooms as JSON string (backend handles arrays under req.body.rooms elsewhere too)
      fd.append('rooms', JSON.stringify(rooms || []));
      // Provide imageUrls so backend merges them
      (images || []).forEach(u => fd.append('imageUrls', u));

      // Debug: log payload snapshot (avoid logging FormData directly)
      try {
        console.log('[Property Submit] Payload snapshot', {
          url, method,
          formData,
          roomsCount: (rooms || []).length,
          rooms: rooms,
          imagesCount: (images || []).length
        });
      } catch (_) {}

      const res = await fetch(url, {
        method,
        credentials: 'include',
        body: fd,
      });
      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('application/json')) {
        const text = await res.text().catch(()=> '');
        console.error('[Property Submit] Unexpected response', { status: res.status, ct, bodyPreview: text.slice(0, 400) });
        throw new Error(`Unexpected ${ct || 'response'} (status ${res.status}). ${text.slice(0,180)}`);
      }
      const data = await res.json().catch(()=>({}));
      if (!res.ok) {
        console.error('[Property Submit] Server error', { status: res.status, data });
        if (res.status === 401 || res.status === 403) throw new Error(t ? t('msg.authRequired') : 'Authorization required. Please log in as a host and try again.');
        const details = Array.isArray(data?.details) ? ` Details: ${data.details.map(d=>`${d.field}: ${d.message}`).join('; ')}` : '';
        throw new Error((data.message || 'Failed to save property') + details);
      }
      toast.success(isEditing ? (t ? t('msg.propertyUpdated') : 'Property updated') : (t ? t('msg.propertyCreated') : 'Property created'));
      navigate('/dashboard');
    } catch (err) {
      console.error('[Property Submit] Caught error', err);
      toast.error(err.message || (t ? t('msg.saveFailed') : 'Failed to save'));
    } finally {
      setLoading(false);
    }
  };

  const prevStep = () => setCurrentStep(s => Math.max(1, s - 1));

  const saveDraftLocal = () => {
    try {
      localStorage.setItem('listing_draft_v1', JSON.stringify({ formData, rooms, images, currentStep, partner }));
      toast.success(t ? t('msg.draftSaved') : 'Draft saved');
    } catch (_) { toast.error(t ? t('msg.draftSaveFailed') : 'Could not save draft'); }
  };

  if (loading && isEditing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">{t ? t('msg.loadingPropertyData') : 'Loading property data...'}</p>
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
              <h2 className="text-xl font-semibold text-gray-900 border-b pb-2">{t ? t('listing.propertyLocation') : 'Property Location'}</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t ? t('listing.country') : 'Country'}</label>
                  <select
                    value={formData.country}
                    onChange={(e)=> setFormData(prev=>({...prev, country: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {['Rwanda','Kenya','Uganda','Tanzania','DR Congo','Burundi'].map(c=> (<option key={c} value={c}>{c}</option>))}
                  </select>
                </div>
                <div className="md:col-span-2 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t ? t('listing.findYourAddress') : 'Find your address'}</label>
                    <input
                      value={addrQuery}
                      onChange={(e)=> setAddrQuery(e.target.value)}
                      placeholder="Start typing address"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {addrLoading && (
                      <div className="text-xs text-gray-500 mt-1">
                        {t ? t('listing.searching') : 'Searching…'}
                      </div>
                    )}
                    {addrSuggestions.length > 0 && (
                      <div className="mt-1 border rounded-lg bg-white shadow max-h-48 overflow-auto">
                        {addrSuggestions.map((sug, i)=> (
                          <button
                            type="button"
                            key={i}
                            onClick={() => {
                              const a = sug.address || {};
                              const city = a.city || a.town || a.village || a.municipality || a.state_district || a.county || '';
                              setFormData(prev=> ({
                                ...prev,
                                address: sug.display_name,
                                city: city || prev.city || '',
                                latitude: Number(sug.lat),
                                longitude: Number(sug.lon),
                              }));
                              setAddrSuggestions([]);
                              setAddrQuery(sug.display_name);
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm"
                          >
                            {sug.display_name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* City field */}
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t ? t('listing.city') : 'City'}</label>
                    <input
                      value={formData.city}
                      onChange={(e)=> setFormData(prev=> ({...prev, city: e.target.value}))}
                      placeholder="Kigali"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Interactive map with draggable pin */}
                  <div className="mt-1">
                    <div className="w-full h-64 md:h-72 bg-gray-200 rounded-lg relative overflow-hidden border border-gray-200">
                      <MapContainer
                        center={[
                          formData.latitude ?? KigaliFallbackCenter.lat,
                          formData.longitude ?? KigaliFallbackCenter.lng,
                        ]}
                        zoom={15}
                        scrollWheelZoom
                        className="w-full h-full"
                      >
                        <RecenterOnChange
                          center={[
                            formData.latitude ?? KigaliFallbackCenter.lat,
                            formData.longitude ?? KigaliFallbackCenter.lng,
                          ]}
                        />
                        <TileLayer
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                          attribution="&copy; OpenStreetMap contributors"
                        />
                        <DraggableLocationMarker
                          position={{
                            lat: formData.latitude ?? KigaliFallbackCenter.lat,
                            lng: formData.longitude ?? KigaliFallbackCenter.lng,
                          }}
                          onPositionChange={(latlng) => updateLocationFromMap(latlng.lat, latlng.lng)}
                        />
                      </MapContainer>
                    </div>
                    <div className="mt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-gray-600">
                      <span>
                        {t
                          ? t('listing.coords', formData.latitude, formData.longitude)
                          : `Coords: ${formData.latitude ?? '—'}, ${formData.longitude ?? '—'}`}
                        {isReverseGeocoding && (t ? ` • ${t('listing.updatingAddress')}` : ' • Updating address…')}
                      </span>
                      <label className="inline-flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={autoUpdateAddressFromMap}
                          onChange={(e)=> setAutoUpdateAddressFromMap(e.target.checked)}
                          className="h-3 w-3 text-blue-600 border-gray-300 rounded"
                        />
                        <span>{t ? t('listing.updateAddressFromPin') : 'Update address when moving the pin'}</span>
                      </label>
                    </div>
                    {locationError && (
                      <div className="mt-1 text-xs text-red-600">
                        {locationError}
                      </div>
                    )}
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
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter property title"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Describe your property..."
                ></textarea>
              </div>
            </div>
          )}

          {currentStep === 6 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 border-b pb-2">Facilities & Amenities</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {propertyAmenityOptions.map(opt => {
                  const val = opt.slug || opt.name;
                  const label = opt.name || val;
                  const checked = Array.isArray(formData.amenities) && formData.amenities.includes(val);
                  return (
                    <label key={val} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={!!checked}
                        onChange={(e)=>{
                          setFormData(prev=> ({
                            ...prev,
                            amenities: e.target.checked
                              ? [...(prev.amenities||[]), val]
                              : (prev.amenities||[]).filter(x=>x!==val)
                          }));
                        }}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">{label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {currentStep === 7 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900 border-b pb-2">Room/Unit Types</h2>
                <button type="button" onClick={addRoom} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 md:px-4 md:py-2 rounded-lg text-sm md:text-base font-medium">Add Room</button>
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
                            <div key={type} className="flex items-center justify-between border rounded-lg px-2 py-2 md:px-3">
                              <span className="capitalize text-sm text-gray-700">{type} bed(s)</span>
                              <div className="flex items-center gap-2">
                                <button type="button" className="px-2 py-1 md:px-3 md:py-1 border rounded text-sm" onClick={()=> updateRoom(index, 'beds', { ...(room.beds||{}), [type]: Math.max(0, (room.beds?.[type]||0)-1) })} aria-label={`Decrease ${type} beds`}>-</button>
                                <span className="w-6 text-center text-sm">{count}</span>
                                <button type="button" className="px-2 py-1 md:px-3 md:py-1 border rounded text-sm" onClick={()=> updateRoom(index, 'beds', { ...(room.beds||{}), [type]: (room.beds?.[type]||0)+1 })} aria-label={`Increase ${type} beds`}>+</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Room Images */}
                      <div className="mt-4">
                        <div className="text-sm font-medium text-gray-700 mb-2">Room Images</div>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 text-center">
                          <input id={`room-image-upload-${index}`} type="file" multiple accept="image/*" className="hidden" onChange={(e)=>handleRoomImageUpload(index, e)} disabled={uploading} />
                          <label htmlFor={`room-image-upload-${index}`} className="cursor-pointer inline-flex items-center gap-2 text-sm text-gray-700">
                            <FaUpload className="text-gray-400" />
                            <span>{uploading ? 'Uploading…' : 'Upload room images'}</span>
                          </label>
                        </div>
                        {(room.images && room.images.length > 0) && (
                          <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-2">
                            {room.images.map((img, rIdx) => (
                              <div key={rIdx} className="relative group">
                                <img src={img.startsWith('http') ? img : `${API_URL}${img}`} alt={`Room ${index+1} image ${rIdx+1}`} className="w-full h-24 object-cover rounded-lg" />
                                <button type="button" onClick={()=>removeRoomImage(index, rIdx)} className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"><FaTimes className="text-xs" /></button>
                              </div>
                            ))}
                          </div>
                        )}
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
          <div className="flex items-center justify-between space-x-2 md:space-x-4 pt-6 border-t">
            <div className="flex items-center gap-2">
              <button type="button" onClick={prevStep} disabled={currentStep===1} className={`px-3 py-2 md:px-6 md:py-3 rounded-lg text-sm md:text-base disabled:opacity-50 ${secondaryBtn}`}>Back</button>
              <button type="button" onClick={saveDraftLocal} className={`px-3 py-2 md:px-6 md:py-3 rounded-lg text-sm md:text-base ${secondaryBtn}`}>Save draft</button>
            </div>
            {currentStep < totalSteps && (
              <button type="button" onClick={nextStep} className={`px-3 py-2 md:px-6 md:py-3 rounded-lg text-sm md:text-base ${primaryBtn}`}>Next</button>
            )}
            {currentStep === totalSteps && (
              <button type="submit" disabled={loading || uploading} className={`px-3 py-2 md:px-6 md:py-3 rounded-lg text-sm md:text-base ${primaryBtn} disabled:opacity-50`}>{loading ? (isEditing ? 'Saving…' : 'Publishing…') : (isEditing ? 'Save Changes' : 'Publish Property')}</button>
            )}
          </div>
        </form>
      </div>
    </div>
  </div>
);
};

export default EnhancedUploadProperty;
