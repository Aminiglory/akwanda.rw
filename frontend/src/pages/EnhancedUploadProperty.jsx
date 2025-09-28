import React, { useState, useEffect } from 'react';
import { FaPlus, FaTrash, FaUpload, FaBed, FaBath, FaMapMarkerAlt, FaDollarSign, FaStar, FaSave, FaTimes } from 'react-icons/fa';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const EnhancedUploadProperty = () => {
  const navigate = useNavigate();
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
    featuredUntil: ''
  });

  const [rooms, setRooms] = useState([]);
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);

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
        commissionRate: data.property.commissionRate || 10,
        visibilityLevel: data.property.visibilityLevel || 'standard',
        featuredUntil: data.property.featuredUntil ? new Date(data.property.featuredUntil).toISOString().split('T')[0] : ''
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

      const res = await fetch(`${API_URL}/api/upload/images`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to upload images');

      setImages(prev => [...prev, ...data.imageUrls]);
      toast.success('Images uploaded successfully');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title || !formData.address || !formData.city || !formData.pricePerNight) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (images.length === 0) {
      toast.error('Please upload at least one image');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        ...formData,
        pricePerNight: Number(formData.pricePerNight),
        bedrooms: Number(formData.bedrooms),
        bathrooms: Number(formData.bathrooms),
        groupBookingDiscount: Number(formData.groupBookingDiscount),
        commissionRate: Number(formData.commissionRate),
        images,
        rooms,
        featuredUntil: formData.featuredUntil ? new Date(formData.featuredUntil).toISOString() : null
      };

      const url = isEditing ? `${API_URL}/api/properties/${editId}` : `${API_URL}/api/properties`;
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include'
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to save property');

      toast.success(isEditing ? 'Property updated successfully' : 'Property created successfully');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
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
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <FaTimes className="text-xl" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Information */}
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 border-b pb-2">Basic Information</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Property Title *
                  </label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category *
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    {categories.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Describe your property..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address *
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter full address"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    City *
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter city"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Pricing & Details */}
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 border-b pb-2">Pricing & Details</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price per Night (RWF) *
                  </label>
                  <input
                    type="number"
                    name="pricePerNight"
                    value={formData.pricePerNight}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0"
                    min="0"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bedrooms
                  </label>
                  <input
                    type="number"
                    name="bedrooms"
                    value={formData.bedrooms}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bathrooms
                  </label>
                  <input
                    type="number"
                    name="bathrooms"
                    value={formData.bathrooms}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Size (sq ft)
                </label>
                <input
                  type="text"
                  name="size"
                  value={formData.size}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., 1200 sq ft"
                />
              </div>
            </div>

            {/* Room Management */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900 border-b pb-2">Room Management</h2>
                <button
                  type="button"
                  onClick={addRoom}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  <FaPlus />
                  Add Room
                </button>
              </div>

              {rooms.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FaBed className="text-4xl mx-auto mb-4 text-gray-300" />
                  <p>No rooms added yet. Click "Add Room" to get started.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {rooms.map((room, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-gray-900">Room {index + 1}</h3>
                        <button
                          type="button"
                          onClick={() => removeRoom(index)}
                          className="text-red-600 hover:text-red-800 transition-colors"
                        >
                          <FaTrash />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Room Number
                          </label>
                          <input
                            type="text"
                            value={room.roomNumber}
                            onChange={(e) => updateRoom(index, 'roomNumber', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Room Type
                          </label>
                          <select
                            value={room.roomType}
                            onChange={(e) => updateRoom(index, 'roomType', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            {roomTypes.map(type => (
                              <option key={type.value} value={type.value}>{type.label}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Price per Night (RWF)
                          </label>
                          <input
                            type="number"
                            value={room.pricePerNight}
                            onChange={(e) => updateRoom(index, 'pricePerNight', Number(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            min="0"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Capacity
                          </label>
                          <input
                            type="number"
                            value={room.capacity}
                            onChange={(e) => updateRoom(index, 'capacity', Number(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            min="1"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Group Booking Options */}
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 border-b pb-2">Group Booking Options</h2>
              
              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="groupBookingEnabled"
                    checked={formData.groupBookingEnabled}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 text-sm font-medium text-gray-700">
                    Enable group bookings
                  </label>
                </div>

                {formData.groupBookingEnabled && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Group Booking Discount (%)
                    </label>
                    <input
                      type="number"
                      name="groupBookingDiscount"
                      value={formData.groupBookingDiscount}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="0"
                      max="50"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Visibility & Commission */}
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 border-b pb-2">Visibility & Commission</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Visibility Level
                  </label>
                  <select
                    name="visibilityLevel"
                    value={formData.visibilityLevel}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {visibilityLevels.map(level => (
                      <option key={level.value} value={level.value}>
                        {level.label} - {level.description}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Commission Rate (%)
                  </label>
                  <input
                    type="number"
                    name="commissionRate"
                    value={formData.commissionRate}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="0"
                    max="50"
                  />
                </div>
              </div>

              {formData.visibilityLevel === 'featured' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Featured Until
                  </label>
                  <input
                    type="date"
                    name="featuredUntil"
                    value={formData.featuredUntil}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              )}
            </div>

            {/* Amenities */}
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 border-b pb-2">Amenities</h2>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {commonAmenities.map(amenity => (
                  <label key={amenity} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.amenities.includes(amenity)}
                      onChange={() => handleAmenityToggle(amenity)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">{amenity}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Image Upload */}
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 border-b pb-2">Property Images</h2>
              
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="image-upload"
                  disabled={uploading}
                />
                <label htmlFor="image-upload" className="cursor-pointer">
                  <FaUpload className="text-4xl text-gray-400 mx-auto mb-4" />
                  <p className="text-lg font-medium text-gray-700 mb-2">
                    {uploading ? 'Uploading...' : 'Click to upload images'}
                  </p>
                  <p className="text-sm text-gray-500">
                    Upload multiple images (JPG, PNG, GIF)
                  </p>
                </label>
              </div>

              {images.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {images.map((image, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={image.startsWith('http') ? image : `${API_URL}${image}`}
                        alt={`Property ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <FaTimes className="text-xs" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex items-center justify-end space-x-4 pt-6 border-t">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || uploading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    {isEditing ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  <>
                    <FaSave />
                    {isEditing ? 'Update Property' : 'Create Property'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EnhancedUploadProperty;
