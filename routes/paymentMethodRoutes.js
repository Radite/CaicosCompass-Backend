const express = require('express');
const router = express.Router();
const paymentMethodController = require('../controllers/paymentMethodController');

// FIX: Import 'protect' instead of 'authenticateToken'
const { protect: authenticateToken } = require('../middleware/authMiddleware');

// Note: You can either alias it as I did above (protect: authenticateToken)
// OR just import { protect } and change the variable name in the routes below.

// POST routes
router.post('/setup-intent', authenticateToken, paymentMethodController.createSetupIntent);
router.post('/confirm', authenticateToken, paymentMethodController.confirmPaymentMethod);
router.post('/charge', authenticateToken, paymentMethodController.chargePaymentMethod);

// GET routes
router.get('/', authenticateToken, paymentMethodController.getPaymentMethods);
router.get('/default', authenticateToken, paymentMethodController.getDefaultPaymentMethod);

// PATCH route
router.patch('/:paymentMethodId', authenticateToken, paymentMethodController.updatePaymentMethod);

// DELETE route
router.delete('/:paymentMethodId', authenticateToken, paymentMethodController.deletePaymentMethod);

module.exports = router;