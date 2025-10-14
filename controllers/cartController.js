const Cart = require('../models/Cart');
const Activity = require('../models/Activity');
const Stay = require('../models/Stay');
const Transportation = require('../models/Transportation');
const Dining = require('../models/Dining');
const Shopping = require('../models/Shopping');
const mongoose = require('mongoose');

// Add item to cart (Enhanced for all service types)
// Add item to cart (Enhanced for all service types)
exports.addToCart = async (req, res) => {
  try {
    console.log("Add to Cart - Request Body:", req.body);
    console.log("User from token:", req.user);

    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Unauthorized: User not found" });
    }

    const {
      serviceId,
      serviceType,
      category,
      optionId,
      roomId,
      quantity = 1,
      selectedDate,
      startDate,
      endDate,
      selectedTime,
      timeSlot,
      numPeople,
      multiUser = false,
      totalPrice,
      priceBreakdown,
      discount,
      notes,
      pickupLocation,
      dropoffLocation,
      serviceName,
      productDetails
    } = req.body;

    // Validation
    if (!serviceId || !serviceType || !totalPrice) {
      return res.status(400).json({ 
        message: "Missing required fields: serviceId, serviceType, and totalPrice" 
      });
    }

    // Find or create cart
    let cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      console.log("Creating new cart for user:", req.user.id);
      cart = new Cart({ user: req.user.id, items: [] });
    }

    // Build cart item based on service type
    const cartItem = {
      service: serviceId,
      serviceType,
      category: category || serviceType,
      quantity,
      numPeople: numPeople || 1,
      multiUser,
      totalPrice,
      priceBreakdown,
      discount,
      notes,
      status: 'reserved',
      // ✅ REMOVED: reservedUntil - items now stay in cart forever
      audit: [{
        action: 'Added',
        timestamp: new Date(),
        performedBy: req.user.id
      }]
    };

    // Add service-specific fields (keep all your existing switch logic)
    switch (serviceType) {
      case 'stay':
        cartItem.startDate = startDate;
        cartItem.endDate = endDate;
        cartItem.selectedDate = startDate;
        if (roomId) cartItem.room = roomId;
        break;
      
      case 'activity':
        cartItem.selectedDate = selectedDate;
        cartItem.selectedTime = selectedTime;
        if (timeSlot) cartItem.timeSlot = timeSlot;
        if (optionId) cartItem.option = optionId;
        break;
      
      case 'transportation':
        cartItem.selectedDate = selectedDate;
        cartItem.selectedTime = selectedTime;
        cartItem.pickupLocation = pickupLocation;
        cartItem.dropoffLocation = dropoffLocation;
        if (optionId) cartItem.option = optionId;
        break;
      
      case 'dining':
        cartItem.selectedDate = selectedDate;
        cartItem.selectedTime = selectedTime;
        break;
      
      case 'spa':
      case 'wellnessspas':
        cartItem.selectedDate = selectedDate;
        cartItem.selectedTime = selectedTime;
        cartItem.serviceName = serviceName;
        if (optionId) cartItem.option = optionId;
        break;
      
      case 'shopping':
        cartItem.productDetails = productDetails;
        cartItem.quantity = quantity;
        break;
      
      default:
        cartItem.selectedDate = selectedDate;
        cartItem.selectedTime = selectedTime;
    }

    // Check if similar item already exists
    const existingItemIndex = cart.items.findIndex(item => {
      const sameService = item.service.toString() === serviceId;
      const sameDate = item.selectedDate?.toString() === new Date(cartItem.selectedDate || selectedDate).toString();
      const sameTime = item.selectedTime === selectedTime;
      const sameOption = (!optionId && !item.option) || (item.option?.toString() === optionId);
      
      return sameService && sameDate && sameTime && sameOption;
    });

    if (existingItemIndex > -1) {
      console.log("Updating existing cart item");
      cart.items[existingItemIndex].quantity += quantity;
      cart.items[existingItemIndex].totalPrice += totalPrice;
      cart.items[existingItemIndex].audit.push({
        action: 'Updated',
        timestamp: new Date(),
        performedBy: req.user.id
      });
    } else {
      console.log("Adding new item to cart");
      cart.items.push(cartItem);
    }

    // Recalculate total
    cart.totalCartPrice = cart.items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
    
    await cart.save();
    
    // Populate service details for response
    await cart.populate('items.service items.option items.room');
    
    console.log("✅ Cart saved successfully");
    res.status(201).json({
      success: true,
      message: "Item added to cart",
      cart
    });

  } catch (error) {
    console.error("❌ Error adding to cart:", error);
    res.status(500).json({ 
      success: false,
      message: 'Error adding item to cart', 
      error: error.message 
    });
  }
};

// Get user's cart with populated service details
exports.getCart = async (req, res) => {
  try {
    console.log("Fetching cart for user:", req.user.id);

    const cart = await Cart.findOne({ user: req.user.id })
      .populate({
        path: 'items.service',
        select: 'name location images mainImage pricePerNight basePrice category serviceType'
      })
      .populate({
        path: 'items.option',
        select: 'title description cost maxPeople'
      })
      .populate({
        path: 'items.room',
        select: 'type name pricePerNight'
      });

    if (!cart) {
      return res.status(200).json({ 
        success: true,
        cart: { items: [], totalCartPrice: 0 } 
      });
    }

    // ✅ REMOVED: Expiration filter - all items stay in cart
    // Items are only removed when user explicitly removes them

    // Recalculate total (in case of any data inconsistencies)
    if (cart.items.length === 0) {
      cart.totalCartPrice = 0;
    } else {
      cart.totalCartPrice = cart.items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
    }

    await cart.save();

    res.status(200).json({
      success: true,
      cart
    });

  } catch (error) {
    console.error("Error fetching cart:", error);
    res.status(500).json({ 
      success: false,
      message: 'Error retrieving cart', 
      error: error.message 
    });
  }
};

// Get user's cart with populated service details
exports.getCart = async (req, res) => {
  try {
    console.log("Fetching cart for user:", req.user.id);

    const cart = await Cart.findOne({ user: req.user.id })
      .populate({
        path: 'items.service',
        select: 'name location images mainImage pricePerNight basePrice category serviceType'
      })
      .populate({
        path: 'items.option',
        select: 'title description cost maxPeople'
      })
      .populate({
        path: 'items.room',
        select: 'type name pricePerNight'
      });

    if (!cart) {
      return res.status(200).json({ 
        success: true,
        cart: { items: [], totalCartPrice: 0 } 
      });
    }

    // Filter out expired reservations
    const now = new Date();
    cart.items = cart.items.filter(item => {
      if (item.reservedUntil && item.reservedUntil < now) {
        return false;
      }
      return true;
    });

    if (cart.items.length === 0) {
      cart.totalCartPrice = 0;
    } else {
      cart.totalCartPrice = cart.items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
    }

    await cart.save();

    res.status(200).json({
      success: true,
      cart
    });

  } catch (error) {
    console.error("Error fetching cart:", error);
    res.status(500).json({ 
      success: false,
      message: 'Error retrieving cart', 
      error: error.message 
    });
  }
};

// Remove item from cart
exports.removeFromCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id });
    
    if (!cart) {
      return res.status(404).json({ 
        success: false,
        message: 'Cart not found' 
      });
    }

    const itemId = req.params.id;
    cart.items = cart.items.filter(item => item._id.toString() !== itemId);
    cart.totalCartPrice = cart.items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);

    await cart.save();
    
    res.status(200).json({
      success: true,
      message: "Item removed from cart",
      cart
    });

  } catch (error) {
    console.error("Error removing from cart:", error);
    res.status(500).json({ 
      success: false,
      message: 'Error removing item from cart', 
      error: error.message 
    });
  }
};

// Update cart item
exports.updateCartItem = async (req, res) => {
  try {
    const { quantity, selectedDate, selectedTime, numPeople, notes, totalPrice } = req.body;
    
    const cart = await Cart.findOne({ user: req.user.id });
    
    if (!cart) {
      return res.status(404).json({ 
        success: false,
        message: 'Cart not found' 
      });
    }

    const itemIndex = cart.items.findIndex(item => item._id.toString() === req.params.id);
    
    if (itemIndex === -1) {
      return res.status(404).json({ 
        success: false,
        message: 'Item not found in cart' 
      });
    }

    // Update fields
    if (quantity !== undefined) cart.items[itemIndex].quantity = quantity;
    if (selectedDate) cart.items[itemIndex].selectedDate = selectedDate;
    if (selectedTime) cart.items[itemIndex].selectedTime = selectedTime;
    if (numPeople !== undefined) cart.items[itemIndex].numPeople = numPeople;
    if (notes !== undefined) cart.items[itemIndex].notes = notes;
    if (totalPrice !== undefined) cart.items[itemIndex].totalPrice = totalPrice;

    // Add audit entry
    cart.items[itemIndex].audit.push({
      action: 'Updated',
      timestamp: new Date(),
      performedBy: req.user.id
    });

    // Recalculate total
    cart.totalCartPrice = cart.items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);

    await cart.save();
    
    res.status(200).json({
      success: true,
      message: "Cart item updated",
      cart
    });

  } catch (error) {
    console.error("Error updating cart item:", error);
    res.status(500).json({ 
      success: false,
      message: 'Error updating cart item', 
      error: error.message 
    });
  }
};

// Clear entire cart
exports.clearCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id });
    
    if (!cart) {
      return res.status(404).json({ 
        success: false,
        message: 'Cart not found' 
      });
    }

    cart.items = [];
    cart.totalCartPrice = 0;
    await cart.save();

    res.status(200).json({
      success: true,
      message: "Cart cleared",
      cart
    });

  } catch (error) {
    console.error("Error clearing cart:", error);
    res.status(500).json({ 
      success: false,
      message: 'Error clearing cart', 
      error: error.message 
    });
  }
};

// Checkout - Create bookings from cart items
exports.checkout = async (req, res) => {
  try {
    const Booking = require('../models/Booking');
    
    const cart = await Cart.findOne({ user: req.user.id })
      .populate('items.service items.option items.room');
    
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ 
        success: false,
        message: 'Cart is empty' 
      });
    }

    const bookings = [];
    const errors = [];

    // Create booking for each cart item
    for (const item of cart.items) {
      try {
        const bookingData = {
          user: req.user.id,
          category: item.category || item.serviceType,
          numOfPeople: item.numPeople,
          status: 'pending',
          paymentDetails: {
            totalAmount: item.totalPrice,
            amountPaid: 0,
            remainingBalance: item.totalPrice
          },
          requirements: {
            specialNotes: item.notes
          }
        };

        // Add service-specific fields
        switch (item.serviceType) {
          case 'stay':
            bookingData.stay = item.service._id;
            bookingData.startDate = item.startDate;
            bookingData.endDate = item.endDate;
            if (item.room) bookingData.room = item.room;
            break;
          
          case 'activity':
            bookingData.activity = item.service._id;
            bookingData.date = item.selectedDate;
            bookingData.time = item.selectedTime;
            if (item.option) bookingData.option = item.option;
            if (item.timeSlot) bookingData.timeSlot = item.timeSlot;
            break;
          
          case 'transportation':
            bookingData.transportation = item.service._id;
            bookingData.date = item.selectedDate;
            bookingData.time = item.selectedTime;
            bookingData.pickupLocation = item.pickupLocation;
            bookingData.dropoffLocation = item.dropoffLocation;
            if (item.option) bookingData.option = item.option;
            break;
          
          case 'dining':
            bookingData.dining = item.service._id;
            bookingData.date = item.selectedDate;
            bookingData.time = item.selectedTime;
            break;
          
          case 'spa':
          case 'wellnessspas':
            bookingData.spa = item.service._id;
            bookingData.date = item.selectedDate;
            bookingData.time = item.selectedTime;
            bookingData.serviceName = item.serviceName;
            if (item.option) bookingData.service = item.option;
            break;
        }

        const booking = await Booking.create(bookingData);
        bookings.push(booking);

      } catch (error) {
        console.error(`Error creating booking for item ${item._id}:`, error);
        errors.push({
          itemId: item._id,
          error: error.message
        });
      }
    }

    // Clear cart after successful bookings
    if (bookings.length > 0) {
      cart.items = [];
      cart.totalCartPrice = 0;
      await cart.save();
    }

    res.status(200).json({
      success: true,
      message: `Successfully created ${bookings.length} booking(s)`,
      bookings,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error("Error during checkout:", error);
    res.status(500).json({ 
      success: false,
      message: 'Error during checkout', 
      error: error.message 
    });
  }
};