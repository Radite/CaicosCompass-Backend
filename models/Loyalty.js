const mongoose = require('mongoose');

const LoyaltySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    points: { type: Number, default: 0 },
    tier: { type: String, enum: ['Bronze', 'Silver', 'Gold', 'Platinum'], default: 'Bronze' },
    rewards: [
      {
        title: { type: String },
        description: { type: String },
        pointsRequired: { type: Number },
        redeemed: { type: Boolean, default: false },
        redeemedAt: { type: Date },
      }
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Loyalty', LoyaltySchema);
