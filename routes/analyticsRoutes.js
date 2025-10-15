// routes/analyticsRoutes.js
const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { protect, adminProtect } = require('../middleware/authMiddleware');

// Apply protection middleware to all routes
router.use(protect);
router.use(adminProtect);

/**
 * @route   GET /api/admin/analytics/revenue
 * @desc    Get revenue analytics with pre-calculated data
 * @access  Private/Admin
 * @query   period - Number of days to fetch (default: 30)
 */
router.get('/revenue', analyticsController.getRevenueAnalytics);

/**
 * @route   GET /api/admin/analytics/category-breakdown
 * @desc    Get detailed breakdown by category
 * @access  Private/Admin
 * @query   period - Number of days (default: 30)
 * @query   category - Specific category to filter (optional)
 */
router.get('/category-breakdown', analyticsController.getCategoryBreakdown);

/**
 * @route   GET /api/admin/analytics/vendors
 * @desc    Get vendor performance analytics
 * @access  Private/Admin
 * @query   period - Number of days (default: 30)
 * @query   vendorId - Specific vendor ID to filter (optional)
 */
router.get('/vendors', analyticsController.getVendorAnalytics);

/**
 * @route   GET /api/admin/analytics/transportation-breakdown
 * @desc    Get transportation category breakdown
 * @access  Private/Admin
 * @query   period - Number of days (default: 30)
 */
router.get('/transportation-breakdown', analyticsController.getTransportationBreakdown);

/**
 * @route   GET /api/admin/analytics/growth-metrics
 * @desc    Get growth metrics comparison
 * @access  Private/Admin
 * @query   period - Period type (daily, weekly, monthly, yearly)
 */
router.get('/growth-metrics', analyticsController.getGrowthMetrics);

/**
 * @route   POST /api/admin/analytics/recalculate
 * @desc    Recalculate analytics from scratch for a date range
 * @access  Private/Admin
 * @body    startDate - Start date (required)
 * @body    endDate - End date (optional, defaults to now)
 */
router.post('/recalculate', analyticsController.recalculateAnalytics);

module.exports = router;
