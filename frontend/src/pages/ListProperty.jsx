import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import EnhancedUploadProperty from './EnhancedUploadProperty';
import VehicleListingForm from '../components/VehicleListingForm';

const ListProperty = () => {
  const navigate = useNavigate();
  const [listingType, setListingType] = useState('stay'); // 'stay' | 'rental' | 'attraction' | 'flight'
  const [flightStep, setFlightStep] = useState(1);
  const [flightData, setFlightData] = useState({
    title: '', origin: '', destination: '', aircraft: '', departure: '', arrival: '', price: '', stops: '', description: '', seats: ''
  });
  const [attractionForm, setAttractionForm] = useState({
    name: '', category: '', shortDescription: '', fullDescription: '', highlights: '', country: '', city: '', address: '', gps: '', landmarks: '', directions: '',
    coverPhoto: '', gallery: '', video: '', openingDays: '', openingHoursStart: '', openingHoursEnd: '', seasonality: '', duration: '', minAge: '', accessibility: '',
    ticketAdult: '', ticketChild: '', ticketStudent: '', ticketGroup: '', discounts: '', currency: 'RWF', paymentMethods: '', cancellationPolicy: '', refundPolicy: '',
    capacity: '', minGuests: '', bookingRequired: 'yes', timeSlots: '', checkinInstructions: '', amenities: '', guideAvailable: '', audioGuideLanguages: '', safetyEquipment: '',
    rules: '', dressCode: '', safetyInstructions: '', liability: '', contactName: '', contactPhone: '', contactEmail: '', contactWebsite: '', contactEmergency: ''
  });

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

  const handleAttractionSubmit = (e) => {
    e.preventDefault();
    if (!attractionForm.name || !attractionForm.category || !attractionForm.country || !attractionForm.city) {
      toast.error('Name, category, country, and city are required before continuing.');
      return;
    }
    toast.success('Attraction checklist saved. Continue in the attraction workspace to finalize multimedia.');
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

  const renderAttractionForm = () => {
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

    const renderField = ({ label, name, type = 'text', placeholder = '', description = '' }) => (
      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        {type === 'textarea' ? (
          <textarea
            rows="3"
            value={attractionForm[name]}
            onChange={e => setAttractionForm(prev => ({ ...prev, [name]: e.target.value }))}
            placeholder={placeholder}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-[#a06b42]"
          />
        ) : (
          <input
            type={type}
            value={attractionForm[name]}
            onChange={e => setAttractionForm(prev => ({ ...prev, [name]: e.target.value }))}
            placeholder={placeholder}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-[#a06b42]"
          />
        )}
        {description && <p className="text-xs text-gray-500">{description}</p>}
      </div>
    );

    return (
      <form className="space-y-6" onSubmit={handleAttractionSubmit}>
        {section('1. Basic Information', 'Required to identify the attraction.',
          <>
            {renderField({ label: 'Attraction Name', name: 'name', placeholder: 'Kigali Cultural Walk' })}
            {renderField({ label: 'Category / Type', name: 'category', placeholder: 'Museum, park, tour...' })}
            {renderField({ label: 'Short Description', name: 'shortDescription', type: 'textarea', placeholder: '1–2 sentence summary' })}
            {renderField({ label: 'Full Description', name: 'fullDescription', type: 'textarea', placeholder: 'Detailed highlight narrative' })}
            {renderField({ label: 'Highlights / Key Features', name: 'highlights', type: 'textarea', placeholder: 'Bullet points separated by commas' })}
          </>
        )}
        {section('2. Location Details', 'Precision helps guests arrive smoothly.',
          <>
            {renderField({ label: 'Country', name: 'country', placeholder: 'Rwanda' })}
            {renderField({ label: 'City / Town / District', name: 'city', placeholder: 'Kigali' })}
            {renderField({ label: 'Exact Address', name: 'address', placeholder: 'Street, building name...' })}
            {renderField({ label: 'GPS Coordinates', name: 'gps', placeholder: 'Latitude, Longitude' })}
            {renderField({ label: 'Landmarks Nearby', name: 'landmarks', placeholder: 'University, hotel, park (optional)' })}
            {renderField({ label: 'Directions / How to get there', name: 'directions', type: 'textarea', placeholder: 'Describe transport options (optional)' })}
          </>
        )}
        {section('3. Photos & Media', 'Visuals bring the experience to life.',
          <>
            {renderField({ label: 'Cover Photo URL', name: 'coverPhoto', placeholder: 'https://...' })}
            {renderField({ label: 'Gallery Images (comma separated)', name: 'gallery', placeholder: 'image1.jpg, image2.jpg, ...' })}
            {renderField({ label: 'Video URL (optional)', name: 'video', placeholder: 'YouTube / Vimeo link' })}
          </>
        )}
        {section('4. Operating Details', 'Schedule, seasonality, and accessibility.',
          <>
            {renderField({ label: 'Opening Days (Mon–Sun)', name: 'openingDays', placeholder: 'Mon–Sun' })}
            {renderField({ label: 'Opening Hour Start', name: 'openingHoursStart', type: 'time' })}
            {renderField({ label: 'Opening Hour End', name: 'openingHoursEnd', type: 'time' })}
            {renderField({ label: 'Seasonality Notes', name: 'seasonality', placeholder: 'Open all year / high season...' })}
            {renderField({ label: 'Duration', name: 'duration', placeholder: '2 hours, half-day...' })}
            {renderField({ label: 'Minimum Age Requirement', name: 'minAge', placeholder: 'e.g., 12+' })}
            {renderField({ label: 'Accessibility Info', name: 'accessibility', type: 'textarea', placeholder: 'Wheelchair access, stroller-friendly...' })}
            {renderField({ label: 'Available Time Slots', name: 'timeSlots', placeholder: '9:00, 11:00, 14:00' })}
          </>
        )}
        {section('5. Pricing & Ticketing', 'Cover all financial expectations.',
          <>
            {renderField({ label: 'Ticket Price (Adult)', name: 'ticketAdult', type: 'number', placeholder: 'RWF' })}
            {renderField({ label: 'Ticket Price (Child)', name: 'ticketChild', type: 'number', placeholder: 'RWF' })}
            {renderField({ label: 'Ticket Price (Student)', name: 'ticketStudent', type: 'number', placeholder: 'RWF' })}
            {renderField({ label: 'Ticket Price (Group)', name: 'ticketGroup', type: 'number', placeholder: 'RWF' })}
            {renderField({ label: 'Discounts', name: 'discounts', placeholder: 'Seasonal, promo codes...' })}
            {renderField({ label: 'Currency', name: 'currency', placeholder: 'RWF' })}
            {renderField({ label: 'Payment Methods', name: 'paymentMethods', placeholder: 'Card, mobile money...' })}
            {renderField({ label: 'Cancellation Policy', name: 'cancellationPolicy', type: 'textarea', placeholder: 'Free cancellation? deadline?' })}
            {renderField({ label: 'Refund Policy', name: 'refundPolicy', type: 'textarea', placeholder: 'Full refund within 24h...' })}
          </>
        )}
        {section('6. Capacity & Requirements', 'Understand how many guests you can host.',
          <>
            {renderField({ label: 'Maximum Capacity', name: 'capacity', type: 'number', placeholder: 'Guests per day/session' })}
            {renderField({ label: 'Minimum Number of Guests', name: 'minGuests', type: 'number', placeholder: 'Minimum booking size' })}
            {renderField({ label: 'Booking Required?', name: 'bookingRequired', placeholder: 'Yes / No' })}
            {renderField({ label: 'Check-in Instructions / Meeting Point', name: 'checkinInstructions', type: 'textarea', placeholder: 'Meet at the red gate...' })}
          </>
        )}
        {section('7. Amenities & Facilities', 'Let guests know what comforts you offer.',
          <>
            {renderField({ label: 'Amenities', name: 'amenities', type: 'textarea', placeholder: 'Parking, restrooms, WiFi...' })}
            {renderField({ label: 'Guide Available', name: 'guideAvailable', placeholder: 'Yes/No' })}
            {renderField({ label: 'Audio Guide Languages', name: 'audioGuideLanguages', placeholder: 'English, French...' })}
            {renderField({ label: 'Safety Equipment', name: 'safetyEquipment', placeholder: 'Life vests, helmets...' })}
          </>
        )}
        {section('8. Rules & Restrictions', 'Clarify expectations for guests.',
          <>
            {renderField({ label: 'Allowed / Not Allowed', name: 'rules', type: 'textarea', placeholder: 'Pets, smoking, photography...' })}
            {renderField({ label: 'Dress Code', name: 'dressCode', placeholder: 'Modest clothing, swimwear...' })}
            {renderField({ label: 'Safety Instructions', name: 'safetyInstructions', type: 'textarea', placeholder: 'Stay behind rope barriers...' })}
            {renderField({ label: 'Liability / Waiver Requirements', name: 'liability', type: 'textarea', placeholder: 'Guests must sign release...' })}
          </>
        )}
        {section('9. Contact Information', 'How to reach the manager/owner.',
          <>
            {renderField({ label: 'Owner / Manager Name', name: 'contactName', placeholder: 'John Doe' })}
            {renderField({ label: 'Phone Number', name: 'contactPhone', placeholder: '+250 78...' })}
            {renderField({ label: 'Email Address', name: 'contactEmail', type: 'email', placeholder: 'owner@example.com' })}
            {renderField({ label: 'Website (optional)', name: 'contactWebsite', placeholder: 'https://...' })}
            {renderField({ label: 'Emergency Contact (optional)', name: 'contactEmergency', placeholder: '+250 7...' })}
          </>
        )}
        <div className="text-right">
          <button type="submit" className="px-5 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700">Save attraction info</button>
        </div>
      </form>
    );
  };

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
