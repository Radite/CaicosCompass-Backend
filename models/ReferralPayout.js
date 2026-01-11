const mongoose = require('mongoose');

const ReferralPayoutSchema = new mongoose.Schema({
  // Reference to the referral partner requesting payout
  referralPartner: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'ReferralPartner',
    required: true,
    index: true
  },
  
  // Payout Details
  amount: { 
    type: Number, 
    required: true,
    min: 0
  },
  
  // Which commissions are included in this payout
  commissions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ReferralCommission'
  }],
  
  // Status
  status: { 
    type: String, 
    enum: ['requested', 'approved', 'processing', 'completed', 'failed', 'cancelled'],
    default: 'requested',
    index: true
  },
  
  // Payout method used
  payoutMethod: {
    type: String,
    enum: ['stripe_connect', 'bank_transfer', 'manual'],
    required: true
  },
  
  // Stripe details (if using Stripe Connect)
  stripeTransferId: { 
    type: String,
    default: null
  },
  stripePayoutId: { 
    type: String,
    default: null
  },
  
  // Bank transfer details
  bankTransferDetails: {
    referenceNumber: String,
    transactionId: String
  },
  
  // Timeline
  requestedAt: { 
    type: Date, 
    default: Date.now
  },
  approvedAt: { 
    type: Date,
    default: null
  },
  processedAt: { 
    type: Date,
    default: null
  },
  completedAt: { 
    type: Date,
    default: null
  },
  
  // Notes
  notes: { 
    type: String,
    default: null
  },
  adminNotes: { 
    type: String,
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

// Index for finding payouts by partner
ReferralPayoutSchema.index({ referralPartner: 1, status: 1 });
ReferralPayoutSchema.index({ referralPartner: 1, createdAt: -1 });

module.exports = mongoose.model('ReferralPayout', ReferralPayoutSchema);
