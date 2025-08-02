// Shopping.js
const mongoose = require('mongoose');
const Service = require('./Service');

const ShoppingSchema = new mongoose.Schema({
  storeType: { 
    type: String, 
    enum: ['Boutique', 'Market', 'Luxury Store', 'Souvenir Shop', 'Specialty Store'], 
    required: true 
  },
  priceRange: { 
    type: String, 
    enum: ['$', '$$', '$$$', '$$$$'], 
    required: true 
  },
  products: [
    {
      name: { type: String, required: true },
      description: { type: String },
      price: { type: Number, required: true },
      discountedPrice: { type: Number },
      category: { type: String, required: true },
      quantity: { type: Number, default: 0 }, // Number of items in stock
      images: [
        {
          url: { type: String, required: true },
          isMain: { type: Boolean, default: false }
        }
      ],
      availability: { 
        type: String, 
        enum: ['In Stock', 'Limited', 'Out of Stock'], 
        default: 'In Stock' 
      }
    }
  ],
  openingHours: [
    {
      day: { 
        type: String, 
        enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], 
        required: true 
      },
      openTime: { type: String, required: true },
      closeTime: { type: String, required: true }
    }
  ],
  customClosures: [
    {
      date: { type: Date, required: true },
      reason: { type: String },
      isRecurring: { type: Boolean, default: false } // NEW: Whether this closure repeats yearly
    }
  ],
  paymentOptions: [
    { type: String, enum: ['Cash', 'Credit Card', 'Mobile Payment', 'Cryptocurrency'] }
  ],
  deliveryAvailable: { type: Boolean, default: false }
  // Removed host field - vendor is inherited from Service base model
});

// Add a method to check if store is closed on a specific date
ShoppingSchema.methods.isClosedOnDate = function(date) {
  const checkDate = new Date(date);
  const currentYear = checkDate.getFullYear();
  
  return this.customClosures.some(closure => {
    const closureDate = new Date(closure.date);
    
    if (closure.isRecurring) {
      // For recurring closures, check if month and day match (ignore year)
      return closureDate.getMonth() === checkDate.getMonth() && 
             closureDate.getDate() === checkDate.getDate();
    } else {
      // For non-recurring closures, check exact date match
      return closureDate.getFullYear() === currentYear &&
             closureDate.getMonth() === checkDate.getMonth() &&
             closureDate.getDate() === checkDate.getDate();
    }
  });
};

// Add a method to get upcoming closures
ShoppingSchema.methods.getUpcomingClosures = function(daysAhead = 30) {
  const today = new Date();
  const futureDate = new Date(today.getTime() + (daysAhead * 24 * 60 * 60 * 1000));
  const upcomingClosures = [];
  
  // Check each day in the range
  for (let d = new Date(today); d <= futureDate; d.setDate(d.getDate() + 1)) {
    if (this.isClosedOnDate(d)) {
      const matchingClosure = this.customClosures.find(closure => {
        const closureDate = new Date(closure.date);
        if (closure.isRecurring) {
          return closureDate.getMonth() === d.getMonth() && 
                 closureDate.getDate() === d.getDate();
        } else {
          return closureDate.getFullYear() === d.getFullYear() &&
                 closureDate.getMonth() === d.getMonth() &&
                 closureDate.getDate() === d.getDate();
        }
      });
      
      if (matchingClosure) {
        upcomingClosures.push({
          date: new Date(d),
          reason: matchingClosure.reason,
          isRecurring: matchingClosure.isRecurring
        });
      }
    }
  }
  
  return upcomingClosures;
};

module.exports = Service.discriminator('Shopping', ShoppingSchema);