// scripts/migrateRevenueAnalytics.js
// Run this script once to populate RevenueAnalytics with historical booking data
//
// Usage: node scripts/migrateRevenueAnalytics.js [startDate] [endDate]
// Example: node scripts/migrateRevenueAnalytics.js 2024-01-01 2025-12-31
//
// If no dates provided, it will process all bookings

require('dotenv').config();
const mongoose = require('mongoose');
const { recalculateAnalytics } = require('../services/revenueAnalyticsService');

// Load all models to register them with mongoose
const Booking = require('../models/Booking');
const User = require('../models/User');
const Service = require('../models/Service');
const RevenueAnalytics = require('../models/RevenueAnalytics');

// Load service-specific models (they might be referenced by bookings)
try {
  require('../models/Activity');
  require('../models/Stay');
  require('../models/Dining');
  require('../models/Transportation');
  require('../models/Spa');
} catch (error) {
  // Some models might not exist, that's okay
  console.log('Note: Some service models may not be available');
}

// Parse command line arguments
const args = process.argv.slice(2);
const startDateArg = args[0];
const endDateArg = args[1];

async function migrate() {
  try {
    console.log('===========================================');
    console.log('Revenue Analytics Migration Script');
    console.log('===========================================\n');

    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/your-database', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✓ Connected to MongoDB\n');

    // Determine date range
    let startDate, endDate;
    
    if (startDateArg && endDateArg) {
      startDate = new Date(startDateArg);
      endDate = new Date(endDateArg);
      console.log(`Processing bookings from ${startDate.toDateString()} to ${endDate.toDateString()}`);
    } else {
      // Get earliest and latest booking dates
      const [earliest, latest] = await Promise.all([
        Booking.findOne().sort({ createdAt: 1 }).select('createdAt'),
        Booking.findOne().sort({ createdAt: -1 }).select('createdAt')
      ]);
      
      if (!earliest || !latest) {
        console.log('No bookings found in database. Nothing to migrate.');
        await mongoose.connection.close();
        process.exit(0);
      }
      
      startDate = earliest.createdAt;
      endDate = latest.createdAt;
      console.log(`Processing ALL bookings from ${startDate.toDateString()} to ${endDate.toDateString()}`);
    }

    // Get total bookings count for progress tracking
    const totalBookings = await Booking.countDocuments({
      createdAt: { $gte: startDate, $lte: endDate }
    });
    
    console.log(`\nFound ${totalBookings} bookings to process\n`);
    
    if (totalBookings === 0) {
      console.log('No bookings in the specified date range.');
      await mongoose.connection.close();
      process.exit(0);
    }

    // Confirm before proceeding
    console.log('This will:');
    console.log('1. Delete existing analytics in this date range');
    console.log('2. Recalculate all metrics from bookings');
    console.log('3. Generate daily, weekly, monthly, and yearly analytics\n');
    
    // For automated scripts, you might want to add a confirmation prompt here
    // For now, we'll proceed automatically
    
    console.log('Starting recalculation...\n');
    const startTime = Date.now();
    
    // Run the recalculation
    const result = await recalculateAnalytics(startDate, endDate);
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('\n===========================================');
    console.log('Migration Complete!');
    console.log('===========================================');
    console.log(`✓ Processed ${result.bookingsProcessed} bookings`);
    console.log(`✓ Time taken: ${duration} seconds`);
    console.log('✓ Analytics are now ready to use\n');
    
    // Verify the data
    const RevenueAnalytics = require('../models/RevenueAnalytics');
    const analyticsCount = await RevenueAnalytics.countDocuments({
      date: { $gte: startDate, $lte: endDate }
    });
    
    console.log(`Created ${analyticsCount} analytics records across all periods\n`);
    
    // Close connection
    await mongoose.connection.close();
    console.log('Database connection closed');
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  console.log('\n\nMigration interrupted by user');
  await mongoose.connection.close();
  process.exit(1);
});

// Run migration
migrate();