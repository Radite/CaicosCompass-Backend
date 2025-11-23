// routes/reviewRoutes.js
const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { protect } = require('../middleware/authMiddleware');

// PUBLIC ROUTES
// =============

/**
 * @desc    Get all reviews for a service (with pagination)
 * @route   GET /api/reviews
 * @access  Public
 * @query   serviceId (required), skip, limit
 */
router.get('/', reviewController.getReviewsWithPagination);

/**
 * @desc    Get all reviews for a service
 * @route   GET /api/reviews/service/:serviceId
 * @access  Public
 * @query   page, limit, sort, rating
 */
router.get('/service/:serviceId', reviewController.getReviewsForService);

/**
 * @desc    Get all reviews by a user
 * @route   GET /api/reviews/user/:userId
 * @access  Public
 * @query   page, limit
 */
router.get('/user/:userId', reviewController.getUserReviews);

/**
 * @desc    Get all reviews for a vendor
 * @route   GET /api/reviews/vendor/:vendorId
 * @access  Public
 * @query   page, limit, rating
 */
router.get('/vendor/:vendorId', reviewController.getVendorReviews);

// PROTECTED ROUTES (Require Authentication)
// ==========================================

/**
 * @desc    Create a new review
 * @route   POST /api/reviews
 * @access  Private
 * @body    bookingId, rating, subject (optional), description (optional), images (optional)
 */
router.post('/', protect, reviewController.createReview);

/**
 * @desc    Check if user can review a service
 * @route   GET /api/reviews/can-review/:serviceId
 * @access  Private
 */
router.get('/can-review/:serviceId', protect, reviewController.canUserReview);

/**
 * @desc    Update a review
 * @route   PUT /api/reviews/:id
 * @access  Private (Review owner only)
 * @body    rating, subject, description, images
 */
router.put('/:id', protect, reviewController.updateReview);

/**
 * @desc    Delete a review
 * @route   DELETE /api/reviews/:id
 * @access  Private (Review owner or admin)
 */
router.delete('/:id', protect, reviewController.deleteReview);

/**
 * @desc    Mark review as helpful
 * @route   POST /api/reviews/:id/helpful
 * @access  Private
 */
router.post('/:id/helpful', protect, reviewController.markHelpful);

/**
 * @desc    Unmark review as helpful
 * @route   DELETE /api/reviews/:id/helpful
 * @access  Private
 */
router.delete('/:id/helpful', protect, reviewController.unmarkHelpful);

/**
 * @desc    Add vendor response to review
 * @route   POST /api/reviews/:id/response
 * @access  Private (Vendor only)
 * @body    text
 */
router.post('/:id/response', protect, reviewController.addVendorResponse);

/**
 * @desc    Update vendor response
 * @route   PUT /api/reviews/:id/response
 * @access  Private (Vendor only)
 * @body    text
 */
router.put('/:id/response', protect, reviewController.updateVendorResponse);

/**
 * @desc    Flag a review for moderation
 * @route   POST /api/reviews/:id/flag
 * @access  Private
 * @body    reason
 */
router.post('/:id/flag', protect, reviewController.flagReview);

module.exports = router;