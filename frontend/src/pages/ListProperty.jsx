import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import EnhancedUploadProperty from './EnhancedUploadProperty';
import VehicleListingForm from '../components/VehicleListingForm';

const DEFAULT_MAP_CENTER = { lat: -1.9536, lng: 30.0606 };

const redPinSvg = encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="48" viewBox="0 0 32 48" fill="none"><path d="M16 2C10 2 5 7 5 13c0 8 11 18 11 18s11-10 11-18C27 7 22 2 16 2z" fill="#FF5A5F"/><circle cx="16" cy="13" r="4" fill="white"/></svg>'
);

const redPinIcon = new L.Icon({
  iconUrl: `data:image/svg+xml;charset=UTF-8,${redPinSvg}`,
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [32, 48],
  iconAnchor: [16, 48],
  shadowSize: [41, 41]
});

const LocationMapPicker = ({ position, onPositionChange }) => {
  const map = useMapEvents({ click(e) { onPositionChange(e.latlng); } });

  useEffect(() => {
    if (position) {
      map.setView(position);
    }
  }, [position, map]);

  if (!position) return null;
  return (
    <Marker
      position={position}
      icon={redPinIcon}
      draggable
      eventHandlers={{
        dragend(event) {
          onPositionChange(event.target.getLatLng());
        }
      }}
    />
  );
};

const categoryOptions = ['Nature', 'History', 'Family', 'Adventure', 'Culture', 'Food & Drink', 'Wellness'];
const yesNoOptions = [
  { label: 'Yes', value: 'yes' },
  { label: 'No', value: 'no' }
];

const initialAttraction = {
  name: '',
  category: '',
  shortDescription: '',
  fullDescription: '',
  highlights: '',
  country: '',
  city: '',
  address: '',
  gps: '',
  landmarks: '',
  directions: '',
  latitude: DEFAULT_MAP_CENTER.lat,
  longitude: DEFAULT_MAP_CENTER.lng,
  locationMap: '',
  coverPhotoFiles: [],
  galleryFiles: [],
  video: '',
  openingDays: '',
  openingHoursStart: '',
  openingHoursEnd: '',
  seasonality: '',
  duration: '',
  minAge: '',
  accessibility: '',
  timeSlots: '',
  ticketAdult: '',
  ticketChild: '',
  ticketStudent: '',
  ticketGroup: '',
  discounts: '',
  currency: '',
  paymentMethods: '',
  cancellationPolicy: '',
  refundPolicy: '',
  capacity: '',
  minGuests: '',
  bookingRequired: '',
  checkinInstructions: '',
  amenities: '',
  guideAvailable: '',
  audioGuideLanguages: '',
  safetyEquipment: '',
  rules: '',
  dressCode: '',
  safetyInstructions: '',
  liability: '',
  contactName: '',
  contactPhone: '',
  contactEmail: '',
  contactWebsite: '',
  contactEmergency: ''
};

const initialFlightData = {
  title: '',
  origin: '',
  destination: '',
  aircraft: '',
  departure: '',
  arrival: '',
  price: '',
  seats: '',
  stops: '',
  description: ''
};

const ListProperty = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [listingType, setListingType] = useState('stay');
  const [attractionForm, setAttractionForm] = useState(initialAttraction);
  const [flightStep, setFlightStep] = useState(1);
  const [flightData, setFlightData] = useState(initialFlightData);

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
          { id: 'flight', label: 'Flight', desc: 'Flight services', color: 'from-indigo-500 to-indigo-600' }
        ].map((type) => (
          <button
            key={type.id}
            type="button"
            onClick={() => setListingType(type.id)}
            className={`relative rounded-xl p-3 text-left text-sm border transition-all duration-200 ${listingType === type.id ?
              'border-blue-600 bg-blue-50 shadow-sm' : 'border-gray-200 hover:border-blue-400 hover:bg-gray-50'}`}
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

  const handleLocationSelected = async ({ lat, lng }) => {
    setAttractionForm((prev) => ({
      ...prev,
      latitude: lat,
      longitude: lng,
      gps: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
      locationMap: `Lat ${lat.toFixed(5)}, Lng ${lng.toFixed(5)}`
    }));
  };

  const handleCoverUpload = (files) => setAttractionForm(prev => ({ ...prev, coverPhotoFiles: Array.from(files || []) }));
  const handleGalleryUpload = (files) => setAttractionForm(prev => ({ ...prev, galleryFiles: Array.from(files || []) }));

  const section = (title, helper, children) => (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
      <div>
        <p className="text-xl font-semibold text-gray-900">{title}</p>
        {helper && <p className="text-sm text-gray-500">{helper}</p>}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {children}
      </div>
    </div>
  );

  const renderField = ({ label, name, type = 'text', placeholder = '', description = '', options = [] }) => {
    const value = attractionForm[name];
    if (type === 'textarea') {
      return (
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">{label}</label>
          <textarea
            rows={3}
            value={value}
            onChange={(e) => setAttractionForm(prev => ({ ...prev, [name]: e.target.value }))}
            placeholder={placeholder}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-[#a06b42]"
          />
          {description && <p className="text-xs text-gray-500">{description}</p>}
        </div>
      );
    }

    if (type === 'select') {
      return (
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">{label}</label>
          <select
            value={value}
            onChange={(e) => setAttractionForm(prev => ({ ...prev, [name]: e.target.value }))}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-[#a06b42] bg-white"
          >
            <option value="">Select {label}</option>
            {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
          {description && <p className="text-xs text-gray-500">{description}</p>}
        </div>
      );
    }

    return (
      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        <input
          type={type}
          value={value}
          onChange={(e) => setAttractionForm(prev => ({ ...prev, [name]: e.target.value }))}
          placeholder={placeholder}
          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-[#a06b42]"
        />
        {description && <p className="text-xs text-gray-500">{description}</p>}
      </div>
    );
  };

  const renderRadioGroup = (label, name) => (
    <div className="space-y-1">
      <p className="text-sm font-medium text-gray-700">{label}</p>
      <div className="flex gap-4">
        {yesNoOptions.map(option => (
          <label key={option.value} className="inline-flex items-center gap-2">
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={attractionForm[name] === option.value}
              onChange={() => setAttractionForm(prev => ({ ...prev, [name]: option.value }))}
              className="form-radio text-[#a06b42] h-4 w-4"
            />
            {option.label}
          </label>
        ))}
      </div>
    </div>
  );

  const handleAttractionSubmit = (e) => {
    e.preventDefault();
    if (!attractionForm.name || !attractionForm.category || !attractionForm.city || !attractionForm.country) {
      toast.error('Name, category, country, and city are required.');
      return;
    }
    toast.success('Attraction draft saved. Continue on the attraction workspace to finish multimedia.');
  };

  const validateFlightStep = (step) => {
    if (step === 1 && (!flightData.title || !flightData.origin || !flightData.destination)) {
      toast.error('Provide flight title, origin, and destination.');
      return false;
    }
    if (step === 2 && (!flightData.aircraft || !flightData.departure || !flightData.arrival || !flightData.price)) {
      toast.error('Add aircraft/operator, departure, arrival, and price.');
      return false;
    }
    if (step === 3 && (!flightData.seats || !flightData.stops || !flightData.description)) {
      toast.error('Share seat count, stops, and description.');
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
    toast.success('Flight itinerary saved. Continue in the flights workspace to finalise pricing.');
  };

  const renderAttractionForm = () => (
    <form className="space-y-6" onSubmit={handleAttractionSubmit}>
      {section('1. Basic information', 'Required to identify the attraction.',
        <>
          {renderField({ label: 'Attraction Name', name: 'name', placeholder: 'Kigali Cultural Walk' })}
          {renderField({ label: 'Category / Type', name: 'category', type: 'select', options: categoryOptions })}
          {renderField({ label: 'Short Description', name: 'shortDescription', type: 'textarea', placeholder: '1–2 sentence summary' })}
          {renderField({ label: 'Full Description', name: 'fullDescription', type: 'textarea', placeholder: 'Detailed highlight narrative' })}
          {renderField({ label: 'Highlights / Key Features', name: 'highlights', type: 'textarea', placeholder: 'Bullet points separated by commas' })}
        </>
      )}
      {section('2. Location details', 'Precision helps guests arrive smoothly.',
        <>
          {renderField({ label: 'Country', name: 'country', placeholder: 'Rwanda' })}
          {renderField({ label: 'City / Town / District', name: 'city', placeholder: 'Kigali' })}
          {renderField({ label: 'Exact Address', name: 'address', placeholder: 'Street, building name...' })}
          {renderField({ label: 'GPS Coordinates', name: 'gps', placeholder: 'Latitude, Longitude' })}
          {renderField({ label: 'Landmarks Nearby', name: 'landmarks', placeholder: 'University, hotel, park (optional)' })}
          {renderField({ label: 'Directions / How to get there', name: 'directions', type: 'textarea', placeholder: 'Describe transport options (optional)' })}
        </>
      )}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
        <p className="text-sm font-semibold text-gray-700">Location Map</p>
        <MapContainer
          center={[attractionForm.latitude, attractionForm.longitude]}
          zoom={13}
          scrollWheelZoom={true}
          className="h-64 rounded-2xl"
        >
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocationMapPicker
            position={[attractionForm.latitude, attractionForm.longitude]}
            onPositionChange={handleLocationSelected}
          />
        </MapContainer>
        <div className="flex flex-col gap-1">
          <p className="text-xs text-gray-500">Click or drag the marker to auto-fill GPS.</p>
          <div className="text-sm text-gray-500">Lat: {attractionForm.latitude.toFixed(5)}, Lng: {attractionForm.longitude.toFixed(5)}</div>
        </div>
      </div>
      {section('3. Photos & Media', 'Visuals bring the experience to life.',
        <>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Cover photo *</label>
            <input type="file" accept="image/*" onChange={(e) => handleCoverUpload(e.target.files)} className="w-full" />
            <p className="text-xs text-gray-500">
              {attractionForm.coverPhotoFiles.length ? `${attractionForm.coverPhotoFiles.length} file(s) ready` : 'Upload a hero photo.'}
            </p>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Gallery images *</label>
            <input type="file" accept="image/*" multiple onChange={(e) => handleGalleryUpload(e.target.files)} className="w-full" />
            <p className="text-xs text-gray-500">
              {attractionForm.galleryFiles.length ? `${attractionForm.galleryFiles.length} file(s) ready` : 'Upload 3-20 images.'}
            </p>
          </div>
          {renderField({ label: 'Video URL (optional)', name: 'video', placeholder: 'YouTube / Vimeo link' })}
        </>
      )}
      {section('4. Operating details', 'Schedule, seasonality, and accessibility.',
        <>
          {renderField({ label: 'Opening Days (Mon–Sun)', name: 'openingDays', placeholder: 'Mon–Sun' })}
          {renderField({ label: 'Opening Hour Start', name: 'openingHoursStart', type: 'time' })}
          {renderField({ label: 'Opening Hour End', name: 'openingHoursEnd', type: 'time' })}
          {renderField({ label: 'Seasonality notes', name: 'seasonality', placeholder: 'High season, low season...' })}
          {renderField({ label: 'Duration', name: 'duration', placeholder: '2 hours, half-day...' })}
          {renderField({ label: 'Minimum age requirement', name: 'minAge', placeholder: 'e.g., 12+' })}
          {renderField({ label: 'Accessibility info', name: 'accessibility', type: 'textarea', placeholder: 'Wheelchair access...' })}
          {renderField({ label: 'Available time slots', name: 'timeSlots', placeholder: '09:00, 12:00, 15:00' })}
        </>
      )}
      {section('5. Pricing & ticketing', 'Cover every financial expectation.',
        <>
          {renderField({ label: 'Ticket price (adult)', name: 'ticketAdult', type: 'number', placeholder: 'RWF' })}
          {renderField({ label: 'Ticket price (child)', name: 'ticketChild', type: 'number', placeholder: 'RWF' })}
          {renderField({ label: 'Ticket price (student)', name: 'ticketStudent', type: 'number', placeholder: 'RWF' })}
          {renderField({ label: 'Ticket price (group)', name: 'ticketGroup', type: 'number', placeholder: 'RWF' })}
          {renderField({ label: 'Discounts', name: 'discounts', placeholder: 'Promos, seasons...' })}
          {renderField({ label: 'Currency', name: 'currency', placeholder: 'RWF' })}
          {renderField({ label: 'Payment methods', name: 'paymentMethods', placeholder: 'Card, mobile money...' })}
          {renderField({ label: 'Cancellation policy', name: 'cancellationPolicy', type: 'textarea', placeholder: 'Free cancellation?' })}
          {renderField({ label: 'Refund policy', name: 'refundPolicy', type: 'textarea', placeholder: 'Full refund within 24h...' })}
        </>
      )}
      {section('6. Capacity & requirements', 'Understand group limits.',
        <>
          {renderField({ label: 'Maximum capacity', name: 'capacity', type: 'number', placeholder: 'Guests per session' })}
          {renderField({ label: 'Minimum number of guests', name: 'minGuests', type: 'number', placeholder: 'Minimum booking size' })}
          {renderRadioGroup('Booking required?', 'bookingRequired')}
          {renderField({ label: 'Meeting point / check-in instructions', name: 'checkinInstructions', type: 'textarea', placeholder: 'Meet by the red gate...' })}
        </>
      )}
      {section('7. Amenities & facilities', 'Showcase comforts.',
        <>
          {renderField({ label: 'Amenities', name: 'amenities', type: 'textarea', placeholder: 'Parking, restrooms, WiFi...' })}
          {renderRadioGroup('Guide available?', 'guideAvailable')}
          {renderField({ label: 'Audio guide languages', name: 'audioGuideLanguages', placeholder: 'English, French...' })}
          {renderField({ label: 'Safety equipment', name: 'safetyEquipment', placeholder: 'Life vests, helmets...' })}
        </>
      )}
      {section('8. Rules & restrictions', 'Clarify expectations.',
        <>
          {renderField({ label: 'Allowed / not allowed', name: 'rules', type: 'textarea', placeholder: 'Pets, smoking, photography...' })}
          {renderField({ label: 'Dress code', name: 'dressCode', placeholder: 'Modest clothing, swimwear...' })}
          {renderField({ label: 'Safety instructions', name: 'safetyInstructions', type: 'textarea', placeholder: 'Stay behind rope barriers...' })}
          {renderField({ label: 'Liability / waiver requirements', name: 'liability', type: 'textarea', placeholder: 'Guests must sign release...' })}
        </>
      )}
      {section('9. Contact information', 'How guests reach you.',
        <>
          {renderField({ label: 'Owner / manager name', name: 'contactName', placeholder: 'John Doe' })}
          {renderField({ label: 'Phone number', name: 'contactPhone', placeholder: '+250 78...' })}
          {renderField({ label: 'Email address', name: 'contactEmail', type: 'email', placeholder: 'owner@example.com' })}
          {renderField({ label: 'Website (optional)', name: 'contactWebsite', placeholder: 'https://...' })}
          {renderField({ label: 'Emergency contact (optional)', name: 'contactEmergency', placeholder: '+250 7...' })}
        </>
      )}
      <div className="text-right">
        <button type="submit" className="px-5 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700">Save attraction info</button>
      </div>
    </form>
  );

  const renderFlightForm = () => (
    <form className="space-y-6" onSubmit={handleFlightSubmit}>
      {flightStep === 1 && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Flight title</label>
            <input
              value={flightData.title}
              onChange={(e) => setFlightData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-4 py-2 border rounded-lg"
              placeholder="Kigali ↔ Nairobi"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Origin</label>
              <input
                value={flightData.origin}
                onChange={(e) => setFlightData(prev => ({ ...prev, origin: e.target.value }))}
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Destination</label>
              <input
                value={flightData.destination}
                onChange={(e) => setFlightData(prev => ({ ...prev, destination: e.target.value }))}
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
      {flightStep === 2 && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Aircraft / Operator</label>
            <input
              value={flightData.aircraft}
              onChange={(e) => setFlightData(prev => ({ ...prev, aircraft: e.target.value }))}
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Departure</label>
              <input
                type="datetime-local"
                value={flightData.departure}
                onChange={(e) => setFlightData(prev => ({ ...prev, departure: e.target.value }))}
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Arrival</label>
              <input
                type="datetime-local"
                value={flightData.arrival}
                onChange={(e) => setFlightData(prev => ({ ...prev, arrival: e.target.value }))}
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Price (RWF)</label>
            <input
              type="number"
              value={flightData.price}
              onChange={(e) => setFlightData(prev => ({ ...prev, price: e.target.value }))}
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>
        </div>
      )}
      {flightStep === 3 && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Stops</label>
            <input
              value={flightData.stops}
              onChange={(e) => setFlightData(prev => ({ ...prev, stops: e.target.value }))}
              className="w-full px-4 py-2 border rounded-lg"
              placeholder="Direct / 1 stop"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Seats available</label>
            <input
              type="number"
              value={flightData.seats}
              onChange={(e) => setFlightData(prev => ({ ...prev, seats: e.target.value }))}
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              value={flightData.description}
              onChange={(e) => setFlightData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-4 py-2 border rounded-lg"
              rows={3}
              placeholder="Add service notes, baggage rules, etc."
            />
          </div>
        </div>
      )}
      <div className="flex items-center justify-between">
        {flightStep > 1 && (
          <button type="button" onClick={() => setFlightStep(prev => Math.max(prev - 1, 1))} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">
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
      return <VehicleListingForm />;
    }
    if (listingType === 'attraction') {
      return renderAttractionForm();
    }
    if (listingType === 'flight') {
      return renderFlightForm();
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
          <EnhancedUploadProperty />
        ) : (
          renderNonStayContent()
        )}
      </div>
    </div>
  );
};

export default ListProperty;
