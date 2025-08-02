const mongoose = require('mongoose');
const Shopping = require('./models/Shopping');
const User = require('./models/User'); // Make sure this matches your User model path

async function seedStore() {
  await mongoose.connect('mongodb://localhost:27017/your-db-name');

  // Find an approved business-manager user
  const vendor = await User.findOne({
    role: 'business-manager',
    'businessProfile.isApproved': true,
  });

  if (!vendor) {
    console.error('No valid vendor found. Ensure a business-manager with approved profile exists.');
    return;
  }

  const store = new Shopping({
    name: "Island Artisan Boutique",
    description: "A local boutique offering handcrafted souvenirs, island wear, and artisan products.",
    location: "Grace Bay, Providenciales",
    coordinates: {
      latitude: 21.7960,
      longitude: -72.1788
    },
    images: [
      { url: "https://example.com/images/storefront.jpg", isMain: true },
      { url: "https://example.com/images/interior.jpg" }
    ],
    island: "Providenciales",
    vendor: vendor._id,
    storeType: "Boutique",
    priceRange: "$$",
    products: [
      {
        name: "Sea Glass Necklace",
        description: "Handmade necklace using locally sourced sea glass.",
        price: 45,
        discountedPrice: 35,
        category: "Jewelry",
        quantity: 10,
        availability: "In Stock",
        images: [
          { url: "https://example.com/images/seaglass1.jpg", isMain: true },
          { url: "https://example.com/images/seaglass2.jpg" }
        ]
      },
      {
        name: "Island Breeze Candle",
        description: "Scented candle with tropical essence.",
        price: 20,
        category: "Home Decor",
        quantity: 5,
        availability: "Limited",
        images: [
          { url: "https://example.com/images/candle.jpg", isMain: true }
        ]
      }
    ],
    openingHours: [
      { day: "Monday", openTime: "10:00", closeTime: "18:00" },
      { day: "Tuesday", openTime: "10:00", closeTime: "18:00" },
      { day: "Wednesday", openTime: "10:00", closeTime: "18:00" },
      { day: "Thursday", openTime: "10:00", closeTime: "18:00" },
      { day: "Friday", openTime: "10:00", closeTime: "18:00" },
      { day: "Saturday", openTime: "11:00", closeTime: "16:00" },
      { day: "Sunday", openTime: "Closed", closeTime: "Closed" }
    ],
    customClosures: [
      {
        date: new Date("2025-12-25"),
        reason: "Christmas Day",
        isRecurring: true
      },
      {
        date: new Date("2025-08-15"),
        reason: "Inventory Restock",
        isRecurring: false
      }
    ],
    paymentOptions: ["Cash", "Credit Card", "Mobile Payment"],
    deliveryAvailable: true
  });

  await store.save();
  console.log("Shopping store saved:", store);

  // Check closures
  console.log("Closed on Dec 25?", store.isClosedOnDate(new Date("2025-12-25"))); // true
  console.log("Upcoming closures in next 60 days:", store.getUpcomingClosures(60));
}

seedStore();
