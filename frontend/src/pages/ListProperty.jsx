import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import EnhancedUploadProperty from './EnhancedUploadProperty';

const ListProperty = () => {
  const navigate = useNavigate();
  const [listingType, setListingType] = useState('stay'); // 'stay' | 'rental' | 'attraction' | 'flight'
  const [rentalForm, setRentalForm] = useState({ vehicleName: '', location: '', pricePerDay: '' });
  const [attractionForm, setAttractionForm] = useState({ name: '', city: '', price: '', duration: '' });
  const [flightForm, setFlightForm] = useState({ title: '', origin: '', destination: '', price: '', date: '' });

  const handleRentalSubmit = (event) => {
    event.preventDefault();
    if (!rentalForm.vehicleName || !rentalForm.location || !rentalForm.pricePerDay) {
      toast.error('Please fill vehicle name, location, and price per day');
      return;
    }
    toast.success('Rental listing data captured. Continue in the vehicle dashboard to finalize.');
    setRentalForm({ vehicleName: '', location: '', pricePerDay: '' });
  };

  const handleAttractionSubmit = (event) => {
    event.preventDefault();
    if (!attractionForm.name || !attractionForm.city || !attractionForm.price) {
      toast.error('Please fill name, city, and price for your attraction');
      return;
    }
    toast.success('Attraction info captured. Continue in the attractions workspace to finish.');
    setAttractionForm({ name: '', city: '', price: '', duration: '' });
  };

  const handleFlightSubmit = (event) => {
    event.preventDefault();
    if (!flightForm.title || !flightForm.origin || !flightForm.destination || !flightForm.price) {
      toast.error('Please provide flight title, origin, destination, and price');
      return;
    }
    toast.success('Flight listing details saved locally. Finalize in the flights area.');
    setFlightForm({ title: '', origin: '', destination: '', price: '', date: '' });
  };

  const renderListingTypeSelector = () => (
    <div className="mb-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-2">What would you like to list?</h2>
      <p className="text-sm text-gray-600 mb-4">
        Choose the type of listing you want to create. Stays, rentals, attractions and flights each have their own flow.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { id: 'stay', label: 'Stay', desc: 'Apartments, hotels, homes', color: 'from-blue-500 to-blue-600' },
          { id: 'rental', label: 'Rental', desc: 'Cars & vehicles', color: 'from-green-500 to-green-600' },
          { id: 'attraction', label: 'Attraction', desc: 'Tours & activities', color: 'from-purple-500 to-purple-600' },
          { id: 'flight', label: 'Flight', desc: 'Flight services', color: 'from-indigo-500 to-indigo-600' },
        ].map((type) => (
          <button
            key={type.id}
            type="button"
            onClick={() => setListingType(type.id)}
            className={`relative rounded-xl p-3 text-left text-sm border transition-all duration-200
              ${listingType === type.id
                ? 'border-blue-600 bg-blue-50 shadow-sm'
                : 'border-gray-200 hover:border-blue-400 hover:bg-gray-50'}`}
          >
            <div className={`w-8 h-8 mb-2 rounded-lg bg-gradient-to-br ${type.color} flex items-center justify-center text-white text-xs font-semibold`}>
              {type.label[0]}
            </div>
            <div className="font-semibold text-gray-900 text-sm">{type.label}</div>
            <div className="text-xs text-gray-500 mt-1">{type.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );

  const renderNonStayContent = () => {
    const baseCard = (title, description, children) => (
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h2 className="text-2xl font-semibold mb-3">{title}</h2>
        <p className="text-sm text-gray-600 mb-4">{description}</p>
        {children}
      </div>
    );

    if (listingType === 'rental') {
      return baseCard(
        'List a vehicle rental',
        'Capture vehicle details here before continuing in the vehicles workspace to finish pricing, availability, and images.',
        <form className="space-y-4" onSubmit={handleRentalSubmit}>
          <div>
            <label className="block text-sm font-medium text-gray-700">Vehicle name <span className="text-red-500">*</span></label>
            <input value={rentalForm.vehicleName} onChange={(e) => setRentalForm(prev => ({ ...prev, vehicleName: e.target.value }))}
              className="w-full px-4 py-2 border rounded-lg" placeholder="e.g., Safari Cruiser" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Location</label>
            <input value={rentalForm.location} onChange={(e) => setRentalForm(prev => ({ ...prev, location: e.target.value }))}
              className="w-full px-4 py-2 border rounded-lg" placeholder="Kigali" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Price per day (RWF) <span className="text-red-500">*</span></label>
            <input type="number" value={rentalForm.pricePerDay} onChange={(e) => setRentalForm(prev => ({ ...prev, pricePerDay: e.target.value }))}
              className="w-full px-4 py-2 border rounded-lg" />
          </div>
          <button type="submit" className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save rental info</button>
        </form>
      );
    }

    if (listingType === 'attraction') {
      return baseCard(
        'List an attraction',
        'Start describing your tour or experience. You can continue in the attractions workspace to add itineraries, galleries, and pricing.',
        <form className="space-y-4" onSubmit={handleAttractionSubmit}>
          <div>
            <label className="block text-sm font-medium text-gray-700">Attraction name <span className="text-red-500">*</span></label>
            <input value={attractionForm.name} onChange={(e) => setAttractionForm(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-4 py-2 border rounded-lg" placeholder="Kigali Cultural Tour" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">City <span className="text-red-500">*</span></label>
              <input value={attractionForm.city} onChange={(e) => setAttractionForm(prev => ({ ...prev, city: e.target.value }))}
                className="w-full px-4 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Duration</label>
              <input value={attractionForm.duration} onChange={(e) => setAttractionForm(prev => ({ ...prev, duration: e.target.value }))}
                className="w-full px-4 py-2 border rounded-lg" placeholder="3h" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Price (RWF) <span className="text-red-500">*</span></label>
            <input type="number" value={attractionForm.price} onChange={(e) => setAttractionForm(prev => ({ ...prev, price: e.target.value }))}
              className="w-full px-4 py-2 border rounded-lg" />
          </div>
          <button type="submit" className="px-5 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700">Save attraction info</button>
        </form>
      );
    }

    if (listingType === 'flight') {
      return baseCard(
        'List a flight service',
        'Describe your flight route and pricing so you can continue in the flights workspace to add schedules, aircraft, and seat maps.',
        <form className="space-y-4" onSubmit={handleFlightSubmit}>
          <div>
            <label className="block text-sm font-medium text-gray-700">Flight title <span className="text-red-500">*</span></label>
            <input value={flightForm.title} onChange={(e) => setFlightForm(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-4 py-2 border rounded-lg" placeholder="Rwanda to Nairobi" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Origin <span className="text-red-500">*</span></label>
              <input value={flightForm.origin} onChange={(e) => setFlightForm(prev => ({ ...prev, origin: e.target.value }))}
                className="w-full px-4 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Destination <span className="text-red-500">*</span></label>
              <input value={flightForm.destination} onChange={(e) => setFlightForm(prev => ({ ...prev, destination: e.target.value }))}
                className="w-full px-4 py-2 border rounded-lg" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Price (RWF) <span className="text-red-500">*</span></label>
              <input type="number" value={flightForm.price} onChange={(e) => setFlightForm(prev => ({ ...prev, price: e.target.value }))}
                className="w-full px-4 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Date</label>
              <input type="date" value={flightForm.date} onChange={(e) => setFlightForm(prev => ({ ...prev, date: e.target.value }))}
                className="w-full px-4 py-2 border rounded-lg" />
            </div>
          </div>
          <button type="submit" className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Save flight info</button>
        </form>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">List your property</h1>
          <p className="text-gray-600">Choose what you want to list, then follow the steps to publish it on AKWANDA.rw.</p>
        </div>

        {renderListingTypeSelector()}

        {listingType === 'stay' ? (
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <EnhancedUploadProperty />
          </div>
        ) : (
          renderNonStayContent()
        )}
      </div>
    </div>
  );
};

export default ListProperty;
