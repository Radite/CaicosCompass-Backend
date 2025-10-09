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
    numOfPeople: bookingData.numPeople || 1,
    totalPrice: bookingData.totalPrice,
    basePrice: bookingData.basePrice || bookingData.price || bookingData.totalPrice, // ADD THIS
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
        essentialData.stay = bookingData.stay || bookingData.stayId;
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

// Add this route to your existing payment routes file
router.post('/create-cart-payment-intent', async (req, res) => {
  try {
    const { items, user, guestName, guestEmail, contactInfo } = req.body;

    // Validate cart items
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty or invalid' });
    }

    // Validate contact info
    if (!contactInfo || !contactInfo.email) {
      return res.status(400).json({ error: 'Contact information is required' });
    }

    // Calculate total amount
    const totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);

    // Create all bookings first
    const bookingIds = [];
    const bookingPromises = items.map(async (item) => {
      let booking;

      // Determine booking type and create appropriate booking
      switch (item.serviceType.toLowerCase()) {
        case 'activity':
          booking = await createActivityBooking(item, user, contactInfo);
          break;
        case 'spa':
        case 'wellnessspa':
          booking = await createSpaBooking(item, user, contactInfo);
          break;
        case 'stay':
          booking = await createStayBooking(item, user, contactInfo);
          break;
        default:
          throw new Error(`Unknown service type: ${item.serviceType}`);
      }

      bookingIds.push(booking._id);
      return booking;
    });

    // Wait for all bookings to be created
    await Promise.all(bookingPromises);

    // Create Stripe payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(totalAmount * 100), // Convert to cents
      currency: 'usd',
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        bookingIds: JSON.stringify(bookingIds),
        bookingType: 'cart',
        itemCount: items.length,
        userId: user || 'guest',
        guestName: guestName || '',
        guestEmail: guestEmail || contactInfo.email,
      },
      receipt_email: contactInfo.email,
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      bookingIds: bookingIds,
    });

  } catch (error) {
    console.error('Error creating cart payment intent:', error);
    res.status(500).json({ error: error.message || 'Failed to create payment intent' });
  }
});

// Helper function to create activity booking
async function createActivityBooking(item, userId, contactInfo) {
  const Booking = require('../models/Booking');
  
  const booking = new Booking({
    user: userId || null,
    activity: item.serviceId,
    option: item.optionId || null,
    date: item.selectedDate,
    timeSlot: item.timeSlot,
    numOfPeople: item.numPeople,
    multiUser: false,
    totalPrice: item.totalPrice,
    paymentStatus: 'pending',
    bookingStatus: 'pending',
    guestName: userId ? null : contactInfo.firstName + ' ' + contactInfo.lastName,
    guestEmail: userId ? null : contactInfo.email,
  });

  await booking.save();
  return booking;
}

// Helper function to create spa booking
async function createSpaBooking(item, userId, contactInfo) {
  const Booking = require('../models/Booking');
  
  const booking = new Booking({
    user: userId || null,
    service: item.optionId || item.serviceId,
    serviceName: item.serviceName,
    spa: item.serviceId,
    date: item.selectedDate,
    timeSlot: item.timeSlot,
    time: item.selectedTime || `${item.timeSlot.startTime} - ${item.timeSlot.endTime}`,
    numOfPeople: item.numPeople,
    totalPrice: item.totalPrice,
    category: 'spa',
    serviceType: 'Spa',
    paymentStatus: 'pending',
    bookingStatus: 'pending',
    guestName: userId ? null : contactInfo.firstName + ' ' + contactInfo.lastName,
    guestEmail: userId ? null : contactInfo.email,
  });

  await booking.save();
  return booking;
}

// Helper function to create stay booking
async function createStayBooking(item, userId, contactInfo) {
  const Booking = require('../models/Booking');
  
  const nights = Math.ceil(
    (new Date(item.checkOutDate) - new Date(item.selectedDate)) / (1000 * 60 * 60 * 24)
  );

  const booking = new Booking({
    user: userId || null,
    stay: item.serviceId,
    stayName: item.serviceName,
    startDate: item.selectedDate,
    endDate: item.checkOutDate,
    numOfPeople: item.numPeople,
    nights: nights,
    totalPrice: item.totalPrice,
    category: 'stay',
    serviceType: 'Stay',
    paymentStatus: 'pending',
    bookingStatus: 'pending',
    guestName: userId ? null : contactInfo.firstName + ' ' + contactInfo.lastName,
    guestEmail: userId ? null : contactInfo.email,
  });

  await booking.save();
  return booking;
}

module.exports = router;

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
            
            // ===== NEW: Check if this is a cart checkout =====
            if (paymentIntent.metadata.bookingType === 'cart') {
                console.log("Processing CART checkout");
                
                const bookingIds = JSON.parse(paymentIntent.metadata.bookingIds);
                const itemCount = parseInt(paymentIntent.metadata.itemCount);
                
                console.log(`Updating ${itemCount} bookings:`, bookingIds);
                
                try {
                    // Update all bookings to confirmed and paid
                    const updateResult = await Booking.updateMany(
                        { _id: { $in: bookingIds } },
                        { 
                            $set: {
                                paymentStatus: 'paid',
                                bookingStatus: 'confirmed',
                                paymentIntentId: paymentIntent.id,
                                paidAt: new Date()
                            }
                        }
                    );

                    console.log(`Successfully updated ${updateResult.modifiedCount} bookings`);

                    // Optional: Send confirmation emails for each booking
                    const bookings = await Booking.find({ _id: { $in: bookingIds } })
                        .populate('user')
                        .populate('activity')
                        .populate('stay')
                        .populate('spa');

                    // You can add email logic here if needed
                    for (const booking of bookings) {
                        console.log(`Booking confirmed: ${booking._id} - ${booking.bookingStatus}`);
                        // await sendBookingConfirmationEmail(booking); // Uncomment if you have email service
                    }

                    return res.status(200).json({ 
                        received: true, 
                        booking_status: 'confirmed',
                        booking_type: 'cart',
                        bookings_updated: updateResult.modifiedCount,
                        booking_ids: bookingIds
                    });

                } catch (bookingError) {
                    console.error('Error updating cart bookings:', bookingError);
                    
                    // Try to rollback - mark bookings as failed
                    await Booking.updateMany(
                        { _id: { $in: bookingIds } },
                        { 
                            $set: {
                                paymentStatus: 'failed',
                                bookingStatus: 'cancelled',
                                paymentError: bookingError.message
                            }
                        }
                    );

                    return res.status(200).json({ 
                        received: true, 
                        booking_status: 'failed',
                        booking_type: 'cart',
                        error: bookingError.message
                    });
                }
            }

            // ===== EXISTING: Single item checkout logic =====
            console.log("Processing SINGLE item checkout");
            
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
                    booking_type: 'single',
                    error: bookingError 
                });
            }

            console.log("Webhook processed successfully");
            return res.status(200).json({ 
                received: true, 
                booking_status: 'created',
                booking_type: 'single',
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