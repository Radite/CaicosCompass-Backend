const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  try {
    let token;

    // Log incoming headers
    console.log('Incoming Headers:', JSON.stringify(req.headers, null, 2));

    // Extract token
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
      console.log('Extracted Token:', token);
    }

    if (!token) {
      console.error('Authorization header missing or malformed');
      return res.status(401).json({ message: 'Not authorized, token missing' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Decoded Token:', decoded);

    // Fetch user and attach to request
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) {
      console.error('User not found for ID:', decoded.id);
      return res.status(401).json({ message: 'User not found' });
    }

    console.log('Authenticated User:', req.user);
    next();
  } catch (error) {
    console.error('Error in protect middleware:', error.message);
    return res.status(401).json({ message: 'Not authorized, invalid token' });
  }
};

const adminProtect = async (req, res, next) => {
  try {
    console.log('AdminProtect Middleware Triggered');

    await protect(req, res, async () => {
      console.log('Authenticated User Role:', req.user.role);

      if (req.user.role !== 'admin') {
        console.error('Access denied. User is not an admin.');
        return res.status(403).json({ message: 'Access denied. Admins only.' });
      }

      next();
    });
  } catch (error) {
    console.error('Error in adminProtect middleware:', error.message);
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
