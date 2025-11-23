// scripts/checkUserBookings.js
require('dotenv').config();
const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const User = require('../models/User'); // Required to prevent schema errors

const TARGET_USER_ID = '68d9bc7d73dd36259d57ec26';

async function checkBookings() {
  try {
    console.log('===========================================');
    console.log('User Booking Analysis Script');
    console.log('===========================================\n');

    // 1. Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/turks-explorer');
    console.log('✓ Connected\n');

    // 2. Get Count by Status
    console.log(`Analyzing bookings for User ID: ${TARGET_USER_ID}...`);
    
    const statusCounts = await Booking.aggregate([
      { 
        $match: { 
          customer: new mongoose.Types.ObjectId(TARGET_USER_ID) 
        } 
      },
      { 
        $group: { 
          _id: '$status', 
          count: { $sum: 1 } 
        } 
      }
    ]);

    console.log('\n--- Booking Status Counts ---');
    if (statusCounts.length === 0) {
      console.log('No bookings found for this user.');
    } else {
      statusCounts.forEach(stat => {
        console.log(`• ${stat._id.padEnd(15)}: ${stat.count}`);
      });
    }

    // 3. Get Details of COMPLETED bookings (The ones eligible for review)
    console.log('\n--- Eligible "Completed" Bookings ---');
    
    const completedBookings = await Booking.find({
      customer: TARGET_USER_ID,
      status: 'completed'
    })
    .select('_id service serviceType scheduledDateTime totalAmount')
    .populate('service', 'name')
    .sort({ scheduledDateTime: -1 });

    if (completedBookings.length === 0) {
      console.log('⚠ No "completed" bookings found.'); 
      console.log('   (You cannot add reviews unless the booking status is exactly "completed")');
    } else {
      console.log(`Found ${completedBookings.length} completed bookings available to review:\n`);
      
      completedBookings.forEach((b, index) => {
        console.log(`[${index + 1}] ID: ${b._id}`);
        console.log(`    Service: ${b.service ? b.service.name : 'Unknown Service'}`);
        console.log(`    Type:    ${b.serviceType}`);
        console.log(`    Date:    ${b.scheduledDateTime}`);
        console.log('-------------------------------------------');
      });
    }

    console.log('\nDONE');
    await mongoose.connection.close();
    process.exit(0);

  } catch (error) {
    console.error('Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

checkBookings();