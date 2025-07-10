// scripts/migrate.js - Database migration script
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

const createIndexes = async () => {
  try {
    console.log('📊 Creating database indexes...');
    
    const db = mongoose.connection.db;
    
    // Users indexes
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    await db.collection('users').createIndex({ username: 1 }, { unique: true });
    await db.collection('users').createIndex({ role: 1 });
    await db.collection('users').createIndex({ isVerified: 1 });
    await db.collection('users').createIndex({ createdAt: -1 });
    
    // Bookings indexes
    await db.collection('bookings').createIndex({ user: 1 });
    await db.collection('bookings').createIndex({ status: 1 });
    await db.collection('bookings').createIndex({ category: 1 });
    await db.collection('bookings').createIndex({ date: 1 });
    await db.collection('bookings').createIndex({ createdAt: -1 });
    await db.collection('bookings').createIndex({ 'paymentDetails.stripePaymentIntentId': 1 });
    
    // Activities indexes
    await db.collection('activities').createIndex({ island: 1 });
    await db.collection('activities').createIndex({ category: 1 });
    await db.collection('activities').createIndex({ price: 1 });
    await db.collection('activities').createIndex({ host: 1 });
    await db.collection('activities').createIndex({ location: 1 });
    
    // Stays indexes
    await db.collection('stays').createIndex({ island: 1 });
    await db.collection('stays').createIndex({ type: 1 });
    await db.collection('stays').createIndex({ pricePerNight: 1 });
    await db.collection('stays').createIndex({ host: 1 });
    await db.collection('stays').createIndex({ location: 1 });
    
    // Dining indexes
    await db.collection('dinings').createIndex({ island: 1 });
    await db.collection('dinings').createIndex({ cuisineType: 1 });
    await db.collection('dinings').createIndex({ priceRange: 1 });
    await db.collection('dinings').createIndex({ host: 1 });
    await db.collection('dinings').createIndex({ location: 1 });
    
    // Transportation indexes
    await db.collection('transportations').createIndex({ category: 1 });
    await db.collection('transportations').createIndex({ island: 1 });
    await db.collection('transportations').createIndex({ pricingModel: 1 });
    await db.collection('transportations').createIndex({ host: 1 });
    
    // Text search indexes
    await db.collection('activities').createIndex({ 
      name: 'text', 
      description: 'text', 
      location: 'text' 
    });
    await db.collection('stays').createIndex({ 
      name: 'text', 
      description: 'text', 
      location: 'text' 
    });
    await db.collection('dinings').createIndex({ 
      name: 'text', 
      description: 'text', 
      location: 'text' 
    });
    
    console.log('✅ Database indexes created successfully');
  } catch (error) {
    console.error('❌ Error creating indexes:', error);
    throw error;
  }
};

const runMigrations = async () => {
  try {
    console.log('🔄 Running database migrations...');
    
    await connectDB();
    await createIndexes();
    
    console.log('🎉 Database migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database migration failed:', error);
    process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  runMigrations();
}

module.exports = { runMigrations, createIndexes };