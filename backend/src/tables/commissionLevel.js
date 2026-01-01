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
  // Scope allows separate commission level sets for different products (e.g. properties vs vehicles vs flights)
  scope: { type: String, enum: ['property', 'vehicle', 'flight'], default: 'property', index: true },
}, { timestamps: true });

module.exports = mongoose.model('CommissionLevel', commissionLevelSchema);
