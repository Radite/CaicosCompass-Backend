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
  image: { type: String }, // URL to an image of the dish
  sides: [SideDishSchema], // Optional sides that can be added to the item
});

const OperatingHoursSchema = new mongoose.Schema({
  day: {
    type: String,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    required: true
  },
  openTime: { type: String, required: true }, // Example: '08:00 AM'
  closeTime: { type: String, required: true } // Example: '10:00 PM'
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
  menuItems: [MenuItemSchema], // Array of menu items instead of just a menu URL
  operatingHours: [OperatingHoursSchema]
});

module.exports = Service.discriminator('Dining', DiningSchema);
