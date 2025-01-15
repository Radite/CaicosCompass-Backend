const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Primary user making the booking
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Other users in the booking
    status: { type: String, enum: ['pending', 'confirmed', 'canceled'], default: 'pending' }, // Booking status
    activity: { type: mongoose.Schema.Types.ObjectId, ref: 'Activity', required: true }, // Linked activity
    option: { type: mongoose.Schema.Types.ObjectId, ref: 'Activity.options', required: false }, // Specific activity option, if applicable
    date: { type: Date, required: true }, // Date of the booking
    time: { type: String, required: true }, // Time of the booking
    numOfPeople: { type: Number, required: true }, // Total number of people participating
    quantity: { type: Number, min: 1, required: false }, // Quantity of equipment, e.g., jet skis or ATVs
    multiUser: { type: Boolean, default: false }, // Whether it's a multi-user booking

    // Payment Details
    paymentDetails: {
      totalAmount: { type: Number, required: true }, // Total cost of the booking
      amountPaid: { type: Number, default: 0 }, // Total amount paid so far
      remainingBalance: {
        type: Number,
        default: function () {
          return this.totalAmount - this.amountPaid;
        },
      }, // Automatically calculated balance
      payees: [
        {
          user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // User making a payment
          amount: { type: Number }, // Amount paid by the user
          status: { type: String, enum: ['pending', 'paid'], default: 'pending' }, // Payment status
          paymentMethod: { type: String, enum: ['card', 'cash', 'transfer'], required: true }, // Payment method
        },
      ],
    },

    // Cancellation Details
    cancellation: {
      isCanceled: { type: Boolean, default: false }, // Whether the booking is canceled
      canceledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Who canceled the booking
      cancellationDate: { type: Date }, // When the booking was canceled
      refundAmount: { type: Number }, // Amount refunded
      refundStatus: { type: String, enum: ['pending', 'processed'], default: 'pending' }, // Refund status
    },

    // Discounts
    discount: {
      code: { type: String }, // Promo or discount code applied
      amount: { type: Number, default: 0 }, // Discount amount or percentage
    },

    // Activity-Specific Requirements
    requirements: {
      specialNotes: { type: String }, // E.g., "Bring valid ID" or "Must be 18+"
      customFields: [
        {
          fieldName: { type: String }, // E.g., "Diving Certification"
          value: { type: String }, // E.g., "Certified"
        },
      ],
    },

    // Notifications
    notifications: [
      {
        type: { type: String, enum: ['booking_update', 'payment_reminder', 'cancellation'] },
        message: { type: String },
        sentAt: { type: Date, default: Date.now },
        read: { type: Boolean, default: false },
      },
    ],

    // Audit Trail
    audit: [
      {
        action: { type: String }, // E.g., "Created", "Updated Payment"
        performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Who performed the action
        timestamp: { type: Date, default: Date.now },
        details: { type: String }, // Additional details about the action
      },
    ],

    // Feedback
    feedback: {
      rating: { type: Number, min: 1, max: 5 }, // User rating for the activity
      comment: { type: String }, // Feedback comment
      submittedAt: { type: Date },
    },

    // Waivers
    waiver: {
      isSigned: { type: Boolean, default: false }, // Whether the user has signed the waiver
      signedAt: { type: Date }, // When the waiver was signed
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Booking', BookingSchema);
