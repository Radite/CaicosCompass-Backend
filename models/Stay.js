// Stay.js
const mongoose = require('mongoose');
const Service = require('./Service');

const StaySchema = new mongoose.Schema({
  type: { type: String, enum: ['Villa', 'Airbnb'], required: true },
  propertyType: { 
    type: String, 
    enum: ['House', 'Apartment', 'Guesthouse'],
    required: function() { return this.type === 'Airbnb'; } 
  },
  pricePerNight: { type: Number, required: true },
  maxGuests: { type: Number, required: true },
  bedrooms: { type: Number, required: true },
  bathrooms: { type: Number, required: true },
  beds: { type: Number, required: true },
  
  // Unavailability dates
  unavailableDates: [{
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true }
  }],
  
  // Amenities
  amenities: {
    // Basic amenities (boolean flags)
    hotTub: { type: Boolean, default: false },
    ac: { type: Boolean, default: false },
    pool: { type: Boolean, default: false },
    wifi: { type: Boolean, default: false },
    freeParking: { type: Boolean, default: false },
    beachfront: { type: Boolean, default: false },
    
    // Essentials
    kitchen: { type: Boolean, default: false },
    washer: { type: Boolean, default: false },
    dryer: { type: Boolean, default: false },
    heating: { type: Boolean, default: false },
    dedicatedWorkspace: { type: Boolean, default: false },
    tv: { type: Boolean, default: false },
    hairDryer: { type: Boolean, default: false },
    iron: { type: Boolean, default: false },
    
    // Features
    evCharger: { type: Boolean, default: false },
    crib: { type: Boolean, default: false },
    kingBed: { type: Boolean, default: false },
    gym: { type: Boolean, default: false },
    bbqGrill: { type: Boolean, default: false },
    breakfast: { type: Boolean, default: false },
    indoorFireplace: { type: Boolean, default: false },
    smokingAllowed: { type: Boolean, default: false },
    
    // Safety features
    smokeAlarm: { type: Boolean, default: false },
    carbonMonoxideAlarm: { type: Boolean, default: false }
  },
  
  // Booking options
  bookingOptions: {
    instantBook: { type: Boolean, default: false },
    selfCheckIn: { type: Boolean, default: false },
    allowPets: { type: Boolean, default: false }
  },
  
  // Tags
  tags: {
    isLuxe: { type: Boolean, default: false },
    isGuestFavorite: { type: Boolean, default: false }
  },
  
  // Policies
  policies: {
    checkInTime: { type: String, default: '15:00' }, // Default 3pm
    checkOutTime: { type: String, default: '10:00' }, // Default 10am
    cancellationPolicy: { type: String, enum: ['Flexible', 'Moderate', 'Strict', 'Non-refundable'], default: 'Moderate' }
  },
  
  // Changed to stayImages to avoid conflict with parent model
  stayImages: [{ type: String }],
  // Changed to stayDescription to avoid potential conflict
  stayDescription: { type: String },
  // Changed to addressDetails to avoid conflict with parent model
  addressDetails: {
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String },
    country: { type: String, required: true },
    zipCode: { type: String },
    coordinates: {
      latitude: { type: Number },
      longitude: { type: Number }
    }
  }
});

// Create the discriminator and export the resulting model
const Stay = Service.discriminator('Stay', StaySchema);
module.exports = Stay;