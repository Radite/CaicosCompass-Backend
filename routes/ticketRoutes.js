const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const { protect, adminProtect } = require('../middleware/authMiddleware');

// Public routes - anyone can submit a ticket
router.post(
  '/',
  ticketController.validateTicket,
  ticketController.createTicket
);

// Protected routes - require authentication
router.get(
  '/:ticketNumber',
  ticketController.getTicket
);

// Admin only routes
router.get(
  '/',
  adminProtect,
  ticketController.getAllTickets
);

router.patch(
  '/:ticketNumber',
  adminProtect,
  ticketController.updateTicketStatus
);

router.get(
  '/admin/statistics',
  adminProtect,
  ticketController.getTicketStats
);

module.exports = router;