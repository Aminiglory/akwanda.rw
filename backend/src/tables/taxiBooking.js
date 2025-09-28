const mongoose = require('mongoose');

const taxiBookingSchema = new mongoose.Schema(
  {
    taxi: { type: mongoose.Schema.Types.ObjectId, ref: 'AirportTaxi', required: true },
    guest: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    pickupLocation: { type: String, required: true },
    destination: { type: String, required: true },
    pickupDate: { type: Date, required: true },
    pickupTime: { type: String, required: true },
    numberOfPassengers: { type: Number, required: true, min: 1 },
    distance: { type: Number }, // in kilometers
    totalAmount: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'], default: 'pending' },
    commissionAmount: { type: Number, default: 0 },
    commissionPaid: { type: Boolean, default: false },
    paymentMethod: { type: String, enum: ['cash', 'card', 'mobile_money'], default: 'cash' },
    contactPhone: { type: String },
    specialRequests: { type: String },
    rating: { type: Number, min: 1, max: 5 },
    review: { type: String }
  },
  { timestamps: true }
);

module.exports = mongoose.model('TaxiBooking', taxiBookingSchema);
