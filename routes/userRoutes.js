const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');

// Authentication
router.post('/register', userController.registerUser); // Register a new user
router.post('/login', userController.loginUser); // Login with email and password
router.post('/logout', authMiddleware.protect, userController.logoutUser); // Logout the user
// Google OAuth
router.get('/auth/google', userController.googleLogin);
router.get('/auth/google/callback', userController.googleCallback);

// Facebook OAuth
router.get('/auth/facebook', userController.facebookLogin);
router.get('/auth/facebook/callback', userController.facebookCallback);

// Apple OAuth
router.get('/auth/apple', userController.appleLogin);
router.get('/auth/apple/callback', userController.appleCallback);

// Forgot password route
router.post('/refresh', userController.refreshToken);
// Reset password verification route (GET)

// Post reset password route (POST)
router.post('/resend-verification', userController.resendVerificationEmail);
router.get('/verify-email', userController.verifyEmail);

// User Profile
router.get('/me', authMiddleware.protect, userController.getProfile); // Get the logged-in user's profile
router.put('/me', authMiddleware.protect, userController.updateProfile); // Update the logged-in user's profile
router.get('/:id/email', userController.getUserEmail);

// Deactivate Account
router.put('/me/deactivate', authMiddleware.protect, userController.deactivateAccount);
router.put('/me/reactivate', authMiddleware.protect, userController.reactivateAccount);

// Delete Account
router.delete('/me', authMiddleware.protect, userController.deleteAccount);

// Favorites and Wishlist
router.get('/favorites', authMiddleware.protect, userController.getFavorites); // Get the user's favorite activities
router.post('/favorites', authMiddleware.protect, userController.toggleFavorite); // Add or remove a favorite activity
router.get('/wishlist', authMiddleware.protect, userController.getWishlist); // Get the user's wishlist
router.post('/wishlist', authMiddleware.protect, userController.toggleWishlist); // Add or remove an activity from the wishlist

// Notifications
router.get('/notifications', authMiddleware.protect, userController.getNotifications); // Get all notifications
router.put('/notifications/:id', authMiddleware.protect, userController.markNotificationRead); // Mark a notification as read

// Host Management
router.put(
  '/host/:id',
  authMiddleware.protect,
  authMiddleware.adminProtect, // Only admins can update host details
  userController.updateHostDetails
);

// Reviews
router.get('/reviews/:userId', userController.getUserReviews); // Get reviews for a specific user (host)
router.post(
  '/reviews/:hostId',
  authMiddleware.protect, // Logged-in users can add reviews
  userController.addReview
);
router.delete(
  '/reviews/:reviewId',
  authMiddleware.protect, // Logged-in users can delete their own reviews
  userController.deleteReview
);

// Referral Program
router.get(
  '/referrals',
  authMiddleware.protect, // Only logged-in users can access referral details
  userController.getReferrals
);
router.post(
  '/referrals',
  authMiddleware.protect, // Only logged-in users can add referrals
  userController.addReferral
);

// Privacy Settings
router.get(
  '/privacy',
  authMiddleware.protect, // Only logged-in users can access privacy settings
  userController.getPrivacySettings
);
router.put(
  '/privacy',
  authMiddleware.protect, // Only logged-in users can update privacy settings
  userController.updatePrivacySettings
);

// Admin Only Routes
router.get(
  '/all-users',
  authMiddleware.protect,
  authMiddleware.adminProtect, // Only admins can get all users
  userController.getAllUsers
);
router.delete(
  '/user/:id',
  authMiddleware.protect,
  authMiddleware.adminProtect, // Only admins can delete a user
  userController.deleteUser
);
router.put(
  '/user/:id',
  authMiddleware.protect,
  authMiddleware.adminProtect, // Only admins can update a user's role
  userController.updateUserRole
);

// Business Manager Routes
router.get(
  '/business-dashboard',
  authMiddleware.protect,
  authMiddleware.businessManagerProtect, // Only business managers can access the business dashboard
  userController.getBusinessDashboard
);
router.post(
  '/manage-listings',
  authMiddleware.protect,
  authMiddleware.businessManagerProtect, // Only business managers can manage listings
  userController.manageListings
);

router.get('/caicos-credits', authMiddleware.protect, userController.getCaicosCredits);
// added for vendor dashboard error
// Get user profile (needed by vendor dashboard)
router.get('/profile', authMiddleware.protect, userController.getProfile);

// Update business profile  
router.put('/business-profile', authMiddleware.protect, authMiddleware.businessManagerProtect, userController.updateBusinessProfile);

// Change password
router.put('/change-password', authMiddleware.protect, userController.changePassword);
// Add these lines to routes/userRoutes.js (after line where change-password route is)
router.post('/verify-password', authMiddleware.protect, userController.verifyPassword);
router.post('/decrypted-payment-info', authMiddleware.protect, authMiddleware.businessManagerProtect, userController.getDecryptedPaymentInfo);

router.get('/verify-code/:code', async (req, res) => {
    try {
        const { code } = req.params;
        const user = await User.findOne({ 
            referralCode: code.toUpperCase().trim()
        });
        
        if (!user) {
            return res.status(200).json({
                success: false,
                valid: false,
                message: 'Referral code not found or not active'
            });
        }
        
        return res.status(200).json({
            success: true,
            valid: true,
            data: {
                userId: user._id,
                userName: user.name,
                referralCode: user.referralCode,
                discountPercentage: 2.5,
                commissionPercentage: 5
            }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            valid: false,
            message: 'Error verifying referral code'
        });
    }
});
module.exports = router;

