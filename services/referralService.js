const ReferralPartner = require('../models/ReferralPartner');
const ReferralCommission = require('../models/ReferralCommission');

/**
 * Create referral commission when a booking is completed
 * Called from booking webhook/completion logic
 */
exports.createCommissionFromBooking = async (booking, referralCode) => {
  try {
    // Validate inputs
    if (!booking || !booking._id) {
      console.error('Invalid booking provided to createCommissionFromBooking');
      return null;
    }

    if (!referralCode) {
      console.log('No referral code on booking, skipping commission creation');
      return null;
    }

    // Find the referral partner by code
    const partner = await ReferralPartner.findOne({
      referralCode: referralCode.toUpperCase(),
      status: 'approved',
      isActive: true
    });

    if (!partner) {
      console.log(`Referral partner not found for code: ${referralCode}`);
      return null;
    }

    // Get booking amount
    const bookingAmount = booking.pricing?.totalAmount || booking.totalPrice || 0;

    if (bookingAmount <= 0) {
      console.log('Booking has no valid amount, skipping commission');
      return null;
    }

    // Calculate commission
    const commissionPercentage = partner.commissionPercentage || 5;
    const commissionAmount = (bookingAmount * commissionPercentage) / 100;

    // Create commission record
    const commission = new ReferralCommission({
      referralPartner: partner._id,
      booking: booking._id,
      commissionPercentage,
      bookingAmount,
      commissionAmount,
      status: 'pending',
      referralCode: partner.referralCode,
      bookingDetails: {
        serviceType: booking.serviceType || 'Unknown',
        serviceName: booking.serviceName || '',
        vendor: booking.vendor?._id || null,
        touristName: booking.guestName || 'Unknown',
        touristEmail: booking.guestEmail || ''
      }
    });

    await commission.save();

    // Update partner stats
    partner.totalReferrals = (partner.totalReferrals || 0) + 1;
    partner.pendingCommission = (partner.pendingCommission || 0) + commissionAmount;
    await partner.save();

    console.log(`✅ Commission created: $${commissionAmount.toFixed(2)} for partner ${partner.name}`);

    return commission;
  } catch (error) {
    console.error('Error creating referral commission:', error);
    return null;
  }
};

/**
 * Mark commission as earned (when booking is confirmed/completed)
 */
exports.earnCommission = async (commissionId) => {
  try {
    const commission = await ReferralCommission.findByIdAndUpdate(
      commissionId,
      {
        status: 'earned',
        earnedDate: new Date()
      },
      { new: true }
    );

    console.log(`✅ Commission earned: ${commission._id}`);
    return commission;
  } catch (error) {
    console.error('Error earning commission:', error);
    return null;
  }
};

/**
 * Refund commission (when booking is cancelled/refunded)
 */
exports.refundCommission = async (commissionId) => {
  try {
    const commission = await ReferralCommission.findById(commissionId);

    if (!commission) {
      console.error('Commission not found');
      return null;
    }

    // Only refund if not yet paid
    if (['paid', 'requested'].includes(commission.status)) {
      console.log('Cannot refund commission that is already requested/paid');
      return null;
    }

    // Update commission
    commission.status = 'refunded';
    commission.refundedDate = new Date();
    await commission.save();

    // Update partner stats
    const partner = await ReferralPartner.findById(commission.referralPartner);
    if (partner) {
      if (commission.status === 'pending') {
        partner.pendingCommission = Math.max(0, partner.pendingCommission - commission.commissionAmount);
      }
      partner.totalReferrals = Math.max(0, partner.totalReferrals - 1);
      await partner.save();
    }

    console.log(`✅ Commission refunded: ${commission._id}`);
    return commission;
  } catch (error) {
    console.error('Error refunding commission:', error);
    return null;
  }
};

/**
 * Get referral statistics for admin dashboard
 */
exports.getReferralStats = async () => {
  try {
    // Total partners
    const totalPartners = await ReferralPartner.countDocuments({ isActive: true });
    
    // Approved partners
    const approvedPartners = await ReferralPartner.countDocuments({ 
      status: 'approved',
      isActive: true 
    });

    // Pending partners
    const pendingPartners = await ReferralPartner.countDocuments({ 
      status: 'pending' 
    });

    // Commission stats
    const commissionStats = await ReferralCommission.aggregate([
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
          },
          paidAmount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'paid'] }, '$commissionAmount', 0]
            }
          }
        }
      }
    ]);

    // Payout stats
    const payoutStats = await ReferralCommission.aggregate([
      {
        $group: {
          _id: null,
          totalRequested: {
            $sum: {
              $cond: [{ $eq: ['$status', 'requested'] }, '$commissionAmount', 0]
            }
          },
          totalProcessing: {
            $sum: {
              $cond: [{ $eq: ['$status', 'processing'] }, '$commissionAmount', 0]
            }
          }
        }
      }
    ]);

    return {
      partners: {
        total: totalPartners,
        approved: approvedPartners,
        pending: pendingPartners
      },
      commissions: commissionStats[0] || {
        totalCommissions: 0,
        totalReferrals: 0,
        pendingAmount: 0,
        earnedAmount: 0,
        paidAmount: 0
      },
      payouts: payoutStats[0] || {
        totalRequested: 0,
        totalProcessing: 0
      }
    };
  } catch (error) {
    console.error('Error getting referral stats:', error);
    return null;
  }
};
