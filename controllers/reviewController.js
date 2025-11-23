// controllers/reviewController.js
const Review = require('../models/Review');
const Booking = require('../models/Booking');
const Service = require('../models/Service');
const User = require('../models/User');

/**
 * @desc    Create a new review
 * @route   POST /api/reviews
 * @access  Private
 */
exports.createReview = async (req, res) => {
  try {
    const { bookingId, rating, subject, description, images } = req.body;
    const userId = req.user.id;

    // Validation: Check required fields
    if (!bookingId || !rating) {
      return res.status(400).json({
        success: false,
        message: 'Booking ID and rating are required'
      });
    }

    // Validation: Rating must be between 1-5
    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }

    // Validation: If subject is provided, description must also be provided
    if (subject && !description) {
      return res.status(400).json({
        success: false,
        message: 'Description is required when subject is provided'
      });
    }

    // Step 1: Verify the booking exists and belongs to the user
    const booking = await Booking.findById(bookingId)
      .populate('service')
      .populate('vendor');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Step 2: Verify the booking belongs to the current user
    if (booking.customer.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only review your own bookings'
      });
    }

    // Step 3: Verify the booking is completed (not reviewed, cancelled, pending, etc.)
    if (booking.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'You can only review bookings that have been completed. Current status: ' + booking.status
      });
    }

    // Step 4: Check if user has already reviewed this service
    const existingReview = await Review.findOne({
      user: userId,
      service: booking.service._id
    });

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this service'
      });
    }

    // Step 5: Create the review
    const reviewData = {
      user: userId,
      booking: bookingId,
      service: booking.service._id,
      serviceType: booking.serviceType,
      vendor: booking.vendor._id,
      rating
    };

    // Add optional fields if provided
    if (subject) reviewData.subject = subject;
    if (description) reviewData.description = description;
    if (images && Array.isArray(images) && images.length > 0) {
      reviewData.images = images;
    }

    const review = await Review.create(reviewData);

    // Populate the review with user details
    await review.populate([
      { path: 'user', select: 'name profilePicture' },
      { path: 'service', select: 'name images' }
    ]);

    // Step 6: Update booking status to 'reviewed'
    await Booking.findByIdAndUpdate(bookingId, {
      status: 'reviewed'
    });

    // Step 7: Update service's average rating
    const serviceRating = await Review.getAverageRating(booking.service._id);
    await Service.findByIdAndUpdate(booking.service._id, {
      averageRating: serviceRating.averageRating,
      totalReviews: serviceRating.totalReviews
    });

    res.status(201).json({
      success: true,
      message: 'Review created successfully',
      data: review
    });

  } catch (error) {
    console.error('Error creating review:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating review',
      error: error.message
    });
  }
};

/**
 * Get reviews with pagination (for modal)
 * @route GET /api/reviews?serviceId=xxx&skip=0&limit=5
 */
exports.getReviewsWithPagination = async (req, res) => {
  try {
    const { serviceId, skip = 0, limit = 5 } = req.query;

    if (!serviceId) {
      return res.status(400).json({
        success: false,
        message: 'serviceId is required'
      });
    }

    const skipNum = parseInt(skip) || 0;
    const limitNum = parseInt(limit) || 5;

    // Get total count of active reviews
    const total = await Review.countDocuments({
      service: serviceId,
      status: 'active'
    });

    // Get paginated reviews
    const reviews = await Review.find({
      service: serviceId,
      status: 'active'
    })
      .populate('user', 'name avatar email')
      .sort({ createdAt: -1 })
      .skip(skipNum)
      .limit(limitNum)
      .lean();

    res.status(200).json({
      success: true,
      reviews,
      total,
      page: Math.floor(skipNum / limitNum) + 1,
      pages: Math.ceil(total / limitNum),
      hasMore: skipNum + limitNum < total
    });
  } catch (error) {
    console.error('Error in getReviewsWithPagination:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching reviews',
      error: error.message
    });
  }
};

/**
 * @desc    Get all reviews for a service
 * @route   GET /api/reviews/service/:serviceId
 * @access  Public
 */
exports.getReviewsForService = async (req, res) => {
  try {
    const { serviceId } = req.params;
    const { page = 1, limit = 10, sort = '-createdAt', rating } = req.query;

    // Build query
    const query = {
      service: serviceId,
      status: 'active'
    };

    // Filter by rating if provided
    if (rating) {
      query.rating = parseInt(rating);
    }

    // Get total count for pagination
    const total = await Review.countDocuments(query);

    // Get reviews with pagination
    const reviews = await Review.find(query)
      .populate('user', 'name profilePicture')
      .populate('vendorResponse.respondedBy', 'name businessProfile.businessName')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    // Get rating statistics
    const ratingStats = await Review.getAverageRating(serviceId);

    res.status(200).json({
      success: true,
      data: reviews,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalReviews: total,
        limit: parseInt(limit)
      },
      stats: ratingStats
    });

  } catch (error) {
    console.error('Error getting reviews:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching reviews',
      error: error.message
    });
  }
};

/**
 * @desc    Get all reviews by a user
 * @route   GET /api/reviews/user/:userId
 * @access  Public
 */
exports.getUserReviews = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const total = await Review.countDocuments({ user: userId, status: 'active' });

    const reviews = await Review.find({ user: userId, status: 'active' })
      .populate('service', 'name images serviceType')
      .populate('vendor', 'name businessProfile.businessName')
      .sort('-createdAt')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    res.status(200).json({
      success: true,
      data: reviews,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalReviews: total,
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error getting user reviews:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user reviews',
      error: error.message
    });
  }
};

/**
 * @desc    Update a review
 * @route   PUT /api/reviews/:id
 * @access  Private
 */
exports.updateReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, subject, description, images } = req.body;
    const userId = req.user.id;

    // Find the review
    const review = await Review.findById(id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Verify ownership
    if (review.user.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own reviews'
      });
    }

    // Validate: If subject is provided, description must also be provided
    const newSubject = subject !== undefined ? subject : review.subject;
    const newDescription = description !== undefined ? description : review.description;

    if (newSubject && !newDescription) {
      return res.status(400).json({
        success: false,
        message: 'Description is required when subject is provided'
      });
    }

    // Update fields
    if (rating !== undefined) {
      if (rating < 1 || rating > 5) {
        return res.status(400).json({
          success: false,
          message: 'Rating must be between 1 and 5'
        });
      }
      review.rating = rating;
    }

    if (subject !== undefined) review.subject = subject;
    if (description !== undefined) review.description = description;
    if (images !== undefined) review.images = images;

    await review.save();

    // Update service average rating
    const serviceRating = await Review.getAverageRating(review.service);
    await Service.findByIdAndUpdate(review.service, {
      averageRating: serviceRating.averageRating,
      totalReviews: serviceRating.totalReviews
    });

    // Populate and return
    await review.populate([
      { path: 'user', select: 'name profilePicture' },
      { path: 'service', select: 'name images' }
    ]);

    res.status(200).json({
      success: true,
      message: 'Review updated successfully',
      data: review
    });

  } catch (error) {
    console.error('Error updating review:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating review',
      error: error.message
    });
  }
};

/**
 * @desc    Delete a review
 * @route   DELETE /api/reviews/:id
 * @access  Private
 */
exports.deleteReview = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Find the review
    const review = await Review.findById(id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Check permissions: owner or admin
    const isOwner = review.user.toString() === userId;
    const isAdmin = userRole === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this review'
      });
    }

    const serviceId = review.service;

    // Delete the review
    await Review.findByIdAndDelete(id);

    // Update service average rating
    const serviceRating = await Review.getAverageRating(serviceId);
    await Service.findByIdAndUpdate(serviceId, {
      averageRating: serviceRating.averageRating,
      totalReviews: serviceRating.totalReviews
    });

    res.status(200).json({
      success: true,
      message: 'Review deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting review',
      error: error.message
    });
  }
};

/**
 * @desc    Mark review as helpful
 * @route   POST /api/reviews/:id/helpful
 * @access  Private
 */
exports.markHelpful = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const review = await Review.findById(id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    const marked = await review.markHelpful(userId);

    res.status(200).json({
      success: true,
      message: marked ? 'Review marked as helpful' : 'Already marked as helpful',
      helpfulCount: review.helpfulCount
    });

  } catch (error) {
    console.error('Error marking review as helpful:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking review as helpful',
      error: error.message
    });
  }
};

/**
 * @desc    Unmark review as helpful
 * @route   DELETE /api/reviews/:id/helpful
 * @access  Private
 */
exports.unmarkHelpful = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const review = await Review.findById(id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    const unmarked = await review.unmarkHelpful(userId);

    res.status(200).json({
      success: true,
      message: unmarked ? 'Helpful mark removed' : 'Was not marked as helpful',
      helpfulCount: review.helpfulCount
    });

  } catch (error) {
    console.error('Error unmarking review as helpful:', error);
    res.status(500).json({
      success: false,
      message: 'Error unmarking review as helpful',
      error: error.message
    });
  }
};

/**
 * @desc    Add vendor response to review
 * @route   POST /api/reviews/:id/response
 * @access  Private (Vendor only)
 */
exports.addVendorResponse = async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;
    const userId = req.user.id;

    if (!text) {
      return res.status(400).json({
        success: false,
        message: 'Response text is required'
      });
    }

    const review = await Review.findById(id).populate('vendor');

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Verify the user is the vendor for this review
    if (review.vendor._id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only respond to reviews for your services'
      });
    }

    // Check if response already exists
    if (review.vendorResponse && review.vendorResponse.text) {
      return res.status(400).json({
        success: false,
        message: 'Vendor response already exists. Use update endpoint to modify.'
      });
    }

    // Add response
    review.vendorResponse = {
      text,
      respondedAt: new Date(),
      respondedBy: userId
    };

    await review.save();

    await review.populate('vendorResponse.respondedBy', 'name businessProfile.businessName');

    res.status(200).json({
      success: true,
      message: 'Vendor response added successfully',
      data: review
    });

  } catch (error) {
    console.error('Error adding vendor response:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding vendor response',
      error: error.message
    });
  }
};

/**
 * @desc    Update vendor response
 * @route   PUT /api/reviews/:id/response
 * @access  Private (Vendor only)
 */
exports.updateVendorResponse = async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;
    const userId = req.user.id;

    if (!text) {
      return res.status(400).json({
        success: false,
        message: 'Response text is required'
      });
    }

    const review = await Review.findById(id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Verify the user is the vendor
    if (review.vendor.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own responses'
      });
    }

    // Update response
    review.vendorResponse.text = text;
    review.vendorResponse.respondedAt = new Date();

    await review.save();

    await review.populate('vendorResponse.respondedBy', 'name businessProfile.businessName');

    res.status(200).json({
      success: true,
      message: 'Vendor response updated successfully',
      data: review
    });

  } catch (error) {
    console.error('Error updating vendor response:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating vendor response',
      error: error.message
    });
  }
};

/**
 * @desc    Check if user can review a service
 * @route   GET /api/reviews/can-review/:serviceId
 * @access  Private
 */
exports.canUserReview = async (req, res) => {
  try {
    const { serviceId } = req.params;
    const userId = req.user.id;

    // Check if user has already reviewed this service
    const existingReview = await Review.findOne({
      user: userId,
      service: serviceId
    });

    if (existingReview) {
      return res.status(200).json({
        success: true,
        canReview: false,
        reason: 'already_reviewed',
        message: 'You have already reviewed this service',
        existingReview
      });
    }

    // Check if user has a completed booking for this service
    const completedBooking = await Booking.findOne({
      customer: userId,
      service: serviceId,
      status: 'completed'
    });

    if (!completedBooking) {
      // Check if there's a reviewed booking (already reviewed)
      const reviewedBooking = await Booking.findOne({
        customer: userId,
        service: serviceId,
        status: 'reviewed'
      });

      if (reviewedBooking) {
        return res.status(200).json({
          success: true,
          canReview: false,
          reason: 'already_reviewed',
          message: 'You have already reviewed this service'
        });
      }

      // Check if there are any other bookings with different statuses
      const anyBooking = await Booking.findOne({
        customer: userId,
        service: serviceId
      });

      if (anyBooking) {
        return res.status(200).json({
          success: true,
          canReview: false,
          reason: 'booking_not_completed',
          message: `Your booking must be completed before you can review. Current status: ${anyBooking.status}`
        });
      }

      return res.status(200).json({
        success: true,
        canReview: false,
        reason: 'no_booking',
        message: 'You must book this service before you can review it'
      });
    }

    res.status(200).json({
      success: true,
      canReview: true,
      bookingId: completedBooking._id,
      message: 'You can review this service'
    });

  } catch (error) {
    console.error('Error checking review eligibility:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking review eligibility',
      error: error.message
    });
  }
};

/**
 * @desc    Get vendor's reviews
 * @route   GET /api/reviews/vendor/:vendorId
 * @access  Public
 */
exports.getVendorReviews = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { page = 1, limit = 10, rating } = req.query;

    const query = {
      vendor: vendorId,
      status: 'active'
    };

    if (rating) {
      query.rating = parseInt(rating);
    }

    const total = await Review.countDocuments(query);

    const reviews = await Review.find(query)
      .populate('user', 'name profilePicture')
      .populate('service', 'name images serviceType')
      .sort('-createdAt')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    // Get vendor rating stats
    const vendorStats = await Review.getVendorAverageRating(vendorId);

    res.status(200).json({
      success: true,
      data: reviews,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalReviews: total,
        limit: parseInt(limit)
      },
      stats: vendorStats
    });

  } catch (error) {
    console.error('Error getting vendor reviews:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching vendor reviews',
      error: error.message
    });
  }
};

/**
 * @desc    Flag a review for moderation
 * @route   POST /api/reviews/:id/flag
 * @access  Private
 */
exports.flagReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user.id;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Reason for flagging is required'
      });
    }

    const review = await Review.findById(id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Update flag status
    review.flagged = {
      isFlagged: true,
      reason,
      flaggedBy: userId,
      flaggedAt: new Date()
    };
    review.status = 'flagged';

    await review.save();

    res.status(200).json({
      success: true,
      message: 'Review flagged for moderation'
    });

  } catch (error) {
    console.error('Error flagging review:', error);
    res.status(500).json({
      success: false,
      message: 'Error flagging review',
      error: error.message
    });
  }
};