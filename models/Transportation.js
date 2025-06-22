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
    enum: ['flat', 'per-mile', 'per-hour', 'per-day', 'age-based', 'per-flight','per-trip'],
    required: true,
  },

  basePrice: { type: Number, required: true },  
  flatPrice: { type: Number },  
  perMilePrice: { type: Number },  
  perHourPrice: { type: Number },  
  perDayPrice: { type: Number },  
  longTermDiscounts: [
    {
      duration: { type: String, enum: ['weekly', 'monthly'] },
      discountPercentage: { type: Number },
    },
  ],
  
  ageBasedPricing: [
    {
      minAge: { type: Number },
      maxAge: { type: Number },
      price: { type: Number },
    },
  ],

  capacity: { type: Number },  

  amenities: [{ type: String }],  

  specialConditions: {
    noSmoking: { type: Boolean, default: false },
    petFriendly: { type: Boolean, default: true },
    minAgeRequirement: { type: Number },
    validLicenseRequired: { type: Boolean, default: false },
    securityDepositRequired: { type: Boolean, default: false },
  },

  availability: [
    {
      date: { type: Date, required: true },
      startTime: { type: String, required: true },  
      endTime: { type: String, required: true },    
      isAvailable: { type: Boolean, default: true },
    },
  ],

  rentalDetails: {
    make: { type: String },  
    model: { type: String },
    year: { type: Number },
    fuelType: { type: String, enum: ['Petrol', 'Diesel', 'Electric', 'Hybrid'] },
    transmission: { type: String, enum: ['Automatic', 'Manual'] },
    dailyMileageLimit: { type: Number },  
    excessMileageCharge: { type: Number },  
    insuranceIncluded: { type: Boolean, default: false },
    insuranceOptions: [
      {
        type: { type: String, enum: ['Basic', 'Comprehensive', 'Premium'] },
        price: { type: Number },
      },
    ],
  },

  driverDetails: {
    name: { type: String },
    licenseNumber: { type: String },
    experience: { type: Number }, 
    rating: { type: Number, min: 1, max: 5 },
    vehicleAssigned: { type: String },
  },

  ferryDetails: {
    departureLocation: { type: String },
    arrivalLocation: { type: String },
    duration: { type: String },  
    baggageLimits: [
      {
        weightLimit: { type: Number },  
        dimensionLimit: { type: String },  
      },
    ],
    schedule: [
      {
        day: { type: String, enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] },
        departureTime: { type: String },
        arrivalTime: { type: String },
      },
    ],
  },

  paymentOptions: {
    acceptedMethods: {
      type: [String],
      enum: ['Cash', 'Credit Card', 'Debit Card', 'Online Payment'],
      default: ['Cash', 'Credit Card'],
    },
  },

  options: [
    {
      title: { type: String, required: true },
      description: { type: String },
      price: { type: Number },
      capacity: { type: Number },
    },
  ],

  locationsServed: [
    {
      locationName: { type: String },
      coordinates: {
        latitude: { type: Number },
        longitude: { type: Number },
      },
    },
  ],

  cancellationPolicy: {
    refundable: { type: Boolean, default: true },
    cancellationFee: { type: Number },  
    advanceNoticeRequired: { type: String },  
  },

  contactDetails: {
    phone: { type: String, required: true },
    email: { type: String },
    website: { type: String },
  },

  promotions: [
    {
      description: { type: String },
      discountPercentage: { type: Number },
      validUntil: { type: Date },
    },
  ],
},
{ discriminatorKey: 'serviceType', timestamps: true });

module.exports = Service.discriminator('Transportation', TransportationSchema);
