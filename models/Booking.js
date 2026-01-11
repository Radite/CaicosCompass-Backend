// models/Booking.js - Enhanced booking model for transportation services

const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
  // Basic booking information
  bookingId: {
    type: String,
    unique: true,
    default: function() {
      return 'BK' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    }
  },
  
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  service: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
    required: true
  },
  
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Service type and category
  serviceType: {
    type: String,
    enum: ['Transportation', 'Stay', 'Dining', 'Activity'],
    required: true
  },
  
  category: {
    type: String,
    required: function() { return this.serviceType === 'Transportation'; }
  },

  // Booking status and timeline
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'in-progress', 'completed', 'cancelled', 'no-show', 'reviewed'],
    default: 'pending'
  },
  
  statusHistory: [{
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'in-progress', 'completed', 'cancelled', 'no-show', 'reviewed']
    },
    timestamp: { type: Date, default: Date.now },
    reason: String,
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],

  // Transportation-specific booking details
  transportationDetails: {
    // Vehicle and driver assignment
    assignedVehicle: {
      vehicleId: String,
      make: String,
      model: String,
      licensePlate: String,
      color: String
    },
    
    assignedDriver: {
      driverId: String,
      name: String,
      phoneNumber: String,
      licenseNumber: String,
      rating: Number
    },

    // Trip details
    tripType: {
      type: String,
      enum: ['one-way', 'round-trip', 'multi-stop', 'rental'],
      default: 'one-way'
    },

    // Pickup information
    pickup: {
      location: {
        name: String,
        address: String,
        coordinates: {
          latitude: Number,
          longitude: Number
        }
      },
      date: Date,
      time: String,
      instructions: String,
      contactPerson: {
        name: String,
        phone: String
      }
    },

    // Dropoff information  
    dropoff: {
      location: {
        name: String,
        address: String,
        coordinates: {
          latitude: Number,
          longitude: Number
        }
      },
      date: Date,
      time: String,
      instructions: String
    },

    // Additional stops (for multi-stop trips)
    additionalStops: [{
      location: {
        name: String,
        address: String,
        coordinates: {
          latitude: Number,
          longitude: Number
        }
      },
      estimatedArrival: Date,
      duration: Number, // minutes
      instructions: String,
      completed: { type: Boolean, default: false }
    }],

    // Rental specific details
    rentalDetails: {
      startDate: Date,
      endDate: Date,
      duration: Number, // in days
      mileageLimit: Number,
      currentMileage: Number,
      returnMileage: Number,
      fuelLevel: {
        pickup: String, // 'full', '3/4', '1/2', '1/4', 'empty'
        return: String
      },
      additionalServices: [{
        name: String,
        price: Number,
        quantity: { type: Number, default: 1 }
      }],
      insurance: {
        type: String,
        provider: String,
        cost: Number,
        policyNumber: String
      }
    },

    // Trip tracking
    tracking: {
      enabled: { type: Boolean, default: false },
      currentLocation: {
        latitude: Number,
        longitude: Number,
        timestamp: Date
      },
      estimatedArrival: Date,
      actualPickupTime: Date,
      actualDropoffTime: Date,
      route: [{
        latitude: Number,
        longitude: Number,
        timestamp: Date
      }],
      totalDistance: Number, // in miles/km
      totalDuration: Number // in minutes
    }
  },

  // Passenger information
  passengers: {
    adults: { type: Number, default: 1, min: 1 },
    children: { type: Number, default: 0, min: 0 },
    infants: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true },
    specialNeeds: [{
      type: String,
      enum: ['wheelchair-accessible', 'child-seat', 'pet-friendly', 'luggage-space', 'other'],
      description: String
    }]
  },

  referralCode: {
  type: String,
  default: null,
  index: true
},

referralPartner: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'ReferralPartner',
  default: null
},
  // Pricing and payment
  pricing: {
    basePrice: { type: Number, required: true },
    distanceCharge: { type: Number, default: 0 },
    timeCharge: { type: Number, default: 0 },
    surcharges: [{
      name: String,
      amount: Number,
      type: String // 'night', 'weekend', 'holiday', 'peak', 'other'
    }],
    discounts: [{
      name: String,
      amount: Number,
      type: String, // 'promo', 'loyalty', 'bulk', 'early-bird'
      code: String
    }],
    taxes: [{
      name: String,
      rate: Number, // percentage
      amount: Number
    }],
    tips: { type: Number, default: 0 },
    subtotal: { type: Number, required: true },
    totalAmount: { type: Number, required: true }
  },

  // Payment information
  payment: {
    method: {
      type: String,
      enum: ['cash', 'credit-card', 'debit-card', 'online-payment', 'bank-transfer', 'mobile-payment'],
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'refunded', 'partially-refunded'],
      default: 'pending'
    },
    transactionId: String,
    paymentGateway: String,
    paidAt: Date,
    refundAmount: { type: Number, default: 0 },
    refundReason: String,
    refundedAt: Date,
    receiptUrl: String,
    installments: [{
      amount: Number,
      dueDate: Date,
      status: {
        type: String,
        enum: ['pending', 'paid', 'overdue'],
        default: 'pending'
      },
      paidAt: Date
    }]
  },

  // Communication and notifications
  notifications: {
    smsEnabled: { type: Boolean, default: true },
    emailEnabled: { type: Boolean, default: true },
    pushEnabled: { type: Boolean, default: true },
    confirmationSent: { type: Boolean, default: false },
    reminderSent: { type: Boolean, default: false },
    completionSent: { type: Boolean, default: false }
  },

  // Customer preferences and requirements
  preferences: {
    vehicleType: String,
    driverGender: String,
    temperature: String, // 'cold', 'moderate', 'warm'
    music: String, // 'none', 'soft', 'radio'
    conversation: String, // 'minimal', 'friendly', 'chatty'
    language: String,
    specialRequests: String
  },

  // Cancellation information
  cancellation: {
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    cancelledAt: Date,
    reason: String,
    cancellationFee: { type: Number, default: 0 },
    refundAmount: { type: Number, default: 0 },
    policy: {
      timeBeforeCancellation: Number, // hours
      refundPercentage: Number,
      fee: Number
    }
  },

  // Review and rating
  review: {
    customerReview: {
      rating: { type: Number, min: 1, max: 5 },
      comment: String,
      aspects: {
        punctuality: { type: Number, min: 1, max: 5 },
        vehicleCondition: { type: Number, min: 1, max: 5 },
        driverBehavior: { type: Number, min: 1, max: 5 },
        cleanliness: { type: Number, min: 1, max: 5 },
        value: { type: Number, min: 1, max: 5 }
      },
      reviewDate: Date,
      wouldRecommend: Boolean
    },
    vendorResponse: {
      comment: String,
      responseDate: Date,
      respondedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    }
  },

  // Vendor notes and internal information
  vendorNotes: [{
    note: String,
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    addedAt: { type: Date, default: Date.now },
    type: {
      type: String,
      enum: ['general', 'customer-service', 'operations', 'billing', 'complaint'],
      default: 'general'
    },
    private: { type: Boolean, default: true } // Not visible to customer
  }],

  // Emergency and safety information
  emergency: {
    emergencyContact: {
      name: String,
      phone: String,
      relationship: String
    },
    medicalInfo: String,
    safetyIncidents: [{
      type: String,
      description: String,
      reportedAt: Date,
      resolvedAt: Date,
      severity: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'low'
      }
    }]
  },

  // Metadata
  bookingSource: {
    type: String,
    enum: ['web', 'mobile-app', 'phone', 'walk-in', 'agent', 'api'],
    default: 'web'
  },
  
  customerIP: String,
  userAgent: String,
  referralSource: String,
  marketingCampaign: String,
  
  // Additional custom fields for flexibility
  customFields: [{
    name: String,
    value: mongoose.Schema.Types.Mixed,
    type: String // 'string', 'number', 'boolean', 'date'
  }],

  // Timestamps
  bookingDate: { type: Date, default: Date.now },
  scheduledDateTime: Date,
  actualStartTime: Date,
  actualEndTime: Date,
  lastModified: { type: Date, default: Date.now },
  
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
BookingSchema.index({ customer: 1, createdAt: -1 });
BookingSchema.index({ vendor: 1, status: 1 });
BookingSchema.index({ service: 1, status: 1 });
BookingSchema.index({ bookingId: 1 }, { unique: true });
BookingSchema.index({ 'transportationDetails.pickup.date': 1 });
BookingSchema.index({ status: 1, scheduledDateTime: 1 });
BookingSchema.index({ 'payment.status': 1 });

// Virtual for booking duration
BookingSchema.virtual('duration').get(function() {
  if (this.actualStartTime && this.actualEndTime) {
    return Math.abs(this.actualEndTime - this.actualStartTime) / 60000; // in minutes
  }
  return null;
});

// Virtual for total trip distance
BookingSchema.virtual('totalTripDistance').get(function() {
  return this.transportationDetails?.tracking?.totalDistance || 0;
});

// Virtual for booking age
BookingSchema.virtual('bookingAge').get(function() {
  return Math.abs(new Date() - this.createdAt) / (1000 * 60 * 60 * 24); // in days
});

// Pre-save middleware
BookingSchema.pre('save', function(next) {
  this.lastModified = new Date();
  
  // Update status history
  if (this.isModified('status') && this.status !== this.constructor.findOne({ _id: this._id })?.status) {
    this.statusHistory.push({
      status: this.status,
      timestamp: new Date()
    });
  }
  
  // Calculate total passengers
  if (this.passengers) {
    this.passengers.total = (this.passengers.adults || 0) + 
                           (this.passengers.children || 0) + 
                           (this.passengers.infants || 0);
  }
  
  next();
});

// Methods
BookingSchema.methods.canBeCancelled = function() {
  if (this.status === 'completed' || this.status === 'cancelled') {
    return false;
  }
  
  // Check if within cancellation window
  const scheduledTime = new Date(this.scheduledDateTime);
  const now = new Date();
  const hoursBeforeTrip = (scheduledTime - now) / (1000 * 60 * 60);
  
  // Assuming minimum 2 hours notice required (this should come from service settings)
  return hoursBeforeTrip >= 2;
};

BookingSchema.methods.calculateRefund = function() {
  if (!this.canBeCancelled()) {
    return 0;
  }
  
  const scheduledTime = new Date(this.scheduledDateTime);
  const now = new Date();
  const hoursBeforeTrip = (scheduledTime - now) / (1000 * 60 * 60);
  
  // Refund calculation based on cancellation policy
  if (hoursBeforeTrip >= 24) {
    return this.totalAmount; // Full refund
  } else if (hoursBeforeTrip >= 12) {
    return this.totalAmount * 0.5; // 50% refund
  } else if (hoursBeforeTrip >= 2) {
    return this.totalAmount * 0.25; // 25% refund
  } else {
    return 0; // No refund
  }
};

BookingSchema.methods.isUpcoming = function() {
  return this.scheduledDateTime > new Date() && 
         ['confirmed', 'pending'].includes(this.status);
};

BookingSchema.methods.isPast = function() {
  return this.scheduledDateTime < new Date() || 
         ['completed', 'cancelled'].includes(this.status);
};

// Static methods
BookingSchema.statics.findByDateRange = function(startDate, endDate, additionalFilters = {}) {
  return this.find({
    scheduledDateTime: {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    },
    ...additionalFilters
  });
};

BookingSchema.statics.getVendorBookings = function(vendorId, filters = {}) {
  return this.find({
    vendor: vendorId,
    ...filters
  }).populate('customer', 'name email phoneNumber')
    .populate('service', 'name category')
    .sort({ createdAt: -1 });
};

BookingSchema.statics.getCustomerBookings = function(customerId, filters = {}) {
  return this.find({
    customer: customerId,
    ...filters
  }).populate('service', 'name category location')
    .populate('vendor', 'name businessProfile.businessName')
    .sort({ createdAt: -1 });
};

module.exports = mongoose.model('Booking', BookingSchema);