const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const authMiddleware = require('../middleware/authMiddleware');
const { createBooking, getBookingByPaymentIntent } = require('../controllers/bookingController');

// Basic CRUD Operations
// Create a new booking (supports all service types: activity, stay, transportation, dining, spa)
router.post('/', authMiddleware.protect, bookingController.createBooking);
router.get('/by-payment-intent/:paymentIntentId', getBookingByPaymentIntent);

// Get all bookings for authenticated user (with optional query filters)
// Query params: ?status=confirmed&category=spa
router.get('/user', authMiddleware.protect, bookingController.getUserBookings);

// Get user booking statistics
router.get('/user/stats', authMiddleware.protect, bookingController.getUserBookingStats);

// Get specific booking by ID
router.get('/:id', authMiddleware.protect, bookingController.getBookingById);

// Update an existing booking
router.put('/:id', authMiddleware.protect, bookingController.updateBooking);

// User cancel their own booking
router.delete('/:id', authMiddleware.protect, bookingController.cancelBooking);

// Alternative cancellation endpoint
router.post('/:id/cancel', authMiddleware.protect, bookingController.initiateCancellation);

// Payment Operations
// Process payment for a booking
router.post('/:id/pay', authMiddleware.protect, bookingController.payForBooking);

// Update payment status for a specific payee
router.put('/:id/payees/:payeeId', authMiddleware.protect, bookingController.updatePayeePayment);

// Admin Operations (require admin role)
// Admin cancel a booking
router.post(
  '/:id/admin-cancel',
  authMiddleware.protect,
  authMiddleware.adminProtect,
  bookingController.adminCancelBooking
);

// Business Manager Operations (require business manager role)
// Business manager cancel a booking
router.post(
  '/:id/manager-cancel',
  authMiddleware.protect,
  authMiddleware.businessManagerProtect,
  bookingController.managerCancelBooking
);

// Feedback Operations
// Add feedback/review for a completed booking
router.post('/:id/feedback', authMiddleware.protect, bookingController.addFeedback);

// Get feedback for a booking
router.get('/:id/feedback', authMiddleware.protect, bookingController.getFeedback);

// Notification Operations
// Get notifications for a specific booking
router.get('/:id/notifications', authMiddleware.protect, bookingController.getBookingNotifications);

// Mark a specific notification as read
router.put('/:id/notifications/:notificationId', authMiddleware.protect, bookingController.markNotificationRead);

// Cart Operations
// Checkout multiple items from cart
router.post(
  '/checkout-multiple',
  authMiddleware.protect,
  bookingController.checkoutMultipleBookings
);


module.exports = router;