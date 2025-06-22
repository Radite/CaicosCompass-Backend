const Cart = require('../models/Cart');
const Service = require('../models/Service');
const mongoose = require('mongoose');

// Add item to cart
exports.addToCart = async (req, res) => {
  try {
      console.log("Incoming Request Body:", req.body);
      console.log("Extracted User from Request:", req.user);

      if (!req.user || !req.user.id) {
          console.error("❌ Unauthorized: User not found in request");
          return res.status(401).json({ message: "Unauthorized: User not found in request" });
      }

      const { service, option, quantity, selectedDate, selectedTime, numPeople, multiUser, totalPrice, discount, notes } = req.body;

      let cart = await Cart.findOne({ user: req.user.id });

      if (!cart) {
          console.log("Creating a new cart for user:", req.user.id);
          cart = new Cart({ user: req.user.id, items: [] });
      }

      console.log("Existing Cart Items Before Update:", cart.items);

      // Check if the item already exists in the cart
      const existingItemIndex = cart.items.findIndex(
          item => item.service.toString() === service && 
                  item.selectedDate.toString() === new Date(selectedDate).toString() && 
                  item.selectedTime === selectedTime
      );

      if (existingItemIndex > -1) {
          console.log("Updating existing cart item quantity.");
          cart.items[existingItemIndex].quantity += quantity;
      } else {
          console.log("Adding new item to cart.");
          cart.items.push({
              service,
              option,
              quantity,
              selectedDate,
              selectedTime,
              numPeople,
              multiUser,
              totalPrice,
              discount,
              notes,
              status: 'reserved',
          });
      }

      cart.totalCartPrice = cart.items.reduce((sum, item) => sum + item.totalPrice, 0);
      console.log("Updated Cart Total Price:", cart.totalCartPrice);

      await cart.save();
      console.log("✅ Cart saved successfully for user:", req.user.id);

      res.status(201).json(cart);
  } catch (error) {
      console.error("❌ Error adding item to cart:", error.message);
      res.status(500).json({ message: 'Error adding item to cart', error });
  }
};




exports.getCart = async (req, res) => {
    try {
        console.log("User ID from Token:", req.user.id);

        // Convert the user ID to ObjectId for query
        const userId = new mongoose.Types.ObjectId(req.user.id);
        console.log("Converted User ID for Query:", userId);

        const cart = await Cart.findOne({ user: userId }).populate('items.service items.option');

        if (!cart) {
            console.warn("Cart not found for user ID:", userId);
            return res.status(404).json({ message: 'Cart not found' });
        }

        console.log("Cart found:", cart);
        res.status(200).json(cart);
    } catch (error) {
        console.error("Error retrieving cart:", error);
        res.status(500).json({ message: 'Error retrieving cart', error });
    }
};

// Remove item from cart
exports.removeFromCart = async (req, res) => {
    try {
        const cart = await Cart.findOne({ user: req.user._id });
        if (!cart) {
            return res.status(404).json({ message: 'Cart not found' });
        }

        cart.items = cart.items.filter(item => item._id.toString() !== req.params.id);
        cart.totalCartPrice = cart.items.reduce((sum, item) => sum + item.totalPrice, 0);

        await cart.save();
        res.status(200).json(cart);
    } catch (error) {
        res.status(500).json({ message: 'Error removing item from cart', error });
    }
};

// Update cart item (e.g., quantity, date, etc.)
exports.updateCartItem = async (req, res) => {
    try {
        const { quantity, selectedDate, selectedTime, numPeople, notes, totalPrice } = req.body;

        const cart = await Cart.findOne({ user: req.user._id });
        if (!cart) {
            return res.status(404).json({ message: 'Cart not found' });
        }

        const itemIndex = cart.items.findIndex(item => item._id.toString() === req.params.id);
        if (itemIndex > -1) {
            cart.items[itemIndex] = {
                ...cart.items[itemIndex]._doc,
                quantity,
                selectedDate,
                selectedTime,
                numPeople,
                notes,
                totalPrice,
            };

            cart.totalCartPrice = cart.items.reduce((sum, item) => sum + item.totalPrice, 0);
            await cart.save();
            res.status(200).json(cart);
        } else {
            res.status(404).json({ message: 'Item not found in cart' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error updating cart item', error });
    }
};

// Checkout and create booking
exports.checkout = async (req, res) => {
    try {
        const cart = await Cart.findOne({ user: req.user._id });
        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ message: 'Cart is empty' });
        }

        // Validate service availability
        for (const item of cart.items) {
            const service = await Service.findById(item.service);
            if (!service) {
                return res.status(400).json({ message: `Service not found: ${item.service}` });
            }
        }

        // Perform checkout logic (e.g., creating orders, processing payments)
        cart.items.forEach(item => {
            item.status = 'purchased';
        });

        cart.totalCartPrice = 0;
        await cart.save();

        res.status(200).json({ message: 'Checkout successful', cart });
    } catch (error) {
        res.status(500).json({ message: 'Error during checkout', error });
    }
};
