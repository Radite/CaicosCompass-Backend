// cartController.js
const Cart = require('../models/Cart');
const Booking = require('../models/Booking');
const Activity = require('../models/Activity');

// Add item to cart
exports.addToCart = async (req, res) => {
  try {
    const { item, option, quantity, selectedDate, selectedTime, numPeople, totalPrice, notes } = req.body;

    const userCart = await Cart.findOne({ user: req.user.id });

    const newItem = {
      item,
      option,
      quantity,
      selectedDate,
      selectedTime,
      numPeople,
      totalPrice,
      notes,
    };

    if (!userCart) {
      // Create a new cart if it doesn't exist
      const newCart = await Cart.create({ user: req.user.id, items: [newItem] });
      return res.status(201).json({ success: true, data: newCart });
    }

    // Add item to existing cart
    userCart.items.push(newItem);
    await userCart.save();

    res.status(200).json({ success: true, data: userCart });
  } catch (error) {
    console.error('Error adding to cart:', error.message);
    res.status(500).json({ success: false, message: 'Error adding to cart.', error: error.message });
  }
};

// Get user's cart
exports.getCart = async (req, res) => {
  try {
    const userCart = await Cart.findOne({ user: req.user.id }).populate('items.item items.option');

    if (!userCart) {
      return res.status(200).json({ success: true, data: { items: [] } });
    }

    res.status(200).json({ success: true, data: userCart });
  } catch (error) {
    console.error('Error fetching cart:', error.message);
    res.status(500).json({ success: false, message: 'Error fetching cart.', error: error.message });
  }
};

// Remove item from cart
exports.removeFromCart = async (req, res) => {
  try {
    const { id } = req.params;
    const userCart = await Cart.findOne({ user: req.user.id });

    if (!userCart) {
      return res.status(404).json({ message: 'Cart not found.' });
    }

    userCart.items = userCart.items.filter((item) => item._id.toString() !== id);
    await userCart.save();

    res.status(200).json({ success: true, message: 'Item removed from cart.', data: userCart });
  } catch (error) {
    console.error('Error removing item from cart:', error.message);
    res.status(500).json({ success: false, message: 'Error removing item from cart.', error: error.message });
  }
};

// Update cart item
exports.updateCartItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, notes } = req.body;

    const userCart = await Cart.findOne({ user: req.user.id });

    if (!userCart) {
      return res.status(404).json({ message: 'Cart not found.' });
    }

    const cartItem = userCart.items.id(id);

    if (!cartItem) {
      return res.status(404).json({ message: 'Item not found in cart.' });
    }

    if (quantity) cartItem.quantity = quantity;
    if (notes) cartItem.notes = notes;

    await userCart.save();

    res.status(200).json({ success: true, message: 'Cart item updated.', data: userCart });
  } catch (error) {
    console.error('Error updating cart item:', error.message);
    res.status(500).json({ success: false, message: 'Error updating cart item.', error: error.message });
  }
};

// Checkout and create bookings
exports.checkout = async (req, res) => {
  try {
    const userCart = await Cart.findOne({ user: req.user.id });

    if (!userCart || userCart.items.length === 0) {
      return res.status(400).json({ message: 'Cart is empty.' });
    }

    // Create bookings for each item in the cart
    const bookings = await Promise.all(
      userCart.items.map(async (item) => {
        const booking = await Booking.create({
          user: req.user.id,
          activity: item.item,
          option: item.option,
          date: item.selectedDate,
          time: item.selectedTime,
          numOfPeople: item.numPeople,
          quantity: item.quantity,
          paymentDetails: {
            totalAmount: item.totalPrice,
            amountPaid: 0,
            payees: [],
          },
        });

        return booking;
      })
    );

    // Clear the cart after checkout
    userCart.items = [];
    await userCart.save();

    res.status(200).json({ success: true, message: 'Checkout successful.', data: bookings });
  } catch (error) {
    console.error('Error during checkout:', error.message);
    res.status(500).json({ success: false, message: 'Error during checkout.', error: error.message });
  }
};
