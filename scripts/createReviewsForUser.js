// scripts/createReviewsForUser.js
require('dotenv').config();
const mongoose = require('mongoose');

// IMPORTANT: We must require ALL models to avoid MissingSchemaError
const Service = require('../models/Service'); 
const User = require('../models/User');
const Booking = require('../models/Booking');
const Review = require('../models/Review');

const TARGET_USER_ID = '68d9bc7d73dd36259d57ec26';

// Sample review content to cycle through
const REVIEW_SAMPLES = [
  {
    rating: 4,
    subject: "Absolutely fantastic experience!",
    description: "The service exceeded my expectations. The staff was professional and the timing was perfect. Highly recommended!"
  },
  {
    rating: 3,
    subject: "Great service, would book again",
    description: "Everything went smoothly. Good communication throughout the process. Just a minor delay at the start, but otherwise perfect."
  }
];

async function createReviews() {
  try {
    console.log('===========================================');
    console.log('Automated Review Generator');
    console.log('===========================================\n');

    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/turks-explorer');
    console.log('✓ Connected\n');

    // 1. Find the 2 completed bookings
    console.log(`Fetching completed bookings for user: ${TARGET_USER_ID}...`);
    const bookings = await Booking.find({
      customer: TARGET_USER_ID,
      status: 'completed'
    })
    .populate('service')
    .populate('vendor')
    .limit(2);

    if (bookings.length === 0) {
      console.log('❌ No "completed" bookings found. Cannot create reviews.');
      process.exit(0);
    }

    console.log(`✓ Found ${bookings.length} completed bookings. Generating reviews...\n`);

    // 2. Loop through and create reviews
    let count = 0;
    for (const booking of bookings) {
      const sample = REVIEW_SAMPLES[count % REVIEW_SAMPLES.length]; // Cycle through samples
      console.log(`Processing Booking ID: ${booking._id} (Service: ${booking.service?.name})...`);

      // A. Check for existing review (Safety check)
      const existing = await Review.findOne({ booking: booking._id });
      if (existing) {
        console.log('  ⚠ Review already exists for this booking. Skipping.');
        continue;
      }

// B. Create the Review
const newReview = await Review.create({
  user: TARGET_USER_ID,
  booking: booking._id,
  service: booking.service._id,
  serviceType: booking.serviceType || 'Transportation', // fallback
  vendor: booking.vendor._id,
  rating: sample.rating,
  subject: sample.subject,
  description: sample.description,
  images: [
    {
      url: "https://placehold.co/600x400?text=Review+Image+1",
      caption: "Amazing experience by the vendor!"
    },
    {
      url: "https://placehold.co/600x400?text=Review+Image+2",
      caption: "Captured during the service"
    }
  ],
  status: 'active',
  createdAt: new Date()
});

      console.log(`  ✓ Created ${sample.rating}-star review`);

      // C. Update Booking Status -> 'reviewed'
      booking.status = 'reviewed';
      await booking.save();
      console.log('  ✓ Updated Booking status to "reviewed"');

      // D. Update Service Statistics (Average Rating)
      // We use the static method from your Review model
      if (booking.service) {
        const stats = await Review.getAverageRating(booking.service._id);
        
        await Service.findByIdAndUpdate(booking.service._id, {
          averageRating: stats.averageRating,
          totalReviews: stats.totalReviews
        });
        console.log(`  ✓ Updated Service Stats: ${stats.averageRating}★ (${stats.totalReviews} reviews)`);
      }

      console.log('-------------------------------------------');
      count++;
    }

    console.log(`\nSUCCESS: Generated ${count} reviews.`);
    
    await mongoose.connection.close();
    process.exit(0);

  } catch (error) {
    console.error('FATAL ERROR:', error);
    if (mongoose.connection.readyState === 1) {
        await mongoose.connection.close();
    }
    process.exit(1);
  }
}

createReviews();