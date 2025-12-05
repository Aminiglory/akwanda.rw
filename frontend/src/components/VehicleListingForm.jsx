import React, { forwardRef, useMemo, useState } from 'react';
import { useLocale } from '../contexts/LocaleContext';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

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
  vehicleType: 'economy',
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
  vehicleNumber: ''
};

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

  const categoryOptions = useMemo(() => ['car', 'motorcycle', 'bicycle'], []);

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
        vehicleType: category === 'car' ? form.vehicleType : category,
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
        airConditioning: !!form.airConditioning,
        abs: !!form.abs,
        engineCapacityCc: form.engineCapacityCc,
        helmetIncluded: !!form.helmetIncluded,
        frameSize: form.frameSize,
        gearCount: Number(form.gearCount) || undefined,
        bicycleType: form.bicycleType,
        mileage: form.mileage,
        deposit: form.depositInfo
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
    }
    if (step === 2) {
      if (!form.pricePerDay) {
        toast.error('Add price per day.');
        return false;
      }
    }
    if (step === 3) {
      if (!form.location) {
        toast.error('Add main pickup location.');
        return false;
      }
    }
    if (step === totalVehicleSteps) {
      if (!createImages.length) {
        toast.error('Please add at least one image.');
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
    <form onSubmit={createCar} ref={ref} className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 md:p-8 mb-8">
      <div className="mb-6 pb-4 border-b border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">List a New Vehicle</h2>
        <p className="text-sm text-gray-600">Fill in the comprehensive details below to add your vehicle to the platform</p>
      </div>

      <div className="mb-8">
        <label className="block text-sm font-semibold text-gray-700 mb-3">Vehicle Category *</label>
        <div className="grid grid-cols-3 gap-3">
          {categoryOptions.map(option => (
            <button
              key={option}
              type="button"
              onClick={() => setCategory(option)}
              className={`px-4 py-3 rounded-xl border-2 transition-all duration-200 font-medium ${
                category === option ? 'border-[#a06b42] bg-[#a06b42]/10 text-[#a06b42]' : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              }`}
            >
              {option.charAt(0).toUpperCase() + option.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="md:col-span-3">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100">Basic Information</h3>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Vehicle Name *</label>
          <input className="w-full px-4 py-3 border border-gray-300 rounded-xl" placeholder="e.g., Toyota RAV4" value={form.vehicleName} onChange={e => setForm({ ...form, vehicleName: e.target.value })} />
        </div>
        {category === 'car' && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Vehicle Type *</label>
            <select className="w-full px-4 py-3 border border-gray-300 rounded-xl" value={form.vehicleType} onChange={e => setForm({ ...form, vehicleType: e.target.value })}>
              {['economy','compact','mid-size','full-size','luxury','suv','minivan'].map(type => (
                <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Brand *</label>
          <input className="w-full px-4 py-3 border border-gray-300 rounded-xl" value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Model *</label>
          <input className="w-full px-4 py-3 border border-gray-300 rounded-xl" value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Year</label>
          <input type="number" className="w-full px-4 py-3 border border-gray-300 rounded-xl" value={form.year} onChange={e => setForm({ ...form, year: Number(e.target.value) })} />
        </div>
      </div>

      <div className="md:col-span-3 mt-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100">Pricing & Location</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Capacity (Seats) *</label>
          <input type="number" className="w-full px-4 py-3 border border-gray-300 rounded-xl" value={form.capacity} onChange={e => setForm({ ...form, capacity: Number(e.target.value) })} />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Price per Day (RWF) *</label>
          <input type="number" className="w-full px-4 py-3 border border-gray-300 rounded-xl" value={form.pricePerDay} onChange={e => setForm({ ...form, pricePerDay: Number(e.target.value) })} />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Location *</label>
          <input className="w-full px-4 py-3 border border-gray-300 rounded-xl" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
        </div>
      </div>

      <div className="md:col-span-3 mt-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100">Policies & Features</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Fuel Policy</label>
          <select
            value={form.fuelPolicy}
            onChange={e => setForm({ ...form, fuelPolicy: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-xl bg-white text-sm text-gray-700 mb-2"
          >
            {presetFuelPolicies.map(option => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <input className="w-full px-4 py-3 border border-gray-300 rounded-xl" value={form.fuelPolicy} onChange={e => setForm({ ...form, fuelPolicy: e.target.value })} />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Mileage Limit/day (km)</label>
          <select
            value={form.mileageLimitPerDayKm}
            onChange={e => setForm({ ...form, mileageLimitPerDayKm: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-xl bg-white text-sm text-gray-700 mb-2"
          >
            {presetMileageLimits.map(option => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <input type="number" className="w-full px-4 py-3 border border-gray-300 rounded-xl" value={form.mileageLimitPerDayKm} onChange={e => setForm({ ...form, mileageLimitPerDayKm: e.target.value })} />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Cancellation Policy</label>
          <select
            value={form.cancellationPolicy}
            onChange={e => setForm({ ...form, cancellationPolicy: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-xl bg-white text-sm text-gray-700 mb-2"
          >
            {presetCancellationPolicies.map(option => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <textarea rows="2" className="w-full px-4 py-3 border border-gray-300 rounded-xl" value={form.cancellationPolicy} onChange={e => setForm({ ...form, cancellationPolicy: e.target.value })} />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Deposit Info</label>
          <select
            value={form.depositInfo}
            onChange={e => setForm({ ...form, depositInfo: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-xl bg-white text-sm text-gray-700 mb-2"
          >
            {presetDepositOptions.map(option => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <input className="w-full px-4 py-3 border border-gray-300 rounded-xl" value={form.depositInfo} onChange={e => setForm({ ...form, depositInfo: e.target.value })} />
        </div>
        <div className="md:col-span-3">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Features</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {featureCards('Air Conditioning', 'airConditioning', form, setForm)}
            {featureCards('ABS', 'abs', form, setForm)}
            {featureCards('Helmet Included', 'helmetIncluded', form, setForm)}
          </div>
        </div>
      </div>

      <div className="mt-8">
        <label className="block text-sm font-semibold text-gray-700 mb-2">Upload Images *</label>
        <input type="file" multiple accept="image/*" onChange={handleImageUpload} className="w-full" />
        {createPreviews.length > 0 && (
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {createPreviews.map((preview, idx) => (
              <div key={idx} className="relative">
                <img src={preview} alt="preview" className="w-full h-32 object-cover rounded-xl" />
                <button type="button" onClick={() => removeImage(idx)} className="absolute top-2 right-2 bg-white rounded-full p-1 text-red-500">×</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 flex justify-end">
        <button type="submit" disabled={saving} className="px-6 py-3 bg-[#a06b42] text-white rounded-lg hover:bg-[#8f5a32] disabled:opacity-50">
          {saving ? 'Saving...' : 'Complete & list vehicle'}
        </button>
      </div>
    </form>
  );
});

export default VehicleListingForm;
