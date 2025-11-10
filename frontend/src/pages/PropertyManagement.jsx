import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    fetchProperties();
  }, []);

  useEffect(() => {
    if (selectedProperty) {
      fetchPropertyDetails();
      if (view === 'quality-rating' || view === 'page-score') {
        fetchPropertyStats();
      }
    }
  }, [selectedProperty, view]);

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

  const fetchProperties = async () => {
    try {
      const res = await fetch(`${API_URL}/api/properties/my-properties`, { credentials: 'include' });
      const data = await res.json();
      if (res.ok) {
        setProperties(data.properties || []);
        if (data.properties?.length > 0) {
          setSelectedProperty(data.properties[0]._id);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchPropertyDetails = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/properties/${selectedProperty}`, { credentials: 'include' });
      const data = await res.json();
      if (res.ok) {
        setPropertyData(data);
      }
    } catch (e) {
      toast.error('Failed to load property details');
    } finally {
      setLoading(false);
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
                <h3 className="font-semibold mb-2">Cancellation Policy</h3>
                <p className="text-sm text-gray-600">{propertyData?.cancellationPolicy || 'Refer to property policy details.'}</p>
              </div>
              <div className="p-4 border rounded">
                <h3 className="font-semibold mb-2">Prepayment</h3>
                <p className="text-sm text-gray-600">{propertyData?.prepaymentRequired ? 'Prepayment required' : 'No prepayment required'}</p>
              </div>
              <div className="p-4 border rounded">
                <h3 className="font-semibold mb-2">Minimum stay</h3>
                <p className="text-sm text-gray-600">{propertyData?.minStayNights != null ? `${propertyData.minStayNights} night(s)` : 'Not set'}</p>
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
                  <label className="text-sm text-gray-600">Short description</label>
                  <p className="text-sm">{propertyData.shortDescription || '—'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Full description</label>
                  <p className="text-sm whitespace-pre-line">{propertyData.description || '—'}</p>
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
                    <p className="font-semibold capitalize">{propertyData.status || 'Active'}</p>
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

      case 'photos':
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <FaImages /> Photos
            </h2>
            {propertyData?.images?.length > 0 ? (
              <div className="grid grid-cols-3 gap-4">
                {propertyData.images.map((img, idx) => (
                  <div key={idx} className="aspect-video rounded-lg overflow-hidden border">
                    <img src={img} alt={`Property ${idx + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600">No photos uploaded yet.</p>
            )}
          </div>
        );

      case 'policies':
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <FaFileAlt /> Property Policies
            </h2>
            <div className="space-y-4">
              <div className="p-4 border rounded">
                <h3 className="font-semibold mb-2">Check-in/Check-out</h3>
                <p className="text-sm text-gray-600">Check-in: 2:00 PM - 10:00 PM</p>
                <p className="text-sm text-gray-600">Check-out: 11:00 AM</p>
              </div>
              <div className="p-4 border rounded">
                <h3 className="font-semibold mb-2">Cancellation Policy</h3>
                <p className="text-sm text-gray-600">Free cancellation up to 48 hours before check-in</p>
              </div>
              <div className="p-4 border rounded">
                <h3 className="font-semibold mb-2">House Rules</h3>
                <ul className="text-sm text-gray-600 list-disc list-inside">
                  <li>No smoking</li>
                  <li>No pets</li>
                  <li>No parties or events</li>
                </ul>
              </div>
            </div>
          </div>
        );

      case 'facilities':
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <FaBed /> Facilities & Services
            </h2>
            {propertyData?.amenities?.length > 0 ? (
              <div className="grid grid-cols-3 gap-3">
                {propertyData.amenities.map((amenity, idx) => (
                  <div key={idx} className="p-3 border rounded text-sm capitalize">
                    {amenity.replace(/_/g, ' ')}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600">No amenities listed.</p>
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
                {propertyData.rooms.map((room, idx) => (
                  <div key={idx} className="p-4 border rounded">
                    <h3 className="font-semibold mb-2">{room.roomType || room.type} - {room.roomNumber}</h3>
                    {Array.isArray(room.amenities) && room.amenities.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {room.amenities.map((a, i) => (
                          <span key={i} className="px-2 py-1 bg-gray-100 rounded text-xs capitalize">{String(a).replace(/_/g,' ')}</span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-600">No room amenities listed.</p>
                    )}
                  </div>
                ))}
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
              <div className="space-y-4">
                {propertyData.rooms.map((room, idx) => (
                  <div key={idx} className="p-4 border rounded">
                    <h3 className="font-semibold">{room.roomType || room.type} - {room.roomNumber}</h3>
                    <p className="text-sm text-gray-600">Capacity: {room.capacity} guests</p>
                    <p className="text-sm text-gray-600">Rate: RWF {room.pricePerNight?.toLocaleString()}/night</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600">No rooms configured.</p>
            )}
          </div>
        );

      case 'profile':
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <FaUser /> Your Profile
            </h2>
            <p className="text-gray-600">Manage your host profile and contact information.</p>
            <div className="mt-4 p-4 bg-blue-50 rounded">
              <p className="text-sm">Feature coming soon - Edit host profile</p>
            </div>
          </div>
        );

      case 'sustainability':
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <FaLeaf className="text-green-600" /> Sustainability
            </h2>
            <p className="text-gray-600">Highlight your eco-friendly practices and certifications.</p>
            <div className="mt-4 p-4 bg-green-50 rounded">
              <p className="text-sm">Feature coming soon - Sustainability features</p>
            </div>
          </div>
        );

      default:
        return <div>Select a view</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Property Management</h1>
        
        {/* Property Selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Select Property</label>
          <select
            value={selectedProperty}
            onChange={(e) => setSelectedProperty(e.target.value)}
            className="w-full max-w-md px-4 py-2 border rounded-lg"
          >
            {properties.map(p => (
              <option key={p._id} value={p._id}>{p.title || p.name}</option>
            ))}
          </select>
        </div>

        {renderContent()}
      </div>
    </div>
  );
}
