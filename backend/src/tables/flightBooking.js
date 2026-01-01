const mongoose = require('mongoose');

const flightBookingSchema = new mongoose.Schema(
  {
    host: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    guest: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    airline: { type: String, required: true },
    flightNumber: { type: String, required: true },
    from: { type: String, required: true },
    to: { type: String, required: true },
    departure: { type: Date, required: true },
    arrival: { type: Date, required: true },
    duration: { type: String },
    price: { type: Number, required: true },
    status: { type: String, enum: ['upcoming', 'completed', 'cancelled'], default: 'upcoming', index: true },

    cabinClass: { type: String },
    channel: { type: String, enum: ['online', 'direct'], default: 'online', index: true },
    groupBooking: { type: Boolean, default: false },
    groupSize: { type: Number },
    // Commission tracking
    commissionLevel: { type: mongoose.Schema.Types.ObjectId, ref: 'CommissionLevel' },
    commissionRate: { type: Number, min: 0, max: 100 },
    commissionAmount: { type: Number, default: 0 },
    commissionPaid: { type: Boolean, default: false },
  },
  { timestamps: true }
);

flightBookingSchema.index({ host: 1, departure: -1 });
flightBookingSchema.index({ host: 1, status: 1 });

module.exports = mongoose.model('FlightBooking', flightBookingSchema);
