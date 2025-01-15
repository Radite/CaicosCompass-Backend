const mongoose = require('mongoose');

const ActivitySchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number }, // Base price for standalone activities
    discountedPrice: { type: Number },
    pricingType: { 
      type: String, 
      enum: ['per hour', 'per person', 'per trip', 'per day', 'varies'], 
      default: 'per person' 
    },

    // Suboptions for the activity
    options: [
      {
        title: { type: String, required: true }, // Title of the suboption
        cost: { type: Number, required: true }, // Price for the suboption
        description: { type: String }, // Description of the suboption
        location: { type: String }, // Location specific to the suboption
        availability: [
          {
            date: { type: Date, required: true }, // Specific date
            times: [{ type: String, required: true }], // E.g., '8:00 AM', '2:00 PM'
            isAvailable: { type: Boolean, default: true }, // Availability for that date
          },
        ],
        images: [
          {
            url: { type: String, required: true },
            isMain: { type: Boolean, default: false },
          },
        ],
      },
    ],

    // Availability for standalone activities
    availability: [
      {
        date: { type: Date },
        times: [{ type: String }], // E.g., '8:00 AM', '10:00 AM'
        isAvailable: { type: Boolean, default: true },
      },
    ],

    // Location information
    location: { type: String, required: true },
    coordinates: {
      latitude: { type: Number },
      longitude: { type: Number },
    },

    // Images for the activity
    images: [
      {
        url: { type: String, required: true },
        isMain: { type: Boolean, default: false },
      },
    ],

    // Tags and categories
    category: { type: String, enum: ['Excursion', 'Nature Trails', 'Museums', 'Water Sports', 'Shopping', 'Cultural Site'], required: true },
    tags: [{ type: String }], // E.g., ["family-friendly", "adventurous"]

    // Additional features
    island: { type: String, required: true },
    fees: { type: Object }, // Additional fees
    deals: [
      {
        title: { type: String },
        price: { type: Number },
        expiryDate: { type: Date },
      },
    ],

    // Hosting information
    host: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // Reference to the User model
      required: true,
    },

    // Reviews for the activity
    reviews: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Reviewer
        rating: { type: Number, min: 1, max: 5, required: true },
        comment: { type: String },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

// Middleware to ensure only one image is marked as main
ActivitySchema.pre('save', function (next) {
  const mainImages = this.images.filter((img) => img.isMain);
  if (mainImages.length > 1) {
    return next(new Error('Only one image can be set as the main image.'));
  }
  next();
});

// Virtual field for the main image
ActivitySchema.virtual('mainImage').get(function () {
  const mainImage = this.images.find((img) => img.isMain);
  return mainImage ? mainImage.url : null;
});

module.exports = mongoose.model('Activity', ActivitySchema);
