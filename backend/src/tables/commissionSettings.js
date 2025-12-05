const mongoose = require('mongoose');

const commissionSettingsSchema = new mongoose.Schema({
  baseRate: { type: Number, default: 8, min: 0, max: 100 },
  premiumRate: { type: Number, default: 10, min: 0, max: 100 },
  featuredRate: { type: Number, default: 12, min: 0, max: 100 },
}, { timestamps: true });

commissionSettingsSchema.statics.getSingleton = async function () {
  let doc = await this.findOne();
  if (!doc) {
    doc = await this.create({});
  }
  return doc;
};

module.exports = mongoose.model('CommissionSettings', commissionSettingsSchema);
