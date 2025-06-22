const express = require('express');
const {
  toggleFavoriteOrWishlist,
  getFavoritesOrWishlist,
  checkServiceInList,
  checkServiceAndOptionInList
} = require('../controllers/favoriteWishlistController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Secure routes with `protect`
router.post('/toggle', protect, toggleFavoriteOrWishlist);
router.get('/', protect, getFavoritesOrWishlist);
router.get('/check-service', protect, checkServiceInList);
router.get('/check-service-option', protect, checkServiceAndOptionInList);

module.exports = router;
