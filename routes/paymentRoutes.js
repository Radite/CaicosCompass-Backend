// routes/paymentRoutes.js - Complete Payment Integration
const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Booking = require('../models/Booking');
const authMiddleware = require('../middleware/authMiddleware');

// Create payment intent
router.post('/create-payment-intent', authMiddleware.protect, async (req, res) => {
  try {
    const { amount, currency = 'usd', bookingData, metadata } = req.body;

    console.log('Creating payment intent for user:', req.user.id);
    console.log('Amount:', amount, 'Currency:', currency);

    // Validate amount
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount. Amount must be a positive number.' });
    }

    // Create payment intent with metadata
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      payment_method_types: ['card'],
      metadata: {
        userId: req.user.id,
        bookingType: metadata?.bookingType || 'unknown',
        serviceId: metadata?.serviceId || '',
        ...metadata
      },
      description: `TurksExplorer booking for ${req.user.email}`
    });

    console.log('Payment intent created:', paymentIntent.id);

    res.status(200).json({ 
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });
  } catch (error) {
    console.error('Error creating payment intent:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Webhook endpoint for Stripe events
router.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log('Webhook event received:', event.type);

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      await handlePaymentSuccess(event.data.object);
      break;
    case 'payment_intent.payment_failed':
      await handlePaymentFailure(event.data.object);
      break;
    case 'payment_intent.canceled':
      await handlePaymentCanceled(event.data.object);
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({received: true});
});

// Handle successful payment
async function handlePaymentSuccess(paymentIntent) {
  try {
    console.log('Processing successful payment:', paymentIntent.id);
    
    const { userId, bookingType, serviceId } = paymentIntent.metadata;
    
    // Create booking record
    const bookingData = {
      user: userId,
      category: bookingType,
      status: 'confirmed',
      paymentDetails: {
        totalAmount: paymentIntent.amount / 100, // Convert from cents
        amountPaid: paymentIntent.amount / 100,
        remainingBalance: 0,
        stripePaymentIntentId: paymentIntent.id,
        paymentMethod: 'card',
        payees: [{
          user: userId,
          amount: paymentIntent.amount / 100,
          status: 'paid',
          paymentMethod: 'card',
          stripePaymentIntentId: paymentIntent.id
        }]
      }
    };

    // Add service-specific data based on booking type
    if (bookingType === 'activity') {
      bookingData.activity = serviceId;
      bookingData.option = paymentIntent.metadata.optionId;
      bookingData.date = paymentIntent.metadata.date;
      bookingData.time = paymentIntent.metadata.time;
      bookingData.numOfPeople = parseInt(paymentIntent.metadata.numPeople) || 1;
    } else if (bookingType === 'stay') {
      bookingData.stay = serviceId;
      bookingData.room = paymentIntent.metadata.roomId;
      bookingData.startDate = paymentIntent.metadata.startDate;
      bookingData.endDate = paymentIntent.metadata.endDate;
      bookingData.numOfPeople = parseInt(paymentIntent.metadata.numGuests) || 1;
    } else if (bookingType === 'dining') {
      bookingData.dining = serviceId;
      bookingData.date = paymentIntent.metadata.date;
      bookingData.time = paymentIntent.metadata.time;
      bookingData.numOfPeople = parseInt(paymentIntent.metadata.numPeople) || 1;
    } else if (bookingType === 'transportation') {
      bookingData.transportation = serviceId;
      bookingData.date = paymentIntent.metadata.date;
      bookingData.time = paymentIntent.metadata.time;
      bookingData.pickupLocation = paymentIntent.metadata.pickupLocation;
      bookingData.dropoffLocation = paymentIntent.metadata.dropoffLocation;
    }

    const booking = new Booking(bookingData);
    await booking.save();
    
    console.log('Booking created successfully:', booking._id);

    // Send confirmation email
    await sendBookingConfirmationEmail(booking);
    
  } catch (error) {
    console.error('Error handling payment success:', error);
  }
}

// Handle payment failure
async function handlePaymentFailure(paymentIntent) {
  console.log('Payment failed:', paymentIntent.id);
  
  // Log payment failure for analytics
  // Could also notify user via email about payment failure
}

// Handle payment cancellation
async function handlePaymentCanceled(paymentIntent) {
  console.log('Payment canceled:', paymentIntent.id);
  
  // Handle any cleanup needed for canceled payments
}

// Confirm payment and create booking
router.post('/confirm-payment', authMiddleware.protect, async (req, res) => {
  try {
    const { paymentIntentId, bookingData } = req.body;

    // Retrieve payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({ error: 'Payment not completed' });
    }

    // Check if booking already exists
    const existingBooking = await Booking.findOne({
      'paymentDetails.stripePaymentIntentId': paymentIntentId
    });

    if (existingBooking) {
      return res.status(200).json({ 
        booking: existingBooking,
        message: 'Booking already exists'
      });
    }

    // Create booking record
    const booking = new Booking({
      user: req.user.id,
      ...bookingData,
      status: 'confirmed',
      paymentDetails: {
        ...bookingData.paymentDetails,
        stripePaymentIntentId: paymentIntentId,
        totalAmount: paymentIntent.amount / 100,
        amountPaid: paymentIntent.amount / 100,
        remainingBalance: 0
      }
    });

    await booking.save();

    res.status(201).json({ 
      booking,
      message: 'Booking created successfully'
    });

  } catch (error) {
    console.error('Error confirming payment:', error);
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

// Refund payment
router.post('/refund', authMiddleware.protect, async (req, res) => {
  try {
    const { paymentIntentId, amount, reason } = req.body;

    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: amount ? Math.round(amount * 100) : undefined, // Partial or full refund
      reason: reason || 'requested_by_customer'
    });

    res.status(200).json({ 
      refund,
      message: 'Refund processed successfully'
    });

  } catch (error) {
    console.error('Error processing refund:', error);
    res.status(500).json({ error: 'Failed to process refund' });
  }
});

// Get payment status
router.get('/status/:paymentIntentId', authMiddleware.protect, async (req, res) => {
  try {
    const { paymentIntentId } = req.params;

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    res.status(200).json({
      status: paymentIntent.status,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency
    });

  } catch (error) {
    console.error('Error retrieving payment status:', error);
    res.status(500).json({ error: 'Failed to retrieve payment status' });
  }
});

// Helper function to send booking confirmation email
async function sendBookingConfirmationEmail(booking) {
  try {
    const { sendBookingConfirmationEmail } = require('../controllers/emailService');
    await sendBookingConfirmationEmail(booking);
  } catch (error) {
    console.error('Error sending confirmation email:', error);
  }
}

module.exports = router;