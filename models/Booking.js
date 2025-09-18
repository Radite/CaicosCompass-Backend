const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema(
  {
    user: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: false // User is no longer required
    },
    guestName: {
        type: String,
        trim: true
    },
    guestEmail: {
        type: String,
        trim: true,
        lowercase: true
    },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    status: { type: String, enum: ['pending', 'confirmed', 'canceled'], default: 'pending' },
    category: { 
      type: String, 
      enum: ['activity', 'stay', 'transportation', 'dining', 'spa'], 
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
    dining: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Dining', 
      required: function() { return this.category === 'dining'; } 
    },
    spa: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'WellnessSpa', 
      required: function() { return this.category === 'spa'; } 
    },

    // Spa-specific fields
    service: { 
      type: mongoose.Schema.Types.ObjectId, 
      required: function() { return this.category === 'spa'; } 
    },
    serviceName: { 
      type: String, 
      required: function() { return this.category === 'spa'; } 
    },

    // If the booking is for a specific option (for activities or transportation)
option: { 
    type: mongoose.Schema.Types.ObjectId, 
    // ref: 'Option', // <--- REMOVE THIS LINE
    required: false 
},

    // Room for stays
    room: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Room', 
    },
    
    // Common booking fields:
    numOfPeople: { type: Number, required: true },
    quantity: { type: Number, min: 1, required: false },
    multiUser: { type: Boolean, default: false },
    
    // For activities, transportation, dining, and spa, we use these:
    date: { 
      type: Date, 
      required: function() { 
        return this.category === 'activity' || this.category === 'transportation' || 
               this.category === 'dining' || this.category === 'spa'; 
      } 
    },
    time: { 
      type: String, 
      required: function() { 
        return this.category === 'activity' || this.category === 'transportation' || 
               this.category === 'dining' || this.category === 'spa'; 
      } 
    },

    // Time slot for spa appointments (and other services that need structured time)
    timeSlot: {
      startTime: String,
      endTime: String
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

    // Contact Information
    contactInfo: {
      firstName: String,
      lastName: String,
      email: String,
      phone: String
    },
        paymentIntentId: {
      type: String,
      required: false,
      unique: true,
      sparse: true // Allows multiple null values but enforces uniqueness for non-null values
    },
    
    // Payment Details
    paymentDetails: {
      totalAmount: { type: Number, required: true },
      amountPaid: { type: Number, default: 0 },
      remainingBalance: { type: Number, default: 0 },
      paymentMethod: { type: String, enum: ['card', 'cash', 'transfer'] },
      payees: [
        {
          user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
          amount: { type: Number },
          status: { type: String, enum: ['pending', 'paid'], default: 'pending' },
          paymentMethod: { type: String, enum: ['card', 'cash', 'transfer'], required: true },
          paidAt: { type: Date }
        },
      ],
    },

    // Requirements/Notes
    requirements: {
      specialNotes: String
    },
    
    // Cancellation Details
    cancellation: {
      isCanceled: { type: Boolean, default: false },
      canceledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      cancellationDate: { type: Date },
      refundAmount: { type: Number },
      refundStatus: { type: String, enum: ['pending', 'processed'], default: 'pending' },
      reason: String
    },

    // Feedback
    feedback: {
      rating: { type: Number, min: 1, max: 5 },
      comment: String,
      submittedAt: Date
    },

    // Notifications
    notifications: [{
      message: String,
      type: { type: String, enum: ['info', 'warning', 'success', 'error'], default: 'info' },
      read: { type: Boolean, default: false },
      createdAt: { type: Date, default: Date.now }
    }]
  },
  {
    timestamps: true
  }
);

// Check to ensure either a user or guest email is present
BookingSchema.pre('save', function(next) {
    if (!this.user && !this.guestEmail) {
        return next(new Error('A booking requires either a logged-in user or a guest email.'));
    }
    next();
});
module.exports = mongoose.model('Booking', BookingSchema);