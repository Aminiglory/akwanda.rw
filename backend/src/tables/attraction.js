const mongoose = require('mongoose');

const attractionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    location: { type: String, required: true },
    city: { type: String, required: true },
    category: { type: String, enum: ['cultural', 'nature', 'adventure', 'historical', 'religious', 'entertainment'], required: true },
    images: [{ type: String }],
    price: { type: Number, required: true },
    currency: { type: String, default: 'RWF' },
    duration: { type: String }, // e.g., "2 hours", "Half day"
    capacity: { type: Number, default: 50 },
    isActive: { type: Boolean, default: true },
    visibilityLevel: { type: String, enum: ['standard', 'premium', 'featured'], default: 'standard' },
    featuredUntil: { type: Date },
    commissionRate: { type: Number, default: 15, min: 0, max: 50 },
    amenities: [{ type: String }],
    operatingHours: {
      open: { type: String },
      close: { type: String },
      days: [{ type: String, enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] }]
    },
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

module.exports = mongoose.model('Attraction', attractionSchema);
