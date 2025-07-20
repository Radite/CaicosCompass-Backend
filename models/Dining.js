

// =====================================

// Dining.js
const mongoose = require('mongoose');
const Service = require('./Service');

const SideDishSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true }
});

const MenuItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  category: { type: String, enum: ['Appetizers', 'Main Courses', 'Desserts', 'Drinks'], required: true },
  price: { type: Number, required: true },
  image: { type: String },
  sides: [SideDishSchema],
});

const OperatingHoursSchema = new mongoose.Schema({
  day: {
    type: String,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    required: true
  },
  openTime: { type: String, required: true },
  closeTime: { type: String, required: true }
});

const DiningSchema = new mongoose.Schema({
  cuisineTypes: [{
    type: String,
    enum: [
      'Caribbean', 'American', 'Seafood', 'Italian',
      'Mediterranean', 'Indian', 'Vegan', 'Mexican',
      'Japanese', 'Chinese', 'French', 'BBQ'
    ],
    required: true
  }],
  priceRange: { type: String, enum: ['$', '$$', '$$$', '$$$$'], default: '$$' },
  menuItems: [MenuItemSchema],
  operatingHours: [OperatingHoursSchema]
  // Removed host field - vendor is inherited from Service base model
});

module.exports = Service.discriminator('Dining', DiningSchema);