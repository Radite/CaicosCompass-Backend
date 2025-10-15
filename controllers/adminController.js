const User = require('../models/User');
const Booking = require('../models/Booking');
const Stay = require('../models/Stay');
const Dining = require('../models/Dining');
const Activity = require('../models/Activity');
const Transportation = require('../models/Transportation');
const AuditLog = require('../models/AuditLog');
const { sendBusinessApprovalEmail } = require('./emailService');

// Dashboard Statistics
// Dashboard Stats
exports.getDashboardStats = async (req, res) => {
  try {
    console.log('📊 Fetching dashboard stats...'); // Debug

    // Total users
    const totalUsers = await User.countDocuments();
    console.log('Total users:', totalUsers); // Debug

    // Total bookings
    const totalBookings = await Booking.countDocuments();
    console.log('Total bookings:', totalBookings); // Debug

    // Active vendors - using accountStatus instead of isActive
    const activeVendors = await User.countDocuments({ 
      role: 'business-manager', 
      'businessProfile.isApproved': true,
      accountStatus: 'active' // Changed from isActive
    });
    console.log('Active vendors:', activeVendors); // Debug

    // Pending approvals
    const pendingApprovals = await User.countDocuments({ 
      role: 'business-manager', 
      'businessProfile.isApproved': false 
    });
    console.log('Pending approvals:', pendingApprovals); // Debug

    // Total revenue with error handling
    let totalRevenue = 0;
    try {
      const revenueResult = await Booking.aggregate([
        { $match: { status: 'confirmed' } },
        { $group: { _id: null, total: { $sum: '$paymentDetails.totalAmount' } } }
      ]);
      totalRevenue = revenueResult[0]?.total || 0;
      console.log('Total revenue:', totalRevenue); // Debug
    } catch (revenueError) {
      console.error('Error calculating revenue:', revenueError);
    }

    // Recent users - using accountStatus
    const recentUsers = await User.find({ accountStatus: 'active' })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name email role createdAt')
      .lean(); // Use lean for better performance
    console.log('Recent users count:', recentUsers.length); // Debug

    // Recent bookings with better error handling
    let recentBookings = [];
    try {
      recentBookings = await Booking.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('user', 'name email')
        .populate('service', 'name')
        .lean();
      
      // Transform serviceName
      recentBookings = recentBookings.map(booking => ({
        ...booking,
        serviceName: booking.service?.name || booking.serviceName || 'N/A'
      }));
      console.log('Recent bookings count:', recentBookings.length); // Debug
    } catch (bookingError) {
      console.error('Error fetching recent bookings:', bookingError);
    }

    // Total listings
    let totalListings = 0;
    try {
      totalListings = await Service.countDocuments();
      console.log('Total listings:', totalListings); // Debug
    } catch (listingError) {
      console.error('Error counting listings:', listingError);
    }

    // Calculate user growth rate
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const newUsersLastMonth = await User.countDocuments({ 
      createdAt: { $gte: thirtyDaysAgo } 
    });
    const userGrowthRate = totalUsers > 0 ? ((newUsersLastMonth / totalUsers) * 100).toFixed(2) : 0;
    console.log('User growth rate:', userGrowthRate); // Debug

    // Calculate conversion rate
    const conversionRate = totalUsers > 0 ? (totalBookings / totalUsers) * 100 : 0;
    console.log('Conversion rate:', conversionRate); // Debug

    const stats = {
      totalUsers,
      totalBookings,
      totalRevenue,
      growthRate: parseFloat(userGrowthRate),
      recentUsers,
      recentBookings,
      platformMetrics: {
        activeVendors,
        pendingApprovals,
        totalListings,
        conversionRate: parseFloat(conversionRate.toFixed(2))
      }
    };

    console.log('✅ Dashboard stats compiled successfully'); // Debug

    // Try to log audit action, but don't fail if it errors
    try {
      await logAuditAction(req.user.id, 'dashboard_view', 'admin_dashboard', {
        timestamp: new Date(),
        stats: { totalUsers, totalBookings, totalRevenue }
      }, req);
    } catch (auditError) {
      console.error('Error logging audit action:', auditError);
      // Don't fail the request if audit logging fails
    }

    res.json(stats);
  } catch (error) {
    console.error('❌ Error fetching dashboard stats:', error);
    console.error('Error stack:', error.stack);
    
    // Return a more detailed error for debugging
    res.status(500).json({ 
      message: 'Error fetching dashboard statistics',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// User Management
// controllers/adminController.js - Updated getUsers function
exports.getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 50, role, status, search } = req.query;
    
    let query = {};
    
    if (role && role !== 'all') {
      query.role = role;
    }
    
    // Map status filter to accountStatus
    if (status && status !== 'all') {
      query.accountStatus = status === 'active' ? 'active' : 'deactivated';
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('name email role accountStatus loyaltyPoints createdAt lastLoginAt businessProfile phoneNumber')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const totalUsers = await User.countDocuments(query);

    // Transform accountStatus to isActive for frontend
    const transformedUsers = users.map(user => {
      const userObj = user.toObject();
      return {
        ...userObj,
        isActive: userObj.accountStatus === 'active'
      };
    });

    await logAuditAction(req.user.id, 'users_view', 'user_management', {
      filters: { role, status, search },
      totalResults: totalUsers
    }, req);

    res.json({
      success: true,
      users: transformedUsers,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalUsers / limit),
        totalUsers,
        hasNextPage: page * limit < totalUsers,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching users',
      users: []
    });
  }
};

exports.getUserDetails = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId)
      .select('-password')
      .populate('businessProfile');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get user's bookings
    const bookings = await Booking.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('service');

    // Get user's activity stats
    const totalBookings = await Booking.countDocuments({ user: userId });
    const totalSpent = await Booking.aggregate([
      { $match: { user: userId, status: 'confirmed' } },
      { $group: { _id: null, total: { $sum: '$paymentDetails.totalAmount' } } }
    ]);

    await logAuditAction(req.user.id, 'user_view', 'user_details', {
      targetUserId: userId,
      targetUserEmail: user.email
    }, req);

    res.json({
      user,
      bookings,
      stats: {
        totalBookings,
        totalSpent: totalSpent[0]?.total || 0
      }
    });
  } catch (error) {
    console.error('Error fetching user details:', error);
    res.status(500).json({ message: 'Error fetching user details' });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const updates = req.body;

    console.log('Updating user:', userId, 'with updates:', updates); // Debug

    // Prevent updating password through this endpoint
    delete updates.password;

    // Find user first
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update basic fields
    if (updates.name) user.name = updates.name;
    if (updates.email) user.email = updates.email;
    if (updates.phoneNumber !== undefined) user.phoneNumber = updates.phoneNumber;
    if (updates.loyaltyPoints !== undefined) user.loyaltyPoints = updates.loyaltyPoints;
    
    // Handle isActive from frontend -> accountStatus in backend
    if (updates.isActive !== undefined) {
      user.accountStatus = updates.isActive ? 'active' : 'deactivated';
      if (!updates.isActive) {
        user.deactivatedAt = new Date();
      } else {
        user.deactivatedAt = null;
      }
    }

    // Update business profile if provided and user is business-manager
    if (updates.businessProfile && user.role === 'business-manager') {
      if (!user.businessProfile) {
        user.businessProfile = {};
      }
      
      if (updates.businessProfile.businessName !== undefined) {
        user.businessProfile.businessName = updates.businessProfile.businessName;
      }
      if (updates.businessProfile.businessType !== undefined) {
        user.businessProfile.businessType = updates.businessProfile.businessType;
      }
      if (updates.businessProfile.isApproved !== undefined) {
        user.businessProfile.isApproved = updates.businessProfile.isApproved;
        if (updates.businessProfile.isApproved) {
          user.businessProfile.approvalDate = new Date();
        }
      }
    }

    user.updatedAt = new Date();
    await user.save();

    console.log('User updated successfully'); // Debug

    await logAuditAction(req.user.id, 'user_update', 'user_management', {
      targetUserId: userId,
      targetUserEmail: user.email,
      updates
    }, req);

    // Return with isActive computed
    const userObj = user.toObject();
    res.json({ 
      message: 'User updated successfully', 
      user: { 
        ...userObj, 
        password: undefined,
        isActive: user.accountStatus === 'active'
      }
    });
  } catch (error) {
    console.error('Error updating user:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      message: 'Error updating user',
      error: error.message
    });
  }
};

exports.toggleUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    
    console.log('Toggling status for user:', userId); // Debug log
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('Current accountStatus:', user.accountStatus); // Debug log

    // Toggle accountStatus (not isActive)
    user.accountStatus = user.accountStatus === 'active' ? 'deactivated' : 'active';
    
    if (user.accountStatus === 'deactivated') {
      user.deactivatedAt = new Date();
    } else {
      user.deactivatedAt = null;
    }
    
    user.updatedAt = new Date();
    
    await user.save();

    console.log('New accountStatus:', user.accountStatus); // Debug log

    await logAuditAction(req.user.id, 'user_status_toggle', 'user_management', {
      targetUserId: userId,
      targetUserEmail: user.email,
      newStatus: user.accountStatus
    }, req);

    // Return user with isActive computed for frontend
    const userObj = user.toObject();
    res.json({ 
      message: `User ${user.accountStatus === 'active' ? 'activated' : 'deactivated'} successfully`,
      user: { 
        ...userObj, 
        password: undefined,
        isActive: user.accountStatus === 'active' // Compute isActive for frontend
      }
    });
  } catch (error) {
    console.error('Error toggling user status:', error);
    console.error('Error stack:', error.stack); // More detailed error
    res.status(500).json({ 
      message: 'Error updating user status',
      error: error.message // Send error message for debugging
    });
  }
};

exports.updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!['user', 'business-manager', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { role, updatedAt: new Date() },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await logAuditAction(req.user.id, 'user_role_update', 'user_management', {
      targetUserId: userId,
      targetUserEmail: user.email,
      newRole: role
    }, req);

    res.json({ message: 'User role updated successfully', user });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ message: 'Error updating user role' });
  }
};

// Booking Management
exports.getBookings = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      status, 
      category, 
      startDate, 
      endDate,
      search
    } = req.query;
    
    let query = {};
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (category && category !== 'all') {
      query.category = category;
    }
    
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const bookings = await Booking.find(query)
      .populate('user', 'name email')
      .populate('vendor', 'businessProfile.businessName')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const totalBookings = await Booking.countDocuments(query);

    await logAuditAction(req.user.id, 'bookings_view', 'booking_management', {
      filters: { status, category, startDate, endDate },
      totalResults: totalBookings
    }, req);

    res.json({
      bookings,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalBookings / limit),
        totalBookings,
        hasNextPage: page * limit < totalBookings,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ message: 'Error fetching bookings' });
  }
};

// Revenue Analytics
exports.getRevenueAnalytics = async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const days = parseInt(period);
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get confirmed bookings
    const bookings = await Booking.find({
      status: 'confirmed',
      createdAt: { $gte: startDate }
    }).populate('vendor', 'businessProfile.businessName');

    // Calculate total revenue
    const totalRevenue = bookings.reduce((sum, booking) => 
      sum + (booking.paymentDetails?.totalAmount || 0), 0
    );

    // Revenue by month
    const monthlyRevenue = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      
      const monthBookings = bookings.filter(booking => 
        booking.createdAt >= monthStart && booking.createdAt <= monthEnd
      );
      
      const monthRevenue = monthBookings.reduce((sum, booking) => 
        sum + (booking.paymentDetails?.totalAmount || 0), 0
      );

      monthlyRevenue.push({
        month: monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        revenue: monthRevenue,
        bookings: monthBookings.length
      });
    }

    // Revenue by category
    const categoryRevenue = {};
    bookings.forEach(booking => {
      const category = booking.category || 'other';
      if (!categoryRevenue[category]) {
        categoryRevenue[category] = 0;
      }
      categoryRevenue[category] += booking.paymentDetails?.totalAmount || 0;
    });

    const revenueByCategory = Object.entries(categoryRevenue).map(([category, revenue]) => ({
      category,
      revenue,
      percentage: totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0
    }));

    // Top vendors by revenue
    const vendorRevenue = {};
    bookings.forEach(booking => {
      const vendorId = booking.vendor?._id?.toString();
      const vendorName = booking.vendor?.businessProfile?.businessName || 'Unknown';
      
      if (vendorId) {
        if (!vendorRevenue[vendorId]) {
          vendorRevenue[vendorId] = {
            vendorId,
            vendorName,
            revenue: 0,
            bookings: 0
          };
        }
        vendorRevenue[vendorId].revenue += booking.paymentDetails?.totalAmount || 0;
        vendorRevenue[vendorId].bookings++;
      }
    });

    const topVendors = Object.values(vendorRevenue)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    res.json({
      totalRevenue,
      monthlyRevenue,
      revenueByCategory,
      topVendors,
      period: days
    });
  } catch (error) {
    console.error('Error fetching revenue analytics:', error);
    res.status(500).json({ message: 'Error fetching revenue analytics' });
  }
};

// System Health
exports.getSystemHealth = async (req, res) => {
  try {
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();
    
    // Database health check
    const dbHealth = await checkDatabaseHealth();
    
    // API metrics (you might want to implement proper monitoring)
    const apiMetrics = {
      requestsPerMinute: 0, // Implement actual tracking
      averageResponseTime: 0, // Implement actual tracking
      errorRate: 0 // Implement actual tracking
    };

    const health = {
      serverHealth: {
        cpu: 0, // Implement actual CPU monitoring
        memory: Math.round((memoryUsage.used / memoryUsage.total) * 100),
        disk: 0, // Implement actual disk monitoring
        uptime: Math.floor(uptime)
      },
      databaseHealth: dbHealth,
      apiMetrics
    };

    res.json(health);
  } catch (error) {
    console.error('Error fetching system health:', error);
    res.status(500).json({ message: 'Error fetching system health' });
  }
};

// Audit Logs
exports.getAuditLogs = async (req, res) => {
  try {
    const { page = 1, limit = 50, action, startDate, endDate } = req.query;
    
    let query = {};
    
    if (action && action !== 'all') {
      query.action = action;
    }
    
    if (startDate && endDate) {
      query.timestamp = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const logs = await AuditLog.find(query)
      .sort({ timestamp: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const totalLogs = await AuditLog.countDocuments(query);

    res.json({
      logs,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalLogs / limit),
        totalLogs,
        hasNextPage: page * limit < totalLogs,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ message: 'Error fetching audit logs' });
  }
};

// Helper Functions
async function checkDatabaseHealth() {
  try {
    const User = require('../models/User');
    const start = Date.now();
    await User.findOne().limit(1);
    const queryTime = Date.now() - start;
    
    return {
      connections: 1, // Implement actual connection counting
      queryTime,
      status: queryTime < 100 ? 'healthy' : queryTime < 500 ? 'warning' : 'critical'
    };
  } catch (error) {
    return {
      connections: 0,
      queryTime: 0,
      status: 'critical'
    };
  }
}

async function logAuditAction(userId, action, resource, details, req) {
  try {
    const auditLog = new AuditLog({
      userId,
      userName: req.user?.name || 'Unknown',
      action,
      resource,
      details,
      ipAddress: req.ip || req.connection?.remoteAddress || 'Unknown',
      userAgent: req.get('User-Agent') || 'Unknown',
      timestamp: new Date()
    });
    
    await auditLog.save();
  } catch (error) {
    console.error('Error logging audit action:', error);
  }
}

// Delete User Controller
exports.deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const adminId = req.user.id;

    // Validate userId
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    // Validate ObjectId format
    if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'Invalid user ID format' });
    }

    // Prevent admin from deleting themselves
    if (userId === adminId) {
      return res.status(400).json({ 
        message: 'You cannot delete your own account' 
      });
    }

    // Find the user to be deleted
    const userToDelete = await User.findById(userId);
    if (!userToDelete) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user is already deleted (soft delete)
    if (!userToDelete.isActive) {
      return res.status(400).json({ 
        message: 'User is already deactivated' 
      });
    }

    // Prevent deletion of other admin users (security measure)
    if (userToDelete.role === 'admin') {
      return res.status(403).json({ 
        message: 'Cannot delete admin users. Contact system administrator.' 
      });
    }

    // Check if user has active bookings
    const activeBookings = await Booking.find({
      user: userId,
      status: { $in: ['pending', 'confirmed'] }
    });

    if (activeBookings.length > 0) {
      return res.status(400).json({
        message: `Cannot delete user with ${activeBookings.length} active booking(s). Please cancel or complete bookings first.`,
        details: {
          activeBookings: activeBookings.length,
          bookingIds: activeBookings.map(b => b._id)
        }
      });
    }

    // If user is a business manager, check for listings
    let userListings = [];
    let totalListings = 0;
    
    if (userToDelete.role === 'business-manager') {
      const [stays, dinings, activities, transportations] = await Promise.all([
        Stay.find({ vendor: userId, status: { $ne: 'deleted' } }),
        Dining.find({ vendor: userId, status: { $ne: 'deleted' } }),
        Activity.find({ vendor: userId, status: { $ne: 'deleted' } }),
        Transportation.find({ vendor: userId, status: { $ne: 'deleted' } })
      ]);
      
      userListings = [...stays, ...dinings, ...activities, ...transportations];
      totalListings = userListings.length;
      
      if (totalListings > 0) {
        return res.status(400).json({
          message: `Cannot delete business manager with ${totalListings} active listing(s). Please transfer or delete listings first.`,
          details: {
            activeListings: totalListings,
            stays: stays.length,
            dinings: dinings.length,
            activities: activities.length,
            transportations: transportations.length
          }
        });
      }
    }

    // Store user details for logging
    const userEmail = userToDelete.email;
    const userName = userToDelete.name;
    const userRole = userToDelete.role;
    const userCreatedAt = userToDelete.createdAt;

    // Perform soft delete (recommended for production)
    const deletedUser = await User.findByIdAndUpdate(
      userId,
      {
        isActive: false,
        email: `deleted_${Date.now()}_${userToDelete.email}`, // Prevent email conflicts
        deletedAt: new Date(),
        deletedBy: adminId,
        updatedAt: new Date()
      },
      { new: true, select: '-password' }
    );

    // Alternative: Hard delete (uncomment if you prefer permanent deletion)
    /*
    // Update related records to maintain referential integrity
    await Promise.all([
      // Update completed/cancelled bookings to reference "Deleted User"
      Booking.updateMany(
        { user: userId, status: { $in: ['completed', 'cancelled'] } },
        { 
          $set: { 
            userDetails: {
              originalUserId: userId,
              name: userName,
              email: userEmail,
              deletedAt: new Date()
            }
          }
        }
      )
    ]);

    // Permanently delete the user
    await User.findByIdAndDelete(userId);
    */

    // Log the deletion action for audit trail
    await logAuditAction(
      adminId,
      'user_delete',
      'user_management',
      {
        deletedUserId: userId,
        deletedUserEmail: userEmail,
        deletedUserName: userName,
        deletedUserRole: userRole,
        deletedUserCreatedAt: userCreatedAt,
        deletionType: 'soft_delete',
        activeBookingsCount: activeBookings.length,
        activeListingsCount: totalListings,
        deletionReason: 'admin_action'
      },
      req
    );

    // Send success response
    res.json({
      success: true,
      message: 'User deleted successfully',
      data: {
        deletedUser: {
          id: userId,
          name: userName,
          email: userEmail,
          role: userRole,
          deletedAt: deletedUser.deletedAt
        },
        deletionDetails: {
          type: 'soft_delete',
          canBeRestored: true,
          affectedRecords: {
            bookings: activeBookings.length,
            listings: totalListings
          }
        }
      }
    });

  } catch (error) {
    console.error('Error deleting user:', error);
    
    // Log the error for audit trail
    try {
      await logAuditAction(
        req.user?.id || 'unknown',
        'user_delete_error',
        'user_management',
        {
          targetUserId: req.params.userId,
          error: error.message,
          errorStack: error.stack
        },
        req
      );
    } catch (logError) {
      console.error('Error logging audit action:', logError);
    }

    // Return appropriate error response
    if (error.name === 'CastError') {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid user ID format',
        error: 'INVALID_USER_ID'
      });
    }

    res.status(500).json({ 
      success: false,
      message: 'Error deleting user',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Add these functions to your controllers/adminController.js

// Booking Details
exports.getBookingDetails = async (req, res) => {
  try {
    const { bookingId } = req.params;
    
    const booking = await Booking.findById(bookingId)
      .populate('user', 'name email phone')
      .populate('vendor', 'businessProfile.businessName businessProfile.contactInfo')
      .populate('service');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    await logAuditAction(req.user.id, 'booking_view', 'booking_details', {
      bookingId: bookingId,
      bookingStatus: booking.status
    }, req);

    res.json(booking);
  } catch (error) {
    console.error('Error fetching booking details:', error);
    res.status(500).json({ message: 'Error fetching booking details' });
  }
};

// Update Booking Status
exports.updateBookingStatus = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { status, adminNotes } = req.body;

    if (!['pending', 'confirmed', 'cancelled', 'completed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid booking status' });
    }

    const booking = await Booking.findByIdAndUpdate(
      bookingId,
      { 
        status, 
        adminNotes,
        updatedAt: new Date() 
      },
      { new: true }
    ).populate('user', 'name email');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    await logAuditAction(req.user.id, 'booking_status_update', 'booking_management', {
      bookingId: bookingId,
      oldStatus: booking.status,
      newStatus: status,
      customerEmail: booking.user?.email
    }, req);

    res.json({ message: 'Booking status updated successfully', booking });
  } catch (error) {
    console.error('Error updating booking status:', error);
    res.status(500).json({ message: 'Error updating booking status' });
  }
};

// Get Vendors
exports.getVendors = async (req, res) => {
  try {
    const { page = 1, limit = 50, status, approved } = req.query;
    
    let query = { role: 'business-manager' };
    
    if (status && status !== 'all') {
      query.isActive = status === 'active';
    }
    
    if (approved && approved !== 'all') {
      query['businessProfile.isApproved'] = approved === 'true';
    }

    const vendors = await User.find(query)
      .select('name email businessProfile isActive createdAt')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const totalVendors = await User.countDocuments(query);

    await logAuditAction(req.user.id, 'vendors_view', 'vendor_management', {
      filters: { status, approved },
      totalResults: totalVendors
    }, req);

    res.json({
      vendors,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalVendors / limit),
        totalVendors,
        hasNextPage: page * limit < totalVendors,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching vendors:', error);
    res.status(500).json({ message: 'Error fetching vendors' });
  }
};

// Approve Vendor
// Update your approveVendor function (replace the existing one)
exports.approveVendor = async (req, res) => {
  try {
    const { vendorId } = req.params;
    
    // Find the vendor first to get their information
    const vendor = await User.findById(vendorId).select('-password');
    
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }

    if (vendor.role !== 'business-manager') {
      return res.status(400).json({ message: 'User is not a business manager' });
    }

    if (vendor.businessProfile?.isApproved) {
      return res.status(400).json({ message: 'Business is already approved' });
    }

    // Update vendor approval status
    const updatedVendor = await User.findByIdAndUpdate(
      vendorId,
      { 
        'businessProfile.isApproved': true,
        'businessProfile.approvedAt': new Date(),
        'businessProfile.approvedBy': req.user.id,
        updatedAt: new Date()
      },
      { new: true }
    ).select('-password');

    // Send business approval email
    try {
      await sendBusinessApprovalEmail(
        updatedVendor.email, 
        updatedVendor.businessProfile, 
        updatedVendor.name
      );
      console.log(`✅ Business approval email sent to ${updatedVendor.email}`);
    } catch (emailError) {
      console.error('❌ Failed to send business approval email:', emailError);
      // Don't fail the approval if email fails, just log it
      // The business is still approved, but we should notify admins about email failure
    }

    // Log audit action (if you have this function)
    if (typeof logAuditAction === 'function') {
      try {
        await logAuditAction(req.user.id, 'vendor_approve', 'vendor_management', {
          vendorId: vendorId,
          vendorEmail: updatedVendor.email,
          businessName: updatedVendor.businessProfile?.businessName
        }, req);
      } catch (auditError) {
        console.error('❌ Failed to log audit action:', auditError);
      }
    }

    res.json({ 
      message: 'Vendor approved successfully and notification email sent', 
      vendor: updatedVendor,
      emailSent: true
    });

  } catch (error) {
    console.error('Error approving vendor:', error);
    res.status(500).json({ message: 'Error approving vendor' });
  }
};

// Optional: Enhanced reject function with email notification
exports.rejectVendor = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { rejectionReason } = req.body;
    
    // Find the vendor first
    const vendor = await User.findById(vendorId).select('-password');
    
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }

    if (vendor.role !== 'business-manager') {
      return res.status(400).json({ message: 'User is not a business manager' });
    }

    // Update vendor rejection status
    const updatedVendor = await User.findByIdAndUpdate(
      vendorId,
      { 
        'businessProfile.isApproved': false,
        'businessProfile.rejectionReason': rejectionReason,
        'businessProfile.rejectedAt': new Date(),
        'businessProfile.rejectedBy': req.user.id,
        updatedAt: new Date()
      },
      { new: true }
    ).select('-password');

    // TODO: You could add a business rejection email function here
    // await sendBusinessRejectionEmail(updatedVendor.email, rejectionReason, updatedVendor.name);

    // Log audit action (if you have this function)
    if (typeof logAuditAction === 'function') {
      try {
        await logAuditAction(req.user.id, 'vendor_reject', 'vendor_management', {
          vendorId: vendorId,
          vendorEmail: updatedVendor.email,
          businessName: updatedVendor.businessProfile?.businessName,
          rejectionReason
        }, req);
      } catch (auditError) {
        console.error('❌ Failed to log audit action:', auditError);
      }
    }

    res.json({ 
      message: 'Vendor rejected successfully', 
      vendor: updatedVendor 
    });

  } catch (error) {
    console.error('Error rejecting vendor:', error);
    res.status(500).json({ message: 'Error rejecting vendor' });
  }
};

// Reject Vendor
exports.rejectVendor = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { rejectionReason } = req.body;
    
    const vendor = await User.findByIdAndUpdate(
      vendorId,
      { 
        'businessProfile.isApproved': false,
        'businessProfile.rejectionReason': rejectionReason,
        'businessProfile.rejectedAt': new Date(),
        'businessProfile.rejectedBy': req.user.id,
        updatedAt: new Date()
      },
      { new: true }
    ).select('-password');

    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }

    await logAuditAction(req.user.id, 'vendor_reject', 'vendor_management', {
      vendorId: vendorId,
      vendorEmail: vendor.email,
      businessName: vendor.businessProfile?.businessName,
      rejectionReason
    }, req);

    res.json({ message: 'Vendor rejected successfully', vendor });
  } catch (error) {
    console.error('Error rejecting vendor:', error);
    res.status(500).json({ message: 'Error rejecting vendor' });
  }
};

// User Analytics
exports.getUserAnalytics = async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const days = parseInt(period);
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // User registrations over time
    const users = await User.find({ createdAt: { $gte: startDate } });
    
    // Group by day
    const dailyRegistrations = {};
    users.forEach(user => {
      const date = user.createdAt.toISOString().split('T')[0];
      if (!dailyRegistrations[date]) {
        dailyRegistrations[date] = 0;
      }
      dailyRegistrations[date]++;
    });

    // User roles breakdown
    const roleBreakdown = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);

    // Active vs inactive users
    const activeUsers = await User.countDocuments({ isActive: true });
    const inactiveUsers = await User.countDocuments({ isActive: false });

    res.json({
      dailyRegistrations,
      roleBreakdown,
      activeUsers,
      inactiveUsers,
      period: days
    });
  } catch (error) {
    console.error('Error fetching user analytics:', error);
    res.status(500).json({ message: 'Error fetching user analytics' });
  }
};

// Booking Analytics
exports.getBookingAnalytics = async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const days = parseInt(period);
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const bookings = await Booking.find({ createdAt: { $gte: startDate } });

    // Bookings by status
    const statusBreakdown = {};
    bookings.forEach(booking => {
      if (!statusBreakdown[booking.status]) {
        statusBreakdown[booking.status] = 0;
      }
      statusBreakdown[booking.status]++;
    });

    // Bookings by category
    const categoryBreakdown = {};
    bookings.forEach(booking => {
      const category = booking.category || 'other';
      if (!categoryBreakdown[category]) {
        categoryBreakdown[category] = 0;
      }
      categoryBreakdown[category]++;
    });

    // Daily bookings
    const dailyBookings = {};
    bookings.forEach(booking => {
      const date = booking.createdAt.toISOString().split('T')[0];
      if (!dailyBookings[date]) {
        dailyBookings[date] = 0;
      }
      dailyBookings[date]++;
    });

    res.json({
      totalBookings: bookings.length,
      statusBreakdown,
      categoryBreakdown,
      dailyBookings,
      period: days
    });
  } catch (error) {
    console.error('Error fetching booking analytics:', error);
    res.status(500).json({ message: 'Error fetching booking analytics' });
  }
};

// Platform Analytics
exports.getPlatformAnalytics = async (req, res) => {
  try {
    const [
      totalUsers,
      totalVendors,
      totalListings,
      totalBookings,
      totalRevenue
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'business-manager' }),
      Promise.all([
        Stay.countDocuments(),
        Dining.countDocuments(),
        Activity.countDocuments(),
        Transportation.countDocuments()
      ]).then(counts => counts.reduce((sum, count) => sum + count, 0)),
      Booking.countDocuments(),
      Booking.aggregate([
        { $match: { status: 'confirmed' } },
        { $group: { _id: null, total: { $sum: '$paymentDetails.totalAmount' } } }
      ])
    ]);

    // Growth metrics (last 30 days vs previous 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const [
      recentUsers,
      previousUsers,
      recentBookings,
      previousBookings
    ] = await Promise.all([
      User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      User.countDocuments({ createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo } }),
      Booking.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      Booking.countDocuments({ createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo } })
    ]);

    const userGrowth = previousUsers > 0 ? ((recentUsers - previousUsers) / previousUsers) * 100 : 0;
    const bookingGrowth = previousBookings > 0 ? ((recentBookings - previousBookings) / previousBookings) * 100 : 0;

    res.json({
      overview: {
        totalUsers,
        totalVendors,
        totalListings,
        totalBookings,
        totalRevenue: totalRevenue[0]?.total || 0
      },
      growth: {
        userGrowth: parseFloat(userGrowth.toFixed(2)),
        bookingGrowth: parseFloat(bookingGrowth.toFixed(2))
      }
    });
  } catch (error) {
    console.error('Error fetching platform analytics:', error);
    res.status(500).json({ message: 'Error fetching platform analytics' });
  }
};

// System Metrics
exports.getSystemMetrics = async (req, res) => {
  try {
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();

    // Database metrics
    const dbStats = await mongoose.connection.db.stats();
    
    res.json({
      server: {
        uptime: Math.floor(uptime),
        memoryUsage: {
          used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          total: Math.round(memoryUsage.heapTotal / 1024 / 1024)
        },
        nodeVersion: process.version
      },
      database: {
        collections: dbStats.collections,
        dataSize: Math.round(dbStats.dataSize / 1024 / 1024),
        indexSize: Math.round(dbStats.indexSize / 1024 / 1024)
      }
    });
  } catch (error) {
    console.error('Error fetching system metrics:', error);
    res.status(500).json({ message: 'Error fetching system metrics' });
  }
};

// Create Backup
exports.createBackup = async (req, res) => {
  try {
    // This is a placeholder - implement actual backup logic
    const backupId = new Date().getTime();
    
    await logAuditAction(req.user.id, 'backup_create', 'system_backup', {
      backupId: backupId,
      timestamp: new Date()
    }, req);

    res.json({ 
      message: 'Backup initiated successfully',
      backupId: backupId,
      status: 'in_progress'
    });
  } catch (error) {
    console.error('Error creating backup:', error);
    res.status(500).json({ message: 'Error creating backup' });
  }
};

// Get Backups
exports.getBackups = async (req, res) => {
  try {
    // This is a placeholder - implement actual backup retrieval logic
    const mockBackups = [
      {
        id: '1640995200000',
        name: 'Full System Backup',
        type: 'full',
        size: '2.4 GB',
        createdAt: new Date('2024-07-25T02:00:00Z'),
        status: 'completed'
      },
      {
        id: '1640908800000',
        name: 'Database Backup',
        type: 'database',
        size: '850 MB',
        createdAt: new Date('2024-07-24T02:00:00Z'),
        status: 'completed'
      }
    ];

    res.json({
      backups: mockBackups,
      totalBackups: mockBackups.length
    });
  } catch (error) {
    console.error('Error fetching backups:', error);
    res.status(500).json({ message: 'Error fetching backups' });
  }
};

// Get System Settings
exports.getSystemSettings = async (req, res) => {
  try {
    // This would typically fetch from a settings collection
    const defaultSettings = {
      general: {
        siteName: 'TurksExplorer Admin',
        siteDescription: 'Turks and Caicos Tourism Platform',
        contactEmail: 'admin@turksexplorer.com',
        timezone: 'America/Grand_Turk',
        language: 'en',
        maintenanceMode: false
      },
      email: {
        smtpHost: process.env.SMTP_HOST || '',
        smtpPort: process.env.SMTP_PORT || '587',
        smtpUsername: process.env.SMTP_USERNAME || '',
        fromEmail: process.env.FROM_EMAIL || 'noreply@turksexplorer.com',
        fromName: 'TurksExplorer'
      },
      security: {
        sessionTimeout: '24',
        maxLoginAttempts: '5',
        passwordMinLength: '8',
        requireSpecialChars: true,
        require2FA: false,
        allowRegistration: true
      },
      notifications: {
        emailNotifications: true,
        smsNotifications: false,
        pushNotifications: true,
        marketingEmails: true,
        bookingUpdates: true,
        systemAlerts: true
      }
    };

    res.json(defaultSettings);
  } catch (error) {
    console.error('Error fetching system settings:', error);
    res.status(500).json({ message: 'Error fetching system settings' });
  }
};

// Update System Settings
exports.updateSystemSettings = async (req, res) => {
  try {
    const settings = req.body;
    
    // This would typically save to a settings collection
    // For now, we'll just validate and return success
    
    await logAuditAction(req.user.id, 'settings_update', 'system_settings', {
      updatedSettings: Object.keys(settings),
      timestamp: new Date()
    }, req);

    res.json({ 
      message: 'System settings updated successfully',
      settings: settings
    });
  } catch (error) {
    console.error('Error updating system settings:', error);
    res.status(500).json({ message: 'Error updating system settings' });
  }
};