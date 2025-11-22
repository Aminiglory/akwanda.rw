const mongoose = require('mongoose');

const carRentalSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    // Human-friendly unique code for referencing a car
    carCode: { type: String, unique: true, index: true },
    vehicleName: { type: String, required: true },
    // Support cars, motorcycles, and bicycles
    vehicleType: { type: String, enum: ['economy', 'compact', 'mid-size', 'full-size', 'luxury', 'suv', 'minivan', 'motorcycle', 'bicycle'], required: true },
    brand: { type: String, required: true },
    model: { type: String, required: true },
    year: { type: Number, required: true },
    // Some vehicles (e.g., bicycles) may not have a license plate
    licensePlate: { type: String },
    capacity: { type: Number, required: true, min: 1 },
    pricePerDay: { type: Number, required: true },
    pricePerWeek: { type: Number },
    pricePerMonth: { type: Number },
    currency: { type: String, default: 'RWF' },
    isAvailable: { type: Boolean, default: true },
    location: { type: String, required: true },
    images: [{ type: String }],
    features: [{ type: String }], // AC, GPS, Bluetooth, etc.
    fuelType: { type: String, enum: ['petrol', 'diesel', 'hybrid', 'electric'], default: 'petrol' },
    transmission: { type: String, enum: ['manual', 'automatic'], default: 'manual' },
    mileage: { type: Number },
    // Safety and extras
    abs: { type: Boolean, default: false },
    insuranceIncluded: { type: Boolean, default: true },
    driverRequired: { type: Boolean, default: false },
    minimumAge: { type: Number, default: 21 },
    rating: { type: Number, min: 1, max: 5, default: 5 },
    totalRentals: { type: Number, default: 0 },
    bookings: [{ type: mongoose.Schema.Types.ObjectId, ref: 'CarRentalBooking' }],
    // Car-specific fields
    doors: { type: Number },
    airConditioning: { type: Boolean },
    luggageCapacity: { type: Number },
    // Motorcycle-specific fields
    engineCapacityCc: { type: Number },
    helmetIncluded: { type: Boolean },
    // Bicycle-specific fields
    frameSize: { type: String },
    gearCount: { type: Number },
    bicycleType: { type: String },
    // Rental policy fields (optional, for clearer UX on detail page)
    fuelPolicy: { type: String }, // e.g. "Same-to-same", "Full-to-full"
    mileageLimitPerDayKm: { type: Number },
    cancellationPolicy: { type: String },
    depositInfo: { type: String }
  },
  { timestamps: true }
);

// Generate unique car code similar to propertyNumber
async function generateUniqueCarCode(Model) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const gen = () => Array.from({ length: 8 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
  for (let i = 0; i < 10; i++) {
    const code = gen();
    const exists = await Model.findOne({ carCode: code }).select('_id').lean();
    if (!exists) return code;
  }
  return `${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2,6).toUpperCase()}`;
}

carRentalSchema.pre('save', async function(next) {
  try {
    if (!this.carCode) {
      this.carCode = await generateUniqueCarCode(this.constructor);
    }
    next();
  } catch (e) { next(e); }
});

module.exports = mongoose.model('CarRental', carRentalSchema);
