const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createBookingFromPayment } = require('../controllers/bookingController');
const referralService = require('../services/referralService');

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
    referralCode: bookingData.referralCode || '' // ADD THIS LINE
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
// routes/paymentRoutes.js

router.post('/create-cart-payment-intent', express.json(), async (req, res) => {
  try {
    console.log('\n========================================');
    console.log('🛒 CART PAYMENT INTENT REQUEST RECEIVED');
    console.log('========================================');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Request Body:', JSON.stringify(req.body, null, 2));
    
    const { items, user, guestName, guestEmail, contactInfo } = req.body;

    // Validate cart items
    if (!items || !Array.isArray(items) || items.length === 0) {
      console.error('❌ Validation failed: Cart is empty or invalid');
      return res.status(400).json({ error: 'Cart is empty or invalid' });
    }
    console.log(`✅ Cart validation passed: ${items.length} items`);

    // Validate contact info
    if (!contactInfo || !contactInfo.email) {
      console.error('❌ Validation failed: Contact information missing');
      return res.status(400).json({ error: 'Contact information is required' });
    }
    console.log(`✅ Contact info validated: ${contactInfo.email}`);

    // Calculate total amount
    const totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);
    console.log(`💰 Total amount calculated: $${totalAmount}`);

    // Find the user's cart in the database
    const Cart = require('../models/Cart');
    let cart = null;
    
    if (user) {
      console.log(`🔍 Searching for cart for user: ${user}`);
      cart = await Cart.findOne({ user: user });
      if (cart) {
        console.log(`✅ Cart found: ${cart._id} with ${cart.items.length} items`);
      } else {
        console.log('⚠️  No cart found in database for user');
      }
    } else {
      console.log('👤 Guest checkout - no user ID');
    }

    // Create compact metadata
    const metadata = {
      bookingType: 'cart',
      itemCount: items.length.toString(),
      userId: user || 'guest',
      guestName: guestName || '',
      guestEmail: guestEmail || contactInfo.email,
      contactEmail: contactInfo.email,
      referralCode: referralCode || null,
      contactFirstName: contactInfo.firstName || '',
      contactLastName: contactInfo.lastName || '',
      cartId: cart ? cart._id.toString() : 'guest_cart',
      totalAmount: totalAmount.toString()
    };

    // For guest checkouts, store minimal item data
    if (!user) {
      console.log('📦 Creating guest items summary');
      const itemSummaries = items.map((item, index) => ({
        id: item._id,
        sid: item.service?._id || item.serviceId,
        type: item.serviceType,
        price: item.totalPrice
      }));
      metadata.guestItems = JSON.stringify(itemSummaries);
      console.log(`✅ Guest items summary created: ${itemSummaries.length} items`);
    }

    console.log('\n📋 Payment Intent Metadata:');
    console.log(JSON.stringify(metadata, null, 2));
    console.log(`Metadata size: ${JSON.stringify(metadata).length} characters`);

    // Create Stripe payment intent
    console.log('\n💳 Creating Stripe payment intent...');
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(totalAmount * 100),
      currency: 'usd',
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: metadata,
      receipt_email: contactInfo.email,
    });

    console.log('✅ Payment intent created successfully');
    console.log(`   - Payment Intent ID: ${paymentIntent.id}`);
    console.log(`   - Amount: $${totalAmount}`);
    console.log(`   - Client Secret: ${paymentIntent.client_secret.substring(0, 20)}...`);
    console.log('========================================\n');

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });

  } catch (error) {
    console.error('\n❌ ERROR CREATING CART PAYMENT INTENT');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    console.error('========================================\n');
    res.status(500).json({ 
      error: error.message || 'Failed to create payment intent' 
    });
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
   // routes/paymentRoutes.js - Inside webhook handler

if (event.type === 'payment_intent.succeeded') {
  const paymentIntent = event.data.object;
  console.log(`Payment succeeded: ${paymentIntent.id}`);
  
  try {
    console.log("Raw metadata:", paymentIntent.metadata);
    
    // ===== CART CHECKOUT =====
if (paymentIntent.metadata.bookingType === 'cart') {
  console.log('\n==========================================');
  console.log('🎉 WEBHOOK: CART CHECKOUT - START');
  console.log('==========================================');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Payment Intent ID:', paymentIntent.id);
  console.log('Payment Amount:', `$${paymentIntent.amount / 100}`);
  console.log('Payment Status:', paymentIntent.status);
  
  const Cart = require('../models/Cart');
  const Booking = require('../models/Booking');
  const Service = require('../models/Service');
  
  const userId = paymentIntent.metadata.userId !== 'guest' ? paymentIntent.metadata.userId : null;
  const cartId = paymentIntent.metadata.cartId;
  const guestName = paymentIntent.metadata.guestName;
  const guestEmail = paymentIntent.metadata.guestEmail || paymentIntent.metadata.contactEmail;
  const itemCount = parseInt(paymentIntent.metadata.itemCount);
  
  console.log('📋 Metadata:');
  console.log('   - User ID:', userId || 'guest');
  console.log('   - Cart ID:', cartId);
  console.log('   - Item Count:', itemCount);
  console.log('   - Guest Name:', guestName);
  console.log('   - Guest Email:', guestEmail);

  // Fetch cart items from database
  let cartItems = [];
  
  if (userId && cartId !== 'guest_cart') {
    console.log('\n🔍 Fetching cart from database...');
    console.log('   - Cart ID:', cartId);
    
    try {
      const cart = await Cart.findById(cartId).populate('items.service');
      
      if (!cart) {
        console.error('❌ Cart not found in database!');
        throw new Error('Cart not found in database');
      }
      
      console.log('✅ Cart found!');
      console.log('   - Items in cart:', cart.items.length);
      console.log('   - Total cart price:', `$${cart.totalCartPrice}`);
      
      cartItems = cart.items.map((item, index) => {
        console.log(`   Item ${index + 1}:`, {
          id: item._id,
          serviceId: item.service._id,
          type: item.serviceType,
          price: item.totalPrice
        });
        
        return {
          _id: item._id,
          serviceId: item.service._id,
          serviceType: item.serviceType,
          category: item.category,
          selectedDate: item.selectedDate,
          startDate: item.startDate,
          endDate: item.endDate,
          selectedTime: item.selectedTime,
          timeSlot: item.timeSlot,
          numPeople: item.numPeople,
          totalPrice: item.totalPrice,
          priceBreakdown: item.priceBreakdown || {
            basePrice: item.totalPrice,
            fees: 0,
            taxes: 0,
            discounts: 0
          },
          optionId: item.option,
          roomId: item.room,
          notes: item.notes,
          pickupLocation: item.pickupLocation,
          dropoffLocation: item.dropoffLocation,
          serviceName: item.serviceName
        };
      });
    } catch (cartError) {
      console.error('❌ Error fetching cart:', cartError);
      throw cartError;
    }
  } else {
    console.log('\n👤 Processing guest cart from metadata');
    const guestItems = JSON.parse(paymentIntent.metadata.guestItems);
    console.log('   - Guest items count:', guestItems.length);
    
    for (const item of guestItems) {
      const service = await Service.findById(item.sid);
      if (service) {
        console.log(`   ✅ Service found: ${service.name}`);
        cartItems.push({
          serviceId: item.sid,
          serviceType: item.type,
          totalPrice: item.price,
          numPeople: 1,
          priceBreakdown: {
            basePrice: item.price,
            fees: 0,
            taxes: 0,
            discounts: 0
          }
        });
      } else {
        console.log(`   ❌ Service not found: ${item.sid}`);
      }
    }
  }

  if (cartItems.length === 0) {
    console.error('❌ No items found in cart!');
    throw new Error('No items found in cart');
  }

  console.log(`\n📦 Processing ${cartItems.length} cart items...`);
  const createdBookingIds = [];
  const successfulItemIds = [];
  const failedItems = [];

  // Create individual booking for EACH cart item
  for (let i = 0; i < cartItems.length; i++) {
    const item = cartItems[i];
    console.log(`\n${'='.repeat(50)}`);
    console.log(`📝 ITEM ${i + 1}/${cartItems.length}`);
    console.log(`${'='.repeat(50)}`);
    console.log('Service ID:', item.serviceId);
    console.log('Service Type:', item.serviceType);
    console.log('Total Price:', `$${item.totalPrice}`);
    
try {
  // Fetch the service to get vendor info
  console.log('🔍 Fetching service details...');
  const serviceDoc = await Service.findById(item.serviceId);
  
  if (!serviceDoc) {
    console.error('❌ Service not found:', item.serviceId);
    failedItems.push({ item, error: 'Service not found' });
    continue;
  }

  console.log('✅ Service found:', serviceDoc.name);
  
  // ✅ FIX: Access the raw document to get the host field
  const rawDoc = serviceDoc.toObject(); // Convert to plain JavaScript object
  const vendorId = rawDoc.vendor || rawDoc.host || serviceDoc.vendor || serviceDoc.host;
  
  console.log('🔍 Vendor/Host check:');
  console.log('   - Raw doc host:', rawDoc.host);
  console.log('   - Final vendorId:', vendorId);
  
  if (!vendorId) {
    console.error('❌ Vendor not found for service');
    failedItems.push({ item, error: 'Vendor not found' });
    continue;
  }

  console.log('✅ Vendor/Host ID found:', vendorId);

  // Rest of your booking creation code...
  const serviceTypeMap = {
    'Activity': 'Activity',
    'WellnessSpa': 'Activity',
    'Spa': 'Activity',
    'Stay': 'Stay',
    'Transportation': 'Transportation',
    'Dining': 'Dining'
  };

  const mappedServiceType = serviceTypeMap[item.serviceType] || 'Activity';
  console.log('📊 Mapped Service Type:', item.serviceType, '→', mappedServiceType);

  // Build base booking data with ALL required fields
  const bookingData = {
    customer: userId,
    service: item.serviceId,
    vendor: vendorId, // ✅ Now this will have the correct value!
    serviceType: mappedServiceType,
    status: 'confirmed',
    
    passengers: {
      adults: item.numPeople || 1,
      children: 0,
      infants: 0,
      total: item.numPeople || 1
    },
    
pricing: {
  basePrice: item.priceBreakdown?.basePrice || item.totalPrice,
  subtotal: item.priceBreakdown?.basePrice || item.totalPrice,
  totalAmount: item.totalPrice
},
    
    payment: {
      method: 'credit-card',
      status: 'completed',
      transactionId: paymentIntent.id,
      paidAt: new Date()
    },
    
    scheduledDateTime: new Date(item.selectedDate || item.startDate || Date.now()),
    
    ...((!userId && guestName) && {
      guestInfo: {
        name: guestName,
        email: guestEmail
      }
    }),
    
    ...(item.notes && {
      notes: item.notes
    })
  };

  console.log('📦 Base booking data prepared');
  console.log('   - Customer:', bookingData.customer || 'guest');
  console.log('   - Service:', bookingData.service);
  console.log('   - Vendor:', bookingData.vendor);
  console.log('   - Total:', `$${bookingData.pricing.totalAmount}`);

      // Add service-specific fields
      switch (mappedServiceType) {
case 'Stay':
  console.log('🏨 Adding Stay-specific fields...');
  const checkInDate = new Date(item.startDate || item.selectedDate);
  const checkOutDate = item.endDate ? new Date(item.endDate) : new Date(checkInDate.getTime() + (7 * 24 * 60 * 60 * 1000)); // Default 7 nights
  
  bookingData.stayDetails = {
    checkIn: checkInDate,
    checkOut: checkOutDate,
    nights: item.endDate && item.startDate ? 
      Math.ceil((new Date(item.endDate) - new Date(item.startDate)) / (1000 * 60 * 60 * 24)) : 7,
    roomType: item.roomId || 'Standard'
  };
          if (item.roomId) {
            bookingData.room = item.roomId;
          }
          console.log('   ✅ Stay details added');
          break;

        case 'Transportation':
          console.log('🚗 Adding Transportation-specific fields...');
          bookingData.category = item.category || 'Airport Transfer';
          bookingData.transportationDetails = {
            tripType: 'one-way',
            pickup: {
              location: {
                name: item.pickupLocation || 'Pickup Location',
                address: item.pickupLocation || ''
              },
              date: new Date(item.selectedDate),
              time: item.selectedTime || '12:00 PM'
            },
            dropoff: {
              location: {
                name: item.dropoffLocation || 'Dropoff Location',
                address: item.dropoffLocation || ''
              }
            }
          };
          if (item.optionId) {
            bookingData.selectedOption = item.optionId;
          }
          console.log('   ✅ Transportation details added');
          break;

        case 'Activity':
          console.log('🎯 Adding Activity-specific fields...');
          bookingData.activityDetails = {
            date: new Date(item.selectedDate),
            time: item.selectedTime || 'TBD',
            duration: item.timeSlot ? 
              `${item.timeSlot.startTime} - ${item.timeSlot.endTime}` : 'TBD'
          };
          if (item.timeSlot) {
            bookingData.timeSlot = {
              startTime: item.timeSlot.startTime,
              endTime: item.timeSlot.endTime
            };
          }
          if (item.optionId) {
            bookingData.selectedOption = item.optionId;
          }
          console.log('   ✅ Activity details added');
          break;

        case 'Dining':
          console.log('🍽️ Adding Dining-specific fields...');
          bookingData.diningDetails = {
            reservationDate: new Date(item.selectedDate),
            reservationTime: item.selectedTime || '7:00 PM',
            partySize: item.numPeople || 1
          };
          console.log('   ✅ Dining details added');
          break;
      }

      console.log('💾 Saving booking to database...');
      console.log('Booking data:', JSON.stringify(bookingData, null, 2));
      
      const booking = await Booking.create(bookingData);
      
      console.log('✅✅✅ BOOKING CREATED SUCCESSFULLY! ✅✅✅');
      console.log('   - Booking ID:', booking._id);
      console.log('   - Booking Number:', booking.bookingId);
      console.log('   - Status:', booking.status);
      console.log('   - Service Type:', booking.serviceType);
      console.log('   - Payment Transaction:', booking.payment.transactionId);
      
      createdBookingIds.push(booking._id);
      // Create referral commission if referral code exists
if (paymentIntent.metadata.referralCode && paymentIntent.metadata.referralCode.trim()) {
  try {
    console.log(`💰 Processing referral commission for code: ${paymentIntent.metadata.referralCode}`);
    const commission = await referralService.createCommissionFromBooking(
      booking,
      paymentIntent.metadata.referralCode
    );
    if (commission) {
      console.log(`✅ Commission created: ${commission._id}`);
    }
  } catch (commError) {
    console.error('⚠️  Error creating referral commission:', commError.message);
    // Don't fail booking if commission creation fails
  }
}
      successfulItemIds.push(item._id);
      
    // ✅ ADD CAICOS CREDITS: 1 point per dollar spent
if (userId) {
  try {
    const User = require('../models/User');
    const amountPaid = item.totalPrice;
    const creditsToAward = Math.floor(amountPaid); // 1 point per dollar
    
    if (creditsToAward > 0) {
      const updateResult = await User.findByIdAndUpdate(
        userId,
        { $inc: { caicosCredits: creditsToAward } },
        { new: true }
      );
      
      console.log(`💰 Awarded ${creditsToAward} Caicos Credits to user`);
      console.log(`   - Amount spent: $${amountPaid}`);
      console.log(`   - New balance: ${updateResult?.caicosCredits || 'unknown'} credits`);
    }
  } catch (creditsError) {
    console.error('⚠️  Error awarding Caicos Credits:', creditsError.message);
    // Don't fail the booking if credits award fails
  }
}
    } catch (itemError) {
      console.error(`\n❌❌❌ ERROR CREATING BOOKING ❌❌❌`);
      console.error('Item:', item.serviceId);
      console.error('Error message:', itemError.message);
      console.error('Error stack:', itemError.stack);
      
      if (itemError.errors) {
        console.error('Validation errors:');
        Object.keys(itemError.errors).forEach(key => {
          console.error(`   - ${key}:`, itemError.errors[key].message);
        });
      }
      
      failedItems.push({ 
        item, 
        error: itemError.message 
      });
    }
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log('📊 BOOKING SUMMARY');
  console.log(`${'='.repeat(50)}`);
  console.log('Total items:', cartItems.length);
  console.log('Successfully created:', createdBookingIds.length);
  console.log('Failed:', failedItems.length);
  
  if (createdBookingIds.length > 0) {
    console.log('\n✅ Created booking IDs:');
    createdBookingIds.forEach((id, idx) => {
      console.log(`   ${idx + 1}. ${id}`);
    });
  }

  if (failedItems.length > 0) {
    console.log('\n❌ Failed items:');
    failedItems.forEach((fail, idx) => {
      console.log(`   ${idx + 1}. Service: ${fail.item.serviceId} - Error: ${fail.error}`);
    });
  }

  // Cart cleanup
  if (userId && cartId !== 'guest_cart' && createdBookingIds.length > 0) {
    try {
      console.log('\n🧹 Cleaning up cart...');
      const cart = await Cart.findById(cartId);
      
      if (cart) {
        if (failedItems.length === 0) {
          cart.items = [];
          cart.totalCartPrice = 0;
          await cart.save();
          console.log('✅ Cart completely cleared');
        } else {
          cart.items = cart.items.filter(item => 
            !successfulItemIds.includes(item._id.toString())
          );
          cart.totalCartPrice = cart.items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
          await cart.save();
          console.log(`⚠️  Removed ${successfulItemIds.length} items from cart`);
          console.log(`   - ${cart.items.length} failed items remain`);
        }
      }
    } catch (clearError) {
      console.error('❌ Error updating cart:', clearError);
    }
  }

  console.log('\n==========================================');
  console.log('🎉 WEBHOOK: CART CHECKOUT - END');
  console.log('==========================================\n');

return res.status(200).json({ 
  received: true, 
  booking_status: createdBookingIds.length > 0 ? 'created' : 'failed',
  booking_type: 'cart',
  total_items: cartItems.length,
  bookings_created: createdBookingIds.length,
  bookings_failed: failedItems.length,
  booking_ids: createdBookingIds,
  cart_status: failedItems.length === 0 ? 'cleared' : 'partially_cleared',
  referral_code_used: paymentIntent.metadata.referralCode || null, // ADD THIS LINE
  failed_items: failedItems.length > 0 ? failedItems.map(f => f.error) : undefined
});
}
    // ===== SINGLE ITEM CHECKOUT (unchanged) =====
    // ... your existing single booking logic ...

            // ===== EXISTING: Single item checkout logic (UNCHANGED) =====
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
    json: async (data) => {  // ← ADD 'async' HERE - THIS FIXES IT
      console.log(`Booking creation status ${code}:`, data);
      if (code >= 200 && code < 300) {
        bookingResult = data;
        
        // Create referral commission if referral code exists
        if (bookingResult?.data?._id && bookingDetails.referralCode) {
          try {
            const trimmedCode = bookingDetails.referralCode.trim();
            
            if (trimmedCode) {
              console.log(`💰 Processing referral commission for code: ${trimmedCode}`);
              // NOW this works because json() is async
              const commission = await referralService.createCommissionFromBooking(
                bookingResult.data,
                trimmedCode
              );
              
              if (commission) {
                console.log(`✅ Commission created: $${commission.commissionAmount.toFixed(2)}`);
              }
            }
          } catch (commError) {
            console.error('⚠️  Error creating referral commission:', commError.message);
            // Don't fail booking if commission creation fails
          }
        }
        
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
  booking_id: bookingResult?.data?._id,
  referral_code_used: bookingDetails.referralCode || null // ADD THIS LINE
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