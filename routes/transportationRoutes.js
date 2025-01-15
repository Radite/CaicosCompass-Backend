const express = require('express');
const router = express.Router();
const transportationController = require('../controllers/transportationController');
const { protect, adminProtect } = require('../middleware/authMiddleware');

// General Transportation Management
router.get('/', transportationController.getAllTransportation); // Get all transportation services
router.get('/available', transportationController.filterAvailableTransportation); // Filter available transportation
router.get('/:id', transportationController.getTransportationById); // Get a specific transportation service by ID

// CRUD Operations (Admin only)
router.post('/', adminProtect, transportationController.createTransportation); // Create a new transportation service
router.put('/:id', adminProtect, transportationController.updateTransportation); // Update a transportation service
router.delete('/:id', adminProtect, transportationController.deleteTransportation); // Delete a transportation service

// Booking Management
router.post('/:id/book', protect, transportationController.bookTransportation); // Create a booking
router.get('/:id/bookings', adminProtect, transportationController.getBookingsForTransportation); // Get bookings for a specific transportation service (Admin only)

// Blocked Dates Management (Admin only)
router.post('/:id/block-dates', adminProtect, transportationController.addBlockedDates); // Add blocked dates to a transportation service
router.delete('/:id/block-dates', adminProtect, transportationController.removeBlockedDates); // Remove blocked dates from a transportation service

// Options Management (Admin only)
router.post('/:id/options', adminProtect, transportationController.addOption); // Add an option to a transportation service
router.put('/:id/options/:optionId', adminProtect, transportationController.updateOption); // Update a specific option in a transportation service
router.delete('/:id/options/:optionId', adminProtect, transportationController.deleteOption); // Delete a specific option from a transportation service

// Reviews
router.post('/:id/reviews', protect, transportationController.addReview); // Add a review for a transportation service
router.get('/:id/reviews', transportationController.getReviews); // Get all reviews for a transportation service

module.exports = router;
