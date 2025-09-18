const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createBookingFromPayment } = require('../controllers/bookingController');

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

// --- PAYMENT INTENT ROUTE (with JSON middleware) ---
router.post('/create-payment-intent', express.json(), async (req, res) => {
    try {
        const { bookingData } = req.body;
        if (!bookingData || !bookingData.totalPrice) {
            return res.status(400).json({ error: 'Invalid booking data.' });
        }
        console.log("\n--- 3. [Server] Received Request to Create Payment Intent ---");
        console.log("INCOMING DATA:", JSON.stringify(bookingData, null, 2));

        // --- Fix guestName issue ---
        const guestName = bookingData.guestName && bookingData.guestName !== 'undefined undefined' 
            ? bookingData.guestName 
            : (bookingData.contactInfo?.firstName && bookingData.contactInfo?.lastName)
                ? `${bookingData.contactInfo.firstName} ${bookingData.contactInfo.lastName}`
                : 'Guest';

        // --- Build minimal metadata that fits in 500 chars ---
        const essentialData = {
            category: bookingData.serviceType.toLowerCase(),
            user: bookingData.user || null,
            guestName: guestName,
            guestEmail: bookingData.guestEmail || bookingData.contactInfo?.email,
            numOfPeople: bookingData.numPeople || 1, // FIX: Map numPeople -> numOfPeople
            totalPrice: bookingData.totalPrice,
        };

        // Add category-specific essential fields only
        switch (essentialData.category) {
            case 'activity':
                essentialData.activity = bookingData.activityId || bookingData.activity;
                essentialData.option = bookingData.optionId || bookingData.option;
                essentialData.date = bookingData.date;
                essentialData.time = bookingData.time;
                // Simplified timeSlot (remove unnecessary fields)
                if (bookingData.timeSlot) {
                    essentialData.timeSlot = {
                        startTime: bookingData.timeSlot.startTime,
                        endTime: bookingData.timeSlot.endTime
                    };
                }
                break;

            case 'stay':
                essentialData.stay = bookingData.stay;
                essentialData.startDate = bookingData.startDate;
                essentialData.endDate = bookingData.endDate;
                break;

            case 'spa':
                essentialData.spa = bookingData.spaId || bookingData.spa;
                essentialData.service = bookingData.serviceId || bookingData.service;
                essentialData.serviceName = bookingData.serviceName;
                essentialData.date = bookingData.date;
                essentialData.time = bookingData.time;
                break;

            case 'dining':
                essentialData.dining = bookingData.diningId || bookingData.dining;
                essentialData.date = bookingData.date;
                essentialData.time = bookingData.time;
                break;

            case 'transportation':
                essentialData.transportation = bookingData.transportationId || bookingData.transportation;
                essentialData.option = bookingData.optionId || bookingData.option;
                essentialData.date = bookingData.date;
                essentialData.time = bookingData.time;
                essentialData.pickupLocation = bookingData.pickupLocation;
                essentialData.dropoffLocation = bookingData.dropoffLocation;
                break;

            default:
                return res.status(400).json({ 
                    error: `Unsupported booking category: ${essentialData.category}. Supported categories: activity, stay, spa, dining, transportation` 
                });
        }

        // Convert to JSON and check size
        const metadataJson = JSON.stringify(essentialData);
        console.log("--- 4. [Server] Essential Metadata ---");
        console.log("METADATA:", metadataJson);
        console.log("METADATA SIZE:", metadataJson.length, "characters");

        if (metadataJson.length > 500) {
            // If still too large, split into multiple metadata fields
            const basicData = {
                category: essentialData.category,
                user: essentialData.user,
                guestName: essentialData.guestName,
                guestEmail: essentialData.guestEmail,
                numOfPeople: essentialData.numOfPeople,
                totalPrice: essentialData.totalPrice
            };

            const serviceData = { ...essentialData };
            delete serviceData.category;
            delete serviceData.user;
            delete serviceData.guestName;
            delete serviceData.guestEmail;
            delete serviceData.numOfPeople;
            delete serviceData.totalPrice;

            const paymentIntent = await stripe.paymentIntents.create({
                amount: Math.round(bookingData.totalPrice * 100),
                currency: 'usd',
                automatic_payment_methods: { enabled: true },
                metadata: {
                    basicData: JSON.stringify(basicData),
                    serviceData: JSON.stringify(serviceData)
                }
            });

            res.status(200).json({ clientSecret: paymentIntent.client_secret });
        } else {
            // Single metadata field if it fits
            const paymentIntent = await stripe.paymentIntents.create({
                amount: Math.round(bookingData.totalPrice * 100),
                currency: 'usd',
                automatic_payment_methods: { enabled: true },
                metadata: {
                    bookingData: metadataJson
                }
            });

            res.status(200).json({ clientSecret: paymentIntent.client_secret });
        }

    } catch (error) {
        console.error('Stripe payment intent creation failed:', error);
        res.status(500).json({ error: 'Failed to create payment intent: ' + error.message });
    }
});

// --- WEBHOOK ROUTE (with raw middleware) ---
router.post('/stripe-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
        console.log(`Webhook signature verified for event: ${event.type}`);
    } catch (err) {
        console.error(`Webhook signature verification failed:`, err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object;
        console.log(`Payment succeeded: ${paymentIntent.id} for $${paymentIntent.amount / 100}`);
        
        try {
            console.log("Raw metadata:", paymentIntent.metadata);
            
            let bookingDetails;

            // Handle both single and split metadata cases
            if (paymentIntent.metadata.bookingData) {
                console.log("Using single metadata field");
                bookingDetails = JSON.parse(paymentIntent.metadata.bookingData);
            } else if (paymentIntent.metadata.basicData && paymentIntent.metadata.serviceData) {
                console.log("Using split metadata fields");
                const basicData = JSON.parse(paymentIntent.metadata.basicData);
                const serviceData = JSON.parse(paymentIntent.metadata.serviceData);
                bookingDetails = { ...basicData, ...serviceData };
            } else {
                throw new Error('No valid booking data found in payment intent metadata');
            }

            console.log("Parsed booking details:", JSON.stringify(bookingDetails, null, 2));
            
            // Build contactInfo object if it doesn't exist or is stringified
            if (!bookingDetails.contactInfo || typeof bookingDetails.contactInfo === 'string') {
                console.log("Building contactInfo from metadata");
                bookingDetails.contactInfo = {
                    firstName: bookingDetails.guestName ? bookingDetails.guestName.split(' ')[0] : '',
                    lastName: bookingDetails.guestName ? bookingDetails.guestName.split(' ').slice(1).join(' ') : '',
                    email: bookingDetails.guestEmail
                };
            }

            // Validate required fields
            if (!bookingDetails.category) {
                throw new Error('Missing category in booking details');
            }
            if (!bookingDetails.totalPrice) {
                throw new Error('Missing totalPrice in booking details');
            }

            console.log("Calling createBookingFromPayment...");

            // Create a proper response object that captures the result
            let bookingResult = null;
            let bookingError = null;

            const mockRes = {
                status: (code) => ({
                    json: (data) => {
                        console.log(`Booking creation status ${code}:`, data);
                        if (code >= 200 && code < 300) {
                            bookingResult = data;
                            console.log("Booking created successfully:", data.data?._id);
                        } else {
                            bookingError = data;
                            console.log("Booking creation failed:", data.message || data.error);
                        }
                    }
                })
            };

            const mockReq = { 
                body: { 
                    bookingDetails, 
                    paymentIntentId: paymentIntent.id 
                } 
            };
            
            // Call your existing controller to create the booking
            await createBookingFromPayment(mockReq, mockRes);

            // Check if booking was created successfully
            if (bookingError) {
                console.error("Webhook booking creation failed:", bookingError);
                // Don't return 400 to Stripe - we received the webhook successfully
                // The issue is with our booking creation, not the webhook itself
                return res.status(200).json({ 
                    received: true, 
                    booking_status: 'failed',
                    error: bookingError 
                });
            }

            console.log("Webhook processed successfully");
            return res.status(200).json({ 
                received: true, 
                booking_status: 'created',
                booking_id: bookingResult?.data?._id 
            });

        } catch (err) {
            console.error('Error processing payment_intent.succeeded webhook:', err);
            console.error('Stack trace:', err.stack);
            
            // Return 200 to Stripe so it doesn't retry, but log the error for debugging
            return res.status(200).json({ 
                received: true, 
                error: err.message,
                booking_status: 'failed'
            });
        }
    } else {
        console.log(`Unhandled event type: ${event.type}`);
        return res.status(200).json({ received: true });
    }
});

module.exports = router;