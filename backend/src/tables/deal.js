const mongoose = require('mongoose');

const dealSchema = new mongoose.Schema(
  {
    property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
    
    // Deal Type
    dealType: { 
      type: String, 
      required: true,
      enum: [
        'early_bird',        // Book X days in advance
        'last_minute',       // Book within X days of check-in
        'mobile_only',       // Mobile app exclusive
        'free_cancellation', // Free cancellation until X days before
        'long_stay',         // Stay X+ nights
        'weekend_special',   // Friday-Sunday bookings
        'weekday_special',   // Monday-Thursday bookings
        'seasonal',          // Holiday/season specific
        'flash_sale',        // Limited time offer
        'package_deal'       // Room + extras bundle
      ]
    },
    
    // Basic Info
    title: { type: String, required: true },
    description: { type: String },
    tagline: { type: String }, // e.g., "Save 25% - Book Now!"
    
    // Discount Details
    discountType: { 
      type: String, 
      enum: ['percentage', 'fixed_amount', 'free_night'], 
      default: 'percentage' 
    },
    discountValue: { type: Number, required: true, min: 0 }, // percentage or amount
    maxDiscountAmount: { type: Number }, // Cap for percentage discounts
    
    // Validity Period
    validFrom: { type: Date, required: true },
    validUntil: { type: Date, required: true },
    
    // Booking Window (when deal can be booked)
    bookingStartDate: { type: Date },
    bookingEndDate: { type: Date },
    
    // Stay Period (when guests can check-in/out)
    stayStartDate: { type: Date },
    stayEndDate: { type: Date },
    
    // Deal-Specific Conditions
    conditions: {
      // Early Bird
      minAdvanceBookingDays: { type: Number, min: 0 }, // Book at least X days ahead
      
      // Last Minute
      maxAdvanceBookingDays: { type: Number, min: 0 }, // Book within X days
      
      // Long Stay
      minNights: { type: Number, min: 1 }, // Minimum stay length
      maxNights: { type: Number }, // Maximum stay length
      
      // Free Cancellation
      freeCancellationUntilDays: { type: Number, min: 0 }, // Days before check-in
      
      // Day-specific
      applicableDays: [{ 
        type: String, 
        enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] 
      }],
      
      // Mobile Only
      mobileOnly: { type: Boolean, default: false },
      
      // Guest Requirements
      minGuests: { type: Number, min: 1 },
      maxGuests: { type: Number },
      
      // Room Requirements
      specificRoomTypes: [{ type: String }], // Empty = all rooms
      minRooms: { type: Number, min: 1 },
      
      // Payment
      prepaymentRequired: { type: Boolean, default: false },
      nonRefundable: { type: Boolean, default: false }
    },
    
    // Availability & Limits
    totalAvailableUnits: { type: Number }, // null = unlimited
    unitsBooked: { type: Number, default: 0 },
    maxBookingsPerUser: { type: Number, default: 1 },
    
    // Display Settings
    badge: { 
      type: String, 
      enum: ['hot_deal', 'limited_time', 'best_value', 'popular', 'new', 'exclusive'],
      default: 'hot_deal'
    },
    badgeColor: { type: String, default: '#FF6B6B' },
    priority: { type: Number, default: 0 }, // Higher = shown first
    
    // Status
    isActive: { type: Boolean, default: true },
    isPublished: { type: Boolean, default: false },
    
    // Analytics
    views: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    bookings: { type: Number, default: 0 },
    revenue: { type: Number, default: 0 },
    
    // Metadata
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String } // Internal notes for property owner
  },
  { timestamps: true }
);

// Indexes for performance
dealSchema.index({ property: 1, isActive: 1, isPublished: 1 });
dealSchema.index({ dealType: 1, validFrom: 1, validUntil: 1 });
dealSchema.index({ validFrom: 1, validUntil: 1 });
dealSchema.index({ priority: -1 });

// Virtual for availability status
dealSchema.virtual('isAvailable').get(function() {
  const now = new Date();
  const hasUnits = !this.totalAvailableUnits || this.unitsBooked < this.totalAvailableUnits;
  const isInValidPeriod = now >= this.validFrom && now <= this.validUntil;
  return this.isActive && this.isPublished && hasUnits && isInValidPeriod;
});

// Virtual for conversion rate
dealSchema.virtual('conversionRate').get(function() {
  return this.clicks > 0 ? ((this.bookings / this.clicks) * 100).toFixed(2) : 0;
});

// Method to check if deal applies to a booking
dealSchema.methods.isApplicableToBooking = function(bookingData) {
  const { checkInDate, checkOutDate, guests, rooms, isMobile, bookingDate } = bookingData;
  
  const checkIn = new Date(checkInDate);
  const checkOut = new Date(checkOutDate);
  const booking = new Date(bookingDate || Date.now());
  const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
  const daysUntilCheckIn = Math.ceil((checkIn - booking) / (1000 * 60 * 60 * 24));
  
  // Check if deal is available
  if (!this.isAvailable) return false;
  
  // Check stay period
  if (this.stayStartDate && checkIn < new Date(this.stayStartDate)) return false;
  if (this.stayEndDate && checkIn > new Date(this.stayEndDate)) return false;
  
  // Check booking window
  if (this.bookingStartDate && booking < new Date(this.bookingStartDate)) return false;
  if (this.bookingEndDate && booking > new Date(this.bookingEndDate)) return false;
  
  const cond = this.conditions;
  
  // Early Bird
  if (this.dealType === 'early_bird' && cond.minAdvanceBookingDays) {
    if (daysUntilCheckIn < cond.minAdvanceBookingDays) return false;
  }
  
  // Last Minute
  if (this.dealType === 'last_minute' && cond.maxAdvanceBookingDays) {
    if (daysUntilCheckIn > cond.maxAdvanceBookingDays) return false;
  }
  
  // Long Stay
  if (cond.minNights && nights < cond.minNights) return false;
  if (cond.maxNights && nights > cond.maxNights) return false;
  
  // Mobile Only
  if (cond.mobileOnly && !isMobile) return false;
  
  // Guest Requirements
  if (cond.minGuests && guests < cond.minGuests) return false;
  if (cond.maxGuests && guests > cond.maxGuests) return false;
  
  // Room Requirements
  if (cond.minRooms && rooms < cond.minRooms) return false;
  
  // Day-specific deals
  if (cond.applicableDays && cond.applicableDays.length > 0) {
    const dayName = checkIn.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    if (!cond.applicableDays.includes(dayName)) return false;
  }
  
  return true;
};

// Method to calculate discount amount
dealSchema.methods.calculateDiscount = function(originalPrice, nights = 1) {
  let discount = 0;
  
  if (this.discountType === 'percentage') {
    discount = (originalPrice * this.discountValue) / 100;
    if (this.maxDiscountAmount && discount > this.maxDiscountAmount) {
      discount = this.maxDiscountAmount;
    }
  } else if (this.discountType === 'fixed_amount') {
    discount = this.discountValue;
  } else if (this.discountType === 'free_night' && nights > 0) {
    // Free night: divide total by nights, multiply by discount value (number of free nights)
    const pricePerNight = originalPrice / nights;
    discount = pricePerNight * Math.min(this.discountValue, nights);
  }
  
  return Math.min(discount, originalPrice); // Never exceed original price
};

// Static method to find applicable deals for a property
dealSchema.statics.findApplicableDeals = async function(propertyId, bookingData) {
  const now = new Date();
  
  const deals = await this.find({
    property: propertyId,
    isActive: true,
    isPublished: true,
    validFrom: { $lte: now },
    validUntil: { $gte: now },
    $or: [
      { totalAvailableUnits: null },
      { $expr: { $lt: ['$unitsBooked', '$totalAvailableUnits'] } }
    ]
  }).sort({ priority: -1 });
  
  return deals.filter(deal => deal.isApplicableToBooking(bookingData));
};

// Pre-save validation
dealSchema.pre('save', function(next) {
  // Ensure valid dates
  if (this.validFrom >= this.validUntil) {
    return next(new Error('validFrom must be before validUntil'));
  }
  
  // Ensure discount value is reasonable
  if (this.discountType === 'percentage' && this.discountValue > 100) {
    return next(new Error('Percentage discount cannot exceed 100%'));
  }
  
  next();
});

module.exports = mongoose.model('Deal', dealSchema);
