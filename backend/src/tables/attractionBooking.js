const mongoose = require('mongoose');

const attractionBookingSchema = new mongoose.Schema(
  {
    attraction: { type: mongoose.Schema.Types.ObjectId, ref: 'Attraction', required: true },
    guest: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    visitDate: { type: Date, required: true },
    numberOfPeople: { type: Number, required: true, min: 1 },
    totalAmount: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'confirmed', 'cancelled', 'completed'], default: 'pending' },
    commissionAmount: { type: Number, default: 0 },
    commissionPaid: { type: Boolean, default: false },
    paymentMethod: { type: String, enum: ['cash', 'card', 'mobile_money', 'bank_transfer'], default: 'cash' },
    contactPhone: { type: String },
    specialRequests: { type: String },
    rating: { type: Number, min: 1, max: 5 },
    review: { type: String }
  },
  { timestamps: true }
);

module.exports = mongoose.model('AttractionBooking', attractionBookingSchema);
