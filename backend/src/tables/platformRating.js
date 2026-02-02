const mongoose = require('mongoose');

const platformRatingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    userType: { type: String, enum: ['guest', 'host', 'admin'], required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PlatformRating', platformRatingSchema);
