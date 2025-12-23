const mongoose = require('mongoose');

const attractionExpenseSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  attraction: { type: mongoose.Schema.Types.ObjectId, ref: 'Attraction', required: true },
  date: { type: Date, required: true },
  amount: { type: Number, required: true },
  category: { type: String, default: 'general' },
  note: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('AttractionExpense', attractionExpenseSchema);
