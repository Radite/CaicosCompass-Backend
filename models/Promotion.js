const mongoose = require('mongoose');

const PromotionSchema = new mongoose.Schema(
  {
    code: { type: String, unique: true, required: true },
    discountType: { type: String, enum: ['percentage', 'fixed'], required: true }, // E.g., 10% off or $10 off
    discountValue: { type: Number, required: true },
    applicableTo: { type: String, enum: ['activity', 'stay', 'dining', 'transportation', 'all'], default: 'all' }, // Scope of the promotion
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    usageLimit: { type: Number, default: 0 }, // Max usage count
    usageCount: { type: Number, default: 0 }, // Track current usage
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Promotion', PromotionSchema);
