// routes/reviewRoutes.js
const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
// Optionally, if you have authentication middleware:
const { protect } = require('../middleware/authMiddleware');

// Create a new review (protected route)
router.post('/', protect, reviewController.createReview);

// Get all reviews for a given service by its ID
router.get('/service/:serviceId', reviewController.getReviewsForService);

// Update a review (protected route)
router.put('/:id', protect, reviewController.updateReview);

// Delete a review (protected route)
router.delete('/:id', protect, reviewController.deleteReview);

module.exports = router;
