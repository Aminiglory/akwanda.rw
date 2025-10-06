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
    taxAmount: { type: Number, default: 0 }, // 3% RRA tax
    taxRate: { type: Number, default: 3 }, // Tax rate percentage
    amountBeforeTax: { type: Number, default: 0 },
    status: { type: String, enum: ['pending', 'commission_due', 'confirmed', 'cancelled', 'ended'], default: 'pending' },
    commissionAmount: { type: Number, default: 0 },
    commissionPaid: { type: Boolean, default: false },
    paymentMethod: { type: String, enum: ['mtn_mobile_money', 'cash'], default: 'cash' },
    paymentStatus: { type: String, enum: ['pending', 'paid', 'failed', 'refunded', 'unpaid'], default: 'unpaid' },
    transactionId: { type: String }, // MTN transaction ID
    contactPhone: { type: String },
    specialRequests: { type: String },
    groupBooking: { type: Boolean, default: false },
    groupSize: { type: Number },
    discountApplied: { type: Number, default: 0 },
    rating: { type: Number, min: 1, max: 5 },
    comment: { type: String },
    confirmationCode: { type: String, unique: true },
    guestBreakdown: {
      adults: { type: Number, default: 1, min: 1 },
      children: { type: Number, default: 0, min: 0 },
      infants: { type: Number, default: 0, min: 0 }
    },
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


