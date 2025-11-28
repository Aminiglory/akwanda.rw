import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import EnhancedUploadProperty from './EnhancedUploadProperty';
import VehicleListingForm from '../components/VehicleListingForm';

const ListProperty = () => {
  const navigate = useNavigate();
  const [listingType, setListingType] = useState('stay'); // 'stay' | 'rental' | 'attraction' | 'flight'
  const [attractionStep, setAttractionStep] = useState(1);
  const [flightStep, setFlightStep] = useState(1);
  const [attractionData, setAttractionData] = useState({
    name: '', description: '', city: '', duration: '', price: '', capacity: '', highlights: '', languages: '', scheduleNotes: ''
  });
  const [flightData, setFlightData] = useState({
    title: '', origin: '', destination: '', aircraft: '', departure: '', arrival: '', price: '', stops: '', description: '', seats: ''
  });
  const [attractionSearch, setAttractionSearch] = useState({ destination: '', dates: '' });
  const [selectedFilters, setSelectedFilters] = useState({ location: [], category: [] });

  const topDestinations = [
    { city: 'Kigali', experiences: 42 },
    { city: 'Nyungwe', experiences: 28 },
    { city: 'Lake Kivu', experiences: 31 },
    { city: 'Akagera', experiences: 19 }
  ];

  const attractionDeals = [
    { title: 'Kigali City Cultural Walk', price: 'RWF 45,000', duration: '3h', discount: '15% off', badge: 'Local favorite' },
    { title: 'Sunset Cruise on Lake Kivu', price: 'RWF 85,000', duration: '2h', discount: '25% off', badge: 'Limited seats' },
    { title: 'Nyungwe Canopy Adventure', price: 'RWF 120,000', duration: '4h', discount: '20% off', badge: 'Best review' }
  ];

  const filterGroups = {
    location: ['Kigali', 'Nyungwe', 'Lake Kivu', 'Akagera'],
    category: ['Eco tour', 'Culture', 'Adventure', 'Relaxation']
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

  const validateAttractionStep = (step) => {
    if (step === 1 && (!attractionData.name || !attractionData.city || !attractionData.description)) {
      toast.error('Please provide the attraction name, description, and city');
      return false;
    }
    if (step === 2 && (!attractionData.price || !attractionData.duration || !attractionData.capacity)) {
      toast.error('Provide pricing, duration, and capacity to continue');
      return false;
    }
    if (step === 3 && !attractionData.scheduleNotes) {
      toast.error('Add schedule notes or highlights before submitting');
      return false;
    }
    return true;
  };

  const handleAttractionSubmit = (e) => {
    e.preventDefault();
    if (!validateAttractionStep(attractionStep)) return;
    if (attractionStep < 3) {
      setAttractionStep(prev => prev + 1);
      return;
    }
    toast.success('Attraction details captured. Continue in the attractions workspace to finalize scheduling.');
  };

  const handleAttractionPreview = (e) => {
    e.preventDefault();
    if (!attractionSearch.destination || !attractionSearch.dates) {
      toast.error('Share a destination and tentative dates to preview curated experiences.');
      return;
    }
    toast.success(`Previewing ${attractionSearch.destination} highlights for ${attractionSearch.dates}`);
    setAttractionData(prev => ({ ...prev, city: attractionSearch.destination }));
  };

  const toggleFilter = (group, value) => {
    setSelectedFilters(prev => {
      const has = prev[group].includes(value);
      const updated = has ? prev[group].filter(item => item !== value) : [...prev[group], value];
      return { ...prev, [group]: updated };
    });
  };

  const validateFlightStep = (step) => {
    if (step === 1 && (!flightData.title || !flightData.origin || !flightData.destination)) {
      toast.error('Add a flight title, origin, and destination');
      return false;
    }
    if (step === 2 && (!flightData.aircraft || !flightData.departure || !flightData.arrival || !flightData.price)) {
      toast.error('Provide aircraft, departure/arrival, and pricing for the route');
      return false;
    }
    if (step === 3 && (!flightData.seats || !flightData.stops || !flightData.description)) {
      toast.error('Add seat count, stops, and description');
      return false;
    }
    return true;
  };

  const handleFlightSubmit = (e) => {
    e.preventDefault();
    if (!validateFlightStep(flightStep)) return;
    if (flightStep < 3) {
      setFlightStep(prev => prev + 1);
      return;
    }
    toast.success('Flight itinerary saved. Continue in the flights workspace to add pricing tiers.');
  };

  const baseCard = (title, description, children) => (
    <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
      <h2 className="text-2xl font-semibold mb-3">{title}</h2>
      <p className="text-sm text-gray-600 mb-4">{description}</p>
      {children}
    </div>
  );

  const renderAttractionForm = () => (
    <form className="space-y-6" onSubmit={handleAttractionSubmit}>
      {attractionStep === 1 && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Attraction name</label>
            <input value={attractionData.name} onChange={(e) => setAttractionData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-4 py-2 border rounded-lg" placeholder="Kigali Cultural Tour" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea value={attractionData.description} onChange={(e) => setAttractionData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-4 py-2 border rounded-lg" rows="3" placeholder="Explain what makes this experience unique" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">City</label>
            <input value={attractionData.city} onChange={(e) => setAttractionData(prev => ({ ...prev, city: e.target.value }))}
              className="w-full px-4 py-2 border rounded-lg" />
          </div>
        </div>
      )}
      {attractionStep === 2 && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Duration</label>
            <input value={attractionData.duration} onChange={(e) => setAttractionData(prev => ({ ...prev, duration: e.target.value }))}
              className="w-full px-4 py-2 border rounded-lg" placeholder="e.g., 3h" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Price (RWF)</label>
            <input value={attractionData.price} onChange={(e) => setAttractionData(prev => ({ ...prev, price: e.target.value }))}
              type="number" className="w-full px-4 py-2 border rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Capacity</label>
            <input value={attractionData.capacity} onChange={(e) => setAttractionData(prev => ({ ...prev, capacity: e.target.value }))}
              type="number" className="w-full px-4 py-2 border rounded-lg" />
          </div>
        </div>
      )}
      {attractionStep === 3 && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Highlights / Schedule notes</label>
            <textarea value={attractionData.scheduleNotes} onChange={(e) => setAttractionData(prev => ({ ...prev, scheduleNotes: e.target.value }))}
              className="w-full px-4 py-2 border rounded-lg" rows="3" placeholder="Daily itinerary details" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Languages Offered</label>
            <input value={attractionData.languages} onChange={(e) => setAttractionData(prev => ({ ...prev, languages: e.target.value }))}
              className="w-full px-4 py-2 border rounded-lg" placeholder="English, French" />
          </div>
        </div>
      )}
      <div className="flex items-center justify-between">
        {attractionStep > 1 && (
          <button type="button" onClick={() => setAttractionStep(prev => Math.max(prev - 1, 1))}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">
            Back
          </button>
        )}
        <button type="submit" className="ml-auto px-5 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
          {attractionStep < 3 ? 'Continue' : 'Save attraction info'}
        </button>
      </div>
    </form>
  );

  const renderFlightForm = () => (
    <form className="space-y-6" onSubmit={handleFlightSubmit}>
      {flightStep === 1 && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Flight title</label>
            <input value={flightData.title} onChange={(e) => setFlightData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-4 py-2 border rounded-lg" placeholder="Kigali ↔ Nairobi" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Origin</label>
              <input value={flightData.origin} onChange={(e) => setFlightData(prev => ({ ...prev, origin: e.target.value }))}
                className="w-full px-4 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Destination</label>
              <input value={flightData.destination} onChange={(e) => setFlightData(prev => ({ ...prev, destination: e.target.value }))}
                className="w-full px-4 py-2 border rounded-lg" />
            </div>
          </div>
        </div>
      )}
      {flightStep === 2 && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Aircraft / Operator</label>
            <input value={flightData.aircraft} onChange={(e) => setFlightData(prev => ({ ...prev, aircraft: e.target.value }))}
              className="w-full px-4 py-2 border rounded-lg" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Departure</label>
              <input type="datetime-local" value={flightData.departure} onChange={(e) => setFlightData(prev => ({ ...prev, departure: e.target.value }))}
                className="w-full px-4 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Arrival</label>
              <input type="datetime-local" value={flightData.arrival} onChange={(e) => setFlightData(prev => ({ ...prev, arrival: e.target.value }))}
                className="w-full px-4 py-2 border rounded-lg" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Price (RWF)</label>
            <input type="number" value={flightData.price} onChange={(e) => setFlightData(prev => ({ ...prev, price: e.target.value }))}
              className="w-full px-4 py-2 border rounded-lg" />
          </div>
        </div>
      )}
      {flightStep === 3 && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Stops</label>
            <input value={flightData.stops} onChange={(e) => setFlightData(prev => ({ ...prev, stops: e.target.value }))}
              className="w-full px-4 py-2 border rounded-lg" placeholder="Direct / 1 stop" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Seats available</label>
            <input type="number" value={flightData.seats} onChange={(e) => setFlightData(prev => ({ ...prev, seats: e.target.value }))}
              className="w-full px-4 py-2 border rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea value={flightData.description} onChange={(e) => setFlightData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-4 py-2 border rounded-lg" rows="3" placeholder="Add service notes, baggage rules, etc." />
          </div>
        </div>
      )}
      <div className="flex items-center justify-between">
        {flightStep > 1 && (
          <button type="button" onClick={() => setFlightStep(prev => Math.max(prev - 1, 1))}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">
            Back
          </button>
        )}
        <button type="submit" className="ml-auto px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
          {flightStep < 3 ? 'Continue' : 'Save flight info'}
        </button>
      </div>
    </form>
  );

  const renderNonStayContent = () => {
    if (listingType === 'rental') {
      return (
        <VehicleListingForm />
      );
    }

    if (listingType === 'attraction') {
      const filtersPanel = (
        <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
            <span className="text-sm text-gray-500">{selectedFilters.location.length + selectedFilters.category.length} selected</span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm text-gray-700">
            {Object.entries(filterGroups).map(([group, items]) => (
              <div key={group}>
                <p className="font-semibold text-gray-800 mb-2 capitalize">{group}</p>
                <div className="space-y-2">
                  {items.map(item => (
                    <label key={item} className="inline-flex items-center gap-2">
                      <input type="checkbox" checked={selectedFilters[group].includes(item)} onChange={() => toggleFilter(group, item)} className="text-purple-600 border-gray-300" />
                      {item}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      );

      const dealsPanel = (
        <div className="grid gap-4 sm:grid-cols-2">
          {attractionDeals.map(deal => (
            <div key={deal.title} className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-purple-600 font-semibold mb-1">{deal.badge}</p>
              <h4 className="text-lg font-semibold text-gray-900 mb-1">{deal.title}</h4>
              <p className="text-sm text-gray-500 mb-3">{deal.duration} • {deal.discount}</p>
              <div className="text-base font-semibold text-gray-900">{deal.price}</div>
            </div>
          ))}
        </div>
      );

      const attractionPreview = (
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl p-6 mb-6 shadow-xl">
          <h3 className="text-xl font-semibold">List attractions like a marketplace pro</h3>
          <p className="text-sm text-purple-100 mt-1">Inspire guests with curated top spots, deals, and itineraries before capturing the formal details below.</p>
          <form className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3" onSubmit={handleAttractionPreview}>
            <input
              value={attractionSearch.destination}
              onChange={e => setAttractionSearch(prev => ({ ...prev, destination: e.target.value }))}
              placeholder="Destination"
              className="w-full rounded-lg px-4 py-3 text-sm text-gray-900"
            />
            <input
              value={attractionSearch.dates}
              onChange={e => setAttractionSearch(prev => ({ ...prev, dates: e.target.value }))}
              placeholder="Dates"
              className="w-full rounded-lg px-4 py-3 text-sm text-gray-900"
            />
            <button type="submit" className="bg-white text-purple-700 font-semibold rounded-xl px-4 py-3 mt-2 sm:mt-0">Preview highlights</button>
          </form>
        </div>
      );

      return (
        <>
          {attractionPreview}
          {filtersPanel}
          {dealsPanel}
          {baseCard(
            'List an attraction',
            'Capture detailed attraction metadata before advancing to the dedicated attractions workspace.',
            renderAttractionForm()
          )}
        </>
      );
    }

    if (listingType === 'flight') {
      return baseCard(
        'List a flight',
        'Enter your flight route, schedule, pricing, and service notes so the flights workspace can take over.',
        renderFlightForm()
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
