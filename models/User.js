const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String },
  role: { 
    type: String, 
    enum: ['user', 'admin', 'business-manager'],
    default: 'user' 
  },
  profilePicture: { type: String },
  authProvider: { type: String, enum: ['local', 'google', 'facebook'], default: 'local' },
  providerId: { type: String },

  // Favorites
  favorites: [
    {
      category: { 
        type: String, 
        enum: ['Dining', 'Transportation', 'Activity', 'Stay'], 
        required: true 
      },
      itemId: { type: mongoose.Schema.Types.ObjectId, required: true }, // ID of the main item
      optionId: { type: mongoose.Schema.Types.ObjectId }, // ID of the specific option (if any)
    },
  ],

  // Wishlist
  wishlist: [
    {
      category: { 
        type: String, 
        enum: ['Dining', 'Transportation', 'Activity', 'Stay'], 
        required: true 
      },
      itemId: { type: mongoose.Schema.Types.ObjectId, required: true },
      optionId: { type: mongoose.Schema.Types.ObjectId },
    },
  ],

  // Travel Information
  travelPreferences: {
    style: { type: String, enum: ['budget', 'mid-range', 'luxury'], default: 'mid-range' },
    preferredDestinations: [{ type: String }],
    activities: [{ type: String }],
    transportation: { type: String, enum: ['car rentals', 'public transport', 'walking', 'taxis'] },
  },
  accommodationPreferences: {
    type: { type: String, enum: ['hotel', 'resort', 'hostel', 'camping', 'Airbnb'], default: 'hotel' },
    amenities: [{ type: String }],
    location: { type: String, enum: ['city center', 'secluded', 'near the beach'] },
    roomRequirements: {
      numberOfRooms: { type: Number, default: 1 },
      bedType: { type: String, enum: ['king', 'queen', 'twin'] },
    },
  },
  groupDetails: {
    adults: { type: Number, default: 1 },
    children: { type: Number, default: 0 },
    pets: { type: Boolean, default: false },
    accessibilityNeeds: { type: Boolean, default: false },
    dietaryRestrictions: [{ type: String }],
  },
  budget: {
    total: { type: Number, default: 0 },
    allocation: {
      accommodation: { type: Number },
      food: { type: Number },
      activities: { type: Number },
      transportation: { type: Number },
    },
  },
  foodPreferences: {
    cuisines: [{ type: String }],
    diningStyle: { type: String, enum: ['fine dining', 'street food', 'casual'], default: 'casual' },
  },
  mustDoActivities: [{ type: String }],
  fitnessLevel: { type: String, enum: ['low', 'medium', 'high'] },
  eventPreferences: [{ type: String }],

  // Logistics
  logistics: {
    departureLocation: { type: String },
    travelInsurance: { type: Boolean, default: false },
    passportDetails: { type: String },
  },

  // Customization
  customization: {
    pace: { type: String, enum: ['relaxed', 'packed'], default: 'relaxed' },
    durationPerDestination: { type: Number },
    specialOccasions: [{ type: String }],
  },

  // Environmental and Ethical Preferences
  environmentalPreferences: {
    sustainability: { type: Boolean, default: false },
    supportLocal: { type: Boolean, default: true },
  },

  // Other Considerations
  healthConcerns: [{ type: String }],
  seasonalPreferences: { type: String },
  shoppingPreferences: [{ type: String }],
  privacyRequirements: { type: Boolean, default: false },

  // Notifications and Extras
  notifications: [
    {
      type: { type: String },
      message: { type: String },
      read: { type: Boolean, default: false },
      createdAt: { type: Date, default: Date.now },
    },
  ],
  itinerary: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Booking' }],
  cart: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Cart' }],
  loyaltyPoints: { type: Number, default: 0 },
  paymentMethods: [
    {
      cardNumber: { type: String },
      expiryDate: { type: String },
      cardHolderName: { type: String },
    },
  ],

  // Host Details
  isHost: { type: Boolean, default: false },
  hostDetails: {
    bio: { type: String },
    listings: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Activity' }],
    reviews: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        rating: { type: Number, min: 1, max: 5 },
        comment: { type: String },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },

  // Referral Program
  referralCode: { type: String },
  referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  referralCount: { type: Number, default: 0 },

  // Privacy Settings
  privacySettings: {
    profileVisibility: { type: String, enum: ['public', 'private', 'friends-only'], default: 'public' },
    shareActivity: { type: Boolean, default: true },
  },

}, { timestamps: true });

// Pre-save hooks
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

module.exports = mongoose.model('User', UserSchema);
