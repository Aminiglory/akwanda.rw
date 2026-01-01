const mongoose = require('mongoose');

const attractionSchema = new mongoose.Schema(
  {
    // Human-friendly unique code for referencing an attraction
    attractionCode: { type: String, unique: true, index: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
    location: { type: String, required: true },
    city: { type: String, required: true },
    country: { type: String, default: 'Rwanda' },
    // Extended location and mapping details from attraction listing form
    latitude: { type: Number },
    longitude: { type: Number },
    gps: { type: String },
    landmarks: { type: String },
    directions: { type: String },
    cityDistrict: { type: String },
    category: { type: String, enum: ['cultural', 'nature', 'adventure', 'historical', 'religious', 'entertainment'], required: true },
    images: [{ type: String }],
    // Pricing and ticketing
    price: { type: Number, required: true },
    ticketChild: { type: Number },
    ticketStudent: { type: Number },
    ticketGroup: { type: Number },
    discounts: { type: String },
    currency: { type: String, default: 'RWF' },
    duration: { type: String }, // e.g., "2 hours", "Half day"
    capacity: { type: Number, default: 50 },
    minGuests: { type: Number },
    minAge: { type: String },
    bookingRequired: { type: String, enum: ['yes', 'no'], default: 'yes' },
    isActive: { type: Boolean, default: true },
    visibilityLevel: { type: String, enum: ['standard', 'premium', 'featured'], default: 'standard' },
    featuredUntil: { type: Date },
    commissionRate: { type: Number, default: 15, min: 0, max: 50 },
    amenities: [{ type: String }],
    // Operating details and schedule
    operatingHours: {
      open: { type: String },
      close: { type: String },
      days: [{ type: String, enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] }]
    },
    openingDays: { type: String },
    seasonality: { type: String },
    timeSlots: { type: String },
    // Media & extras
    video: { type: String },
    // Additional amenities and safety details
    guideAvailable: { type: String, enum: ['yes', 'no'], default: 'no' },
    languages: [{ type: String }],
    audioGuideLanguages: { type: String },
    safetyEquipment: { type: String },
    // Rules, restrictions and policies
    rules: { type: String },
    dressCode: { type: String },
    safetyInstructions: { type: String },
    liability: { type: String },
    paymentMethods: { type: String },
    cancellationPolicy: { type: String },
    refundPolicy: { type: String },
    // Contact information
    contactName: { type: String },
    contactPhone: { type: String },
    contactEmail: { type: String },
    contactWebsite: { type: String },
    contactEmergency: { type: String },
    ratings: [{
      guest: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      rating: { type: Number, min: 1, max: 5 },
      comment: { type: String },
      createdAt: { type: Date, default: Date.now }
    }],
    bookings: [{ type: mongoose.Schema.Types.ObjectId, ref: 'AttractionBooking' }]
  },
  { timestamps: true }
);

async function generateUniqueAttractionCode(Model) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const gen = () => Array.from({ length: 8 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
  for (let i = 0; i < 10; i++) {
    const code = gen();
    const exists = await Model.findOne({ attractionCode: code }).select('_id').lean();
    if (!exists) return code;
  }
  return `${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2,6).toUpperCase()}`;
}

attractionSchema.pre('save', async function(next) {
  try {
    if (!this.attractionCode) {
      this.attractionCode = await generateUniqueAttractionCode(this.constructor);
    }
    this.bookingRequired = 'yes';
    if (!this.country) this.country = 'Rwanda';
    next();
  } catch (e) { next(e); }
});

module.exports = mongoose.model('Attraction', attractionSchema);
