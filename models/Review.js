// models/Review.js - Enhanced with automatic Service analytics updates
const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema(
  {
    // User who created the review
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },

    // Booking that allows this review (must have completed booking)
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
      index: true
    },

    // Service being reviewed
    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
      required: true,
      index: true
    },

    // Service type for categorization
    serviceType: {
      type: String,
      enum: ['Activity', 'Stay', 'Transportation', 'Dining'],
      required: true
    },

    // Vendor who provided the service
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },

    // MANDATORY: Rating from 1-5
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },

    // OPTIONAL: Review subject/title
    subject: {
      type: String,
      trim: true,
      maxlength: 100
    },

    // OPTIONAL: Detailed description
    // Required if subject is provided
    description: {
      type: String,
      trim: true,
      maxlength: 1000
    },

    // OPTIONAL: Review images
    images: [{
      url: {
        type: String,
        required: true
      },
      caption: {
        type: String,
        maxlength: 200
      }
    }],

    // Helpful votes tracking
    helpfulCount: {
      type: Number,
      default: 0
    },

    helpfulUsers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],

    // Vendor response
    vendorResponse: {
      text: {
        type: String,
        maxlength: 500
      },
      respondedAt: Date,
      respondedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    },

    // Status tracking
    status: {
      type: String,
      enum: ['active', 'hidden', 'flagged'],
      default: 'active'
    },

    // Flag tracking for moderation
    flagged: {
      isFlagged: {
        type: Boolean,
        default: false
      },
      reason: String,
      flaggedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      flaggedAt: Date
    }
  },
  {
    timestamps: true
  }
);

// Compound index to ensure one review per user per service
ReviewSchema.index({ booking: 1 }, { unique: true });

// Index for efficient queries
ReviewSchema.index({ service: 1, status: 1, createdAt: -1 });
ReviewSchema.index({ vendor: 1, status: 1, createdAt: -1 });
ReviewSchema.index({ rating: 1 });

// Validation: If subject exists, description must also exist
ReviewSchema.pre('validate', function(next) {
  if (this.subject && !this.description) {
    next(new Error('Description is required when subject is provided'));
  } else {
    next();
  }
});

// Virtual for checking if review has content beyond rating
ReviewSchema.virtual('hasDetailedReview').get(function() {
  return !!(this.subject || this.description || (this.images && this.images.length > 0));
});

// ============================================================
// AUTOMATIC SERVICE ANALYTICS UPDATE HOOKS
// ============================================================

// Helper function to recalculate and update Service analytics
ReviewSchema.statics.updateServiceAnalytics = async function(serviceId) {
  try {
    const Service = mongoose.model('Service');
    
    // Aggregate active reviews for this service
    const analyticsResult = await this.aggregate([
      {
        $match: {
          service: new mongoose.Types.ObjectId(serviceId),
          status: 'active' // Only count active reviews
        }
      },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 },
          ratingDistribution: { $push: '$rating' }
        }
      }
    ]);

    let updateData = {
      averageRating: 0,
      totalReviews: 0
    };

    if (analyticsResult.length > 0) {
      const result = analyticsResult[0];
      updateData.averageRating = Math.round(result.averageRating * 10) / 10;
      updateData.totalReviews = result.totalReviews;
    }

    // Update the Service document
    const updated = await Service.findByIdAndUpdate(
      serviceId,
      updateData,
      { new: true, runValidators: false }
    );

    console.log(`[Analytics Update] Service ${serviceId}: ${updateData.totalReviews} reviews, ${updateData.averageRating} avg rating`);
    
    return updated;
  } catch (error) {
    console.error(`[Analytics Error] Failed to update service ${serviceId}:`, error);
    // Don't throw - continue even if analytics update fails
  }
};

// Post-save hook: Update Service analytics when a new review is created or status changes
ReviewSchema.post('save', async function(doc) {
  try {
    // Update Service analytics after review is saved
    await this.constructor.updateServiceAnalytics(doc.service);
  } catch (error) {
    console.error('[Post-Save Hook] Error updating service analytics:', error);
  }
});

// Post-findByIdAndUpdate hook: Update Service analytics when review is updated
ReviewSchema.post('findByIdAndUpdate', async function(doc) {
  try {
    if (doc && doc.service) {
      await this.constructor.updateServiceAnalytics(doc.service);
    }
  } catch (error) {
    console.error('[Post-FindByIdAndUpdate Hook] Error updating service analytics:', error);
  }
});

// Post-deleteOne hook: Update Service analytics when review is deleted
ReviewSchema.post('deleteOne', async function(doc) {
  try {
    if (doc && doc.service) {
      await mongoose.model('Review').updateServiceAnalytics(doc.service);
    }
  } catch (error) {
    console.error('[Post-DeleteOne Hook] Error updating service analytics:', error);
  }
});

// Post-findByIdAndDelete hook: Update Service analytics
ReviewSchema.post('findByIdAndDelete', async function(doc) {
  try {
    if (doc && doc.service) {
      await mongoose.model('Review').updateServiceAnalytics(doc.service);
    }
  } catch (error) {
    console.error('[Post-FindByIdAndDelete Hook] Error updating service analytics:', error);
  }
});

// Post-updateOne hook: Handle bulk update operations
ReviewSchema.post('updateOne', async function() {
  try {
    // Get the filter to find affected services
    const filter = this.getFilter();
    if (filter.service) {
      const serviceId = filter.service;
      await mongoose.model('Review').updateServiceAnalytics(serviceId);
    }
  } catch (error) {
    console.error('[Post-UpdateOne Hook] Error updating service analytics:', error);
  }
});

// Method to mark as helpful by a user
ReviewSchema.methods.markHelpful = async function(userId) {
  if (!this.helpfulUsers.includes(userId)) {
    this.helpfulUsers.push(userId);
    this.helpfulCount = this.helpfulUsers.length;
    await this.save();
    return true;
  }
  return false;
};

// Method to unmark as helpful by a user
ReviewSchema.methods.unmarkHelpful = async function(userId) {
  const index = this.helpfulUsers.indexOf(userId);
  if (index > -1) {
    this.helpfulUsers.splice(index, 1);
    this.helpfulCount = this.helpfulUsers.length;
    await this.save();
    return true;
  }
  return false;
};

// Static method to get average rating for a service
ReviewSchema.statics.getAverageRating = async function(serviceId) {
  const result = await this.aggregate([
    {
      $match: {
        service: new mongoose.Types.ObjectId(serviceId),
        status: 'active'
      }
    },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 },
        ratingDistribution: {
          $push: '$rating'
        }
      }
    }
  ]);

  if (result.length === 0) {
    return {
      averageRating: 0,
      totalReviews: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    };
  }

  // Calculate rating distribution
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  result[0].ratingDistribution.forEach(rating => {
    distribution[rating] = (distribution[rating] || 0) + 1;
  });

  return {
    averageRating: Math.round(result[0].averageRating * 10) / 10,
    totalReviews: result[0].totalReviews,
    ratingDistribution: distribution
  };
};

// Static method to get vendor's average rating
ReviewSchema.statics.getVendorAverageRating = async function(vendorId) {
  const result = await this.aggregate([
    {
      $match: {
        vendor: new mongoose.Types.ObjectId(vendorId),
        status: 'active'
      }
    },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 }
      }
    }
  ]);

  if (result.length === 0) {
    return { averageRating: 0, totalReviews: 0 };
  }

  return {
    averageRating: Math.round(result[0].averageRating * 10) / 10,
    totalReviews: result[0].totalReviews
  };
};

// Bulk update helper: Update multiple services after bulk review operations
ReviewSchema.statics.updateMultipleServiceAnalytics = async function(serviceIds) {
  try {
    const updates = serviceIds.map(serviceId => 
      this.updateServiceAnalytics(serviceId)
    );
    await Promise.all(updates);
  } catch (error) {
    console.error('[Bulk Update Error] Failed to update multiple service analytics:', error);
  }
};

module.exports = mongoose.model('Review', ReviewSchema);