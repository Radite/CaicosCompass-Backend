// routes/faqRoutes.js
const express = require('express');
const router = express.Router();
const faqController = require('../controllers/faqController');
const mongoose = require('mongoose');
// Public routes
router.get('/', faqController.getAllFAQs);
router.get('/stats', faqController.getFAQStats);
router.get('/:id', faqController.getFAQById);

// Admin routes
router.post('/', faqController.createFAQ);
router.post('/bulk', faqController.bulkCreateFAQs); // <-- ADD THIS
router.put('/:id', faqController.updateFAQ);
router.delete('/:id', faqController.deleteFAQ);

module.exports = router;

