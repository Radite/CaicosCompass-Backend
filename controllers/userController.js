const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { generateToken } = require('../utils/jwtUtils');
const Activity = require('../models/Activity');
const Stay = require('../models/Stay');
const Dining = require('../models/Dining');
const Transportation = require('../models/Transportation');
const { check, validationResult } = require('express-validator');
const nodemailer = require('nodemailer');
const { sendVerificationEmail } = require('./emailService');  // Ensure correct path
const crypto = require('crypto');
const { sendPasswordResetEmail } = require('./emailService');


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
// Backend: Generate reset token and send email
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

// Google OAuth Client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// User Registration
// User Registration Function
exports.registerUser = async (req, res) => {
  try {
    const { name, username, email, password } = req.body;

    if (!name || !username || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    console.log('Generated Verification Token:', verificationToken);

    const verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours expiration

    const user = await User.create({
      name,
      username,
      email,
      password,
      verificationToken,
      verificationTokenExpires,
    });

    // Generate verification link
    const verificationLink = `${process.env.FRONTEND_URL}/--/verify-email?token=${verificationToken}`;
    console.log('Generated Verification Link:', verificationLink);
    await sendVerificationEmail(user.email, verificationLink);

    res.status(201).json({
      message: 'User registered successfully. Please check your email for verification link.',
    });
  } catch (error) {
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

exports.googleLogin = [
  check('token', 'Google token is required').notEmpty(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { token } = req.body;

      const ticket = await googleClient.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      let user = await User.findOne({ email: payload.email });

      if (!user) {
        user = await User.create({
          name: payload.name,
          email: payload.email,
          authProvider: 'google',
          providerId: payload.sub,
        });
      }

      res.json({
        _id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user.id),
      });
    } catch (error) {
      res.status(500).json({ message: 'Error processing request' });
    }
  },
];

// User Profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (user) {
      user.name = req.body.name || user.name;
      user.username = req.body.username || user.username;
      user.email = req.body.email || user.email;

      if (req.body.password) {
        user.password = req.body.password; // Password hashing handled in model
      }

      const updatedUser = await user.save();
      res.json(updatedUser);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
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

exports.getBusinessDashboard = async (req, res) => {
  res.status(200).json({ message: 'Welcome to the business dashboard' });
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

