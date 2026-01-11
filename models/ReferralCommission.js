const mongoose = require('mongoose');

const ReferralCommissionSchema = new mongoose.Schema({
  // Reference to the referral partner who earned this commission
  referralPartner: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'ReferralPartner',
    required: true,
    index: true
  },
  
  // Reference to the booking that generated this commission
  booking: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Booking',
    required: true,
    index: true
  },
  
  // Commission Details
  commissionPercentage: { 
    type: Number, 
    required: true,
    default: 5
  },
  bookingAmount: { 
    type: Number, 
    required: true 
  },
  commissionAmount: { 
    type: Number, 
    required: true 
  },
  
  // Status of this commission
  status: { 
    type: String, 
    enum: ['pending', 'earned', 'requested', 'paid', 'refunded'],
    default: 'pending',
    index: true
  },
  
  // Booking details for reference
  bookingDetails: {
    serviceType: String,  // Activity, Stay, Dining, Transportation
    serviceName: String,
    vendor: mongoose.Schema.Types.ObjectId,
    touristName: String,
    touristEmail: String
  },
  
  // Referral code used
  referralCode: { 
    type: String,
    index: true
  },
  
  // Status changes and timeline
  earnedDate: { 
    type: Date,
    default: null
  },
  requestedDate: { 
    type: Date,
    default: null
  },
  paidDate: { 
    type: Date,
    default: null
  },
  refundedDate: { 
    type: Date,
    default: null
  },
  
  // Payout reference
  payoutId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'ReferralPayout',
    default: null
  },
  
  // Timestamps
  createdAt: { 
    type: Date, 
    default: Date.now,
    index: true
  },
  updatedAt: { 
    type: Date, 
    default: Date.now
  }
}, { timestamps: true });

// Index for finding commissions by referral partner
ReferralCommissionSchema.index({ referralPartner: 1, status: 1 });
ReferralCommissionSchema.index({ referralPartner: 1, createdAt: -1 });

module.exports = mongoose.model('ReferralCommission', ReferralCommissionSchema);
