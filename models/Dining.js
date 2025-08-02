// Dining.js
const mongoose = require('mongoose');
const Service = require('./Service');

const SideDishSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true }
});

const ImageSchema = new mongoose.Schema({
  url: { type: String, required: true },
  isMain: { type: Boolean, default: false }
});

const MenuItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  category: { 
    type: String, 
    enum: ['Appetizers', 'Main Courses', 'Desserts', 'Drinks', 'Sides'], 
    required: true 
  },
  price: { type: Number, required: true },
  images: [ImageSchema], // Changed from single image to images array
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

const CustomClosureSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  reason: { type: String },
  isRecurring: { type: Boolean, default: false }
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
  operatingHours: [OperatingHoursSchema],
  customClosures: [CustomClosureSchema],
  menuPdf: { type: String } // Optional PDF menu file path
});

module.exports = Service.discriminator('Dining', DiningSchema);