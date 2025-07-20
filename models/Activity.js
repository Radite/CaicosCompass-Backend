
// =====================================

// Activity.js
const mongoose = require('mongoose');
const Service = require('./Service');

const ActivitySchema = new mongoose.Schema({
  price: { type: Number, required: true },
  discountedPrice: { type: Number },
  pricingType: { 
    type: String, 
    enum: ['per hour', 'per person', 'per trip', 'per day', 'varies'], 
    default: 'per person' 
  },
  options: [
    {
      title: { type: String, required: true },
      cost: { type: Number, required: true },
      pricingType: { 
        type: String, 
        enum: ['per hour', 'per person', 'per trip', 'per day', 'varies'], 
        default: 'per person' 
      },
      description: { type: String },
      location: { type: String },
      maxPeople: { type: Number, required: true },
      duration: { type: Number, required: true },
      availability: [
        {
          day: { 
            type: String, 
            enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], 
            required: true 
          },
          timeSlots: [
            {
              startTime: { type: String, required: true },
              endTime: { type: String, required: true },
              maxPeople: { type: Number, required: true }
            }
          ]
        }
      ],
      unavailableTimeSlots: [
        {
          date: { type: Date, required: true }, 
          startTime: { type: String, required: true }, 
          endTime: { type: String, required: true }
        }
      ],
      customUnavailableDates: [
        {
          date: { type: Date, required: true },
          reason: { type: String }
        }
      ],
      equipmentRequirements: [
        {
          equipmentName: { type: String, required: true },
          provided: { type: Boolean, default: false }
        }
      ],
      images: [
        {
          url: { type: String, required: true },
          isMain: { type: Boolean, default: false }
        }
      ]
    },
  ],
  category: { 
    type: String, 
    enum: ['Excursion', 'Nature Trails', 'Museums', 'Water Sports', 'Shopping', 'Cultural Site'], 
    required: true 
  },
  ageRestrictions: {
    minAge: { type: Number, default: 0 }, 
    maxAge: { type: Number }
  },
  waivers: [
    {
      title: { type: String, required: true },
      description: { type: String },
      url: { type: String }
    }
  ],
  cancellationPolicy: { type: String }
  // Removed host field - vendor is inherited from Service base model
});

module.exports = Service.discriminator('Activity', ActivitySchema);