const Booking = require('../models/Booking');

// Create a new booking
exports.createBooking = async (req, res) => {
  try {
    // Destructure common and service-specific fields from the request body.
    const {
      category,
      itemId,          // The service's ObjectId (Activity, Stay, or Transportation)
      optionId,        // (Optional) specific option's ObjectId (for Activity/Transportation)
      date,            // For Activity and Transportation: booking date; for Stay: could be startDate.
      time,            // For Activity: time slot; For Transportation: pickup time.
      startDate,       // For Stay bookings.
      endDate,         // For Stay bookings.
      numOfPeople,
      multiUser,
      participants,    // Array of user IDs if multiUser is true.
      paymentDetails,  // Payment breakdown, if needed.
      // You can include additional fields as required (e.g., pickupLocation, dropoffLocation for transportation).
      pickupLocation,
      dropoffLocation,
    } = req.body;

    // Start with common booking fields.
    let bookingData = {
      user: req.user.id,
      category,
      numOfPeople,
      multiUser,
      paymentDetails, // This can include totalAmount, etc.
    };

    // Set participants if multi-user booking.
    if (multiUser && participants && Array.isArray(participants)) {
      bookingData.participants = participants;
    }

    // Set fields based on the category.
    if (category === 'activity') {
      bookingData.activity = itemId;
      if (optionId) {
        bookingData.option = optionId;
      }
      bookingData.date = date; // The booking date.
      bookingData.time = time; // The selected time slot (e.g., "10:00 AM - 10:30 AM").
    } else if (category === 'stay') {
      bookingData.stay = itemId;
      bookingData.startDate = startDate;
      bookingData.endDate = endDate;
      // You might also want to include number of nights or similar calculations on the frontend.
    } else if (category === 'transportation') {
      bookingData.transportation = itemId;
      if (optionId) {
        bookingData.option = optionId;
      }
      bookingData.date = date; // The booking date.
      bookingData.time = time; // For transportation, this is the pickup time.
      bookingData.pickupLocation = pickupLocation;
      bookingData.dropoffLocation = dropoffLocation;
    } else {
      return res.status(400).json({ success: false, message: 'Invalid booking category.' });
    }

    // Create the booking using the booking schema.
    const newBooking = await Booking.create(bookingData);
    res.status(201).json({ success: true, data: newBooking });
  } catch (error) {
    console.error('Error creating booking:', error.message);
    res.status(500).json({ success: false, message: 'Error creating booking.', error: error.message });
  }
};

// Update an existing booking
exports.updateBooking = async (req, res) => {
  try {
    const updatedBooking = await Booking.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedBooking) {
      return res.status(404).json({ message: 'Booking not found.' });
    }
    res.status(200).json({ success: true, data: updatedBooking });
  } catch (error) {
    console.error('Error updating booking:', error.message);
    res.status(500).json({ success: false, message: 'Error updating booking.', error: error.message });
  }
};

// Cancel a booking
exports.cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found.' });
    }

    if (booking.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized to cancel this booking.' });
    }

    booking.status = 'canceled';
    booking.cancellation = {
      isCanceled: true,
      canceledBy: req.user.id,
      cancellationDate: new Date(),
    };

    await booking.save();
    res.status(200).json({ success: true, message: 'Booking canceled successfully.', booking });
  } catch (error) {
    console.error('Error canceling booking:', error.message);
    res.status(500).json({ success: false, message: 'Error canceling booking.', error: error.message });
  }
};

// Get all bookings for the authenticated user
exports.getUserBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user.id });
    res.status(200).json({ success: true, data: bookings });
  } catch (error) {
    console.error('Error fetching user bookings:', error.message);
    res.status(500).json({ success: false, message: 'Error fetching user bookings.', error: error.message });
  }
};

// Get a specific booking by ID
exports.getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate('user participants activity option');
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found.' });
    }
    res.status(200).json({ success: true, data: booking });
  } catch (error) {
    console.error('Error fetching booking:', error.message);
    res.status(500).json({ success: false, message: 'Error fetching booking.', error: error.message });
  }
};

// Admin cancel a booking
exports.adminCancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found.' });
    }

    booking.status = 'canceled';
    booking.cancellation = {
      isCanceled: true,
      canceledBy: req.user.id, // Admin's ID
      cancellationDate: new Date(),
      refundAmount: booking.paymentDetails.remainingBalance, // Assume full refund
      refundStatus: 'pending',
    };

    await booking.save();
    res.status(200).json({ success: true, message: 'Booking canceled by admin.', booking });
  } catch (error) {
    console.error('Error canceling booking:', error.message);
    res.status(500).json({ success: false, message: 'Error canceling booking.', error: error.message });
  }
};

// Business Manager cancel a booking
exports.managerCancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found.' });
    }

    booking.status = 'canceled';
    booking.cancellation = {
      isCanceled: true,
      canceledBy: req.user.id, // Manager's ID
      cancellationDate: new Date(),
      refundAmount: booking.paymentDetails.remainingBalance, // Assume full refund
      refundStatus: 'pending',
    };

    await booking.save();
    res.status(200).json({ success: true, message: 'Booking canceled by business manager.', booking });
  } catch (error) {
    console.error('Error canceling booking:', error.message);
    res.status(500).json({ success: false, message: 'Error canceling booking.', error: error.message });
  }
};


// Handle payments for a booking
exports.payForBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, paymentMethod } = req.body;

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found.' });
    }

    booking.paymentDetails.payees.push({
      user: req.user.id,
      amount,
      status: 'paid',
      paymentMethod,
    });

    booking.paymentDetails.amountPaid += amount;
    booking.paymentDetails.remainingBalance -= amount;

    await booking.save();
    res.status(200).json({ success: true, message: 'Payment processed successfully.', booking });
  } catch (error) {
    console.error('Error processing payment:', error.message);
    res.status(500).json({ success: false, message: 'Error processing payment.', error: error.message });
  }
};

// Update payment status for a payee
exports.updatePayeePayment = async (req, res) => {
  try {
    const { id, payeeId } = req.params;
    const { status } = req.body;

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found.' });
    }

    const payee = booking.paymentDetails.payees.id(payeeId);
    if (!payee) {
      return res.status(404).json({ message: 'Payee not found.' });
    }

    payee.status = status;
    await booking.save();

    res.status(200).json({ success: true, message: 'Payee payment status updated.', booking });
  } catch (error) {
    console.error('Error updating payee payment status:', error.message);
    res.status(500).json({ success: false, message: 'Error updating payee payment status.', error: error.message });
  }
};

// Initiate cancellation for a booking
exports.initiateCancellation = async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found.' });
    }

    booking.cancellation = {
      isCanceled: true,
      canceledBy: req.user.id,
      cancellationDate: new Date(),
      refundAmount: booking.paymentDetails.remainingBalance,
      refundStatus: 'pending',
    };
    booking.status = 'canceled';

    await booking.save();
    res.status(200).json({ success: true, message: 'Cancellation initiated.', booking });
  } catch (error) {
    console.error('Error initiating cancellation:', error.message);
    res.status(500).json({ success: false, message: 'Error initiating cancellation.', error: error.message });
  }
};

// Add feedback for a booking
exports.addFeedback = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found.' });
    }

    booking.feedback = {
      rating,
      comment,
      submittedAt: new Date(),
    };

    await booking.save();
    res.status(200).json({ success: true, message: 'Feedback added.', booking });
  } catch (error) {
    console.error('Error adding feedback:', error.message);
    res.status(500).json({ success: false, message: 'Error adding feedback.', error: error.message });
  }
};

// Get feedback for a booking
exports.getFeedback = async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found.' });
    }

    res.status(200).json({ success: true, data: booking.feedback });
  } catch (error) {
    console.error('Error fetching feedback:', error.message);
    res.status(500).json({ success: false, message: 'Error fetching feedback.', error: error.message });
  }
};

// Get notifications for a booking
exports.getBookingNotifications = async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found.' });
    }

    res.status(200).json({ success: true, data: booking.notifications });
  } catch (error) {
    console.error('Error fetching notifications:', error.message);
    res.status(500).json({ success: false, message: 'Error fetching notifications.', error: error.message });
  }
};

// Mark a notification as read
exports.markNotificationRead = async (req, res) => {
  try {
    const { id, notificationId } = req.params;

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found.' });
    }

    const notification = booking.notifications.id(notificationId);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found.' });
    }

    notification.read = true;
    await booking.save();

    res.status(200).json({ success: true, message: 'Notification marked as read.', booking });
  } catch (error) {
    console.error('Error marking notification as read:', error.message);
    res.status(500).json({ success: false, message: 'Error marking notification as read.', error: error.message });
  }
};

// Checkout multiple items from the cart
exports.checkoutMultipleBookings = async (req, res) => {
  try {
    // Fetch user's cart
    const userCart = await Cart.findOne({ user: req.user.id });

    if (!userCart || userCart.items.length === 0) {
      return res.status(400).json({ success: false, message: 'Your cart is empty.' });
    }

    // Process each cart item to create bookings
    const bookings = await Promise.all(
      userCart.items.map(async (cartItem) => {
        return Booking.create({
          user: req.user.id,
          activity: cartItem.item,
          option: cartItem.option || null,
          quantity: cartItem.quantity,
          selectedDate: cartItem.selectedDate,
          selectedTime: cartItem.selectedTime,
          numPeople: cartItem.numPeople,
          totalPrice: cartItem.totalPrice,
          notes: cartItem.notes || '',
          status: 'confirmed',
          paymentDetails: {
            amountPaid: cartItem.totalPrice,
            remainingBalance: 0,
            payees: [{ user: req.user.id, amount: cartItem.totalPrice, status: 'paid', paymentMethod: 'card' }],
          },
        });
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