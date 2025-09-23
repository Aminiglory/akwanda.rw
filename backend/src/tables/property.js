const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    address: { type: String, required: true },
    city: { type: String, required: true },
    pricePerNight: { type: Number, required: true },
    images: [{ type: String }],
    host: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    isActive: { type: Boolean, default: true },
    discountPercent: { type: Number, default: 0, min: 0, max: 100 },
    availability: { type: String, enum: ['available', 'in_use'], default: 'available' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Property', propertySchema);


