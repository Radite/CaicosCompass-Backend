const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const authMiddleware = require('../middleware/authMiddleware');

// CRUD for bookings
router.post('/', authMiddleware.protect, bookingController.createBooking);
router.put('/:id', authMiddleware.protect, bookingController.updateBooking);
router.delete('/:id', authMiddleware.protect, bookingController.cancelBooking);
router.get('/', authMiddleware.protect, bookingController.getUserBookings);
router.get('/:id', authMiddleware.protect, bookingController.getBookingById);

// Admin-specific cancellation
// Admin cancel a booking
router.post(
    '/:id/admin-cancel',
    authMiddleware.protect,
    authMiddleware.adminProtect,
    bookingController.adminCancelBooking
  );
  
  // Business Manager cancel a booking
  router.post(
    '/:id/manager-cancel',
    authMiddleware.protect,
    authMiddleware.businessManagerProtect,
    bookingController.managerCancelBooking
  );
// Multi-user payment for bookings
router.post('/:id/pay', authMiddleware.protect, bookingController.payForBooking);
router.put('/:id/payees/:payeeId', authMiddleware.protect, bookingController.updatePayeePayment);

// Cancellation and refunds
router.post('/:id/cancel', authMiddleware.protect, bookingController.initiateCancellation);

// Feedback for bookings
router.post('/:id/feedback', authMiddleware.protect, bookingController.addFeedback);
router.get('/:id/feedback', authMiddleware.protect, bookingController.getFeedback);

// Notifications
router.get('/:id/notifications', authMiddleware.protect, bookingController.getBookingNotifications);
router.put('/:id/notifications/:notificationId', authMiddleware.protect, bookingController.markNotificationRead);

module.exports = router;
