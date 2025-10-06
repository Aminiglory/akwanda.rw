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
    size: { type: String },
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
    ratings: [{
      guest: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      rating: { type: Number, min: 1, max: 5 },
      comment: { type: String },
      createdAt: { type: Date, default: Date.now }
    }]
  },
  { timestamps: true }
);

module.exports = mongoose.model('Property', propertySchema);


