// Enhanced Transportation Model with comprehensive vendor features
const mongoose = require('mongoose');
const Service = require('./Service');

const TransportationSchema = new mongoose.Schema({
  category: {
    type: String,
    enum: [
      'Car Rental', 
      'Jeep & 4x4 Rental', 
      'Scooter & Moped Rental', 
      'Taxi', 
      'Airport Transfer', 
      'Private VIP Transport', 
      'Ferry', 
      'Flight'
    ],
    required: true,
  },

  pricingModel: {
    type: String,
    enum: ['flat', 'per-mile', 'per-hour', 'per-day', 'age-based', 'per-flight', 'per-trip', 'distance-based'],
    required: true,
  },

  basePrice: { type: Number, required: true },  
  flatPrice: { type: Number },  
  perMilePrice: { type: Number },  
  perHourPrice: { type: Number },  
  perDayPrice: { type: Number },
  distanceBasedRates: [{
    minDistance: { type: Number }, // in miles/km
    maxDistance: { type: Number },
    pricePerUnit: { type: Number },
    flatRate: { type: Number }
  }],
  
  longTermDiscounts: [{
    duration: { type: String, enum: ['weekly', 'monthly', 'seasonal'] },
    discountPercentage: { type: Number },
    minimumDays: { type: Number }
  }],
  
  ageBasedPricing: [{
    minAge: { type: Number },
    maxAge: { type: Number },
    price: { type: Number },
    restrictions: [{ type: String }] // Additional restrictions for age groups
  }],

  // Enhanced vehicle/service fleet management
  fleet: [{
    vehicleId: { type: String, unique: true },
    make: { type: String, required: true },
    model: { type: String, required: true },
    year: { type: Number, required: true },
    category: { type: String, required: true },
    capacity: { type: Number, required: true },
    licensePlate: { type: String },
    color: { type: String },
    fuelType: { type: String, enum: ['Petrol', 'Diesel', 'Electric', 'Hybrid'] },
    transmission: { type: String, enum: ['Automatic', 'Manual'] },
    dailyMileageLimit: { type: Number },
    excessMileageCharge: { type: Number },
    currentMileage: { type: Number, default: 0 },
    lastServiceDate: { type: Date },
    nextServiceDue: { type: Date },
    insuranceExpiry: { type: Date },
    registrationExpiry: { type: Date },
    status: { 
      type: String, 
      enum: ['available', 'rented', 'maintenance', 'out-of-service'], 
      default: 'available' 
    },
    amenities: [{ type: String }],
    images: [{
      url: { type: String },
      isMain: { type: Boolean, default: false }
    }],
    priceOverride: { type: Number }, // Override base pricing for specific vehicles
    specialConditions: {
      noSmoking: { type: Boolean, default: false },
      petFriendly: { type: Boolean, default: true },
      minAgeRequirement: { type: Number },
      validLicenseRequired: { type: Boolean, default: true },
      securityDepositRequired: { type: Boolean, default: false },
      securityDepositAmount: { type: Number }
    }
  }],

  // Driver management for taxi/transfer services
  drivers: [{
    driverId: { type: String, unique: true },
    name: { type: String, required: true },
    licenseNumber: { type: String, required: true },
    licenseExpiry: { type: Date, required: true },
    phoneNumber: { type: String, required: true },
    email: { type: String },
    experience: { type: Number }, // in years
    rating: { type: Number, min: 1, max: 5 },
    languages: [{ type: String }],
    specializations: [{ type: String }], // e.g., 'airport-transfer', 'city-tours', 'luxury-service'
    vehicleAssigned: { type: String }, // Reference to vehicleId
    availability: [{
      day: { type: String, enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] },
      startTime: { type: String },
      endTime: { type: String },
      isAvailable: { type: Boolean, default: true }
    }],
    status: { 
      type: String, 
      enum: ['active', 'inactive', 'on-duty', 'off-duty'], 
      default: 'active' 
    },
    certifications: [{ type: String }],
    emergencyContact: {
      name: { type: String },
      phone: { type: String },
      relationship: { type: String }
    }
  }],

  // Enhanced booking and availability management
  availability: [{
    date: { type: Date, required: true },
    startTime: { type: String },
    endTime: { type: String },
    isAvailable: { type: Boolean, default: true },
    vehicleId: { type: String }, // Specific vehicle availability
    driverId: { type: String }, // Specific driver availability
    maxBookings: { type: Number, default: 1 }, // For multiple bookings per time slot
    currentBookings: { type: Number, default: 0 },
    specialPricing: { type: Number }, // Override pricing for specific dates/times
    notes: { type: String }
  }],

  // Blocked dates and maintenance schedules
  blockedDates: [{
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    reason: { 
      type: String, 
      enum: ['maintenance', 'personal', 'holiday', 'repair', 'inspection', 'other'],
      default: 'other'
    },
    affectedVehicles: [{ type: String }], // Specific vehicles blocked
    affectedDrivers: [{ type: String }], // Specific drivers unavailable
    description: { type: String }
  }],

  // Preset locations and routes
  presetLocations: [{
    name: { type: String, required: true },
    address: { type: String, required: true },
    coordinates: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true }
    },
    type: { 
      type: String, 
      enum: ['pickup', 'dropoff', 'both'], 
      default: 'both' 
    },
    isPopular: { type: Boolean, default: false },
    additionalInfo: { type: String },
    priceModifier: { type: Number, default: 0 } // Additional cost for this location
  }],

  // Preset routes for transfers
  presetRoutes: [{
    name: { type: String, required: true },
    startLocation: {
      name: { type: String, required: true },
      coordinates: {
        latitude: { type: Number, required: true },
        longitude: { type: Number, required: true }
      }
    },
    endLocation: {
      name: { type: String, required: true },
      coordinates: {
        latitude: { type: Number, required: true },
        longitude: { type: Number, required: true }
      }
    },
    distance: { type: Number, required: true }, // in miles/km
    estimatedDuration: { type: Number, required: true }, // in minutes
    basePrice: { type: Number, required: true },
    description: { type: String },
    waypoints: [{
      name: { type: String },
      coordinates: {
        latitude: { type: Number },
        longitude: { type: Number }
      },
      isOptional: { type: Boolean, default: false },
      additionalCost: { type: Number, default: 0 }
    }],
    isActive: { type: Boolean, default: true }
  }],

  // Dynamic pricing based on distance/location
  distancePricing: {
    enabled: { type: Boolean, default: false },
    baseRate: { type: Number }, // Base rate for first X miles
    baseMileage: { type: Number, default: 5 }, // Free miles included
    perMileRate: { type: Number }, // Rate per additional mile
    minimumFare: { type: Number },
    maximumFare: { type: Number },
    surgeMultiplier: { type: Number, default: 1 }, // For peak times
    nightSurcharge: { type: Number, default: 0 }, // Additional cost for night rides
    weekendSurcharge: { type: Number, default: 0 }
  },

  // Enhanced rental-specific features
  rentalDetails: {
    insuranceIncluded: { type: Boolean, default: false },
    insuranceOptions: [{
      type: { type: String, enum: ['Basic', 'Comprehensive', 'Premium'] },
      price: { type: Number },
      coverage: { type: String },
      deductible: { type: Number }
    }],
    additionalServices: [{
      name: { type: String }, // e.g., 'GPS', 'Child Seat', 'Additional Driver'
      price: { type: Number },
      perDay: { type: Boolean, default: false },
      description: { type: String }
    }],
    pickupDelivery: {
      available: { type: Boolean, default: false },
      cost: { type: Number },
      freeWithinRadius: { type: Number }, // miles
      availableLocations: [{ type: String }]
    },
    fuelPolicy: { 
      type: String, 
      enum: ['full-to-full', 'full-to-empty', 'same-level'],
      default: 'full-to-full'
    },
    lateFees: {
      enabled: { type: Boolean, default: true },
      gracePeriodhours: { type: Number, default: 1 },
      hourlyRate: { type: Number },
      dailyRate: { type: Number }
    }
  },

  // Enhanced payment and booking options
  paymentOptions: {
    acceptedMethods: [{
      type: String,
      enum: ['Cash', 'Credit Card', 'Debit Card', 'Online Payment', 'Bank Transfer', 'Mobile Payment'],
      default: ['Cash', 'Credit Card']
    }],
    requiresDeposit: { type: Boolean, default: false },
    depositAmount: { type: Number },
    depositRefundable: { type: Boolean, default: true },
    advancePaymentRequired: { type: Boolean, default: false },
    advancePaymentPercentage: { type: Number, default: 0 },
    acceptsInstallments: { type: Boolean, default: false },
    installmentOptions: [{
      duration: { type: String }, // e.g., '3-months', '6-months'
      interestRate: { type: Number, default: 0 }
    }]
  },

  // Service areas and zones
  serviceAreas: [{
    name: { type: String, required: true },
    type: { type: String, enum: ['city', 'district', 'region', 'custom'] },
    coordinates: [{
      latitude: { type: Number },
      longitude: { type: Number }
    }], // Polygon coordinates for custom areas
    isActive: { type: Boolean, default: true },
    additionalCharge: { type: Number, default: 0 },
    description: { type: String }
  }],

  // Enhanced cancellation and refund policy
  cancellationPolicy: {
    refundable: { type: Boolean, default: true },
    cancellationRules: [{
      timeBeforeService: { type: Number }, // hours before service
      refundPercentage: { type: Number }, // percentage of refund
      cancellationFee: { type: Number } // fixed fee
    }],
    noShowPolicy: {
      waitTime: { type: Number, default: 15 }, // minutes to wait
      noShowFee: { type: Number },
      refundPercentage: { type: Number, default: 0 }
    },
    weatherCancellation: {
      allowed: { type: Boolean, default: true },
      conditions: [{ type: String }], // e.g., 'heavy-rain', 'hurricane'
      refundPercentage: { type: Number, default: 100 }
    }
  },

  // Contact and support information
  contactDetails: {
    phone: { type: String, required: true },
    emergencyPhone: { type: String },
    whatsapp: { type: String },
    email: { type: String },
    website: { type: String },
    operatingHours: [{
      day: { type: String, enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] },
      startTime: { type: String },
      endTime: { type: String },
      is24Hours: { type: Boolean, default: false }
    }],
    languages: [{ type: String }],
    responseTime: { type: String } // e.g., 'within 15 minutes'
  },

  // Promotions and discounts
  promotions: [{
    title: { type: String, required: true },
    description: { type: String },
    type: { 
      type: String, 
      enum: ['percentage', 'fixed-amount', 'buy-x-get-y', 'loyalty'],
      required: true 
    },
    value: { type: Number, required: true }, // percentage or fixed amount
    minimumSpend: { type: Number },
    maximumDiscount: { type: Number },
    validFrom: { type: Date, required: true },
    validUntil: { type: Date, required: true },
    applicableCategories: [{ type: String }],
    applicableVehicles: [{ type: String }],
    usageLimit: { type: Number }, // per customer
    totalUsageLimit: { type: Number },
    currentUsage: { type: Number, default: 0 },
    promoCode: { type: String, unique: true },
    isActive: { type: Boolean, default: true },
    conditions: [{ type: String }] // Additional terms and conditions
  }],

  // Loyalty program
  loyaltyProgram: {
    enabled: { type: Boolean, default: false },
    pointsPerDollar: { type: Number, default: 1 },
    redemptionRate: { type: Number, default: 100 }, // points needed for $1 discount
    bonusPointsThreshold: { type: Number }, // spending amount for bonus points
    bonusPoints: { type: Number },
    memberBenefits: [{ type: String }]
  },

  // Performance metrics and analytics
  performanceMetrics: {
    totalBookings: { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0 },
    totalReviews: { type: Number, default: 0 },
    repeatCustomers: { type: Number, default: 0 },
    cancellationRate: { type: Number, default: 0 },
    onTimePerformance: { type: Number, default: 100 }, // percentage
    customerSatisfactionScore: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now }
  },

  // Quality and safety certifications
  certifications: [{
    name: { type: String, required: true },
    issuingAuthority: { type: String, required: true },
    certificateNumber: { type: String },
    issueDate: { type: Date, required: true },
    expiryDate: { type: Date },
    documentUrl: { type: String },
    isActive: { type: Boolean, default: true }
  }],

  // Business operation settings
  businessSettings: {
    autoAcceptBookings: { type: Boolean, default: false },
    requireBookingApproval: { type: Boolean, default: true },
    allowSameDayBookings: { type: Boolean, default: true },
    minimumAdvanceBooking: { type: Number, default: 0 }, // hours
    maximumAdvanceBooking: { type: Number, default: 720 }, // hours (30 days)
    allowRecurringBookings: { type: Boolean, default: false },
    sendConfirmationSMS: { type: Boolean, default: true },
    sendReminderSMS: { type: Boolean, default: true },
    reminderTime: { type: Number, default: 60 }, // minutes before service
    trackVehicleLocation: { type: Boolean, default: false },
    shareLocationWithCustomer: { type: Boolean, default: false }
  }
}, { discriminatorKey: 'serviceType', timestamps: true });

// Indexes for performance optimization
TransportationSchema.index({ vendor: 1, category: 1 });
TransportationSchema.index({ 'presetLocations.coordinates': '2dsphere' });
TransportationSchema.index({ 'availability.date': 1 });
TransportationSchema.index({ 'fleet.status': 1 });
TransportationSchema.index({ 'drivers.status': 1 });

// Virtual for total fleet count
TransportationSchema.virtual('totalFleetCount').get(function() {
  return this.fleet.length;
});

// Virtual for available fleet count
TransportationSchema.virtual('availableFleetCount').get(function() {
  return this.fleet.filter(vehicle => vehicle.status === 'available').length;
});

// Method to calculate price based on distance
TransportationSchema.methods.calculateDistancePrice = function(distance) {
  if (!this.distancePricing.enabled) {
    return this.basePrice;
  }

  const { baseRate, baseMileage, perMileRate, minimumFare, maximumFare, surgeMultiplier } = this.distancePricing;
  
  let price = baseRate;
  
  if (distance > baseMileage) {
    price += (distance - baseMileage) * perMileRate;
  }
  
  price *= surgeMultiplier;
  
  if (minimumFare && price < minimumFare) price = minimumFare;
  if (maximumFare && price > maximumFare) price = maximumFare;
  
  return Math.round(price * 100) / 100; // Round to 2 decimal places
};

// Method to check availability for a specific date/time
TransportationSchema.methods.isAvailable = function(date, startTime, endTime, vehicleId = null) {
  const dateStr = new Date(date).toISOString().split('T')[0];
  
  // Check blocked dates
  const isBlocked = this.blockedDates.some(blocked => {
    const blockStart = new Date(blocked.startDate).toISOString().split('T')[0];
    const blockEnd = new Date(blocked.endDate).toISOString().split('T')[0];
    return dateStr >= blockStart && dateStr <= blockEnd;
  });
  
  if (isBlocked) return false;
  
  // Check availability slots
  const availabilitySlot = this.availability.find(slot => 
    new Date(slot.date).toISOString().split('T')[0] === dateStr &&
    (!vehicleId || slot.vehicleId === vehicleId)
  );
  
  return availabilitySlot ? availabilitySlot.isAvailable : true;
};

module.exports = Service.discriminator('Transportation', TransportationSchema);