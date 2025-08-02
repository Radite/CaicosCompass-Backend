// routes/uploadRoutes.js
const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');
const { protect } = require('../middleware/authMiddleware');

// Apply authentication to all upload routes
router.use(protect);

// Single image upload
router.post('/image', 
  uploadController.upload.single('image'), 
  uploadController.uploadSingleImage
);

// Multiple images upload
router.post('/images', 
  uploadController.upload.array('images', 10), // Max 10 images
  uploadController.uploadMultipleImages
);

// Delete image
router.delete('/image/:filename', uploadController.deleteImage);

module.exports = router;