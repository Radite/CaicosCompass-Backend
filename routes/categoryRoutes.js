// routes/categoryRoutes.js
const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');

// Public routes
router.get('/', categoryController.getAllCategories);
router.get('/:id', categoryController.getCategoryById);

// Admin routes
router.post('/', categoryController.createCategory);
router.post('/bulk', categoryController.bulkCreateCategories); // <-- ADD THIS
router.put('/:id', categoryController.updateCategory);
router.delete('/:id', categoryController.deleteCategory);


module.exports = router;

