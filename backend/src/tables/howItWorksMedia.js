const mongoose = require('mongoose');

const HowItWorksMediaSchema = new mongoose.Schema({
  image: { type: String, required: true },
  title: { type: String, default: '' },
  description: { type: String, default: '' },
  audience: { type: String, enum: ['guests', 'hosts', 'all'], default: 'all' },
  order: { type: Number, default: 0 },
  enabled: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('HowItWorksMedia', HowItWorksMediaSchema);
