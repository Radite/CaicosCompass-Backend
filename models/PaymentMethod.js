// models/PaymentMethod.js
const mongoose = require('mongoose');

const PaymentMethodSchema = new mongoose.Schema(
  {
    // Reference to user who owns this payment method
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },

    // Stripe Payment Method ID (pm_*)
    stripePaymentMethodId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },

    // Payment method type
    type: {
      type: String,
      enum: ['card', 'bank_account'],
      required: true
    },

    // Card details (when type === 'card')
    card: {
      brand: String,            // visa, mastercard, amex, discover
      last4: String,            // Last 4 digits
      expiryMonth: Number,      // 1-12
      expiryYear: Number,       // 4-digit year
      holderName: String,
      country: String           // Card issuing country
    },

    // Bank account details (when type === 'bank_account')
    bankAccount: {
      bankName: String,
      last4: String,            // Last 4 digits
      accountHolderName: String,
      country: String
    },

    // Whether this is the default payment method
    isDefault: {
      type: Boolean,
      default: false
    },

    // Whether the payment method is still valid
    isValid: {
      type: Boolean,
      default: true
    },

    // Nickname for easy identification (e.g., "My Visa", "Work Card")
    nickname: String,

    // Metadata from Stripe
    billingDetails: {
      email: String,
      name: String,
      phone: String,
      address: {
        city: String,
        country: String,
        line1: String,
        line2: String,
        postalCode: String,
        state: String
      }
    },

    // When this payment method was saved
    savedAt: {
      type: Date,
      default: Date.now
    },

    // Usage statistics
    usageCount: {
      type: Number,
      default: 0
    },

    lastUsedAt: Date,
    lastUsedForBooking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking'
    },

    // Track if payment method was added during checkout
    addedDuringCheckout: {
      type: Boolean,
      default: false
    },

    // Webhook events tracking
    events: [{
      eventType: String,        // 'charge.succeeded', 'charge.failed', etc.
      stripeEventId: String,
      timestamp: { type: Date, default: Date.now }
    }]
  },
  { timestamps: true }
);

// Index for efficient queries
PaymentMethodSchema.index({ user: 1, isDefault: 1 });
PaymentMethodSchema.index({ user: 1, isValid: 1 });
PaymentMethodSchema.index({ user: 1, createdAt: -1 });

// Pre-save: Ensure only one default per user
PaymentMethodSchema.pre('save', async function(next) {
  if (this.isDefault) {
    await this.constructor.updateMany(
      { user: this.user, _id: { $ne: this._id } },
      { isDefault: false }
    );
  }
  next();
});

// Method: Get masked card info for display
PaymentMethodSchema.methods.getMaskedDisplay = function() {
  if (this.type === 'card') {
    return {
      type: this.type,
      display: `${this.card.brand.toUpperCase()} ending in ${this.card.last4}`,
      brand: this.card.brand,
      last4: this.card.last4,
      expiryMonth: this.card.expiryMonth,
      expiryYear: this.card.expiryYear,
      nickname: this.nickname,
      isDefault: this.isDefault
    };
  } else if (this.type === 'bank_account') {
    return {
      type: this.type,
      display: `${this.bankAccount.bankName} ending in ${this.bankAccount.last4}`,
      bankName: this.bankAccount.bankName,
      last4: this.bankAccount.last4,
      nickname: this.nickname,
      isDefault: this.isDefault
    };
  }
};

// Method: Mark as used
PaymentMethodSchema.methods.recordUsage = function(bookingId = null) {
  this.usageCount = (this.usageCount || 0) + 1;
  this.lastUsedAt = new Date();
  if (bookingId) {
    this.lastUsedForBooking = bookingId;
  }
  return this.save();
};

// Static method: Get user's payment methods
PaymentMethodSchema.statics.getUserPaymentMethods = async function(userId, options = {}) {
  const query = { user: userId, isValid: true };
  
  if (options.onlyDefault) {
    query.isDefault = true;
  }
  
  const methods = await this.find(query)
    .sort(options.onlyDefault ? {} : { isDefault: -1, createdAt: -1 })
    .lean();
  
  return methods.map(method => ({
    _id: method._id,
    ...method.getMaskedDisplay?.()
  }));
};

// Static method: Get default payment method
PaymentMethodSchema.statics.getDefaultPaymentMethod = async function(userId) {
  return this.findOne({ user: userId, isDefault: true, isValid: true });
};

// Static method: Set new default payment method
PaymentMethodSchema.statics.setDefaultPaymentMethod = async function(userId, paymentMethodId) {
  // Remove current default
  await this.updateMany(
    { user: userId, isDefault: true },
    { isDefault: false }
  );
  
  // Set new default
  const updated = await this.findByIdAndUpdate(
    paymentMethodId,
    { isDefault: true },
    { new: true }
  );
  
  if (!updated || updated.user.toString() !== userId) {
    throw new Error('Payment method not found or does not belong to user');
  }
  
  return updated;
};

// Static method: Delete payment method
PaymentMethodSchema.statics.deletePaymentMethod = async function(userId, paymentMethodId) {
  const method = await this.findById(paymentMethodId);
  
  if (!method || method.user.toString() !== userId) {
    throw new Error('Payment method not found or does not belong to user');
  }
  
  // If deleting default, make next one default
  if (method.isDefault) {
    const nextMethod = await this.findOne({
      user: userId,
      _id: { $ne: paymentMethodId },
      isValid: true
    }).sort({ createdAt: -1 });
    
    if (nextMethod) {
      nextMethod.isDefault = true;
      await nextMethod.save();
    }
  }
  
  await this.findByIdAndDelete(paymentMethodId);
};

module.exports = mongoose.model('PaymentMethod', PaymentMethodSchema);
