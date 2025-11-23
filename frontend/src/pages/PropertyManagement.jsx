import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSearchParams } from 'react-router-dom';
import { FaStar, FaChartBar, FaInfoCircle, FaMoneyBillWave, FaImages, FaFileAlt, FaBed, FaUser, FaLeaf } from 'react-icons/fa';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function PropertyManagement() {
  const [searchParams] = useSearchParams();
  const view = searchParams.get('view') || 'general';
  const [properties, setProperties] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState('');
  const [loading, setLoading] = useState(false);
  const [propertyData, setPropertyData] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState(null);
  const [propertyAmenityOptions, setPropertyAmenityOptions] = useState([]);
  const [roomAmenityOptions, setRoomAmenityOptions] = useState([]);
  const [saving, setSaving] = useState(false);
  const [descDraft, setDescDraft] = useState({ shortDescription: '', description: '' });
  const [reservationDraft, setReservationDraft] = useState({ cancellationPolicy: '', prepaymentRequired: false, minStayNights: 1 });
  const [policyDraft, setPolicyDraft] = useState({ checkInTime: '14:00', checkOutTime: '11:00', smokingAllowed: false, petsAllowed: false, petPolicy: '', roomRules: '' });
  const { user, refreshUser } = useAuth() || {};
  const [profileDraft, setProfileDraft] = useState({ firstName: '', lastName: '', phone: '', bio: '' });
  const [expandedRoomId, setExpandedRoomId] = useState(null);
  const [addOnServicesDraft, setAddOnServicesDraft] = useState([]);
  const [addOnCatalog, setAddOnCatalog] = useState([]);
  const [photoLightbox, setPhotoLightbox] = useState({ open: false, index: 0 });

  useEffect(() => {
    fetchProperties();
    // Load amenity options for property and room scopes
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

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/add-ons/catalog`, { credentials: 'include' });
        const data = await res.json().catch(()=>({}));
        if (res.ok && Array.isArray(data.items)) {
          setAddOnCatalog(data.items);
        } else {
          setAddOnCatalog([]);
        }
      } catch (_) {
        setAddOnCatalog([]);
      }
    })();
  }, []);

  // Initialize profile draft from auth user
  useEffect(() => {
    if (user) {
      setProfileDraft({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phone: user.phone || '',
        bio: user.bio || ''
      });
    }
  }, [user]);

  useEffect(() => {
    if (selectedProperty) {
      fetchPropertyDetails();
      if (view === 'quality-rating' || view === 'page-score') {
        fetchPropertyStats();
      }
    }
  }, [selectedProperty, view]);

  useEffect(() => {
    if (propertyData && Array.isArray(propertyData.addOnServices)) {
      setAddOnServicesDraft(propertyData.addOnServices);
    } else {
      setAddOnServicesDraft([]);
    }
  }, [propertyData]);

  const fetchPropertyStats = async () => {
    try {
      const res = await fetch(`${API_URL}/api/properties/${selectedProperty}/stats`, { credentials: 'include' });
      const data = await res.json();
      if (res.ok) {
        setStats(data);
      }
    } catch (e) {
      console.error('Failed to load stats:', e);
    }
  };

  const handleSaveAddOnServices = async (services) => {
    if (!selectedProperty) return;
    try {
      setSaving(true);
      const res = await fetch(`${API_URL}/api/properties/${selectedProperty}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addOnServices: services })
      });
      const json = await res.json().catch(()=>({}));
      if (!res.ok) throw new Error(json.message || 'Failed to save add-on services');
      toast.success('Add-on services saved');
      await fetchPropertyDetails();
    } catch (e) {
      toast.error(e.message || 'Failed to save add-on services');
    } finally {
      setSaving(false);
    }
  };

  const saveProfile = async () => {
    try {
      setSaving(true);
      const res = await fetch(`${API_URL}/api/user/profile`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileDraft)
      });
      const json = await res.json().catch(()=>({}));
      if (!res.ok) throw new Error(json.message || 'Failed to update profile');
      toast.success('Profile updated');
      await refreshUser?.();
    } catch (e) {
      toast.error(e.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const fetchProperties = async () => {
    try {
      const res = await fetch(`${API_URL}/api/properties/my-properties`, { credentials: 'include' });
      const data = await res.json();
      if (res.ok) {
        const props = data.properties || [];
        setProperties(props);
        if (props.length > 0) {
          try {
            // Prefer explicit ?property=<id> in URL, then first property; do not sync across tabs
            let initialId = '';
            try {
              const urlParam = searchParams.get('property');
              if (urlParam) {
                const existsParam = props.find(p => String(p._id) === String(urlParam));
                if (existsParam) initialId = String(existsParam._id);
              }
            } catch (_) {}

            if (!initialId) {
              initialId = String(props[0]._id);
            }

            setSelectedProperty(initialId);
          } catch (_) {
            setSelectedProperty(String(props[0]._id));
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchPropertyDetails = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/properties/${selectedProperty}/manage`, { credentials: 'include' });
      const data = await res.json();
      if (res.ok) {
        const p = data?.property || data;
        setPropertyData(p);
        setDescDraft({
          shortDescription: p?.shortDescription || '',
          description: p?.description || ''
        });
        setReservationDraft({
          cancellationPolicy: p?.cancellationPolicy || '',
          prepaymentRequired: !!p?.prepaymentRequired,
          minStayNights: Number(p?.minStayNights || 1)
        });
        setPolicyDraft({
          checkInTime: p?.checkInTime || '14:00',
          checkOutTime: p?.checkOutTime || '11:00',
          smokingAllowed: !!p?.smokingAllowed,
          petsAllowed: !!p?.petsAllowed,
          petPolicy: p?.petPolicy || '',
          roomRules: Array.isArray(p?.roomRules) ? (p.roomRules.join(', ')) : ''
        });
      }
    } catch (e) {
      toast.error('Failed to load property details');
    } finally {
      setLoading(false);
    }
  };

  const savePropertyFields = async (fields) => {
    if (!selectedProperty) return;
    try {
      setSaving(true);
      const res = await fetch(`${API_URL}/api/properties/${selectedProperty}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields)
      });
      const json = await res.json().catch(()=>({}));
      if (!res.ok) throw new Error(json.message || 'Failed to save');
      toast.success('Saved');
      await fetchPropertyDetails();
    } catch (e) {
      toast.error(e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleListing = async (isActive) => {
    if (!selectedProperty) return;
    try {
      setSaving(true);
      const res = await fetch(`${API_URL}/api/properties/${selectedProperty}/toggle-status`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive })
      });
      const json = await res.json().catch(()=>({}));
      if (!res.ok) {
        throw new Error(json.message || (isActive ? 'Failed to reopen listing' : 'Failed to close listing'));
      }
      toast.success(isActive ? 'Listing reopened successfully' : 'Listing closed successfully');
      await fetchPropertyDetails();
    } catch (e) {
      toast.error(e.message || 'Failed to update listing status');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProperty = async () => {
    if (!selectedProperty) return;
    if (!window.confirm('This will permanently delete this property if it has no bookings. Continue?')) return;
    try {
      setSaving(true);
      const res = await fetch(`${API_URL}/api/properties/${selectedProperty}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      const json = await res.json().catch(()=>({}));
      if (!res.ok) {
        toast.error(json.message || 'Failed to delete property');
        return;
      }
      toast.success(json.message || 'Property deleted successfully');
      await fetchProperties();
    } catch (e) {
      toast.error(e.message || 'Failed to delete property');
    } finally {
      setSaving(false);
    }
  };

  const saveRoomAmenities = async (roomId, amenities) => {
    try {
      const res = await fetch(`${API_URL}/api/properties/${selectedProperty}/rooms/${roomId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amenities })
      });
      const json = await res.json().catch(()=>({}));
      if (!res.ok) throw new Error(json.message || 'Failed to update room');
      toast.success('Room amenities updated');
      await fetchPropertyDetails();
    } catch (e) {
      toast.error(e.message || 'Failed to update room');
    }
  };

  const renderContent = () => {
    switch (view) {
      case 'quality-rating':
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <FaStar className="text-yellow-500" /> Quality Rating
            </h2>
            <div className="space-y-4">
              <div className="p-4 bg-yellow-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold">Overall Quality Score</span>
                  <span className="text-2xl font-bold text-yellow-600">{propertyData?.rating || stats?.overallRating || 'N/A'}/10</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-yellow-500 h-2 rounded-full" style={{ width: `${(propertyData?.rating || stats?.overallRating || 0) * 10}%` }}></div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 border rounded">
                  <p className="text-sm text-gray-600">Cleanliness</p>
                  <p className="text-lg font-bold">{stats?.cleanliness || propertyData?.rating || 'N/A'}</p>
                </div>
                <div className="p-3 border rounded">
                  <p className="text-sm text-gray-600">Accuracy</p>
                  <p className="text-lg font-bold">{stats?.accuracy || propertyData?.rating || 'N/A'}</p>
                </div>
                <div className="p-3 border rounded">
                  <p className="text-sm text-gray-600">Communication</p>
                  <p className="text-lg font-bold">{stats?.communication || propertyData?.rating || 'N/A'}</p>
                </div>
                <div className="p-3 border rounded">
                  <p className="text-sm text-gray-600">Location</p>
                  <p className="text-lg font-bold">{stats?.location || propertyData?.rating || 'N/A'}</p>
                </div>
              </div>
              <div className="mt-4 p-4 border rounded">
                <h3 className="font-semibold mb-2">Total Reviews</h3>
                <p className="text-3xl font-bold text-blue-600">{propertyData?.reviewCount || 0}</p>
              </div>
            </div>
          </div>
        );

      case 'reservation-policies':
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <FaFileAlt /> Reservation Policies
            </h2>
            <div className="space-y-4">
              <div className="p-4 border rounded">
                <label className="block text-sm font-medium mb-1">Cancellation Policy</label>
                <textarea className="w-full border rounded px-3 py-2" rows={3} value={reservationDraft.cancellationPolicy} onChange={(e)=> setReservationDraft(s=>({...s, cancellationPolicy: e.target.value}))} />
              </div>
              <div className="p-4 border rounded grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={reservationDraft.prepaymentRequired} onChange={(e)=> setReservationDraft(s=>({...s, prepaymentRequired: e.target.checked}))} /> Prepayment required</label>
                <div>
                  <label className="block text-sm font-medium mb-1">Minimum stay (nights)</label>
                  <input type="number" className="w-full border rounded px-3 py-2" min={1} value={reservationDraft.minStayNights} onChange={(e)=> setReservationDraft(s=>({...s, minStayNights: Math.max(1, Number(e.target.value)||1)}))} />
                </div>
              </div>
              <div>
                <button disabled={saving} onClick={()=> savePropertyFields(reservationDraft)} className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-60">{saving ? 'Saving…' : 'Save changes'}</button>
              </div>
            </div>
          </div>
        );

      case 'descriptions':
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <FaInfoCircle /> Descriptions
            </h2>
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : propertyData ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Short description</label>
                  <input className="w-full border rounded px-3 py-2" value={descDraft.shortDescription} onChange={(e)=> setDescDraft(s=>({...s, shortDescription: e.target.value}))} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Full description</label>
                  <textarea className="w-full border rounded px-3 py-2" rows={5} value={descDraft.description} onChange={(e)=> setDescDraft(s=>({...s, description: e.target.value}))} />
                </div>
                <div>
                  <button disabled={saving} onClick={()=> savePropertyFields(descDraft)} className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-60">{saving ? 'Saving…' : 'Save changes'}</button>
                </div>
              </div>
            ) : null}
          </div>
        );

      case 'page-score':
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <FaChartBar /> Property Page Score
            </h2>
            <div className="space-y-4">
              {(() => {
                const hasPhotos = (propertyData?.images?.length || 0) >= 10;
                const hasDescription = (propertyData?.description?.length || 0) > 50;
                const hasAmenities = (propertyData?.amenities?.length || 0) >= 5;
                const hasRules = (propertyData?.roomRules?.length || 0) > 0;
                const completeness = [hasPhotos, hasDescription, hasAmenities, hasRules].filter(Boolean).length * 25;
                
                return (
                  <>
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold">Page Completeness</span>
                        <span className="text-2xl font-bold text-blue-600">{completeness}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${completeness}%` }}></div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 border rounded">
                        <span>Photos (10+) - Current: {propertyData?.images?.length || 0}</span>
                        <span className={hasPhotos ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                          {hasPhotos ? '✓ Complete' : '✗ Add more'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded">
                        <span>Description ({propertyData?.description?.length || 0} chars)</span>
                        <span className={hasDescription ? 'text-green-600 font-medium' : 'text-yellow-600 font-medium'}>
                          {hasDescription ? '✓ Complete' : '⚠ Add more'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded">
                        <span>Amenities ({propertyData?.amenities?.length || 0})</span>
                        <span className={hasAmenities ? 'text-green-600 font-medium' : 'text-yellow-600 font-medium'}>
                          {hasAmenities ? '✓ Complete' : '⚠ Add more'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded">
                        <span>House Rules</span>
                        <span className={hasRules ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                          {hasRules ? '✓ Complete' : '✗ Missing'}
                        </span>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        );

      case 'general-info':
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <FaInfoCircle /> General Info & Property Status
            </h2>
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : propertyData ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-600">Property Name</label>
                    <p className="font-semibold">{propertyData.title || propertyData.name}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Status</label>
                    <p className="font-semibold capitalize">{propertyData.isActive === false ? 'Closed' : 'Active'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Category</label>
                    <p className="font-semibold capitalize">{propertyData.category}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Bedrooms</label>
                    <p className="font-semibold">{propertyData.bedrooms}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Bathrooms</label>
                    <p className="font-semibold">{propertyData.bathrooms}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Max Guests</label>
                    <p className="font-semibold">{propertyData.maxGuests || 'N/A'}</p>
                  </div>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Address</label>
                  <p className="font-semibold">{propertyData.address}, {propertyData.city}, {propertyData.country}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Description</label>
                  <p className="text-sm">{propertyData.description}</p>
                </div>
                <div className="pt-2 border-t mt-4">
                  <p className="text-sm text-gray-700 font-semibold mb-2">Manage listing status</p>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => {
                        const isClosed = propertyData && propertyData.isActive === false;
                        const confirmMsg = isClosed
                          ? 'This will reopen your listing for new bookings. Continue?'
                          : 'This will close your listing and stop new bookings. Continue?';
                        if (!window.confirm(confirmMsg)) return;
                        handleToggleListing(isClosed ? true : false);
                      }}
                      className={`px-4 py-2 rounded text-sm text-white disabled:opacity-60 ${propertyData && propertyData.isActive === false ? 'bg-green-600' : 'bg-yellow-600'}`}
                    >
                      {propertyData && propertyData.isActive === false ? 'Reopen listing' : 'Close listing'}
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={handleDeleteProperty}
                      className="px-4 py-2 rounded text-sm bg-red-600 text-white disabled:opacity-60"
                    >
                      Delete property
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        );

      case 'vat-tax':
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <FaMoneyBillWave /> VAT/Tax/Charges
            </h2>
            <p className="text-gray-600 mb-4">Manage tax settings and additional charges.</p>
            <div className="space-y-4">
              <div className="p-4 border rounded">
                <label className="block text-sm font-medium mb-2">VAT Rate (%)</label>
                <input type="number" className="w-full px-3 py-2 border rounded" placeholder="18" />
              </div>
              <div className="p-4 border rounded">
                <label className="block text-sm font-medium mb-2">Tourism Tax (RWF)</label>
                <input type="number" className="w-full px-3 py-2 border rounded" placeholder="5000" />
              </div>
              <div className="p-4 border rounded">
                <label className="block text-sm font-medium mb-2">Cleaning Fee (RWF)</label>
                <input type="number" className="w-full px-3 py-2 border rounded" placeholder="10000" />
              </div>
            </div>
          </div>
        );

      case 'add-ons':
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <FaMoneyBillWave /> Add-on services
            </h2>
            <p className="text-gray-600 mb-4 text-sm">Configure optional services like breakfast or airport transfer. These will appear in direct booking and use the 3% levy only.</p>
            <div className="space-y-3">
              {(addOnCatalog.length ? addOnCatalog : [
                { key: 'standard_breakfast', name: 'Standard breakfast', defaultPrice: 5000, defaultScope: 'per-booking' },
                { key: 'premium_breakfast', name: 'Premium breakfast', defaultPrice: 8000, defaultScope: 'per-booking' },
                { key: 'airport_transfer', name: 'Airport transfer', defaultPrice: 15000, defaultScope: 'per-booking' },
                { key: 'late_checkout', name: 'Late checkout', defaultPrice: 10000, defaultScope: 'per-booking' },
                { key: 'daily_cleaning', name: 'Daily cleaning', defaultPrice: 7000, defaultScope: 'per-night' },
              ]).map((opt) => {
                const existing = addOnServicesDraft.find(s => s.key === opt.key) || {};
                const enabled = existing.enabled ?? false;
                const price = existing.price != null ? existing.price : (opt.defaultPrice || 0);
                const scope = existing.scope || opt.defaultScope || 'per-booking';
                const selectedItems = existing.includedItems || {};
                return (
                  <div key={opt.key} className="p-3 border rounded flex flex-col gap-3">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div>
                        <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-800">
                          <input
                            type="checkbox"
                            className="mr-1"
                            checked={enabled}
                            onChange={(e) => {
                              const next = addOnServicesDraft.filter(s => s.key !== opt.key);
                              next.push({
                                key: opt.key,
                                name: opt.name,
                                enabled: e.target.checked,
                                price,
                                scope,
                                includedItems: selectedItems
                              });
                              setAddOnServicesDraft(next);
                            }}
                          />
                          {opt.name}
                        </label>
                        {opt.description && (
                          <p className="text-xs text-gray-500 mt-1">{opt.description}</p>
                        )}
                        <p className="text-[11px] text-gray-500 mt-1">
                          Choose how this service is charged, the price per unit, and which items are included at this property.
                        </p>
                      </div>
                      <div className="flex flex-col md:flex-row gap-2 md:items-center">
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Price (RWF)</label>
                          <input
                            type="number"
                            defaultValue={price}
                            className="w-full px-2 py-1 border rounded text-sm"
                            onBlur={(e) => {
                              const val = Number(e.target.value || 0);
                              const next = addOnServicesDraft.filter(s => s.key !== opt.key);
                              next.push({
                                key: opt.key,
                                name: opt.name,
                                enabled,
                                price: val,
                                scope,
                                includedItems: selectedItems
                              });
                              setAddOnServicesDraft(next);
                            }}
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Charge type</label>
                          <select
                            defaultValue={scope}
                            className="w-full px-2 py-1 border rounded text-sm"
                            onChange={(e) => {
                              const nextScope = e.target.value;
                              const next = addOnServicesDraft.filter(s => s.key !== opt.key);
                              next.push({
                                key: opt.key,
                                name: opt.name,
                                enabled,
                                price,
                                scope: nextScope,
                                includedItems: selectedItems
                              });
                              setAddOnServicesDraft(next);
                            }}
                          >
                            <option value="per-booking">Per booking</option>
                            <option value="per-night">Per night</option>
                            <option value="per-guest">Per guest</option>
                          </select>
                        </div>
                      </div>
                    </div>
                    {Array.isArray(opt.includedItems) && opt.includedItems.length > 0 && (
                      <div className="border-t pt-2 mt-1">
                        <div className="text-[11px] text-gray-600 font-semibold mb-1 uppercase tracking-wide">
                          Included items (select what this property offers)
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                          {opt.includedItems.map((item) => {
                            const checked = selectedItems[item.key] ?? item.defaultIncluded ?? false;
                            return (
                              <label key={item.key} className="inline-flex items-center gap-2 text-xs text-gray-700">
                                <input
                                  type="checkbox"
                                  className="h-3 w-3"
                                  checked={checked}
                                  onChange={(e) => {
                                    const nextIncluded = { ...selectedItems, [item.key]: e.target.checked };
                                    const next = addOnServicesDraft.filter(s => s.key !== opt.key);
                                    next.push({
                                      key: opt.key,
                                      name: opt.name,
                                      enabled,
                                      price,
                                      scope,
                                      includedItems: nextIncluded
                                    });
                                    setAddOnServicesDraft(next);
                                  }}
                                />
                                <span>{item.label}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex justify-end">
              <button
                disabled={saving}
                onClick={() => handleSaveAddOnServices(addOnServicesDraft)}
                className="px-4 py-2 rounded bg-blue-600 text-white text-sm disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Save add-on services'}
              </button>
            </div>
          </div>
        );

      case 'photos':
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <FaImages /> Photos
            </h2>
            {propertyData?.images?.length > 0 ? (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-4">
                  {propertyData.images.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="relative aspect-video rounded-lg overflow-hidden border bg-gray-100 focus:outline-none"
                      onClick={() => setPhotoLightbox({ open: true, index: idx })}
                    >
                      <img src={img} alt={`Property ${idx + 1}`} className="w-full h-full object-cover" />
                      <span className="absolute bottom-1 left-1 bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded">
                        View
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPropertyData(prev => {
                            if (!prev) return prev;
                            const imgs = Array.isArray(prev.images) ? prev.images : [];
                            return { ...prev, images: imgs.filter((_, i) => i !== idx) };
                          });
                        }}
                        className="absolute top-2 right-2 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded"
                      >
                        Remove
                      </button>
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="property-new-image"
                    type="text"
                    placeholder="Add image URL"
                    className="flex-1 border rounded px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const input = document.getElementById('property-new-image');
                      const value = input && 'value' in input ? String(input.value || '').trim() : '';
                      if (!value) return;
                      setPropertyData(prev => {
                        if (!prev) return prev;
                        const imgs = Array.isArray(prev.images) ? prev.images : [];
                        return { ...prev, images: [...imgs, value] };
                      });
                      if (input) input.value = '';
                    }}
                    className="px-3 py-2 rounded bg-blue-600 text-white text-sm"
                  >
                    Add image
                  </button>
                </div>
                <div>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => savePropertyFields({ images: Array.isArray(propertyData.images) ? propertyData.images : [] })}
                    className="px-4 py-2 rounded bg-blue-600 text-white text-sm disabled:opacity-60"
                  >
                    {saving ? 'Saving…' : 'Save photos'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-gray-600">No photos uploaded yet.</p>
                <div className="flex items-center gap-2">
                  <input
                    id="property-new-image"
                    type="text"
                    placeholder="Add first image URL"
                    className="flex-1 border rounded px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const input = document.getElementById('property-new-image');
                      const value = input && 'value' in input ? String(input.value || '').trim() : '';
                      if (!value) return;
                      setPropertyData(prev => {
                        if (!prev) return prev;
                        return { ...prev, images: [value] };
                      });
                      if (input) input.value = '';
                    }}
                    className="px-3 py-2 rounded bg-blue-600 text-white text-sm"
                  >
                    Add image
                  </button>
                </div>
              </div>
            )}
            {photoLightbox.open && Array.isArray(propertyData?.images) && propertyData.images.length > 0 && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
                <button
                  type="button"
                  className="absolute inset-0"
                  onClick={() => setPhotoLightbox({ open: false, index: 0 })}
                />
                <div className="relative max-w-5xl w-full px-4">
                  <div className="relative bg-black rounded-lg overflow-hidden shadow-2xl flex items-center justify-center">
                    <img
                      src={propertyData.images[photoLightbox.index]}
                      alt={`Property ${photoLightbox.index + 1}`}
                      className="max-h-[80vh] w-full object-contain bg-black"
                    />
                    <button
                      type="button"
                      className="absolute top-3 right-3 bg-black/70 text-white rounded-full px-3 py-1 text-xs"
                      onClick={() => setPhotoLightbox({ open: false, index: 0 })}
                    >
                      Close
                    </button>
                    {propertyData.images.length > 1 && (
                      <>
                        <button
                          type="button"
                          className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/70 text-white rounded-full w-8 h-8 flex items-center justify-center text-lg"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPhotoLightbox(prev => ({
                              open: true,
                              index: (prev.index - 1 + propertyData.images.length) % propertyData.images.length
                            }));
                          }}
                        >
                          <span>{'<'}</span>
                        </button>
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/70 text-white rounded-full w-8 h-8 flex items-center justify-center text-lg"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPhotoLightbox(prev => ({
                              open: true,
                              index: (prev.index + 1) % propertyData.images.length
                            }));
                          }}
                        >
                          <span>{'>'}</span>
                        </button>
                      </>
                    )}
                  </div>
                  <div className="mt-3 text-center text-xs text-gray-200">
                    Photo {photoLightbox.index + 1} of {propertyData.images.length}
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 'policies':
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <FaFileAlt /> Property Policies
            </h2>
            {propertyData ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded">
                    <label className="block text-sm font-medium mb-1">Check-in time</label>
                    <input type="time" className="w-full border rounded px-3 py-2" value={policyDraft.checkInTime} onChange={(e)=> setPolicyDraft(s=>({...s, checkInTime: e.target.value}))} />
                  </div>
                  <div className="p-4 border rounded">
                    <label className="block text-sm font-medium mb-1">Check-out time</label>
                    <input type="time" className="w-full border rounded px-3 py-2" value={policyDraft.checkOutTime} onChange={(e)=> setPolicyDraft(s=>({...s, checkOutTime: e.target.value}))} />
                  </div>
                </div>
                <div className="p-4 border rounded grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                  <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={policyDraft.smokingAllowed} onChange={(e)=> setPolicyDraft(s=>({...s, smokingAllowed: e.target.checked}))} /> Smoking allowed</label>
                  <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={policyDraft.petsAllowed} onChange={(e)=> setPolicyDraft(s=>({...s, petsAllowed: e.target.checked}))} /> Pets allowed</label>
                </div>
                <div className="p-4 border rounded">
                  <label className="block text-sm font-medium mb-1">Pet policy</label>
                  <textarea className="w-full border rounded px-3 py-2" rows={3} value={policyDraft.petPolicy} onChange={(e)=> setPolicyDraft(s=>({...s, petPolicy: e.target.value}))} />
                </div>
                <div className="p-4 border rounded">
                  <label className="block text-sm font-medium mb-1">House rules (comma separated)</label>
                  <input className="w-full border rounded px-3 py-2" value={policyDraft.roomRules} onChange={(e)=> setPolicyDraft(s=>({...s, roomRules: e.target.value}))} placeholder="no_smoking, no_parties" />
                  <div className="text-xs text-gray-500 mt-1">Examples: no_smoking, quiet_hours_after_10pm</div>
                </div>
                <div>
                  <button
                    disabled={saving}
                    onClick={()=>{
                      const payload = {
                        checkInTime: policyDraft.checkInTime,
                        checkOutTime: policyDraft.checkOutTime,
                        smokingAllowed: !!policyDraft.smokingAllowed,
                        petsAllowed: !!policyDraft.petsAllowed,
                        petPolicy: policyDraft.petPolicy,
                        roomRules: String(policyDraft.roomRules||'').split(',').map(s=>s.trim()).filter(Boolean)
                      };
                      savePropertyFields(payload);
                    }}
                    className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-60"
                  >{saving ? 'Saving…' : 'Save policies'}</button>
                </div>
              </div>
            ) : (
              <p className="text-gray-600">Loading…</p>
            )}
          </div>
        );

      case 'facilities':
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <FaBed /> Facilities & Services
            </h2>
            {propertyData ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
                  {propertyAmenityOptions.map(opt => {
                    const a = opt.slug || opt.name;
                    const checked = Array.isArray(propertyData.amenities) && propertyData.amenities.includes(a);
                    return (
                      <label key={a} className="inline-flex items-center gap-2 text-sm" title={opt.description || (opt.name || a)}>
                        <input
                          type="checkbox"
                          checked={!!checked}
                          onChange={() => {
                            const cur = Array.isArray(propertyData.amenities) ? propertyData.amenities : [];
                            const next = checked ? cur.filter(x=>x!==a) : [...cur, a];
                            setPropertyData(prev => ({ ...prev, amenities: next }));
                          }}
                        />
                        <span className="capitalize">{(opt.name || a).replace('_',' ')}</span>
                      </label>
                    );
                  })}
                </div>
                <button disabled={saving} onClick={()=> savePropertyFields({ amenities: propertyData.amenities || [] })} className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-60">{saving ? 'Saving…' : 'Save amenities'}</button>
              </>
            ) : (
              <p className="text-gray-600">Loading…</p>
            )}
          </div>
        );

      case 'room-amenities':
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <FaBed /> Room Amenities
            </h2>
            {Array.isArray(propertyData?.rooms) && propertyData.rooms.length > 0 ? (
              <div className="space-y-4">
                {propertyData.rooms.map((room, idx) => {
                  const current = Array.isArray(room.amenities) ? room.amenities : [];
                  const toggle = (a) => {
                    const next = current.includes(a) ? current.filter(x=>x!==a) : [...current, a];
                    setPropertyData(prev => ({
                      ...prev,
                      rooms: prev.rooms.map((r, i)=> i===idx ? { ...r, amenities: next } : r)
                    }));
                  };
                  return (
                    <div key={room._id || idx} className="p-4 border rounded">
                      <h3 className="font-semibold mb-2">{room.roomType || room.type} - {room.roomNumber}</h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {roomAmenityOptions.map(opt => {
                          const a = opt.slug || opt.name;
                          const checked = current.includes(a);
                          return (
                            <label key={a} className="inline-flex items-center gap-2 text-sm" title={opt.description || (opt.name || a)}>
                              <input type="checkbox" checked={checked} onChange={()=>toggle(a)} />
                              <span className="capitalize">{(opt.name || a).replace('_',' ')}</span>
                            </label>
                          );
                        })}
                      </div>
                      <div className="mt-2">
                        <button onClick={()=> saveRoomAmenities(room._id, Array.isArray(propertyData.rooms[idx].amenities) ? propertyData.rooms[idx].amenities : [])} className="px-3 py-2 border rounded">Save Room Amenities</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-600">No rooms configured.</p>
            )}
          </div>
        );

      case 'room-details':
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <FaBed /> Room Details
            </h2>
            {propertyData?.rooms?.length > 0 ? (
              <>
                {/* Availability / Accommodation type summary table */}
                <div className="mb-6 border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-blue-900 text-white text-xs sm:text-sm font-semibold px-4 py-2 flex">
                    <div className="flex-1">Accommodation type</div>
                    <div className="w-32 text-center hidden sm:block">Number of guests</div>
                    <div className="w-32 text-center">Actions</div>
                  </div>
                  <div className="divide-y divide-gray-200 bg-white text-xs sm:text-sm">
                    {propertyData.rooms.map((room, idx) => {
                      const roomKey = room._id || idx;
                      const beds = room.beds || {};
                      const bedParts = [];
                      const pushBed = (count, label) => {
                        if (!count) return;
                        bedParts.push(`${count} ${label}${count > 1 ? 's' : ''}`);
                      };
                      pushBed(beds.twin, 'twin bed');
                      pushBed(beds.full, 'full bed');
                      pushBed(beds.queen, 'queen bed');
                      pushBed(beds.king, 'king bed');
                      pushBed(beds.bunk, 'bunk bed');
                      pushBed(beds.sofa, 'sofa bed');
                      pushBed(beds.futon, 'futon');
                      const bedText = bedParts.length ? bedParts.join(' · ') : `${room.capacity || 1} bed${(room.capacity || 1) > 1 ? 's' : ''}`;
                      const adults = Number(room.maxAdults || 0);
                      const children = Number(room.maxChildren || 0);
                      const infants = Number(room.maxInfants || 0);
                      const totalGuests = adults + children + infants || room.capacity || 1;
                      return (
                        <div key={roomKey} className="flex flex-col sm:flex-row items-stretch">
                          <div className="flex-1 px-4 py-3">
                            <div className="text-blue-800 font-semibold text-sm">
                              {room.roomType || room.type || 'Room'} {room.roomNumber ? `- ${room.roomNumber}` : ''}
                            </div>
                            <div className="text-[11px] text-gray-600 mt-0.5 flex items-center gap-1">
                              <FaBed className="inline-block" />
                              <span>{bedText}</span>
                            </div>
                          </div>
                          <div className="w-full sm:w-32 px-4 py-3 flex items-center justify-start sm:justify-center border-t sm:border-t-0 sm:border-l border-gray-200 text-gray-800 text-xs">
                            <div className="flex items-center gap-1">
                              <FaUser className="text-gray-600" />
                              <span>x {totalGuests}</span>
                            </div>
                          </div>
                          <div className="w-full sm:w-32 px-4 py-3 flex items-center justify-end sm:justify-center border-t sm:border-t-0 sm:border-l border-gray-200">
                            <button
                              type="button"
                              className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
                              onClick={() => {
                                // this can be wired to open a pricing/availability view for this room
                                toast?.success('Use the Pricing & booking calendar to adjust prices for this room type.');
                              }}
                            >
                              Show prices
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {propertyData.rooms.map((room, idx) => {
                  const roomKey = room._id || idx;
                  const isExpanded = expandedRoomId === roomKey;
                  const totalPeople = (Number(room.maxAdults || 0) + Number(room.maxChildren || 0) + Number(room.maxInfants || 0)) || room.capacity || 'N/A';
                  return (
                    <div key={roomKey} className="border rounded-lg p-4 flex flex-col gap-3">
                      <div className="flex items-start gap-3">
                        {Array.isArray(room.images) && room.images.length > 0 && (
                          <div className="w-24 h-24 rounded overflow-hidden border bg-gray-100 flex-shrink-0">
                            <img
                              src={room.images[0]}
                              alt={room.roomType || `Room ${room.roomNumber}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{room.roomType || room.type} - {room.roomNumber}</h3>
                          <p className="text-xs text-gray-500">Room ID: {room._id || 'N/A'}</p>
                          <p className="text-xs text-gray-500 mt-1">Capacity: {room.capacity || 1} guests · Max people: {totalPeople}</p>
                          <p className="text-xs text-gray-500">Rate: RWF {Number(room.pricePerNight || 0).toLocaleString()}</p>
                        </div>
                      </div>

                      <div className="flex justify-between items-center mt-1 text-xs text-gray-500">
                        <span>{Array.isArray(room.amenities) ? `${room.amenities.length} amenities` : 'No amenities set'}</span>
                        <button
                          type="button"
                          onClick={() => setExpandedRoomId(isExpanded ? null : roomKey)}
                          className="text-xs px-3 py-1 rounded-full border border-gray-300 hover:bg-gray-50"
                        >
                          {isExpanded ? 'Hide details' : 'View details'}
                        </button>
                      </div>

                      {isExpanded && (
                        <div className="mt-3 space-y-3 border-t pt-3">
                          {Array.isArray(room.images) && room.images.length > 0 && (
                            <div>
                              <div className="text-xs font-semibold text-gray-600 mb-1">Room images</div>
                              <div className="grid grid-cols-3 gap-2 mb-2">
                                {room.images.slice(0, 6).map((img, i) => (
                                  <div key={i} className="relative aspect-video rounded overflow-hidden border bg-gray-100">
                                    <img src={img} alt={`${room.roomType || 'Room'} image ${i + 1}`} className="w-full h-full object-cover" />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setPropertyData(prev => {
                                          if (!prev) return prev;
                                          const nextRooms = prev.rooms.map((r, rIdx) => {
                                            if (rIdx !== idx) return r;
                                            const imgs = Array.isArray(r.images) ? r.images : [];
                                            return { ...r, images: imgs.filter((_, imgIdx) => imgIdx !== i) };
                                          });
                                          return { ...prev, rooms: nextRooms };
                                        });
                                      }}
                                      className="absolute top-1 right-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                ))}
                              </div>
                              <div className="space-y-2">
                                <div className="flex gap-2 items-center">
                                  <input
                                    id={`newImage-${room._id}`}
                                    type="text"
                                    placeholder="Add image URL"
                                    className="flex-1 border rounded px-2 py-1 text-xs"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const input = document.getElementById(`newImage-${room._id}`);
                                      const value = input && 'value' in input ? String(input.value || '').trim() : '';
                                      if (!value) return;
                                      setPropertyData(prev => {
                                        if (!prev) return prev;
                                        const nextRooms = prev.rooms.map((r, rIdx) => {
                                          if (rIdx !== idx) return r;
                                          const imgs = Array.isArray(r.images) ? r.images : [];
                                          return { ...r, images: [...imgs, value] };
                                        });
                                        return { ...prev, rooms: nextRooms };
                                      });
                                      if (input) input.value = '';
                                    }}
                                    className="px-2 py-1 rounded bg-blue-600 text-white text-xs"
                                  >
                                    Add image
                                  </button>
                                </div>
                                <div className="flex items-center gap-2 text-[11px] text-gray-600">
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="text-xs"
                                    onChange={async (e) => {
                                      const file = e.target.files && e.target.files[0];
                                      if (!file) return;
                                      try {
                                        const formData = new FormData();
                                        formData.append('images', file);
                                        const res = await fetch(`${API_URL}/api/properties/upload/images`, {
                                          method: 'POST',
                                          credentials: 'include',
                                          body: formData
                                        });
                                        const data = await res.json().catch(() => ({}));
                                        if (!res.ok || !Array.isArray(data.imageUrls) || !data.imageUrls.length) {
                                          toast.error(data.message || 'Failed to upload image');
                                          return;
                                        }
                                        const urls = data.imageUrls;
                                        setPropertyData(prev => {
                                          if (!prev) return prev;
                                          const nextRooms = prev.rooms.map((r, rIdx) => {
                                            if (rIdx !== idx) return r;
                                            const imgs = Array.isArray(r.images) ? r.images : [];
                                            return { ...r, images: [...imgs, ...urls] };
                                          });
                                          return { ...prev, rooms: nextRooms };
                                        });
                                      } catch (err) {
                                        toast.error('Image upload failed');
                                      } finally {
                                        e.target.value = '';
                                      }
                                    }}
                                  />
                                  <span>or upload from device</span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Room core fields */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">Capacity (guests)</label>
                              <input
                                id={`capacity-${room._id}`}
                                type="number"
                                defaultValue={room.capacity || 1}
                                min={1}
                                className="w-full border rounded px-3 py-2"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">Rate per night (RWF)</label>
                              <input
                                id={`rate-${room._id}`}
                                type="number"
                                defaultValue={room.pricePerNight || 0}
                                min={0}
                                className="w-full border rounded px-3 py-2"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">Max adults</label>
                              <input
                                id={`maxAdults-${room._id}`}
                                type="number"
                                defaultValue={room.maxAdults ?? ''}
                                min={0}
                                className="w-full border rounded px-3 py-2"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">Max children</label>
                              <input
                                id={`maxChildren-${room._id}`}
                                type="number"
                                defaultValue={room.maxChildren ?? ''}
                                min={0}
                                className="w-full border rounded px-3 py-2"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">Max infants</label>
                              <input
                                id={`maxInfants-${room._id}`}
                                type="number"
                                defaultValue={room.maxInfants ?? ''}
                                min={0}
                                className="w-full border rounded px-3 py-2"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">Bathroom type</label>
                              <select
                                id={`bathroomType-${room._id}`}
                                defaultValue={room.bathroomType || 'inside'}
                                className="w-full border rounded px-3 py-2 text-xs capitalize"
                              >
                                <option value="inside">Inside</option>
                                <option value="attached">Attached</option>
                                <option value="shared">Shared</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">Bathrooms in this room</label>
                              <input
                                id={`bathrooms-${room._id}`}
                                type="number"
                                defaultValue={room.bathrooms ?? 1}
                                min={0}
                                className="w-full border rounded px-3 py-2"
                              />
                            </div>
                          </div>

                          {/* Bed configuration */}
                          <div>
                            <div className="text-xs font-semibold text-gray-600 mb-2">Bed configuration</div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                              {['twin', 'full', 'queen', 'king', 'bunk', 'sofa', 'futon'].map(bedType => (
                                <div key={bedType}>
                                  <label className="block text-xs text-gray-600 mb-1 capitalize">{bedType} beds</label>
                                  <input
                                    id={`beds-${bedType}-${room._id}`}
                                    type="number"
                                    defaultValue={room.beds?.[bedType] || 0}
                                    min={0}
                                    className="w-full border rounded px-3 py-2"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Save button */}
                          <div className="pt-3 border-t">
                            <button
                              type="button"
                              onClick={async () => {
                                const updates = {
                                  capacity: Number(document.getElementById(`capacity-${room._id}`)?.value || 1),
                                  pricePerNight: Number(document.getElementById(`rate-${room._id}`)?.value || 0),
                                  maxAdults: Number(document.getElementById(`maxAdults-${room._id}`)?.value || 0),
                                  maxChildren: Number(document.getElementById(`maxChildren-${room._id}`)?.value || 0),
                                  maxInfants: Number(document.getElementById(`maxInfants-${room._id}`)?.value || 0),
                                  bathroomType: document.getElementById(`bathroomType-${room._id}`)?.value || 'inside',
                                  bathrooms: Number(document.getElementById(`bathrooms-${room._id}`)?.value || 1),
                                  beds: {
                                    twin: Number(document.getElementById(`beds-twin-${room._id}`)?.value || 0),
                                    full: Number(document.getElementById(`beds-full-${room._id}`)?.value || 0),
                                    queen: Number(document.getElementById(`beds-queen-${room._id}`)?.value || 0),
                                    king: Number(document.getElementById(`beds-king-${room._id}`)?.value || 0),
                                    bunk: Number(document.getElementById(`beds-bunk-${room._id}`)?.value || 0),
                                    sofa: Number(document.getElementById(`beds-sofa-${room._id}`)?.value || 0),
                                    futon: Number(document.getElementById(`beds-futon-${room._id}`)?.value || 0)
                                  },
                                  images: Array.isArray(propertyData.rooms[idx].images) ? propertyData.rooms[idx].images : []
                                };
                                try {
                                  const res = await fetch(`${API_URL}/api/properties/${selectedProperty}/rooms/${room._id}`, {
                                    method: 'PUT',
                                    credentials: 'include',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify(updates)
                                  });
                                  const json = await res.json().catch(()=>({}));
                                  if (!res.ok) throw new Error(json.message || 'Failed to update room');
                                  toast.success('Room updated successfully');
                                  await fetchPropertyDetails();
                                } catch (e) {
                                  toast.error(e.message || 'Failed to update room');
                                }
                              }}
                              className="px-4 py-2 rounded bg-blue-600 text-white text-sm hover:bg-blue-700"
                            >
                              Save room details
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                </div>
              </>
            ) : (
              <p className="text-gray-600">No rooms configured for this property.</p>
            )}
          </div>
        );

      case 'profile':
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <FaUser /> Your Profile
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">First Name</label>
                  <input
                    type="text"
                    className="w-full border rounded px-3 py-2"
                    value={profileDraft.firstName}
                    onChange={(e) => setProfileDraft(s => ({...s, firstName: e.target.value}))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Last Name</label>
                  <input
                    type="text"
                    className="w-full border rounded px-3 py-2"
                    value={profileDraft.lastName}
                    onChange={(e) => setProfileDraft(s => ({...s, lastName: e.target.value}))}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Phone</label>
                <input
                  type="tel"
                  className="w-full border rounded px-3 py-2"
                  value={profileDraft.phone}
                  onChange={(e) => setProfileDraft(s => ({...s, phone: e.target.value}))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Bio</label>
                <textarea
                  className="w-full border rounded px-3 py-2"
                  rows={4}
                  value={profileDraft.bio}
                  onChange={(e) => setProfileDraft(s => ({...s, bio: e.target.value}))}
                  placeholder="Tell guests about yourself..."
                />
              </div>
              <div>
                <button
                  disabled={saving}
                  onClick={saveProfile}
                  className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-60"
                >
                  {saving ? 'Saving…' : 'Save profile'}
                </button>
              </div>
            </div>
          </div>
        );

      case 'sustainability':
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <FaLeaf className="text-green-600" /> Sustainability
            </h2>
            <div className="space-y-4">
              <div className="p-4 bg-green-50 rounded-lg">
                <h3 className="font-semibold text-green-800 mb-2">Environmental Practices</h3>
                <p className="text-sm text-green-700 mb-3">
                  Show guests your commitment to sustainability and environmental responsibility.
                </p>
                <div className="space-y-2">
                  {[
                    'Energy-efficient lighting',
                    'Water conservation measures',
                    'Recycling program',
                    'Local sourcing',
                    'Renewable energy',
                    'Waste reduction initiatives'
                  ].map(practice => (
                    <label key={practice} className="inline-flex items-center gap-2 text-sm">
                      <input type="checkbox" className="text-green-600" />
                      <span>{practice}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="p-4 border rounded">
                <label className="block text-sm font-medium mb-2">Sustainability Description</label>
                <textarea
                  className="w-full border rounded px-3 py-2"
                  rows={4}
                  placeholder="Describe your property's sustainability initiatives..."
                />
              </div>
              <button className="px-4 py-2 rounded bg-green-600 text-white">
                Save sustainability info
              </button>
            </div>
          </div>
        );

      default:
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Property Management</h2>
            <p className="text-gray-600">Select a view from the navigation menu to manage your property.</p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Property Management</h1>
          <p className="text-gray-600">Manage your property details, amenities, and settings.</p>
        </div>

        {/* Property Selector */}
        {properties.length > 0 && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Property
            </label>
            <select
              value={selectedProperty}
              onChange={(e) => setSelectedProperty(e.target.value)}
              className="w-full max-w-md border border-gray-300 rounded-md px-3 py-2 bg-white"
            >
              {properties.map(property => (
                <option key={property._id} value={property._id}>
                  {property.title || property.name} - {property.city}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Navigation Menu */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 overflow-x-auto">
              {[
                { key: 'general-info', label: 'General Info', icon: FaInfoCircle },
                { key: 'quality-rating', label: 'Quality Rating', icon: FaStar },
                { key: 'page-score', label: 'Page Score', icon: FaChartBar },
                { key: 'vat-tax', label: 'VAT/Tax', icon: FaMoneyBillWave },
                { key: 'photos', label: 'Photos', icon: FaImages },
                { key: 'policies', label: 'Policies', icon: FaFileAlt },
                { key: 'reservation-policies', label: 'Reservations', icon: FaFileAlt },
                { key: 'facilities', label: 'Facilities', icon: FaBed },
                { key: 'room-details', label: 'Room Details', icon: FaBed },
                { key: 'room-amenities', label: 'Room Amenities', icon: FaBed },
                { key: 'descriptions', label: 'Descriptions', icon: FaInfoCircle },
                { key: 'add-ons', label: 'Add-ons', icon: FaMoneyBillWave },
                { key: 'profile', label: 'Profile', icon: FaUser },
                { key: 'sustainability', label: 'Sustainability', icon: FaLeaf }
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => {
                    const url = new URL(window.location);
                    url.searchParams.set('view', key);
                    window.history.pushState({}, '', url);
                    window.location.reload();
                  }}
                  className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                    view === key
                      ? 'border-[#a06b42] text-[#a06b42]'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Content */}
        {renderContent()}
      </div>
    </div>
  );
}
