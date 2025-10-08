const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
    carBooking: { type: mongoose.Schema.Types.ObjectId, ref: 'CarRentalBooking' },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, required: true },
    attachments: [{
      url: { type: String },
      name: { type: String },
      size: { type: Number },
      mime: { type: String }
    }],
    isRead: { type: Boolean, default: false },
    readAt: { type: Date }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Message', messageSchema);
