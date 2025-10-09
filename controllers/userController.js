const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const AppleStrategy = require('passport-apple').Strategy;
const { OAuth2Client } = require('google-auth-library');
const { generateToken } = require('../utils/jwtUtils');
const Activity = require('../models/Activity');
const Stay = require('../models/Stay');
const Dining = require('../models/Dining');
const Transportation = require('../models/Transportation');
const { check, validationResult } = require('express-validator');
const nodemailer = require('nodemailer');
const { sendVerificationEmail, sendBusinessApplicationEmail } = require('./emailService');
const crypto = require('crypto');
const { sendPasswordResetEmail } = require('./emailService');

// Google OAuth Client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Add Passport session configuration (required for OAuth)
passport.serializeUser((user, done) => {
  done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Updated Google Strategy with better error handling
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL
}, async (accessToken, refreshToken, profile, done) => {
  try {
    console.log('🔍 Google Strategy called with profile:', {
      id: profile.id,
      name: profile.displayName,
      email: profile.emails?.[0]?.value,
      photos: profile.photos?.[0]?.value
    });

    // Check if profile has email
    if (!profile.emails || !profile.emails[0] || !profile.emails[0].value) {
      console.error('❌ No email found in Google profile');
      return done(new Error('No email found in Google profile'), null);
    }

    const email = profile.emails[0].value;

    let user = await User.findOne({ 
      $or: [
        { googleId: profile.id },
        { email: email }
      ]
    });

    if (user) {
      // Update Google ID if user exists but doesn't have it
      if (!user.googleId) {
        user.googleId = profile.id;
        await user.save();
        console.log(`✅ Added Google ID to existing user: ${user.email}`);
      } else {
        console.log(`✅ Existing Google user found: ${user.email}`);
      }
      return done(null, user);
    }

    // Create new user
    console.log('🔄 Creating new user from Google OAuth...');
    
    user = new User({
      googleId: profile.id,
      name: profile.displayName,
      email: email,
      username: email.split('@')[0] + '_google_' + Date.now(),
      isVerified: true, // Google accounts are pre-verified
      role: 'user',
      profilePicture: profile.photos && profile.photos[0] ? profile.photos[0].value : null
    });

    const savedUser = await user.save();
    console.log(`✅ New Google user created successfully:`, {
      id: savedUser._id,
      email: savedUser.email,
      name: savedUser.name,
      googleId: savedUser.googleId
    });
    
    return done(null, savedUser);
  } catch (error) {
    console.error('❌ Error in Google OAuth strategy:', error);
    return done(error, null);
  }
}));

// Google OAuth routes
exports.googleLogin = passport.authenticate('google', {
  scope: ['profile', 'email']
});

// Updated callback with better error handling
exports.googleCallback = [
  passport.authenticate('google', { 
    session: false,
    failureRedirect: `${process.env.FRONTEND_URL}/auth/error?message=Authentication failed`
  }),
  async (req, res) => {
    try {
      console.log('🔄 Google OAuth callback reached');
      
      // Check if user exists
      if (!req.user) {
        console.error('❌ No user found in req.user');
        return res.redirect(`${process.env.FRONTEND_URL}/auth/error?message=User authentication failed`);
      }

      console.log('✅ User authenticated:', {
        id: req.user._id,
        email: req.user.email,
        name: req.user.name
      });

      // Generate JWT token
      const token = jwt.sign(
        { id: req.user._id }, 
        process.env.JWT_SECRET, 
        { expiresIn: '7d' }
      );
      
      // Prepare user data for frontend
      const userData = {
        _id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        isVerified: req.user.isVerified,
        profilePicture: req.user.profilePicture
      };
      
      console.log('✅ Google OAuth successful, redirecting user:', userData.email);
      
      // Redirect to frontend with token and user data
      res.redirect(`${process.env.FRONTEND_URL}/auth/success?token=${token}&user=${encodeURIComponent(JSON.stringify(userData))}`);
    } catch (error) {
      console.error('❌ Error in Google OAuth callback:', error);
      res.redirect(`${process.env.FRONTEND_URL}/auth/error?message=Login failed`);
    }
  }
];

passport.use(new FacebookStrategy({
  clientID: process.env.FACEBOOK_APP_ID,
  clientSecret: process.env.FACEBOOK_APP_SECRET,
  callbackURL: process.env.FACEBOOK_CALLBACK_URL,
  profileFields: ['id', 'displayName', 'emails']
}, async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await User.findOne({ 
      $or: [
        { facebookId: profile.id },
        { email: profile.emails[0].value }
      ]
    });

    if (user) {
      if (!user.facebookId) {
        user.facebookId = profile.id;
        await user.save();
      }
      return done(null, user);
    }

    user = new User({
      facebookId: profile.id,
      name: profile.displayName,
      email: profile.emails[0].value,
      username: profile.emails[0].value.split('@')[0] + '_' + Date.now(),
      isVerified: true,
      role: 'user'
    });

    await user.save();
    done(null, user);
  } catch (error) {
    done(error, null);
  }
}));

passport.use(new AppleStrategy({
  clientID: process.env.APPLE_CLIENT_ID,
  teamID: process.env.APPLE_TEAM_ID,
  keyID: process.env.APPLE_KEY_ID,
  privateKey: process.env.APPLE_PRIVATE_KEY,
  callbackURL: process.env.APPLE_CALLBACK_URL
}, async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await User.findOne({ 
      $or: [
        { appleId: profile.id },
        { email: profile.email }
      ]
    });

    if (user) {
      if (!user.appleId) {
        user.appleId = profile.id;
        await user.save();
      }
      return done(null, user);
    }

    user = new User({
      appleId: profile.id,
      name: profile.displayName || 'User',
      email: profile.email,
      username: profile.email.split('@')[0] + '_' + Date.now(),
      isVerified: true,
      role: 'user'
    });

    await user.save();
    done(null, user);
  } catch (error) {
    done(error, null);
  }
}));



exports.facebookLogin = passport.authenticate('facebook', {
  scope: ['email']
});

exports.facebookCallback = passport.authenticate('facebook', { session: false }), (req, res) => {
  const token = jwt.sign({ id: req.user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
  
  res.redirect(`${process.env.FRONTEND_URL}/auth/success?token=${token}&user=${encodeURIComponent(JSON.stringify({
    _id: req.user._id,
    name: req.user.name,
    email: req.user.email,
    role: req.user.role
  }))}`);
};

exports.appleLogin = passport.authenticate('apple');

exports.appleCallback = passport.authenticate('apple', { session: false }), (req, res) => {
  const token = jwt.sign({ id: req.user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
  
  res.redirect(`${process.env.FRONTEND_URL}/auth/success?token=${token}&user=${encodeURIComponent(JSON.stringify({
    _id: req.user._id,
    name: req.user.name,
    email: req.user.email,
    role: req.user.role
  }))}`);
};

exports.getUserEmail = async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Find the user by id and select only the email field
    const user = await User.findById(userId).select('email');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.status(200).json({ email: user.email });
  } catch (err) {
    console.error('Error fetching user email:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Forgot Password Handler
// Forgot Password Handler
// Backend: Generate reset token and  email
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found.' });

    const resetToken = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour expiration time

    await user.save();

    // Send the reset password email (ensure you send the correct reset link)
    const resetLink = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    await sendPasswordResetEmail(email, resetLink);

    res.status(200).json({ message: 'Password reset email sent.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error during password reset request.' });
  }
};


// Reset Password Handler
exports.resetPassword = async (req, res) => {
  const { token } = req.params; // The reset token from the URL

  try {
    // Find the user by reset token and ensure it hasn't expired
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }, // Token has not expired
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token.' });
    }

    res.status(200).json({ message: 'Token is valid, allow password reset.' });

  } catch (error) {
    console.error('Error during password reset verification:', error);
    res.status(500).json({ message: 'Internal server error. Please try again later.' });
  }
};

exports.postResetPassword = async (req, res) => {
  const { token } = req.params;
  const { newPassword } = req.body;

  try {
    // Find the user by reset token and ensure it hasn't expired
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token.' });
    }

    // Hash the new password before saving
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update the user's password
    user.password = hashedPassword;
    user.resetPasswordToken = undefined; // Clear the reset token
    user.resetPasswordExpires = undefined; // Clear the expiration time

    await user.save();

    res.status(200).json({ message: 'Password successfully reset.' });

  } catch (error) {
    console.error('Error during password reset:', error);
    res.status(500).json({ message: 'Internal server error. Please try again later.' });
  }
};


// Update your registerUser function (replace the existing one)
exports.registerUser = async (req, res) => {
  try {
    const { name, username, email, password, role, businessProfile, phoneNumber } = req.body;

    // Generate username if not provided (for business users)
    const finalUsername = username || email.split('@')[0] + '_' + Date.now();

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    // Additional validation for business users
    if (role === 'business-manager') {
      if (!businessProfile || !businessProfile.businessName || !businessProfile.businessType) {
        return res.status(400).json({ message: 'Business name and type are required for business accounts' });
      }
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const userData = {
      name,
      username: finalUsername,
      email,
      password,
      phoneNumber,
      role: role || 'user',
    };

    // Handle verification based on role
    if (role === 'business-manager' || role === 'admin') {
      // Business managers and admins don't need email verification
      userData.isVerified = true;
      userData.verificationToken = null;
      userData.verificationTokenExpires = null;
    } else {
      // Regular users need email verification
      const verificationToken = crypto.randomBytes(32).toString('hex');
      console.log('Generated Verification Token:', verificationToken);
      
      userData.verificationToken = verificationToken;
      userData.verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours expiration
      userData.isVerified = false;
    }

    // Add business profile for business managers
    if (role === 'business-manager' && businessProfile) {
      userData.businessProfile = businessProfile;
    }

    const user = await User.create(userData);

    // Send appropriate emails based on role
    if (role === 'business-manager') {
      // Send business application confirmation email
      try {
        await sendBusinessApplicationEmail(user.email, businessProfile, name);
        console.log(`✅ Business application email sent to ${user.email}`);
      } catch (emailError) {
        console.error('❌ Failed to send business application email:', emailError);
        // Don't fail the registration if email fails, just log it
      }
    } else if (role !== 'admin') {
      // Send verification email for regular users (not business-manager or admin)
      const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${userData.verificationToken}`;
      console.log('Generated Verification Link:', verificationLink);
      
      try {
        await sendVerificationEmail(user.email, verificationLink);
        console.log(`✅ Verification email sent to ${user.email}`);
      } catch (emailError) {
        console.error('❌ Failed to send verification email:', emailError);
        // Don't fail the registration if email fails, just log it
      }
    }

    // Send appropriate response based on role
    if (role === 'business-manager') {
      res.status(201).json({
        message: 'Business application submitted successfully! We have sent a confirmation email with your application details. Your application will be reviewed within 24-48 hours and you will receive an email notification once approved.',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          businessName: businessProfile.businessName
        }
      });
    } else if (role === 'admin') {
      res.status(201).json({
        message: 'Admin user created successfully and is ready to use.',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isVerified: user.isVerified
        }
      });
    } else {
      res.status(201).json({
        message: 'User registered successfully. Please check your email for verification link.',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      });
    }
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: error.message });
  }
};

exports.resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required.' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'User not found.' });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: 'User is already verified.' });
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    user.verificationToken = verificationToken;
    user.verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours expiration
    await user.save();

    const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
    await sendVerificationEmail(user.email, verificationLink);

    res.status(200).json({ message: 'Verification email has been resent. Please check your inbox.' });
  } catch (error) {
    res.status(500).json({ message: 'Error resending verification email.' });
  }
};



exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    if (!user.isVerified) {
      return res.status(403).json({ message: 'Please verify your email before logging in.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    console.log("User found:", user.email); // Debugging

    // Generate JWT Access Token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    console.log("Generated Token:", token); // 🔥 Check if token is generated

res.status(200).json({
  success: true,
  token,
  user: {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    businessProfile: user.businessProfile, // Include for frontend routing
  },
});
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: error.message });
  }
};



exports.logoutUser = async (req, res) => {
  res.clearCookie('refreshToken', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'Strict' });
  res.status(200).json({ message: 'Logged out successfully' });
};

exports.refreshToken = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    jwt.verify(refreshToken, process.env.REFRESH_SECRET, (err, decoded) => {
      if (err) return res.status(403).json({ message: 'Invalid refresh token' });

      // Generate a new Access Token
      const newAccessToken = jwt.sign({ id: decoded.id }, process.env.JWT_SECRET, { expiresIn: '1h' });

      res.status(200).json({ accessToken: newAccessToken });
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get user profile with masked payment info
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userResponse = user.toObject();
    
    // Replace payment info with masked version for security
    if (userResponse.businessProfile?.paymentInfo) {
      userResponse.businessProfile.paymentInfo = user.getMaskedPaymentInfo();
    }

    res.json(userResponse);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Enhanced updateProfile function in userController.js
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const updates = req.body;

    // Find user by ID
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Handle basic profile updates
    if (updates.name) user.name = updates.name;
    if (updates.phoneNumber !== undefined) user.phoneNumber = updates.phoneNumber;
    if (updates.dateOfBirth !== undefined) user.dateOfBirth = updates.dateOfBirth;
    if (updates.profilePicture) user.profilePicture = updates.profilePicture;

    // Handle travel preferences updates
    if (updates.travelPreferences) {
      user.travelPreferences = {
        ...user.travelPreferences,
        ...updates.travelPreferences
      };
    }

    // Handle accommodation preferences updates
    if (updates.accommodationPreferences) {
      user.accommodationPreferences = {
        ...user.accommodationPreferences,
        ...updates.accommodationPreferences
      };
    }

    // Handle food preferences updates
    if (updates.foodPreferences) {
      user.foodPreferences = {
        ...user.foodPreferences,
        ...updates.foodPreferences
      };
    }

    // Handle group details updates
    if (updates.groupDetails) {
      user.groupDetails = {
        ...user.groupDetails,
        ...updates.groupDetails
      };
    }

    // Handle budget updates
    if (updates.budget) {
      user.budget = {
        ...user.budget,
        ...updates.budget
      };
    }

    // Handle logistics updates
    if (updates.logistics) {
      user.logistics = {
        ...user.logistics,
        ...updates.logistics
      };
    }

    // Handle customization updates
    if (updates.customization) {
      user.customization = {
        ...user.customization,
        ...updates.customization
      };
    }

    // Handle environmental preferences updates
    if (updates.environmentalPreferences) {
      user.environmentalPreferences = {
        ...user.environmentalPreferences,
        ...updates.environmentalPreferences
      };
    }

    // Handle privacy settings updates
    if (updates.privacySettings) {
      user.privacySettings = {
        ...user.privacySettings,
        ...updates.privacySettings
      };
    }

    // Handle array updates
    if (updates.mustDoActivities !== undefined) {
      user.mustDoActivities = updates.mustDoActivities;
    }
    if (updates.healthConcerns !== undefined) {
      user.healthConcerns = updates.healthConcerns;
    }
    if (updates.seasonalPreferences !== undefined) {
      user.seasonalPreferences = updates.seasonalPreferences;
    }
    if (updates.shoppingPreferences !== undefined) {
      user.shoppingPreferences = updates.shoppingPreferences;
    }

    // Handle single field updates
    if (updates.fitnessLevel) user.fitnessLevel = updates.fitnessLevel;
    if (updates.lengthOfStay !== undefined) user.lengthOfStay = updates.lengthOfStay;
    if (updates.privacyRequirements !== undefined) user.privacyRequirements = updates.privacyRequirements;

    // Handle password update separately (if provided)
    if (updates.password && updates.currentPassword) {
      const isCurrentPasswordValid = await bcrypt.compare(updates.currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({ message: 'Current password is incorrect' });
      }
      // Password will be hashed automatically by the pre-save hook
      user.password = updates.password;
    }

    // Save the updated user
    const updatedUser = await user.save();

    // Return user without password
    const userResponse = updatedUser.toObject();
    delete userResponse.password;
    delete userResponse.resetPasswordToken;
    delete userResponse.resetPasswordExpires;
    delete userResponse.verificationToken;
    delete userResponse.verificationTokenExpires;

    res.status(200).json(userResponse);
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ message: 'Server error while updating profile' });
  }
};

exports.deleteAccount = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (user) {
      await user.remove();
      res.json({ message: 'Account deleted' });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Favorites and Wishlist
exports.getFavorites = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate({
        path: 'favorites.itemId',
        model: (doc) => {
          switch (doc.category) {
            case 'Dining': return 'Dining';
            case 'Transportation': return 'Transportation';
            case 'Activity': return 'Activity';
            case 'Stay': return 'Stay';
            default: return null;
          }
        },
      })
      .populate({
        path: 'favorites.optionId',
        model: (doc) => {
          if (doc.category === 'Stay') return 'Room'; // Populate specific rooms for stays
          return 'Option'; // Populate sub-options for other categories
        },
      });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json(user.favorites);
  } catch (error) {
    console.error('Error fetching favorites:', error);
    res.status(500).json({ message: 'Server error' });
  }
};


exports.toggleFavorite = async (req, res) => {
  try {
    const { category, itemId, optionId } = req.body; // Accept category, itemId (standalone), and optionId (optional)
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Ensure valid category
    const validCategories = ['activities', 'stays', 'dining', 'transportation'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ error: 'Invalid category' });
    }

    // Check if the favorite already exists
    const exists = user.favorites.some(
      (fav) =>
        fav.category === category &&
        fav.itemId.equals(itemId) &&
        (!optionId || fav.optionId?.equals(optionId))
    );

    if (exists) {
      // Remove the favorite if it exists
      user.favorites = user.favorites.filter(
        (fav) =>
          !(fav.category === category &&
            fav.itemId.equals(itemId) &&
            (!optionId || fav.optionId?.equals(optionId)))
      );
    } else {
      // Validate item existence (optional but recommended)
      const modelMap = {
        activities: Activity,
        stays: Stay,
        dining: Dining,
        transportation: Transportation,
      };
      const Model = modelMap[category];
      const item = await Model.findById(itemId);
      if (!item) {
        return res.status(400).json({ error: 'Invalid itemId' });
      }

      // Validate optionId if provided
      if (optionId) {
        const optionExists = item.options?.some((option) =>
          option._id.equals(optionId)
        );
        if (!optionExists) {
          return res.status(400).json({ error: 'Invalid optionId' });
        }
      }

      // Add the favorite
      user.favorites.push({ category, itemId, optionId });
    }

    await user.save();
    res.json(user.favorites);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};


exports.getWishlist = async (req, res) => {
  const user = await User.findById(req.user.id)
    .populate({
      path: 'wishlist.itemId',
      model: (doc) => {
        switch (doc.category) {
          case 'Dining': return 'Dining';
          case 'Transportation': return 'Transportation';
          case 'Activity': return 'Activity';
          case 'Stay': return 'Stay';
        }
      },
    })
    .populate({
      path: 'wishlist.optionId',
      model: (doc) => {
        if (doc.category === 'Stay') return 'Room';
        return 'Option'; // For other sub-options
      },
    });

  res.json(user.wishlist);
};

exports.toggleWishlist = async (req, res) => {
  const { category, itemId, optionId } = req.body; // Accept category, itemId (standalone), and optionId (optional)
  const user = await User.findById(req.user.id);

  // Check if the wishlist item already exists
  const exists = user.wishlist.some(
    (wish) =>
      wish.category === category &&
      wish.itemId.equals(itemId) &&
      (!optionId || wish.optionId?.equals(optionId))
  );

  if (exists) {
    // Remove the wishlist item if it exists
    user.wishlist = user.wishlist.filter(
      (wish) =>
        !(wish.category === category &&
          wish.itemId.equals(itemId) &&
          (!optionId || wish.optionId?.equals(optionId)))
    );
  } else {
    // Add the wishlist item
    user.wishlist.push({ category, itemId, optionId });
  }

  await user.save();
  res.json(user.wishlist);
};
// Notifications
exports.getNotifications = async (req, res) => {
  const user = await User.findById(req.user.id);
  res.json(user.notifications);
};

exports.markNotificationRead = async (req, res) => {
  const user = await User.findById(req.user.id);
  const notification = user.notifications.id(req.params.id);

  if (notification) {
    notification.read = true;
    await user.save();
    res.json(user.notifications);
  } else {
    res.status(404).json({ message: 'Notification not found' });
  }
};

// Admin and Business Manager
exports.getAllUsers = async (req, res) => {
  const users = await User.find().select('-password');
  res.json(users);
};

exports.deleteUser = async (req, res) => {
  const user = await User.findById(req.params.id);
  if (user) {
    await user.remove();
    res.json({ message: 'User deleted' });
  } else {
    res.status(404).json({ message: 'User not found' });
  }
};

exports.updateUserRole = async (req, res) => {
  const user = await User.findById(req.params.id);
  if (user) {
    user.role = req.body.role;
    await user.save();
    res.json(user);
  } else {
    res.status(404).json({ message: 'User not found' });
  }
};

// Get business dashboard data
exports.getBusinessDashboard = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role !== 'business-manager') {
      return res.status(403).json({ message: 'Access denied. Business manager role required.' });
    }

    // Return dashboard data with masked payment info
    const userResponse = user.toObject();
    if (userResponse.businessProfile?.paymentInfo) {
      userResponse.businessProfile.paymentInfo = user.getMaskedPaymentInfo();
    }

    const dashboardData = {
      businessProfile: userResponse.businessProfile,
      metrics: userResponse.businessProfile?.metrics || {
        totalListings: 0,
        totalBookings: 0,
        totalRevenue: 0,
        averageRating: 0,
        responseRate: 0,
        responseTime: 0
      },
      isApproved: userResponse.businessProfile?.isApproved || false,
      approvalStatus: userResponse.businessProfile?.isApproved ? 'approved' : 'pending'
    };

    res.json(dashboardData);

  } catch (error) {
    console.error('Error fetching business dashboard:', error);
    res.status(500).json({ 
      message: 'Error fetching business dashboard',
      error: error.message 
    });
  }
};

exports.manageListings = async (req, res) => {
  res.status(200).json({ message: 'Manage your listings here' });
};

exports.updateHostDetails = async (req, res) => {
  const { id } = req.params;
  const { bio, listings } = req.body;

  try {
    const user = await User.findById(id);
    if (!user || !user.isHost) {
      return res.status(404).json({ message: 'Host not found' });
    }

    // Update host details
    if (bio) user.hostDetails.bio = bio;
    if (listings) user.hostDetails.listings = listings;

    await user.save();
    res.status(200).json({ message: 'Host details updated successfully', user });
  } catch (error) {
    console.error('Error updating host details:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Reviews
exports.getUserReviews = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).populate('hostDetails.reviews.userId');
    if (!user || !user.isHost) {
      return res.status(404).json({ message: 'Host not found' });
    }
    res.status(200).json(user.hostDetails.reviews);
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.addReview = async (req, res) => {
  try {
    const { hostId } = req.params;
    const { rating, comment } = req.body;

    const host = await User.findById(hostId);
    if (!host || !host.isHost) {
      return res.status(404).json({ message: 'Host not found' });
    }

    const newReview = {
      userId: req.user.id,
      rating,
      comment,
    };
    host.hostDetails.reviews.push(newReview);
    await host.save();

    res.status(201).json({ message: 'Review added successfully', reviews: host.hostDetails.reviews });
  } catch (error) {
    console.error('Error adding review:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;

    const host = await User.findOne({ 'hostDetails.reviews._id': reviewId });
    if (!host) {
      return res.status(404).json({ message: 'Review not found' });
    }

    host.hostDetails.reviews = host.hostDetails.reviews.filter(
      (review) => review._id.toString() !== reviewId || review.userId.toString() !== req.user.id
    );

    await host.save();

    res.status(200).json({ message: 'Review deleted successfully' });
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Referral Program
exports.getReferrals = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('referralCode referralCount referredBy');
    res.status(200).json(user);
  } catch (error) {
    console.error('Error fetching referrals:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.addReferral = async (req, res) => {
  try {
    const { referralCode } = req.body;

    const referrer = await User.findOne({ referralCode });
    if (!referrer) {
      return res.status(404).json({ message: 'Referral code not found' });
    }

    const user = await User.findById(req.user.id);
    if (user.referredBy) {
      return res.status(400).json({ message: 'User has already been referred' });
    }

    user.referredBy = referrer._id;
    referrer.referralCount += 1;

    await Promise.all([user.save(), referrer.save()]);

    res.status(200).json({ message: 'Referral added successfully' });
  } catch (error) {
    console.error('Error adding referral:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Privacy Settings
exports.getPrivacySettings = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('privacySettings');
    res.status(200).json(user.privacySettings);
  } catch (error) {
    console.error('Error fetching privacy settings:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updatePrivacySettings = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    user.privacySettings = { ...user.privacySettings, ...req.body };
    await user.save();
    res.status(200).json({ message: 'Privacy settings updated successfully' });
  } catch (error) {
    console.error('Error updating privacy settings:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin Only Routes
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.status(200).json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByIdAndDelete(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.role = role;
    await user.save();

    res.status(200).json({ message: 'User role updated successfully' });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;
    console.log('Received verification request with token:', token);

    if (!token) {
      console.log('Verification failed: No token provided');
      return res.status(400).json({ message: 'Token is required' });
    }

    const user = await User.findOne({ verificationToken: token });

    if (!user) {
      console.log('Verification failed: Invalid or expired token:', token);
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    console.log('User found with token:', user.email);

    if (user.isVerified) {
      console.log('Verification failed: User already verified:', user.email);
      return res.status(400).json({ message: 'User already verified' });
    }

    // Check if token is expired
    const currentTime = Date.now();
    console.log('Token expiration time:', user.verificationTokenExpires);
    console.log('Current time:', currentTime);

    if (user.verificationTokenExpires < currentTime) {
      console.log('Verification failed: Token has expired');
      return res.status(400).json({ message: 'Verification link has expired' });
    }

    // Mark user as verified
    user.isVerified = true;
    user.verificationToken = null;
    user.verificationTokenExpires = null;
    await user.save();

    console.log('User verified successfully:', user.email);
    res.status(200).json({ message: 'Email verified successfully!' });

  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deactivateAccount = async (req, res) => {
  try {
    const userId = req.user.id;

    // Update account status to "deactivated"
    const user = await User.findByIdAndUpdate(
      userId,
      { accountStatus: 'deactivated', deactivatedAt: new Date() },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.status(200).json({ message: 'Account successfully deactivated.', user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Something went wrong. Please try again later.' });
  }
};


exports.deleteAccount = async (req, res) => {
  try {
    const userId = req.user.id;

    // Delete the user account
    const user = await User.findByIdAndDelete(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.status(200).json({ message: 'Account successfully deleted.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Something went wrong. Please try again later.' });
  }
};

exports.reactivateAccount = async (req, res) => {
  try {
    const userId = req.user.id;

    // Update the user's account status to 'active'
    const user = await User.findByIdAndUpdate(
      userId,
      { accountStatus: 'active', deactivatedAt: null },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.status(200).json({ message: 'Your account has been successfully reactivated.' });
  } catch (error) {
    console.error('Error reactivating account:', error);
    res.status(500).json({ message: 'Failed to reactivate account.' });
  }
};

// ADD THESE MISSING METHODS:

// Get user profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ message: 'Error fetching user profile' });
  }
};

// Enhanced updateBusinessProfile with encryption
exports.updateBusinessProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const profileData = req.body;

    console.log('Updating business profile for user:', userId);

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role !== 'business-manager') {
      return res.status(403).json({ message: 'Access denied. Business manager role required.' });
    }

    // Initialize business profile if it doesn't exist
    if (!user.businessProfile) {
      user.businessProfile = {};
    }

    // Update basic business information
    if (profileData.businessName !== undefined) {
      user.businessProfile.businessName = profileData.businessName;
    }
    
    if (profileData.businessType !== undefined) {
      user.businessProfile.businessType = profileData.businessType;
    }
    
    if (profileData.description !== undefined) {
      user.businessProfile.businessDescription = profileData.description;
    }
    
    // Update images
    if (profileData.logo !== undefined) {
      user.businessProfile.logo = profileData.logo;
    }
    
    if (profileData.coverImage !== undefined) {
      user.businessProfile.coverImage = profileData.coverImage;
    }

    // Update contact information
    if (profileData.contactInfo) {
      if (!user.businessProfile.businessAddress) {
        user.businessProfile.businessAddress = {};
      }

      if (profileData.contactInfo.phone !== undefined) {
        user.businessProfile.businessPhone = profileData.contactInfo.phone;
      }
      
      if (profileData.contactInfo.email !== undefined) {
        user.email = profileData.contactInfo.email;
      }
      
      if (profileData.contactInfo.website !== undefined) {
        user.businessProfile.businessWebsite = profileData.contactInfo.website;
      }
      
      if (profileData.contactInfo.address !== undefined) {
        user.businessProfile.businessAddress.street = profileData.contactInfo.address;
      }
      
      if (profileData.contactInfo.island !== undefined) {
        user.businessProfile.businessAddress.island = profileData.contactInfo.island;
      }
    }

    // Update business hours
    if (profileData.businessHours) {
      user.businessProfile.businessHours = {
        ...user.businessProfile.businessHours,
        ...profileData.businessHours
      };
    }

    // Update payment information (will be encrypted automatically by pre-save hook)
    if (profileData.paymentInfo) {
      if (!user.businessProfile.paymentInfo) {
        user.businessProfile.paymentInfo = {};
      }

      // Only update if the value is not masked (user is providing new info)
      if (profileData.paymentInfo.bankName !== undefined) {
        user.businessProfile.paymentInfo.bankName = profileData.paymentInfo.bankName;
      }
      
      if (profileData.paymentInfo.accountHolderName !== undefined) {
        user.businessProfile.paymentInfo.accountHolderName = profileData.paymentInfo.accountHolderName;
      }
      
      // Only update account number if it's not masked
      if (profileData.paymentInfo.accountNumber && 
          !profileData.paymentInfo.accountNumber.startsWith('****')) {
        user.businessProfile.paymentInfo.accountNumber = profileData.paymentInfo.accountNumber;
      }
      
      // Only update routing number if it's not masked
      if (profileData.paymentInfo.routingNumber && 
          !profileData.paymentInfo.routingNumber.startsWith('****')) {
        user.businessProfile.paymentInfo.routingNumber = profileData.paymentInfo.routingNumber;
      }
    }

    // Update social media
    if (profileData.socialMedia) {
      user.businessProfile.socialMedia = {
        ...user.businessProfile.socialMedia,
        ...profileData.socialMedia
      };
    }

    // Update settings
    if (profileData.settings) {
      user.businessProfile.settings = {
        ...user.businessProfile.settings,
        ...profileData.settings
      };
    }

    // Mark the businessProfile as modified
    user.markModified('businessProfile');

    // Save the user (encryption happens in pre-save hook)
    const updatedUser = await user.save();

    // Return response with masked payment info
    const responseUser = updatedUser.toObject();
    if (responseUser.businessProfile?.paymentInfo) {
      responseUser.businessProfile.paymentInfo = updatedUser.getMaskedPaymentInfo();
    }

    console.log('Business profile updated successfully');
    res.json({
      message: 'Business profile updated successfully',
      user: {
        _id: responseUser._id,
        name: responseUser.name,
        email: responseUser.email,
        role: responseUser.role,
        businessProfile: responseUser.businessProfile
      }
    });

  } catch (error) {
    console.error('Error updating business profile:', error);
    res.status(500).json({ 
      message: 'Error updating business profile',
      error: error.message 
    });
  }
};

// Change password function
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        message: 'Current password and new password are required' 
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        message: 'New password must be at least 6 characters long' 
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.password) {
      return res.status(400).json({ 
        message: 'Cannot change password for OAuth accounts' 
      });
    }

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Update password (will be hashed by pre-save hook)
    user.password = newPassword;
    await user.save();

    console.log('Password changed successfully for user:', userId);
    res.json({ message: 'Password changed successfully' });

  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ 
      message: 'Error changing password',
      error: error.message 
    });
  }
};

// Verify user password for sensitive operations
exports.verifyPassword = async (req, res) => {
  try {
    const { password } = req.body;
    
    if (!password) {
      return res.status(400).json({ 
        valid: false, 
        message: 'Password is required' 
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ 
        valid: false, 
        message: 'User not found' 
      });
    }

    // Compare the provided password with the stored hash
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (isValidPassword) {
      res.json({ 
        valid: true,
        message: 'Password verified successfully'
      });
    } else {
      res.status(400).json({ 
        valid: false, 
        message: 'Incorrect password' 
      });
    }
  } catch (error) {
    console.error('Error verifying password:', error);
    res.status(500).json({ 
      valid: false,
      message: 'Error verifying password' 
    });
  }
};

// Get decrypted payment information (requires password verification)
exports.getDecryptedPaymentInfo = async (req, res) => {
  try {
    const { password } = req.body;
    
    if (!password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password is required' 
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Verify password first
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Incorrect password' 
      });
    }

    // Get decrypted payment info
    const paymentInfo = user.businessProfile?.paymentInfo || {};
    
    // Import decrypt function at the top of your file if not already imported
    const { decrypt } = require('../utils/encryption');
    
    const decryptedPaymentInfo = {
      bankName: paymentInfo.bankName || '',
      accountHolderName: paymentInfo.accountHolderName || '',
      accountNumber: paymentInfo.accountNumber ? decrypt(paymentInfo.accountNumber) : '',
      routingNumber: paymentInfo.routingNumber ? decrypt(paymentInfo.routingNumber) : ''
    };

    res.json({ 
      success: true,
      paymentInfo: decryptedPaymentInfo
    });
  } catch (error) {
    console.error('Error getting decrypted payment info:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error retrieving payment information' 
    });
  }
};

// Get user's Caicos Credits
exports.getCaicosCredits = async (req, res) => {
  try {
    const userId = req.user.id; // Assumes you have auth middleware that sets req.user
    
    const user = await User.findById(userId).select('caicosCredits');
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    res.status(200).json({
      success: true,
      caicosCredits: user.caicosCredits || 0
    });
    
  } catch (error) {
    console.error('Error fetching Caicos Credits:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while fetching credits' 
    });
  }
};