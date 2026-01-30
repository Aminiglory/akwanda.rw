const mongoose = require('mongoose');

const supportTicketResponseSchema = new mongoose.Schema(
  {
    message: { type: String, required: true },
    isAdmin: { type: Boolean, default: false },
    auto: { type: Boolean, default: false },
    responderUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const supportTicketSchema = new mongoose.Schema(
  {
    ticketNumber: { type: String, required: true, unique: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    phone: { type: String, default: null },
    bookingId: { type: String, default: null, trim: true },
    subject: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ['general', 'booking', 'payment', 'technical', 'refund'],
      default: 'general',
      index: true
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
      index: true
    },
    message: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'resolved', 'closed'],
      default: 'open',
      index: true
    },
    responses: { type: [supportTicketResponseSchema], default: [] }
  },
  { timestamps: true }
);

module.exports = mongoose.model('SupportTicket', supportTicketSchema);
