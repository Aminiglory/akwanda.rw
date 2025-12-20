const mongoose = require('mongoose');

const carIncomeSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  car: { type: mongoose.Schema.Types.ObjectId, ref: 'CarRental', required: true },
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'CarRentalBooking' },
  date: { type: Date, required: true },
  amount: { type: Number, required: true },
  source: { type: String, enum: ['booking', 'manual', 'adjustment'], default: 'booking' },
  method: { type: String, default: '' },
  reference: { type: String, default: '' },
  note: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('CarIncome', carIncomeSchema);
