const mongoose = require('mongoose');

const commissionUpgradeLogSchema = new mongoose.Schema({
  // Who performed the upgrade
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  performedByType: { type: String, enum: ['owner', 'admin'], required: true },
  
  // What was upgraded
  itemType: { type: String, enum: ['property', 'vehicle', 'flight'], required: true, index: true },
  itemId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  itemName: { type: String }, // Property title, vehicle name, flight route, etc.
  
  // Commission level details
  oldCommissionLevel: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'CommissionLevel' 
  },
  oldCommissionLevelName: { type: String },
  oldCommissionRate: { type: Number },
  oldCommissionAmount: { type: Number },
  
  newCommissionLevel: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'CommissionLevel', 
    required: true 
  },
  newCommissionLevelName: { type: String },
  newCommissionRate: { type: Number },
  newCommissionAmount: { type: Number },
  
  // Additional context
  bookingPrice: { type: Number }, // For flights, the booking price at time of upgrade
  channel: { type: String, enum: ['online', 'direct'] }, // For flights
  
  // Metadata
  ipAddress: { type: String },
  userAgent: { type: String },
  description: { type: String },
  
  // Timestamps
  createdAt: { type: Date, default: Date.now, index: true }
}, { timestamps: true });

// Indexes for efficient querying
commissionUpgradeLogSchema.index({ itemType: 1, itemId: 1 });
commissionUpgradeLogSchema.index({ performedBy: 1, createdAt: -1 });
commissionUpgradeLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('CommissionUpgradeLog', commissionUpgradeLogSchema);

