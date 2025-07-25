const mongoose = require('mongoose');

const DiscountSchema = new mongoose.Schema({
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['percentage', 'fixed', 'early-bird', 'last-minute', 'group', 'extended-stay'],
    required: true
  },
  value: {
    type: Number,
    required: true,
    min: 0
  },
  minOrderValue: {
    type: Number,
    default: 0
  },
  maxDiscount: {
    type: Number, // For percentage discounts
    default: null
  },
  validFrom: {
    type: Date,
    required: true
  },
  validTo: {
    type: Date,
    required: true
  },
  usageLimit: {
    type: Number,
    default: null // null means unlimited
  },
  usedCount: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  applicableListings: [{
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'listingModel'
  }],
  listingModel: {
    type: String,
    enum: ['Stay', 'Dining', 'Activity', 'Transportation']
  },
  conditions: {
    minAdvanceBooking: { type: Number, default: null }, // days
    minStayDuration: { type: Number, default: null }, // nights
    minGroupSize: { type: Number, default: null }, // people
    dayOfWeek: [{ type: String, enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] }],
    season: { type: String, enum: ['high', 'low', 'shoulder'], default: null }
  },
  description: {
    type: String,
    trim: true
  },
  promoCode: {
    type: String,
    unique: true,
    sparse: true,
    uppercase: true
  }
}, { timestamps: true });

// Pre-save middleware to generate promo code if not provided
DiscountSchema.pre('save', function(next) {
  if (!this.promoCode && this.isNew) {
    this.promoCode = this.name.toUpperCase().replace(/\s+/g, '') + Math.random().toString(36).substr(2, 4).toUpperCase();
  }
  next();
});

// Method to check if discount is valid
DiscountSchema.methods.isValid = function(bookingData = {}) {
  const now = new Date();
  
  // Check if discount is active and within date range
  if (!this.isActive || now < this.validFrom || now > this.validTo) {
    return { valid: false, reason: 'Discount is not active or expired' };
  }
  
  // Check usage limit
  if (this.usageLimit && this.usedCount >= this.usageLimit) {
    return { valid: false, reason: 'Discount usage limit reached' };
  }
  
  // Check minimum order value
  if (this.minOrderValue && bookingData.totalAmount < this.minOrderValue) {
    return { valid: false, reason: `Minimum order value of ${this.minOrderValue} required` };
  }
  
  // Check type-specific conditions
  if (this.type === 'early-bird' && this.conditions.minAdvanceBooking) {
    const bookingDate = new Date(bookingData.date);
    const daysDifference = (bookingDate - now) / (1000 * 60 * 60 * 24);
    if (daysDifference < this.conditions.minAdvanceBooking) {
      return { valid: false, reason: `Must book at least ${this.conditions.minAdvanceBooking} days in advance` };
    }
  }
  
  if (this.type === 'group' && this.conditions.minGroupSize) {
    if (!bookingData.groupSize || bookingData.groupSize < this.conditions.minGroupSize) {
      return { valid: false, reason: `Minimum group size of ${this.conditions.minGroupSize} required` };
    }
  }
  
  return { valid: true };
};

// Method to calculate discount amount
DiscountSchema.methods.calculateDiscount = function(totalAmount) {
  if (this.type === 'percentage') {
    let discountAmount = (totalAmount * this.value) / 100;
    if (this.maxDiscount && discountAmount > this.maxDiscount) {
      discountAmount = this.maxDiscount;
    }
    return discountAmount;
  } else {
    return Math.min(this.value, totalAmount);
  }
};

module.exports = mongoose.model('Discount', DiscountSchema);