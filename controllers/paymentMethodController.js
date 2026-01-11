// controllers/paymentMethodController.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const PaymentMethod = require('../models/PaymentMethod');
const User = require('../models/User');

/**
 * Create a setup intent for saving a new payment method
 * This allows users to add cards without making a charge
 */
exports.createSetupIntent = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get or create Stripe customer for this user
    let user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Create Stripe customer if doesn't exist
    let stripeCustomerId = user.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        metadata: {
          userId: userId.toString()
        }
      });
      stripeCustomerId = customer.id;
      user.stripeCustomerId = stripeCustomerId;
      await user.save();
    }

    // Create a SetupIntent for saving the payment method
    const setupIntent = await stripe.setupIntents.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      usage: 'off_session' // Allows charging later without user present
    });

    console.log(`✅ Setup intent created: ${setupIntent.id}`);

    res.status(200).json({
      success: true,
      clientSecret: setupIntent.client_secret,
      setupIntentId: setupIntent.id
    });
  } catch (error) {
    console.error('Error creating setup intent:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create setup intent',
      error: error.message
    });
  }
};

/**
 * Handle setup intent success and save payment method to database
 * Called after frontend confirms setup intent
 */
exports.confirmPaymentMethod = async (req, res) => {
  try {
    const userId = req.user.id;
    const { setupIntentId, nickname } = req.body;

    if (!setupIntentId) {
      return res.status(400).json({ success: false, message: 'Setup intent ID required' });
    }

    // Retrieve setup intent from Stripe
    const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);

    if (setupIntent.status !== 'succeeded') {
      return res.status(400).json({
        success: false,
        message: `Setup intent not succeeded. Status: ${setupIntent.status}`
      });
    }

    const stripePaymentMethodId = setupIntent.payment_method;
    if (!stripePaymentMethodId) {
      return res.status(400).json({ success: false, message: 'No payment method attached' });
    }

    // Retrieve payment method details from Stripe
    const paymentMethod = await stripe.paymentMethods.retrieve(stripePaymentMethodId);

    // Check if already saved
    const existingMethod = await PaymentMethod.findOne({
      user: userId,
      stripePaymentMethodId: stripePaymentMethodId
    });

    if (existingMethod) {
      return res.status(200).json({
        success: true,
        message: 'Payment method already saved',
        paymentMethod: existingMethod.getMaskedDisplay()
      });
    }

    // Save to database
    const savedMethod = new PaymentMethod({
      user: userId,
      stripePaymentMethodId: stripePaymentMethodId,
      type: paymentMethod.type,
      nickname: nickname || null,
      addedDuringCheckout: false
    });

    // Extract and save card details
    if (paymentMethod.type === 'card' && paymentMethod.card) {
      savedMethod.card = {
        brand: paymentMethod.card.brand,
        last4: paymentMethod.card.last4,
        expiryMonth: paymentMethod.card.exp_month,
        expiryYear: paymentMethod.card.exp_year,
        holderName: paymentMethod.billing_details?.name,
        country: paymentMethod.card.country
      };
    }

    // Extract billing details
    if (paymentMethod.billing_details) {
      savedMethod.billingDetails = {
        email: paymentMethod.billing_details.email,
        name: paymentMethod.billing_details.name,
        phone: paymentMethod.billing_details.phone,
        address: paymentMethod.billing_details.address
      };
    }

    // If this is the first payment method, make it default
    const existingCount = await PaymentMethod.countDocuments({
      user: userId,
      isValid: true
    });
    if (existingCount === 0) {
      savedMethod.isDefault = true;
    }

    await savedMethod.save();

    console.log(`✅ Payment method saved: ${savedMethod._id}`);

    res.status(201).json({
      success: true,
      message: 'Payment method saved successfully',
      paymentMethod: savedMethod.getMaskedDisplay(),
      paymentMethodId: savedMethod._id
    });
  } catch (error) {
    console.error('Error confirming payment method:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save payment method',
      error: error.message
    });
  }
};

/**
 * Get all saved payment methods for user
 */
exports.getPaymentMethods = async (req, res) => {
  try {
    const userId = req.user.id;

    const methods = await PaymentMethod.find({
      user: userId,
      isValid: true
    })
    .sort({ isDefault: -1, createdAt: -1 })
    .lean();

    const maskedMethods = methods.map(method => ({
      _id: method._id,
      type: method.type,
      display: method.type === 'card'
        ? `${method.card.brand.toUpperCase()} ending in ${method.card.last4}`
        : `${method.bankAccount.bankName} ending in ${method.bankAccount.last4}`,
      ...method.type === 'card' && {
        brand: method.card.brand,
        last4: method.card.last4,
        expiryMonth: method.card.expiryMonth,
        expiryYear: method.card.expiryYear
      },
      ...method.type === 'bank_account' && {
        bankName: method.bankAccount.bankName,
        last4: method.bankAccount.last4
      },
      nickname: method.nickname,
      isDefault: method.isDefault,
      usageCount: method.usageCount,
      lastUsedAt: method.lastUsedAt,
      savedAt: method.savedAt
    }));

    res.status(200).json({
      success: true,
      paymentMethods: maskedMethods,
      count: maskedMethods.length
    });
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment methods',
      error: error.message
    });
  }
};

/**
 * Get default payment method
 */
exports.getDefaultPaymentMethod = async (req, res) => {
  try {
    const userId = req.user.id;

    const method = await PaymentMethod.findOne({
      user: userId,
      isDefault: true,
      isValid: true
    });

    if (!method) {
      return res.status(404).json({
        success: false,
        message: 'No default payment method found'
      });
    }

    res.status(200).json({
      success: true,
      paymentMethod: method.getMaskedDisplay(),
      paymentMethodId: method._id
    });
  } catch (error) {
    console.error('Error fetching default payment method:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch default payment method',
      error: error.message
    });
  }
};

/**
 * Update payment method (nickname, set as default, etc.)
 */
exports.updatePaymentMethod = async (req, res) => {
  try {
    const userId = req.user.id;
    const { paymentMethodId } = req.params;
    const { nickname, isDefault } = req.body;

    const method = await PaymentMethod.findById(paymentMethodId);

    if (!method || method.user.toString() !== userId) {
      return res.status(404).json({
        success: false,
        message: 'Payment method not found'
      });
    }

    // Update nickname
    if (nickname !== undefined) {
      method.nickname = nickname || null;
    }

    // Set as default
    if (isDefault === true) {
      await PaymentMethod.updateMany(
        { user: userId, _id: { $ne: paymentMethodId } },
        { isDefault: false }
      );
      method.isDefault = true;
    } else if (isDefault === false && method.isDefault) {
      method.isDefault = false;
    }

    await method.save();

    console.log(`✅ Payment method updated: ${paymentMethodId}`);

    res.status(200).json({
      success: true,
      message: 'Payment method updated',
      paymentMethod: method.getMaskedDisplay()
    });
  } catch (error) {
    console.error('Error updating payment method:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update payment method',
      error: error.message
    });
  }
};

/**
 * Delete a payment method
 */
exports.deletePaymentMethod = async (req, res) => {
  try {
    const userId = req.user.id;
    const { paymentMethodId } = req.params;

    const method = await PaymentMethod.findById(paymentMethodId);

    if (!method || method.user.toString() !== userId) {
      return res.status(404).json({
        success: false,
        message: 'Payment method not found'
      });
    }

    // Detach from Stripe
    try {
      await stripe.paymentMethods.detach(method.stripePaymentMethodId);
    } catch (error) {
      console.warn(`⚠️  Failed to detach payment method from Stripe: ${error.message}`);
    }

    // Mark as invalid instead of deleting (for audit trail)
    method.isValid = false;
    await method.save();

    // If this was default, set new default
    if (method.isDefault) {
      const nextMethod = await PaymentMethod.findOne({
        user: userId,
        _id: { $ne: paymentMethodId },
        isValid: true
      }).sort({ createdAt: -1 });

      if (nextMethod) {
        nextMethod.isDefault = true;
        await nextMethod.save();
      }
    }

    console.log(`✅ Payment method deleted: ${paymentMethodId}`);

    res.status(200).json({
      success: true,
      message: 'Payment method deleted'
    });
  } catch (error) {
    console.error('Error deleting payment method:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete payment method',
      error: error.message
    });
  }
};

/**
 * Charge a saved payment method (used during checkout)
 * This is called from the payment intent webhook or during checkout
 */
exports.chargePaymentMethod = async (req, res) => {
  try {
    const userId = req.user.id;
    const { paymentMethodId, amount, metadata } = req.body;

    if (!paymentMethodId || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Payment method ID and amount required'
      });
    }

    const method = await PaymentMethod.findById(paymentMethodId);

    if (!method || method.user.toString() !== userId) {
      return res.status(404).json({
        success: false,
        message: 'Payment method not found'
      });
    }

    // Get user's Stripe customer ID
    const user = await User.findById(userId);
    if (!user || !user.stripeCustomerId) {
      return res.status(400).json({
        success: false,
        message: 'User has no Stripe customer ID'
      });
    }

    // Create payment intent with saved payment method
    const paymentIntent = await stripe.paymentIntents.create({
      customer: user.stripeCustomerId,
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      payment_method: method.stripePaymentMethodId,
      off_session: true, // This is a recurring/saved payment
      confirm: true,
      metadata: metadata || {}
    });

    // Record usage
    await method.recordUsage();

    console.log(`✅ Charged saved payment method: ${paymentIntent.id}`);

    res.status(200).json({
      success: true,
      message: 'Payment processed',
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status
    });
  } catch (error) {
    console.error('Error charging saved payment method:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process payment',
      error: error.message
    });
  }
};
