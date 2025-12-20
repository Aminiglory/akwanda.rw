const mongoose = require('mongoose');

const carFuelLogSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    car: { type: mongoose.Schema.Types.ObjectId, ref: 'CarRental', required: true },
    date: { type: Date, required: true },
    liters: { type: Number, required: true },
    totalCost: { type: Number, required: true },
    pricePerLiter: { type: Number },
    odometerKm: { type: Number },
    stationName: { type: String },
    note: { type: String }
  },
  { timestamps: true }
);

module.exports = mongoose.model('CarFuelLog', carFuelLogSchema);
