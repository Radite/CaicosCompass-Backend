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
      maxPeople: { type: Number, required: true }, // Max people per option
      duration: { type: Number, required: true }, // Custom duration per option (in minutes/hours)
      availability: [
        {
          day: { 
            type: String, 
            enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], 
            required: true 
          },
          timeSlots: [
            {
              startTime: { type: String, required: true },  // Example: '09:00 AM'
              endTime: { type: String, required: true },    // Example: '10:00 AM'
              maxPeople: { type: Number, required: true }   // Max people per slot
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
      url: { type: String } // Link to waiver document
    }
  ],
  cancellationPolicy: { type: String },
  host: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Reference to the user model
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = Service.discriminator('Activity', ActivitySchema);
