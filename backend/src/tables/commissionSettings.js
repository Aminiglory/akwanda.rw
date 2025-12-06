const mongoose = require('mongoose');

const commissionSettingsSchema = new mongoose.Schema({
  baseRate: { type: Number, default: 8, min: 0, max: 100 },
  premiumRate: { type: Number, default: 10, min: 0, max: 100 },
  featuredRate: { type: Number, default: 12, min: 0, max: 100 },
  // When true, commission enforcement (locking/penalties) is globally paused.
  // Commissions are still tracked but the platform can choose to not enforce payment.
  enforcementPaused: { type: Boolean, default: false },
}, { timestamps: true });

commissionSettingsSchema.statics.getSingleton = async function () {
  let doc = await this.findOne();
  if (!doc) {
    doc = await this.create({});
  }
  return doc;
};

module.exports = mongoose.model('CommissionSettings', commissionSettingsSchema);
