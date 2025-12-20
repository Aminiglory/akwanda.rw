const mongoose = require('mongoose');

const carTourSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // Optional primary vehicle this tour is usually run with
    primaryCar: { type: mongoose.Schema.Types.ObjectId, ref: 'CarRental' },
    title: { type: String, required: true },
    description: { type: String },
    startLocation: { type: String, required: true },
    endLocation: { type: String, required: true },
    durationHours: { type: Number },
    basePrice: { type: Number, required: true },
    currency: { type: String, default: 'RWF' },
    isActive: { type: Boolean, default: true },
    tags: [{ type: String }],
    // Ordered stops along the tour route (optional, high-level only)
    stops: [
      {
        name: { type: String, required: true },
        description: { type: String },
        order: { type: Number },
        lat: { type: Number },
        lng: { type: Number },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('CarTour', carTourSchema);
