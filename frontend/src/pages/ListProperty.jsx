import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { FaCheck, FaBuilding, FaBed, FaCamera, FaClipboardCheck, FaCar, FaPlane, FaMapMarkerAlt } from 'react-icons/fa';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const ListProperty = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const [propertyData, setPropertyData] = useState({
    title: '', description: '', address: '', city: '', country: 'Rwanda',
    category: 'apartment', bedrooms: 1, bathrooms: 1, size: '', amenities: []
  });

  const [units, setUnits] = useState([{
    roomNumber: '', roomType: 'single', pricePerNight: '',
    capacity: 1, beds: 1, bathrooms: 1, amenities: [], images: []
  }]);

  const [propertyImages, setPropertyImages] = useState([]);
  const [finalDetails, setFinalDetails] = useState({
    commissionChoice: 'standard', discountPercent: 0,
    checkInTime: '14:00', checkOutTime: '11:00',
    cancellationPolicy: 'flexible', houseRules: ''
  });
  const [selectedType, setSelectedType] = useState('stay');
  const [rentalForm, setRentalForm] = useState({
    title: '', location: '', pricePerDay: '', description: ''
  });
  const [attractionForm, setAttractionForm] = useState({
    name: '', city: '', price: '', highlights: ''
  });
  const [flightForm, setFlightForm] = useState({
    airline: '', from: '', to: '', price: ''
  });

  const steps = [
    { number: 1, title: 'Property details', description: 'The basics: Add your property name, address, facilities and more', icon: FaBuilding },
    { number: 2, title: 'Units', description: 'Add amenities and add your layouts, bed options and more', icon: FaBed },
    { number: 3, title: 'Photos', description: 'Showcase photos of your property so guests know what to expect', icon: FaCamera },
    { number: 4, title: 'Final steps', description: 'Set up payments and invoicing before you open for bookings', icon: FaClipboardCheck }
  ];

  const listingOptions = [
    { id: 'stay', label: 'Stay / Property', description: 'Rent apartments, homes, or rooms', icon: FaBuilding, color: 'border-blue-500 bg-blue-50' },
    { id: 'rental', label: 'Rental', description: 'List cars, motorcycles, or bikes', icon: FaCar, color: 'border-green-500 bg-green-50' },
    { id: 'attraction', label: 'Attraction', description: 'Share tours, experiences, or events', icon: FaMapMarkerAlt, color: 'border-purple-500 bg-purple-50' },
    { id: 'flight', label: 'Flight services', description: 'Offer packaged flight/air transfers', icon: FaPlane, color: 'border-orange-500 bg-orange-50' }
  ];

  const amenitiesList = ['wifi', 'parking', 'pool', 'gym', 'restaurant', 'bar', 'spa', 'air_conditioning', 'heating', 'kitchen', 'laundry', 'tv'];
  const categories = [
    { value: 'apartment', label: 'Apartment' }, { value: 'hotel', label: 'Hotel' },
    { value: 'villa', label: 'Villa' }, { value: 'hostel', label: 'Hostel' }
  ];
  const roomTypes = [
    { value: 'single', label: 'Single Room' }, { value: 'double', label: 'Double Room' },
    { value: 'suite', label: 'Suite' }, { value: 'family', label: 'Family Room' }
  ];

  const validateStep = (step) => {
    if (step === 1 && (!propertyData.title || !propertyData.address || !propertyData.city)) {
      toast.error('Please fill required fields');
      return false;
    }
    if (step === 2) {
      for (let unit of units) {
        if (!unit.roomNumber || !unit.pricePerNight) {
          toast.error('Complete all unit details');
          return false;
        }
      }
    }
    if (step === 3 && propertyImages.length === 0) {
      toast.error('Upload at least one photo');
      return false;
    }
    return true;
  };

  const nextStep = () => validateStep(currentStep) && setCurrentStep(prev => Math.min(prev + 1, 4));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;
    
    try {
      setSubmitting(true);
      const formData = new FormData();
      Object.entries(propertyData).forEach(([k, v]) => {
        if (k === 'amenities') v.forEach(a => formData.append('amenities', a));
        else formData.append(k, v);
      });
      
      propertyImages.forEach(img => formData.append('images', img));
      
      const commissionRate = finalDetails.commissionChoice === 'higher' ? 12 : (finalDetails.commissionChoice === 'mid' ? 10 : 8);
      formData.append('commissionRate', commissionRate);
      formData.append('discountPercent', finalDetails.discountPercent);
      formData.append('rooms', JSON.stringify(units.map(u => ({
        roomNumber: u.roomNumber, roomType: u.roomType, pricePerNight: Number(u.pricePerNight),
        capacity: Number(u.capacity), beds: Number(u.beds), bathrooms: Number(u.bathrooms), amenities: u.amenities
      }))));

      const res = await fetch(`${API_URL}/api/properties`, {
        method: 'POST', body: formData, credentials: 'include'
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      // Upload room images
      for (let i = 0; i < units.length; i++) {
        if (units[i].images.length > 0 && data.property.rooms[i]) {
          const roomFormData = new FormData();
          units[i].images.forEach(img => roomFormData.append('images', img));
          await fetch(`${API_URL}/api/properties/${data.property._id}/rooms/${data.property.rooms[i]._id}/images`, {
            method: 'POST', body: roomFormData, credentials: 'include'
          });
        }
      }

      toast.success('Property listed successfully!');
      navigate('/my-bookings');
    } catch (error) {
      toast.error(error.message || 'Failed to list property');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRentalSubmit = (e) => {
    e.preventDefault();
    toast.success(`Rental "${rentalForm.title || 'Untitled'}" ready for review (stub).`);
    console.log('Submitted rental form', rentalForm);
  };

  const handleAttractionSubmit = (e) => {
    e.preventDefault();
    toast.success(`Attraction "${attractionForm.name || 'Unnamed'}" submitted stub.`);
    console.log('Submitted attraction form', attractionForm);
  };

  const handleFlightSubmit = (e) => {
    e.preventDefault();
    toast.success(`Flight route ${flightForm.from || 'N/A'} → ${flightForm.to || 'N/A'} logged.`);
    console.log('Submitted flight form', flightForm);
  };

  const renderOtherForm = () => {
    if (selectedType === 'rental') {
      return (
        <form onSubmit={handleRentalSubmit} className="space-y-6">
          <h2 className="text-2xl font-bold">List a Rental</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
            <input value={rentalForm.title} onChange={(e) => setRentalForm(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-4 py-3 border rounded-lg" placeholder="e.g., Compact SUV" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
            <input value={rentalForm.location} onChange={(e) => setRentalForm(prev => ({ ...prev, location: e.target.value }))}
              className="w-full px-4 py-3 border rounded-lg" placeholder="City or area" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Price / day (RWF)</label>
            <input type="number" value={rentalForm.pricePerDay} onChange={(e) => setRentalForm(prev => ({ ...prev, pricePerDay: e.target.value }))}
              className="w-full px-4 py-3 border rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Highlights</label>
            <textarea value={rentalForm.description} onChange={(e) => setRentalForm(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-4 py-3 border rounded-lg" rows={4} placeholder="Add key features" />
          </div>
          <button type="submit" className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save Rental Stub</button>
        </form>
      );
    }
    if (selectedType === 'attraction') {
      return (
        <form onSubmit={handleAttractionSubmit} className="space-y-6">
          <h2 className="text-2xl font-bold">List an Attraction</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
            <input value={attractionForm.name} onChange={(e) => setAttractionForm(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-4 py-3 border rounded-lg" placeholder="Name of attraction" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">City / Location</label>
            <input value={attractionForm.city} onChange={(e) => setAttractionForm(prev => ({ ...prev, city: e.target.value }))}
              className="w-full px-4 py-3 border rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Price per person (RWF)</label>
            <input type="number" value={attractionForm.price} onChange={(e) => setAttractionForm(prev => ({ ...prev, price: e.target.value }))}
              className="w-full px-4 py-3 border rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Highlights</label>
            <textarea value={attractionForm.highlights} onChange={(e) => setAttractionForm(prev => ({ ...prev, highlights: e.target.value }))}
              className="w-full px-4 py-3 border rounded-lg" rows={4} placeholder="What makes it special?" />
          </div>
          <button type="submit" className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700">Save Attraction Stub</button>
        </form>
      );
    }
    if (selectedType === 'flight') {
      return (
        <form onSubmit={handleFlightSubmit} className="space-y-6">
          <h2 className="text-2xl font-bold">List a Flight Service</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Airline / Provider</label>
            <input value={flightForm.airline} onChange={(e) => setFlightForm(prev => ({ ...prev, airline: e.target.value }))}
              className="w-full px-4 py-3 border rounded-lg" placeholder="Airline or travel partner" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">From</label>
              <input value={flightForm.from} onChange={(e) => setFlightForm(prev => ({ ...prev, from: e.target.value }))}
                className="w-full px-4 py-3 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">To</label>
              <input value={flightForm.to} onChange={(e) => setFlightForm(prev => ({ ...prev, to: e.target.value }))}
                className="w-full px-4 py-3 border rounded-lg" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Price (RWF)</label>
            <input type="number" value={flightForm.price} onChange={(e) => setFlightForm(prev => ({ ...prev, price: e.target.value }))}
              className="w-full px-4 py-3 border rounded-lg" />
          </div>
          <button type="submit" className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700">Save Flight Stub</button>
        </form>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">List an item on AKWANDA.rw</h1>
          <p className="text-gray-600">Pick the category you want to list, then complete the relevant form right below.</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Select what you are listing</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {listingOptions.map((option) => {
              const Icon = option.icon;
              return (
                <button key={option.id} type="button" onClick={() => setSelectedType(option.id)}
                  className={`border rounded-xl p-4 text-left flex items-center gap-3 transition-shadow ${option.color} ${selectedType === option.id ? 'shadow-xl' : 'shadow hover:shadow-lg'}`}>
                  <span className="p-2 rounded-lg bg-white shadow-sm">
                    <Icon className="text-xl text-gray-700" />
                  </span>
                  <div>
                    <p className="font-semibold text-gray-900">{option.label}</p>
                    <p className="text-sm text-gray-600">{option.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {selectedType === 'stay' ? (
          <>
            {/* Progress Steps */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <div className="space-y-4">
                {steps.map((step) => {
                  const Icon = step.icon;
                  const isActive = currentStep === step.number;
                  const isCompleted = currentStep > step.number;

                  return (
                    <div key={step.number} className="flex items-start gap-4">
                      <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
                        isCompleted ? 'bg-green-500' : isActive ? 'bg-blue-600' : 'bg-gray-200'
                      }`}>
                        {isCompleted ? <FaCheck className="text-white text-xl" /> : 
                         <Icon className={`text-xl ${isActive ? 'text-white' : 'text-gray-500'}`} />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium ${isActive ? 'text-blue-600' : 'text-gray-500'}`}>
                            Step {step.number}
                          </span>
                          {isCompleted && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Completed</span>}
                        </div>
                        <h3 className={`text-lg font-semibold ${isActive ? 'text-gray-900' : 'text-gray-600'}`}>{step.title}</h3>
                        <p className="text-sm text-gray-500 mt-1">{step.description}</p>
                        {isCompleted && (
                          <button onClick={() => setCurrentStep(step.number)} className="text-blue-600 hover:text-blue-700 font-medium text-sm mt-2">
                            Edit
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Step Content */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              {currentStep === 1 && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold mb-4">Property Details</h2>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Property Name <span className="text-red-500">*</span></label>
                    <input type="text" value={propertyData.title} onChange={(e) => setPropertyData(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="e.g., Luxury Apartment in Kigali" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                    <select value={propertyData.category} onChange={(e) => setPropertyData(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full px-4 py-2 border rounded-lg">
                      {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Address <span className="text-red-500">*</span></label>
                      <input type="text" value={propertyData.address} onChange={(e) => setPropertyData(prev => ({ ...prev, address: e.target.value }))}
                        className="w-full px-4 py-2 border rounded-lg" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">City <span className="text-red-500">*</span></label>
                      <input type="text" value={propertyData.city} onChange={(e) => setPropertyData(prev => ({ ...prev, city: e.target.value }))}
                        className="w-full px-4 py-2 border rounded-lg" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Amenities</label>
                    <div className="grid grid-cols-3 gap-3">
                      {amenitiesList.map(amenity => (
                        <label key={amenity} className="flex items-center space-x-2">
                          <input type="checkbox" checked={propertyData.amenities.includes(amenity)}
                            onChange={() => setPropertyData(prev => ({
                              ...prev, amenities: prev.amenities.includes(amenity) ? prev.amenities.filter(a => a !== amenity) : [...prev.amenities, amenity]
                            }))} className="w-4 h-4 text-blue-600 rounded" />
                          <span className="text-sm capitalize">{amenity}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold">Units / Rooms</h2>
                    <button onClick={() => setUnits(prev => [...prev, { roomNumber: '', roomType: 'single', pricePerNight: '', capacity: 1, beds: 1, bathrooms: 1, amenities: [], images: [] }])}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Add Unit</button>
                  </div>
                  {units.map((unit, idx) => (
                    <div key={idx} className="border rounded-lg p-6 space-y-4">
                      <div className="flex justify-between">
                        <h3 className="text-lg font-semibold">Unit {idx + 1}</h3>
                        {units.length > 1 && <button onClick={() => setUnits(prev => prev.filter((_, i) => i !== idx))} className="text-red-600 text-sm">Delete</button>}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">Room Number <span className="text-red-500">*</span></label>
                          <input type="text" value={unit.roomNumber} onChange={(e) => setUnits(prev => prev.map((u, i) => i === idx ? { ...u, roomNumber: e.target.value } : u))}
                            className="w-full px-4 py-2 border rounded-lg" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Price/Night (RWF) <span className="text-red-500">*</span></label>
                          <input type="number" value={unit.pricePerNight} onChange={(e) => setUnits(prev => prev.map((u, i) => i === idx ? { ...u, pricePerNight: e.target.value } : u))}
                            className="w-full px-4 py-2 border rounded-lg" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold mb-4">Property Photos</h2>
                  <input type="file" multiple accept="image/*" onChange={(e) => setPropertyImages(prev => [...prev, ...Array.from(e.target.files)])}
                    className="w-full px-4 py-2 border rounded-lg" />
                  {propertyImages.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                      {propertyImages.map((img, idx) => (
                        <div key={idx} className="relative">
                          <img src={URL.createObjectURL(img)} alt="" className="w-full h-32 object-cover rounded-lg" />
                          <button onClick={() => setPropertyImages(prev => prev.filter((_, i) => i !== idx))}
                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6">×</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {currentStep === 4 && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold mb-4">Final Details</h2>
                  <div>
                    <label className="block text-sm font-medium mb-2">Commission Rate</label>
                    <select value={finalDetails.commissionChoice} onChange={(e) => setFinalDetails(prev => ({ ...prev, commissionChoice: e.target.value }))}
                      className="w-full px-4 py-2 border rounded-lg">
                      <option value="standard">Standard - 8%</option>
                      <option value="mid">Mid - 10%</option>
                      <option value="higher">Higher - 12%</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Navigation */}
            <div className="flex justify-between">
              <button onClick={prevStep} disabled={currentStep === 1} className="px-6 py-3 border rounded-lg disabled:opacity-50">Back</button>
              {currentStep < 4 ? (
                <button onClick={nextStep} className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Continue</button>
              ) : (
                <button onClick={handleSubmit} disabled={submitting} className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
                  {submitting ? 'Submitting...' : 'Complete & List Property'}
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            {renderOtherForm()}
          </div>
        )}
      </div>
    </div>
  );
};

export default ListProperty;
