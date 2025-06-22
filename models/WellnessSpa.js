const mongoose = require('mongoose');
const Service = require('./Service');

const WellnessSpaSchema = new mongoose.Schema({
  spaType: { 
    type: String, 
    enum: ['Resort Spa', 'Day Spa', 'Medical Spa', 'Holistic Spa', 'Wellness Retreat'], 
    required: true 
  },
  servicesOffered: [
    {
      name: { type: String, required: true },
      description: { type: String },
      duration: { type: Number, required: true }, // Duration in minutes
      price: { type: Number, required: true },
      discountedPrice: { type: Number },
      category: { type: String, enum: ['Massage', 'Facial', 'Body Treatment', 'Wellness Therapy', 'Other'] },
      // Replace availableSlots with weekly schedule
      weeklyAvailability: [
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
              maxBookings: { type: Number, default: 1 } // Optional: number of simultaneous bookings allowed
            }
          ],
          isAvailable: { type: Boolean, default: true } // To easily disable a day
        }
      ],
      // For specific date exceptions (holidays, special events, etc.)
      dateExceptions: [
        {
          date: { type: Date, required: true },
          isAvailable: { type: Boolean, default: false },
          timeSlots: [
            {
              startTime: { type: String },
              endTime: { type: String },
              maxBookings: { type: Number, default: 1 }
            }
          ],
          reason: { type: String } // e.g., "Holiday", "Special Event", etc.
        }
      ],
      images: [
        {
          url: { type: String, required: true },
          isMain: { type: Boolean, default: false }
        }
      ]
    }
  ],
  ageRestrictions: {
    minAge: { type: Number, default: 0 }, 
    maxAge: { type: Number }
  },
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
  wellnessPrograms: [
    {
      title: { type: String, required: true },
      description: { type: String },
      durationDays: { type: Number, required: true },
      price: { type: Number, required: true }
    }
  ],
  cancellationPolicy: { type: String },
  paymentOptions: [
    { type: String, enum: ['Cash', 'Credit Card', 'Mobile Payment', 'Cryptocurrency'] }
  ],
  host: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = Service.discriminator('WellnessSpa', WellnessSpaSchema);