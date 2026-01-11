#!/usr/bin/env node

/**
 * REFERRAL PARTNER TEST SCRIPT
 * 
 * Tests the actual referral routes and controller
 * Uses referralController.verifyReferralCode
 * 
 * Run from project root: node test-referral.js
 */

const mongoose = require('mongoose');
const axios = require('axios');
require('dotenv').config();

// Import ReferralPartner model
const ReferralPartner = require('../models/ReferralPartner');

// ============================================================
// CONFIGURATION
// ============================================================

const CONFIG = {
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/TurksExplorer',
  backendUrl: 'http://localhost:5000',
  testCode: 'TAXI12345'
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function print(symbol, message) {
  console.log(`${symbol} ${message}`);
}

function header(title) {
  console.log('\n' + '━'.repeat(70));
  console.log('  ' + title);
  console.log('━'.repeat(70) + '\n');
}

// ============================================================
// STEP 1: CLEANUP OLD DATA
// ============================================================

async function cleanupOldData() {
  header('STEP 1: CLEANUP OLD TEST DATA');
  
  try {
    const existing = await ReferralPartner.findOne({ referralCode: CONFIG.testCode });
    
    if (existing) {
      print('🧹', `Found old test partner, deleting...`);
      await ReferralPartner.deleteOne({ referralCode: CONFIG.testCode });
      print('✅', `Old data deleted: ${existing._id}`);
      return true;
    } else {
      print('ℹ️', 'No old test data found');
      return false;
    }
  } catch (error) {
    print('❌', `Cleanup failed: ${error.message}`);
    throw error;
  }
}

// ============================================================
// STEP 2: CREATE REFERRAL PARTNER
// ============================================================

async function createReferralPartner() {
  header('STEP 2: CREATE REFERRAL PARTNER');
  
  try {
    console.log('📝 Creating new test referral partner...\n');
    
    // Create new partner with APPROVED status
    const testPartner = new ReferralPartner({
      name: 'Test Taxi Referral Partner',
      email: `taxi-referral-${Date.now()}@test.com`,
      phoneNumber: '+1-649-9876543',
      referralCode: CONFIG.testCode,
      partnerType: 'taxi-driver',
      businessName: 'Test Taxi Company',
      businessLocation: 'Providenciales',
      commissionPercentage: 5,
      status: 'approved',  // ✅ APPROVED
      isActive: true,      // ✅ ACTIVE
      payoutMethod: 'stripe_connect',
      adminNotes: 'Test partner for referral code testing'
    });
    
    await testPartner.save();
    
    print('✅', 'Partner created in database');
    console.log(`   ID: ${testPartner._id}`);
    console.log(`   Name: ${testPartner.name}`);
    console.log(`   Email: ${testPartner.email}`);
    console.log(`   Code: ${testPartner.referralCode}`);
    console.log(`   Status: ${testPartner.status}`);
    console.log(`   Active: ${testPartner.isActive}`);
    
    return testPartner;
    
  } catch (error) {
    print('❌', `Failed: ${error.message}`);
    throw error;
  }
}

// ============================================================
// STEP 3: TEST BACKEND ENDPOINT
// ============================================================

async function testEndpoint() {
  header('STEP 3: TEST BACKEND ENDPOINT');
  
  try {
    const url = `${CONFIG.backendUrl}/api/referral/verify-code/${CONFIG.testCode}`;
    console.log(`🔗 Testing: GET ${url}\n`);
    
    const response = await axios.get(url, { 
      timeout: 5000 
    });
    
    console.log(`📊 Response from backend:\n${JSON.stringify(response.data, null, 2)}\n`);
    
    if (response.data.valid === true) {
      print('✅', 'Endpoint works! Code is valid');
      console.log(`   Success: ${response.data.success}`);
      console.log(`   Valid: ${response.data.valid}`);
      if (response.data.data) {
        console.log(`   Commission %: ${response.data.data.commissionPercentage}`);
      }
      return true;
    } else {
      print('❌', 'Code not found');
      console.log(`   Success: ${response.data.success}`);
      console.log(`   Valid: ${response.data.valid}`);
      console.log(`   Message: ${response.data.message}`);
      return false;
    }
    
  } catch (error) {
    if (error.response?.status === 404) {
      print('❌', 'Endpoint not found (404)');
      console.log('\n   Make sure referralRoutes is registered in server.js');
      console.log('   Check: app.use("/api/referral", require("./routes/referralRoutes"));\n');
      return false;
    } else if (error.message.includes('ECONNREFUSED')) {
      print('❌', 'Backend not running on port 5000');
      console.log('   Start backend: npm start\n');
      return false;
    } else {
      print('❌', `Failed: ${error.message}`);
      return false;
    }
  }
}

// ============================================================
// STEP 4: TEST INVALID CODE
// ============================================================

async function testInvalidCode() {
  header('STEP 4: TEST INVALID CODE');
  
  try {
    const url = `${CONFIG.backendUrl}/api/referral/verify-code/BADCODE123`;
    console.log(`🔗 Testing: GET ${url}\n`);
    
    const response = await axios.get(url, { 
      timeout: 5000 
    });
    
    if (response.data.valid === false) {
      print('✅', 'Invalid code correctly rejected');
      console.log(`   Valid: ${response.data.valid}`);
      console.log(`   Message: ${response.data.message}`);
      return true;
    } else {
      print('❌', 'Invalid code was accepted (should be rejected)');
      return false;
    }
    
  } catch (error) {
    print('❌', `Failed: ${error.message}`);
    return false;
  }
}

// ============================================================
// STEP 5: VERIFY IN DATABASE
// ============================================================

async function verifyInDatabase() {
  header('STEP 5: VERIFY IN DATABASE');
  
  try {
    console.log(`🔍 Searching for referral code: ${CONFIG.testCode}\n`);
    
    const partner = await ReferralPartner.findOne({ referralCode: CONFIG.testCode });
    
    if (partner) {
      print('✅', 'Partner found in database');
      console.log(`\n📋 Partner Details:`);
      console.log(`   ID: ${partner._id}`);
      console.log(`   Name: ${partner.name}`);
      console.log(`   Email: ${partner.email}`);
      console.log(`   Code: ${partner.referralCode}`);
      console.log(`   Type: ${partner.partnerType}`);
      console.log(`   Status: ${partner.status}`);
      console.log(`   Active: ${partner.isActive}`);
      console.log(`   Commission: ${partner.commissionPercentage}%`);
      return true;
    } else {
      print('❌', 'Partner not found in database');
      return false;
    }
    
  } catch (error) {
    print('❌', `Failed: ${error.message}`);
    return false;
  }
}

// ============================================================
// STEP 6: CHECKOUT TESTING INSTRUCTIONS
// ============================================================

function printCheckoutInstructions() {
  header('STEP 6: TEST IN CHECKOUT PAGE');
  
  console.log('Your test referral code is ready! Now test it manually:\n');
  
  console.log('1️⃣  Go to Checkout:');
  console.log('   URL: http://localhost:3000/checkout\n');
  
  console.log('2️⃣  Find "Have a Referral Code?" section\n');
  
  console.log('3️⃣  Enter code:');
  console.log(`   ${CONFIG.testCode}`);
  console.log('   Click: APPLY\n');
  
  console.log('4️⃣  Expected result:');
  console.log('   ✓ Code applied! You save $2.50');
  console.log('   Price updates with discount\n');
  
  console.log('5️⃣  Test invalid code:');
  console.log('   Enter: BADCODE123');
  console.log('   Expected: ❌ Referral code not found\n');
}

// ============================================================
// CLEANUP FUNCTION
// ============================================================

async function cleanup() {
  try {
    const result = await ReferralPartner.deleteOne({ referralCode: CONFIG.testCode });
    if (result.deletedCount > 0) {
      print('✅', `Deleted test partner with code: ${CONFIG.testCode}`);
    } else {
      print('ℹ️', 'No test partner found to delete');
    }
  } catch (error) {
    print('❌', `Cleanup failed: ${error.message}`);
  }
}

// ============================================================
// MAIN EXECUTION
// ============================================================

async function main() {
  let connection = null;
  
  try {
    console.log('\n' + '╔' + '═'.repeat(68) + '╗');
    console.log('║' + ' '.repeat(12) + 'REFERRAL PARTNER TEST SCRIPT' + ' '.repeat(28) + '║');
    console.log('╚' + '═'.repeat(68) + '╝');
    
    // Handle cleanup
    if (process.argv.includes('cleanup')) {
      header('CLEANUP');
      await mongoose.connect(CONFIG.mongoUri);
      await cleanup();
      await mongoose.disconnect();
      process.exit(0);
    }
    
    // Connect to MongoDB
    console.log('\n🔌 Connecting to MongoDB...\n');
    
    await mongoose.connect(CONFIG.mongoUri, {
      serverSelectionTimeoutMS: 5000
    });
    connection = mongoose.connection;
    
    print('✅', 'Connected to MongoDB\n');
    
    // Run all tests
    await cleanupOldData();
    await createReferralPartner();
    const endpointWorks = await testEndpoint();
    const invalidCodeWorks = await testInvalidCode();
    await verifyInDatabase();
    
    // Print checkout instructions
    printCheckoutInstructions();
    
    // Print summary
    header('SUMMARY');
    
    console.log('✅ TEST RESULTS:\n');
    console.log(`  ${endpointWorks ? '✓' : '✗'} Backend endpoint working`);
    console.log(`  ${invalidCodeWorks ? '✓' : '✗'} Invalid codes rejected`);
    console.log(`  ✓ Partner created in database`);
    console.log(`  ✓ Partner is APPROVED and ACTIVE`);
    
    console.log(`\n📊 TEST CODE READY:\n`);
    console.log(`  Code: ${CONFIG.testCode}`);
    console.log(`  Discount: 2.5%`);
    console.log(`  Commission: 5%`);
    
    console.log('\n🧹 CLEANUP');
    console.log('  Remove test partner:\n');
    console.log('  node test-referral.js cleanup\n');
    
    console.log('━'.repeat(70));
    console.log('🚀 Ready to test! Enter code in checkout: ' + CONFIG.testCode);
    console.log('━'.repeat(70) + '\n');
    
  } catch (error) {
    print('❌', `Test failed: ${error.message}`);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n❌ MongoDB Connection Error!');
      console.log('Troubleshooting:');
      console.log('  1. Is MongoDB running?');
      console.log('  2. Check MONGODB_URI in .env');
      console.log('  3. Default: mongodb://localhost:27017/turks-caicos\n');
    }
    
    if (error.message.includes('Schema')) {
      console.log('\n❌ Model Import Error!');
      console.log('Troubleshooting:');
      console.log('  1. Run from project root');
      console.log('  2. Check path: ../models/ReferralPartner');
      console.log('  3. Verify models folder exists\n');
    }
    
    process.exit(1);
    
  } finally {
    if (connection) {
      await mongoose.disconnect();
    }
  }
}

// ============================================================
// RUN
// ============================================================

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});