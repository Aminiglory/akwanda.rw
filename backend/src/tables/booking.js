const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
    room: { type: mongoose.Schema.Types.ObjectId }, // Reference to specific room if applicable
    guest: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    checkIn: { type: Date, required: true },
    checkOut: { type: Date, required: true },
    numberOfGuests: { type: Number, required: true, min: 1 },
    totalAmount: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'commission_due', 'confirmed', 'cancelled', 'ended'], default: 'pending' },
    commissionAmount: { type: Number, default: 0 },
    commissionPaid: { type: Boolean, default: false },
    paymentMethod: { type: String, enum: ['cash', 'card', 'mobile_money', 'bank_transfer'], default: 'cash' },
    paymentStatus: { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending' },
    contactPhone: { type: String },
    specialRequests: { type: String },
    groupBooking: { type: Boolean, default: false },
    groupSize: { type: Number },
    discountApplied: { type: Number, default: 0 },
    rating: { type: Number, min: 1, max: 5 },
    comment: { type: String },
    confirmationCode: { type: String, unique: true },
    guestContact: {
      phone: { type: String },
      email: { type: String },
      emergencyContact: { type: String }
    }
  },
  { timestamps: true }
);

// Generate confirmation code before saving
bookingSchema.pre('save', function(next) {
  if (!this.confirmationCode) {
    this.confirmationCode = 'AKW' + Math.random().toString(36).substr(2, 6).toUpperCase();
  }
  next();
});

module.exports = mongoose.model('Booking', bookingSchema);


