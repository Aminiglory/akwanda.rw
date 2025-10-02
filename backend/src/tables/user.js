const mongoose = require('mongoose');
  
  const userSchema = new mongoose.Schema(
    {
      firstName: { type: String, required: true },
      lastName: { type: String, required: true },
      email: { type: String, required: true, unique: true, lowercase: true, index: true },
      phone: { type: String, required: true },
      passwordHash: { type: String, required: true },
      userType: { type: String, enum: ['guest', 'host', 'admin'], default: 'guest' },
      avatar: { type: String },
      bio: { type: String, maxlength: 1000 },
      // Admin control fields
      isBlocked: { type: Boolean, default: false },
      blockReason: { type: String, maxlength: 500 },
      blockedAt: { type: Date },
      // Fines/dues tracking for unpaid commissions or penalties
      fines: {
        totalDue: { type: Number, default: 0 },
        currency: { type: String, default: 'RWF' },
        items: [
          {
            reason: { type: String, required: true },
            amount: { type: Number, required: true },
            createdAt: { type: Date, default: Date.now },
            paid: { type: Boolean, default: false },
            paidAt: { type: Date }
          }
        ]
      }
    },
    { timestamps: true }
  );
  
  module.exports = mongoose.model('User', userSchema);
