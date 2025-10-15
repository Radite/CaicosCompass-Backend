// middleware/analyticsHooks.js
const { updateRevenueAnalytics } = require('../services/revenueAnalyticsService');

/**
 * Middleware to update analytics after a booking is created
 * Add this after successful booking creation
 */
const afterBookingCreate = async (booking) => {
  try {
    // Update revenue analytics asynchronously (non-blocking)
    setImmediate(async () => {
      try {
        await updateRevenueAnalytics(booking, 'create');
      } catch (error) {
        console.error('Error in afterBookingCreate analytics hook:', error);
      }
    });
  } catch (error) {
    console.error('Error setting up afterBookingCreate hook:', error);
  }
};

/**
 * Middleware to update analytics after a booking is updated
 * Add this after successful booking update
 */
const afterBookingUpdate = async (oldBooking, newBooking) => {
  try {
    // Update revenue analytics asynchronously (non-blocking)
    setImmediate(async () => {
      try {
        await updateRevenueAnalytics(newBooking, 'update', oldBooking);
      } catch (error) {
        console.error('Error in afterBookingUpdate analytics hook:', error);
      }
    });
  } catch (error) {
    console.error('Error setting up afterBookingUpdate hook:', error);
  }
};

/**
 * Middleware to update analytics after a booking is deleted
 * Add this after successful booking deletion
 */
const afterBookingDelete = async (booking) => {
  try {
    // Update revenue analytics asynchronously (non-blocking)
    setImmediate(async () => {
      try {
        await updateRevenueAnalytics(booking, 'delete');
      } catch (error) {
        console.error('Error in afterBookingDelete analytics hook:', error);
      }
    });
  } catch (error) {
    console.error('Error setting up afterBookingDelete hook:', error);
  }
};

/**
 * Middleware to update analytics when booking status changes
 * This is important because status changes affect revenue calculations
 */
const afterBookingStatusChange = async (oldBooking, newBooking) => {
  try {
    // Only trigger if status actually changed
    if (oldBooking.status !== newBooking.status) {
      setImmediate(async () => {
        try {
          await updateRevenueAnalytics(newBooking, 'update', oldBooking);
        } catch (error) {
          console.error('Error in afterBookingStatusChange analytics hook:', error);
        }
      });
    }
  } catch (error) {
    console.error('Error setting up afterBookingStatusChange hook:', error);
  }
};

module.exports = {
  afterBookingCreate,
  afterBookingUpdate,
  afterBookingDelete,
  afterBookingStatusChange
};
