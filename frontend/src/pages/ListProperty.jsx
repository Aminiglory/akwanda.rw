import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import EnhancedUploadProperty from './EnhancedUploadProperty';
import VehicleListingForm from '../components/VehicleListingForm';
import { FaUpload } from 'react-icons/fa';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

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

const categoryOptions = [
  'National Park',
  'Hiking Trail',
  'Mountain / Volcano',
  'Lake Experience',
  'Waterfall',
  'Cultural Village',
  'Historical Site',
  'Genocide Memorial',
  'Museum',
  'Adventure Activity',
  'Wildlife Experience',
  'Eco-tour / Nature Walk',
  'City Tour',
  'Food & Drink Experience',
  'Art & Craft Experience',
  'Religious / Pilgrimage Site',
  'Farm / Plantation Tour',
  'Guided Tour',
  'Boat Activity',
  'Community Tourism',
  'Festival / Event Experience',
  'Camping Site',
  'Beach / Lakeside',
  'Educational Tour'
];

const yesNoOptions = [
  { label: 'Yes', value: 'yes' },
  { label: 'No', value: 'no' }
];

const openingDayOptions = ['Weekend', 'Monday–Friday', 'Whole week'];

const attractionCurrencyOptions = ['RWF', 'USD', 'EUR', 'KES', 'UGX', 'TZS'];

const paymentMethodOptions = [
  'Mobile money (MoMoPay)',
  'Cash on arrival',
  'Card payment (POS / online)',
  'Bank transfer'
];

const refundPolicyOptions = [
  'No refund for early cancellation (unless stated otherwise).',
  'Full refund for cancellations within a defined window before the visit (for example 48 hours or 7 days).',
  'Late cancellations may result in partial or no refund.',
  'No refund for no-shows.',
  'Refunds offered only if the attraction is closed or unavailable due to unforeseen circumstances.',
  'Refunds are not provided for unused tickets.',
  'Group bookings may have different cancellation terms and conditions.'
];

const meetingPointOptions = [
  'Meet at the attraction address provided in the listing',
  'Meet at Kigali City Centre (Car Free Zone)',
  'Meet at Kigali Convention Centre main entrance',
  'Meet at Kigali International Airport arrivals hall',
  'Pickup from guest hotel in Kigali (by arrangement)'
];

const amenityOptions = [
  'Parking available',
  'Restrooms / toilets',
  'On-site restaurant or cafe',
  'Snack bar or kiosk',
  'Gift shop / souvenir shop',
  'Free WiFi',
  'Lockers or storage',
  'Changing rooms / showers',
  'Shaded seating areas',
  'Shuttle or transfer service'
];

const safetyEquipmentOptions = [
  'Life jackets',
  'Helmets',
  'Harnesses',
  'Safety ropes',
  'Reflective vests',
  'First-aid kit on-site',
  'Fire extinguishers',
  'Rescue boat or vehicle available'
];

const languageOptions = ['Kinyarwanda', 'English', 'French', 'Kiswahili', 'Other'];

const highlightGroups = [
  {
    label: 'Adventure & Activity Highlights',
    options: [
      'Hiking',
      'Trekking',
      'Gorilla Trekking',
      'Golden Monkey Trekking',
      'Canopy Walk',
      'Ziplining',
      'Mountain Biking',
      'Cycling Tour',
      'Kayaking',
      'Canoeing',
      'Boat Ride',
      'Fishing Experience',
      'Camping',
      'Horse Riding',
      'Nature Walk',
      'Bird Watching',
      'Safari Game Drive',
      'Night Walk',
      'Forest Walk',
    ],
  },
  {
    label: 'Nature Highlights',
    options: [
      'Scenic Viewpoint',
      'Lake View',
      'Mountain View',
      'Forest Environment',
      'Waterfall Access',
      'Wildlife Spotting',
      'Unique Flora & Fauna',
      'Photography Spots',
      'Sunrise Spot',
      'Sunset Spot',
    ],
  },
  {
    label: 'Cultural & Historical Highlights',
    options: [
      'Cultural Dance',
      'Traditional Crafts',
      'Storytelling Session',
      'Local Food Tasting',
      'Coffee Experience',
      'Tea Plantation Tour',
      'Community Interaction',
      'Heritage Site',
      'Art Exhibition',
      'Museum Guided Tour',
      'Historical Interpretation',
      'Cultural Workshop',
      'Traditional Music',
      'Traditional Cooking Class',
      'Basket Weaving',
    ],
  },
  {
    label: 'Safety & Professional Highlights',
    options: [
      'Certified Guides',
      'Safety Gear Provided',
      'Life Jackets Provided',
      'Trained Staff',
      'First Aid Available',
      'Family Friendly',
      'Suitable for Kids',
      'Suitable for Seniors',
      'Accessible Pathways',
    ],
  },
  {
    label: 'Convenience Highlights',
    options: [
      'Quick Experience (<1 hour)',
      'Half-day Activity',
      'Full-day Activity',
      'Multi-day Tour',
      'Private Tour Available',
      'Group Tour Available',
      'Transport Included',
      'Tickets Included',
      'Meals Included',
      'Photos Included',
      'Free Cancelation',
      'Instant Booking',
    ],
  },
  {
    label: 'Other Useful Highlights',
    options: [
      'Quiet Environment',
      'Educational Experience',
      'Eco-friendly',
      'Local Community Supported',
      'Wildlife Conservation Focus',
      'Unique/Rare Experience',
    ],
  },
];

const initialAttraction = {
  name: '',
  category: '',
  shortDescription: '',
  fullDescription: '',
  highlights: [],
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
  openingDays: 'Whole week',
  openingHoursStart: '',
  openingHoursEnd: '',
  seasonality: '',
  duration: '',
  minAge: '',
  accessibility: '',
  timeSlots: '',
  timeSlot1: '',
  timeSlot2: '',
  timeSlot3: '',
  ticketAdult: '',
  ticketChild: '',
  ticketStudent: '',
  ticketGroup: '',
  discounts: '',
  currency: 'RWF',
  paymentMethods: '',
  cancellationPolicy: '',
  refundPolicy: '',
  capacity: '',
  minGuests: '',
  bookingRequired: '',
  checkinInstructions: '',
  amenities: [],
  guideAvailable: '',
  audioGuideLanguages: '',
  safetyEquipment: [],
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
  // 1. Flight Basic Information
  airlineName: '',
  airlineIata: '',
  flightNumber: '',
  flightType: 'one-way',

  // 2. Departure Details
  departureAirport: '',
  departureAirportCode: '',
  departureTerminal: '',
  departureGate: '',
  departureCity: '',
  departureCountry: '',
  departureDate: '',
  departureTime: '',

  // 3. Arrival Details
  arrivalAirport: '',
  arrivalAirportCode: '',
  arrivalTerminal: '',
  arrivalGate: '',
  arrivalCity: '',
  arrivalCountry: '',
  arrivalDate: '',
  arrivalTime: '',

  // 4. Flight Duration
  durationTotal: '',
  layoverAirports: '',
  layoverDuration: '',
  totalTravelTime: '',

  // 5. Aircraft Details
  aircraftModel: '',
  aircraftCode: '',
  seatCapacity: '',
  seatLayout: '',

  // 6. Class Types Available
  economySeats: '',
  economySeatType: '',
  economyComfort: '',
  premiumSeats: '',
  premiumSeatType: '',
  premiumComfort: '',
  businessSeats: '',
  businessSeatType: '',
  businessComfort: '',
  firstSeats: '',
  firstSeatType: '',
  firstComfort: '',

  // 7. Fare & Price Information
  economyBaseFare: '',
  economyTaxes: '',
  economyServiceFees: '',
  economyFuelSurcharge: '',
  economyTotalPrice: '',
  economyRefundable: 'non-refundable',
  economyFareRules: '',
  premiumBaseFare: '',
  premiumTaxes: '',
  premiumServiceFees: '',
  premiumFuelSurcharge: '',
  premiumTotalPrice: '',
  premiumRefundable: 'non-refundable',
  premiumFareRules: '',
  businessBaseFare: '',
  businessTaxes: '',
  businessServiceFees: '',
  businessFuelSurcharge: '',
  businessTotalPrice: '',
  businessRefundable: 'non-refundable',
  businessFareRules: '',
  firstBaseFare: '',
  firstTaxes: '',
  firstServiceFees: '',
  firstFuelSurcharge: '',
  firstTotalPrice: '',
  firstRefundable: 'non-refundable',
  firstFareRules: '',

  // 8. Baggage Allowance
  carryOnBags: '',
  carryOnWeight: '',
  carryOnSize: '',
  checkedBags: '',
  checkedWeight: '',
  checkedSize: '',
  extraBaggageFees: '',

  // 9. Passenger Requirements
  idRequired: '',
  visaRequired: '',
  healthDocuments: '',
  ageRestrictions: '',

  // 10. Services Included / Add-ons
  mealIncluded: '',
  inFlightEntertainment: '',
  wifiAvailability: '',
  powerOutlets: '',
  specialAssistance: '',
  priorityBoarding: '',
  loungeAccess: '',
  extraLegroomOptions: '',
  upgradeAvailability: '',

  // 11. Policies
  cancellationPolicy: '',
  changePolicy: '',
  refundPolicy: '',
  deniedBoardingPolicy: '',
  overbookingHandling: '',

  // 12. Operational Information
  flightStatus: 'scheduled',
  trackingLink: '',
  gateChangeAlerts: '',
  weatherImpactInfo: '',

  // 13. Admin / Platform Internal Fields
  commissionPercentage: '',
  inventorySource: '',
  airlineSystem: '',
  gds: '',
  apiSupplier: '',
  markupSettings: '',
  flightVisibility: 'active',
  seatsRemaining: ''
};

const ListProperty = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [listingType, setListingType] = useState('stay');
  const [attractionStep, setAttractionStep] = useState(1);
  const [attractionForm, setAttractionForm] = useState(initialAttraction);
  const [flightStep, setFlightStep] = useState(1);
  const [flightData, setFlightData] = useState(initialFlightData);

  // If a specific listing type is provided in the URL, preselect its tile
  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search || '');
      const rawType = (params.get('type') || '').toLowerCase();
      const allowed = ['stay', 'rental', 'attraction', 'flight'];
      if (!rawType || !allowed.includes(rawType)) return;

      setListingType(rawType);
      if (rawType === 'attraction') {
        setAttractionStep(1);
      }
      if (rawType === 'flight') {
        setFlightStep(1);
      }
    } catch (_) {
      // best-effort only
    }
  }, [location.search]);

  useEffect(() => {
    const { openingHoursStart, openingHoursEnd, duration } = attractionForm;
    if (!openingHoursStart || !openingHoursEnd) return;
    const [sh, sm] = openingHoursStart.split(':').map(Number);
    const [eh, em] = openingHoursEnd.split(':').map(Number);
    if ([sh, sm, eh, em].some(v => Number.isNaN(v))) return;
    let startMinutes = sh * 60 + sm;
    let endMinutes = eh * 60 + em;
    if (endMinutes <= startMinutes) {
      endMinutes += 24 * 60;
    }
    const diff = endMinutes - startMinutes;
    if (diff <= 0) return;
    const hours = Math.floor(diff / 60);
    const minutes = diff % 60;
    const label = minutes
      ? `${hours} hour${hours !== 1 ? 's' : ''} ${minutes} min`
      : `${hours} hour${hours !== 1 ? 's' : ''}`;
    if (label !== duration) {
      setAttractionForm(prev => ({ ...prev, duration: label }));
    }
  }, [attractionForm.openingHoursStart, attractionForm.openingHoursEnd]);

  useEffect(() => {
    const slots = [attractionForm.timeSlot1, attractionForm.timeSlot2, attractionForm.timeSlot3]
      .map(s => String(s || '').trim())
      .filter(Boolean);
    const combined = slots.join(', ');
    if (combined === (attractionForm.timeSlots || '')) return;
    setAttractionForm(prev => ({ ...prev, timeSlots: combined }));
  }, [attractionForm.timeSlot1, attractionForm.timeSlot2, attractionForm.timeSlot3]);

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
            onClick={() => {
              setListingType(type.id);
              if (type.id === 'attraction') {
                setAttractionStep(1);
              }
            }}
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

  const renderAmenitySelector = () => {
    const current = Array.isArray(attractionForm.amenities)
      ? attractionForm.amenities
      : String(attractionForm.amenities || '')
          .split(',')
          .map(s => s.trim())
          .filter(Boolean);

    const toggle = (value) => {
      setAttractionForm(prev => {
        const existing = Array.isArray(prev.amenities)
          ? prev.amenities
          : String(prev.amenities || '')
              .split(',')
              .map(s => s.trim())
              .filter(Boolean);
        return existing.includes(value)
          ? { ...prev, amenities: existing.filter(v => v !== value) }
          : { ...prev, amenities: [...existing, value] };
      });
    };

    return (
      <div className="space-y-2 md:col-span-2">
        <p className="text-sm font-medium text-gray-700">Amenities & facilities</p>
        <p className="text-xs text-gray-500">Select all amenities that apply to this attraction.</p>
        <div className="flex flex-wrap gap-2">
          {amenityOptions.map(option => {
            const active = current.includes(option);
            return (
              <button
                key={option}
                type="button"
                onClick={() => toggle(option)}
                className={`px-2.5 py-1 rounded-full border text-xs transition-colors ${
                  active
                    ? 'bg-[#a06b42] border-[#a06b42] text-white'
                    : 'border-gray-300 text-gray-700 hover:border-[#a06b42] hover:text-[#a06b42]'
                }`}
              >
                {option}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderSafetyEquipmentSelector = () => {
    const current = Array.isArray(attractionForm.safetyEquipment)
      ? attractionForm.safetyEquipment
      : String(attractionForm.safetyEquipment || '')
          .split(',')
          .map(s => s.trim())
          .filter(Boolean);

    const toggle = (value) => {
      setAttractionForm(prev => {
        const existing = Array.isArray(prev.safetyEquipment)
          ? prev.safetyEquipment
          : String(prev.safetyEquipment || '')
              .split(',')
              .map(s => s.trim())
              .filter(Boolean);
        return existing.includes(value)
          ? { ...prev, safetyEquipment: existing.filter(v => v !== value) }
          : { ...prev, safetyEquipment: [...existing, value] };
      });
    };

    return (
      <div className="space-y-2 md:col-span-2">
        <p className="text-sm font-medium text-gray-700">Safety equipment provided</p>
        <p className="text-xs text-gray-500">Select all safety items you provide to guests.</p>
        <div className="flex flex-wrap gap-2">
          {safetyEquipmentOptions.map(option => {
            const active = current.includes(option);
            return (
              <button
                key={option}
                type="button"
                onClick={() => toggle(option)}
                className={`px-2.5 py-1 rounded-full border text-xs transition-colors ${
                  active
                    ? 'bg-[#a06b42] border-[#a06b42] text-white'
                    : 'border-gray-300 text-gray-700 hover:border-[#a06b42] hover:text-[#a06b42]'
                }`}
              >
                {option}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderPaymentMethodsField = () => (
    <div className="space-y-1 md:col-span-2">
      <p className="text-sm font-medium text-gray-700">Preferred payment method</p>
      <div className="flex flex-col gap-2">
        {paymentMethodOptions.map(option => (
          <label key={option} className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input
              type="radio"
              name="paymentMethods"
              value={option}
              checked={attractionForm.paymentMethods === option}
              onChange={() => setAttractionForm(prev => ({ ...prev, paymentMethods: option }))}
              className="form-radio text-[#a06b42] h-4 w-4"
            />
            {option}
          </label>
        ))}
      </div>
    </div>
  );

  const renderRefundPolicyField = () => (
    <div className="space-y-1 md:col-span-2">
      <p className="text-sm font-medium text-gray-700">Refund & cancellation policy</p>
      <p className="text-xs text-gray-500">Choose the statement that best describes how refunds and cancellations are handled.</p>
      <div className="flex flex-col gap-2">
        {refundPolicyOptions.map(option => (
          <label key={option} className="inline-flex items-start gap-2 text-sm text-gray-700">
            <input
              type="radio"
              name="refundPolicy"
              value={option}
              checked={attractionForm.refundPolicy === option}
              onChange={() => setAttractionForm(prev => ({
                ...prev,
                refundPolicy: option,
                cancellationPolicy: option
              }))}
              className="mt-1 form-radio text-[#a06b42] h-4 w-4"
            />
            <span>{option}</span>
          </label>
        ))}
      </div>
    </div>
  );

  const reverseGeocode = async (lat, lng) => {
    try {
      const params = new URLSearchParams({
        format: 'json',
        lat: String(lat),
        lon: String(lng),
        addressdetails: '1'
      });
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?${params.toString()}`, {
        headers: {
          'User-Agent': 'AKWANDA/1.0',
          Accept: 'application/json'
        }
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.address || null;
    } catch (error) {
      console.error('Failed to reverse geocode:', error);
      return null;
    }
  };

  const renderHighlightsSelector = () => {
    const current = Array.isArray(attractionForm.highlights) ? attractionForm.highlights : [];

    const toggle = (tag) => {
      setAttractionForm(prev => {
        const existing = Array.isArray(prev.highlights) ? prev.highlights : [];
        return existing.includes(tag)
          ? { ...prev, highlights: existing.filter(t => t !== tag) }
          : { ...prev, highlights: [...existing, tag] };
      });
    };

    return (
      <div className="space-y-2 md:col-span-2">
        <p className="text-sm font-medium text-gray-700">Highlights / Key Features</p>
        <p className="text-xs text-gray-500 mb-1">Select all that apply. These help guests understand what makes this attraction special.</p>
        <div className="space-y-4 max-h-72 overflow-y-auto pr-1">
          {highlightGroups.map(group => (
            <div key={group.label} className="space-y-2">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{group.label}</p>
              <div className="flex flex-wrap gap-2">
                {group.options.map(option => {
                  const checked = current.includes(option);
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => toggle(option)}
                      className={`px-2.5 py-1 rounded-full border text-xs transition-colors ${
                        checked
                          ? 'bg-[#a06b42] border-[#a06b42] text-white'
                          : 'border-gray-300 text-gray-700 hover:border-[#a06b42] hover:text-[#a06b42]'
                      }`}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const handleLocationSelected = async ({ lat, lng }) => {
    const address = await reverseGeocode(lat, lng);
    const cityOrDistrict = address?.city || address?.town || address?.village || address?.county || '';
    const districtHint = address?.state_district || address?.city_district || address?.suburb || '';
    const road = address?.road || '';
    const houseNumber = address?.house_number || '';
    const exactAddress = [houseNumber, road, address?.neighbourhood, address?.quarter].filter(Boolean).join(' ').trim();
    const directionsHint = address?.display_name || road || '';
    const landmarkHint = address?.attraction || address?.tourism || address?.leisure || address?.building || address?.shop || '';
    setAttractionForm((prev) => ({
      ...prev,
      latitude: lat,
      longitude: lng,
      gps: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
      locationMap: `Lat ${lat.toFixed(5)}, Lng ${lng.toFixed(5)}`,
      country: address?.country || prev.country,
      city: cityOrDistrict || prev.city,
      address: exactAddress || prev.address,
      directions: directionsHint || prev.directions,
      landmarks: landmarkHint || prev.landmarks,
      cityDistrict: districtHint || prev.cityDistrict
    }));
  };

  const handleCoverUpload = (files) => setAttractionForm(prev => ({ ...prev, coverPhotoFiles: Array.from(files || []) }));
  const handleGalleryUpload = (files) => setAttractionForm(prev => ({ ...prev, galleryFiles: Array.from(files || []) }));

  const uploadAttractionImages = async (id, files) => {
    if (!files?.length) return;
    try {
      const fd = new FormData();
      Array.from(files).forEach((file) => fd.append('images', file));
      const res = await fetch(`${API_URL}/api/attractions/${id}/images`, {
        method: 'POST',
        credentials: 'include',
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Failed to upload images');
    } catch (error) {
      console.error('[AttractionWizard][uploadImages] error', error);
      toast.error(error.message || 'Could not upload images');
    }
  };

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

  const totalAttractionSteps = 9;
  const totalFlightSteps = 13;

  const validateAttractionStep = (step) => {
    if (step === 1) {
      if (!attractionForm.name || !attractionForm.category || !attractionForm.shortDescription) {
        toast.error('Add attraction name, category and a short description.');
        return false;
      }
    }
    if (step === 2) {
      if (!attractionForm.country || !attractionForm.city || !attractionForm.address) {
        toast.error('Add country, city and exact address.');
        return false;
      }
    }
    if (step === 3) {
      if (!attractionForm.coverPhotoFiles?.length || !attractionForm.galleryFiles?.length) {
        toast.error('Upload a cover photo and at least one gallery image.');
        return false;
      }
    }
    if (step === 5) {
      if (!attractionForm.ticketAdult || !attractionForm.currency) {
        toast.error('Add adult ticket price and currency.');
        return false;
      }
    }
    if (step === 9) {
      if (!attractionForm.contactPhone || !attractionForm.contactEmail) {
        toast.error('Add contact phone and email.');
        return false;
      }
    }
    return true;
  };

  const handleAttractionNext = () => {
    if (!validateAttractionStep(attractionStep)) return;
    setAttractionStep(prev => Math.min(totalAttractionSteps, prev + 1));
  };

  const handleAttractionSubmit = async (e) => {
    e.preventDefault();
    if (!attractionForm.name || !attractionForm.category || !attractionForm.city || !attractionForm.country) {
      toast.error('Name, category, country, and city are required.');
      return;
    }

    try {
      const amenitiesArray = Array.isArray(attractionForm.amenities)
        ? attractionForm.amenities
        : String(attractionForm.amenities || '')
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
      const safetyEquipmentArray = Array.isArray(attractionForm.safetyEquipment)
        ? attractionForm.safetyEquipment
        : String(attractionForm.safetyEquipment || '')
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
      const payload = {
        ...attractionForm,
        // Map to Attraction model core fields so it behaves like OwnerAttractionsDashboard.createItem
        name: attractionForm.name,
        description: attractionForm.fullDescription || attractionForm.shortDescription || attractionForm.description || '',
        location: attractionForm.address || attractionForm.gps || attractionForm.city || '',
        city: attractionForm.city || '',
        country: attractionForm.country || 'Rwanda',
        // Align category and pricing with main attractions endpoints
        category: String(attractionForm.category || '').toLowerCase(),
        price: Number(attractionForm.ticketAdult || attractionForm.ticketGroup || 0),
        currency: attractionForm.currency || 'RWF',
        duration: attractionForm.duration || '',
        capacity: Number(attractionForm.capacity || 0) || undefined,
        // Normalize highlights and amenities into arrays
        highlights: Array.isArray(attractionForm.highlights)
          ? attractionForm.highlights
          : String(attractionForm.highlights || '')
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean),
        amenities: amenitiesArray,
        safetyEquipment: safetyEquipmentArray,
        // Operating hours structure expected by model
        operatingHours: {
          open: attractionForm.openingHoursStart || undefined,
          close: attractionForm.openingHoursEnd || undefined,
        },
        // New attractions from this wizard should be visible by default
        isActive: true,
      };

      const res = await fetch(`${API_URL}/api/attractions`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || 'Failed to save attraction');
      }

      const created = data.attraction || data;
      const imageFiles = [
        ...(attractionForm.coverPhotoFiles || []),
        ...(attractionForm.galleryFiles || []),
      ];
      if (created && created._id && imageFiles.length) {
        await uploadAttractionImages(created._id, imageFiles);
      }

      toast.success('Attraction saved and will appear on the attractions page once active.');
    } catch (error) {
      toast.error(error.message || 'Could not save attraction');
    }
  };

  const validateFlightStep = (step) => {
    if (step === 1 && (!flightData.airlineName || !flightData.airlineIata || !flightData.flightNumber || !flightData.flightType)) {
      toast.error('Add airline name, IATA code, flight number and type.');
      return false;
    }
    if (step === 2 && (!flightData.departureAirport || !flightData.departureCity || !flightData.departureCountry || !flightData.departureDate || !flightData.departureTime)) {
      toast.error('Complete departure airport, city, country, date and time.');
      return false;
    }
    if (step === 3 && (!flightData.arrivalAirport || !flightData.arrivalCity || !flightData.arrivalCountry || !flightData.arrivalDate || !flightData.arrivalTime)) {
      toast.error('Complete arrival airport, city, country, date and time.');
      return false;
    }
    if (step === 4 && !flightData.durationTotal) {
      toast.error('Provide total flight duration.');
      return false;
    }
    if (step === 5 && (!flightData.aircraftModel || !flightData.seatCapacity)) {
      toast.error('Add aircraft model and seat capacity.');
      return false;
    }
    return true;
  };

  const handleFlightSubmit = (e) => {
    e.preventDefault();
    if (!validateFlightStep(flightStep)) return;
    if (flightStep < totalFlightSteps) {
      setFlightStep(prev => prev + 1);
      return;
    }
    toast.success('Flight details saved. You can now connect pricing and inventory in the flights workspace.');
  };

  const renderAttractionForm = () => (
    <form className="space-y-6" onSubmit={handleAttractionSubmit}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">Step {attractionStep} of {totalAttractionSteps}</div>
        </div>
        <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#a06b42]"
            style={{ width: `${(attractionStep / totalAttractionSteps) * 100}%` }}
          />
        </div>
      </div>

      {attractionStep === 1 && section('1. Basic information', 'Required to identify the attraction.',
        <>
          {renderField({ label: 'Attraction Name *', name: 'name', placeholder: 'Kigali Cultural Walk' })}
          {renderField({ label: 'Category / Type *', name: 'category', type: 'select', options: categoryOptions })}
          {renderField({ label: 'Short Description *', name: 'shortDescription', type: 'textarea', placeholder: '1–2 sentence summary' })}
          {renderField({ label: 'Full Description', name: 'fullDescription', type: 'textarea', placeholder: 'Detailed highlight narrative' })}
          {renderHighlightsSelector()}
        </>
      )}

      {attractionStep === 2 && (
        <>
          {section('2. Location details', 'Precision helps guests arrive smoothly.',
            <>
              {renderField({ label: 'Country *', name: 'country', placeholder: 'Rwanda' })}
              {renderField({ label: 'City / Town / District *', name: 'city', placeholder: 'Kigali' })}
              {renderField({ label: 'Exact Address *', name: 'address', placeholder: 'Street, building name...' })}
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
        </>
      )}

      {attractionStep === 3 && section('3. Photos & Media', 'Visuals bring the experience to life.',
        <>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Cover photo *</label>
            <div className="border-2 border-dashed border-gray-300 rounded-2xl p-6 flex items-center justify-center text-center bg-gray-50/50">
              <input
                id="attraction-cover-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleCoverUpload(e.target.files)}
              />
              <label
                htmlFor="attraction-cover-upload"
                className="cursor-pointer inline-flex flex-col items-center gap-2 text-sm text-gray-700"
              >
                <FaUpload className="text-xl text-gray-400" />
                <span>
                  {attractionForm.coverPhotoFiles.length
                    ? `${attractionForm.coverPhotoFiles.length} file(s) selected`
                    : 'Upload cover photo'}
                </span>
                <span className="text-xs text-gray-500">Upload a hero photo.</span>
              </label>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Gallery images *</label>
            <div className="border-2 border-dashed border-gray-300 rounded-2xl p-6 flex items-center justify-center text-center bg-gray-50/50">
              <input
                id="attraction-gallery-upload"
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleGalleryUpload(e.target.files)}
              />
              <label
                htmlFor="attraction-gallery-upload"
                className="cursor-pointer inline-flex flex-col items-center gap-2 text-sm text-gray-700"
              >
                <FaUpload className="text-xl text-gray-400" />
                <span>
                  {attractionForm.galleryFiles.length
                    ? `${attractionForm.galleryFiles.length} file(s) selected`
                    : 'Upload gallery images'}
                </span>
                <span className="text-xs text-gray-500">Upload 3–20 images.</span>
              </label>
            </div>
          </div>
          {renderField({ label: 'Video URL (optional)', name: 'video', placeholder: 'YouTube / Vimeo link' })}
        </>
      )}

      {attractionStep === 4 && section('4. Operating details', 'Opening days, hours and typical visit length.',
        <>
          {renderField({ label: 'Opening Days', name: 'openingDays', type: 'select', options: openingDayOptions })}
          {renderField({ label: 'Opening Hour Start', name: 'openingHoursStart', type: 'time' })}
          {renderField({ label: 'Opening Hour End', name: 'openingHoursEnd', type: 'time' })}
          {renderField({ label: 'Duration (auto-calculated)', name: 'duration', placeholder: 'Will update based on opening and closing hours' })}
          {renderField({ label: 'Minimum age requirement', name: 'minAge', placeholder: 'e.g., 12+' })}
          {renderField({ label: 'Available time slot 1', name: 'timeSlot1', type: 'time' })}
          {renderField({ label: 'Available time slot 2', name: 'timeSlot2', type: 'time' })}
          {renderField({ label: 'Available time slot 3', name: 'timeSlot3', type: 'time' })}
        </>
      )}

      {attractionStep === 5 && section('5. Pricing & ticketing', 'Cover every financial expectation.',
        <>
          {renderField({ label: 'Ticket price (adult) *', name: 'ticketAdult', type: 'number', placeholder: 'RWF' })}
          {renderField({ label: 'Ticket price (child)', name: 'ticketChild', type: 'number', placeholder: 'RWF' })}
          {renderField({ label: 'Ticket price (student)', name: 'ticketStudent', type: 'number', placeholder: 'RWF' })}
          {renderField({ label: 'Ticket price (group)', name: 'ticketGroup', type: 'number', placeholder: 'RWF' })}
          {renderField({ label: 'Currency *', name: 'currency', type: 'select', options: attractionCurrencyOptions })}
          {renderPaymentMethodsField()}
          {renderRefundPolicyField()}
        </>
      )}

      {attractionStep === 6 && section('6. Capacity & requirements', 'Understand group limits.',
        <>
          {renderField({ label: 'Maximum capacity', name: 'capacity', type: 'number', placeholder: 'Guests per session' })}
          {renderField({ label: 'Minimum number of guests', name: 'minGuests', type: 'number', placeholder: 'Minimum booking size' })}
          {renderRadioGroup('Booking required?', 'bookingRequired')}
          {renderField({ label: 'Meeting point / check-in location', name: 'checkinInstructions', type: 'select', options: meetingPointOptions })}
        </>
      )}

      {attractionStep === 7 && section('7. Amenities & facilities', 'Showcase comforts and safety.',
        <>
          {renderAmenitySelector()}
          {renderRadioGroup('Guide available?', 'guideAvailable')}
          {renderField({ label: 'Main language of the experience', name: 'audioGuideLanguages', type: 'select', options: languageOptions })}
          {renderSafetyEquipmentSelector()}
        </>
      )}

      {attractionStep === 8 && section('8. Rules & restrictions', 'Clarify expectations.',
        <>
          {renderField({ label: 'Allowed / not allowed', name: 'rules', type: 'textarea', placeholder: 'Pets, smoking, photography...' })}
          {renderField({ label: 'Dress code', name: 'dressCode', placeholder: 'Modest clothing, swimwear...' })}
          {renderField({ label: 'Safety instructions', name: 'safetyInstructions', type: 'textarea', placeholder: 'Stay behind rope barriers...' })}
          {renderField({ label: 'Liability / waiver requirements', name: 'liability', type: 'textarea', placeholder: 'Guests must sign release...' })}
        </>
      )}

      {attractionStep === 9 && section('9. Contact information', 'How guests reach you.',
        <>
          {renderField({ label: 'Owner / manager name', name: 'contactName', placeholder: 'John Doe' })}
          {renderField({ label: 'Phone number *', name: 'contactPhone', placeholder: '+250 78...' })}
          {renderField({ label: 'Email address *', name: 'contactEmail', type: 'email', placeholder: 'owner@example.com' })}
          {renderField({ label: 'Website (optional)', name: 'contactWebsite', placeholder: 'https://...' })}
          {renderField({ label: 'Emergency contact (optional)', name: 'contactEmergency', placeholder: '+250 7...' })}
        </>
      )}

      <div className="flex items-center justify-between mt-4">
        <button
          type="button"
          onClick={() => setAttractionStep(prev => Math.max(1, prev - 1))}
          disabled={attractionStep === 1}
          className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Back
        </button>
        <div className="ml-auto flex items-center gap-3">
          {attractionStep < totalAttractionSteps && (
            <button
              type="button"
              onClick={handleAttractionNext}
              className="px-5 py-2.5 bg-[#a06b42] text-white rounded-lg hover:bg-[#8f5a32]"
            >
              Next
            </button>
          )}
          {attractionStep === totalAttractionSteps && (
            <button
              type="submit"
              className="px-5 py-2.5 bg-[#a06b42] text-white rounded-lg hover:bg-[#8f5a32]"
            >
              Save attraction info
            </button>
          )}
        </div>
      </div>
    </form>
  );

  const renderFlightForm = () => (
    <form className="space-y-6" onSubmit={handleFlightSubmit}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">Step {flightStep} of {totalFlightSteps}</div>
        </div>
        <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#a06b42]"
            style={{ width: `${(flightStep / totalFlightSteps) * 100}%` }}
          />
        </div>
      </div>

      {flightStep === 1 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <div>
            <p className="text-xl font-semibold text-gray-900">✈️ 1. Flight Basic Information</p>
            <p className="text-sm text-gray-500">Core identifiers for this flight.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">Airline Name</label>
              <input
                value={flightData.airlineName}
                onChange={(e) => setFlightData(prev => ({ ...prev, airlineName: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Airline IATA Code</label>
              <input
                value={flightData.airlineIata}
                onChange={(e) => setFlightData(prev => ({ ...prev, airlineIata: e.target.value.toUpperCase() }))}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl"
                placeholder="WB"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Flight Number</label>
              <input
                value={flightData.flightNumber}
                onChange={(e) => setFlightData(prev => ({ ...prev, flightNumber: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl"
                placeholder="WB302"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Flight Type</label>
              <select
                value={flightData.flightType}
                onChange={(e) => setFlightData(prev => ({ ...prev, flightType: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-white"
              >
                <option value="one-way">One-way</option>
                <option value="round-trip">Round-trip</option>
                <option value="multi-city">Multi-city</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {flightStep === 2 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <div>
            <p className="text-xl font-semibold text-gray-900">✈️ 2. Departure Details</p>
            <p className="text-sm text-gray-500">Where and when the journey starts.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">Departure Airport</label>
              <input
                value={flightData.departureAirport}
                onChange={(e) => setFlightData(prev => ({ ...prev, departureAirport: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl"
                placeholder="Kigali International Airport"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Departure Airport Code</label>
              <input
                value={flightData.departureAirportCode}
                onChange={(e) => setFlightData(prev => ({ ...prev, departureAirportCode: e.target.value.toUpperCase() }))}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl"
                placeholder="KGL"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Departure Terminal</label>
              <input
                value={flightData.departureTerminal}
                onChange={(e) => setFlightData(prev => ({ ...prev, departureTerminal: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Departure Gate (optional)</label>
              <input
                value={flightData.departureGate}
                onChange={(e) => setFlightData(prev => ({ ...prev, departureGate: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Departure City & Country</label>
              <input
                value={`${flightData.departureCity}${flightData.departureCity && flightData.departureCountry ? ', ' : ''}${flightData.departureCountry}`}
                onChange={(e) => {
                  const [city, country] = e.target.value.split(',').map((s) => s.trim());
                  setFlightData(prev => ({ ...prev, departureCity: city || '', departureCountry: country || '' }));
                }}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl"
                placeholder="Kigali, Rwanda"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Departure Date</label>
                <input
                  type="date"
                  value={flightData.departureDate}
                  onChange={(e) => setFlightData(prev => ({ ...prev, departureDate: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Departure Time</label>
                <input
                  type="time"
                  value={flightData.departureTime}
                  onChange={(e) => setFlightData(prev => ({ ...prev, departureTime: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {flightStep === 3 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <div>
            <p className="text-xl font-semibold text-gray-900">✈️ 3. Arrival Details</p>
            <p className="text-sm text-gray-500">Where and when the journey ends.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">Arrival Airport</label>
              <input
                value={flightData.arrivalAirport}
                onChange={(e) => setFlightData(prev => ({ ...prev, arrivalAirport: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Arrival Airport Code</label>
              <input
                value={flightData.arrivalAirportCode}
                onChange={(e) => setFlightData(prev => ({ ...prev, arrivalAirportCode: e.target.value.toUpperCase() }))}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Arrival Terminal</label>
              <input
                value={flightData.arrivalTerminal}
                onChange={(e) => setFlightData(prev => ({ ...prev, arrivalTerminal: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Arrival Gate (optional)</label>
              <input
                value={flightData.arrivalGate}
                onChange={(e) => setFlightData(prev => ({ ...prev, arrivalGate: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Arrival City & Country</label>
              <input
                value={`${flightData.arrivalCity}${flightData.arrivalCity && flightData.arrivalCountry ? ', ' : ''}${flightData.arrivalCountry}`}
                onChange={(e) => {
                  const [city, country] = e.target.value.split(',').map((s) => s.trim());
                  setFlightData(prev => ({ ...prev, arrivalCity: city || '', arrivalCountry: country || '' }));
                }}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl"
                placeholder="Nairobi, Kenya"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Arrival Date</label>
                <input
                  type="date"
                  value={flightData.arrivalDate}
                  onChange={(e) => setFlightData(prev => ({ ...prev, arrivalDate: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Arrival Time</label>
                <input
                  type="time"
                  value={flightData.arrivalTime}
                  onChange={(e) => setFlightData(prev => ({ ...prev, arrivalTime: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {flightStep === 4 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <div>
            <p className="text-xl font-semibold text-gray-900">✈️ 4. Flight Duration</p>
            <p className="text-sm text-gray-500">Overall timing including layovers.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">Total Duration (HH:MM)</label>
              <input
                value={flightData.durationTotal}
                onChange={(e) => setFlightData(prev => ({ ...prev, durationTotal: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl"
                placeholder="02:30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Layover Airports (if any)</label>
              <input
                value={flightData.layoverAirports}
                onChange={(e) => setFlightData(prev => ({ ...prev, layoverAirports: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl"
                placeholder="KGL, EBB"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Layover Duration</label>
              <input
                value={flightData.layoverDuration}
                onChange={(e) => setFlightData(prev => ({ ...prev, layoverDuration: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl"
                placeholder="01:00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Total Travel Time</label>
              <input
                value={flightData.totalTravelTime}
                onChange={(e) => setFlightData(prev => ({ ...prev, totalTravelTime: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl"
                placeholder="03:30"
              />
            </div>
          </div>
        </div>
      )}

      {flightStep === 5 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <div>
            <p className="text-xl font-semibold text-gray-900">✈️ 5. Aircraft Details</p>
            <p className="text-sm text-gray-500">The aircraft operating this route.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">Aircraft Model</label>
              <input
                value={flightData.aircraftModel}
                onChange={(e) => setFlightData(prev => ({ ...prev, aircraftModel: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl"
                placeholder="Boeing 737-800"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Aircraft Code</label>
              <input
                value={flightData.aircraftCode}
                onChange={(e) => setFlightData(prev => ({ ...prev, aircraftCode: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Seat Capacity</label>
              <input
                type="number"
                value={flightData.seatCapacity}
                onChange={(e) => setFlightData(prev => ({ ...prev, seatCapacity: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Seat Layout</label>
              <input
                value={flightData.seatLayout}
                onChange={(e) => setFlightData(prev => ({ ...prev, seatLayout: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl"
                placeholder="3-3, 2-4-2, etc."
              />
            </div>
          </div>
        </div>
      )}

      {flightStep === 6 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <div>
            <p className="text-xl font-semibold text-gray-900">✈️ 6. Class Types Available</p>
            <p className="text-sm text-gray-500">Seat availability and comfort for each cabin.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-3">
              <p className="text-sm font-semibold text-gray-800">Economy</p>
              <input
                className="w-full px-4 py-2 border border-gray-200 rounded-xl"
                placeholder="Seats available"
                value={flightData.economySeats}
                onChange={(e) => setFlightData(prev => ({ ...prev, economySeats: e.target.value }))}
              />
              <input
                className="w-full px-4 py-2 border border-gray-200 rounded-xl"
                placeholder="Seat type (recliner, standard, etc.)"
                value={flightData.economySeatType}
                onChange={(e) => setFlightData(prev => ({ ...prev, economySeatType: e.target.value }))}
              />
              <textarea
                className="w-full px-4 py-2 border border-gray-200 rounded-xl"
                rows={2}
                placeholder="Comfort features (legroom, USB, WiFi...)"
                value={flightData.economyComfort}
                onChange={(e) => setFlightData(prev => ({ ...prev, economyComfort: e.target.value }))}
              />
            </div>
            <div className="space-y-3">
              <p className="text-sm font-semibold text-gray-800">Premium Economy</p>
              <input
                className="w-full px-4 py-2 border border-gray-200 rounded-xl"
                placeholder="Seats available"
                value={flightData.premiumSeats}
                onChange={(e) => setFlightData(prev => ({ ...prev, premiumSeats: e.target.value }))}
              />
              <input
                className="w-full px-4 py-2 border border-gray-200 rounded-xl"
                placeholder="Seat type"
                value={flightData.premiumSeatType}
                onChange={(e) => setFlightData(prev => ({ ...prev, premiumSeatType: e.target.value }))}
              />
              <textarea
                className="w-full px-4 py-2 border border-gray-200 rounded-xl"
                rows={2}
                placeholder="Comfort features"
                value={flightData.premiumComfort}
                onChange={(e) => setFlightData(prev => ({ ...prev, premiumComfort: e.target.value }))}
              />
            </div>
            <div className="space-y-3">
              <p className="text-sm font-semibold text-gray-800">Business Class</p>
              <input
                className="w-full px-4 py-2 border border-gray-200 rounded-xl"
                placeholder="Seats available"
                value={flightData.businessSeats}
                onChange={(e) => setFlightData(prev => ({ ...prev, businessSeats: e.target.value }))}
              />
              <input
                className="w-full px-4 py-2 border border-gray-200 rounded-xl"
                placeholder="Seat type"
                value={flightData.businessSeatType}
                onChange={(e) => setFlightData(prev => ({ ...prev, businessSeatType: e.target.value }))}
              />
              <textarea
                className="w-full px-4 py-2 border border-gray-200 rounded-xl"
                rows={2}
                placeholder="Comfort features"
                value={flightData.businessComfort}
                onChange={(e) => setFlightData(prev => ({ ...prev, businessComfort: e.target.value }))}
              />
            </div>
            <div className="space-y-3">
              <p className="text-sm font-semibold text-gray-800">First Class</p>
              <input
                className="w-full px-4 py-2 border border-gray-200 rounded-xl"
                placeholder="Seats available"
                value={flightData.firstSeats}
                onChange={(e) => setFlightData(prev => ({ ...prev, firstSeats: e.target.value }))}
              />
              <input
                className="w-full px-4 py-2 border border-gray-200 rounded-xl"
                placeholder="Seat type"
                value={flightData.firstSeatType}
                onChange={(e) => setFlightData(prev => ({ ...prev, firstSeatType: e.target.value }))}
              />
              <textarea
                className="w-full px-4 py-2 border border-gray-200 rounded-xl"
                rows={2}
                placeholder="Comfort features"
                value={flightData.firstComfort}
                onChange={(e) => setFlightData(prev => ({ ...prev, firstComfort: e.target.value }))}
              />
            </div>
          </div>
        </div>
      )}

      {flightStep === 7 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <div>
            <p className="text-xl font-semibold text-gray-900">✈️ 7. Fare & Price Information</p>
            <p className="text-sm text-gray-500">Pricing breakdown by class.</p>
          </div>
          <div className="space-y-6">
            {['economy', 'premium', 'business', 'first'].map((cls) => (
              <div key={cls} className="space-y-3">
                <p className="text-sm font-semibold text-gray-800 capitalize">{cls} class</p>
                <div className="grid gap-4 md:grid-cols-3">
                  <input
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl"
                    placeholder="Base fare"
                    value={flightData[`${cls}BaseFare`]}
                    onChange={(e) => setFlightData(prev => ({ ...prev, [`${cls}BaseFare`]: e.target.value }))}
                  />
                  <input
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl"
                    placeholder="Taxes"
                    value={flightData[`${cls}Taxes`]}
                    onChange={(e) => setFlightData(prev => ({ ...prev, [`${cls}Taxes`]: e.target.value }))}
                  />
                  <input
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl"
                    placeholder="Service fees"
                    value={flightData[`${cls}ServiceFees`]}
                    onChange={(e) => setFlightData(prev => ({ ...prev, [`${cls}ServiceFees`]: e.target.value }))}
                  />
                  <input
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl"
                    placeholder="Fuel surcharge"
                    value={flightData[`${cls}FuelSurcharge`]}
                    onChange={(e) => setFlightData(prev => ({ ...prev, [`${cls}FuelSurcharge`]: e.target.value }))}
                  />
                  <input
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl"
                    placeholder="Total price"
                    value={flightData[`${cls}TotalPrice`]}
                    onChange={(e) => setFlightData(prev => ({ ...prev, [`${cls}TotalPrice`]: e.target.value }))}
                  />
                  <select
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-white"
                    value={flightData[`${cls}Refundable`]}
                    onChange={(e) => setFlightData(prev => ({ ...prev, [`${cls}Refundable`]: e.target.value }))}
                  >
                    <option value="refundable">Refundable</option>
                    <option value="non-refundable">Non-refundable</option>
                  </select>
                </div>
                <textarea
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl"
                  rows={2}
                  placeholder="Fare rules, change and cancellation fees, no-show penalties..."
                  value={flightData[`${cls}FareRules`]}
                  onChange={(e) => setFlightData(prev => ({ ...prev, [`${cls}FareRules`]: e.target.value }))}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {flightStep === 8 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <div>
            <p className="text-xl font-semibold text-gray-900">✈️ 8. Baggage Allowance</p>
            <p className="text-sm text-gray-500">Separate rules for carry-on and checked baggage.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-3">
              <p className="text-sm font-semibold text-gray-800">Carry-on</p>
              <input
                className="w-full px-4 py-2 border border-gray-200 rounded-xl"
                placeholder="Number of bags"
                value={flightData.carryOnBags}
                onChange={(e) => setFlightData(prev => ({ ...prev, carryOnBags: e.target.value }))}
              />
              <input
                className="w-full px-4 py-2 border border-gray-200 rounded-xl"
                placeholder="Allowed weight (kg)"
                value={flightData.carryOnWeight}
                onChange={(e) => setFlightData(prev => ({ ...prev, carryOnWeight: e.target.value }))}
              />
              <input
                className="w-full px-4 py-2 border border-gray-200 rounded-xl"
                placeholder="Allowed size (cm)"
                value={flightData.carryOnSize}
                onChange={(e) => setFlightData(prev => ({ ...prev, carryOnSize: e.target.value }))}
              />
            </div>
            <div className="space-y-3">
              <p className="text-sm font-semibold text-gray-800">Checked baggage</p>
              <input
                className="w-full px-4 py-2 border border-gray-200 rounded-xl"
                placeholder="Number of bags included"
                value={flightData.checkedBags}
                onChange={(e) => setFlightData(prev => ({ ...prev, checkedBags: e.target.value }))}
              />
              <input
                className="w-full px-4 py-2 border border-gray-200 rounded-xl"
                placeholder="Weight limit (kg)"
                value={flightData.checkedWeight}
                onChange={(e) => setFlightData(prev => ({ ...prev, checkedWeight: e.target.value }))}
              />
              <input
                className="w-full px-4 py-2 border border-gray-200 rounded-xl"
                placeholder="Size restrictions (cm)"
                value={flightData.checkedSize}
                onChange={(e) => setFlightData(prev => ({ ...prev, checkedSize: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Additional baggage fees</label>
            <textarea
              className="w-full px-4 py-2 border border-gray-200 rounded-xl"
              rows={2}
              value={flightData.extraBaggageFees}
              onChange={(e) => setFlightData(prev => ({ ...prev, extraBaggageFees: e.target.value }))}
            />
          </div>
        </div>
      )}

      {flightStep === 9 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <div>
            <p className="text-xl font-semibold text-gray-900">✈️ 9. Passenger Requirements</p>
            <p className="text-sm text-gray-500">Documentation or age rules for this route.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <textarea
              className="w-full px-4 py-2 border border-gray-200 rounded-xl"
              rows={2}
              placeholder="ID required? (national ID, passport)"
              value={flightData.idRequired}
              onChange={(e) => setFlightData(prev => ({ ...prev, idRequired: e.target.value }))}
            />
            <textarea
              className="w-full px-4 py-2 border border-gray-200 rounded-xl"
              rows={2}
              placeholder="Visa required? (for international flights)"
              value={flightData.visaRequired}
              onChange={(e) => setFlightData(prev => ({ ...prev, visaRequired: e.target.value }))}
            />
            <textarea
              className="w-full px-4 py-2 border border-gray-200 rounded-xl"
              rows={2}
              placeholder="Health / COVID documents (if any)"
              value={flightData.healthDocuments}
              onChange={(e) => setFlightData(prev => ({ ...prev, healthDocuments: e.target.value }))}
            />
            <textarea
              className="w-full px-4 py-2 border border-gray-200 rounded-xl"
              rows={2}
              placeholder="Age restrictions (e.g., minors travelling alone)"
              value={flightData.ageRestrictions}
              onChange={(e) => setFlightData(prev => ({ ...prev, ageRestrictions: e.target.value }))}
            />
          </div>
        </div>
      )}

      {flightStep === 10 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <div>
            <p className="text-xl font-semibold text-gray-900">✈️ 10. Services Included / Add-ons</p>
            <p className="text-sm text-gray-500">Extras that improve the passenger experience.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <textarea
              className="w-full px-4 py-2 border border-gray-200 rounded-xl"
              rows={2}
              placeholder="Meal included?"
              value={flightData.mealIncluded}
              onChange={(e) => setFlightData(prev => ({ ...prev, mealIncluded: e.target.value }))}
            />
            <textarea
              className="w-full px-4 py-2 border border-gray-200 rounded-xl"
              rows={2}
              placeholder="In-flight entertainment"
              value={flightData.inFlightEntertainment}
              onChange={(e) => setFlightData(prev => ({ ...prev, inFlightEntertainment: e.target.value }))}
            />
            <textarea
              className="w-full px-4 py-2 border border-gray-200 rounded-xl"
              rows={2}
              placeholder="WiFi availability"
              value={flightData.wifiAvailability}
              onChange={(e) => setFlightData(prev => ({ ...prev, wifiAvailability: e.target.value }))}
            />
            <textarea
              className="w-full px-4 py-2 border border-gray-200 rounded-xl"
              rows={2}
              placeholder="Power outlets"
              value={flightData.powerOutlets}
              onChange={(e) => setFlightData(prev => ({ ...prev, powerOutlets: e.target.value }))}
            />
            <textarea
              className="w-full px-4 py-2 border border-gray-200 rounded-xl"
              rows={2}
              placeholder="Special assistance (wheelchair, medical)"
              value={flightData.specialAssistance}
              onChange={(e) => setFlightData(prev => ({ ...prev, specialAssistance: e.target.value }))}
            />
            <textarea
              className="w-full px-4 py-2 border border-gray-200 rounded-xl"
              rows={2}
              placeholder="Priority boarding / lounge access / extra legroom / upgrades"
              value={flightData.priorityBoarding}
              onChange={(e) => setFlightData(prev => ({ ...prev, priorityBoarding: e.target.value }))}
            />
          </div>
        </div>
      )}

      {flightStep === 11 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <div>
            <p className="text-xl font-semibold text-gray-900">✈️ 11. Policies</p>
            <p className="text-sm text-gray-500">Clear rules reduce disputes.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <textarea
              className="w-full px-4 py-2 border border-gray-200 rounded-xl"
              rows={3}
              placeholder="Cancellation policy"
              value={flightData.cancellationPolicy}
              onChange={(e) => setFlightData(prev => ({ ...prev, cancellationPolicy: e.target.value }))}
            />
            <textarea
              className="w-full px-4 py-2 border border-gray-200 rounded-xl"
              rows={3}
              placeholder="Change policy"
              value={flightData.changePolicy}
              onChange={(e) => setFlightData(prev => ({ ...prev, changePolicy: e.target.value }))}
            />
            <textarea
              className="w-full px-4 py-2 border border-gray-200 rounded-xl"
              rows={3}
              placeholder="Refund policy"
              value={flightData.refundPolicy}
              onChange={(e) => setFlightData(prev => ({ ...prev, refundPolicy: e.target.value }))}
            />
            <textarea
              className="w-full px-4 py-2 border border-gray-200 rounded-xl"
              rows={3}
              placeholder="Denied boarding / overbooking handling"
              value={flightData.deniedBoardingPolicy}
              onChange={(e) => setFlightData(prev => ({ ...prev, deniedBoardingPolicy: e.target.value }))}
            />
            <textarea
              className="w-full px-4 py-2 border border-gray-200 rounded-xl md:col-span-2"
              rows={2}
              placeholder="Other notes (including regulations like EU261)"
              value={flightData.overbookingHandling}
              onChange={(e) => setFlightData(prev => ({ ...prev, overbookingHandling: e.target.value }))}
            />
          </div>
        </div>
      )}

      {flightStep === 12 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <div>
            <p className="text-xl font-semibold text-gray-900">✈️ 12. Operational Information</p>
            <p className="text-sm text-gray-500">Realtime status and alerts.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">Flight status</label>
              <select
                value={flightData.flightStatus}
                onChange={(e) => setFlightData(prev => ({ ...prev, flightStatus: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-white"
              >
                <option value="scheduled">Scheduled</option>
                <option value="delayed">Delayed</option>
                <option value="cancelled">Cancelled</option>
                <option value="boarding">Boarding</option>
                <option value="in-air">In the air</option>
                <option value="landed">Landed</option>
              </select>
            </div>
            <input
              className="w-full px-4 py-2 border border-gray-200 rounded-xl"
              placeholder="Flight tracking link (optional)"
              value={flightData.trackingLink}
              onChange={(e) => setFlightData(prev => ({ ...prev, trackingLink: e.target.value }))}
            />
            <textarea
              className="w-full px-4 py-2 border border-gray-200 rounded-xl"
              rows={2}
              placeholder="Gate change alerts"
              value={flightData.gateChangeAlerts}
              onChange={(e) => setFlightData(prev => ({ ...prev, gateChangeAlerts: e.target.value }))}
            />
            <textarea
              className="w-full px-4 py-2 border border-gray-200 rounded-xl"
              rows={2}
              placeholder="Weather impact info"
              value={flightData.weatherImpactInfo}
              onChange={(e) => setFlightData(prev => ({ ...prev, weatherImpactInfo: e.target.value }))}
            />
          </div>
        </div>
      )}

      {flightStep === 13 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <div>
            <p className="text-xl font-semibold text-gray-900">✈️ 13. Admin / Platform Internal Fields</p>
            <p className="text-sm text-gray-500">Internal controls for AKWANDA.rw only.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <input
              className="w-full px-4 py-2 border border-gray-200 rounded-xl"
              placeholder="Commission percentage"
              value={flightData.commissionPercentage}
              onChange={(e) => setFlightData(prev => ({ ...prev, commissionPercentage: e.target.value }))}
            />
            <input
              className="w-full px-4 py-2 border border-gray-200 rounded-xl"
              placeholder="Inventory source"
              value={flightData.inventorySource}
              onChange={(e) => setFlightData(prev => ({ ...prev, inventorySource: e.target.value }))}
            />
            <input
              className="w-full px-4 py-2 border border-gray-200 rounded-xl"
              placeholder="Airline / system ID"
              value={flightData.airlineSystem}
              onChange={(e) => setFlightData(prev => ({ ...prev, airlineSystem: e.target.value }))}
            />
            <input
              className="w-full px-4 py-2 border border-gray-200 rounded-xl"
              placeholder="GDS (Amadeus, Sabre, Travelport)"
              value={flightData.gds}
              onChange={(e) => setFlightData(prev => ({ ...prev, gds: e.target.value }))}
            />
            <input
              className="w-full px-4 py-2 border border-gray-200 rounded-xl"
              placeholder="API supplier"
              value={flightData.apiSupplier}
              onChange={(e) => setFlightData(prev => ({ ...prev, apiSupplier: e.target.value }))}
            />
            <input
              className="w-full px-4 py-2 border border-gray-200 rounded-xl"
              placeholder="Markup settings"
              value={flightData.markupSettings}
              onChange={(e) => setFlightData(prev => ({ ...prev, markupSettings: e.target.value }))}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700">Flight visibility</label>
              <select
                value={flightData.flightVisibility}
                onChange={(e) => setFlightData(prev => ({ ...prev, flightVisibility: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-white"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <input
              className="w-full px-4 py-2 border border-gray-200 rounded-xl"
              placeholder="Seats remaining (override)"
              value={flightData.seatsRemaining}
              onChange={(e) => setFlightData(prev => ({ ...prev, seatsRemaining: e.target.value }))}
            />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mt-4">
        <button
          type="button"
          onClick={() => setFlightStep(prev => Math.max(prev - 1, 1))}
          disabled={flightStep === 1}
          className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Back
        </button>
        <button
          type="submit"
          className="ml-auto px-5 py-2.5 bg-[#a06b42] text-white rounded-lg hover:bg-[#8f5a32]"
        >
          {flightStep < totalFlightSteps ? 'Next' : 'Save flight info'}
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
