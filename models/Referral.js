const mongoose = require('mongoose');

const ReferralSchema = new mongoose.Schema(
  {
    referrer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // User who referred
    referee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // User who was referred
    reward: { type: Number, default: 0 }, // Points or monetary reward
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Referral', ReferralSchema);
