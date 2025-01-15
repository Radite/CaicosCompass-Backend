/**
 * Stay Routes
 */
const express = require('express');
const router = express.Router();
const stayController = require('../controllers/stayController');
const { protect, adminProtect } = require('../middleware/authMiddleware');

// General Stay Management
router.get('/', stayController.getStays); // Get all stays
router.get('/prices', stayController.getPrices); // Get price range for stays
router.get('/available', stayController.filterAvailablePlaces); // Filter available stays
router.get('/available-by-date', stayController.filterAvailableByDate); // Filter available stays by date range
router.get('/api/islands-with-stays', stayController.getIslandsWithStays); // Get islands with stays
router.get('/:id', stayController.getStayById); // Get a specific stay by ID
router.post('/', adminProtect, stayController.createStay); // Create a new stay (Admin only)
router.put('/:id', adminProtect, stayController.updateStay); // Update a stay (Admin only)
router.delete('/:id', adminProtect, stayController.deleteStay); // Delete a stay (Admin only)

// Blocked Dates Management
router.post('/:id/block-dates', adminProtect, stayController.addBlockedDates); // Add blocked dates to a stay (Admin only)
router.delete('/:id/block-dates', adminProtect, stayController.removeBlockedDates); // Remove blocked dates from a stay (Admin only)

// Room Management
router.post('/:id/rooms', adminProtect, stayController.addRoomToStay); // Add a new room to a stay (Admin only)
router.put('/:id/rooms/:roomId', adminProtect, stayController.updateRoomInStay); // Update a specific room in a stay (Admin only)
router.delete('/:id/rooms/:roomId', adminProtect, stayController.deleteRoomFromStay); // Delete a specific room from a stay (Admin only)

// Promotions and Policies
router.post('/:id/promotions', adminProtect, stayController.addPromotionToStay); // Add a promotion to a stay (Admin only)
router.delete('/:id/promotions/:promoId', adminProtect, stayController.removePromotionFromStay); // Remove a promotion from a stay (Admin only)
router.put('/:id/policies', adminProtect, stayController.updatePolicies); // Update stay policies (Admin only)

// Accessibility and Tags
router.put('/:id/accessibility', adminProtect, stayController.updateAccessibilityFeatures); // Update accessibility features (Admin only)
router.put('/:id/tags', adminProtect, stayController.updateTags); // Update tags for filtering stays (Admin only)

module.exports = router;
