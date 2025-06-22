const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  try {
    console.log('Incoming Request:', req.originalUrl);
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      console.error('Authorization header missing');
      return res.status(401).json({ message: 'Not authorized, token missing' });
    }

    // Decode and verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Decoded Token:', decoded);

    // Fetch user from the database including the 'role'
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      console.error('User not found for decoded ID:', decoded.id);
      return res.status(404).json({ message: 'User not found' });
    }

    // Attach the user to the request with role
    req.user = {
      id: user._id.toString(),
      email: user.email,
      role: user.role, // Include role here
    };
    console.log('Authenticated User:', req.user);

    next(); // Pass control to the next middleware/route
  } catch (error) {
    console.error('Error in protect middleware:', error.message);
    res.status(401).json({ message: 'Not authorized, token failed' });
  }
};



const adminProtect = async (req, res, next) => {
  try {
    console.log('--- AdminProtect Middleware Triggered ---');

    await protect(req, res, async () => {
      console.log('Authenticated User:', req.user); // Log entire user object

      if (!req.user) {
        console.error('❌ No user found in request.');
        return res.status(403).json({ message: 'Access denied. Admins only.' });
      }

      console.log('✅ User ID:', req.user._id);
      console.log('✅ User Role:', req.user.role);

      if (req.user.role !== 'admin') {
        console.error('❌ Access denied. User is not an admin.');
        return res.status(403).json({ message: 'Access denied. Admins only.' });
      }

      console.log('✅ Access granted to admin.');
      next();
    });
  } catch (error) {
    console.error('❌ Error in adminProtect middleware:', error.message);
    return res.status(403).json({ message: 'Access denied. Admins only.' });
  }
};

const businessManagerProtect = async (req, res, next) => {
  try {
    console.log('BusinessManagerProtect Middleware Triggered');

    await protect(req, res, async () => {
      console.log('Authenticated User Role:', req.user.role);

      if (req.user.role !== 'business-manager') {
        console.error('Access denied. User is not a business manager.');
        return res.status(403).json({ message: 'Access denied. Business managers only.' });
      }

      next();
    });
  } catch (error) {
    console.error('Error in businessManagerProtect middleware:', error.message);
    return res.status(403).json({ message: 'Access denied. Business managers only.' });
  }
};

module.exports = { protect, adminProtect, businessManagerProtect };
