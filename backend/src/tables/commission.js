const mongoose = require('mongoose');

const commissionSchema = new mongoose.Schema(
  {
    ratePercent: { type: Number, required: true, default: 10, min: 8, max: 12 },
    active: { type: Boolean, default: true },
    setBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Commission', commissionSchema);


