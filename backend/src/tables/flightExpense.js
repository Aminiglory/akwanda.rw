const mongoose = require('mongoose');

const flightExpenseSchema = new mongoose.Schema(
  {
    host: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    flightBooking: { type: mongoose.Schema.Types.ObjectId, ref: 'FlightBooking' },
    date: { type: Date, required: true },
    amount: { type: Number, required: true },
    category: { type: String, default: 'general' },
    note: { type: String },
  },
  { timestamps: true }
);

flightExpenseSchema.index({ host: 1, date: -1 });

module.exports = mongoose.model('FlightExpense', flightExpenseSchema);
