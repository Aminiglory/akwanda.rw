const mongoose = require('mongoose');

const workerActionLogSchema = new mongoose.Schema({
  // Worker Information
  workerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Worker', required: true },
  employerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // Action Details
  action: { 
    type: String, 
    required: true,
    enum: [
      // Property Actions
      'property_viewed', 'property_updated', 'property_created', 'property_deleted',
      'property_status_changed', 'property_images_updated',
      
      // Booking Actions
      'booking_viewed', 'booking_confirmed', 'booking_cancelled', 'booking_modified',
      'booking_checked_in', 'booking_checked_out', 'booking_extended',
      
      // Guest Communication
      'message_sent', 'message_viewed', 'guest_contacted', 'complaint_handled',
      
      // Financial Actions
      'payment_processed', 'refund_issued', 'invoice_generated', 'revenue_viewed',
      
      // Maintenance & Operations
      'maintenance_scheduled', 'maintenance_completed', 'inventory_updated',
      'cleaning_scheduled', 'cleaning_completed', 'inspection_performed',
      
      // System Actions
      'login', 'logout', 'password_changed', 'profile_updated',
      'report_generated', 'data_exported',
      
      // Administrative
      'worker_created', 'worker_updated', 'worker_deleted', 'privileges_changed'
    ]
  },
  
  // Target Resource
  targetType: { 
    type: String, 
    enum: ['property', 'booking', 'guest', 'payment', 'maintenance', 'worker', 'system', 'report'],
    required: true 
  },
  targetId: { type: mongoose.Schema.Types.ObjectId }, // ID of the target resource
  targetName: { type: String }, // Name/title of the target resource
  
  // Action Context
  description: { type: String, required: true },
  details: { type: mongoose.Schema.Types.Mixed }, // Additional action-specific data
  
  // Request Information
  ipAddress: { type: String },
  userAgent: { type: String },
  sessionId: { type: String },
  
  // Result
  success: { type: Boolean, default: true },
  errorMessage: { type: String },
  
  // Metadata
  duration: { type: Number }, // Action duration in milliseconds
  severity: { 
    type: String, 
    enum: ['low', 'medium', 'high', 'critical'], 
    default: 'low' 
  },
  
  // Location (if applicable)
  location: {
    propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property' },
    propertyName: { type: String }
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
workerActionLogSchema.index({ workerId: 1, createdAt: -1 });
workerActionLogSchema.index({ employerId: 1, createdAt: -1 });
workerActionLogSchema.index({ action: 1, createdAt: -1 });
workerActionLogSchema.index({ targetType: 1, targetId: 1 });
workerActionLogSchema.index({ success: 1, severity: 1 });
workerActionLogSchema.index({ createdAt: -1 }); // For time-based queries

// Static method to log an action
workerActionLogSchema.statics.logAction = async function(data) {
  try {
    const log = new this(data);
    await log.save();
    return log;
  } catch (error) {
    console.error('Failed to log worker action:', error);
    return null;
  }
};

// Static method to get worker activity summary
workerActionLogSchema.statics.getActivitySummary = async function(workerId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const summary = await this.aggregate([
    {
      $match: {
        workerId: new mongoose.Types.ObjectId(workerId),
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$action',
        count: { $sum: 1 },
        lastPerformed: { $max: '$createdAt' },
        successRate: {
          $avg: { $cond: ['$success', 1, 0] }
        }
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);
  
  return summary;
};

// Static method to get daily activity for a worker
workerActionLogSchema.statics.getDailyActivity = async function(workerId, days = 7) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);
  
  const activity = await this.aggregate([
    {
      $match: {
        workerId: new mongoose.Types.ObjectId(workerId),
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' }
        },
        totalActions: { $sum: 1 },
        successfulActions: {
          $sum: { $cond: ['$success', 1, 0] }
        },
        failedActions: {
          $sum: { $cond: ['$success', 0, 1] }
        },
        actions: { $push: '$action' }
      }
    },
    {
      $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
    }
  ]);
  
  return activity;
};

module.exports = mongoose.model('WorkerActionLog', workerActionLogSchema);
