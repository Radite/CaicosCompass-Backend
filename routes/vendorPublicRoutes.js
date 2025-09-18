const express = require('express');
const router = express.Router();
const vendorPublicController = require('../controllers/vendorPublicController');
const { body, param } = require('express-validator');
const User = require('../models/User'); // Add this for debug route

// Validation middleware
const validateVendorId = [
  param('vendorId').isMongoId().withMessage('Invalid vendor ID')
];

const validateServiceQuery = [
  body('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  body('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  body('serviceType').optional().isIn(['Activity', 'Stay', 'Dining', 'Transportation']).withMessage('Invalid service type')
];

// PUBLIC ROUTES

// @desc    Get vendor public profile
// @route   GET /api/vendor/public/:vendorId
// @access  Public
router.get('/public/:vendorId', validateVendorId, vendorPublicController.getVendorPublicProfile);

// @desc    Get vendor services
// @route   GET /api/vendor/public/:vendorId/services
// @access  Public
router.get('/public/:vendorId/services', validateVendorId, vendorPublicController.getVendorServices);

// @desc    Get vendor reviews
// @route   GET /api/vendor/public/:vendorId/reviews
// @access  Public
router.get('/public/:vendorId/reviews', validateVendorId, vendorPublicController.getVendorReviews);

// @desc    Get vendor by username (SEO-friendly URLs)
// @route   GET /api/vendor/profile/:username
// @access  Public
router.get('/profile/:username', vendorPublicController.getVendorByUsername);

// @desc    Debug vendor data (temporary route for testing)
// @route   GET /api/vendor/debug/:vendorId
// @access  Public
router.get('/debug/:vendorId', async (req, res) => {
  try {
    const { vendorId } = req.params;
    
    // Get all user data to see what we have
    const user = await User.findById(vendorId).lean();
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({
      success: true,
      debug: {
        exists: true,
        role: user.role,
        hasBusinessProfile: !!user.businessProfile,
        isApproved: user.businessProfile?.isApproved,
        businessName: user.businessProfile?.businessName,
        businessType: user.businessProfile?.businessType,
        servicesOffered: user.businessProfile?.servicesOffered,
        fullBusinessProfile: user.businessProfile // Business profile for debugging
      }
    });
    
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

module.exports = router;