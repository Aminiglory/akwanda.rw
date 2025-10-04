const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    type: { 
      type: String, 
      enum: ['booking_created', 'account_blocked', 'account_reactivated', 'fine_added'], 
      required: true 
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
    property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property' },
    isRead: { type: Boolean, default: false },
    recipientUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true } // null for admin-wide
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', notificationSchema);



