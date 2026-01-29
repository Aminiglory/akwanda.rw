import React, { forwardRef, useEffect, useMemo, useState } from 'react';
import { useLocale } from '../contexts/LocaleContext';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { FaUpload } from 'react-icons/fa';
import MapboxLocationPicker from './MapboxLocationPicker';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const DEFAULT_MAP_CENTER = { lat: -1.9536, lng: 30.0606 };

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
  pickupInstructions: '',
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
  depositInfo: presetDepositOptions[0],
  // Rental pricing & conditions
  depositRequired: false,
  depositAmount: '',
  // Availability
  withDriver: false,
  selfDrive: true,
  pickupLat: null,
  pickupLng: null,
  // Usage & luggage
  luggageSize: '',
  // Rental conditions
  licenseRequired: true,
  minAge: '',
  idRequired: true,
  insuranceIncluded: false,
  extraInsuranceAvailable: false,
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
  const [documentFiles, setDocumentFiles] = useState({});
  const [documentPreviews, setDocumentPreviews] = useState({});
  const [saving, setSaving] = useState(false);
  const [uploadingId, setUploadingId] = useState(null);
  const { formatCurrencyRWF, t } = useLocale() || {};
  const [vehicleStep, setVehicleStep] = useState(1);
  const totalVehicleSteps = 8;

  const tr = (key, fallback, ...args) => {
    const v = t?.(key, ...args);
    if (typeof v === 'string' && v) {
      const last = String(key || '').split('.').pop();
      if (v !== key && v !== last) return v;
    }
    return fallback;
  };

  const fieldLabel = (fieldKey, fallback) => {
    const key = `vehicleListing.form.fields.${fieldKey}`;
    return tr(key, fallback);
  };

  const toastMissing = (fieldKeys) => {
    const labels = fieldKeys
      .filter(Boolean)
      .map((k) => fieldLabel(k, k))
      .filter(Boolean);
    const fieldsText = labels.join(', ');
    const translated = t?.('vehicleListing.form.missingFields', fieldsText);
    if (typeof translated === 'string' && translated && translated !== 'missingFields') {
      toast.error(translated);
      return;
    }
    toast.error(`Please fill in: ${fieldsText}`.trim());
  };
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

  const uploadDocuments = async (carId) => {
    const entries = Object.entries(documentFiles || {}).filter(([, f]) => !!f);
    if (!entries.length) return null;
    const formData = new FormData();
    entries.forEach(([key, file]) => formData.append(key, file));
    const res = await fetch(`${API_URL}/api/cars/${carId}/documents`, {
      method: 'POST',
      credentials: 'include',
      body: formData
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to upload documents');
    return data.car;
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

  const handleVehiclePhotoUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setCreateImages(prev => [...prev, ...files]);
    const newPreviews = files.map(f => URL.createObjectURL(f));
    setCreatePreviews(prev => [...prev, ...newPreviews]);
  };

  const handleDocumentUpload = (docKey) => (e) => {
    const file = (e.target.files && e.target.files[0]) || null;
    if (!file) return;
    setDocumentFiles(prev => ({ ...prev, [docKey]: file }));
    const url = URL.createObjectURL(file);
    setDocumentPreviews(prev => ({ ...prev, [docKey]: url }));
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
      toast.error(t?.('vehicleListing.form.imagesRequired') || 'Please add at least one image.');
      return;
    }
    if (category !== 'bicycle') {
      if (!documentFiles?.registrationCertificate || !documentFiles?.insurancePolicy || !documentFiles?.proofOfOwnership) {
        toast.error(t?.('vehicleListing.docs.requiredError') || 'Please upload the required documents');
        return;
      }
    }
    const missingCore = [];
    if (!form.vehicleName) missingCore.push('vehicleName');
    if (!form.brand) missingCore.push('brand');
    if (!form.model) missingCore.push('model');
    if (!form.vehicleType) missingCore.push('vehicleType');
    if (category !== 'bicycle' && !form.licensePlate) missingCore.push('licensePlate');
    if (!Number(form.pricePerDay || 0)) missingCore.push('pricePerDay');
    if (!form.location) missingCore.push('pickupLocation');
    if (!Number(form.capacity || 0)) missingCore.push('capacity');
    if (!form.ownerName) missingCore.push('ownerName');
    if (!form.ownerPhone) missingCore.push('ownerPhone');
    if (missingCore.length) {
      toastMissing(missingCore);
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
        pickupInstructions: form.pickupInstructions || undefined,
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
      await uploadDocuments(data.car._id);
      const updatedCar = await uploadImages(data.car._id);
      toast.success('Vehicle listed successfully.');
      setCreateImages([]);
      setCreatePreviews([]);
      setDocumentFiles({});
      setDocumentPreviews({});
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
      const missing = [];
      if (!form.vehicleName) missing.push('vehicleName');
      if (!form.brand) missing.push('brand');
      if (!form.model) missing.push('model');
      if (!form.vehicleType) missing.push('vehicleType');
      if (category !== 'bicycle' && !form.licensePlate) missing.push('licensePlate');
      if (missing.length) {
        toastMissing(missing);
        return false;
      }
    }
    if (step === 2) {
      if (!form.pricePerDay) {
        toastMissing(['pricePerDay']);
        return false;
      }
    }
    if (step === 3) {
      if (!form.location) {
        toastMissing(['pickupLocation']);
        return false;
      }
    }
    if (step === 4) {
      if (!form.capacity) {
        toastMissing(['capacity']);
        return false;
      }
    }
    if (step === 6) {
      if (category !== 'bicycle') {
        if (!documentFiles?.registrationCertificate || !documentFiles?.insurancePolicy || !documentFiles?.proofOfOwnership) {
          toast.error(t?.('vehicleListing.docs.requiredError') || 'Please upload the required documents');
          return false;
        }
      }
    }
    if (step === 7) {
      if (!createImages.length) {
        toast.error(t?.('vehicleListing.form.imagesRequired') || 'Please add at least one image.');
        return false;
      }
    }
    if (step === 8) {
      if (!form.ownerName || !form.ownerPhone) {
        const missing = [];
        if (!form.ownerName) missing.push('ownerName');
        if (!form.ownerPhone) missing.push('ownerPhone');
        toastMissing(missing);
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
                {/* Must match backend enum in carRentalSchema: ['petrol', 'diesel', 'hybrid', 'electric'] */}
                <option value="petrol">Petrol</option>
                <option value="diesel">Diesel</option>
                <option value="hybrid">Hybrid</option>
                <option value="electric">Electric</option>
              </select>
            </div>
            <div className="lg:col-span-3">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {t?.('vehicleListing.form.fields.licensePlate') || 'License plate number'}
                {category !== 'bicycle' ? ' *' : ''}
              </label>
              <input
                className="w-full px-4 py-3 border border-gray-300 rounded-xl"
                value={form.licensePlate}
                onChange={e => setForm({ ...form, licensePlate: e.target.value })}
              />
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
              <MapboxLocationPicker
                latitude={pickupPosition.lat}
                longitude={pickupPosition.lng}
                zoom={13}
                scrollZoom={false}
                onChange={({ lat, lng }) => updateLocationFromMap({ lat, lng })}
                className="h-full w-full"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Click on the map to set an approximate pickup/drop-off point.</p>

            <div className="mt-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">{t?.('vehicleListing.form.pickupInstructions') || 'Pickup instructions (optional)'}</label>
              <textarea
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl"
                value={form.pickupInstructions}
                onChange={e => setForm({ ...form, pickupInstructions: e.target.value })}
                placeholder={t?.('vehicleListing.form.pickupInstructionsPlaceholder') || 'Meeting point, landmarks, ID check, delivery notes, etc.'}
              />
            </div>
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
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{t?.('vehicleListing.docs.title') || '6. Required Documents'}</h3>
          <p className="text-sm text-gray-600">{t?.('vehicleListing.docs.subtitle') || 'Upload clear photos or PDFs of the required documents. They will be stored securely with this vehicle listing.'}</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-800">{t?.('vehicleListing.docs.registration') || 'Vehicle registration certificate'}</span>
                {category !== 'bicycle' && <span className="text-xs text-red-600">{t?.('vehicleListing.docs.required') || 'Required'}</span>}
              </div>
              <div className="border-2 border-dashed border-[#a06b42]/40 rounded-xl p-4 flex flex-col items-center justify-center text-center hover:bg-[#a06b42]/5">
                <input
                  id="vehicle-doc-registration"
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleDocumentUpload('registrationCertificate')}
                  className="hidden"
                />
                <label htmlFor="vehicle-doc-registration" className="flex flex-col items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <FaUpload className="text-[#a06b42] text-xl" />
                  <span className="font-medium">{t?.('vehicleListing.docs.upload') || 'Upload document'}</span>
                  <span className="text-xs text-gray-500">{t?.('vehicleListing.docs.accepted') || 'JPG, PNG, or PDF'}</span>
                </label>
              </div>
              {documentPreviews?.registrationCertificate && (
                <div className="text-xs text-gray-600 break-all">{t?.('vehicleListing.docs.selected') || 'Selected:'} {documentFiles?.registrationCertificate?.name}</div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-800">{t?.('vehicleListing.docs.insurance') || 'Vehicle insurance policy'}</span>
                {category !== 'bicycle' && <span className="text-xs text-red-600">{t?.('vehicleListing.docs.required') || 'Required'}</span>}
              </div>
              <div className="border-2 border-dashed border-[#a06b42]/40 rounded-xl p-4 flex flex-col items-center justify-center text-center hover:bg-[#a06b42]/5">
                <input
                  id="vehicle-doc-insurance"
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleDocumentUpload('insurancePolicy')}
                  className="hidden"
                />
                <label htmlFor="vehicle-doc-insurance" className="flex flex-col items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <FaUpload className="text-[#a06b42] text-xl" />
                  <span className="font-medium">{t?.('vehicleListing.docs.upload') || 'Upload document'}</span>
                  <span className="text-xs text-gray-500">{t?.('vehicleListing.docs.accepted') || 'JPG, PNG, or PDF'}</span>
                </label>
              </div>
              {documentPreviews?.insurancePolicy && (
                <div className="text-xs text-gray-600 break-all">{t?.('vehicleListing.docs.selected') || 'Selected:'} {documentFiles?.insurancePolicy?.name}</div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-800">{t?.('vehicleListing.docs.proofOfOwnership') || 'Proof of ownership / lease agreement'}</span>
                {category !== 'bicycle' && <span className="text-xs text-red-600">{t?.('vehicleListing.docs.required') || 'Required'}</span>}
              </div>
              <div className="border-2 border-dashed border-[#a06b42]/40 rounded-xl p-4 flex flex-col items-center justify-center text-center hover:bg-[#a06b42]/5">
                <input
                  id="vehicle-doc-ownership"
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleDocumentUpload('proofOfOwnership')}
                  className="hidden"
                />
                <label htmlFor="vehicle-doc-ownership" className="flex flex-col items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <FaUpload className="text-[#a06b42] text-xl" />
                  <span className="font-medium">{t?.('vehicleListing.docs.upload') || 'Upload document'}</span>
                  <span className="text-xs text-gray-500">{t?.('vehicleListing.docs.accepted') || 'JPG, PNG, or PDF'}</span>
                </label>
              </div>
              {documentPreviews?.proofOfOwnership && (
                <div className="text-xs text-gray-600 break-all">{t?.('vehicleListing.docs.selected') || 'Selected:'} {documentFiles?.proofOfOwnership?.name}</div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-800">{t?.('vehicleListing.docs.inspection') || 'Vehicle inspection certificate'}</span>
                <span className="text-xs text-gray-500">{t?.('vehicleListing.docs.optional') || 'Optional'}</span>
              </div>
              <div className="border-2 border-dashed border-[#a06b42]/40 rounded-xl p-4 flex flex-col items-center justify-center text-center hover:bg-[#a06b42]/5">
                <input
                  id="vehicle-doc-inspection"
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleDocumentUpload('inspectionCertificate')}
                  className="hidden"
                />
                <label htmlFor="vehicle-doc-inspection" className="flex flex-col items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <FaUpload className="text-[#a06b42] text-xl" />
                  <span className="font-medium">{t?.('vehicleListing.docs.upload') || 'Upload document'}</span>
                  <span className="text-xs text-gray-500">{t?.('vehicleListing.docs.accepted') || 'JPG, PNG, or PDF'}</span>
                </label>
              </div>
              {documentPreviews?.inspectionCertificate && (
                <div className="text-xs text-gray-600 break-all">{t?.('vehicleListing.docs.selected') || 'Selected:'} {documentFiles?.inspectionCertificate?.name}</div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-800">{t?.('vehicleListing.docs.plate') || 'Photo of number plate'}</span>
                <span className="text-xs text-gray-500">{t?.('vehicleListing.docs.optional') || 'Optional'}</span>
              </div>
              <div className="border-2 border-dashed border-[#a06b42]/40 rounded-xl p-4 flex flex-col items-center justify-center text-center hover:bg-[#a06b42]/5">
                <input
                  id="vehicle-doc-plate"
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleDocumentUpload('numberPlatePhoto')}
                  className="hidden"
                />
                <label htmlFor="vehicle-doc-plate" className="flex flex-col items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <FaUpload className="text-[#a06b42] text-xl" />
                  <span className="font-medium">{t?.('vehicleListing.docs.upload') || 'Upload document'}</span>
                  <span className="text-xs text-gray-500">{t?.('vehicleListing.docs.accepted') || 'JPG, PNG, or PDF'}</span>
                </label>
              </div>
              {documentPreviews?.numberPlatePhoto && (
                <div className="text-xs text-gray-600 break-all">{t?.('vehicleListing.docs.selected') || 'Selected:'} {documentFiles?.numberPlatePhoto?.name}</div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-800">{t?.('vehicleListing.docs.businessRegistration') || 'Business registration (companies only)'}</span>
                <span className="text-xs text-gray-500">{t?.('vehicleListing.docs.optional') || 'Optional'}</span>
              </div>
              <div className="border-2 border-dashed border-[#a06b42]/40 rounded-xl p-4 flex flex-col items-center justify-center text-center hover:bg-[#a06b42]/5">
                <input
                  id="vehicle-doc-business"
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleDocumentUpload('businessRegistration')}
                  className="hidden"
                />
                <label htmlFor="vehicle-doc-business" className="flex flex-col items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <FaUpload className="text-[#a06b42] text-xl" />
                  <span className="font-medium">{t?.('vehicleListing.docs.upload') || 'Upload document'}</span>
                  <span className="text-xs text-gray-500">{t?.('vehicleListing.docs.accepted') || 'JPG, PNG, or PDF'}</span>
                </label>
              </div>
              {documentPreviews?.businessRegistration && (
                <div className="text-xs text-gray-600 break-all">{t?.('vehicleListing.docs.selected') || 'Selected:'} {documentFiles?.businessRegistration?.name}</div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-800">{t?.('vehicleListing.docs.taxCertificate') || 'Tax certificate (if applicable)'}</span>
                <span className="text-xs text-gray-500">{t?.('vehicleListing.docs.optional') || 'Optional'}</span>
              </div>
              <div className="border-2 border-dashed border-[#a06b42]/40 rounded-xl p-4 flex flex-col items-center justify-center text-center hover:bg-[#a06b42]/5">
                <input
                  id="vehicle-doc-tax"
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleDocumentUpload('taxCertificate')}
                  className="hidden"
                />
                <label htmlFor="vehicle-doc-tax" className="flex flex-col items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <FaUpload className="text-[#a06b42] text-xl" />
                  <span className="font-medium">{t?.('vehicleListing.docs.upload') || 'Upload document'}</span>
                  <span className="text-xs text-gray-500">{t?.('vehicleListing.docs.accepted') || 'JPG, PNG, or PDF'}</span>
                </label>
              </div>
              {documentPreviews?.taxCertificate && (
                <div className="text-xs text-gray-600 break-all">{t?.('vehicleListing.docs.selected') || 'Selected:'} {documentFiles?.taxCertificate?.name}</div>
              )}
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
                onChange={handleVehiclePhotoUpload}
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
