const mongoose = require('mongoose');

// Vehicle-level expense for a specific car owned by a host
// Mirrors the generic Expense model but scoped to CarRental instead of Property
const carExpenseSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  car: { type: mongoose.Schema.Types.ObjectId, ref: 'CarRental', required: true },
  date: { type: Date, required: true },
  amount: { type: Number, required: true },
  category: { type: String, default: 'general' },
  note: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('CarExpense', carExpenseSchema);
