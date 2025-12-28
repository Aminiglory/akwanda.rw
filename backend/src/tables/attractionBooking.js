const mongoose = require('mongoose');

const attractionBookingSchema = new mongoose.Schema(
  {
    attraction: { type: mongoose.Schema.Types.ObjectId, ref: 'Attraction', required: true },
    guest: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    confirmationCode: { type: String, index: true },
    visitDate: { type: Date, required: true },
    timeSlot: { type: String },
    numberOfPeople: { type: Number, required: true, min: 1 },
    totalAmount: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'confirmed', 'cancelled', 'completed'], default: 'pending' },
    isDirect: { type: Boolean, default: false },
    commissionAmount: { type: Number, default: 0 },
    commissionPaid: { type: Boolean, default: false },
    paymentMethod: { type: String, enum: ['cash', 'card', 'mobile_money', 'bank_transfer'], default: 'cash' },
    paymentStatus: { type: String, enum: ['pending', 'paid', 'failed', 'refunded', 'unpaid'], default: 'pending' },
    transactionId: { type: String },
    contactPhone: { type: String },
    specialRequests: { type: String },
    rating: { type: Number, min: 1, max: 5 },
    review: { type: String }
  },
  { timestamps: true }
);

function generateConfirmationCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 8 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
}

attractionBookingSchema.pre('save', function(next) {
  try {
    if (!this.confirmationCode) this.confirmationCode = generateConfirmationCode();
    next();
  } catch (e) {
    next(e);
  }
});

module.exports = mongoose.model('AttractionBooking', attractionBookingSchema);
