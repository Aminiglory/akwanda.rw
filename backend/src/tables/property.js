const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  roomNumber: { type: String, required: true },
  roomType: { type: String, required: true, enum: ['single', 'double', 'suite', 'family', 'deluxe'] },
  pricePerNight: { type: Number, required: true },
  capacity: { type: Number, required: true, min: 1 },
  amenities: [{ type: String }],
  images: [{ type: String }],
  isAvailable: { type: Boolean, default: true },
  closedDates: [{ 
    startDate: { type: Date },
    endDate: { type: Date },
    reason: { type: String }
  }],
  maxAdults: { type: Number, default: 2, min: 1 },
  maxChildren: { type: Number, default: 2, min: 0 },
  maxInfants: { type: Number, default: 1, min: 0 },
  childrenPolicy: {
    chargePercent: { type: Number, default: 50, min: 0, max: 100 }, // percent of adult price
    minAge: { type: Number, default: 2 },
    maxAge: { type: Number, default: 12 }
  },
  infantPolicy: {
    freeUnderAge: { type: Number, default: 2 }
  }
});

const propertySchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    address: { type: String, required: true },
    city: { type: String, required: true },
    pricePerNight: { type: Number, required: true },
    bedrooms: { type: Number, default: 1, min: 0 },
    bathrooms: { type: Number, default: 1, min: 0 },
    amenities: [{ type: String }],
    images: [{ type: String }],
    host: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    isActive: { type: Boolean, default: true },
    discountPercent: { type: Number, default: 0, min: 0, max: 100 },
    availability: { type: String, enum: ['available', 'in_use'], default: 'available' },
    category: { type: String, enum: ['hotel', 'apartment', 'villa', 'hostel', 'resort', 'guesthouse'], default: 'apartment' },
    rooms: [roomSchema],
    groupBookingEnabled: { type: Boolean, default: false },
    groupBookingDiscount: { type: Number, default: 0 },
    commissionRate: { type: Number, default: 10, min: 8, max: 12 },
    visibilityLevel: { type: String, enum: ['standard', 'premium', 'featured'], default: 'standard' },
    featuredUntil: { type: Date },
    // Booking.com-like globally unique property identifier (human-friendly)
    propertyNumber: { type: String, unique: true, index: true },
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
      rating: { type: Number, min: 1, max: 5 },
      comment: { type: String },
      createdAt: { type: Date, default: Date.now }
    }]
  }, { timestamps: true }
);

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
    const code = generatePropertyNumber();
    const exists = await Model.findOne({ propertyNumber: code }).select('_id').lean();
    return exists ? null : code;
  };
  
  for (let i = 0; i < 10; i++) {
    const code = await tryOnce();
    if (code) return code;
  }
  
  // Fallback with timestamp component if rare collision persists
  const timestamp = Date.now().toString().slice(-4);
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let fallback = timestamp;
  for (let i = 0; i < 6; i++) {
    fallback += letters.charAt(Math.floor(Math.random() * letters.length));
  }
  return fallback;
}

// Ensure propertyNumber on save
propertySchema.pre('save', async function(next) {
  try {
    if (!this.propertyNumber) {
      this.propertyNumber = await generateUniquePropertyNumber(this.constructor);
    }
    next();
  } catch (e) {
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



