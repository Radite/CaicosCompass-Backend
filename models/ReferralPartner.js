const mongoose = require('mongoose');

const ReferralPartnerSchema = new mongoose.Schema({
  // Basic Info
  name: { 
    type: String, 
    required: true 
  },
  email: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true,
    trim: true
  },
  phoneNumber: { 
    type: String, 
    default: null 
  },
  
  // Referral Code (unique identifier for customers)
  referralCode: { 
    type: String, 
    required: true, 
    unique: true,
    uppercase: true,
    index: true
  },
  
  // Partner Type: concierge, taxi-driver, travel-agent, hotel-staff, other
  partnerType: { 
    type: String, 
    enum: ['concierge', 'taxi-driver', 'travel-agent', 'hotel-staff', 'other'],
    required: true
  },
  
  // Business Info (if applicable)
  businessName: { 
    type: String, 
    default: null 
  },
  businessLocation: { 
    type: String, 
    default: null 
  },
  
  // Commission Structure
  commissionPercentage: { 
    type: Number, 
    default: 5,  // 5% default, can be adjusted per partner
    min: 0,
    max: 100
  },
  
  // Status
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected', 'suspended'],
    default: 'pending'
  },
  
  // Payout Information (Stripe Connect Account ID)
  stripeConnectId: { 
    type: String, 
    default: null 
  },
  payoutMethod: {
    type: String,
    enum: ['stripe_connect', 'bank_transfer', 'manual'],
    default: 'stripe_connect'
  },
  
  // Banking info for manual payouts
  bankDetails: {
    accountHolder: String,
    accountNumber: String,  // Store encrypted in production
    routingNumber: String,  // Store encrypted in production
    bankName: String
  },
  
  // Statistics
  totalReferrals: { 
    type: Number, 
    default: 0,
    index: true
  },
  totalCommissionEarned: { 
    type: Number, 
    default: 0 
  },
  pendingCommission: { 
    type: Number, 
    default: 0 
  },
  totalPayoutsRequested: { 
    type: Number, 
    default: 0 
  },
  totalPayoutsCompleted: { 
    type: Number, 
    default: 0 
  },
  
  // Timestamps
  createdAt: { 
    type: Date, 
    default: Date.now,
    index: true
  },
  approvedAt: { 
    type: Date, 
    default: null 
  },
  lastPayoutDate: { 
    type: Date, 
    default: null 
  },
  
  // Notes (for admin)
  adminNotes: { 
    type: String, 
    default: null 
  },
  
  // Metadata
  isActive: { 
    type: Boolean, 
    default: true 
  }
}, { timestamps: true });

// Index for finding by referral code
ReferralPartnerSchema.index({ referralCode: 1 });
ReferralPartnerSchema.index({ status: 1, isActive: 1 });
ReferralPartnerSchema.index({ createdAt: -1 });

module.exports = mongoose.model('ReferralPartner', ReferralPartnerSchema);
