const mongoose = require('mongoose');

const carRentalBookingSchema = new mongoose.Schema(
  {
    car: { type: mongoose.Schema.Types.ObjectId, ref: 'CarRental', required: true },
    guest: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    pickupDate: { type: Date, required: true },
    returnDate: { type: Date, required: true },
    pickupLocation: { type: String, required: true },
    returnLocation: { type: String },
    numberOfDays: { type: Number, required: true },
    totalAmount: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'confirmed', 'active', 'completed', 'cancelled'], default: 'pending' },

    // Commission tracking
    commissionAmount: { type: Number, default: 0 },
    commissionPaid: { type: Boolean, default: false },
    commissionRate: { type: Number },

    // Channel & direct booking support
    channel: { type: String, enum: ['online', 'direct'], default: 'online', index: true },
    finalAgreedAmount: { type: Number },

    paymentMethod: { type: String, enum: ['cash', 'card', 'mobile_money', 'bank_transfer'], default: 'cash' },
    withDriver: { type: Boolean, default: false },
    driverAge: { type: Number },
    driverLicense: { type: String },
    contactPhone: { type: String },
    specialRequests: { type: String },

    // Lightweight guest info for direct/offline bookings
    guestName: { type: String },
    guestEmail: { type: String },
    guestPhone: { type: String },

    rating: { type: Number, min: 1, max: 5 },
    review: { type: String },
    mileageAtPickup: { type: Number },
    mileageAtReturn: { type: Number }
  },
  { timestamps: true }
);

module.exports = mongoose.model('CarRentalBooking', carRentalBookingSchema);
