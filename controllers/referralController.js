const ReferralPartner = require('../models/ReferralPartner');
const ReferralCommission = require('../models/ReferralCommission');
const ReferralPayout = require('../models/ReferralPayout');
const Booking = require('../models/Booking');

/**
 * Generate a unique referral code (8 chars: 3 letters + 5 numbers)
 */
const generateReferralCode = async () => {
  let code;
  let exists = true;
  
  while (exists) {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const letterPart = Array(3)
      .fill(0)
      .map(() => letters[Math.floor(Math.random() * letters.length)])
      .join('');
    
    const numberPart = Math.floor(10000 + Math.random() * 90000);
    code = `${letterPart}${numberPart}`;
    
    const found = await ReferralPartner.findOne({ referralCode: code });
    exists = !!found;
  }
  
  return code;
};

/**
 * Sign up as a referral partner
 * POST /referral/signup
 */
exports.signupReferralPartner = async (req, res) => {
  try {
    const { name, email, phoneNumber, partnerType, businessName, businessLocation } = req.body;

    // Validation
    if (!name || !email || !partnerType) {
      return res.status(400).json({ 
        success: false, 
        message: 'Name, email, and partner type are required' 
      });
    }

    // Check if email already exists
    const existingPartner = await ReferralPartner.findOne({ email: email.toLowerCase() });
    if (existingPartner) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email already registered as a referral partner' 
      });
    }

    // Generate unique referral code
    const referralCode = await generateReferralCode();

    // Create referral partner
    const partner = new ReferralPartner({
      name,
      email: email.toLowerCase(),
      phoneNumber,
      partnerType,
      businessName,
      businessLocation,
      referralCode,
      status: 'pending'
    });

    await partner.save();

    res.status(201).json({
      success: true,
      message: 'Referral partner signup successful. Awaiting admin approval.',
      data: {
        _id: partner._id,
        name: partner.name,
        email: partner.email,
        referralCode: partner.referralCode,
        status: partner.status
      }
    });
  } catch (error) {
    console.error('Error in signupReferralPartner:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error creating referral partner account',
      error: error.message 
    });
  }
};

/**
 * Get referral partner dashboard
 * GET /referral/dashboard
 * Requires: referralPartnerId in URL or user auth
 */
exports.getReferralDashboard = async (req, res) => {
  try {
    const { partnerId } = req.query;

    if (!partnerId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Partner ID is required' 
      });
    }

    // Get partner details
    const partner = await ReferralPartner.findById(partnerId).select('-bankDetails');
    
    if (!partner) {
      return res.status(404).json({ 
        success: false, 
        message: 'Referral partner not found' 
      });
    }

    if (partner.status !== 'approved') {
      return res.status(403).json({ 
        success: false, 
        message: 'Partner account not yet approved' 
      });
    }

    // Get commission statistics
    const commissionStats = await ReferralCommission.aggregate([
      {
        $match: {
          referralPartner: partner._id
        }
      },
      {
        $group: {
          _id: null,
          totalEarned: {
            $sum: {
              $cond: [
                { $in: ['$status', ['earned', 'requested', 'paid']] },
                '$commissionAmount',
                0
              ]
            }
          },
          pendingCount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'pending'] }, 1, 0]
            }
          },
          pendingAmount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'pending'] }, '$commissionAmount', 0]
            }
          },
          requestedAmount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'requested'] }, '$commissionAmount', 0]
            }
          },
          paidAmount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'paid'] }, '$commissionAmount', 0]
            }
          }
        }
      }
    ]);

    const stats = commissionStats[0] || {
      totalEarned: 0,
      pendingCount: 0,
      pendingAmount: 0,
      requestedAmount: 0,
      paidAmount: 0
    };

    // Get recent referrals (last 10)
    const recentReferrals = await ReferralCommission.find({
      referralPartner: partner._id
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('bookingDetails commissionAmount status earnedDate createdAt');

    // Get monthly revenue data (last 12 months)
    const monthlyData = await ReferralCommission.aggregate([
      {
        $match: {
          referralPartner: partner._id,
          status: { $in: ['earned', 'requested', 'paid'] }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$earnedDate' },
            month: { $month: '$earnedDate' }
          },
          revenue: { $sum: '$commissionAmount' },
          bookings: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': -1, '_id.month': -1 }
      },
      {
        $limit: 12
      }
    ]);

    res.json({
      success: true,
      data: {
        partner: {
          _id: partner._id,
          name: partner.name,
          email: partner.email,
          referralCode: partner.referralCode,
          partnerType: partner.partnerType,
          businessName: partner.businessName,
          businessLocation: partner.businessLocation,
          commissionPercentage: partner.commissionPercentage,
          status: partner.status,
          createdAt: partner.createdAt
        },
        statistics: {
          totalReferrals: partner.totalReferrals,
          totalEarned: stats.totalEarned,
          pendingAmount: stats.pendingAmount,
          requestedAmount: stats.requestedAmount,
          paidAmount: stats.paidAmount,
          pendingCommissions: stats.pendingCount
        },
        recentReferrals,
        monthlyData
      }
    });
  } catch (error) {
    console.error('Error in getReferralDashboard:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching dashboard data',
      error: error.message 
    });
  }
};

/**
 * Get detailed commissions for a partner
 * GET /referral/commissions
 */
exports.getPartnerCommissions = async (req, res) => {
  try {
    const { partnerId, status, page = 1, limit = 20 } = req.query;

    if (!partnerId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Partner ID is required' 
      });
    }

    const query = { referralPartner: partnerId };
    if (status) {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    const commissions = await ReferralCommission.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await ReferralCommission.countDocuments(query);

    res.json({
      success: true,
      data: commissions,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error in getPartnerCommissions:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching commissions',
      error: error.message 
    });
  }
};

/**
 * Request a payout
 * POST /referral/request-payout
 */
exports.requestPayout = async (req, res) => {
  try {
    const { partnerId, amount } = req.body;

    if (!partnerId || !amount) {
      return res.status(400).json({ 
        success: false, 
        message: 'Partner ID and amount are required' 
      });
    }

    // Get partner
    const partner = await ReferralPartner.findById(partnerId);
    
    if (!partner) {
      return res.status(404).json({ 
        success: false, 
        message: 'Partner not found' 
      });
    }

    // Get available commissions to request
    const availableCommissions = await ReferralCommission.find({
      referralPartner: partnerId,
      status: 'earned'
    });

    const availableAmount = availableCommissions.reduce(
      (sum, comm) => sum + comm.commissionAmount, 
      0
    );

    if (amount > availableAmount) {
      return res.status(400).json({ 
        success: false, 
        message: `Requested amount exceeds available commission. Available: $${availableAmount.toFixed(2)}` 
      });
    }

    // Get commissions to include in this payout (up to the requested amount)
    const commissionsToInclude = [];
    let runningTotal = 0;

    for (const commission of availableCommissions) {
      if (runningTotal >= amount) break;
      commissionsToInclude.push(commission._id);
      runningTotal += commission.commissionAmount;
    }

    // Create payout request
    const payout = new ReferralPayout({
      referralPartner: partnerId,
      amount: runningTotal,
      commissions: commissionsToInclude,
      payoutMethod: partner.payoutMethod,
      status: 'requested'
    });

    await payout.save();

    // Update commission statuses to 'requested'
    await ReferralCommission.updateMany(
      { _id: { $in: commissionsToInclude } },
      { status: 'requested', requestedDate: new Date() }
    );

    // Update partner stats
    await ReferralPartner.findByIdAndUpdate(
      partnerId,
      {
        totalPayoutsRequested: (partner.totalPayoutsRequested || 0) + 1,
        pendingCommission: Math.max(0, partner.pendingCommission - runningTotal)
      }
    );

    res.status(201).json({
      success: true,
      message: 'Payout request submitted successfully',
      data: {
        payoutId: payout._id,
        amount: payout.amount,
        status: payout.status,
        createdAt: payout.createdAt
      }
    });
  } catch (error) {
    console.error('Error in requestPayout:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error requesting payout',
      error: error.message 
    });
  }
};

/**
 * Get payout history
 * GET /referral/payouts
 */
exports.getPayoutHistory = async (req, res) => {
  try {
    const { partnerId, status, page = 1, limit = 20 } = req.query;

    if (!partnerId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Partner ID is required' 
      });
    }

    const query = { referralPartner: partnerId };
    if (status) {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    const payouts = await ReferralPayout.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('referralPartner', 'name email');

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
    console.error('Error in getPayoutHistory:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching payout history',
      error: error.message 
    });
  }
};

/**
 * Verify referral code exists
 * GET /referral/verify-code/:code
 */
exports.verifyReferralCode = async (req, res) => {
  try {
    const { code } = req.params;

    const partner = await ReferralPartner.findOne({
      referralCode: code.toUpperCase(),
      status: 'approved',
      isActive: true
    }).select('_id referralCode commissionPercentage');

    if (!partner) {
      return res.json({
        success: false,
        valid: false,
        message: 'Referral code not found or not active'
      });
    }

    res.json({
      success: true,
      valid: true,
      data: {
        partnerName: partner._id,
        commissionPercentage: partner.commissionPercentage
      }
    });
  } catch (error) {
    console.error('Error in verifyReferralCode:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error verifying referral code',
      error: error.message 
    });
  }
};
