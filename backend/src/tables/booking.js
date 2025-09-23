const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
    guest: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    checkIn: { type: Date, required: true },
    checkOut: { type: Date, required: true },
    totalAmount: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'commission_due', 'confirmed', 'cancelled', 'ended'], default: 'pending' },
    commissionAmount: { type: Number, default: 0 },
  commissionPaid: { type: Boolean, default: false },
  rating: { type: Number, min: 1, max: 5 },
  comment: { type: String }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Booking', bookingSchema);


