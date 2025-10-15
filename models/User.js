const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { encrypt, decrypt, isEncrypted, maskAccountNumber, maskRoutingNumber } = require('../utils/encryption');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
phoneNumber: { 
    type: String, 
    default: null,
    validate: {
      validator: function(v) {
        if (!v) return true; // Allow null/empty
        // Check if it's in format: +countrycode phonenumber
        const phoneRegex = /^\+\d{1,4}\s.+$/;
        if (!phoneRegex.test(v)) return false;
        
        // Extract actual number and validate length
        const actualNumber = v.replace(/^\+\d{1,4}\s/, '').replace(/\D/g, '');
        return actualNumber.length >= 7 && actualNumber.length <= 15;
      },
      message: 'Please provide a valid phone number with country code'
    }
  },
  countryCode: { 
    type: String, 
    default: null,
    validate: {
      validator: function(v) {
        if (!v) return true; // Allow null/empty
        return /^\+\d{1,4}$/.test(v);
      },
      message: 'Please provide a valid country code'
    }
  },
  dateOfBirth: { 
    type: Date, 
    default: null,
    validate: {
      validator: function(v) {
        if (!v) return true; // Allow null/empty
        
        const today = new Date();
        const birthDate = new Date(v);
        const age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        
        const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate()) 
          ? age - 1 
          : age;
        
        return actualAge >= 13 && actualAge <= 120;
      },
      message: 'You must be at least 13 years old and provide a valid birth date'
    }
  },
  password: { type: String },
  role: { 
    type: String, 
    enum: ['user', 'admin', 'business-manager'], // Changed 'vendor' to 'business-manager' to match your existing middleware
    default: 'user' 
  },
  isVerified: { type: Boolean, default: false },
  verificationToken: { type: String },
  verificationTokenExpires: { type: Date },
  profilePicture: { type: String },
  authProvider: { type: String, enum: ['local', 'google', 'facebook', 'apple'], default: 'local' },
  providerId: { type: String },
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },

  // NEW: Vendor/Business Profile
  businessProfile: {
        // Business settings
    settings: {
      emailNotifications: { type: Boolean, default: true },
      smsNotifications: { type: Boolean, default: true },
      bookingAutoConfirm: { type: Boolean, default: false },
      showPhoneNumber: { type: Boolean, default: true },
      allowReviews: { type: Boolean, default: true }
    },
        // Social media links
    socialMedia: {
      facebook: { type: String },
      instagram: { type: String },
      twitter: { type: String },
      website: { type: String }
    },
    logo: { type: String },
    coverImage: { type: String },
    businessName: { type: String },
    businessType: { 
      type: String, 
      enum: ['restaurant', 'hotel-resort', 'villa-rental', 'airbnb-host', 'tour-operator', 'transportation-service', 'retail-shop', 'wellness-spa', 'other']
    },
    businessLicense: { type: String },
    businessAddress: {
      street: { type: String },
      city: { type: String },
      island: { 
        type: String, 
        enum: ['Providenciales', 'Grand Turk', 'North Caicos', 'Middle Caicos', 'South Caicos', 'Salt Cay']
      },
      postalCode: { type: String }
    },
    businessPhone: { type: String },
    businessDescription: { type: String },
    businessWebsite: { type: String },
    servicesOffered: [{ 
      type: String, 
      enum: ['dining', 'stays', 'activities', 'transportation', 'shopping', 'wellness-spa'] 
    }],
    isApproved: { type: Boolean, default: false },
    approvalDate: { type: Date },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Admin who approved
    rejectionReason: { type: String }, // If rejected
    operatingHours: [{
      day: { 
        type: String, 
        enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
      },
      openTime: { type: String },
      closeTime: { type: String },
      isClosed: { type: Boolean, default: false }
    }],
    // Financial info for payouts
    paymentInfo: {
      bankName: { type: String },
      accountNumber: { type: String },
      routingNumber: { type: String },
      accountHolderName: { type: String }
    },
    // Business documents
    documents: [{
      fileName: { type: String, required: true },
fileType: { 
  type: String, 
  enum: [
    'business-license',
    'government-id',
    'passport',
    'insurance-certificate',
    'professional-certification',
    'tax-registration',
    'bank-statement',
    'utility-bill',
    'trade-certificate',
    'health-permit',
    'tourism-license',
    'other'
  ], 
  required: true 
},      fileSize: { type: Number, required: true },
      fileData: { type: String, required: true }, // Base64 data or URL in production
      uploadedAt: { type: Date, default: Date.now }
    }],
    // Vendor metrics
    metrics: {
      totalListings: { type: Number, default: 0 },
      totalBookings: { type: Number, default: 0 },
      totalRevenue: { type: Number, default: 0 },
      averageRating: { type: Number, default: 0 },
      responseRate: { type: Number, default: 0 }, // % of bookings responded to
      responseTime: { type: Number, default: 0 } // Average hours to respond
    }
  },

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
    style: [{ type: String, enum: ['budget', 'mid-range', 'luxury'] }],
    preferredDestinations: [{ 
      type: String, 
      enum: ['Providenciales', 'Grand Turk', 'North Caicos & Middle Caicos', 'South Caicos', 'Salt Cay'] 
    }],
    activities: [{ 
      type: String, 
      enum: [
        'outdoor', 'watersports', 'snorkeling', 'diving', 'sightseeing', 'hiking', 'cycling',
        'kayaking', 'fishing', 'boating', 'cultural', 'shopping', 'nightlife', 'golf', 'spa',
        'adventure', 'wildlife', 'sailing', 'boating', 'yachting', 'eco-tourism', 'photography'
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
    accommodationFor: [{ type: String, enum: ['couple', 'single', 'family', 'with kids', 'toddler', 'pets'] }],
    numberOfKids: { type: Number, default: 0 },
    includeGuestsInActivities: { type: Boolean, default: false }
  },

  groupDetails: {
    adults: { type: Number, default: 1 },
    children: { type: Number, default: 0 },
    pets: { type: Boolean, default: false },
    accessibilityNeeds: [{ 
      type: String, 
      enum: ['wheelchair accessible', 'visual assistance', 'hearing assistance', 'cognitive support', 'none']
    }],
    dietaryRestrictions: [{ 
      type: String, 
      enum: ['vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'nut-free', 'halal', 'kosher', 'low-carb', 'low-sodium', 'none']
    }]
  },

  budget: {
    total: { type: Number, default: 0 },
    allocation: {
      accommodation: { type: Number },
      food: { type: Number },
      activities: { type: Number },
      transportation: { type: Number }
    }
  },

  foodPreferences: {
    cuisines: [{ 
      type: String, 
      enum: [
        'American', 'Italian', 'Mexican', 'Chinese', 'Japanese', 'Thai', 'Indian', 'French',
        'Mediterranean', 'Caribbean', 'Lebanese', 'Greek', 'Spanish', 'Korean', 'Vietnamese',
        'Turkish', 'Fusion', 'Other'
      ]
    }],
    diningStyle: { type: String, enum: ['fine dining', 'street food', 'casual'], default: 'casual' }
  },

  mustDoActivities: [{
    type: String, 
    enum: [
      'go to the beach', 'visit a historical site', 'snorkeling', 'diving', 'explore local culture',
      'hiking', 'sightseeing', 'shopping', 'food tour', 'boat ride', 'nature walk', 'museum visit',
      'attend a festival', 'wine tasting', 'local market tour', 'island hopping', 'sunset cruise',
      'kayaking', 'camping'
    ]
  }],

  fitnessLevel: { type: String, enum: ['low', 'medium', 'high'] },

  logistics: {
    departureLocation: { type: String },
    travelInsurance: { type: Boolean, default: false },
    passportDetails: { type: String }
  },

  customization: {
    pace: [{ type: String, enum: ['relaxed', 'packed'] }],
    durationPerDestination: { type: Number },
    specialOccasions: [{ 
      type: String, 
      enum: ['Birthday', 'Anniversary', 'Honeymoon', 'Family Reunion', 'Festival', 'Holiday', 'Graduation', 'Other']
    }]
  },

  environmentalPreferences: {
    sustainability: { type: Boolean, default: false },
    supportLocal: { type: Boolean, default: true }
  },

  healthConcerns: [{ 
    type: String, 
    enum: ['diabetes', 'hypertension', 'heart condition', 'allergies', 'asthma', 'none']
  }],
  
  seasonalPreferences: [{ 
    type: String, 
    enum: ['Peak Season', 'Shoulder Season', 'Off-Peak']
  }],
  
  shoppingPreferences: [{
    type: String,
    enum: ['luxury', 'budget', 'boutique', 'mall', 'local markets', 'artisan', 'discount', 'high-end', 'mid-range']
  }],
  
  privacyRequirements: { type: Boolean, default: false },
  lengthOfStay: { type: Number },

  notifications: [{
    type: String,
    title: String,
    message: String,
    read: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
  }],
  
  itinerary: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Booking' }],
  cart: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Cart' }],
  caicosCredits: { type: Number, default: 0 },
  
  paymentMethods: [
    {
      cardNumber: { type: String },
      expiryDate: { type: String },
      cardHolderName: { type: String }
    }
  ],

  // Keep existing host details but deprecate in favor of businessProfile
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

  referralCode: { type: String },
  referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  referralCount: { type: Number, default: 0 },

  privacySettings: {
    profileVisibility: { type: String, enum: ['public', 'private', 'friends-only'], default: 'public' },
    shareActivity: { type: Boolean, default: true }
  },

  accountStatus: {
    type: String,
    enum: ['active', 'deactivated'],
    default: 'active'
  },
  googleId: {
  type: String,
  sparse: true
},
facebookId: {
  type: String,
  sparse: true
},
appleId: {
  type: String,
  sparse: true
},
  deactivatedAt: { type: Date }
}, { timestamps: true });

// Pre-save hooks
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// NEW: Virtual to check if user is an approved vendor
UserSchema.virtual('isApprovedVendor').get(function() {
  return this.role === 'business-manager' && this.businessProfile?.isApproved === true;
});

// NEW: Method to get vendor services
UserSchema.methods.getVendorServices = async function() {
  if (!this.isApprovedVendor) return null;
  
  const services = {};
  const serviceTypes = ['Dining', 'Stay', 'Activity', 'Transportation'];
  
  for (const serviceType of serviceTypes) {
    const Model = mongoose.model(serviceType);
    services[serviceType.toLowerCase()] = await Model.find({ vendor: this._id });
  }
  
  return services;
};

// Pre-save hook for encrypting payment information
UserSchema.pre('save', function(next) {
  if (this.isModified('businessProfile.paymentInfo')) {
    const paymentInfo = this.businessProfile.paymentInfo;
    
    if (paymentInfo.accountNumber && !isEncrypted(paymentInfo.accountNumber)) {
      paymentInfo.accountNumber = encrypt(paymentInfo.accountNumber);
    }
    
    if (paymentInfo.routingNumber && !isEncrypted(paymentInfo.routingNumber)) {
      paymentInfo.routingNumber = encrypt(paymentInfo.routingNumber);
    }
  }
  next();
});

UserSchema.methods.getDecryptedPaymentInfo = function() {
  if (!this.paymentMethods || this.paymentMethods.length === 0) {
    return [];
  }
  
  return this.paymentMethods.map(method => ({
    _id: method._id,
    cardNumber: method.cardNumber ? decrypt(method.cardNumber) : null,
    expiryDate: method.expiryDate ? decrypt(method.expiryDate) : null,
    cardHolderName: method.cardHolderName ? decrypt(method.cardHolderName) : null
  }));
};

UserSchema.methods.getMaskedPaymentInfo = function() {
  if (!this.paymentMethods || this.paymentMethods.length === 0) {
    return [];
  }
  
  return this.paymentMethods.map(method => {
    const decryptedCardNumber = method.cardNumber ? decrypt(method.cardNumber) : null;
    
    return {
      _id: method._id,
      cardNumber: decryptedCardNumber ? maskAccountNumber(decryptedCardNumber) : null,
      expiryDate: method.expiryDate ? '**/**' : null,
      cardHolderName: method.cardHolderName ? decrypt(method.cardHolderName) : null
    };
  });
};


module.exports = mongoose.model('User', UserSchema);