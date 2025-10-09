const mongoose = require('mongoose');

const CartSchema = new mongoose.Schema(
  {
    user: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User', 
      required: true,
      index: true
    },
    items: [
      {
        service: { 
          type: mongoose.Schema.Types.ObjectId, 
          refPath: 'items.serviceType',
          required: true 
        },
        serviceType: {
          type: String,
          required: true,
          enum: ['Activity', 'Stay', 'Transportation', 'Dining', 'WellnessSpa', 'Shopping']
        },
        category: { type: String }, // 'activity', 'stay', 'transportation', etc.
        option: { type: mongoose.Schema.Types.ObjectId }, // Option for activities/transportation
        room: { type: mongoose.Schema.Types.ObjectId }, // Room for stays
        
        // Dates and times
        selectedDate: { type: Date },
        startDate: { type: Date }, // For stays
        endDate: { type: Date }, // For stays
        selectedTime: { type: String },
        timeSlot: {
          startTime: String,
          endTime: String
        },
        
        // People and participants
        quantity: { type: Number, default: 1, min: 1 },
        numPeople: { type: Number, required: true, min: 1 },
        multiUser: { type: Boolean, default: false },
        
        // Pricing
        totalPrice: { type: Number, required: true, min: 0 },
        priceBreakdown: {
          basePrice: Number,
          fees: Number,
          taxes: Number,
          discounts: Number
        },
        userPayments: { type: Map, of: Number, default: {} },
        discount: {
          code: { type: String },
          amount: { type: Number, default: 0 },
        },
        
        // Transportation specific
        pickupLocation: { type: String },
        dropoffLocation: { type: String },
        
        // Spa specific
        serviceName: { type: String },
        
        // Shopping specific
        productDetails: {
          productId: mongoose.Schema.Types.ObjectId,
          name: String,
          variant: String,
          color: String,
          size: String
        },
        
        // Additional info
        notes: { type: String },
        
        // Status and expiration
        status: { 
          type: String, 
          enum: ['reserved', 'purchased', 'pending', 'expired'], 
          default: 'reserved', 
        },
        reservedUntil: { type: Date },
        
        // Audit trail
        audit: [
          {
            action: { type: String }, // 'Added', 'Updated', 'Removed'
            timestamp: { type: Date, default: Date.now },
            performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
          },
        ],
        priceLastUpdated: { type: Date, default: Date.now },
      },
    ],
    
    totalCartPrice: { type: Number, default: 0 },
    preferences: { type: Map, of: String },
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Index for faster queries
CartSchema.index({ user: 1, 'items.status': 1 });

// Virtual for item count
CartSchema.virtual('itemCount').get(function() {
  return this.items.length;
});

// Method to remove expired items
CartSchema.methods.removeExpiredItems = async function() {
  const now = new Date();
  const originalLength = this.items.length;
  
  this.items = this.items.filter(item => {
    if (item.reservedUntil && item.reservedUntil < now) {
      item.status = 'expired';
      return false;
    }
    return true;
  });
  
  if (this.items.length < originalLength) {
    this.totalCartPrice = this.items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
    await this.save();
  }
  
  return this.items.length < originalLength;
};

module.exports = mongoose.model('Cart', CartSchema);