const User = require('../models/User');
const Stay = require('../models/Stay');
const Dining = require('../models/Dining');
const Activity = require('../models/Activity');
const Transportation = require('../models/Transportation');
const Booking = require('../models/Booking');
const Discount = require('../models/Discount');

// Enhanced business dashboard with comprehensive stats
exports.getBusinessDashboard = async (req, res) => {
  try {
    const vendorId = req.user.id;
    
    // Get all vendor's listings across services
    const [stays, dinings, activities, transportations, bookings] = await Promise.all([
      Stay.find({ vendor: vendorId }),
      Dining.find({ vendor: vendorId }),
      Activity.find({ vendor: vendorId }),
      Transportation.find({ vendor: vendorId }),
      Booking.find({ vendor: vendorId }).populate('user service')
    ]);

    // Calculate stats
    const totalListings = stays.length + dinings.length + activities.length + transportations.length;
    const activeBookings = bookings.filter(b => b.status === 'confirmed').length;
    
    // Calculate monthly revenue (current month)
    const currentMonth = new Date();
    currentMonth.setDate(1);
    const monthlyBookings = bookings.filter(b => 
      new Date(b.createdAt) >= currentMonth && b.status === 'confirmed'
    );
    const monthlyRevenue = monthlyBookings.reduce((sum, b) => sum + (b.paymentDetails?.totalAmount || 0), 0);

    // Calculate average rating
    const allListings = [...stays, ...dinings, ...activities, ...transportations];
    const ratingsSum = allListings.reduce((sum, listing) => sum + (listing.rating || 0), 0);
    const averageRating = allListings.length > 0 ? (ratingsSum / allListings.length).toFixed(1) : 0;

    // Get recent bookings (last 5)
    const recentBookings = bookings
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5)
      .map(booking => ({
        _id: booking._id,
        user: booking.user,
        serviceName: booking.serviceName,
        category: booking.category,
        status: booking.status,
        totalAmount: booking.paymentDetails?.totalAmount || 0,
        date: booking.date,
        createdAt: booking.createdAt
      }));

    // Get top performing listings
    const listingBookings = {};
    bookings.forEach(booking => {
      const serviceId = booking.service;
      if (!listingBookings[serviceId]) {
        listingBookings[serviceId] = { count: 0, revenue: 0 };
      }
      listingBookings[serviceId].count++;
      listingBookings[serviceId].revenue += booking.paymentDetails?.totalAmount || 0;
    });

    const topPerformingListings = allListings
      .map(listing => ({
        ...listing.toObject(),
        bookingCount: listingBookings[listing._id]?.count || 0,
        revenue: listingBookings[listing._id]?.revenue || 0
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    const stats = {
      totalListings,
      activeBookings,
      monthlyRevenue,
      averageRating: parseFloat(averageRating),
      pendingReviews: 0, // TODO: Implement review system
      recentBookings,
      topPerformingListings
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching business dashboard:', error);
    res.status(500).json({ message: 'Error fetching dashboard data' });
  }
};

// Get all vendor listings
exports.getVendorListings = async (req, res) => {
  try {
    const vendorId = req.user.id;
    
    const [stays, dinings, activities, transportations] = await Promise.all([
      Stay.find({ vendor: vendorId }),
      Dining.find({ vendor: vendorId }),
      Activity.find({ vendor: vendorId }),
      Transportation.find({ vendor: vendorId })
    ]);

    // Add category field to each listing
    const allListings = [
      ...stays.map(s => ({ ...s.toObject(), category: 'stays' })),
      ...dinings.map(d => ({ ...d.toObject(), category: 'dining' })),
      ...activities.map(a => ({ ...a.toObject(), category: 'activities' })),
      ...transportations.map(t => ({ ...t.toObject(), category: 'transportation' }))
    ];

    res.json(allListings);
  } catch (error) {
    console.error('Error fetching vendor listings:', error);
    res.status(500).json({ message: 'Error fetching listings' });
  }
};

// Update listing status
exports.updateListingStatus = async (req, res) => {
  try {
    const { listingId } = req.params;
    const { status } = req.body;
    const vendorId = req.user.id;

    // Find the listing in all possible collections
    let listing = null;
    let Model = null;

    for (const ModelClass of [Stay, Dining, Activity, Transportation]) {
      listing = await ModelClass.findOne({ _id: listingId, vendor: vendorId });
      if (listing) {
        Model = ModelClass;
        break;
      }
    }

    if (!listing) {
      return res.status(404).json({ message: 'Listing not found' });
    }

    listing.status = status;
    await listing.save();

    res.json({ message: 'Listing status updated successfully', listing });
  } catch (error) {
    console.error('Error updating listing status:', error);
    res.status(500).json({ message: 'Error updating listing status' });
  }
};

// Delete listing
exports.deleteListing = async (req, res) => {
  try {
    const { listingId } = req.params;
    const vendorId = req.user.id;

    let deleted = false;
    for (const ModelClass of [Stay, Dining, Activity, Transportation]) {
      const result = await ModelClass.findOneAndDelete({ _id: listingId, vendor: vendorId });
      if (result) {
        deleted = true;
        break;
      }
    }

    if (!deleted) {
      return res.status(404).json({ message: 'Listing not found' });
    }

    res.json({ message: 'Listing deleted successfully' });
  } catch (error) {
    console.error('Error deleting listing:', error);
    res.status(500).json({ message: 'Error deleting listing' });
  }
};

// Bulk actions for listings
exports.bulkActionListings = async (req, res) => {
  try {
    const { action, listingIds } = req.body;
    const vendorId = req.user.id;

    for (const listingId of listingIds) {
      for (const ModelClass of [Stay, Dining, Activity, Transportation]) {
        const listing = await ModelClass.findOne({ _id: listingId, vendor: vendorId });
        if (listing) {
          switch (action) {
            case 'activate':
              listing.status = 'active';
              break;
            case 'deactivate':
              listing.status = 'inactive';
              break;
            case 'delete':
              await listing.remove();
              continue;
          }
          await listing.save();
          break;
        }
      }
    }

    res.json({ message: `Bulk ${action} completed successfully` });
  } catch (error) {
    console.error('Error performing bulk action:', error);
    res.status(500).json({ message: 'Error performing bulk action' });
  }
};

// Get vendor discounts
exports.getVendorDiscounts = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const discounts = await Discount.find({ vendor: vendorId }).sort({ createdAt: -1 });
    res.json(discounts);
  } catch (error) {
    console.error('Error fetching vendor discounts:', error);
    res.status(500).json({ message: 'Error fetching discounts' });
  }
};

// Create discount
exports.createDiscount = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const discountData = {
      ...req.body,
      vendor: vendorId,
      usedCount: 0,
      isActive: true
    };

    const discount = new Discount(discountData);
    await discount.save();

    res.status(201).json(discount);
  } catch (error) {
    console.error('Error creating discount:', error);
    res.status(500).json({ message: 'Error creating discount' });
  }
};

// Update discount
exports.updateDiscount = async (req, res) => {
  try {
    const { discountId } = req.params;
    const vendorId = req.user.id;

    const discount = await Discount.findOneAndUpdate(
      { _id: discountId, vendor: vendorId },
      req.body,
      { new: true }
    );

    if (!discount) {
      return res.status(404).json({ message: 'Discount not found' });
    }

    res.json(discount);
  } catch (error) {
    console.error('Error updating discount:', error);
    res.status(500).json({ message: 'Error updating discount' });
  }
};

// Delete discount
exports.deleteDiscount = async (req, res) => {
  try {
    const { discountId } = req.params;
    const vendorId = req.user.id;

    const discount = await Discount.findOneAndDelete({ _id: discountId, vendor: vendorId });

    if (!discount) {
      return res.status(404).json({ message: 'Discount not found' });
    }

    res.json({ message: 'Discount deleted successfully' });
  } catch (error) {
    console.error('Error deleting discount:', error);
    res.status(500).json({ message: 'Error deleting discount' });
  }
};

// Toggle discount status
exports.toggleDiscountStatus = async (req, res) => {
  try {
    const { discountId } = req.params;
    const { isActive } = req.body;
    const vendorId = req.user.id;

    const discount = await Discount.findOneAndUpdate(
      { _id: discountId, vendor: vendorId },
      { isActive },
      { new: true }
    );

    if (!discount) {
      return res.status(404).json({ message: 'Discount not found' });
    }

    res.json(discount);
  } catch (error) {
    console.error('Error toggling discount status:', error);
    res.status(500).json({ message: 'Error toggling discount status' });
  }
};

// Get recent activity
exports.getRecentActivity = async (req, res) => {
  try {
    const vendorId = req.user.id;
    
    // Get recent bookings, reviews, etc.
    const recentBookings = await Booking.find({ vendor: vendorId })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('user', 'name');

    const activities = recentBookings.map(booking => ({
      type: 'booking',
      description: `New booking from ${booking.user.name} for ${booking.serviceName}`,
      createdAt: booking.createdAt
    }));

    res.json(activities);
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    res.status(500).json({ message: 'Error fetching recent activity' });
  }
};

// Get vendor bookings
exports.getVendorBookings = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { status, startDate, endDate, page = 1, limit = 10 } = req.query;

    // Build query filter
    let filter = { vendor: vendorId };
    
    if (status && status !== 'all') {
      filter.status = status;
    }
    
    if (startDate && endDate) {
      filter.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // Get bookings with pagination
    const skip = (page - 1) * limit;
    const bookings = await Booking.find(filter)
      .populate('user', 'name email phone')
      .populate('service')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Booking.countDocuments(filter);

    res.json({
      bookings,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalBookings: total,
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching vendor bookings:', error);
    res.status(500).json({ message: 'Error fetching bookings' });
  }
};

// Update booking status
exports.updateBookingStatus = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { status, notes } = req.body;
    const vendorId = req.user.id;

    const booking = await Booking.findOne({ _id: bookingId, vendor: vendorId });
    
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    booking.status = status;
    if (notes) {
      booking.vendorNotes = notes;
    }
    booking.updatedAt = new Date();
    
    await booking.save();

    // Send notification to user about status change
    const user = await User.findById(booking.user);
    if (user) {
      user.notifications.push({
        type: 'booking_update',
        title: 'Booking Status Updated',
        message: `Your booking for ${booking.serviceName} has been ${status}`,
        read: false,
        createdAt: new Date()
      });
      await user.save();
    }

    res.json({ message: 'Booking status updated successfully', booking });
  } catch (error) {
    console.error('Error updating booking status:', error);
    res.status(500).json({ message: 'Error updating booking status' });
  }
};

// Get revenue analytics
exports.getRevenueAnalytics = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { period = '30' } = req.query; // days

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    // Get bookings within period
    const bookings = await Booking.find({
      vendor: vendorId,
      status: 'confirmed',
      createdAt: { $gte: startDate }
    });

    // Calculate daily revenue
    const dailyRevenue = {};
    bookings.forEach(booking => {
      const date = booking.createdAt.toISOString().split('T')[0];
      if (!dailyRevenue[date]) {
        dailyRevenue[date] = 0;
      }
      dailyRevenue[date] += booking.paymentDetails?.totalAmount || 0;
    });

    // Calculate totals
    const totalRevenue = bookings.reduce((sum, b) => sum + (b.paymentDetails?.totalAmount || 0), 0);
    const averageBookingValue = bookings.length > 0 ? totalRevenue / bookings.length : 0;

    // Previous period comparison
    const prevStartDate = new Date(startDate);
    prevStartDate.setDate(prevStartDate.getDate() - parseInt(period));
    
    const prevBookings = await Booking.find({
      vendor: vendorId,
      status: 'confirmed',
      createdAt: { $gte: prevStartDate, $lt: startDate }
    });
    
    const prevTotalRevenue = prevBookings.reduce((sum, b) => sum + (b.paymentDetails?.totalAmount || 0), 0);
    const revenueGrowth = prevTotalRevenue > 0 ? ((totalRevenue - prevTotalRevenue) / prevTotalRevenue) * 100 : 0;

    res.json({
      totalRevenue,
      averageBookingValue,
      revenueGrowth,
      totalBookings: bookings.length,
      dailyRevenue,
      period: parseInt(period)
    });
  } catch (error) {
    console.error('Error fetching revenue analytics:', error);
    res.status(500).json({ message: 'Error fetching revenue analytics' });
  }
};

// Get booking analytics
exports.getBookingAnalytics = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { period = '30' } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    // Get all bookings within period
    const bookings = await Booking.find({
      vendor: vendorId,
      createdAt: { $gte: startDate }
    });

    // Group by status
    const statusBreakdown = {};
    bookings.forEach(booking => {
      if (!statusBreakdown[booking.status]) {
        statusBreakdown[booking.status] = 0;
      }
      statusBreakdown[booking.status]++;
    });

    // Group by service category
    const categoryBreakdown = {};
    bookings.forEach(booking => {
      const category = booking.category || 'other';
      if (!categoryBreakdown[category]) {
        categoryBreakdown[category] = 0;
      }
      categoryBreakdown[category]++;
    });

    // Calculate conversion rates
    const totalBookings = bookings.length;
    const confirmedBookings = bookings.filter(b => b.status === 'confirmed').length;
    const conversionRate = totalBookings > 0 ? (confirmedBookings / totalBookings) * 100 : 0;

    // Daily booking trends
    const dailyBookings = {};
    bookings.forEach(booking => {
      const date = booking.createdAt.toISOString().split('T')[0];
      if (!dailyBookings[date]) {
        dailyBookings[date] = 0;
      }
      dailyBookings[date]++;
    });

    res.json({
      totalBookings,
      confirmedBookings,
      conversionRate,
      statusBreakdown,
      categoryBreakdown,
      dailyBookings,
      period: parseInt(period)
    });
  } catch (error) {
    console.error('Error fetching booking analytics:', error);
    res.status(500).json({ message: 'Error fetching booking analytics' });
  }
};

// Get performance analytics
exports.getPerformanceAnalytics = async (req, res) => {
  try {
    const vendorId = req.user.id;

    // Get all listings
    const [stays, dinings, activities, transportations] = await Promise.all([
      Stay.find({ vendor: vendorId }),
      Dining.find({ vendor: vendorId }),
      Activity.find({ vendor: vendorId }),
      Transportation.find({ vendor: vendorId })
    ]);

    const allListings = [...stays, ...dinings, ...activities, ...transportations];

    // Get all bookings
    const bookings = await Booking.find({ vendor: vendorId });

    // Calculate performance metrics for each listing
    const listingPerformance = allListings.map(listing => {
      const listingBookings = bookings.filter(b => b.service?.toString() === listing._id.toString());
      const revenue = listingBookings.reduce((sum, b) => sum + (b.paymentDetails?.totalAmount || 0), 0);
      const totalRating = listingBookings.reduce((sum, b) => sum + (b.rating || 0), 0);
      const avgRating = listingBookings.length > 0 ? totalRating / listingBookings.length : 0;

      return {
        listingId: listing._id,
        name: listing.name,
        category: listing.category || getListingCategory(listing),
        totalBookings: listingBookings.length,
        revenue,
        averageRating: avgRating,
        status: listing.status || 'active'
      };
    });

    // Sort by performance metrics
    const topByRevenue = [...listingPerformance].sort((a, b) => b.revenue - a.revenue).slice(0, 5);
    const topByBookings = [...listingPerformance].sort((a, b) => b.totalBookings - a.totalBookings).slice(0, 5);
    const topByRating = [...listingPerformance].sort((a, b) => b.averageRating - a.averageRating).slice(0, 5);

    // Calculate overall metrics
    const totalRevenue = listingPerformance.reduce((sum, l) => sum + l.revenue, 0);
    const totalBookings = listingPerformance.reduce((sum, l) => sum + l.totalBookings, 0);
    const averageRating = listingPerformance.length > 0 
      ? listingPerformance.reduce((sum, l) => sum + l.averageRating, 0) / listingPerformance.length 
      : 0;

    res.json({
      overview: {
        totalRevenue,
        totalBookings,
        averageRating,
        totalListings: allListings.length,
        activeListings: allListings.filter(l => l.status === 'active').length
      },
      topPerformers: {
        byRevenue: topByRevenue,
        byBookings: topByBookings,
        byRating: topByRating
      },
      allListings: listingPerformance
    });
  } catch (error) {
    console.error('Error fetching performance analytics:', error);
    res.status(500).json({ message: 'Error fetching performance analytics' });
  }
};

// Helper function to get listing category
function getListingCategory(listing) {
  if (listing.constructor.modelName === 'Stay') return 'stays';
  if (listing.constructor.modelName === 'Dining') return 'dining';
  if (listing.constructor.modelName === 'Activity') return 'activities';
  if (listing.constructor.modelName === 'Transportation') return 'transportation';
  return 'other';
}

