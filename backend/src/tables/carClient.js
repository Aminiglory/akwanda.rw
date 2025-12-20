const mongoose = require('mongoose');

const carClientSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  email: { type: String, default: '' },
  phone: { type: String, default: '' },
  type: { type: String, enum: ['individual', 'company'], default: 'individual' },
  companyName: { type: String, default: '' },
  notes: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('CarClient', carClientSchema);
