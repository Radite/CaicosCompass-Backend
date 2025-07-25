const express = require('express');
const router = express.Router();
const vendorController = require('../controllers/vendorController');
const { protect, businessManagerProtect } = require('../middleware/authMiddleware');

// Apply protection middleware to all routes
router.use(protect);
router.use(businessManagerProtect);

// Dashboard routes
router.get('/dashboard', vendorController.getBusinessDashboard);
router.get('/recent-activity', vendorController.getRecentActivity);

// Listing management routes
router.get('/listings', vendorController.getVendorListings);
router.put('/listings/:listingId/status', vendorController.updateListingStatus);
router.delete('/listings/:listingId', vendorController.deleteListing);
router.post('/listings/bulk-action', vendorController.bulkActionListings);

// Discount management routes
router.get('/discounts', vendorController.getVendorDiscounts);
router.post('/discounts', vendorController.createDiscount);
router.put('/discounts/:discountId', vendorController.updateDiscount);
router.delete('/discounts/:discountId', vendorController.deleteDiscount);
router.put('/discounts/:discountId/toggle', vendorController.toggleDiscountStatus);

// Booking management routes
router.get('/bookings', vendorController.getVendorBookings);
router.put('/bookings/:bookingId/status', vendorController.updateBookingStatus);

// Analytics routes
router.get('/analytics/revenue', vendorController.getRevenueAnalytics);
router.get('/analytics/bookings', vendorController.getBookingAnalytics);
router.get('/analytics/performance', vendorController.getPerformanceAnalytics);

module.exports = router;