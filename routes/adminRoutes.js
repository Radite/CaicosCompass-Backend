const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { protect, adminProtect } = require('../middleware/authMiddleware');

// Apply protection middleware to all routes
router.use(protect);
router.use(adminProtect);

// Dashboard routes
router.get('/dashboard', adminController.getDashboardStats);

// User management routes
router.get('/users', adminController.getUsers);
router.get('/users/:userId', adminController.getUserDetails);
router.put('/users/:userId', adminController.updateUser);
router.delete('/users/:userId', adminController.deleteUser);
router.put('/users/:userId/status', adminController.toggleUserStatus);
router.put('/users/:userId/role', adminController.updateUserRole);

// Booking management routes
router.get('/bookings', adminController.getBookings);
router.get('/bookings/:bookingId', adminController.getBookingDetails);
router.put('/bookings/:bookingId/status', adminController.updateBookingStatus);

// Vendor management routes
router.get('/vendors', adminController.getVendors);
router.put('/vendors/:vendorId/approve', adminController.approveVendor);
router.put('/vendors/:vendorId/reject', adminController.rejectVendor);

// Analytics routes
router.get('/analytics/revenue', adminController.getRevenueAnalytics);
router.get('/analytics/users', adminController.getUserAnalytics);
router.get('/analytics/bookings', adminController.getBookingAnalytics);
router.get('/analytics/platform', adminController.getPlatformAnalytics);

// System management routes
router.get('/system/health', adminController.getSystemHealth);
router.get('/system/metrics', adminController.getSystemMetrics);
router.post('/system/backup', adminController.createBackup);
router.get('/system/backups', adminController.getBackups);

// Audit routes
router.get('/audit-logs', adminController.getAuditLogs);

// Settings routes
router.get('/settings', adminController.getSystemSettings);
router.put('/settings', adminController.updateSystemSettings);

module.exports = router;