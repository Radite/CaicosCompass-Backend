// reviewRoutes.js
const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const authMiddleware = require('../middleware/authMiddleware');

// Routes for managing reviews
router.post('/', authMiddleware.protect, reviewController.addReview); // Add a new review
router.get('/', reviewController.getReviews); // Get reviews with optional filters
router.get('/:id', reviewController.getReviewById); // Get a single review by ID
router.put('/:id', authMiddleware.protect, reviewController.updateReview); // Update a review
router.delete('/:id', authMiddleware.protect, reviewController.deleteReview); // Delete a review
router.post('/:id/helpful', authMiddleware.protect, reviewController.markHelpful); // Mark a review as helpful
router.post('/:id/replies', authMiddleware.protect, reviewController.addReply); // Add a reply to a review

module.exports = router;

