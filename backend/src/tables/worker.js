const mongoose = require('mongoose');

const workerSchema = new mongoose.Schema({
  // Basic Information
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  phone: { type: String, required: true },
  nationalId: { type: String, required: true, unique: true },
  
  // Employment Details
  employerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Property owner
  employeeId: { type: String, required: true, unique: true }, // Generated employee ID
  position: { type: String, required: true }, // e.g., "Property Manager", "Maintenance", "Cleaner"
  department: { type: String, default: 'General' },
  hireDate: { type: Date, default: Date.now },
  status: { 
    type: String, 
    enum: ['active', 'inactive', 'suspended', 'terminated'], 
    default: 'active' 
  },
  
  // Salary Information
  salary: {
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'RWF' },
    paymentFrequency: { 
      type: String, 
      enum: ['weekly', 'biweekly', 'monthly', 'quarterly'], 
      default: 'monthly' 
    },
    lastPaid: { type: Date },
    nextPaymentDue: { type: Date }
  },
  
  // Privileges and Capabilities
  privileges: {
    // Property Management
    canViewProperties: { type: Boolean, default: true },
    canEditProperties: { type: Boolean, default: false },
    canDeleteProperties: { type: Boolean, default: false },
    canCreateProperties: { type: Boolean, default: false },
    
    // Booking Management
    canViewBookings: { type: Boolean, default: true },
    canConfirmBookings: { type: Boolean, default: false },
    canCancelBookings: { type: Boolean, default: false },
    canModifyBookings: { type: Boolean, default: false },
    
    // Financial Access
    canViewRevenue: { type: Boolean, default: false },
    canViewReports: { type: Boolean, default: false },
    canProcessPayments: { type: Boolean, default: false },
    
    // Guest Communication
    canMessageGuests: { type: Boolean, default: true },
    canViewGuestInfo: { type: Boolean, default: true },
    
    // Maintenance & Operations
    canScheduleMaintenance: { type: Boolean, default: false },
    canUpdatePropertyStatus: { type: Boolean, default: false },
    canManageInventory: { type: Boolean, default: false },
    
    // Administrative
    canViewAnalytics: { type: Boolean, default: false },
    canManageOtherWorkers: { type: Boolean, default: false }
  },
  
  // Assigned Properties
  assignedProperties: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Property' 
  }],
  
  // Profile Information
  avatar: { type: String },
  bio: { type: String },
  address: {
    street: String,
    city: String,
    district: String,
    country: { type: String, default: 'Rwanda' }
  },
  
  // Emergency Contact
  emergencyContact: {
    name: String,
    relationship: String,
    phone: String
  },
  
  // Performance Tracking
  performance: {
    rating: { type: Number, min: 1, max: 5, default: 3 },
    totalTasksCompleted: { type: Number, default: 0 },
    totalTasksAssigned: { type: Number, default: 0 },
    lastEvaluation: { type: Date },
    notes: [{ 
      date: { type: Date, default: Date.now },
      note: String,
      addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    }]
  },
  
  // System Fields
  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date },
  loginAttempts: { type: Number, default: 0 },
  accountLocked: { type: Boolean, default: false },
  lockUntil: { type: Date },
  
  // Audit Trail
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true
});

// Indexes for better performance
workerSchema.index({ employerId: 1, status: 1 });
workerSchema.index({ 'assignedProperties': 1 });

// Virtual for full name
workerSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Method to generate employee ID
workerSchema.statics.generateEmployeeId = async function(employerId) {
  const count = await this.countDocuments({ employerId });
  const year = new Date().getFullYear();
  return `EMP${year}${employerId.toString().slice(-4)}${(count + 1).toString().padStart(3, '0')}`;
};

// Method to check if account is locked
workerSchema.methods.isLocked = function() {
  return !!(this.accountLocked && this.lockUntil && this.lockUntil > Date.now());
};

// Method to increment login attempts
workerSchema.methods.incLoginAttempts = function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  // Lock account after 5 failed attempts for 2 hours
  if (this.loginAttempts + 1 >= 5 && !this.isLocked()) {
    updates.$set = {
      accountLocked: true,
      lockUntil: Date.now() + 2 * 60 * 60 * 1000 // 2 hours
    };
  }
  
  return this.updateOne(updates);
};

// Method to reset login attempts
workerSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 },
    $set: { accountLocked: false, lastLogin: Date.now() }
  });
};

module.exports = mongoose.model('Worker', workerSchema);
