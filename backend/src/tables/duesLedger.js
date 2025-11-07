const mongoose = require('mongoose');

const duesLedgerSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: ['commission', 'fine'], required: true },
  source: { type: String, enum: ['property','car','attraction','admin_adjustment'], default: 'property' },
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
  property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property' },
  car: { type: mongoose.Schema.Types.ObjectId, ref: 'Car' },
  attraction: { type: mongoose.Schema.Types.ObjectId, ref: 'Attraction' },
  description: { type: String },
  amount: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'RWF' },
  status: { type: String, enum: ['unpaid','partial','paid'], default: 'unpaid', index: true },
  paidAmount: { type: Number, default: 0, min: 0 },
  createdAt: { type: Date, default: Date.now },
  paidAt: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('DuesLedger', duesLedgerSchema);
