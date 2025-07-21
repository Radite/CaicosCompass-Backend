const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const cors = require('cors');
const helmet = require('helmet');
const passport = require('passport');

// Load env variables
dotenv.config();

// Connect to MongoDB
connectDB();

// Initialize app
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'], // Add your frontend URLs
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50mb' })); // Increase from default 100kb
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use(helmet());
app.use(passport.initialize());
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

// Home Route
app.get('/', (req, res) => {
  res.send('Backend API is running...');
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
