// routes/adminRoutes.js - Admin specific routes
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/authMiddleware');

// All admin routes require admin authentication
router.use(authMiddleware.protect);
router.use(authMiddleware.adminProtect);

// Dashboard stats
router.get('/dashboard-stats', adminController.getDashboardStats);

// User management
router.get('/users', adminController.getAllUsers);
router.get('/users/:id', adminController.getUserById);
router.put('/users/:id/role', adminController.updateUserRole);
router.delete('/users/:id', adminController.deleteUser);
router.put('/users/:id/verify', adminController.verifyUser);

// Booking management
router.get('/bookings', adminController.getAllBookings);
router.get('/bookings/:id', adminController.getBookingById);
router.put('/bookings/:id/status', adminController.updateBookingStatus);
router.post('/bookings/:id/refund', adminController.processRefund);

// Service management
router.get('/services', adminController.getAllServices);
router.put('/services/:id/approve', adminController.approveService);
router.put('/services/:id/reject', adminController.rejectService);

// Analytics
router.get('/analytics/revenue', adminController.getRevenueAnalytics);
router.get('/analytics/bookings', adminController.getBookingAnalytics);
router.get('/analytics/users', adminController.getUserAnalytics);

// Reports
router.get('/reports/revenue', adminController.getRevenueReport);
router.get('/reports/bookings', adminController.getBookingReport);
router.get('/reports/users', adminController.getUserReport);

module.exports = router;

