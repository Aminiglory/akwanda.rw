const mongoose = require('mongoose');

const commissionLevelSchema = new mongoose.Schema({
  name: { type: String, required: true },
  key: { type: String, required: true, unique: true },
  description: { type: String },
  directRate: { type: Number, required: true, min: 0, max: 100 },
  onlineRate: { type: Number, required: true, min: 0, max: 100 },
  isPremium: { type: Boolean, default: false },
  isDefault: { type: Boolean, default: false },
  active: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('CommissionLevel', commissionLevelSchema);
