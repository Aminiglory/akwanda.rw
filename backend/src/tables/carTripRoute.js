const mongoose = require('mongoose');

const carTripRouteSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    car: { type: mongoose.Schema.Types.ObjectId, ref: 'CarRental', required: true },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'CarRentalBooking', required: true },
    date: { type: Date },
    distanceKm: { type: Number },
    startOdometer: { type: Number },
    endOdometer: { type: Number },
    startLocation: { type: String },
    endLocation: { type: String },
    // Optional encoded polyline or free-form GPS data
    polyline: { type: String },
    // Optional detailed points for future map views
    points: [
      {
        lat: { type: Number },
        lng: { type: Number },
        timestamp: { type: Date },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('CarTripRoute', carTripRouteSchema);
