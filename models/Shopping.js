// =====================================

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
      reason: { type: String }
    }
  ],
  paymentOptions: [
    { type: String, enum: ['Cash', 'Credit Card', 'Mobile Payment', 'Cryptocurrency'] }
  ],
  deliveryAvailable: { type: Boolean, default: false }
  // Removed host field - vendor is inherited from Service base model
});

module.exports = Service.discriminator('Shopping', ShoppingSchema);