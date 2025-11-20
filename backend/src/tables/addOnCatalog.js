const mongoose = require('mongoose');

const AddOnCatalogSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, trim: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  defaultPrice: { type: Number, default: 0 },
  defaultScope: { type: String, enum: ['per-booking', 'per-night', 'per-guest'], default: 'per-booking' },
  // Optional list of included items/components that a property can choose from (checkboxes)
  includedItems: [
    {
      key: { type: String, trim: true },
      label: { type: String, trim: true },
      defaultIncluded: { type: Boolean, default: true }
    }
  ],
  active: { type: Boolean, default: true },
  order: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('AddOnCatalog', AddOnCatalogSchema);
