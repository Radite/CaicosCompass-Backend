// middleware/reviewMiddleware.js
const Review = require('../models/Review');
const Booking = require('../models/Booking');

// Middleware to validate review ownership
exports.validateReviewOwnership = async (req, res, next) => {
  try {
    const reviewId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;

    const review = await Review.findById(reviewId);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Allow review owner or admin
    if (review.user.toString() !== userId && userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this review'
      });
    }

    req.review = review;
    next();
  } catch (error) {
    console.error('Error validating review ownership:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error validating review access'
    });
  }
};

// Middleware to check if user can still edit review (within time window)
exports.validateEditWindow = (req, res, next) => {
  const review = req.review;
  const now = new Date();
  const reviewCreated = new Date(review.createdAt);
  const editWindow = 48 * 60 * 60 * 1000; // 48 hours in milliseconds

  if (now - reviewCreated > editWindow) {
    return res.status(400).json({
      success: false,
      message: 'Review can no longer be edited. Reviews can only be edited within 48 hours of creation.',
      editDeadline: new Date(reviewCreated.getTime() + editWindow)
    });
  }

  next();
};

// Middleware to validate host/admin permissions for replies
exports.validateReplyPermissions = (req, res, next) => {
  const userRole = req.user.role;

  if (!['host', 'admin'].includes(userRole)) {
    return res.status(403).json({
      success: false,
      message: 'Only hosts and admins can reply to reviews'
    });
  }

  next();
};

// utils/reviewNotifications.js
const Notification = require('../models/Notification');

// Send notification when review is created
exports.notifyReviewCreated = async (review, booking) => {
  try {
    // Notify service provider/host if they exist
    let serviceProvider;
    
    switch (booking.category) {
      case 'activity':
        const Activity = require('../models/Activity');
        const activity = await Activity.findById(booking.activity).populate('vendor');
        serviceProvider = activity?.vendor;
        break;
      case 'stay':
        const Stay = require('../models/Stay');
        const stay = await Stay.findById(booking.stay).populate('vendor');
        serviceProvider = stay?.vendor;
        break;
      // Add other service types as needed
    }

    if (serviceProvider) {
      await Notification.create({
        user: serviceProvider._id,
        type: 'review',
        title: 'New Review Received',
        message: `You received a ${review.stars}-star review for your service.`,
        relatedId: review._id,
        relatedType: 'review'
      });
    }
  } catch (error) {
    console.error('Error sending review notification:', error);
  }
};

// Send notification reminders for pending reviews
exports.notifyReviewReminder = async (userId, booking, daysLeft) => {
  try {
    let serviceName = 'your booking';
    
    switch (booking.category) {
      case 'activity':
        const Activity = require('../models/Activity');
        const activity = await Activity.findById(booking.activity);
        serviceName = activity?.name || 'activity';
        break;
      case 'stay':
        const Stay = require('../models/Stay');
        const stay = await Stay.findById(booking.stay);
        serviceName = stay?.name || 'accommodation';
        break;
      // Add other service types
    }

    await Notification.create({
      user: userId,
      type: 'review_reminder',
      title: 'Review Reminder',
      message: `You have ${daysLeft} day(s) left to review your experience at ${serviceName}.`,
      relatedId: booking._id,
      relatedType: 'booking'
    });
  } catch (error) {
    console.error('Error sending review reminder:', error);
  }
};

// Cron job function to send review reminders
exports.sendReviewReminders = async () => {
  try {
    const Review = require('../models/Review');
    const Booking = require('../models/Booking');
    
    // Find bookings that completed 1, 3, and 7 days ago
    const reminderDays = [1, 3, 7];
    
    for (const days of reminderDays) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - days);
      targetDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(targetDate);
      endDate.setHours(23, 59, 59, 999);
      
      // Find completed bookings from that day
      const completedBookings = await Booking.find({
        status: 'confirmed',
        $or: [
          { 
            category: { $in: ['activity', 'transportation', 'dining', 'spa'] },
            date: { $gte: targetDate, $lte: endDate }
          },
          {
            category: 'stay',
            endDate: { $gte: targetDate, $lte: endDate }
          }
        ]
      });
      
      for (const booking of completedBookings) {
        // Check if already reviewed
        const existingReview = await Review.findOne({
          user: booking.user,
          booking: booking._id
        });
        
        if (!existingReview && booking.user) {
          const daysLeft = 14 - days;
          await exports.notifyReviewReminder(booking.user, booking, daysLeft);
        }
      }
    }
    
    console.log('Review reminders sent successfully');
  } catch (error) {
    console.error('Error sending review reminders:', error);
  }
};

// Schedule the cron job (run daily at 9 AM)
const cron = require('node-cron');

// Run review reminders daily at 9:00 AM
cron.schedule('0 9 * * *', () => {
  console.log('Running review reminder job...');
  exports.sendReviewReminders();
});

module.exports = {
  validateReviewOwnership: exports.validateReviewOwnership,
  validateEditWindow: exports.validateEditWindow,
  validateReplyPermissions: exports.validateReplyPermissions,
  notifyReviewCreated: exports.notifyReviewCreated,
  notifyReviewReminder: exports.notifyReviewReminder,
  sendReviewReminders: exports.sendReviewReminders
};