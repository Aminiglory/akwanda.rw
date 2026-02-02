const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    type: { 
      type: String, 
      enum: [
        'booking_created',
        'booking_paid',
        'booking_confirmed',
        'booking_status_updated',
        'booking_cancelled',
        'commission_due',
        'commission_paid',
        'review_received',
        'review_reply',
        'review_reminder',
        'platform_rating_reminder',
        'account_blocked',
        'account_reactivated',
        'fine_added',
        'new_message',
        'support_ticket_created'
      ], 
      required: true 
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
    property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property' },
    isRead: { type: Boolean, default: false },
    recipientUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true }, // null for admin-wide
    audience: { type: String, enum: ['host','guest','both'], default: 'guest', index: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', notificationSchema);



