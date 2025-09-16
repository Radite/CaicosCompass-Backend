const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY); // Secret key from your Stripe dashboard
const { createBookingFromPayment } = require('../controllers/bookingController');

// Create a payment intent
router.post('/create-payment-intent', async (req, res) => {
    try {
        const { bookingData } = req.body;
        console.log('Raw bookingData received:', JSON.stringify(bookingData, null, 2));

        if (!bookingData) {
            return res.status(400).json({ error: 'Missing bookingData in request.' });
        }

        // --- THE FIX: Create a smaller object for metadata ---
        // We only need the IDs and essential details to create the booking later.
        const leanBookingData = {
            user: bookingData.user,
            guestName: bookingData.guestName,
            guestEmail: bookingData.guestEmail,
            category: bookingData.serviceType?.toLowerCase() || 'activity',            activity: bookingData.activityId, // Use the ID
            option: bookingData.optionId,     // Use the ID
            date: bookingData.date,
            time: `${bookingData.timeSlot.startTime} - ${bookingData.timeSlot.endTime}`,
            timeSlot: bookingData.timeSlot,
            numOfPeople: bookingData.numPeople,
            totalPrice: bookingData.totalPrice, // We'll store this for reference
            contactInfo: bookingData.contactInfo
            // Notice we've removed the large nested objects and arrays
        };

        // --- Server-side price validation is still critical ---
        // (Add your database lookup logic here to get the real price)
        const totalAmount = Math.round(bookingData.totalPrice * 100);

        if (isNaN(totalAmount) || totalAmount <= 0) {
            return res.status(400).json({ error: 'Invalid or missing totalPrice.' });
        }

        const paymentIntent = await stripe.paymentIntents.create({
            amount: totalAmount,
            currency: 'usd',
            automatic_payment_methods: { enabled: true },
            // Attach the LEAN booking object to metadata
            metadata: {
                // Convert the lean object to a string to store it
                bookingData: JSON.stringify(leanBookingData)
            }
        });

        res.status(200).json({ clientSecret: paymentIntent.client_secret });

    } catch (error) {
        console.error('--- STRIPE PAYMENT INTENT CREATION FAILED ---');
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});
router.post('/finalize-booking', async (req, res) => {
    try {
        const { paymentIntentId } = req.body;

        // Securely retrieve the Payment Intent from Stripe's servers
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

        if (paymentIntent.status === 'succeeded') {
            // Extract the booking data from metadata
            const bookingDetails = JSON.parse(paymentIntent.metadata.bookingData);
            
            // --- ADD THIS LOG HERE ---
            // This will print the full details object to your backend terminal
            console.log("Data from Stripe metadata to be used for booking:", JSON.stringify(bookingDetails, null, 2));
            
            // Prepare a new request object for the booking controller
            const mockReq = { 
                body: { 
                    bookingDetails, 
                    paymentIntentId 
                } 
            };
            const mockRes = {
                status: (code) => ({
                    json: (data) => res.status(code).json(data)
                })
            };

            // Call your booking controller to create the booking
            await createBookingFromPayment(mockReq, mockRes);
            
        } else {
            res.status(400).json({ success: false, message: 'Payment not successful.' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;