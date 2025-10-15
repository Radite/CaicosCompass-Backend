// controllers/analyticsController.js
const RevenueAnalytics = require('../models/RevenueAnalytics');
const { calculateGrowthMetrics, recalculateAnalytics, getAnalyticsForRange } = require('../services/revenueAnalyticsService');

/**
 * Get revenue analytics for admin dashboard
 * Uses pre-calculated data from RevenueAnalytics model for fast retrieval
 */
exports.getRevenueAnalytics = async (req, res) => {
  try {
    const { period = 30 } = req.query;
    const days = parseInt(period);
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // Determine which period type to use based on requested days
    let periodType = 'daily';
    if (days > 180) {
      periodType = 'monthly';
    } else if (days > 60) {
      periodType = 'weekly';
    }
    
    // Get analytics data for the period
    const analyticsData = await getAnalyticsForRange(periodType, startDate, endDate);
    
    // If no data exists, return empty structure
    if (!analyticsData || analyticsData.length === 0) {
      return res.json({
        totalRevenue: 0,
        monthlyRevenue: [],
        revenueByCategory: [],
        topVendors: [],
        period: days
      });
    }
    
    // Calculate total revenue and bookings across all periods
    const totalRevenue = analyticsData.reduce((sum, item) => sum + item.totalRevenue, 0);
    const totalBookings = analyticsData.reduce((sum, item) => sum + item.totalBookings, 0);
    
    // Format monthly/daily revenue data for chart
    const monthlyRevenue = analyticsData.map(item => ({
      month: formatDateLabel(item.date, periodType),
      revenue: item.totalRevenue,
      bookings: item.totalBookings
    }));
    
    // Aggregate revenue by category across all periods
    const categoryMap = {};
    analyticsData.forEach(item => {
      item.revenueByCategory.forEach(cat => {
        if (!categoryMap[cat.category]) {
          categoryMap[cat.category] = { category: cat.category, revenue: 0, bookings: 0 };
        }
        categoryMap[cat.category].revenue += cat.revenue;
        categoryMap[cat.category].bookings += cat.bookings;
      });
    });
    
    const revenueByCategory = Object.values(categoryMap);
    
    // Calculate percentages for categories
    revenueByCategory.forEach(cat => {
      cat.percentage = totalRevenue > 0 ? (cat.revenue / totalRevenue) * 100 : 0;
    });
    
    // Aggregate top vendors across all periods
    const vendorMap = {};
    analyticsData.forEach(item => {
      item.topVendors.forEach(vendor => {
        const vendorId = vendor.vendorId?.toString();
        if (!vendorId) return;
        
        if (!vendorMap[vendorId]) {
          vendorMap[vendorId] = {
            vendorId,
            vendorName: vendor.vendorName,
            revenue: 0,
            bookings: 0
          };
        }
        vendorMap[vendorId].revenue += vendor.revenue;
        vendorMap[vendorId].bookings += vendor.bookings;
      });
    });
    
    const topVendors = Object.values(vendorMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
    
    // Get growth metrics from the most recent period
    const latestPeriod = analyticsData[analyticsData.length - 1];
    const growthMetrics = latestPeriod?.growthMetrics || {
      revenueGrowth: 0,
      bookingGrowth: 0,
      aovGrowth: 0
    };
    
    res.json({
      totalRevenue,
      totalBookings,
      averageOrderValue: totalBookings > 0 ? Math.round(totalRevenue / totalBookings) : 0,
      monthlyRevenue,
      revenueByCategory,
      topVendors,
      growthMetrics,
      period: days
    });
  } catch (error) {
    console.error('Error fetching revenue analytics:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching revenue analytics',
      error: error.message 
    });
  }
};

/**
 * Get detailed breakdown by category
 */
exports.getCategoryBreakdown = async (req, res) => {
  try {
    const { period = 30, category } = req.query;
    const days = parseInt(period);
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const analyticsData = await getAnalyticsForRange('daily', startDate, endDate);
    
    // Filter by category if specified
    let categoryData;
    if (category) {
      categoryData = analyticsData.map(item => {
        const catEntry = item.revenueByCategory.find(c => c.category === category);
        return {
          date: item.date,
          revenue: catEntry?.revenue || 0,
          bookings: catEntry?.bookings || 0
        };
      });
    } else {
      // Return all categories
      categoryData = analyticsData.map(item => ({
        date: item.date,
        categories: item.revenueByCategory
      }));
    }
    
    res.json({
      category: category || 'all',
      data: categoryData,
      period: days
    });
  } catch (error) {
    console.error('Error fetching category breakdown:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching category breakdown',
      error: error.message 
    });
  }
};

/**
 * Get vendor performance analytics
 */
exports.getVendorAnalytics = async (req, res) => {
  try {
    const { period = 30, vendorId } = req.query;
    const days = parseInt(period);
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const analyticsData = await getAnalyticsForRange('daily', startDate, endDate);
    
    if (vendorId) {
      // Get specific vendor's performance over time
      const vendorData = analyticsData.map(item => {
        const vendor = item.topVendors.find(v => v.vendorId?.toString() === vendorId);
        return {
          date: item.date,
          revenue: vendor?.revenue || 0,
          bookings: vendor?.bookings || 0,
          averageOrderValue: vendor?.averageOrderValue || 0
        };
      });
      
      const totalRevenue = vendorData.reduce((sum, item) => sum + item.revenue, 0);
      const totalBookings = vendorData.reduce((sum, item) => sum + item.bookings, 0);
      
      res.json({
        vendorId,
        totalRevenue,
        totalBookings,
        averageOrderValue: totalBookings > 0 ? Math.round(totalRevenue / totalBookings) : 0,
        dailyData: vendorData,
        period: days
      });
    } else {
      // Get all vendors aggregated
      const vendorMap = {};
      analyticsData.forEach(item => {
        item.topVendors.forEach(vendor => {
          const vId = vendor.vendorId?.toString();
          if (!vId) return;
          
          if (!vendorMap[vId]) {
            vendorMap[vId] = {
              vendorId: vId,
              vendorName: vendor.vendorName,
              revenue: 0,
              bookings: 0
            };
          }
          vendorMap[vId].revenue += vendor.revenue;
          vendorMap[vId].bookings += vendor.bookings;
        });
      });
      
      const vendors = Object.values(vendorMap)
        .map(v => ({
          ...v,
          averageOrderValue: v.bookings > 0 ? Math.round(v.revenue / v.bookings) : 0
        }))
        .sort((a, b) => b.revenue - a.revenue);
      
      res.json({
        vendors,
        period: days
      });
    }
  } catch (error) {
    console.error('Error fetching vendor analytics:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching vendor analytics',
      error: error.message 
    });
  }
};

/**
 * Get transportation category breakdown
 */
exports.getTransportationBreakdown = async (req, res) => {
  try {
    const { period = 30 } = req.query;
    const days = parseInt(period);
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const analyticsData = await getAnalyticsForRange('daily', startDate, endDate);
    
    // Aggregate transportation categories
    const transportMap = {};
    analyticsData.forEach(item => {
      item.revenueByTransportCategory.forEach(cat => {
        if (!transportMap[cat.category]) {
          transportMap[cat.category] = { 
            category: cat.category, 
            revenue: 0, 
            bookings: 0 
          };
        }
        transportMap[cat.category].revenue += cat.revenue;
        transportMap[cat.category].bookings += cat.bookings;
      });
    });
    
    const transportationCategories = Object.values(transportMap)
      .sort((a, b) => b.revenue - a.revenue);
    
    res.json({
      categories: transportationCategories,
      period: days
    });
  } catch (error) {
    console.error('Error fetching transportation breakdown:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching transportation breakdown',
      error: error.message 
    });
  }
};

/**
 * Recalculate analytics (admin only)
 * Useful for backfilling data or fixing inconsistencies
 */
exports.recalculateAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = req.body;
    
    if (!startDate) {
      return res.status(400).json({ 
        success: false,
        message: 'Start date is required' 
      });
    }
    
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date();
    
    const result = await recalculateAnalytics(start, end);
    
    res.json({
      success: true,
      message: 'Analytics recalculated successfully',
      ...result
    });
  } catch (error) {
    console.error('Error recalculating analytics:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error recalculating analytics',
      error: error.message 
    });
  }
};

/**
 * Get growth metrics comparison
 */
exports.getGrowthMetrics = async (req, res) => {
  try {
    const { period = 'monthly' } = req.query;
    
    const currentDate = new Date();
    const metrics = await calculateGrowthMetrics(period, currentDate);
    
    res.json({
      period,
      metrics,
      calculatedAt: currentDate
    });
  } catch (error) {
    console.error('Error fetching growth metrics:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching growth metrics',
      error: error.message 
    });
  }
};

/**
 * Helper function to format date labels based on period type
 */
function formatDateLabel(date, periodType) {
  const d = new Date(date);
  
  switch(periodType) {
    case 'daily':
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    case 'weekly':
      return `Week ${getWeekNumber(d)}`;
    case 'monthly':
      return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    case 'yearly':
      return d.getFullYear().toString();
    default:
      return d.toLocaleDateString();
  }
}

function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

module.exports = exports;
