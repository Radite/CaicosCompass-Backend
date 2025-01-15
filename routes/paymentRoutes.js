const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY); // Secret key from your Stripe dashboard

// Create a payment intent
router.post('/create-payment-intent', async (req, res) => {
  try {
    const { amount, currency = 'usd' } = req.body; // Amount in cents, default currency is USD

    // Log the received request body
    console.log('Received request body:', req.body);

    // Log the amount for debugging
    console.log('Received amount:', amount);

    // Validate that the amount is a positive integer
    if (isNaN(amount) || amount <= 0) {
      console.log('Invalid amount:', amount);
      return res.status(400).json({ error: 'Invalid amount. Amount must be a positive number.' });
    }

    // Create a payment intent
    console.log('Creating payment intent...');
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      payment_method_types: ['card'], // Allow only card payments
    });

    // Log the created payment intent
    console.log('Payment intent created:', paymentIntent);

    // Send client secret to frontend
    res.status(200).json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    // Log the error and send it as a response
    console.error('Error creating payment intent:', error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;