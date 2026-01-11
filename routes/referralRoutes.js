const express = require('express');
const router = express.Router();
const referralController = require('../controllers/referralController');
const adminReferralController = require('../controllers/adminReferralController');
const { protect, adminProtect } = require('../middleware/authMiddleware');

// ============================================================
// PUBLIC ROUTES - No authentication required
// ============================================================

/**
 * POST /referral/signup
 * Sign up as a referral partner
 */
router.post('/signup', referralController.signupReferralPartner);

/**
 * GET /referral/verify-code/:code
 * Verify if a referral code is valid (called during checkout)
 */
router.get('/verify-code/:code', referralController.verifyReferralCode);

// ============================================================
// REFERRAL PARTNER ROUTES - Authentication required
// ============================================================

/**
 * GET /referral/dashboard?partnerId=xxx
 * Get referral partner dashboard with stats and recent referrals
 */
router.get('/dashboard', referralController.getReferralDashboard);

/**
 * GET /referral/commissions?partnerId=xxx&status=earned&page=1&limit=20
 * Get detailed list of commissions
 */
router.get('/commissions', referralController.getPartnerCommissions);

/**
 * POST /referral/request-payout
 * Request a payout for earned commissions
 */
router.post('/request-payout', referralController.requestPayout);

/**
 * GET /referral/payouts?partnerId=xxx&status=requested&page=1&limit=20
 * Get payout history
 */
router.get('/payouts', referralController.getPayoutHistory);

// ============================================================
// ADMIN ROUTES - Admin authentication required
// ============================================================

/**
 * GET /admin/referral/partners?status=pending&page=1&limit=20
 * Get all referral partner signup requests
 */
router.get('/admin/partners', protect, adminProtect, adminReferralController.getAllReferralPartners);

/**
 * GET /admin/referral/partners/:partnerId
 * Get detailed info about a specific partner
 */
router.get('/admin/partners/:partnerId', protect, adminProtect, adminReferralController.getReferralPartnerDetails);

/**
 * PUT /admin/referral/partners/:partnerId/approve
 * Approve a referral partner signup
 */
router.put('/admin/partners/:partnerId/approve', protect, adminProtect, adminReferralController.approveReferralPartner);

/**
 * PUT /admin/referral/partners/:partnerId/reject
 * Reject a referral partner signup
 */
router.put('/admin/partners/:partnerId/reject', protect, adminProtect, adminReferralController.rejectReferralPartner);

/**
 * PUT /admin/referral/partners/:partnerId/suspend
 * Suspend or reactivate a referral partner
 */
router.put('/admin/partners/:partnerId/suspend', protect, adminProtect, adminReferralController.toggleReferralPartnerStatus);

/**
 * GET /admin/referral/payouts?status=requested&page=1&limit=20
 * Get all payout requests for review
 */
router.get('/admin/payouts', protect, adminProtect, adminReferralController.getAllPayouts);

/**
 * PUT /admin/referral/payouts/:payoutId/approve
 * Approve a payout request
 */
router.put('/admin/payouts/:payoutId/approve', protect, adminProtect, adminReferralController.approvePayout);

/**
 * POST /admin/referral/payouts/:payoutId/process
 * Process payout (send actual money via Stripe or bank)
 */
router.post('/admin/payouts/:payoutId/process', protect, adminProtect, adminReferralController.processPayout);

/**
 * PUT /admin/referral/payouts/:payoutId/complete
 * Mark payout as completed
 */
router.put('/admin/payouts/:payoutId/complete', protect, adminProtect, adminReferralController.completePayout);

module.exports = router;
