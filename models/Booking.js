const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    status: { type: String, enum: ['pending', 'confirmed', 'canceled'], default: 'pending' },
    category: { 
      type: String, 
      enum: ['activity', 'stay', 'transportation'], 
      required: true, 
    },
    // References to the specific service type:
    activity: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Activity', 
      required: function() { return this.category === 'activity'; } 
    },
    stay: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Stay', 
      required: function() { return this.category === 'stay'; } 
    },
    transportation: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Transportation', 
      required: function() { return this.category === 'transportation'; } 
    },
    // If the booking is for a specific option (for activities or transportation)
    option: { type: mongoose.Schema.Types.ObjectId, ref: 'Option', required: false },
    
    // Common booking fields:
    numOfPeople: { type: Number, required: true },
    quantity: { type: Number, min: 1, required: false },
    multiUser: { type: Boolean, default: false },
    
    // For activities and transportation, we use these:
    date: { 
      type: Date, 
      required: function() { 
        return this.category === 'activity' || this.category === 'transportation'; 
      } 
    },
    time: { 
      type: String, 
      required: function() { 
        return this.category === 'activity' || this.category === 'transportation'; 
      } 
    },
    
    // For stay bookings:
    startDate: { 
      type: Date, 
      required: function() { return this.category === 'stay'; } 
    },
    endDate: { 
      type: Date, 
      required: function() { return this.category === 'stay'; } 
    },
    
    // Additional fields for transportation:
    pickupLocation: { 
      type: String, 
      required: function() { return this.category === 'transportation'; } 
    },
    dropoffLocation: { 
      type: String, 
      required: function() { return this.category === 'transportation'; } 
    },
    
    // Payment Details
    paymentDetails: {
      totalAmount: { type: Number, required: true },
      amountPaid: { type: Number, default: 0 },
      remainingBalance: { type: Number, default: 0 },
      payees: [
        {
          user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
          amount: { type: Number },
          status: { type: String, enum: ['pending', 'paid'], default: 'pending' },
          paymentMethod: { type: String, enum: ['card', 'cash', 'transfer'], required: true },
        },
      ],
    },
    
    // Cancellation Details
    cancellation: {
      isCanceled: { type: Boolean, default: false },
      canceledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      cancellationDate: { type: Date },
      refundAmount: { type: Number },
      refundStatus: { type: String, enum: ['pending', 'processed'], default: 'pending' },
    },
    
    // Discounts
    discount: {
      code: { type: String },
      amount: { type: Number, default: 0 },
    },
    
    // Activity-Specific Requirements (if needed)
    requirements: {
      specialNotes: { type: String },
      customFields: [
        {
          fieldName: { type: String },
          value: { type: String },
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
        action: { type: String },
        performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        timestamp: { type: Date, default: Date.now },
        details: { type: String },
      },
    ],
    
    // Feedback
    feedback: {
      rating: { type: Number, min: 1, max: 5 },
      comment: { type: String },
      submittedAt: { type: Date },
    },
    
    // Waivers
    waiver: {
      isSigned: { type: Boolean, default: false },
      signedAt: { type: Date },
    },
  },
  { timestamps: true }
);

// Pre-save hook to calculate remaining balance
BookingSchema.pre('save', function (next) {
  if (this.paymentDetails) {
    this.paymentDetails.remainingBalance =
      (this.paymentDetails.totalAmount || 0) - (this.paymentDetails.amountPaid || 0);
  }
  next();
});

module.exports = mongoose.model('Booking', BookingSchema);
