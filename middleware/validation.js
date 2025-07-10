// middleware/validation.js - Input validation middleware
const { body, validationResult } = require('express-validator');

// Validation error handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// User registration validation
const validateUserRegistration = [
  body('name')
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters')
    .trim()
    .escape(),
  body('username')
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .isAlphanumeric()
    .withMessage('Username must contain only letters and numbers')
    .trim()
    .escape(),
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  handleValidationErrors
];

// User login validation
const validateUserLogin = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors
];

// Booking validation
const validateBooking = [
  body('category')
    .isIn(['activity', 'stay', 'dining', 'transportation'])
    .withMessage('Invalid booking category'),
  body('numOfPeople')
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage('Number of people must be between 1 and 20'),
  body('date')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid date'),
  body('paymentDetails.totalAmount')
    .isFloat({ min: 0 })
    .withMessage('Total amount must be a positive number'),
  body('paymentDetails.paymentMethod')
    .isIn(['card', 'cash', 'transfer'])
    .withMessage('Invalid payment method'),
  handleValidationErrors
];

// Payment validation
const validatePaymentIntent = [
  body('amount')
    .isFloat({ min: 1 })
    .withMessage('Amount must be at least $1'),
  body('currency')
    .optional()
    .isIn(['usd'])
    .withMessage('Only USD currency is supported'),
  handleValidationErrors
];

// Activity validation
const validateActivity = [
  body('name')
    .isLength({ min: 5, max: 100 })
    .withMessage('Activity name must be between 5 and 100 characters')
    .trim()
    .escape(),
  body('description')
    .isLength({ min: 20, max: 1000 })
    .withMessage('Description must be between 20 and 1000 characters')
    .trim(),
  body('location')
    .notEmpty()
    .withMessage('Location is required')
    .trim()
    .escape(),
  body('island')
    .isIn(['Providenciales', 'Grand Turk', 'North Caicos', 'Middle Caicos', 'South Caicos', 'Salt Cay'])
    .withMessage('Invalid island'),
  body('price')
    .isFloat({ min: 1 })
    .withMessage('Price must be at least $1'),
  body('category')
    .isIn(['watersports', 'adventure', 'cultural', 'nature', 'food', 'sailing', 'diving', 'fishing'])
    .withMessage('Invalid category'),
  handleValidationErrors
];

module.exports = {
  validateUserRegistration,
  validateUserLogin,
  validateBooking,
  validatePaymentIntent,
  validateActivity,
  handleValidationErrors
};

