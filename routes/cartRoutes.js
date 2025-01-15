// cartRoutes.js
const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const authMiddleware = require('../middleware/authMiddleware');

// Routes for Cart Management
router.post('/', authMiddleware.protect, cartController.addToCart); // Add item to cart
router.get('/', authMiddleware.protect, cartController.getCart); // Get user's cart
router.delete('/:id', authMiddleware.protect, cartController.removeFromCart); // Remove item from cart
router.put('/:id', authMiddleware.protect, cartController.updateCartItem); // Update cart item (quantity, etc.)
router.post('/checkout', authMiddleware.protect, cartController.checkout); // Checkout and create booking

module.exports = router;

