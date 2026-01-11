const ReferralPartner = require('../models/ReferralPartner');
const ReferralCommission = require('../models/ReferralCommission');
const ReferralPayout = require('../models/ReferralPayout');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

/**
 * Get all referral partner signup requests
 * GET /admin/referral/partners
 */
exports.getAllReferralPartners = async (req, res) => {
  try {
    const { status = 'pending', page = 1, limit = 20 } = req.query;

    const query = {};
    if (status) {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    const partners = await ReferralPartner.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-bankDetails');

    const total = await ReferralPartner.countDocuments(query);

    res.json({
      success: true,
      data: partners,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error in getAllReferralPartners:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching referral partners',
      error: error.message 
    });
  }
};

/**
 * Get partner details
 * GET /admin/referral/partners/:partnerId
 */
exports.getReferralPartnerDetails = async (req, res) => {
  try {
    const { partnerId } = req.params;

    const partner = await ReferralPartner.findById(partnerId);
    
    if (!partner) {
      return res.status(404).json({ 
        success: false, 
        message: 'Partner not found' 
      });
    }

    // Get commission stats
    const stats = await ReferralCommission.aggregate([
      {
        $match: {
          referralPartner: partner._id
        }
      },
      {
        $group: {
          _id: null,
          totalCommissions: { $sum: '$commissionAmount' },
          totalReferrals: { $sum: 1 },
          pendingAmount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'pending'] }, '$commissionAmount', 0]
            }
          },
          earnedAmount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'earned'] }, '$commissionAmount', 0]
            }
          }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        partner,
        stats: stats[0] || {
          totalCommissions: 0,
          totalReferrals: 0,
          pendingAmount: 0,
          earnedAmount: 0
        }
      }
    });
  } catch (error) {
    console.error('Error in getReferralPartnerDetails:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching partner details',
      error: error.message 
    });
  }
};

/**
 * Approve referral partner signup
 * PUT /admin/referral/partners/:partnerId/approve
 */
exports.approveReferralPartner = async (req, res) => {
  try {
    const { partnerId } = req.params;
    const { notes } = req.body;

    const partner = await ReferralPartner.findByIdAndUpdate(
      partnerId,
      {
        status: 'approved',
        approvedAt: new Date(),
        adminNotes: notes || null
      },
      { new: true }
    );

    if (!partner) {
      return res.status(404).json({ 
        success: false, 
        message: 'Partner not found' 
      });
    }

    // TODO: Send approval email to partner
    // const emailService = require('../services/emailService');
    // await emailService.sendReferralPartnerApprovalEmail(partner);

    res.json({
      success: true,
      message: 'Referral partner approved successfully',
      data: partner
    });
  } catch (error) {
    console.error('Error in approveReferralPartner:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error approving referral partner',
      error: error.message 
    });
  }
};

/**
 * Reject referral partner signup
 * PUT /admin/referral/partners/:partnerId/reject
 */
exports.rejectReferralPartner = async (req, res) => {
  try {
    const { partnerId } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ 
        success: false, 
        message: 'Rejection reason is required' 
      });
    }

    const partner = await ReferralPartner.findByIdAndUpdate(
      partnerId,
      {
        status: 'rejected',
        adminNotes: reason
      },
      { new: true }
    );

    if (!partner) {
      return res.status(404).json({ 
        success: false, 
        message: 'Partner not found' 
      });
    }

    // TODO: Send rejection email to partner
    // const emailService = require('../services/emailService');
    // await emailService.sendReferralPartnerRejectionEmail(partner, reason);

    res.json({
      success: true,
      message: 'Referral partner rejected',
      data: partner
    });
  } catch (error) {
    console.error('Error in rejectReferralPartner:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error rejecting referral partner',
      error: error.message 
    });
  }
};

/**
 * Suspend/unsuspend referral partner
 * PUT /admin/referral/partners/:partnerId/suspend
 */
exports.toggleReferralPartnerStatus = async (req, res) => {
  try {
    const { partnerId } = req.params;
    const { suspend, reason } = req.body;

    const partner = await ReferralPartner.findById(partnerId);
    
    if (!partner) {
      return res.status(404).json({ 
        success: false, 
        message: 'Partner not found' 
      });
    }

    const newStatus = suspend ? 'suspended' : 'approved';
    
    partner.status = newStatus;
    if (suspend) {
      partner.adminNotes = reason || 'Suspended by admin';
    }
    
    await partner.save();

    res.json({
      success: true,
      message: `Referral partner ${suspend ? 'suspended' : 'reactivated'}`,
      data: partner
    });
  } catch (error) {
    console.error('Error in toggleReferralPartnerStatus:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating partner status',
      error: error.message 
    });
  }
};

/**
 * Approve payout request
 * PUT /admin/referral/payouts/:payoutId/approve
 */
exports.approvePayout = async (req, res) => {
  try {
    const { payoutId } = req.params;
    const { notes } = req.body;

    const payout = await ReferralPayout.findById(payoutId);
    
    if (!payout) {
      return res.status(404).json({ 
        success: false, 
        message: 'Payout not found' 
      });
    }

    payout.status = 'approved';
    payout.approvedAt = new Date();
    payout.adminNotes = notes || null;
    
    await payout.save();

    res.json({
      success: true,
      message: 'Payout approved',
      data: payout
    });
  } catch (error) {
    console.error('Error in approvePayout:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error approving payout',
      error: error.message 
    });
  }
};

/**
 * Process payout (send actual money)
 * POST /admin/referral/payouts/:payoutId/process
 */
exports.processPayout = async (req, res) => {
  try {
    const { payoutId } = req.params;

    const payout = await ReferralPayout.findById(payoutId)
      .populate('referralPartner');
    
    if (!payout) {
      return res.status(404).json({ 
        success: false, 
        message: 'Payout not found' 
      });
    }

    if (payout.status !== 'approved') {
      return res.status(400).json({ 
        success: false, 
        message: 'Payout must be approved before processing' 
      });
    }

    const partner = payout.referralPartner;

    // Process based on payout method
    if (payout.payoutMethod === 'stripe_connect') {
      if (!partner.stripeConnectId) {
        return res.status(400).json({ 
          success: false, 
          message: 'Partner does not have Stripe Connect account configured' 
        });
      }

      // Create Stripe transfer
      try {
        const transfer = await stripe.transfers.create({
          amount: Math.round(payout.amount * 100), // Convert to cents
          currency: 'usd',
          destination: partner.stripeConnectId,
          description: `Referral commission payout for ${partner.name}`
        });

        payout.status = 'processing';
        payout.processedAt = new Date();
        payout.stripeTransferId = transfer.id;
        await payout.save();

        res.json({
          success: true,
          message: 'Payout processing initiated',
          data: payout
        });
      } catch (stripeError) {
        console.error('Stripe transfer error:', stripeError);
        return res.status(500).json({
          success: false,
          message: 'Error processing Stripe transfer',
          error: stripeError.message
        });
      }
    } else {
      // Manual payout (bank transfer) - just mark as processing
      payout.status = 'processing';
      payout.processedAt = new Date();
      await payout.save();

      res.json({
        success: true,
        message: 'Payout marked for manual processing',
        data: payout
      });
    }
  } catch (error) {
    console.error('Error in processPayout:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error processing payout',
      error: error.message 
    });
  }
};

/**
 * Mark payout as completed
 * PUT /admin/referral/payouts/:payoutId/complete
 */
exports.completePayout = async (req, res) => {
  try {
    const { payoutId } = req.params;
    const { transactionId, notes } = req.body;

    const payout = await ReferralPayout.findById(payoutId);
    
    if (!payout) {
      return res.status(404).json({ 
        success: false, 
        message: 'Payout not found' 
      });
    }

    payout.status = 'completed';
    payout.completedAt = new Date();
    if (transactionId) {
      payout.bankTransferDetails = { transactionId };
    }
    payout.notes = notes || null;
    
    await payout.save();

    // Update commission statuses to 'paid'
    await ReferralCommission.updateMany(
      { _id: { $in: payout.commissions } },
      { 
        status: 'paid',
        paidDate: new Date()
      }
    );

    // Update partner stats
    const partner = await ReferralPartner.findById(payout.referralPartner);
    if (partner) {
      partner.totalPayoutsCompleted = (partner.totalPayoutsCompleted || 0) + 1;
      partner.lastPayoutDate = new Date();
      await partner.save();
    }

    res.json({
      success: true,
      message: 'Payout marked as completed',
      data: payout
    });
  } catch (error) {
    console.error('Error in completePayout:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error completing payout',
      error: error.message 
    });
  }
};

/**
 * Get all pending payout requests
 * GET /admin/referral/payouts
 */
exports.getAllPayouts = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const query = {};
    if (status) {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    const payouts = await ReferralPayout.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('referralPartner', 'name email referralCode');

    const total = await ReferralPayout.countDocuments(query);

    res.json({
      success: true,
      data: payouts,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error in getAllPayouts:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching payouts',
      error: error.message 
    });
  }
};
