const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const authMiddleware = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authMiddleware.protect);

// Cart management routes
router.get('/', cartController.getCart); // Get user's cart
router.post('/', cartController.addToCart); // Add item to cart
router.put('/:id', cartController.updateCartItem); // Update cart item
router.delete('/:id', cartController.removeFromCart); // Remove item from cart
router.delete('/', cartController.clearCart); // Clear entire cart

// Checkout
router.post('/checkout', cartController.checkout); // Create bookings from cart

module.exports = router;