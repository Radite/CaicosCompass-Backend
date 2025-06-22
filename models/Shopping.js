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
      category: { type: String, required: true }, // e.g., Clothing, Jewelry, Art, Souvenirs
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
      openTime: { type: String, required: true }, // Example: '09:00 AM'
      closeTime: { type: String, required: true } // Example: '09:00 PM'
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
  deliveryAvailable: { type: Boolean, default: false },
  host: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = Service.discriminator('Shopping', ShoppingSchema);
