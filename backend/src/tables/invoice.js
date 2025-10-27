const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema(
  {
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', unique: true, required: true },
    property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
    host: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    guest: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    confirmationCode: { type: String, index: true },
    propertyNumber: { type: String, index: true },

    amountBeforeTax: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    taxRate: { type: Number, default: 3 },
    totalAmount: { type: Number, default: 0 },

    commissionAmount: { type: Number, default: 0 },
    commissionPaid: { type: Boolean, default: false },

    paymentMethod: { type: String, enum: ['mtn_mobile_money', 'cash'], default: 'cash' },
    paymentStatus: { type: String, enum: ['pending', 'paid', 'failed', 'refunded', 'unpaid'], default: 'unpaid', index: true },

    issuedAt: { type: Date },
    paidAt: { type: Date },
  },
  { timestamps: true }
);

invoiceSchema.index({ host: 1, createdAt: -1 });
invoiceSchema.index({ property: 1, createdAt: -1 });

module.exports = mongoose.model('Invoice', invoiceSchema);
