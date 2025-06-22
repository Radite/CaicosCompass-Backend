const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  phoneNumber: { type: String, default: null }, // 📞 Optional Phone Number
  dateOfBirth: { type: Date, default: null }, // 🎂 Optional Date of Birth
  password: { type: String },
  role: { 
    type: String, 
    enum: ['user', 'admin', 'business-manager'],
    default: 'user' 
  },
  isVerified: { type: Boolean, default: false },
  verificationToken: { type: String },
  verificationTokenExpires: { type: Date },
  profilePicture: { type: String },
  authProvider: { type: String, enum: ['local', 'google', 'facebook'], default: 'local' },
  providerId: { type: String },
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },

  // Favorites
  favorites: [
    {
      category: { 
        type: String, 
        enum: ['Dining', 'Transportation', 'Activity', 'Stay'], 
        required: true 
      },
      itemId: { type: mongoose.Schema.Types.ObjectId, required: true },
      optionId: { type: mongoose.Schema.Types.ObjectId }
    }
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
      optionId: { type: mongoose.Schema.Types.ObjectId }
    }
  ],

  // Travel Information
  travelPreferences: {
    // Allow one or more styles
    style: [{ type: String, enum: ['budget', 'mid-range', 'luxury'] }],
    // Allowed destinations
    preferredDestinations: [{ 
      type: String, 
      enum: ['Providenciales', 'Grand Turk', 'North Caicos & Middle Caicos', 'South Caicos', 'Salt Cay'] 
    }],
    // Extensive list of activities of interest
    activities: [{ 
      type: String, 
      enum: [
        'outdoor',
        'watersports',
        'snorkeling',
        'diving',
        'sightseeing',
        'hiking',
        'cycling',
        'kayaking',
        'fishing',
        'boating',
        'cultural',
        'shopping',
        'nightlife',
        'golf',
        'spa',
        'adventure',
        'wildlife',
        'sailing',
        'boating',
        'yachting',
        'eco-tourism',
        'photography'
      ]
    }],
    transportation: { type: String, enum: ['car rentals', 'public transport', 'walking', 'taxis'] }
  },

  accommodationPreferences: {
    type: { type: String, enum: ['hotel', 'resort', 'hostel', 'camping', 'Airbnb'], default: 'hotel' },
    amenities: [{ type: String }],
    location: { type: String, enum: ['city center', 'secluded', 'near the beach'] },
    roomRequirements: {
      numberOfRooms: { type: Number, default: 1 },
      bedType: { type: String, enum: ['king', 'queen', 'twin'] }
    },
    // New field: who is the accommodation for (can be multiple)
    accommodationFor: [{ type: String, enum: ['couple', 'single', 'family', 'with kids', 'toddler', 'pets'] }],
    numberOfKids: { type: Number, default: 0 },
    // Factor kids/toddlers/pets into activity planning
    includeGuestsInActivities: { type: Boolean, default: false }
  },

  groupDetails: {
    adults: { type: Number, default: 1 },
    children: { type: Number, default: 0 },
    pets: { type: Boolean, default: false },
    // Instead of a boolean, provide a list of accessibility needs options.
    accessibilityNeeds: [{ 
      type: String, 
      enum: ['wheelchair accessible', 'visual assistance', 'hearing assistance', 'cognitive support', 'none']
    }],
    // Dietary restrictions as a list of allowed options.
    dietaryRestrictions: [{ 
      type: String, 
      enum: ['vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'nut-free', 'halal', 'kosher', 'low-carb', 'low-sodium', 'none']
    }]
  },

  budget: {
    total: { type: Number, default: 0 },
    // Budget allocation by percentage of total budget
    allocation: {
      accommodation: { type: Number },
      food: { type: Number },
      activities: { type: Number },
      transportation: { type: Number }
    }
  },

  // Food Preferences
  foodPreferences: {
    cuisines: [{ 
      type: String, 
      enum: [
        'American',
        'Italian',
        'Mexican',
        'Chinese',
        'Japanese',
        'Thai',
        'Indian',
        'French',
        'Mediterranean',
        'Caribbean',
        'Lebanese',
        'Greek',
        'Spanish',
        'Korean',
        'Vietnamese',
        'Turkish',
        'Fusion',
        'Other'
      ]
    }],
    diningStyle: { type: String, enum: ['fine dining', 'street food', 'casual'], default: 'casual' }
  },

  // Must Do Activities (extensive list)
  mustDoActivities: [{
    type: String, 
    enum: [
      'go to the beach',
      'visit a historical site',
      'snorkeling',
      'diving',
      'explore local culture',
      'hiking',
      'sightseeing',
      'shopping',
      'food tour',
      'boat ride',
      'nature walk',
      'museum visit',
      'attend a festival',
      'wine tasting',
      'local market tour',
      'island hopping',
      'sunset cruise',
      'kayaking',
      'camping'
    ]
  }],

  fitnessLevel: { type: String, enum: ['low', 'medium', 'high'] },

  // Remove eventPreferences entirely

  // Logistics
  logistics: {
    departureLocation: { type: String },
    travelInsurance: { type: Boolean, default: false },
    passportDetails: { type: String }
  },

  // Customization
  customization: {
    // Allow multiple pace choices if needed
    pace: [{ type: String, enum: ['relaxed', 'packed'] }],
    durationPerDestination: { type: Number },
    // Special Occasions with a list of options
    specialOccasions: [{ 
      type: String, 
      enum: [
        'Birthday',
        'Anniversary',
        'Honeymoon',
        'Family Reunion',
        'Festival',
        'Holiday',
        'Graduation',
        'Other'
      ]
    }]
  },

  // Environmental and Ethical Preferences
  environmentalPreferences: {
    sustainability: { type: Boolean, default: false },
    supportLocal: { type: Boolean, default: true }
  },

  // Other Considerations
  healthConcerns: [{ 
    type: String, 
    enum: [
      'diabetes',
      'hypertension',
      'heart condition',
      'allergies',
      'asthma',
      'none'
    ]
  }],
  // Seasonal Preferences now as list
  seasonalPreferences: [{ 
    type: String, 
    enum: [
      'Peak Season',
      'Shoulder Season',
      'Off-Peak'
    ]
  }],
  // Shopping Preferences with multiple options
  shoppingPreferences: [{
    type: String,
    enum: [
      'luxury',
      'budget',
      'boutique',
      'mall',
      'local markets',
      'artisan',
      'discount',
      'high-end',
      'mid-range'
    ]
  }],
  privacyRequirements: { type: Boolean, default: false },

  // Additional fields for length of stay
  lengthOfStay: { type: Number },

  // Notifications and Extras
  notifications: [
    {
      type: { type: String },
      message: { type: String },
      read: { type: Boolean, default: false },
      createdAt: { type: Date, default: Date.now }
    }
  ],
  itinerary: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Booking' }],
  cart: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Cart' }],
  loyaltyPoints: { type: Number, default: 0 },
  paymentMethods: [
    {
      cardNumber: { type: String },
      expiryDate: { type: String },
      cardHolderName: { type: String }
    }
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
        createdAt: { type: Date, default: Date.now }
      }
    ]
  },

  // Referral Program
  referralCode: { type: String },
  referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  referralCount: { type: Number, default: 0 },

  // Privacy Settings
  privacySettings: {
    profileVisibility: { type: String, enum: ['public', 'private', 'friends-only'], default: 'public' },
    shareActivity: { type: Boolean, default: true }
  },

  accountStatus: {
    type: String,
    enum: ['active', 'deactivated'],
    default: 'active'
  },
  deactivatedAt: { type: Date }
}, { timestamps: true });

// Pre-save hooks
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

module.exports = mongoose.model('User', UserSchema);
