// Stay.js
const mongoose = require('mongoose');
const Service = require('./Service');

const StaySchema = new mongoose.Schema({
  type: { type: String, enum: ['Villa', 'Airbnb'], required: true },
  propertyType: { 
    type: String, 
    enum: ['House', 'Apartment', 'Guesthouse', 'Villa', 'Condo', 'Townhouse'],
    required: function() { return this.type === 'Airbnb'; } 
  },
  pricePerNight: { type: Number, required: true },
  cleaningFee: { 
    type: Number, 
    default: 0,
    min: 0
  },
  maxGuests: { type: Number, required: true },
  bedrooms: { type: Number, required: true },
  bathrooms: { type: Number, required: true },
  beds: { type: Number, required: true },
  
  unavailableDates: [{
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true }
  }],
  
  amenities: {
    hotTub: { type: Boolean, default: false },
    ac: { type: Boolean, default: false },
    pool: { type: Boolean, default: false },
    wifi: { type: Boolean, default: false },
    freeParking: { type: Boolean, default: false },
    beachfront: { type: Boolean, default: false },
    kitchen: { type: Boolean, default: false },
    washer: { type: Boolean, default: false },
    dryer: { type: Boolean, default: false },
    heating: { type: Boolean, default: false },
    dedicatedWorkspace: { type: Boolean, default: false },
    tv: { type: Boolean, default: false },
    hairDryer: { type: Boolean, default: false },
    iron: { type: Boolean, default: false },
    evCharger: { type: Boolean, default: false },
    crib: { type: Boolean, default: false },
    kingBed: { type: Boolean, default: false },
    gym: { type: Boolean, default: false },
    bbqGrill: { type: Boolean, default: false },
    breakfast: { type: Boolean, default: false },
    indoorFireplace: { type: Boolean, default: false },
    smokingAllowed: { type: Boolean, default: false },
    smokeAlarm: { type: Boolean, default: false },
    carbonMonoxideAlarm: { type: Boolean, default: false },
    oceanView: { type: Boolean, default: false },
    balcony: { type: Boolean, default: false },
    linens: { type: Boolean, default: false },
    highChair: { type: Boolean, default: false },
    childSafe: { type: Boolean, default: false },
    concierge: { type: Boolean, default: false },
    housekeeping: { type: Boolean, default: false },
    firstAidKit: { type: Boolean, default: false },
    securitySystem: { type: Boolean, default: false }
  },
  
  bookingOptions: {
    instantBook: { type: Boolean, default: false },
    selfCheckIn: { type: Boolean, default: false },
    allowPets: { type: Boolean, default: false }
  },
  
  tags: {
    isLuxe: { type: Boolean, default: false },
    isGuestFavorite: { type: Boolean, default: false }
  },
  
  policies: {
    checkInTime: { type: String, default: '15:00' },
    checkOutTime: { type: String, default: '10:00' },
    cancellationPolicy: { type: String, enum: ['Flexible', 'Moderate', 'Strict', 'Non-refundable'], default: 'Moderate' }
  },
  
  stayImages: [{ type: String }],
  stayDescription: { type: String },
  addressDetails: {
    address: { type: String },
    city: { type: String },
    state: { type: String },
    country: { type: String, default: 'Turks and Caicos' },
    zipCode: { type: String },
    coordinates: {
      latitude: { type: Number },
      longitude: { type: Number }
    }
  },
  
  discounts: {
    weekly: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    monthly: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    specials: [{
      title: { type: String },
      startDate: { type: Date, required: true },
      endDate: { type: Date, required: true },
      percentage: {
        type: Number,
        min: 0,
        max: 100,
        required: true
      }
    }]
  }
  // Removed host field - vendor is inherited from Service base model
});

module.exports = Service.discriminator('Stay', StaySchema);