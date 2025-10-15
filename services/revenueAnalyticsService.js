// services/revenueAnalyticsService.js
const RevenueAnalytics = require('../models/RevenueAnalytics');
const Booking = require('../models/Booking');
const mongoose = require('mongoose');

/**
 * Update revenue analytics when a booking is created, updated, or deleted
 * @param {Object} booking - The booking document
 * @param {String} action - 'create', 'update', 'delete'
 * @param {Object} oldBooking - Previous booking state (for updates)
 */
const updateRevenueAnalytics = async (booking, action = 'create', oldBooking = null) => {
  try {
    // Skip if booking doesn't have required fields
    if (!booking.pricing?.totalAmount || !booking.createdAt) {
      console.log('Skipping analytics update - missing required fields');
      return;
    }

    const bookingDate = new Date(booking.createdAt);
    
    // Update all period types
    await Promise.all([
      updateAnalyticsByPeriod('daily', bookingDate, booking, action, oldBooking),
      updateAnalyticsByPeriod('weekly', bookingDate, booking, action, oldBooking),
      updateAnalyticsByPeriod('monthly', bookingDate, booking, action, oldBooking),
      updateAnalyticsByPeriod('yearly', bookingDate, booking, action, oldBooking)
    ]);

    console.log(`Revenue analytics updated for booking ${booking._id} (${action})`);
  } catch (error) {
    console.error('Error updating revenue analytics:', error);
    // Don't throw - analytics update shouldn't break booking operations
  }
};

/**
 * Update analytics for a specific period
 */
const updateAnalyticsByPeriod = async (period, date, booking, action, oldBooking) => {
  try {
    // Get or create analytics document
    const analytics = await RevenueAnalytics.getOrCreate(period, date);
    
    // Populate booking if needed
    if (!booking.vendor || !booking.vendor.businessProfile) {
      await booking.populate([
        { path: 'vendor', select: 'businessProfile.businessName' },
        { path: 'service' }
      ]);
    }

    const revenue = booking.pricing?.totalAmount || 0;
    const oldRevenue = oldBooking?.pricing?.totalAmount || 0;
    const serviceType = booking.serviceType || 'Activity';
    const vendorId = booking.vendor?._id?.toString();
    const vendorName = booking.vendor?.businessProfile?.businessName || 'Unknown';
    const status = booking.status || 'pending';
    const paymentMethod = booking.payment?.method || 'unknown';
    const transportCategory = booking.category; // Transportation category

    // Handle different actions
    switch(action) {
      case 'create':
        await addBookingToAnalytics(analytics, booking, revenue, serviceType, vendorId, vendorName, status, paymentMethod, transportCategory);
        break;
        
      case 'update':
        // Remove old values and add new ones
        if (oldBooking) {
          const oldServiceType = oldBooking.serviceType || 'Activity';
          const oldVendorId = oldBooking.vendor?._id?.toString();
          const oldVendorName = oldBooking.vendor?.businessProfile?.businessName || 'Unknown';
          const oldStatus = oldBooking.status || 'pending';
          const oldPaymentMethod = oldBooking.payment?.method || 'unknown';
          const oldTransportCategory = oldBooking.category;
          
          await removeBookingFromAnalytics(analytics, oldBooking, oldRevenue, oldServiceType, oldVendorId, oldStatus, oldPaymentMethod, oldTransportCategory);
        }
        await addBookingToAnalytics(analytics, booking, revenue, serviceType, vendorId, vendorName, status, paymentMethod, transportCategory);
        break;
        
      case 'delete':
        await removeBookingFromAnalytics(analytics, booking, revenue, serviceType, vendorId, status, paymentMethod, transportCategory);
        break;
    }

    // Recalculate AOV
    analytics.calculateAOV();
    
    // Update category AOVs
    analytics.revenueByCategory.forEach(cat => {
      if (cat.bookings > 0) {
        cat.averageOrderValue = Math.round(cat.revenue / cat.bookings);
      }
    });
    
    // Update vendor AOVs
    analytics.topVendors.forEach(vendor => {
      if (vendor.bookings > 0) {
        vendor.averageOrderValue = Math.round(vendor.revenue / vendor.bookings);
      }
    });

    // Sort top vendors by revenue
    analytics.topVendors.sort((a, b) => b.revenue - a.revenue);
    
    // Keep only top 20 vendors
    if (analytics.topVendors.length > 20) {
      analytics.topVendors = analytics.topVendors.slice(0, 20);
    }

    analytics.lastUpdated = new Date();
    await analytics.save();
  } catch (error) {
    console.error(`Error updating ${period} analytics:`, error);
  }
};

/**
 * Add a booking to analytics
 */
const addBookingToAnalytics = async (analytics, booking, revenue, serviceType, vendorId, vendorName, status, paymentMethod, transportCategory) => {
  // Update totals
  analytics.totalRevenue += revenue;
  analytics.totalBookings += 1;

  // Update category revenue
  let categoryEntry = analytics.revenueByCategory.find(c => c.category === serviceType);
  if (!categoryEntry) {
    categoryEntry = { category: serviceType, revenue: 0, bookings: 0, averageOrderValue: 0 };
    analytics.revenueByCategory.push(categoryEntry);
  }
  categoryEntry.revenue += revenue;
  categoryEntry.bookings += 1;

  // Update transportation category if applicable
  if (serviceType === 'Transportation' && transportCategory) {
    let transportEntry = analytics.revenueByTransportCategory.find(c => c.category === transportCategory);
    if (!transportEntry) {
      transportEntry = { category: transportCategory, revenue: 0, bookings: 0 };
      analytics.revenueByTransportCategory.push(transportEntry);
    }
    transportEntry.revenue += revenue;
    transportEntry.bookings += 1;
  }

  // Update vendor revenue
  if (vendorId) {
    let vendorEntry = analytics.topVendors.find(v => v.vendorId?.toString() === vendorId);
    if (!vendorEntry) {
      vendorEntry = { 
        vendorId: new mongoose.Types.ObjectId(vendorId), 
        vendorName, 
        revenue: 0, 
        bookings: 0,
        averageOrderValue: 0
      };
      analytics.topVendors.push(vendorEntry);
    }
    vendorEntry.revenue += revenue;
    vendorEntry.bookings += 1;
    vendorEntry.vendorName = vendorName; // Update name in case it changed
  }

  // Update status breakdown
  let statusEntry = analytics.bookingsByStatus.find(s => s.status === status);
  if (!statusEntry) {
    statusEntry = { status, count: 0, revenue: 0 };
    analytics.bookingsByStatus.push(statusEntry);
  }
  statusEntry.count += 1;
  statusEntry.revenue += revenue;

  // Update payment method breakdown
  let paymentEntry = analytics.revenueByPaymentMethod.find(p => p.method === paymentMethod);
  if (!paymentEntry) {
    paymentEntry = { method: paymentMethod, revenue: 0, bookings: 0 };
    analytics.revenueByPaymentMethod.push(paymentEntry);
  }
  paymentEntry.revenue += revenue;
  paymentEntry.bookings += 1;
};

/**
 * Remove a booking from analytics
 */
const removeBookingFromAnalytics = async (analytics, booking, revenue, serviceType, vendorId, status, paymentMethod, transportCategory) => {
  // Update totals
  analytics.totalRevenue = Math.max(0, analytics.totalRevenue - revenue);
  analytics.totalBookings = Math.max(0, analytics.totalBookings - 1);

  // Update category revenue
  let categoryEntry = analytics.revenueByCategory.find(c => c.category === serviceType);
  if (categoryEntry) {
    categoryEntry.revenue = Math.max(0, categoryEntry.revenue - revenue);
    categoryEntry.bookings = Math.max(0, categoryEntry.bookings - 1);
  }

  // Update transportation category if applicable
  if (serviceType === 'Transportation' && transportCategory) {
    let transportEntry = analytics.revenueByTransportCategory.find(c => c.category === transportCategory);
    if (transportEntry) {
      transportEntry.revenue = Math.max(0, transportEntry.revenue - revenue);
      transportEntry.bookings = Math.max(0, transportEntry.bookings - 1);
    }
  }

  // Update vendor revenue
  if (vendorId) {
    let vendorEntry = analytics.topVendors.find(v => v.vendorId?.toString() === vendorId);
    if (vendorEntry) {
      vendorEntry.revenue = Math.max(0, vendorEntry.revenue - revenue);
      vendorEntry.bookings = Math.max(0, vendorEntry.bookings - 1);
    }
  }

  // Update status breakdown
  let statusEntry = analytics.bookingsByStatus.find(s => s.status === status);
  if (statusEntry) {
    statusEntry.count = Math.max(0, statusEntry.count - 1);
    statusEntry.revenue = Math.max(0, statusEntry.revenue - revenue);
  }

  // Update payment method breakdown
  let paymentEntry = analytics.revenueByPaymentMethod.find(p => p.method === paymentMethod);
  if (paymentEntry) {
    paymentEntry.revenue = Math.max(0, paymentEntry.revenue - revenue);
    paymentEntry.bookings = Math.max(0, paymentEntry.bookings - 1);
  }
};

/**
 * Calculate growth metrics by comparing with previous period
 */
const calculateGrowthMetrics = async (period, currentDate) => {
  try {
    const current = await RevenueAnalytics.getOrCreate(period, currentDate);
    
    // Calculate previous period date
    let previousDate = new Date(currentDate);
    switch(period) {
      case 'daily':
        previousDate.setDate(previousDate.getDate() - 1);
        break;
      case 'weekly':
        previousDate.setDate(previousDate.getDate() - 7);
        break;
      case 'monthly':
        previousDate.setMonth(previousDate.getMonth() - 1);
        break;
      case 'yearly':
        previousDate.setFullYear(previousDate.getFullYear() - 1);
        break;
    }
    
    const previous = await RevenueAnalytics.getOrCreate(period, previousDate);
    
    // Calculate growth percentages
    const revenueGrowth = previous.totalRevenue > 0 
      ? ((current.totalRevenue - previous.totalRevenue) / previous.totalRevenue) * 100 
      : 0;
      
    const bookingGrowth = previous.totalBookings > 0 
      ? ((current.totalBookings - previous.totalBookings) / previous.totalBookings) * 100 
      : 0;
      
    const aovGrowth = previous.averageOrderValue > 0 
      ? ((current.averageOrderValue - previous.averageOrderValue) / previous.averageOrderValue) * 100 
      : 0;
    
    current.growthMetrics = {
      revenueGrowth: Math.round(revenueGrowth * 100) / 100,
      bookingGrowth: Math.round(bookingGrowth * 100) / 100,
      aovGrowth: Math.round(aovGrowth * 100) / 100
    };
    
    await current.save();
    
    return current.growthMetrics;
  } catch (error) {
    console.error('Error calculating growth metrics:', error);
    return { revenueGrowth: 0, bookingGrowth: 0, aovGrowth: 0 };
  }
};

/**
 * Recalculate analytics from scratch for a given period and date range
 * Useful for backfilling or fixing data inconsistencies
 */
const recalculateAnalytics = async (startDate, endDate = new Date()) => {
  try {
    console.log(`Recalculating analytics from ${startDate} to ${endDate}`);
    
    // Clear existing analytics in date range
    await RevenueAnalytics.deleteMany({
      date: { $gte: startDate, $lte: endDate }
    });
    
    // Get all bookings in the date range
    const bookings = await Booking.find({
      createdAt: { $gte: startDate, $lte: endDate }
    }).populate([
      { path: 'vendor', select: 'businessProfile.businessName' },
      { path: 'service' }
    ]);
    
    console.log(`Found ${bookings.length} bookings to process`);
    
    // Process each booking
    for (const booking of bookings) {
      await updateRevenueAnalytics(booking, 'create');
    }
    
    console.log('Analytics recalculation complete');
    return { success: true, bookingsProcessed: bookings.length };
  } catch (error) {
    console.error('Error recalculating analytics:', error);
    throw error;
  }
};

/**
 * Get aggregated analytics for a date range
 */
const getAnalyticsForRange = async (period, startDate, endDate) => {
  try {
    const analytics = await RevenueAnalytics.find({
      period,
      date: { $gte: startDate, $lte: endDate }
    }).sort({ date: 1 });
    
    return analytics;
  } catch (error) {
    console.error('Error getting analytics for range:', error);
    throw error;
  }
};

module.exports = {
  updateRevenueAnalytics,
  calculateGrowthMetrics,
  recalculateAnalytics,
  getAnalyticsForRange
};
