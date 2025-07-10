// scripts/seedDatabase.js - Database seeding script
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

// Load environment variables
dotenv.config();

// Import models
const User = require('../models/User');
const Activity = require('../models/Activity');
const Stay = require('../models/Stay');
const Dining = require('../models/Dining');
const Transportation = require('../models/Transportation');

// Connect to MongoDB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

// Sample data
const sampleUsers = [
  {
    name: 'Admin User',
    username: 'admin',
    email: 'admin@turksexplorer.com',
    password: 'admin123',
    role: 'admin',
    isVerified: true
  },
  {
    name: 'Business Manager',
    username: 'manager',
    email: 'manager@turksexplorer.com',
    password: 'manager123',
    role: 'business-manager',
    isVerified: true
  },
  {
    name: 'John Smith',
    username: 'johnsmith',
    email: 'john@example.com',
    password: 'password123',
    role: 'user',
    isVerified: true,
    travelPreferences: {
      style: ['luxury'],
      preferredDestinations: ['Providenciales'],
      activities: ['watersports', 'snorkeling', 'diving']
    }
  }
];

const sampleActivities = [
  {
    name: 'Conch Bar Caves Exploration',
    description: 'Explore the magnificent limestone caves on Middle Caicos with experienced guides.',
    location: 'Conch Bar, Middle Caicos',
    island: 'Middle Caicos',
    price: 85,
    discountedPrice: 75,
    pricingType: 'per-person',
    category: 'adventure',
    duration: '3 hours',
    maxPeople: 12,
    images: [
      { url: 'https://example.com/conch-caves-1.jpg', isMain: true },
      { url: 'https://example.com/conch-caves-2.jpg' }
    ],
    availability: [
      {
        day: 'Monday',
        timeSlots: [
          { startTime: '09:00', endTime: '12:00', maxPeople: 12 },
          { startTime: '14:00', endTime: '17:00', maxPeople: 12 }
        ]
      },
      {
        day: 'Wednesday',
        timeSlots: [
          { startTime: '09:00', endTime: '12:00', maxPeople: 12 },
          { startTime: '14:00', endTime: '17:00', maxPeople: 12 }
        ]
      },
      {
        day: 'Friday',
        timeSlots: [
          { startTime: '09:00', endTime: '12:00', maxPeople: 12 },
          { startTime: '14:00', endTime: '17:00', maxPeople: 12 }
        ]
      }
    ],
    included: ['Professional guide', 'Safety equipment', 'Bottled water'],
    notIncluded: ['Transportation', 'Lunch', 'Gratuities'],
    requirements: ['Comfortable walking shoes', 'Light clothing', 'Camera'],
    cancellationPolicy: 'Full refund if cancelled 24 hours before the activity'
  },
  {
    name: 'Grace Bay Snorkeling Adventure',
    description: 'Discover the underwater beauty of Grace Bay with colorful coral reefs and tropical fish.',
    location: 'Grace Bay Beach, Providenciales',
    island: 'Providenciales',
    price: 120,
    discountedPrice: 100,
    pricingType: 'per-person',
    category: 'watersports',
    duration: '4 hours',
    maxPeople: 8,
    images: [
      { url: 'https://example.com/snorkeling-1.jpg', isMain: true },
      { url: 'https://example.com/snorkeling-2.jpg' }
    ],
    availability: [
      {
        day: 'Daily',
        timeSlots: [
          { startTime: '08:00', endTime: '12:00', maxPeople: 8 },
          { startTime: '13:00', endTime: '17:00', maxPeople: 8 }
        ]
      }
    ],
    included: ['Snorkeling equipment', 'Professional guide', 'Refreshments'],
    notIncluded: ['Hotel pickup', 'Lunch', 'Underwater camera'],
    requirements: ['Swimming ability', 'Sunscreen', 'Swimwear'],
    cancellationPolicy: 'Full refund if cancelled 48 hours before the activity'
  },
  {
    name: 'Sunset Sailing Cruise',
    description: 'Enjoy a romantic sunset cruise around the beautiful waters of Turks and Caicos.',
    location: 'Turtle Cove Marina, Providenciales',
    island: 'Providenciales',
    price: 200,
    pricingType: 'per-person',
    category: 'sailing',
    duration: '3 hours',
    maxPeople: 20,
    images: [
      { url: 'https://example.com/sunset-sailing-1.jpg', isMain: true }
    ],
    availability: [
      {
        day: 'Daily',
        timeSlots: [
          { startTime: '17:00', endTime: '20:00', maxPeople: 20 }
        ]
      }
    ],
    included: ['Open bar', 'Light appetizers', 'Professional crew'],
    notIncluded: ['Hotel transportation', 'Gratuities'],
    requirements: ['Comfortable clothing', 'Light jacket for evening'],
    cancellationPolicy: 'Full refund if cancelled 24 hours before departure'
  }
];

const sampleStays = [
  {
    name: 'Grace Bay Luxury Resort',
    description: 'Luxury beachfront resort offering world-class amenities and stunning ocean views.',
    location: 'Grace Bay Beach, Providenciales',
    island: 'Providenciales',
    type: 'resort',
    starRating: 5,
    pricePerNight: 450,
    discountedPrice: 399,
    images: [
      { url: 'https://example.com/resort-1.jpg', isMain: true },
      { url: 'https://example.com/resort-2.jpg' }
    ],
    amenities: ['Free Wi-Fi', 'Pool', 'Spa', 'Restaurant', 'Beach access', 'Fitness center'],
    rooms: [
      {
        title: 'Ocean View Suite',
        description: 'Spacious suite with panoramic ocean views',
        pricePerNight: 450,
        maxGuests: 4,
        beds: 1,
        bathrooms: 2,
        size: 650,
        amenities: ['Ocean view', 'Balcony', 'Mini bar', 'Room service']
      },
      {
        title: 'Beachfront Villa',
        description: 'Private villa with direct beach access',
        pricePerNight: 750,
        maxGuests: 6,
        beds: 3,
        bathrooms: 3,
        size: 1200,
        amenities: ['Beach access', 'Private pool', 'Kitchen', 'Butler service']
      }
    ],
    policies: {
      checkIn: '15:00',
      checkOut: '11:00',
      cancellation: 'Free cancellation up to 48 hours before check-in',
      children: 'Children of all ages welcome',
      pets: 'Pets not allowed'
    }
  },
  {
    name: 'Conch Bar Beach Resort',
    description: 'Intimate boutique resort on the pristine beaches of Middle Caicos.',
    location: 'Conch Bar Beach, Middle Caicos',
    island: 'Middle Caicos',
    type: 'boutique',
    starRating: 4,
    pricePerNight: 280,
    discountedPrice: 250,
    images: [
      { url: 'https://example.com/conch-resort-1.jpg', isMain: true }
    ],
    amenities: ['Free Wi-Fi', 'Restaurant', 'Beach access', 'Kayak rental'],
    rooms: [
      {
        title: 'Garden View Room',
        description: 'Comfortable room with tropical garden views',
        pricePerNight: 280,
        maxGuests: 2,
        beds: 1,
        bathrooms: 1,
        size: 400,
        amenities: ['Garden view', 'Air conditioning', 'Mini fridge']
      }
    ],
    policies: {
      checkIn: '14:00',
      checkOut: '12:00',
      cancellation: 'Free cancellation up to 24 hours before check-in',
      children: 'Children over 12 welcome',
      pets: 'Pets not allowed'
    }
  }
];

const sampleDining = [
  {
    name: 'Conch Café',
    description: 'Fresh seafood and local Caribbean cuisine with ocean views.',
    location: 'Grace Bay Road, Providenciales',
    island: 'Providenciales',
    cuisineType: 'Caribbean',
    priceRange: 'mid-range',
    averagePrice: 35,
    images: [
      { url: 'https://example.com/conch-cafe-1.jpg', isMain: true }
    ],
    features: ['Ocean view', 'Fresh seafood', 'Local ingredients', 'Outdoor seating'],
    operatingHours: {
      monday: { open: '11:00', close: '22:00' },
      tuesday: { open: '11:00', close: '22:00' },
      wednesday: { open: '11:00', close: '22:00' },
      thursday: { open: '11:00', close: '22:00' },
      friday: { open: '11:00', close: '23:00' },
      saturday: { open: '11:00', close: '23:00' },
      sunday: { open: '11:00', close: '22:00' }
    },
    popularDishes: [
      { name: 'Conch Fritters', price: 12, description: 'Traditional island appetizer' },
      { name: 'Grilled Snapper', price: 28, description: 'Fresh local fish with island spices' },
      { name: 'Coconut Shrimp', price: 24, description: 'Crispy shrimp with coconut coating' }
    ],
    reservationRequired: true,
    contactInfo: {
      phone: '+1-649-946-5278',
      email: 'info@conchcafe.tc'
    }
  },
  {
    name: 'Bamboo Bar & Grill',
    description: 'Casual beachfront dining with grilled specialties and tropical cocktails.',
    location: 'Grace Bay Beach, Providenciales',
    island: 'Providenciales',
    cuisineType: 'American',
    priceRange: 'casual',
    averagePrice: 25,
    images: [
      { url: 'https://example.com/bamboo-bar-1.jpg', isMain: true }
    ],
    features: ['Beachfront', 'Live music', 'Cocktails', 'Casual dining'],
    operatingHours: {
      monday: { open: '12:00', close: '22:00' },
      tuesday: { open: '12:00', close: '22:00' },
      wednesday: { open: '12:00', close: '22:00' },
      thursday: { open: '12:00', close: '22:00' },
      friday: { open: '12:00', close: '23:00' },
      saturday: { open: '12:00', close: '23:00' },
      sunday: { open: '12:00', close: '22:00' }
    },
    popularDishes: [
      { name: 'Fish Tacos', price: 16, description: 'Fresh fish with mango salsa' },
      { name: 'BBQ Ribs', price: 22, description: 'Slow-cooked with island BBQ sauce' },
      { name: 'Tropical Burger', price: 18, description: 'Burger with pineapple and coconut' }
    ],
    reservationRequired: false,
    contactInfo: {
      phone: '+1-649-946-5555',
      email: 'info@bamboobar.tc'
    }
  }
];

const sampleTransportation = [
  {
    category: 'Car Rental',
    description: 'Economy car rental for exploring the islands',
    island: 'Providenciales',
    pricingModel: 'per-day',
    basePrice: 45,
    perDayPrice: 45,
    capacity: 4,
    images: [
      { url: 'https://example.com/economy-car.jpg', isMain: true }
    ],
    rentalDetails: {
      make: 'Toyota',
      model: 'Corolla',
      year: 2022,
      transmission: 'automatic',
      fuelType: 'gasoline',
      airConditioning: true
    },
    features: ['GPS included', 'Insurance available', 'Airport pickup'],
    requirements: ['Valid driver\'s license', 'Credit card', 'Minimum age 25'],
    policies: {
      cancellation: 'Free cancellation up to 24 hours',
      fuel: 'Return with same fuel level',
      mileage: 'Unlimited mileage'
    },
    contactInfo: {
      phone: '+1-649-946-4444',
      email: 'rentals@tccarrental.tc'
    }
  },
  {
    category: 'Airport Transfer',
    description: 'Private airport transfer service',
    island: 'Providenciales',
    pricingModel: 'flat',
    basePrice: 35,
    flatPrice: 35,
    capacity: 6,
    images: [
      { url: 'https://example.com/transfer-van.jpg', isMain: true }
    ],
    features: ['Meet and greet', 'Door-to-door service', 'Professional drivers'],
    requirements: ['Flight details required', 'Advance booking recommended'],
    policies: {
      cancellation: 'Free cancellation up to 2 hours',
      waiting: 'Complimentary 30 minutes wait time',
      luggage: 'Standard luggage included'
    },
    contactInfo: {
      phone: '+1-649-946-3333',
      email: 'info@tctransfer.tc'
    }
  }
];

// Seeding functions
const seedUsers = async () => {
  try {
    await User.deleteMany({});
    
    // Hash passwords
    for (let user of sampleUsers) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(user.password, salt);
    }
    
    await User.insertMany(sampleUsers);
    console.log('✅ Users seeded successfully');
    
    return await User.find();
  } catch (error) {
    console.error('❌ Error seeding users:', error);
    throw error;
  }
};

const seedActivities = async (users) => {
  try {
    await Activity.deleteMany({});
    
    // Assign hosts to activities
    const businessManager = users.find(u => u.role === 'business-manager');
    sampleActivities.forEach(activity => {
      activity.host = businessManager._id;
    });
    
    await Activity.insertMany(sampleActivities);
    console.log('✅ Activities seeded successfully');
  } catch (error) {
    console.error('❌ Error seeding activities:', error);
    throw error;
  }
};

const seedStays = async (users) => {
  try {
    await Stay.deleteMany({});
    
    const businessManager = users.find(u => u.role === 'business-manager');
    sampleStays.forEach(stay => {
      stay.host = businessManager._id;
    });
    
    await Stay.insertMany(sampleStays);
    console.log('✅ Stays seeded successfully');
  } catch (error) {
    console.error('❌ Error seeding stays:', error);
    throw error;
  }
};

const seedDining = async (users) => {
  try {
    await Dining.deleteMany({});
    
    const businessManager = users.find(u => u.role === 'business-manager');
    sampleDining.forEach(dining => {
      dining.host = businessManager._id;
    });
    
    await Dining.insertMany(sampleDining);
    console.log('✅ Dining seeded successfully');
  } catch (error) {
    console.error('❌ Error seeding dining:', error);
    throw error;
  }
};

const seedTransportation = async (users) => {
  try {
    await Transportation.deleteMany({});
    
    const businessManager = users.find(u => u.role === 'business-manager');
    sampleTransportation.forEach(transport => {
      transport.host = businessManager._id;
    });
    
    await Transportation.insertMany(sampleTransportation);
    console.log('✅ Transportation seeded successfully');
  } catch (error) {
    console.error('❌ Error seeding transportation:', error);
    throw error;
  }
};

// Main seeding function
const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding...');
    
    await connectDB();
    
    const users = await seedUsers();
    await seedActivities(users);
    await seedStays(users);
    await seedDining(users);
    await seedTransportation(users);
    
    console.log('🎉 Database seeded successfully!');
    console.log('📋 Sample data created:');
    console.log(`   👤 ${sampleUsers.length} users`);
    console.log(`   🏃 ${sampleActivities.length} activities`);
    console.log(`   🏨 ${sampleStays.length} stays`);
    console.log(`   🍴 ${sampleDining.length} dining options`);
    console.log(`   🚗 ${sampleTransportation.length} transportation options`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };

