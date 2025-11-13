const mongoose = require('mongoose');

const amenitySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    type: { type: String, enum: ['amenity', 'service'], default: 'amenity' },
    scope: { type: String, enum: ['property', 'room'], required: true },
    icon: { type: String },
    active: { type: Boolean, default: true },
    order: { type: Number, default: 0 }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Amenity', amenitySchema);
