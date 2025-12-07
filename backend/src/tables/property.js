const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  roomNumber: { type: String, required: true },
  // roomType keys are defined by admins via the RoomType collection (no enum here)
  roomType: { type: String, required: true },
  pricePerNight: { type: Number, required: true },
  capacity: { type: Number, required: true, min: 0 },
  amenities: [{ type: String }],
  images: [{ type: String }],
  isAvailable: { type: Boolean, default: true },
  closedDates: [{ 
    startDate: { type: Date },
    endDate: { type: Date },
    reason: { type: String }
  }],
  maxAdults: { type: Number, default: 2, min: 0 },
  maxChildren: { type: Number, default: 2, min: 0 },
  maxInfants: { type: Number, default: 1, min: 0 },
  childrenPolicy: {
    chargePercent: { type: Number, default: 50, min: 0, max: 100 }, // percent of adult price
    minAge: { type: Number, default: 2 },
    maxAge: { type: Number, default: 12 }
  },
  infantPolicy: {
    freeUnderAge: { type: Number, default: 2 }
  },
  // Persist bed counts per room
  beds: {
    twin: { type: Number, default: 0, min: 0 },
    full: { type: Number, default: 0, min: 0 },
    queen: { type: Number, default: 0, min: 0 },
    king: { type: Number, default: 0, min: 0 },
    bunk: { type: Number, default: 0, min: 0 },
    sofa: { type: Number, default: 0, min: 0 },
    futon: { type: Number, default: 0, min: 0 }
  },
  bathroomType: { type: String, enum: ['shared', 'attached', 'inside'], default: 'inside' },
  bathrooms: { type: Number, default: 1, min: 0 }
});

const propertySchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    address: { type: String, required: true },
    city: { type: String, required: true },
    country: { type: String, default: 'Rwanda' },
    pricePerNight: { type: Number, required: true },
    bedrooms: { type: Number, default: 1, min: 0 },
    bathrooms: { type: Number, default: 1, min: 0 },
    maxGuests: { type: Number, default: 2, min: 0 },
    amenities: [{ type: String }],
    // Per-property add-on services configuration (selected from global catalog)
    addOnServices: [{
      key: { type: String },    // catalog key, e.g. 'breakfast', 'airport_transfer'
      name: { type: String },   // label shown to guests
      description: { type: String },
      enabled: { type: Boolean, default: true },
      price: { type: Number, default: 0, min: 0 },
      scope: { type: String, enum: ['per_booking','per_night','per_guest'], default: 'per_booking' },
      includedItems: [{ type: String }]
    }],
    images: [{ type: String }],
    host: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    isActive: { type: Boolean, default: true },
    discountPercent: { type: Number, default: 0, min: 0, max: 100 },
    availability: { type: String, enum: ['available', 'in_use'], default: 'available' },
    // Property type key, managed via PropertyType collection (e.g. 'apartment', 'villa')
    category: { type: String, default: 'apartment' },
    // Optional reference to PropertyType document for richer metadata
    propertyType: { type: mongoose.Schema.Types.ObjectId, ref: 'PropertyType' },
    rooms: [roomSchema],
    // Check-in/Check-out times (set by property owner)
    checkInTime: { type: String, default: '2:00 PM' },
    checkOutTime: { type: String, default: '11:00 AM' },
    flexibleCheckIn: { type: Boolean, default: false },
    // House rules (set by property owner)
    roomRules: [{ type: String }],
    // Pet policy
    petsAllowed: { type: Boolean, default: false },
    petPolicy: { type: String },
    // Cancellation policy
    cancellationPolicy: { type: String, default: 'Free cancellation up to 48 hours before check-in' },
    // Tax rate (Rwanda VAT)
    taxRate: { type: Number, default: 3, min: 0, max: 100 },
    groupBookingEnabled: { type: Boolean, default: false },
    groupBookingDiscount: { type: Number, default: 0 },
    commissionRate: { type: Number, default: 10, min: 8, max: 12 },
    // Optional link to admin-defined commission tier (direct/online percentages, premium flag)
    commissionLevel: { type: mongoose.Schema.Types.ObjectId, ref: 'CommissionLevel' },
    visibilityLevel: { type: String, enum: ['standard', 'premium', 'featured'], default: 'standard' },
    featuredUntil: { type: Date },
    // Additional listing details to match frontend
    size: { type: String },
    ratePlanNonRefundable: { type: Boolean, default: false },
    ratePlanFreeCancellation: { type: Boolean, default: true },
    minStayNights: { type: Number, default: 1, min: 0 },
    cancellationWindowDays: { type: Number, default: 1, min: 0 },
    prepaymentRequired: { type: Boolean, default: false },
    depositPercent: { type: Number, default: 0, min: 0, max: 100 },
    smokingAllowed: { type: Boolean, default: false },
    cleaningFee: { type: Number, default: 0, min: 0 },
    verificationMethod: { type: String, default: 'later' },
    unitMode: { type: String, enum: ['one', 'multiple'], default: 'one' },
    unitCount: { type: Number, default: 1, min: 1 },
    latitude: { type: Number },
    longitude: { type: Number },
    // Booking.com-like globally unique property identifier (human-friendly)
    propertyNumber: { type: String, unique: true, sparse: true, index: true },
    promotions: [{
      type: { type: String, enum: ['last_minute','advance_purchase','coupon','member_rate'], required: true },
      title: { type: String },
      description: { type: String },
      discountPercent: { type: Number, min: 1, max: 90, required: true },
      startDate: { type: Date },
      endDate: { type: Date },
      // last-minute: applies if check-in within N days
      lastMinuteWithinDays: { type: Number, min: 0 },
      // advance purchase: applies if booked at least N days ahead
      minAdvanceDays: { type: Number, min: 0 },
      // coupon
      couponCode: { type: String },
      active: { type: Boolean, default: true },
      createdAt: { type: Date, default: Date.now }
    }],
    ratings: [{
      guest: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      // Legacy compact rating used by existing 1-5 star views
      rating: { type: Number, min: 1, max: 5 },
      comment: { type: String },
      reply: { type: String },
      replyDate: { type: Date },
      status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
      createdAt: { type: Date, default: Date.now },

      // Extended review details for Booking.com-style categories (0-10 scale)
      booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
      reservationNumber: { type: String },
      overallScore10: { type: Number, min: 0, max: 10 },
      staff: { type: Number, min: 0, max: 10 },
      cleanliness: { type: Number, min: 0, max: 10 },
      locationScore: { type: Number, min: 0, max: 10 },
      facilities: { type: Number, min: 0, max: 10 },
      comfort: { type: Number, min: 0, max: 10 },
      valueForMoney: { type: Number, min: 0, max: 10 },
      title: { type: String },
      highlights: [{ type: String }]
    }]
  }, { timestamps: true }
);

// Indexes to optimize common queries (owner dashboards, search, visibility checks)
propertySchema.index({ host: 1, createdAt: -1 });
propertySchema.index({ isActive: 1, city: 1, pricePerNight: 1 });

// Generate property number with 5 numbers and 5 capital letters (10 chars total)
async function generateUniquePropertyNumber(Model) {
  const generatePropertyNumber = () => {
    const numbers = '0123456789';
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let result = '';
    
    // Add 5 random numbers
    for (let i = 0; i < 5; i++) {
      result += numbers.charAt(Math.floor(Math.random() * numbers.length));
    }
    
    // Add 5 random capital letters
    for (let i = 0; i < 5; i++) {
      result += letters.charAt(Math.floor(Math.random() * letters.length));
    }
    
    // Shuffle the result to mix numbers and letters
    return result.split('').sort(() => Math.random() - 0.5).join('');
  };

  const tryOnce = async () => {
    try {
      const code = generatePropertyNumber();
      const exists = await Model.findOne({ propertyNumber: code }).select('_id').lean();
      return exists ? null : code;
    } catch (err) {
      console.error('Error checking property number uniqueness:', err);
      return null;
    }
  };
  
  // Try 10 times to generate unique number
  for (let i = 0; i < 10; i++) {
    const code = await tryOnce();
    if (code) {
      console.log(`Generated unique property number: ${code}`);
      return code;
    }
  }
  
  // Fallback with timestamp component if rare collision persists
  const timestamp = Date.now().toString().slice(-4);
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let fallback = timestamp;
  for (let i = 0; i < 6; i++) {
    fallback += letters.charAt(Math.floor(Math.random() * letters.length));
  }
  console.log(`Using fallback property number: ${fallback}`);
  return fallback;
}

// Ensure propertyNumber on save
propertySchema.pre('save', async function(next) {
  try {
    if (!this.propertyNumber) {
      // Use mongoose.model to get the Property model reliably
      const Property = mongoose.model('Property');
      this.propertyNumber = await generateUniquePropertyNumber(Property);
    }
    next();
  } catch (e) {
    console.error('Error generating property number:', e);
    next(e);
  }
});

// Ensure propertyNumber on insertMany (seed/imports bypass save middleware)
propertySchema.pre('insertMany', async function(next, docs) {
  try {
    if (!Array.isArray(docs)) return next();
    for (const d of docs) {
      if (!d.propertyNumber) {
        // Use the model from this to check uniqueness
        const Model = this.model ? this.model : mongoose.model('Property');
        d.propertyNumber = await generateUniquePropertyNumber(Model);
      }
    }
    next();
  } catch (e) {
    next(e);
  }
});

module.exports = mongoose.model('Property', propertySchema);



