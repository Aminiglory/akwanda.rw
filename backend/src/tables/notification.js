const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    type: { 
      type: String, 
      enum: [
        'booking_created',
        'booking_confirmed',
        'booking_cancelled',
        'booking_updated',
        'payment_received', // Added this
        'payment_failed',   // Added this
        'payment_processed', // Added this as alternative
        'review_added',
        'property_listed',
        'property_updated',
        'message_received',
        'system_alert',
        'admin_notification'
      ], 
      required: true 
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
    property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property' },
    isRead: { type: Boolean, default: false },
    recipientUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true }, // null for admin-wide
    priority: { 
      type: String, 
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    },
    metadata: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Index for better query performance
notificationSchema.index({ recipientUser: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ type: 1, createdAt: -1 });
notificationSchema.index({ createdAt: -1 });

// Virtual for formatted created date
notificationSchema.virtual('formattedDate').get(function() {
  return this.createdAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
});

// Static method to create payment notifications
notificationSchema.statics.createPaymentNotification = async function({
  recipientUser,
  type,
  title,
  message,
  booking,
  property,
  priority = 'medium',
  metadata = {}
}) {
  const validPaymentTypes = ['payment_received', 'payment_failed', 'payment_processed'];
  
  if (!validPaymentTypes.includes(type)) {
    throw new Error(`Invalid payment notification type: ${type}`);
  }

  return await this.create({
    type,
    title,
    message,
    recipientUser,
    booking,
    property,
    priority,
    metadata,
    isRead: false
  });
};

// Static method to create booking notifications
notificationSchema.statics.createBookingNotification = async function({
  recipientUser,
  type,
  title,
  message,
  booking,
  property,
  priority = 'medium'
}) {
  const validBookingTypes = [
    'booking_created', 
    'booking_confirmed', 
    'booking_cancelled', 
    'booking_updated'
  ];
  
  if (!validBookingTypes.includes(type)) {
    throw new Error(`Invalid booking notification type: ${type}`);
  }

  return await this.create({
    type,
    title,
    message,
    recipientUser,
    booking,
    property,
    priority,
    isRead: false
  });
};

// Instance method to mark as read
notificationSchema.methods.markAsRead = function() {
  this.isRead = true;
  return this.save();
};

// Instance method to get notification preview
notificationSchema.methods.getPreview = function() {
  const maxLength = 100;
  if (this.message.length <= maxLength) {
    return this.message;
  }
  return this.message.substring(0, maxLength) + '...';
};

module.exports = mongoose.model('Notification', notificationSchema);