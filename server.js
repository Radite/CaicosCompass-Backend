const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const cors = require('cors');
const helmet = require('helmet');
const passport = require('passport');
const path = require('path');
const fs = require('fs');

// Load env variables
dotenv.config();

// Connect to MongoDB
connectDB();

// Initialize app
const app = express();
const PORT = process.env.PORT || 5000;

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('Created uploads directory at:', uploadsDir);
}

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'], // Add your frontend URLs
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50mb' })); // Increase from default 100kb
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Updated helmet configuration to allow images
app.use(helmet({
  crossOriginResourcePolicy: { 
    policy: "cross-origin" 
  },
  crossOriginEmbedderPolicy: false, // Allow embedding images
  contentSecurityPolicy: false // Disable CSP that might block images
}));

app.use(passport.initialize());

// Serve static files from uploads directory with proper headers
app.use('/uploads', (req, res, next) => {
  // Add CORS headers specifically for uploads
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  // Set cache headers for images
  if (req.path.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
    res.header('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
  }
  
  next();
}, express.static(uploadsDir, {
  setHeaders: (res, path) => {
    // Additional headers for static files
    res.set('Access-Control-Allow-Origin', '*');
  }
}));

// Debug middleware to log upload requests
app.use('/uploads', (req, res, next) => {
  console.log(`Static file request: ${req.method} ${req.url}`);
  console.log(`File path: ${path.join(uploadsDir, req.path)}`);
  console.log(`File exists: ${fs.existsSync(path.join(uploadsDir, req.path))}`);
  next();
});

// Routes
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/favorites-wishlist', require('./routes/favoriteWishlistRoutes'));
app.use('/api/activities', require('./routes/activityRoutes'));
app.use('/api/bookings', require('./routes/bookingRoutes'));
app.use('/api/cart', require('./routes/cartRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));
app.use('/api/stays', require('./routes/stayRoutes'));
app.use('/api/transportations', require('./routes/transportationRoutes'));
app.use('/api/dinings', require('./routes/diningRoutes'));
app.use('/api/services', require('./routes/serviceRoutes'));
app.use('/api/reviews', require('./routes/reviewRoutes'));
app.use('/api/vendor', require('./routes/vendorRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/info', require('./routes/infoRoutes'));
app.use('/api/forgot', require('./routes/forgotRoutes'));

// FAQ Routes
app.use('/api/faqs', require('./routes/faqRoutes'));
app.use('/api/categories', require('./routes/categoryRoutes'));
app.use('/api/upload', require('./routes/uploadRoutes'));

// Debug route to check uploads directory
app.get('/api/debug/uploads', (req, res) => {
  try {
    const files = fs.readdirSync(uploadsDir);
    res.json({
      uploadsDir,
      fileCount: files.length,
      files: files.slice(0, 10), // Show first 10 files
      testFile: req.query.file ? {
        filename: req.query.file,
        exists: fs.existsSync(path.join(uploadsDir, req.query.file)),
        fullPath: path.join(uploadsDir, req.query.file)
      } : null
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Home Route
app.get('/', (req, res) => {
  res.send('Backend API is running...');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Static files served from: ${uploadsDir}`);
  console.log(`Test your images at: http://localhost:${PORT}/uploads/your-filename.jpg`);
});