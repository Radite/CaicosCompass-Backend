const Booking = require('../models/Booking');
const { 
  afterBookingCreate, 
  afterBookingUpdate, 
  afterBookingDelete 
} = require('../middleware/analyticsHooks');

// This function creates the booking using data verified after payment.
// Complete fixed createBookingFromPayment function matching the ACTUAL Booking schema

exports.createBookingFromPayment = async (req, res) => {
    try {
        const { bookingDetails, paymentIntentId } = req.body;

        // Check if a booking with this paymentIntentId already exists
        const existingBooking = await Booking.findOne({ 
            'payment.transactionId': paymentIntentId 
        });
        if (existingBooking) {
            return res.status(200).json({ 
                success: true, 
                message: "Booking already exists.", 
                data: existingBooking 
            });
        }

        // Fetch the service and vendor from the database
        let serviceId = null;
        let vendorId = null;
        
        // Determine service ID based on category
        if (bookingDetails.category === 'activity' && bookingDetails.activity) {
            serviceId = bookingDetails.activity;
        } else if (bookingDetails.category === 'spa' && bookingDetails.spa) {
            serviceId = bookingDetails.spa;
        } else if (bookingDetails.category === 'stay' && bookingDetails.stay) {
            serviceId = bookingDetails.stay;
        } else if (bookingDetails.category === 'transportation' && bookingDetails.transportation) {
            serviceId = bookingDetails.transportation;
        } else if (bookingDetails.category === 'dining' && bookingDetails.dining) {
            serviceId = bookingDetails.dining;
        }

        if (!serviceId) {
            throw new Error(`Could not find service ID for ${bookingDetails.category} booking`);
        }

        // Fetch service to get vendor
        const Service = require('../models/Service');
        const serviceDoc = await Service.findById(serviceId).lean();
        
        if (!serviceDoc) {
            throw new Error(`Service not found: ${serviceId}`);
        }

        // Get vendor from service (try both 'vendor' and 'host' fields)
        vendorId = serviceDoc.vendor || serviceDoc.host;
        
        if (!vendorId) {
            throw new Error(`Vendor not found for service: ${serviceId}`);
        }

        // Map category to serviceType enum
        const serviceTypeMapping = {
            'activity': 'Activity',
            'stay': 'Stay',
            'transportation': 'Transportation',
            'dining': 'Dining',
            'spa': 'Activity' // Map spa to Activity if not in enum
        };

        // Create booking data matching the ACTUAL schema
        const bookingData = {
            // Required: customer, service, vendor
            customer: bookingDetails.user, // Map user -> customer
            service: serviceId,
            vendor: vendorId,
            
            // Required: serviceType
            serviceType: serviceTypeMapping[bookingDetails.category],
            
            // Optional: category (only for Transportation)
            ...(bookingDetails.category === 'transportation' && {
                category: bookingDetails.transportationCategory || 'Airport Transfer'
            }),
            
            // Status
            status: 'confirmed',
            
            // Required: Passengers
            passengers: {
                adults: bookingDetails.numOfPeople || 1,
                children: 0,
                infants: 0,
                total: bookingDetails.numOfPeople || 1
            },
            
            // Required: Pricing
            pricing: {
                basePrice: bookingDetails.basePrice || bookingDetails.totalPrice,
                subtotal: bookingDetails.basePrice || bookingDetails.totalPrice,
                totalAmount: bookingDetails.totalPrice
            },
            
            // Required: Payment
            payment: {
                method: 'credit-card',
                status: 'completed',
                transactionId: paymentIntentId,
                paidAt: new Date()
            },
            
            // Transportation details (if applicable)
            ...(bookingDetails.category === 'transportation' && {
                transportationDetails: {
                    tripType: 'one-way',
                    pickup: {
                        location: {
                            name: bookingDetails.pickupLocation || 'Not specified',
                            address: bookingDetails.pickupLocation || ''
                        },
                        date: bookingDetails.date ? new Date(bookingDetails.date) : new Date(),
                        time: bookingDetails.time || ''
                    },
                    dropoff: {
                        location: {
                            name: bookingDetails.dropoffLocation || 'Not specified',
                            address: bookingDetails.dropoffLocation || ''
                        }
                    }
                }
            }),
            
            // Scheduled date/time - convert "10:00 AM" to "10:00" format
            scheduledDateTime: (() => {
                if (!bookingDetails.date) return new Date();
                
                // Extract start time from "10:00 AM - 10:30 AM" format
                let timeStr = bookingDetails.time?.split(' - ')[0] || '12:00 PM';
                
                // Convert 12-hour format to 24-hour format
                const convertTo24Hour = (time12h) => {
                    const [time, modifier] = time12h.split(' ');
                    let [hours, minutes] = time.split(':');
                    
                    if (hours === '12') {
                        hours = modifier === 'AM' ? '00' : '12';
                    } else if (modifier === 'PM') {
                        hours = String(parseInt(hours, 10) + 12);
                    }
                    
                    return `${hours.padStart(2, '0')}:${minutes}`;
                };
                
                const time24 = convertTo24Hour(timeStr);
                return new Date(`${bookingDetails.date}T${time24}:00`);
            })(),
            
            // Preferences
            preferences: {
                specialRequests: bookingDetails.requirements || ''
            },
            
            // Booking metadata
            bookingSource: 'web',
            bookingDate: new Date()
        };

        console.log('Creating booking with data:', JSON.stringify(bookingData, null, 2));

        const newBooking = await Booking.create(bookingData);
        
        console.log('Booking created successfully:', newBooking._id);
                await newBooking.populate([
            { path: 'vendor', select: 'businessProfile.businessName' },
            { path: 'service' }
        ]);
        afterBookingCreate(newBooking);

        // --- ADD CAICOS CREDITS: 1 point per dollar spent ---
        try {
            const User = require('../models/User');
            const amountPaid = bookingDetails.totalPrice;
            const creditsToAward = Math.floor(amountPaid); // 1 point per dollar, rounded down
            
            if (creditsToAward > 0 && bookingDetails.user) {
                const updateResult = await User.findByIdAndUpdate(
                    bookingDetails.user,
                    { 
                        $inc: { caicosCredits: creditsToAward } // FIXED: caicosCredits not loyaltyPoints
                    },
                    { new: true } // Return updated document
                );
                
                console.log(`✅ Awarded ${creditsToAward} CaicosCredits to user ${bookingDetails.user} ($${amountPaid} spent)`);
                console.log(`   New balance: ${updateResult?.caicosCredits || 'unknown'} credits`);
            }
        } catch (creditsError) {
            // Log error but don't fail the booking
            console.error('❌ Error awarding CaicosCredits:', creditsError.message);
            console.error('Full error:', creditsError);
        }

        res.status(201).json({ success: true, data: newBooking });

    } catch (error) {
        console.error('Error creating booking from payment:', error.message);
        console.error('Full error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error creating booking.', 
            error: error.message 
        });
    }
};

// Create a new booking - Updated to support all service types
exports.createBooking = async (req, res) => {
  try {
    // Destructure common and service-specific fields from the request body
    const {
      category,
      // Service IDs for different categories
      itemId,          // Generic service ID (legacy support)
      activity,        // Activity ID
      stay,            // Stay ID
      transportation,  // Transportation ID
      dining,          // Dining ID
      spa,             // Spa ID
      service,         // Spa service ID
      serviceName,     // Spa service name
      // Options
      optionId,        // Option ID (for activities/transportation)
      option,          // Option ID (alternative naming)
      room,            // Room ID (for stays)
      // Dates and times
      date,            // Booking date
      time,            // Time slot string
      timeSlot,        // Time slot object with startTime/endTime
      startDate,       // Stay start date
      endDate,         // Stay end date
      // People and participants
      numOfPeople,
      numOfGuests,     // Alternative naming for stays
      multiUser,
      participants,    // Array of user IDs if multiUser is true
      // Location (for transportation)
      pickupLocation,
      dropoffLocation,
      // Contact and payment
      contactInfo,     // Contact information
      paymentDetails,  // Payment breakdown
      requirements,    // Special requirements/notes
      // Additional fields
      status = 'pending'
    } = req.body;

    // Start with common booking fields
    let bookingData = {
      user: req.user.id,
      category,
      numOfPeople: numOfPeople || numOfGuests || 1,
      multiUser: multiUser || false,
      status,
      contactInfo,
      paymentDetails,
      requirements
    };

    // Set participants if multi-user booking
    if (multiUser && participants && Array.isArray(participants)) {
      bookingData.participants = participants;
    }

    // Set fields based on the category
    switch (category) {
      case 'activity':
        bookingData.activity = activity || itemId;
        if (optionId || option) {
          bookingData.option = optionId || option;
        }
        bookingData.date = date;
        bookingData.time = time;
        if (timeSlot) {
          bookingData.timeSlot = timeSlot;
        }
        break;

      case 'stay':
        bookingData.stay = stay || itemId;
        if (room) {
          bookingData.room = room;
        }
        bookingData.startDate = startDate;
        bookingData.endDate = endDate;
        bookingData.numOfPeople = numOfGuests || numOfPeople || 1;
        break;

      case 'transportation':
        bookingData.transportation = transportation || itemId;
        if (optionId || option) {
          bookingData.option = optionId || option;
        }
        bookingData.date = date;
        bookingData.time = time;
        bookingData.pickupLocation = pickupLocation;
        bookingData.dropoffLocation = dropoffLocation;
        break;

      case 'dining':
        bookingData.dining = dining || itemId;
        bookingData.date = date;
        bookingData.time = time;
        if (timeSlot) {
          bookingData.timeSlot = timeSlot;
        }
        break;

      case 'spa':
        bookingData.spa = spa || itemId;
        bookingData.service = service;
        bookingData.serviceName = serviceName;
        bookingData.date = date;
        bookingData.time = time;
        if (timeSlot) {
          bookingData.timeSlot = timeSlot;
        }
        bookingData.numOfPeople = 1; // Spa services typically for 1 person
        break;

      default:
        return res.status(400).json({ 
          success: false, 
          message: `Invalid booking category: ${category}. Supported categories: activity, stay, transportation, dining, spa` 
        });
    }

    // Create the booking using the booking schema
    const newBooking = await Booking.create(bookingData);
    
    // Populate references for complete response
    await newBooking.populate([
      { path: 'user', select: 'firstName lastName email' },
      { path: 'participants', select: 'firstName lastName email' },
      { path: 'activity', select: 'name images location island' },
      { path: 'stay', select: 'name images location island' },
      { path: 'transportation', select: 'name vehicleType images' },
      { path: 'dining', select: 'name images location island cuisine' },
      { path: 'spa', select: 'name images location island spaType' },
      { path: 'option', select: 'title cost duration' }
    ]);

    afterBookingCreate(newBooking);
    res.status(201).json({ success: true, data: newBooking });
  } catch (error) {
    console.error('Error creating booking:', error.message);
    res.status(500).json({ 
      success: false, 
      message: 'Error creating booking.', 
      error: error.message 
    });
  }
};

// Update an existing booking
exports.updateBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    // Check if user owns this booking or is admin
    if (booking.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Unauthorized to update this booking.' 
      });
    }

    const oldBooking = booking.toObject();
    const updatedBooking = await Booking.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true, runValidators: true }
    ).populate([
      { path: 'user', select: 'firstName lastName email' },
      { path: 'vendor', select: 'businessProfile.businessName' }, // ✨ ADD THIS
      { path: 'service' }, // ✨ ADD THIS
      { path: 'activity', select: 'name images location' },
      { path: 'stay', select: 'name images location' },
      { path: 'transportation', select: 'name vehicleType' },
      { path: 'dining', select: 'name images location' },
      { path: 'spa', select: 'name images location spaType' }
    ]);

    res.status(200).json({ success: true, data: updatedBooking });
  } catch (error) {
    console.error('Error updating booking:', error.message);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating booking.', 
      error: error.message 
    });
  }
};

// Cancel a booking
exports.cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    if (booking.user.toString() !== req.user.id) {
      return res.status(403).json({ 
        success: false, 
        message: 'Unauthorized to cancel this booking.' 
      });
    }

    if (booking.status === 'canceled') {
      return res.status(400).json({ 
        success: false, 
        message: 'Booking is already canceled.' 
      });
    }

        const oldBooking = booking.toObject();

    booking.status = 'canceled';
    booking.cancellation = {
      isCanceled: true,
      canceledBy: req.user.id,
      cancellationDate: new Date(),
      reason: req.body.reason || 'Canceled by user'
    };

    await booking.save();
        afterBookingUpdate(oldBooking, booking);

    res.status(200).json({ 
      success: true, 
      message: 'Booking canceled successfully.', 
      data: booking 
    });
  } catch (error) {
    console.error('Error canceling booking:', error.message);
    res.status(500).json({ 
      success: false, 
      message: 'Error canceling booking.', 
      error: error.message 
    });
  }
};

// Get all bookings for the authenticated user - Updated to support all service types
// Replace your getUserBookings function with this updated version
exports.getUserBookings = async (req, res) => {
  try {
    const { status, category } = req.query;
    
    // Build query using NEW schema fields
    let query = { customer: req.user.id }; // customer instead of user
    if (status) query.status = status;
    if (category) {
      // Map old category to new serviceType
      const categoryMap = {
        'activity': 'Activity',
        'stay': 'Stay',
        'transportation': 'Transportation',
        'dining': 'Dining'
      };
      query.serviceType = categoryMap[category] || category;
    }

    const bookings = await Booking.find(query)
      .populate('customer', 'name email phoneNumber')
      .populate('service', 'name description images location island')
      .populate('vendor', 'name businessProfile.businessName')
      .sort({ createdAt: -1 });

    // Transform bookings to match frontend expectations
    const transformedBookings = bookings.map(booking => {
      const bookingObj = booking.toObject();
      
      // Extract date and time from scheduledDateTime
      const scheduledDate = booking.scheduledDateTime ? new Date(booking.scheduledDateTime) : null;
      const dateStr = scheduledDate ? scheduledDate.toISOString().split('T')[0] : null;
      
      // Format time from scheduledDateTime
      let timeStr = null;
      if (scheduledDate) {
        const hours = scheduledDate.getHours();
        const minutes = scheduledDate.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        timeStr = `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
      }

      return {
        _id: booking._id,
        // Map serviceType -> category (lowercase)
        category: booking.serviceType?.toLowerCase() || 'activity',
        // Get service name from populated service
        serviceName: booking.service?.name || 'Unnamed Service',
        // Extract date and time
        date: dateStr,
        time: timeStr,
        startDate: dateStr, // For stays
        endDate: dateStr, // For stays (you may need additional logic)
        // Map passengers -> numOfPeople
        numOfPeople: booking.passengers?.total || 1,
        status: booking.status,
        // Map pickup/dropoff from transportationDetails if exists
        pickupLocation: booking.transportationDetails?.pickup?.location?.name,
        dropoffLocation: booking.transportationDetails?.dropoff?.location?.name,
        // Map pricing -> paymentDetails
        paymentDetails: {
          totalAmount: booking.pricing?.totalAmount || 0,
          amountPaid: booking.payment?.status === 'completed' ? booking.pricing?.totalAmount : 0,
          remainingBalance: 0
        },
        // Map special requests
        requirements: {
          specialNotes: booking.preferences?.specialRequests || ''
        },
        createdAt: booking.createdAt,
        // Include raw booking for reference
        _raw: bookingObj
      };
    });

    res.status(200).json({ 
      success: true, 
      count: transformedBookings.length,
      data: transformedBookings 
    });
  } catch (error) {
    console.error('Error fetching user bookings:', error.message);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching user bookings.', 
      error: error.message 
    });
  }
};

// Get a specific booking by ID - Updated to support all service types
exports.getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate([
      { path: 'user', select: 'firstName lastName email phone' },
      { path: 'participants', select: 'firstName lastName email phone' },
      { path: 'activity', select: 'name description images location island category duration vendor' },
      { path: 'stay', select: 'name description images location island amenities vendor' },
      { path: 'transportation', select: 'name description vehicleType images capacity vendor' },
      { path: 'dining', select: 'name description images location island cuisine vendor' },
      { path: 'spa', select: 'name description images location island spaType servicesOffered vendor' },
      { path: 'option', select: 'title description cost duration inclusions exclusions' }
    ]);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    // Check if user has permission to view this booking
    const canView = booking.user._id.toString() === req.user.id || 
                   booking.participants.some(p => p._id.toString() === req.user.id) ||
                   req.user.role === 'admin' ||
                   req.user.role === 'business_manager';

    if (!canView) {
      return res.status(403).json({ 
        success: false, 
        message: 'Unauthorized to view this booking.' 
      });
    }

    res.status(200).json({ success: true, data: booking });
  } catch (error) {
    console.error('Error fetching booking:', error.message);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching booking.', 
      error: error.message 
    });
  }
};

// Admin cancel a booking
exports.adminCancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate([
        { path: 'vendor', select: 'businessProfile.businessName' },
        { path: 'service' }
      ]);
      
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    // ✨ ADD THIS LINE
    const oldBooking = booking.toObject();
    booking.status = 'canceled';
    booking.cancellation = {
      isCanceled: true,
      canceledBy: req.user.id,
      cancellationDate: new Date(),
      refundAmount: req.body.refundAmount || booking.paymentDetails?.remainingBalance || 0,
      refundStatus: 'pending',
      reason: req.body.reason || 'Canceled by admin'
    };

    await booking.save();
        // ✨ ADD THIS LINE
    afterBookingUpdate(oldBooking, booking);
    res.status(200).json({ 
      success: true, 
      message: 'Booking canceled by admin.', 
      data: booking 
    });
  } catch (error) {
    console.error('Error canceling booking:', error.message);
    res.status(500).json({ 
      success: false, 
      message: 'Error canceling booking.', 
      error: error.message 
    });
  }
};

// Business Manager cancel a booking
exports.managerCancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate([
        { path: 'vendor', select: 'businessProfile.businessName' },
        { path: 'service' }
      ]);
      
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    // ✨ ADD THIS LINE
    const oldBooking = booking.toObject();
    booking.status = 'canceled';
    booking.cancellation = {
      isCanceled: true,
      canceledBy: req.user.id,
      cancellationDate: new Date(),
      refundAmount: req.body.refundAmount || booking.paymentDetails?.remainingBalance || 0,
      refundStatus: 'pending',
      reason: req.body.reason || 'Canceled by business manager'
    };

    await booking.save();
        // ✨ ADD THIS LINE
    afterBookingUpdate(oldBooking, booking);
    res.status(200).json({ 
      success: true, 
      message: 'Booking canceled by business manager.', 
      data: booking 
    });
  } catch (error) {
    console.error('Error canceling booking:', error.message);
    res.status(500).json({ 
      success: false, 
      message: 'Error canceling booking.', 
      error: error.message 
    });
  }
};

// Handle payments for a booking
exports.payForBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, paymentMethod } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid payment amount.' 
      });
    }

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    // Initialize paymentDetails if it doesn't exist
    if (!booking.paymentDetails) {
      booking.paymentDetails = {
        totalAmount: amount,
        amountPaid: 0,
        remainingBalance: amount,
        payees: []
      };
    }

    // Add payment record
    booking.paymentDetails.payees.push({
      user: req.user.id,
      amount,
      status: 'paid',
      paymentMethod,
      paidAt: new Date()
    });

    booking.paymentDetails.amountPaid += amount;
    booking.paymentDetails.remainingBalance = Math.max(0, booking.paymentDetails.remainingBalance - amount);

    // Update booking status if fully paid
    if (booking.paymentDetails.remainingBalance === 0) {
      booking.status = 'confirmed';
    }

    await booking.save();
    res.status(200).json({ 
      success: true, 
      message: 'Payment processed successfully.', 
      data: booking 
    });
  } catch (error) {
    console.error('Error processing payment:', error.message);
    res.status(500).json({ 
      success: false, 
      message: 'Error processing payment.', 
      error: error.message 
    });
  }
};

// Update payment status for a payee
exports.updatePayeePayment = async (req, res) => {
  try {
    const { id, payeeId } = req.params;
    const { status } = req.body;

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    const payee = booking.paymentDetails.payees.id(payeeId);
    if (!payee) {
      return res.status(404).json({ success: false, message: 'Payee not found.' });
    }

    payee.status = status;
    await booking.save();

    res.status(200).json({ 
      success: true, 
      message: 'Payee payment status updated.', 
      data: booking 
    });
  } catch (error) {
    console.error('Error updating payee payment status:', error.message);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating payee payment status.', 
      error: error.message 
    });
  }
};

// Initiate cancellation for a booking
exports.initiateCancellation = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    if (booking.user.toString() !== req.user.id) {
      return res.status(403).json({ 
        success: false, 
        message: 'Unauthorized to cancel this booking.' 
      });
    }

    booking.cancellation = {
      isCanceled: true,
      canceledBy: req.user.id,
      cancellationDate: new Date(),
      refundAmount: booking.paymentDetails?.remainingBalance || 0,
      refundStatus: 'pending',
      reason: reason || 'Canceled by user'
    };
    booking.status = 'canceled';

    await booking.save();
    res.status(200).json({ 
      success: true, 
      message: 'Cancellation initiated.', 
      data: booking 
    });
  } catch (error) {
    console.error('Error initiating cancellation:', error.message);
    res.status(500).json({ 
      success: false, 
      message: 'Error initiating cancellation.', 
      error: error.message 
    });
  }
};

// Add feedback for a booking
exports.addFeedback = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ 
        success: false, 
        message: 'Rating must be between 1 and 5.' 
      });
    }

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    if (booking.user.toString() !== req.user.id) {
      return res.status(403).json({ 
        success: false, 
        message: 'Unauthorized to add feedback for this booking.' 
      });
    }

    booking.feedback = {
      rating,
      comment,
      submittedAt: new Date(),
    };

    await booking.save();
    res.status(200).json({ 
      success: true, 
      message: 'Feedback added successfully.', 
      data: booking 
    });
  } catch (error) {
    console.error('Error adding feedback:', error.message);
    res.status(500).json({ 
      success: false, 
      message: 'Error adding feedback.', 
      error: error.message 
    });
  }
};

// Get feedback for a booking
exports.getFeedback = async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await Booking.findById(id).select('feedback');
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    res.status(200).json({ 
      success: true, 
      data: booking.feedback || null 
    });
  } catch (error) {
    console.error('Error fetching feedback:', error.message);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching feedback.', 
      error: error.message 
    });
  }
};

// Get notifications for a booking
exports.getBookingNotifications = async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await Booking.findById(id).select('notifications');
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    res.status(200).json({ 
      success: true, 
      data: booking.notifications || [] 
    });
  } catch (error) {
    console.error('Error fetching notifications:', error.message);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching notifications.', 
      error: error.message 
    });
  }
};

// Mark a notification as read
exports.markNotificationRead = async (req, res) => {
  try {
    const { id, notificationId } = req.params;

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    const notification = booking.notifications?.id(notificationId);
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found.' });
    }

    notification.read = true;
    await booking.save();

    res.status(200).json({ 
      success: true, 
      message: 'Notification marked as read.', 
      data: booking 
    });
  } catch (error) {
    console.error('Error marking notification as read:', error.message);
    res.status(500).json({ 
      success: false, 
      message: 'Error marking notification as read.', 
      error: error.message 
    });
  }
};

// Checkout multiple items from the cart
exports.checkoutMultipleBookings = async (req, res) => {
  try {
    const Cart = require('../models/Cart'); // Make sure Cart model is imported

    // Fetch user's cart
    const userCart = await Cart.findOne({ user: req.user.id }).populate('items.item');

    if (!userCart || userCart.items.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Your cart is empty.' 
      });
    }

    // Process each cart item to create bookings
    const bookings = await Promise.all(
      userCart.items.map(async (cartItem) => {
        return Booking.create({
          user: req.user.id,
          category: cartItem.category || 'activity', // Default to activity if not specified
          activity: cartItem.category === 'activity' ? cartItem.item : undefined,
          stay: cartItem.category === 'stay' ? cartItem.item : undefined,
          transportation: cartItem.category === 'transportation' ? cartItem.item : undefined,
          dining: cartItem.category === 'dining' ? cartItem.item : undefined,
          spa: cartItem.category === 'spa' ? cartItem.item : undefined,
          option: cartItem.option || null,
          numOfPeople: cartItem.numPeople || 1,
          date: cartItem.selectedDate,
          time: cartItem.selectedTime,
          startDate: cartItem.startDate,
          endDate: cartItem.endDate,
          status: 'confirmed',
          paymentDetails: {
            totalAmount: cartItem.totalPrice,
            amountPaid: cartItem.totalPrice,
            remainingBalance: 0,
            payees: [{
              user: req.user.id,
              amount: cartItem.totalPrice,
              status: 'paid',
              paymentMethod: 'card',
              paidAt: new Date()
            }],
          },
          requirements: {
            specialNotes: cartItem.notes || ''
          }
        });
        // ✨ ADD THESE LINES
        await newBooking.populate([
          { path: 'vendor', select: 'businessProfile.businessName' },
          { path: 'service' }
        ]);
        afterBookingCreate(newBooking);

        return newBooking;
      })
    );


    // Clear the cart after checkout
    userCart.items = [];
    await userCart.save();

    res.status(200).json({
      success: true,
      message: 'All items successfully booked.',
      data: bookings,
    });
  } catch (error) {
    console.error('Error processing checkout:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error processing checkout.',
      error: error.message,
    });
  }
};

// Get booking statistics for user
exports.getUserBookingStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const stats = await Booking.aggregate([
      { $match: { user: mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalSpent: { $sum: '$paymentDetails.totalAmount' },
          confirmed: {
            $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] }
          },
          pending: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          canceled: {
            $sum: { $cond: [{ $eq: ['$status', 'canceled'] }, 1, 0] }
          }
        }
      }
    ]);

    const totalBookings = await Booking.countDocuments({ user: userId });
    const totalSpent = await Booking.aggregate([
      { $match: { user: mongoose.Types.ObjectId(userId) } },
      { $group: { _id: null, total: { $sum: '$paymentDetails.totalAmount' } } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalBookings,
        totalSpent: totalSpent[0]?.total || 0,
        categoryStats: stats
      }
    });
  } catch (error) {
    console.error('Error fetching booking stats:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error fetching booking statistics.',
      error: error.message
    });
  }
};

exports.finalizeBooking = async (req, res) => {
  try {
    const { paymentIntentId } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json({ success: false, message: 'Payment Intent ID is required.' });
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({ success: false, message: 'Payment was not successful.' });
    }

    const bookingDetails = JSON.parse(paymentIntent.metadata.bookingData);
    
    const existingBooking = await Booking.findOne({ paymentIntentId: paymentIntent.id });
    if (existingBooking) {
        return res.status(200).json({ success: true, data: existingBooking, message: "Booking already existed." });
    }

    // --- FIX #1: Determine the correct category enum from the data ---
    let categoryEnum;
    if (bookingDetails.activity) categoryEnum = 'activity';
    else if (bookingDetails.stay) categoryEnum = 'stay';
    else if (bookingDetails.transportation) categoryEnum = 'transportation';
    else if (bookingDetails.dining) categoryEnum = 'dining';
    else if (bookingDetails.spa) categoryEnum = 'spa';
    else {
      throw new Error('Could not determine a valid booking category from payment metadata.');
    }

    // Create the booking object with the fields matching your schema
    const bookingData = {
      user: bookingDetails.user,
      guestName: bookingDetails.guestName,
      guestEmail: bookingDetails.guestEmail,
      category: categoryEnum, // Use the corrected category enum
      activity: bookingDetails.activity,
      stay: bookingDetails.stay,
      transportation: bookingDetails.transportation,
      dining: bookingDetails.dining,
      spa: bookingDetails.spa,
      option: bookingDetails.option,
      date: bookingDetails.date,
      timeSlot: bookingDetails.timeSlot,
      numOfPeople: bookingDetails.numOfPeople,
      paymentDetails: {
        // --- FIX #2: Change 'totalPrice' to 'totalAmount' ---
        totalAmount: bookingDetails.totalPrice,
        amountPaid: bookingDetails.totalPrice, // The full amount was paid
        paymentMethod: 'card'
      },
      paymentIntentId: paymentIntent.id,
      status: 'confirmed',
      contactInfo: bookingDetails.contactInfo,
    };

    const newBooking = await Booking.create(bookingData);
    
    console.log('--- BOOKING CREATED SUCCESSFULLY ---', newBooking._id);
        // ✨ ADD THESE LINES
    await newBooking.populate([
      { path: 'vendor', select: 'businessProfile.businessName' },
      { path: 'service' }
    ]);
    afterBookingCreate(newBooking);
    
    res.status(201).json({ success: true, data: newBooking });

  } catch (error) {
    console.error('Error creating booking from payment:', error.message);
    res.status(500).json({ success: false, message: 'Error creating booking.', error: error.message });
  }
};

exports.getBookingByPaymentIntent = async (req, res) => {
  try {
    console.log('\n==========================================');
    console.log('🔍 GET BOOKING BY PAYMENT INTENT');
    console.log('==========================================');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Payment Intent ID:', req.params.paymentIntentId);
    
    console.log('🔍 Searching for bookings...');
    const bookings = await Booking.find({ 
      'payment.transactionId': req.params.paymentIntentId 
    }).populate([
      { path: 'customer', select: 'name email phoneNumber' },
      { path: 'service', select: 'name description images location island serviceType' },
      { path: 'vendor', select: 'name email businessProfile.businessName businessProfile.businessPhone' }
    ]);

    console.log('Found bookings:', bookings.length);

    if (!bookings || bookings.length === 0) {
      console.log('❌ No bookings found');
      console.log('==========================================\n');
      return res.status(404).json({ 
        success: false, 
        message: 'Booking not found.' 
      });
    }

    console.log('✅ Bookings found!');
    bookings.forEach((booking, idx) => {
      console.log(`   ${idx + 1}. ${booking.bookingId} - ${booking.serviceType} - ${booking.status}`);
    });
    
    if (bookings.length === 1) {
      console.log('📄 Returning single booking');
      console.log('==========================================\n');
      res.status(200).json({ 
        success: true, 
        data: bookings[0],
        isCart: false
      });
    } else {
      console.log('📦 Returning multiple bookings (cart)');
      console.log('==========================================\n');
      res.status(200).json({ 
        success: true, 
        data: bookings,
        isCart: true,
        count: bookings.length
      });
    }
  } catch (error) {
    console.error('\n❌❌❌ ERROR FETCHING BOOKING ❌❌❌');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('==========================================\n');
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching booking.',
      error: error.message 
    });
  }
};