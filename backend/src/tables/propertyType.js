const mongoose = require('mongoose');

const propertyTypeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  key: { type: String, required: true, unique: true },
  description: { type: String },
  active: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('PropertyType', propertyTypeSchema);
