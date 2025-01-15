const express = require('express');
const router = express.Router();
const activityController = require('../controllers/activityController');
const authMiddleware = require('../middleware/authMiddleware');

// Fetch all activities
router.get('/', activityController.getAllActivities);

// Fetch a specific activity
router.get('/:id', activityController.getActivityById);

// Create, Update, and Delete Activities (Admin Only)
router.post('/', authMiddleware.adminProtect, activityController.createActivity);
router.put('/:id', authMiddleware.adminProtect, activityController.updateActivity);
router.delete('/:id', authMiddleware.adminProtect, activityController.deleteActivity);

// Suboptions Management (Admin Only)
router.post('/:id/options', authMiddleware.adminProtect, activityController.addSuboption);
router.put('/:id/options/:optionId', authMiddleware.adminProtect, activityController.updateSuboption);
router.delete('/:id/options/:optionId', authMiddleware.adminProtect, activityController.deleteSuboption);

// Deals and Tags
router.get('/deals/active', activityController.getActiveDeals);
router.get('/tags/:tag', activityController.getActivitiesByTag);

// Filters and Search
router.get('/filters', activityController.getActivityFilters);
router.get('/search', activityController.searchActivities);

// Recommendations
router.get('/recommended', activityController.getRecommended);
router.get('/recommended/:category', authMiddleware.protect, activityController.getRecommendedByCategory);

module.exports = router;
