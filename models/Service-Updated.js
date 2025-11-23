// models/Service.js (Updated with Review Integration)
const mongoose = require('mongoose');

const BaseServiceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    location: { type: String, required: true },
    coordinates: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
    },
    images: [
      {
        url: { type: String, required: true },
        isMain: { type: Boolean, default: false },
      },
    ],
    island: { type: String, required: true },

    // Vendor reference
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      validate: {
        validator: async function(vendorId) {
          const user = await mongoose.model('User').findById(vendorId);
          return user && user.role === 'business-manager' && user.businessProfile?.isApproved;
        },
        message: 'Vendor must be an approved business manager'
      }
    },

    // Review aggregation fields (automatically updated)
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },

    totalReviews: {
      type: Number,
      default: 0,
      min: 0
    },

    // Legacy reviews array (DEPRECATED - kept for backward compatibility)
    // New reviews should use the Review model
    reviews: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        rating: { type: Number, min: 1, max: 5, required: true },
        comment: { type: String },
        createdAt: { type: Date, default: Date.now },
      },
    ],

    status: {
      type: String,
      enum: ['active', 'inactive', 'pending'],
      default: 'active',
      required: true
    },
  },
  { 
    discriminatorKey: 'serviceType', 
    timestamps: true 
  }
);

// Index for efficient review queries
BaseServiceSchema.index({ averageRating: -1, totalReviews: -1 });
BaseServiceSchema.index({ vendor: 1, status: 1 });

// Virtual to get reviews from Review model
BaseServiceSchema.virtual('reviewDetails', {
  ref: 'Review',
  localField: '_id',
  foreignField: 'service',
  match: { status: 'active' }
});

// Method to update review statistics
BaseServiceSchema.methods.updateReviewStats = async function() {
  const Review = mongoose.model('Review');
  const stats = await Review.getAverageRating(this._id);
  
  this.averageRating = stats.averageRating;
  this.totalReviews = stats.totalReviews;
  
  await this.save();
  return stats;
};

const Service = mongoose.model('Service', BaseServiceSchema);
module.exports = Service;
