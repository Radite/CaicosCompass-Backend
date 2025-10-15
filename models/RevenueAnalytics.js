// models/RevenueAnalytics.js
const mongoose = require('mongoose');

const RevenueAnalyticsSchema = new mongoose.Schema({
  // Period tracking
  period: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'yearly'],
    required: true
  },
  
  date: {
    type: Date,
    required: true,
    index: true
  },
  
  // Period identifiers for quick queries
  year: {
    type: Number,
    required: true,
    index: true
  },
  
  month: {
    type: Number, // 1-12
    index: true
  },
  
  week: {
    type: Number, // 1-53
    index: true
  },
  
  day: {
    type: Number, // 1-31
    index: true
  },
  
  // Overall metrics
  totalRevenue: {
    type: Number,
    default: 0
  },
  
  totalBookings: {
    type: Number,
    default: 0
  },
  
  averageOrderValue: {
    type: Number,
    default: 0
  },
  
  // Revenue by category
  revenueByCategory: [{
    category: {
      type: String,
      enum: ['Transportation', 'Stay', 'Dining', 'Activity']
    },
    revenue: {
      type: Number,
      default: 0
    },
    bookings: {
      type: Number,
      default: 0
    },
    averageOrderValue: {
      type: Number,
      default: 0
    }
  }],
  
  // Top vendors (stored as snapshot)
  topVendors: [{
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    vendorName: String,
    revenue: {
      type: Number,
      default: 0
    },
    bookings: {
      type: Number,
      default: 0
    },
    averageOrderValue: {
      type: Number,
      default: 0
    }
  }],
  
  // Revenue by transportation category (for Transportation serviceType)
  revenueByTransportCategory: [{
    category: {
      type: String,
      enum: ['Car Rental', 'Jeep & 4x4 Rental', 'Scooter & Moped Rental', 
             'Taxi', 'Airport Transfer', 'Private VIP Transport', 'Ferry', 'Flight']
    },
    revenue: {
      type: Number,
      default: 0
    },
    bookings: {
      type: Number,
      default: 0
    }
  }],
  
  // Status breakdown
  bookingsByStatus: [{
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'in-progress', 'completed', 'cancelled', 'no-show']
    },
    count: {
      type: Number,
      default: 0
    },
    revenue: {
      type: Number,
      default: 0
    }
  }],
  
  // Payment method breakdown
  revenueByPaymentMethod: [{
    method: String,
    revenue: {
      type: Number,
      default: 0
    },
    bookings: {
      type: Number,
      default: 0
    }
  }],
  
  // Growth metrics (compared to previous period)
  growthMetrics: {
    revenueGrowth: {
      type: Number,
      default: 0 // percentage
    },
    bookingGrowth: {
      type: Number,
      default: 0 // percentage
    },
    aovGrowth: {
      type: Number,
      default: 0 // percentage
    }
  },
  
  // Metadata
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  
  // For tracking recalculation needs
  needsRecalculation: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
RevenueAnalyticsSchema.index({ period: 1, year: 1, month: 1 });
RevenueAnalyticsSchema.index({ period: 1, date: 1 });
RevenueAnalyticsSchema.index({ year: 1, month: 1, day: 1 });

// Method to calculate average order value
RevenueAnalyticsSchema.methods.calculateAOV = function() {
  if (this.totalBookings > 0) {
    this.averageOrderValue = Math.round(this.totalRevenue / this.totalBookings);
  }
  return this.averageOrderValue;
};

// Static method to get or create analytics document
RevenueAnalyticsSchema.statics.getOrCreate = async function(period, date) {
  const dateObj = new Date(date);
  const year = dateObj.getFullYear();
  const month = dateObj.getMonth() + 1;
  const week = getWeekNumber(dateObj);
  const day = dateObj.getDate();
  
  let query = { period, year };
  
  switch(period) {
    case 'daily':
      query.month = month;
      query.day = day;
      break;
    case 'weekly':
      query.week = week;
      break;
    case 'monthly':
      query.month = month;
      break;
    case 'yearly':
      // year is already in query
      break;
  }
  
  let analytics = await this.findOne(query);
  
  if (!analytics) {
    analytics = await this.create({
      period,
      date: dateObj,
      year,
      month: period !== 'yearly' ? month : undefined,
      week: period === 'weekly' ? week : undefined,
      day: period === 'daily' ? day : undefined,
      revenueByCategory: [],
      topVendors: [],
      revenueByTransportCategory: [],
      bookingsByStatus: [],
      revenueByPaymentMethod: []
    });
  }
  
  return analytics;
};

// Helper function to get week number
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

module.exports = mongoose.model('RevenueAnalytics', RevenueAnalyticsSchema);
