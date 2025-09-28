const mongoose = require('mongoose');

const airportTaxiSchema = new mongoose.Schema(
  {
    driverName: { type: String, required: true },
    driverPhone: { type: String, required: true },
    vehicleType: { type: String, enum: ['sedan', 'suv', 'minivan', 'bus'], required: true },
    vehicleModel: { type: String, required: true },
    licensePlate: { type: String, required: true },
    capacity: { type: Number, required: true, min: 1 },
    pricePerKm: { type: Number, required: true },
    basePrice: { type: Number, required: true },
    currency: { type: String, default: 'RWF' },
    isAvailable: { type: Boolean, default: true },
    currentLocation: { type: String },
    rating: { type: Number, min: 1, max: 5, default: 5 },
    totalTrips: { type: Number, default: 0 },
    images: [{ type: String }],
    amenities: [{ type: String }], // AC, WiFi, etc.
    operatingHours: {
      start: { type: String },
      end: { type: String }
    },
    bookings: [{ type: mongoose.Schema.Types.ObjectId, ref: 'TaxiBooking' }]
  },
  { timestamps: true }
);

module.exports = mongoose.model('AirportTaxi', airportTaxiSchema);
