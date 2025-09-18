const mongoose = require('mongoose');


const CartSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: [
      {
        service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true }, // Reference to Service model
        option: { type: mongoose.Schema.Types.ObjectId, required: false }, // Reference to a specific option (if applicable)
        quantity: { type: Number, required: true, min: 1 }, // Number of services being booked
        selectedDate: { type: Date, required: true }, // Date of booking
        selectedTime: { type: String, required: true }, // Time slot for booking
        numPeople: { type: Number, required: true, min: 1 }, // Number of participants
        multiUser: { type: Boolean, default: false }, // Multi-user reservation flag
        totalPrice: { type: Number, required: true, min: 0 }, // Total price for the service
        userPayments: { type: Map, of: Number, default: {} }, // Payments for multi-user reservation
        discount: { // Discounts or promo codes applied
          code: { type: String },
          amount: { type: Number, default: 0 },
        },
        notes: { type: String }, // Notes or special requests for the booking
        reservedUntil: { type: Date }, // Time until the reservation expires
        status: { 
          type: String, 
          enum: ['reserved', 'purchased', 'pending'], 
          default: 'reserved', 
        },
        audit: [
          {
            action: { type: String }, // E.g., "Added", "Updated", "Removed"
            timestamp: { type: Date, default: Date.now },
            performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Who performed the action
          },
        ],
        priceLastUpdated: { type: Date }, // Timestamp of the last price update
      },
    ],
    totalCartPrice: { type: Number, default: 0 }, // Total price of all items in the cart
    preferences: { type: Map, of: String }, // User preferences (e.g., language, currency)
  },
  { timestamps: true }
);

module.exports = mongoose.model('Cart', CartSchema);
