const mongoose = require('mongoose');

const AddOnCatalogSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, trim: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  defaultPrice: { type: Number, default: 0 },
  defaultScope: { type: String, enum: ['per-booking', 'per-night', 'per-guest'], default: 'per-booking' },
  active: { type: Boolean, default: true },
  order: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('AddOnCatalog', AddOnCatalogSchema);
