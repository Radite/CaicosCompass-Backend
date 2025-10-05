// models/Review.js
const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema(
  {
    user: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User', 
      required: true 
    },
    // Reference to the original booking that allows this review
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true
    },
    // Reference to the service being reviewed
    service: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Service', 
      required: true 
    },
    // The type of service (activity, stay, dining, transportation, spa)
    serviceType: {
      type: String,
      enum: ['activity', 'stay', 'dining', 'transportation', 'spa'],
      required: true,
    },
    // Optional: if reviewing a specific option (e.g. an option in transportation or activity)
    option: { 
      type: mongoose.Schema.Types.ObjectId, 
      default: null 
    },
    // Optional: if reviewing a specific room for stays
    room: { 
      type: mongoose.Schema.Types.ObjectId, 
      default: null 
    },
    stars: { 
      type: Number, 
      required: true, 
      min: 1, 
      max: 5 
    },
    title: { 
      type: String,
      trim: true,
      maxlength: 100
    },
    description: { 
      type: String,
      trim: true,
      maxlength: 1000
    },
    // Additional review criteria
    aspectRatings: {
      cleanliness: { type: Number, min: 1, max: 5 },
      service: { type: Number, min: 1, max: 5 },
      value: { type: Number, min: 1, max: 5 },
      location: { type: Number, min: 1, max: 5 },
      amenities: { type: Number, min: 1, max: 5 }
    },
    // Images uploaded with the review
    images: [{
      url: { type: String, required: true },
      caption: { type: String, maxlength: 200 }
    }],
    // Tracking for helpful votes
    helpfulVotes: { type: Number, default: 0 },
    unhelpfulVotes: { type: Number, default: 0 },
    
    // Who found this review helpful (to prevent duplicate votes)
    helpfulUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    unhelpfulUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    
    // Host/Admin replies
    replies: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        userType: { type: String, enum: ['host', 'admin'], required: true },
        comment: { type: String, required: true, maxlength: 500 },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    
    // Review status (for moderation)
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'approved'
    },
    
    // Flagging system
    flagged: {
      isFlagged: { type: Boolean, default: false },
      flagCount: { type: Number, default: 0 },
      flagReasons: [{ type: String }],
      flaggedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
    }
  },
  { 
    timestamps: true,
    // Add virtual for calculated average rating across aspects
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual for calculating overall aspect rating
ReviewSchema.virtual('aspectAverage').get(function() {
  const aspects = this.aspectRatings;
  if (!aspects) return null;
  
  const ratings = Object.values(aspects).filter(rating => rating != null);
  if (ratings.length === 0) return null;
  
  const sum = ratings.reduce((total, rating) => total + rating, 0);
  return Math.round((sum / ratings.length) * 10) / 10; // Round to 1 decimal
});

// Enforce uniqueness: one review per booking per user
// This ensures a user can only review each booking once
ReviewSchema.index(
  { user: 1, booking: 1 },
  { unique: true }
);

// Additional indexes for performance
ReviewSchema.index({ service: 1, serviceType: 1 });
ReviewSchema.index({ user: 1 });
ReviewSchema.index({ createdAt: -1 });
ReviewSchema.index({ stars: 1 });
ReviewSchema.index({ status: 1 });

// Pre-save middleware to validate review eligibility
ReviewSchema.pre('save', async function(next) {
  // Only run validations on new reviews
  if (!this.isNew) return next();
  
  try {
    // Get the booking to validate eligibility
    const Booking = mongoose.model('Booking');
    const booking = await Booking.findById(this.booking);
    
    if (!booking) {
      return next(new Error('Booking not found'));
    }
    
    // Verify the user owns this booking
    if (booking.user.toString() !== this.user.toString()) {
      return next(new Error('You can only review bookings you have made'));
    }
    
    // Verify booking is confirmed and completed
    if (booking.status !== 'confirmed') {
      return next(new Error('You can only review confirmed bookings'));
    }
    
    // Calculate completion date based on service type
    let completionDate;
    switch (booking.category) {
      case 'stay':
        completionDate = booking.endDate;
        break;
      case 'activity':
      case 'transportation':
      case 'dining':
      case 'spa':
        completionDate = booking.date;
        break;
      default:
        return next(new Error('Invalid booking category'));
    }
    
    if (!completionDate) {
      return next(new Error('Booking completion date not found'));
    }
    
    // Check if review is within 14 days of completion
    const now = new Date();
    const fourteenDaysAfterCompletion = new Date(completionDate);
    fourteenDaysAfterCompletion.setDate(fourteenDaysAfterCompletion.getDate() + 14);
    
    if (now > fourteenDaysAfterCompletion) {
      return next(new Error('Review period has expired. You have 14 days after completion to leave a review'));
    }
    
    // Check if completion date has passed
    if (now < completionDate) {
      return next(new Error('You can only review after the experience has been completed'));
    }
    
    // Verify service matches booking
    let bookingServiceId;
    switch (booking.category) {
      case 'activity':
        bookingServiceId = booking.activity;
        break;
      case 'stay':
        bookingServiceId = booking.stay;
        break;
      case 'transportation':
        bookingServiceId = booking.transportation;
        break;
      case 'dining':
        bookingServiceId = booking.dining;
        break;
      case 'spa':
        bookingServiceId = booking.spa;
        break;
    }
    
    if (bookingServiceId.toString() !== this.service.toString()) {
      return next(new Error('Service ID does not match the booking'));
    }
    
    // Verify service type matches
    if (booking.category !== this.serviceType) {
      return next(new Error('Service type does not match the booking category'));
    }
    
    // Verify option if provided
    if (this.option && booking.option && this.option.toString() !== booking.option.toString()) {
      return next(new Error('Option does not match the booking'));
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

// Method to check if user can review a specific booking
ReviewSchema.statics.canUserReview = async function(userId, bookingId) {
  try {
    const Booking = mongoose.model('Booking');
    const booking = await Booking.findById(bookingId);
    
    if (!booking) {
      return { canReview: false, reason: 'Booking not found' };
    }
    
    // Check if user owns the booking
    if (booking.user.toString() !== userId.toString()) {
      return { canReview: false, reason: 'You can only review your own bookings' };
    }
    
    // Check if booking is confirmed
    if (booking.status !== 'confirmed') {
      return { canReview: false, reason: 'Booking must be confirmed to leave a review' };
    }
    
    // Check if already reviewed
    const existingReview = await this.findOne({ user: userId, booking: bookingId });
    if (existingReview) {
      return { canReview: false, reason: 'You have already reviewed this booking' };
    }
    
    // Calculate completion date
    let completionDate;
    switch (booking.category) {
      case 'stay':
        completionDate = booking.endDate;
        break;
      case 'activity':
      case 'transportation':
      case 'dining':
      case 'spa':
        completionDate = booking.date;
        break;
      default:
        return { canReview: false, reason: 'Invalid booking category' };
    }
    
    if (!completionDate) {
      return { canReview: false, reason: 'Booking completion date not found' };
    }
    
    const now = new Date();
    const fourteenDaysAfterCompletion = new Date(completionDate);
    fourteenDaysAfterCompletion.setDate(fourteenDaysAfterCompletion.getDate() + 14);
    
    // Check if experience has been completed
    if (now < completionDate) {
      return { 
        canReview: false, 
        reason: 'Experience must be completed before you can leave a review',
        completionDate: completionDate
      };
    }
    
    // Check if within review period
    if (now > fourteenDaysAfterCompletion) {
      return { 
        canReview: false, 
        reason: 'Review period has expired. You have 14 days after completion to leave a review',
        completionDate: completionDate,
        expiryDate: fourteenDaysAfterCompletion
      };
    }
    
    return { 
      canReview: true, 
      booking: booking,
      completionDate: completionDate,
      expiryDate: fourteenDaysAfterCompletion
    };
    
  } catch (error) {
    return { canReview: false, reason: error.message };
  }
};

// Method to get user's reviewable bookings
ReviewSchema.statics.getUserReviewableBookings = async function(userId) {
  try {
    const Booking = mongoose.model('Booking');
    
    // Find confirmed bookings for the user
    const bookings = await Booking.find({
      user: userId,
      status: 'confirmed'
    }).populate('activity stay transportation dining spa', 'name images');
    
    const reviewableBookings = [];
    
    for (const booking of bookings) {
      // Check if already reviewed
      const existingReview = await this.findOne({ 
        user: userId, 
        booking: booking._id 
      });
      
      if (!existingReview) {
        // Calculate completion date
        let completionDate;
        switch (booking.category) {
          case 'stay':
            completionDate = booking.endDate;
            break;
          case 'activity':
          case 'transportation':
          case 'dining':
          case 'spa':
            completionDate = booking.date;
            break;
        }
        
        if (completionDate) {
          const now = new Date();
          const fourteenDaysAfterCompletion = new Date(completionDate);
          fourteenDaysAfterCompletion.setDate(fourteenDaysAfterCompletion.getDate() + 14);
          
          // Check if completed and within review window
          if (now >= completionDate && now <= fourteenDaysAfterCompletion) {
            reviewableBookings.push({
              booking: booking,
              completionDate: completionDate,
              expiryDate: fourteenDaysAfterCompletion,
              daysLeft: Math.ceil((fourteenDaysAfterCompletion - now) / (1000 * 60 * 60 * 24))
            });
          }
        }
      }
    }
    
    return reviewableBookings;
  } catch (error) {
    throw error;
  }
};

module.exports = mongoose.model('Review', ReviewSchema);