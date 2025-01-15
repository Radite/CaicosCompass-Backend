const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { generateToken } = require('../utils/jwtUtils');

// Google OAuth Client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Authentication
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

    const user = await User.create({ name, username, email, password });

    res.status(201).json({
      _id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Log the email and password for debugging (only in a secure dev/test environment)
    console.log('Login Attempt:', { email, password });

    if (!email || !password) {
      console.log('Missing email or password');
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    if (user && (await bcrypt.compare(password, user.password))) {
      console.log('Login Successful:', { email });
      res.json({
        success: true, // Add this key
        _id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user.id),
      });
    } else {
      console.log('Invalid email or password:', { email });
      res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
    
  } catch (error) {
    console.error('Error during login:', error.message);
    res.status(500).json({ message: error.message });
  }
};

exports.logoutUser = (req, res) => {
  res.status(200).json({ message: 'User logged out successfully' });
};

exports.googleLogin = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ message: 'Token is required' });
    }

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
    res.status(500).json({ message: error.message });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const resetToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: '1h',
    });

    // TODO: Send resetToken via email (integrate email service)
    res.status(200).json({ message: 'Reset token generated', resetToken });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

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
  const { category, itemId, optionId } = req.body; // Accept category, itemId (standalone), and optionId (optional)
  const user = await User.findById(req.user.id);

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
    // Add the favorite
    user.favorites.push({ category, itemId, optionId });
  }

  await user.save();
  res.json(user.favorites);
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
