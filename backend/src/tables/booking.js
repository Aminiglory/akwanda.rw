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
    finalAgreedAmount: { type: Number },
    taxAmount: { type: Number, default: 0 }, // 3% RRA tax
    taxRate: { type: Number, default: 3 }, // Tax rate percentage
    amountBeforeTax: { type: Number, default: 0 },
    status: { type: String, enum: ['pending', 'awaiting', 'commission_due', 'confirmed', 'cancelled', 'ended'], default: 'pending' },
    // Commission tracking
    commissionAmount: { type: Number, default: 0 },
    commissionPaid: { type: Boolean, default: false },
    // Percentage rate actually used for this booking (after all fallbacks)
    commissionRate: { type: Number, default: 0 },
    // "online" or "direct" depending on booking source
    commissionType: { type: String, enum: ['online', 'direct'], default: 'online' },
    // Category for analytics (e.g. 'premium' vs 'basic')
    commissionCategory: { type: String, default: 'basic' },
    // Key of the commission level used (e.g. 'premium')
    commissionLevelKey: { type: String },
    // Snapshot of the commission level at time of booking
    commissionLevelSnapshot: {
      name: { type: String },
      key: { type: String },
      description: { type: String },
      directRate: { type: Number },
      onlineRate: { type: Number },
      isPremium: { type: Boolean }
    },
    paymentMethod: { type: String, enum: ['mtn_mobile_money', 'cash'], default: 'cash' },
    paymentStatus: { type: String, enum: ['pending', 'paid', 'failed', 'refunded', 'unpaid'], default: 'unpaid' },
    transactionId: { type: String }, // MTN transaction ID
    contactPhone: { type: String },
    specialRequests: { type: String },
    groupBooking: { type: Boolean, default: false },
    groupSize: { type: Number },
    discountApplied: { type: Number, default: 0 },
    isDirect: { type: Boolean, default: false },
    rating: { type: Number, min: 1, max: 5 },
    comment: { type: String },
    confirmationCode: { type: String, unique: true },
    // Short human-friendly booking number (can be shown to guests)
    bookingNumber: { type: String, index: true },
    // Simple review PIN used to verify real guests when rating
    reviewPin: { type: String },
    guestBreakdown: {
      adults: { type: Number, default: 1, min: 1 },
      children: { type: Number, default: 0, min: 0 },
      infants: { type: Number, default: 0, min: 0 }
    },
    guestContact: {
      phone: { type: String },
      email: { type: String },
      emergencyContact: { type: String }
    },
    // Optional info-only add-on services selected for this booking.
    // This mirrors the front-end `services` object (key -> boolean) and
    // does not affect totals or commission.
    services: {
      type: Object,
      default: {}
    },
    // Manual direct-booking add-ons (label + amount). These are intended
    // mainly for receipts; they may be summed into the total on the
    // frontend or backend depending on business rules.
    directAddOns: [
      {
        label: { type: String },
        amount: { type: Number, default: 0 }
      }
    ]
  },
  { timestamps: true }
);

// Indexes for faster lookups in owner dashboards, calendars, and guest lists
bookingSchema.index({ property: 1, createdAt: -1 });
bookingSchema.index({ guest: 1, createdAt: -1 });
bookingSchema.index({ property: 1, status: 1, checkIn: 1, checkOut: 1 });

// Generate confirmation code, booking number, and review PIN before saving
bookingSchema.pre('save', function(next) {
  if (!this.confirmationCode) {
    this.confirmationCode = 'AKW' + Math.random().toString(36).substr(2, 6).toUpperCase();
  }
  if (!this.bookingNumber) {
    // Use a readable shorter code derived from confirmationCode or random if missing
    const base = this.confirmationCode || ('AKW' + Math.random().toString(36).substr(2, 6).toUpperCase());
    this.bookingNumber = base.slice(0, 3) + '-' + base.slice(-4);
  }
  if (!this.reviewPin) {
    this.reviewPin = String(Math.floor(1000 + Math.random() * 9000));
  }
  next();
});

module.exports = mongoose.model('Booking', bookingSchema);


