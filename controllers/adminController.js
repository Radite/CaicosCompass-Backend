// controllers/adminController.js - Admin controller functions
const User = require('../models/User');
const Booking = require('../models/Booking');
const Activity = require('../models/Activity');
const Stay = require('../models/Stay');
const Dining = require('../models/Dining');
const Transportation = require('../models/Transportation');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Dashboard Statistics
exports.getDashboardStats = async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Get total counts
    const totalUsers = await User.countDocuments();
    const totalBookings = await Booking.countDocuments();
    const pendingBookings = await Booking.countDocuments({ status: 'pending' });
    
    // Get new users this month
    const newUsersThisMonth = await User.countDocuments({
      createdAt: { $gte: startOfMonth }
    });
    
    // Calculate total revenue
    const revenueAggregation = await Booking.aggregate([
      { $match: { status: { $in: ['confirmed', 'completed'] } } },
      { $group: { _id: null, total: { $sum: '$paymentDetails.totalAmount' } } }
    ]);
    const totalRevenue = revenueAggregation[0]?.total || 0;
    
    // Calculate revenue this month
    const monthlyRevenueAggregation = await Booking.aggregate([
      { 
        $match: { 
          status: { $in: ['confirmed', 'completed'] },
          createdAt: { $gte: startOfMonth }
        } 
      },
      { $group: { _id: null, total: { $sum: '$paymentDetails.totalAmount' } } }
    ]);
    const revenueThisMonth = monthlyRevenueAggregation[0]?.total || 0;
    
    res.json({
      totalUsers,
      totalBookings,
      totalRevenue,
      pendingBookings,
      newUsersThisMonth,
      revenueThisMonth
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ message: 'Error fetching dashboard statistics' });
  }
};

// User Management
exports.getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 50, search, role, verified } = req.query;
    
    let query = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (role && role !== 'all') {
      query.role = role;
    }
    
    if (verified !== undefined) {
      query.isVerified = verified === 'true';
    }
    
    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await User.countDocuments(query);
    
    res.json({
      users,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Error fetching users' });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Get user's bookings
    const bookings = await Booking.find({ user: req.params.id })
      .sort({ createdAt: -1 })
      .limit(10);
    
    res.json({ user, bookings });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: 'Error fetching user details' });
  }
};

exports.updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    
    if (!['user', 'business-manager', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({ message: 'User role updated successfully', user });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ message: 'Error updating user role' });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if user has active bookings
    const activeBookings = await Booking.countDocuments({
      user: req.params.id,
      status: { $in: ['confirmed', 'pending'] }
    });
    
    if (activeBookings > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete user with active bookings' 
      });
    }
    
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Error deleting user' });
  }
};

exports.verifyUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isVerified: true },
      { new: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({ message: 'User verified successfully', user });
  } catch (error) {
    console.error('Error verifying user:', error);
    res.status(500).json({ message: 'Error verifying user' });
  }
};

// Booking Management
exports.getAllBookings = async (req, res) => {
  try {
    const { page = 1, limit = 50, search, status, category } = req.query;
    
    let query = {};
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (category && category !== 'all') {
      query.category = category;
    }
    
    const bookings = await Booking.find(query)
      .populate('user', 'name email')
      .populate('activity', 'name')
      .populate('stay', 'name')
      .populate('dining', 'name')
      .populate('transportation', 'category')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    // Apply search filter after population
    let filteredBookings = bookings;
    if (search) {
      filteredBookings = bookings.filter(booking =>
        booking._id.toString().includes(search) ||
        booking.user.name.toLowerCase().includes(search.toLowerCase()) ||
        booking.user.email.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    const total = await Booking.countDocuments(query);
    
    res.json({
      bookings: filteredBookings,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ message: 'Error fetching bookings' });
  }
};

exports.getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('user', 'name email phone')
      .populate('activity', 'name description location')
      .populate('stay', 'name description location')
      .populate('dining', 'name description location')
      .populate('transportation', 'category description');
    
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    
    res.json(booking);
  } catch (error) {
    console.error('Error fetching booking:', error);
    res.status(500).json({ message: 'Error fetching booking details' });
  }
};

exports.updateBookingStatus = async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['pending', 'confirmed', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate('user', 'name email');
    
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    
    // Send notification email to user about status change
    const { sendStatusUpdateEmail } = require('./emailService');
    await sendStatusUpdateEmail(booking);
    
    res.json({ message: 'Booking status updated successfully', booking });
  } catch (error) {
    console.error('Error updating booking status:', error);
    res.status(500).json({ message: 'Error updating booking status' });
  }
};

exports.processRefund = async (req, res) => {
  try {
    const { amount, reason } = req.body;
    
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    
    if (!booking.paymentDetails.stripePaymentIntentId) {
      return res.status(400).json({ message: 'No payment to refund' });
    }
    
    // Process refund with Stripe
    const refund = await stripe.refunds.create({
      payment_intent: booking.paymentDetails.stripePaymentIntentId,
      amount: amount ? Math.round(amount * 100) : undefined,
      reason: reason || 'requested_by_customer'
    });
    
    // Update booking
    booking.cancellation = {
      isCanceled: true,
      canceledBy: req.user.id,
      cancellationDate: new Date(),
      refundAmount: refund.amount / 100,
      refundStatus: 'processed',
      refundId: refund.id
    };
    booking.status = 'cancelled';
    
    await booking.save();
    
    // Send refund confirmation email
    const { sendCancellationEmail } = require('./emailService');
    await sendCancellationEmail(booking, refund.amount / 100);
    
    res.json({ 
      message: 'Refund processed successfully', 
      refund,
      booking 
    });
  } catch (error) {
    console.error('Error processing refund:', error);
    res.status(500).json({ message: 'Error processing refund' });
  }
};

// Analytics
exports.getRevenueAnalytics = async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    let startDate;
    switch (period) {
      case '7d':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    }
    
    const revenueData = await Booking.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          status: { $in: ['confirmed', 'completed'] }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          revenue: { $sum: '$paymentDetails.totalAmount' },
          bookings: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);
    
    res.json(revenueData);
  } catch (error) {
    console.error('Error fetching revenue analytics:', error);
    res.status(500).json({ message: 'Error fetching revenue analytics' });
  }
};

exports.getBookingAnalytics = async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    let startDate;
    switch (period) {
      case '7d':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    }
    
    // Bookings by category
    const categoryData = await Booking.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);
    
    // Bookings by status
    const statusData = await Booking.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    
    // Bookings over time
    const timeData = await Booking.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);
    
    res.json({
      categoryData,
      statusData,
      timeData
    });
  } catch (error) {
    console.error('Error fetching booking analytics:', error);
    res.status(500).json({ message: 'Error fetching booking analytics' });
  }
};

exports.getUserAnalytics = async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    let startDate;
    switch (period) {
      case '7d':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    }
    
    // New users over time
    const newUsersData = await User.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);
    
    // Users by role
    const roleData = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);
    
    // Verification status
    const verificationData = await User.aggregate([
      { $group: { _id: '$isVerified', count: { $sum: 1 } } }
    ]);
    
    res.json({
      newUsersData,
      roleData,
      verificationData
    });
  } catch (error) {
    console.error('Error fetching user analytics:', error);
    res.status(500).json({ message: 'Error fetching user analytics' });
  }
};

// Service Management
exports.getAllServices = async (req, res) => {
  try {
    const { type, status } = req.query;
    
    let services = [];
    
    if (!type || type === 'all') {
      // Get all service types
      const [activities, stays, dining, transportation] = await Promise.all([
        Activity.find().populate('host', 'name email'),
        Stay.find().populate('host', 'name email'),
        Dining.find().populate('host', 'name email'),
        Transportation.find().populate('host', 'name email')
      ]);
      
      services = [
        ...activities.map(s => ({ ...s.toObject(), serviceType: 'activity' })),
        ...stays.map(s => ({ ...s.toObject(), serviceType: 'stay' })),
        ...dining.map(s => ({ ...s.toObject(), serviceType: 'dining' })),
        ...transportation.map(s => ({ ...s.toObject(), serviceType: 'transportation' }))
      ];
    } else {
      // Get specific service type
      let Model;
      switch (type) {
        case 'activity':
          Model = Activity;
          break;
        case 'stay':
          Model = Stay;
          break;
        case 'dining':
          Model = Dining;
          break;
        case 'transportation':
          Model = Transportation;
          break;
        default:
          return res.status(400).json({ message: 'Invalid service type' });
      }
      
      const results = await Model.find().populate('host', 'name email');
      services = results.map(s => ({ ...s.toObject(), serviceType: type }));
    }
    
    // Filter by status if provided
    if (status && status !== 'all') {
      services = services.filter(service => service.status === status);
    }
    
    res.json(services);
  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json({ message: 'Error fetching services' });
  }
};

exports.approveService = async (req, res) => {
  try {
    const { serviceType } = req.body;
    
    let Model;
    switch (serviceType) {
      case 'activity':
        Model = Activity;
        break;
      case 'stay':
        Model = Stay;
        break;
      case 'dining':
        Model = Dining;
        break;
      case 'transportation':
        Model = Transportation;
        break;
      default:
        return res.status(400).json({ message: 'Invalid service type' });
    }
    
    const service = await Model.findByIdAndUpdate(
      req.params.id,
      { status: 'approved', approvedAt: new Date(), approvedBy: req.user.id },
      { new: true }
    );
    
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }
    
    res.json({ message: 'Service approved successfully', service });
  } catch (error) {
    console.error('Error approving service:', error);
    res.status(500).json({ message: 'Error approving service' });
  }
};

exports.rejectService = async (req, res) => {
  try {
    const { serviceType, reason } = req.body;
    
    let Model;
    switch (serviceType) {
      case 'activity':
        Model = Activity;
        break;
      case 'stay':
        Model = Stay;
        break;
      case 'dining':
        Model = Dining;
        break;
      case 'transportation':
        Model = Transportation;
        break;
      default:
        return res.status(400).json({ message: 'Invalid service type' });
    }
    
    const service = await Model.findByIdAndUpdate(
      req.params.id,
      { 
        status: 'rejected', 
        rejectedAt: new Date(), 
        rejectedBy: req.user.id,
        rejectionReason: reason 
      },
      { new: true }
    );
    
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }
    
    res.json({ message: 'Service rejected', service });
  } catch (error) {
    console.error('Error rejecting service:', error);
    res.status(500).json({ message: 'Error rejecting service' });
  }
};

// Reports
exports.getRevenueReport = async (req, res) => {
  try {
    const { startDate, endDate, format = 'json' } = req.query;
    
    const matchQuery = {};
    if (startDate && endDate) {
      matchQuery.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    const report = await Booking.aggregate([
      { $match: { ...matchQuery, status: { $in: ['confirmed', 'completed'] } } },
      {
        $group: {
          _id: '$category',
          totalRevenue: { $sum: '$paymentDetails.totalAmount' },
          bookingCount: { $sum: 1 },
          averageValue: { $avg: '$paymentDetails.totalAmount' }
        }
      },
      { $sort: { totalRevenue: -1 } }
    ]);
    
    if (format === 'csv') {
      const csv = [
        'Category,Total Revenue,Booking Count,Average Value',
        ...report.map(item => 
          `${item._id},${item.totalRevenue},${item.bookingCount},${item.averageValue.toFixed(2)}`
        )
      ].join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=revenue-report.csv');
      return res.send(csv);
    }
    
    res.json(report);
  } catch (error) {
    console.error('Error generating revenue report:', error);
    res.status(500).json({ message: 'Error generating revenue report' });
  }
};

exports.getBookingReport = async (req, res) => {
  try {
    const { startDate, endDate, format = 'json' } = req.query;
    
    const matchQuery = {};
    if (startDate && endDate) {
      matchQuery.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    const bookings = await Booking.find(matchQuery)
      .populate('user', 'name email')
      .populate('activity', 'name')
      .populate('stay', 'name')
      .populate('dining', 'name')
      .populate('transportation', 'category')
      .sort({ createdAt: -1 });
    
    if (format === 'csv') {
      const csv = [
        'Booking ID,User Name,User Email,Category,Service,Status,Amount,Date',
        ...bookings.map(booking => {
          const serviceName = booking.activity?.name || 
                            booking.stay?.name || 
                            booking.dining?.name || 
                            booking.transportation?.category || 
                            'N/A';
          return `${booking._id},${booking.user.name},${booking.user.email},${booking.category},${serviceName},${booking.status},${booking.paymentDetails.totalAmount},${booking.createdAt.toISOString()}`;
        })
      ].join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=booking-report.csv');
      return res.send(csv);
    }
    
    res.json(bookings);
  } catch (error) {
    console.error('Error generating booking report:', error);
    res.status(500).json({ message: 'Error generating booking report' });
  }
};

exports.getUserReport = async (req, res) => {
  try {
    const { startDate, endDate, format = 'json' } = req.query;
    
    const matchQuery = {};
    if (startDate && endDate) {
      matchQuery.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    const users = await User.find(matchQuery)
      .select('-password')
      .sort({ createdAt: -1 });
    
    if (format === 'csv') {
      const csv = [
        'User ID,Name,Email,Role,Verified,Created Date',
        ...users.map(user => 
          `${user._id},${user.name},${user.email},${user.role},${user.isVerified ? 'Yes' : 'No'},${user.createdAt.toISOString()}`
        )
      ].join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=user-report.csv');
      return res.send(csv);
    }
    
    res.json(users);
  } catch (error) {
    console.error('Error generating user report:', error);
    res.status(500).json({ message: 'Error generating user report' });
  }
};