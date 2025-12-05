import React, { forwardRef, useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { useLocale } from '../contexts/LocaleContext';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { FaUpload } from 'react-icons/fa';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const DEFAULT_MAP_CENTER = { lat: -1.9536, lng: 30.0606 };

const redPinSvg = encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="48" viewBox="0 0 32 48" fill="none"><path d="M16 2C10 2 5 7 5 13c0 8 11 18 11 18s11-10 11-18C27 7 22 2 16 2z" fill="#FF5A5F"/><circle cx="16" cy="13" r="4" fill="white"/></svg>'
);

const redPinIcon = new L.Icon({
  iconUrl: `data:image/svg+xml,${redPinSvg}`,
  iconSize: [32, 48],
  iconAnchor: [16, 48]
});

const VehicleLocationMarker = ({ position, onChange }) => {
  useMapEvents({
    click(e) {
      onChange(e.latlng);
    }
  });

  if (!position) return null;
  return <Marker position={position} icon={redPinIcon} />;
};

const policyDefaults = {
  fuelPolicy: 'Full to full',
  mileageLimit: '200',
  cancellationPolicy: 'Flexible (24h notice)',
  depositInfo: 'Security deposit on request'
};

const presetFuelPolicies = [
  'Full to full',
  'Full to empty',
  'Prepaid fuel',
  'Owner covers fuel'
];

const presetMileageLimits = ['100', '150', '200', 'Unlimited'];

const presetCancellationPolicies = [
  'Flexible (24h notice)',
  'Moderate (72h notice)',
  'Strict (7 days)',
  'Non-refundable'
];

const presetDepositOptions = [
  'Security deposit on request',
  'No deposit',
  'Full amount hold',
  'Percentage of rental'
];

const emptyCarState = {
  vehicleName: '',
  vehicleType: 'SUV',
  brand: '',
  model: '',
  year: new Date().getFullYear(),
  licensePlate: '',
  capacity: 4,
  pricePerDay: 0,
  pricePerWeek: '',
  pricePerMonth: '',
  currency: 'RWF',
  isAvailable: true,
  location: '',
  features: [],
  fuelType: 'petrol',
  transmission: 'automatic',
  mileage: '',
  doors: 4,
  airConditioning: true,
  luggageCapacity: 2,
  engineCapacityCc: '',
  helmetIncluded: false,
  frameSize: '',
  gearCount: '',
  bicycleType: '',
  abs: false,
  fuelPolicy: policyDefaults.fuelPolicy,
  mileageLimitPerDayKm: policyDefaults.mileageLimit,
  cancellationPolicy: policyDefaults.cancellationPolicy,
  depositInfo: policyDefaults.depositInfo,
  vehicleNumber: '',
  // Rental pricing & conditions
  depositRequired: false,
  depositAmount: '',
  refundPolicyType: 'refundable',
  // Availability
  withDriver: false,
  selfDrive: true,
  pickupLat: DEFAULT_MAP_CENTER.lat,
  pickupLng: DEFAULT_MAP_CENTER.lng,
  // Usage & luggage
  luggageSize: '',
  // Rental conditions
  licenseRequired: true,
  minAge: '',
  idRequired: true,
  insuranceIncluded: false,
  extraInsuranceAvailable: false,
  maxDrivers: '',
  noSmoking: false,
  noPets: false,
  // Documents flags
  hasRegistrationPaper: false,
  hasInsuranceDocument: false,
  hasNumberPlatePhoto: false,
  hasInspectionCertificate: false,
  // Owner / company info
  ownerName: '',
  ownerPhone: '',
  ownerWhatsapp: '',
  ownerEmail: '',
  ownerAddress: '',
  ownerEmergency: ''
};

const vehicleTypeOptionsByCategory = {
  car: [
    'SUV',
    'Sedan',
    'Hatchback',
    '4x4 Vehicle',
    'Safari Jeep',
    'Minivan / Van',
    'Pickup',
    'Luxury Car',
    'Budget Car',
    'Bus / Coaster'
  ],
  motorcycle: ['Motorcycle', 'Scooter'],
  bicycle: ['Bicycle']
};

const vehicleFeatureGroups = [
  {
    label: 'General Features',
    options: [
      'Air Conditioning',
      'Heater',
      'FM Radio',
      'Bluetooth',
      'USB Charger',
      'Touchscreen Display',
      'Reverse Camera',
      'Parking Sensors',
      'Navigation System (GPS)',
      'Sunroof',
      'Power Windows',
      'Central Locking'
    ]
  },
  {
    label: 'Safety & Performance',
    options: [
      'ABS brakes',
      'Airbags',
      'Traction control',
      'Spare tire',
      'Toolbox included',
      'First aid kit',
      'Fire extinguisher'
    ]
  },
  {
    label: 'Usage Features',
    options: [
      'Unlimited mileage',
      'Limited mileage',
      'Off-road capability',
      'Suitable for long trips',
      'Suitable for city',
      'Good fuel consumption'
    ]
  }
];

const makeAbsolute = (u) => {
  if (!u) return null;
  let s = String(u).trim().replace(/\\+/g, '/');
  if (/^https?:\/\//i.test(s)) return s;
  if (!s.startsWith('/')) s = `/${s}`;
  return `${API_URL}${s}`;
};

const featureCards = (label, value, form, setForm) => (
  <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors">
    <input
      type="checkbox"
      checked={!!form[value]}
      onChange={(e) => setForm(prev => ({ ...prev, [value]: !!e.target.checked }))}
      className="w-5 h-5 text-[#a06b42] border-gray-300 rounded focus:ring-[#a06b42]"
    />
    <span className="text-sm font-medium text-gray-700">{label}</span>
  </label>
);

const VehicleListingForm = forwardRef(({ onCreated, onSuccess }, ref) => {
  const { user } = useAuth();
  const [category, setCategory] = useState('car');
  const [form, setForm] = useState(emptyCarState);
  const [createImages, setCreateImages] = useState([]);
  const [createPreviews, setCreatePreviews] = useState([]);
  const [saving, setSaving] = useState(false);
  const [uploadingId, setUploadingId] = useState(null);
  const { formatCurrencyRWF } = useLocale() || {};
  const [vehicleStep, setVehicleStep] = useState(1);
  const totalVehicleSteps = 8;
  const steps = [
    '1. Vehicle Basic Information',
    '2. Rental Pricing',
    '3. Availability & Pickup',
    '4. Vehicle Features & Capacity',
    '5. Rental Conditions',
    '6. Required Documents',
    '7. Vehicle Photos',
    '8. Owner / Company Information'
  ];

  const categoryOptions = useMemo(() => ['car', 'motorcycle', 'bicycle'], []);

  const pickupPosition = {
    lat: form.pickupLat || DEFAULT_MAP_CENTER.lat,
    lng: form.pickupLng || DEFAULT_MAP_CENTER.lng
  };

  const toggleFeature = (label) => {
    setForm(prev => {
      const existing = Array.isArray(prev.features) ? prev.features : [];
      return existing.includes(label)
        ? { ...prev, features: existing.filter(x => x !== label) }
        : { ...prev, features: [...existing, label] };
    });
  };

  const updateLocationFromMap = async (latlng) => {
    const lat = latlng?.lat;
    const lng = latlng?.lng;
    if (typeof lat !== 'number' || typeof lng !== 'number') return;
    setForm(prev => ({ ...prev, pickupLat: lat, pickupLng: lng }));

    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`;
      const res = await fetch(url, {
        headers: { 'Accept-Language': 'en' }
      });
      const data = await res.json().catch(() => null);
      const addr = data?.display_name;
      if (addr) {
        setForm(prev => ({ ...prev, pickupLat: lat, pickupLng: lng, location: addr }));
      }
    } catch (_) {
      // If reverse geocoding fails we still keep the coordinates
    }
  };

  useEffect(() => {
    if (!user) return;
    if (
      form.ownerName ||
      form.ownerPhone ||
      form.ownerWhatsapp ||
      form.ownerEmail ||
      form.ownerAddress
    ) {
      return;
    }

    const fullName = (user.companyName || user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim()) || '';

    setForm(prev => ({
      ...prev,
      ownerName: prev.ownerName || fullName,
      ownerPhone: prev.ownerPhone || user.phone || '',
      ownerWhatsapp: prev.ownerWhatsapp || user.whatsapp || user.phone || '',
      ownerEmail: prev.ownerEmail || user.email || '',
      ownerAddress: prev.ownerAddress || user.address || ''
    }));
  }, [user, form.ownerName, form.ownerPhone, form.ownerWhatsapp, form.ownerEmail, form.ownerAddress]);

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setCreateImages(prev => [...prev, ...files]);
    const newPreviews = files.map(f => URL.createObjectURL(f));
    setCreatePreviews(prev => [...prev, ...newPreviews]);
  };

  const removeImage = (index) => {
    setCreateImages(prev => prev.filter((_, i) => i !== index));
    setCreatePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async (carId) => {
    try {
      setUploadingId(carId);
      const formData = new FormData();
      Array.from(createImages).forEach(f => formData.append('images', f));
      const res = await fetch(`${API_URL}/api/cars/${carId}/images`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to upload images');
      return data.car;
    } finally {
      setUploadingId(null);
    }
  };

  const createCar = async () => {
    if (user?.isBlocked) {
      toast.error('Your account is deactivated. Vehicle creation is disabled.');
      return;
    }
    if (!createImages.length) {
      toast.error('Please add at least one image');
      return;
    }
    if (!form.vehicleName || !form.location || !form.pricePerDay) {
      toast.error('Vehicle name, price per day, and location are required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        vehicleName: form.vehicleName,
        vehicleType: form.vehicleType || category,
        category,
        brand: form.brand,
        model: form.model,
        year: form.year,
        licensePlate: form.licensePlate,
        capacity: Number(form.capacity),
        pricePerDay: Number(form.pricePerDay),
        pricePerWeek: form.pricePerWeek,
        pricePerMonth: form.pricePerMonth,
        currency: form.currency,
        isAvailable: !!form.isAvailable,
        location: form.location,
        fuelType: form.fuelType,
        transmission: form.transmission,
        luggageCapacity: Number(form.luggageCapacity || 0) || undefined,
        fuelPolicy: form.fuelPolicy,
        mileageLimitPerDayKm: form.mileageLimitPerDayKm,
        cancellationPolicy: form.cancellationPolicy,
        depositInfo: form.depositInfo,
        doors: Number(category === 'car' ? (form.doors || 4) : form.doors) || undefined,
        airConditioning: form.features?.includes('Air Conditioning') || !!form.airConditioning,
        abs: form.features?.includes('ABS brakes') || !!form.abs,
        engineCapacityCc: form.engineCapacityCc,
        helmetIncluded: !!form.helmetIncluded,
        frameSize: form.frameSize,
        gearCount: Number(form.gearCount) || undefined,
        bicycleType: form.bicycleType,
        mileage: form.mileage,
        deposit: form.depositInfo,
        // New rental pricing
        depositRequired: !!form.depositRequired,
        depositAmount: form.depositAmount ? Number(form.depositAmount) : undefined,
        refundPolicyType: form.refundPolicyType,
        // Availability & pickup
        withDriver: !!form.withDriver,
        selfDrive: !!form.selfDrive,
        pickupLat: form.pickupLat,
        pickupLng: form.pickupLng,
        luggageSize: form.luggageSize || undefined,
        // Rental conditions
        licenseRequired: !!form.licenseRequired,
        minAge: form.minAge ? Number(form.minAge) : undefined,
        idRequired: !!form.idRequired,
        insuranceIncluded: !!form.insuranceIncluded,
        extraInsuranceAvailable: !!form.extraInsuranceAvailable,
        maxDrivers: form.maxDrivers ? Number(form.maxDrivers) : undefined,
        noSmoking: !!form.noSmoking,
        noPets: !!form.noPets,
        // Documents
        hasRegistrationPaper: !!form.hasRegistrationPaper,
        hasInsuranceDocument: !!form.hasInsuranceDocument,
        hasNumberPlatePhoto: !!form.hasNumberPlatePhoto,
        hasInspectionCertificate: !!form.hasInspectionCertificate,
        // Features as array
        features: Array.isArray(form.features) ? form.features : [],
        // Owner / company info
        ownerName: form.ownerName || undefined,
        ownerPhone: form.ownerPhone || undefined,
        ownerWhatsapp: form.ownerWhatsapp || undefined,
        ownerEmail: form.ownerEmail || undefined,
        ownerAddress: form.ownerAddress || undefined,
        ownerEmergency: form.ownerEmergency || undefined
      };
      const res = await fetch(`${API_URL}/api/cars`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create vehicle');
      const updatedCar = await uploadImages(data.car._id);
      toast.success('Vehicle listed successfully.');
      setCreateImages([]);
      setCreatePreviews([]);
      setForm(emptyCarState);
      setCategory('car');
      onCreated?.(updatedCar || data.car);
      onSuccess?.();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const validateVehicleStep = (step) => {
    if (step === 1) {
      if (!form.vehicleName || !form.brand || !form.model) {
        toast.error('Add vehicle name, brand and model.');
        return false;
      }
      if (!form.vehicleType) {
        toast.error('Choose a vehicle category/type.');
        return false;
      }
    }
    if (step === 2) {
      if (!form.pricePerDay) {
        toast.error('Add price per day.');
        return false;
      }
    }
    if (step === 3) {
      if (!form.location) {
        toast.error('Add main pickup / drop-off location.');
        return false;
      }
    }
    if (step === 4) {
      if (!form.capacity) {
        toast.error('Add number of seats.');
        return false;
      }
    }
    if (step === 7) {
      if (!createImages.length) {
        toast.error('Please add at least one image.');
        return false;
      }
    }
    if (step === 8) {
      if (!form.ownerName || !form.ownerPhone) {
        toast.error('Add owner/company name and main contact phone.');
        return false;
      }
    }
    return true;
  };

  const handleVehicleSubmit = async (e) => {
    e.preventDefault();
    if (!validateVehicleStep(vehicleStep)) return;
    if (vehicleStep < totalVehicleSteps) {
      setVehicleStep(prev => Math.min(totalVehicleSteps, prev + 1));
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    await createCar();
  };

  return (
    <form onSubmit={handleVehicleSubmit} ref={ref} className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 md:p-8 mb-8">
      <div className="mb-6 pb-4 border-b border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">List a New Vehicle</h2>
        <p className="text-sm text-gray-600">Provide complete vehicle details so guests can book with confidence.</p>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-2 text-xs text-gray-600">
          <span>Step {vehicleStep} of {totalVehicleSteps}</span>
          <span>{steps[vehicleStep - 1]}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className="h-2 rounded-full bg-[#a06b42] transition-all duration-300"
            style={{ width: `${(vehicleStep / totalVehicleSteps) * 100}%` }}
          />
        </div>
      </div>

      <div className="mb-8">
        <label className="block text-sm font-semibold text-gray-700 mb-3">Vehicle Category *</label>
        <div className="grid grid-cols-3 gap-3">
          {categoryOptions.map(option => (
            <button
              key={option}
              type="button"
              onClick={() => {
                setCategory(option);
                const firstType = vehicleTypeOptionsByCategory[option]?.[0];
                if (firstType) {
                  setForm(prev => ({ ...prev, vehicleType: firstType }));
                }
              }}
              className={`px-4 py-3 rounded-xl border-2 transition-all duration-200 font-medium ${
                category === option ? 'border-[#a06b42] bg-[#a06b42]/10 text-[#a06b42]' : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              }`}
            >
              {option.charAt(0).toUpperCase() + option.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Step content */}
      {vehicleStep === 1 && (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">1. Vehicle Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Vehicle Name / Title *</label>
              <input
                className="w-full px-4 py-3 border border-gray-300 rounded-xl"
                placeholder="e.g., Toyota Land Cruiser Prado"
                value={form.vehicleName}
                onChange={e => setForm({ ...form, vehicleName: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Category (Type) *</label>
              <select
                className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white"
                value={form.vehicleType}
                onChange={e => setForm({ ...form, vehicleType: e.target.value })}
              >
                {(vehicleTypeOptionsByCategory[category] || []).map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Brand / Make *</label>
              <input
                className="w-full px-4 py-3 border border-gray-300 rounded-xl"
                value={form.brand}
                onChange={e => setForm({ ...form, brand: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Model *</label>
              <input
                className="w-full px-4 py-3 border border-gray-300 rounded-xl"
                value={form.model}
                onChange={e => setForm({ ...form, model: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Year of Manufacture</label>
              <input
                type="number"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl"
                value={form.year}
                onChange={e => setForm({ ...form, year: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Transmission</label>
              <select
                className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white"
                value={form.transmission}
                onChange={e => setForm({ ...form, transmission: e.target.value })}
              >
                <option value="automatic">Automatic</option>
                <option value="manual">Manual</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Fuel Type</label>
              <select
                className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white"
                value={form.fuelType}
                onChange={e => setForm({ ...form, fuelType: e.target.value })}
              >
                <option value="petrol">Petrol</option>
                <option value="diesel">Diesel</option>
                <option value="electric">Electric</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {vehicleStep === 2 && (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">2. Rental Pricing</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Price per day (RWF) *</label>
              <input
                type="number"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl"
                value={form.pricePerDay}
                onChange={e => setForm({ ...form, pricePerDay: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Deposit required?</label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, depositRequired: true }))}
                  className={`px-3 py-2 rounded-lg text-sm border ${form.depositRequired ? 'bg-[#a06b42] text-white border-[#a06b42]' : 'bg-white text-gray-700 border-gray-300'}`}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, depositRequired: false, depositAmount: '' }))}
                  className={`px-3 py-2 rounded-lg text-sm border ${!form.depositRequired ? 'bg-[#a06b42] text-white border-[#a06b42]' : 'bg-white text-gray-700 border-gray-300'}`}
                >
                  No
                </button>
              </div>
            </div>
            {form.depositRequired && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Deposit amount (RWF)</label>
                <input
                  type="number"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl"
                  value={form.depositAmount}
                  onChange={e => setForm({ ...form, depositAmount: e.target.value })}
                />
              </div>
            )}
            <div className="md:col-span-3">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Refund Policy</label>
              <div className="flex flex-wrap gap-3 mb-3">
                {['refundable', 'non-refundable'].map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, refundPolicyType: type }))}
                    className={`px-3 py-2 rounded-lg text-sm border ${form.refundPolicyType === type ? 'bg-[#a06b42] text-white border-[#a06b42]' : 'bg-white text-gray-700 border-gray-300'}`}
                  >
                    {type === 'refundable' ? 'Refundable' : 'Non-refundable'}
                  </button>
                ))}
              </div>
              <label className="block text-xs text-gray-500">You can add detailed rules later in Rental Conditions.</label>
            </div>
          </div>
        </div>
      )}

      {vehicleStep === 3 && (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">3. Availability & Pickup</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Available with driver?</label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, withDriver: true }))}
                  className={`px-3 py-2 rounded-lg text-sm border ${form.withDriver ? 'bg-[#a06b42] text-white border-[#a06b42]' : 'bg-white text-gray-700 border-gray-300'}`}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, withDriver: false }))}
                  className={`px-3 py-2 rounded-lg text-sm border ${!form.withDriver ? 'bg-[#a06b42] text-white border-[#a06b42]' : 'bg-white text-gray-700 border-gray-300'}`}
                >
                  No
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Available for self-drive?</label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, selfDrive: true }))}
                  className={`px-3 py-2 rounded-lg text-sm border ${form.selfDrive ? 'bg-[#a06b42] text-white border-[#a06b42]' : 'bg-white text-gray-700 border-gray-300'}`}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, selfDrive: false }))}
                  className={`px-3 py-2 rounded-lg text-sm border ${!form.selfDrive ? 'bg-[#a06b42] text-white border-[#a06b42]' : 'bg-white text-gray-700 border-gray-300'}`}
                >
                  No
                </button>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700 mb-1">Pickup / Drop-off Location *</label>
            <input
              className="w-full px-4 py-3 border border-gray-300 rounded-xl mb-3"
              placeholder="e.g., Kigali International Airport, City center, etc."
              value={form.location}
              onChange={e => setForm({ ...form, location: e.target.value })}
            />
            <div className="h-64 rounded-2xl overflow-hidden border border-gray-200">
              <MapContainer
                center={pickupPosition}
                zoom={13}
                scrollWheelZoom={false}
                className="h-full w-full"
              >
                <TileLayer
                  attribution="&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors"
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <VehicleLocationMarker
                  position={pickupPosition}
                  onChange={updateLocationFromMap}
                />
              </MapContainer>
            </div>
            <p className="text-xs text-gray-500 mt-1">Click on the map to set an approximate pickup/drop-off point.</p>
          </div>
        </div>
      )}

      {vehicleStep === 4 && (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">4. Vehicle Features / Amenities</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Number of seats *</label>
              <input
                type="number"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl"
                value={form.capacity}
                onChange={e => setForm({ ...form, capacity: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Luggage capacity</label>
              <select
                className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white"
                value={form.luggageSize}
                onChange={e => setForm({ ...form, luggageSize: e.target.value })}
              >
                <option value="">Select size</option>
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </select>
            </div>
          </div>

          <div className="space-y-4">
            {vehicleFeatureGroups.map(group => (
              <div key={group.label}>
                <p className="text-sm font-semibold text-gray-700 mb-2">{group.label}</p>
                <div className="flex flex-wrap gap-2">
                  {group.options.map(opt => {
                    const active = Array.isArray(form.features) && form.features.includes(opt);
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => toggleFeature(opt)}
                        className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                          active
                            ? 'bg-[#a06b42] border-[#a06b42] text-white'
                            : 'bg-white border-gray-300 text-gray-700 hover:border-[#a06b42] hover:text-[#a06b42]'
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {vehicleStep === 5 && (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">5. Rental Conditions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Valid driving license required</label>
              {featureCards('Required', 'licenseRequired', form, setForm)}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Minimum age</label>
              <input
                type="number"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl"
                value={form.minAge}
                onChange={e => setForm({ ...form, minAge: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">ID / Passport required</label>
              {featureCards('Required', 'idRequired', form, setForm)}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Fuel policy</label>
              <select
                value={form.fuelPolicy}
                onChange={e => setForm({ ...form, fuelPolicy: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl bg-white text-sm text-gray-700 mb-2"
              >
                {presetFuelPolicies.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Mileage limit / day (km)</label>
              <select
                value={form.mileageLimitPerDayKm}
                onChange={e => setForm({ ...form, mileageLimitPerDayKm: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl bg-white text-sm text-gray-700 mb-2"
              >
                {presetMileageLimits.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Insurance</label>
              <div className="space-y-2">
                {featureCards('Insurance included', 'insuranceIncluded', form, setForm)}
                {featureCards('Extra insurance (optional)', 'extraInsuranceAvailable', form, setForm)}
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Maximum allowed drivers</label>
              <input
                type="number"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl"
                value={form.maxDrivers}
                onChange={e => setForm({ ...form, maxDrivers: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">No smoking</label>
              {featureCards('No smoking', 'noSmoking', form, setForm)}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">No pets (optional)</label>
              {featureCards('No pets', 'noPets', form, setForm)}
            </div>
            <div className="md:col-span-3">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Additional rental rules / cancellation policy</label>
              <textarea
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl"
                value={form.cancellationPolicy}
                onChange={e => setForm({ ...form, cancellationPolicy: e.target.value })}
                placeholder="Explain changes, cancellations, late returns, fuel expectations, etc."
              />
            </div>
          </div>
        </div>
      )}

      {vehicleStep === 6 && (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">6. Required Documents</h3>
          <p className="text-sm text-gray-600">Upload clear photos of the required documents. They will be stored securely with this vehicle listing.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              {featureCards('Vehicle registration paper available', 'hasRegistrationPaper', form, setForm)}
              <div className="border-2 border-dashed border-[#a06b42]/40 rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-[#a06b42]/5">
                <input
                  id="vehicle-doc-registration"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <label htmlFor="vehicle-doc-registration" className="flex flex-col items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <FaUpload className="text-[#a06b42] text-xl" />
                  <span className="font-medium">Upload registration paper image</span>
                  <span className="text-xs text-gray-500">JPEG or PNG, clear and readable</span>
                </label>
              </div>
            </div>
            <div className="space-y-3">
              {featureCards('Vehicle insurance document available', 'hasInsuranceDocument', form, setForm)}
              <div className="border-2 border-dashed border-[#a06b42]/40 rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-[#a06b42]/5">
                <input
                  id="vehicle-doc-insurance"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <label htmlFor="vehicle-doc-insurance" className="flex flex-col items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <FaUpload className="text-[#a06b42] text-xl" />
                  <span className="font-medium">Upload insurance document image</span>
                  <span className="text-xs text-gray-500">Show full policy details if possible</span>
                </label>
              </div>
            </div>
            <div className="space-y-3">
              {featureCards('Photo of number plate available', 'hasNumberPlatePhoto', form, setForm)}
              <div className="border-2 border-dashed border-[#a06b42]/40 rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-[#a06b42]/5">
                <input
                  id="vehicle-doc-plate"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <label htmlFor="vehicle-doc-plate" className="flex flex-col items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <FaUpload className="text-[#a06b42] text-xl" />
                  <span className="font-medium">Upload number plate photo</span>
                  <span className="text-xs text-gray-500">Ensure both letters and numbers are readable</span>
                </label>
              </div>
            </div>
            <div className="space-y-3">
              {featureCards('Inspection certificate (if available)', 'hasInspectionCertificate', form, setForm)}
              <div className="border-2 border-dashed border-[#a06b42]/40 rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-[#a06b42]/5">
                <input
                  id="vehicle-doc-inspection"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <label htmlFor="vehicle-doc-inspection" className="flex flex-col items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <FaUpload className="text-[#a06b42] text-xl" />
                  <span className="font-medium">Upload inspection certificate</span>
                  <span className="text-xs text-gray-500">If you have a recent inspection document</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {vehicleStep === 7 && (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">7. Vehicle Image Uploads</h3>
          <p className="text-sm text-gray-600">Add clear photos. Front, side, back, interior and dashboard views help guests trust your listing.</p>
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-700 mb-1">Vehicle photos *</label>
            <div className="border-2 border-dashed border-[#a06b42]/40 rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-[#a06b42]/5">
              <input
                id="vehicle-main-photos"
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <label htmlFor="vehicle-main-photos" className="flex flex-col items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <FaUpload className="text-[#a06b42] text-2xl" />
                <span className="font-medium">Click to upload vehicle images</span>
                <span className="text-xs text-gray-500">Front, side, back, interior front & back, dashboard, trunk, any extra images.</span>
              </label>
            </div>
          </div>
          {createPreviews.length > 0 && (
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {createPreviews.map((preview, idx) => (
                <div key={idx} className="relative">
                  <img src={preview} alt="preview" className="w-full h-32 object-cover rounded-xl" />
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="absolute top-2 right-2 bg-white rounded-full p-1 text-red-500"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {vehicleStep === 8 && (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">8. Owner / Company Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Owner or company name *</label>
              <input
                className="w-full px-4 py-3 border border-gray-300 rounded-xl"
                value={form.ownerName}
                onChange={e => setForm({ ...form, ownerName: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Contact phone *</label>
              <input
                className="w-full px-4 py-3 border border-gray-300 rounded-xl"
                value={form.ownerPhone}
                onChange={e => setForm({ ...form, ownerPhone: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">WhatsApp number</label>
              <input
                className="w-full px-4 py-3 border border-gray-300 rounded-xl"
                value={form.ownerWhatsapp}
                onChange={e => setForm({ ...form, ownerWhatsapp: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
              <input
                type="email"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl"
                value={form.ownerEmail}
                onChange={e => setForm({ ...form, ownerEmail: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Address</label>
              <input
                className="w-full px-4 py-3 border border-gray-300 rounded-xl"
                value={form.ownerAddress}
                onChange={e => setForm({ ...form, ownerAddress: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Emergency contact number</label>
              <input
                className="w-full px-4 py-3 border border-gray-300 rounded-xl"
                value={form.ownerEmergency}
                onChange={e => setForm({ ...form, ownerEmergency: e.target.value })}
              />
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 flex justify-between items-center">
        <button
          type="button"
          onClick={() => setVehicleStep(prev => Math.max(1, prev - 1))}
          disabled={vehicleStep === 1}
          className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 disabled:opacity-50"
        >
          Back
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-3 bg-[#a06b42] text-white rounded-lg hover:bg-[#8f5a32] disabled:opacity-50"
        >
          {vehicleStep === totalVehicleSteps ? (saving ? 'Saving...' : 'Complete & list vehicle') : 'Next'}
        </button>
      </div>
    </form>
  );
});

export default VehicleListingForm;
