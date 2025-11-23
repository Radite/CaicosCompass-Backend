// models/Service.js (Base Model - Updated)
const mongoose = require('mongoose');

const BaseServiceSchema = new mongoose.Schema(
  {
    name: { 
      type: String, 
      required: true 
    },
    description: { 
      type: String, 
      required: true 
    },
    location: { 
      type: String, 
      required: true 
    },
    coordinates: {
      latitude: { 
        type: Number, 
        required: true 
      },
      longitude: { 
        type: Number, 
        required: true 
      },
    },
    images: [
      {
        url: { 
          type: String, 
          required: true 
        },
        isMain: { 
          type: Boolean, 
          default: false 
        },
      },
    ],
    island: { 
      type: String, 
      required: true 
    },

    // Vendor reference - changed from host to vendor
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
      validate: {
        validator: async function(vendorId) {
          try {
            const user = await mongoose.model('User').findById(vendorId);
            return user && user.role === 'business-manager' && user.businessProfile?.isApproved;
          } catch (error) {
            return false;
          }
        },
        message: 'Vendor must be an approved business manager'
      }
    },

    // ============================================================
    // ANALYTICS FIELDS - Automatically updated by Review hooks
    // ============================================================
    
    // Average rating across all active reviews
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
      set: function(value) {
        // Round to 1 decimal place
        return Math.round(value * 10) / 10;
      }
    },

    // Total count of active reviews
    totalReviews: {
      type: Number,
      default: 0,
      min: 0
    },

    // Rating distribution breakdown (calculated on demand or cached)
    ratingDistribution: {
      5: { type: Number, default: 0 },
      4: { type: Number, default: 0 },
      3: { type: Number, default: 0 },
      2: { type: Number, default: 0 },
      1: { type: Number, default: 0 }
    },

    // Last time analytics were updated
    analyticsUpdatedAt: {
      type: Date,
      default: Date.now
    },

    // Service status
    status: {
      type: String,
      enum: ['active', 'inactive', 'pending'],
      default: 'active',
      required: true,
      index: true
    },

    // Legacy reviews array - kept for backward compatibility
    // New reviews should use the separate Review model
    reviews: [
      {
        user: { 
          type: mongoose.Schema.Types.ObjectId, 
          ref: 'User' 
        },
        rating: { 
          type: Number, 
          min: 1, 
          max: 5, 
          required: true 
        },
        comment: { 
          type: String 
        },
        createdAt: { 
          type: Date, 
          default: Date.now 
        },
      },
    ]
  },
  { 
    discriminatorKey: 'serviceType', 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// ============================================================
// INDEXES
// ============================================================

// Performance indexes
BaseServiceSchema.index({ vendor: 1, status: 1 });
BaseServiceSchema.index({ island: 1, status: 1 });
BaseServiceSchema.index({ averageRating: -1, totalReviews: -1 }); // For sorting by rating
BaseServiceSchema.index({ createdAt: -1 }); // For sorting by newest
BaseServiceSchema.index({ status: 1, averageRating: -1 }); // For filtering and sorting

// ============================================================
// VIRTUALS
// ============================================================

// Virtual for checking if service has reviews
BaseServiceSchema.virtual('hasReviews').get(function() {
  return this.totalReviews > 0;
});

// Virtual for rating tier (excellent, good, average, poor, no-reviews)
BaseServiceSchema.virtual('ratingTier').get(function() {
  if (this.totalReviews === 0) return 'no-reviews';
  if (this.averageRating >= 4.5) return 'excellent';
  if (this.averageRating >= 4) return 'very-good';
  if (this.averageRating >= 3.5) return 'good';
  if (this.averageRating >= 3) return 'average';
  return 'poor';
});

// ============================================================
// METHODS
// ============================================================

// Method to manually trigger analytics recalculation
BaseServiceSchema.methods.recalculateAnalytics = async function() {
  try {
    const Review = mongoose.model('Review');
    if (Review && Review.updateServiceAnalytics) {
      await Review.updateServiceAnalytics(this._id);
      return await this.constructor.findById(this._id);
    }
  } catch (error) {
    console.error('Error recalculating analytics for service:', error);
    throw error;
  }
};

// Method to get service details with analytics
BaseServiceSchema.methods.getAnalyticsSummary = function() {
  return {
    serviceId: this._id,
    name: this.name,
    vendor: this.vendor,
    status: this.status,
    analytics: {
      averageRating: this.averageRating,
      totalReviews: this.totalReviews,
      ratingDistribution: this.ratingDistribution,
      ratingTier: this.ratingTier,
      analyticsUpdatedAt: this.analyticsUpdatedAt
    }
  };
};

// ============================================================
// STATIC METHODS
// ============================================================

// Static method to get top-rated services
BaseServiceSchema.statics.getTopRated = function(limit = 10, filters = {}) {
  return this.find({
    status: 'active',
    totalReviews: { $gte: 1 }, // Only services with reviews
    ...filters
  })
  .sort({ averageRating: -1, totalReviews: -1 })
  .limit(limit);
};

// Static method to get recently reviewed services
BaseServiceSchema.statics.getRecentlyReviewed = function(limit = 10, filters = {}) {
  return this.find({
    status: 'active',
    totalReviews: { $gte: 1 },
    ...filters
  })
  .sort({ analyticsUpdatedAt: -1 })
  .limit(limit);
};

// Static method to get services with minimum review threshold
BaseServiceSchema.statics.getVerifiedServices = function(minReviews = 5, minRating = 3.5, filters = {}) {
  return this.find({
    status: 'active',
    totalReviews: { $gte: minReviews },
    averageRating: { $gte: minRating },
    ...filters
  })
  .sort({ averageRating: -1, totalReviews: -1 });
};

// Static method to get low-rated services (for moderation)
BaseServiceSchema.statics.getLowRatedServices = function(maxRating = 2.5, minReviews = 3, filters = {}) {
  return this.find({
    status: 'active',
    totalReviews: { $gte: minReviews },
    averageRating: { $lte: maxRating },
    ...filters
  })
  .sort({ averageRating: 1, totalReviews: -1 });
};

// ============================================================
// HOOKS
// ============================================================

// Pre-save middleware to update analyticsUpdatedAt
BaseServiceSchema.pre('save', function(next) {
  if (this.isModified('averageRating') || this.isModified('totalReviews')) {
    this.analyticsUpdatedAt = new Date();
  }
  next();
});

const Service = mongoose.model('Service', BaseServiceSchema);

module.exports = Service;