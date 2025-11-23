// scripts/setupReviewSystem.js
/**
 * Migration Script for Review System Setup
 * 
 * This script:
 * 1. Adds averageRating and totalReviews fields to all services
 * 2. Migrates any existing reviews from Service.reviews to Review collection
 * 3. Calculates initial rating statistics
 * 
 * Usage: node scripts/setupReviewSystem.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Service = require('../models/Service');
const Review = require('../models/Review');
const Booking = require('../models/Booking');
const User = require('../models/User');

async function setupReviewSystem() {
  try {
    console.log('===========================================');
    console.log('Review System Setup & Migration Script');
    console.log('===========================================\n');

    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/turks-explorer', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✓ Connected to MongoDB\n');

    // STEP 1: Add review fields to all services
    console.log('STEP 1: Adding review fields to services...');
    
    // Use updateMany to bypass validation and directly add fields
    const result = await Service.updateMany(
      {
        $or: [
          { averageRating: { $exists: false } },
          { totalReviews: { $exists: false } }
        ]
      },
      {
        $set: {
          averageRating: 0,
          totalReviews: 0
        }
      }
    );
    
    console.log(`✓ Updated ${result.modifiedCount} services with review fields\n`);

    // STEP 2: Migrate existing reviews from Service.reviews array
    console.log('STEP 2: Migrating existing reviews...');
    const servicesWithOldReviews = await Service.find({
      'reviews.0': { $exists: true }
    }).select('_id name reviews vendor serviceType');

    let migratedReviewsCount = 0;
    let skippedReviewsCount = 0;

    for (const service of servicesWithOldReviews) {
      console.log(`\n  Processing service: ${service.name}`);
      
      for (const oldReview of service.reviews) {
        try {
          // Check if this review was already migrated
          const existingReview = await Review.findOne({
            user: oldReview.user,
            service: service._id
          });

          if (existingReview) {
            console.log(`    - Skipping duplicate review from user ${oldReview.user}`);
            skippedReviewsCount++;
            continue;
          }

          // Find a completed booking for this user and service
          let booking = await Booking.findOne({
            customer: oldReview.user,
            service: service._id,
            status: 'completed'
          });

          if (!booking) {
            // Try to find ANY booking (even if not completed) for migration purposes
            booking = await Booking.findOne({
              customer: oldReview.user,
              service: service._id
            });

            if (!booking) {
              console.log(`    - No booking found for user ${oldReview.user}, skipping`);
              skippedReviewsCount++;
              continue;
            }

            console.log(`    - Using non-completed booking for migration`);
          }

          // Create new review
          const reviewData = {
            user: oldReview.user,
            booking: booking._id,
            service: service._id,
            serviceType: service.serviceType || 'Activity',
            vendor: service.vendor,
            rating: oldReview.rating,
            status: 'active',
            createdAt: oldReview.createdAt || new Date()
          };

          // Add description if comment exists
          if (oldReview.comment) {
            reviewData.description = oldReview.comment;
          }

          await Review.create(reviewData);

          console.log(`    ✓ Migrated review (Rating: ${oldReview.rating})`);
          migratedReviewsCount++;

        } catch (error) {
          console.error(`    ✗ Error migrating review: ${error.message}`);
          skippedReviewsCount++;
        }
      }
    }

    console.log(`\n✓ Migration complete:`);
    console.log(`  - Migrated: ${migratedReviewsCount} reviews`);
    console.log(`  - Skipped: ${skippedReviewsCount} reviews\n`);

    // STEP 3: Calculate rating statistics for all services
    console.log('STEP 3: Calculating rating statistics...');
    const allServices = await Service.find({}).select('_id name');
    let servicesWithReviews = 0;

    for (const service of allServices) {
      try {
        const stats = await Review.getAverageRating(service._id);
        
        // Use updateOne to bypass validation
        await Service.updateOne(
          { _id: service._id },
          {
            $set: {
              averageRating: stats.averageRating,
              totalReviews: stats.totalReviews
            }
          }
        );

        if (stats.totalReviews > 0) {
          servicesWithReviews++;
          console.log(`  ✓ ${service.name}: ${stats.averageRating}★ (${stats.totalReviews} reviews)`);
        }
      } catch (error) {
        console.error(`  ✗ Error calculating stats for ${service.name}: ${error.message}`);
      }
    }

    console.log(`\n✓ Updated ${servicesWithReviews} services with rating statistics\n`);

    // STEP 4: Display summary
    console.log('===========================================');
    console.log('SUMMARY');
    console.log('===========================================');
    
    const totalServices = await Service.countDocuments();
    const totalReviews = await Review.countDocuments({ status: 'active' });
    const avgRatingAcrossAll = await Service.aggregate([
      { $match: { totalReviews: { $gt: 0 } } },
      { $group: { _id: null, avgRating: { $avg: '$averageRating' } } }
    ]);

    console.log(`Total Services: ${totalServices}`);
    console.log(`Total Reviews: ${totalReviews}`);
    console.log(`Services with Reviews: ${servicesWithReviews}`);
    console.log(`Average Rating (Platform-wide): ${avgRatingAcrossAll.length > 0 ? avgRatingAcrossAll[0].avgRating.toFixed(2) : 'N/A'}★`);
    console.log('\n✓ Review system setup complete!\n');

    // STEP 5: Verification
    console.log('===========================================');
    console.log('VERIFICATION');
    console.log('===========================================\n');

    // Check for any duplicate reviews
    const duplicateCheck = await Review.aggregate([
      {
        $group: {
          _id: { user: '$user', service: '$service' },
          count: { $sum: 1 }
        }
      },
      { $match: { count: { $gt: 1 } } }
    ]);

    if (duplicateCheck.length > 0) {
      console.log('⚠ WARNING: Found duplicate reviews:');
      duplicateCheck.forEach(dup => {
        console.log(`  User ${dup._id.user} has ${dup.count} reviews for service ${dup._id.service}`);
      });
      console.log('\nPlease clean up duplicates manually.\n');
    } else {
      console.log('✓ No duplicate reviews found\n');
    }

    // Check for reviews without completed bookings
    const reviewsWithoutCompletedBookings = await Review.aggregate([
      {
        $lookup: {
          from: 'bookings',
          localField: 'booking',
          foreignField: '_id',
          as: 'bookingData'
        }
      },
      {
        $match: {
          $or: [
            { bookingData: { $size: 0 } },
            { 'bookingData.status': { $ne: 'completed' } }
          ]
        }
      }
    ]);

    if (reviewsWithoutCompletedBookings.length > 0) {
      console.log('⚠ WARNING: Found reviews without completed bookings:');
      console.log(`  Count: ${reviewsWithoutCompletedBookings.length}`);
      console.log('  These reviews may need manual review.\n');
    } else {
      console.log('✓ All reviews have valid completed bookings\n');
    }

    console.log('===========================================\n');
    console.log('Next Steps:');
    console.log('1. Update server.js to include review routes');
    console.log('   Add: app.use(\'/api/reviews\', require(\'./routes/reviewRoutes\'));');
    console.log('2. Test API endpoints with Postman');
    console.log('3. Integrate review components in frontend');
    console.log('4. Monitor for any issues\n');

    await mongoose.connection.close();
    console.log('Database connection closed.');
    process.exit(0);

  } catch (error) {
    console.error('Error during setup:', error);
    console.error('\nStack trace:', error.stack);
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
    process.exit(1);
  }
}

// Run the setup
setupReviewSystem();