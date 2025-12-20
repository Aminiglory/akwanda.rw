const mongoose = require('mongoose');

const carMaintenanceSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    car: { type: mongoose.Schema.Types.ObjectId, ref: 'CarRental', required: true },
    date: { type: Date, required: true },
    type: { type: String, required: true },
    mileage: { type: Number },
    cost: { type: Number, default: 0 },
    note: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CarMaintenance', carMaintenanceSchema);
