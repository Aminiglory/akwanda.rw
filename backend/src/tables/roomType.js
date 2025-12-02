const mongoose = require('mongoose');

const roomTypeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  key: { type: String, required: true, unique: true },
  description: { type: String, default: '' },
  defaultBathroomType: { type: String, enum: ['inside', 'shared'], default: 'inside' },
  active: { type: Boolean, default: true },
  order: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('RoomType', roomTypeSchema);
