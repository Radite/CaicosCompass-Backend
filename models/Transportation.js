const mongoose = require('mongoose');

// Option Schema for Multiple Vehicles or Ride-Share Options
const OptionSchema = new mongoose.Schema({
  title: { type: String, required: true }, // E.g., "Sedan", "SUV", "Shared Shuttle"
  description: { type: String },
  capacity: { type: Number, default: 4 }, // Max passengers for this option
  flatPrice: { type: Number }, // Flat price for the option
  pricePerMile: { type: Number }, // Price per mile for the option
  pricePerHour: { type: Number }, // Hourly rate for rental cars
  minimumFare: { type: Number, default: 0 }, // Minimum fare
  amenities: [{ type: String }], // E.g., "Wi-Fi", "Child Seat"
  images: [
    {
      url: { type: String, required: true },
      isMain: { type: Boolean, default: false },
    }
  ],
  vehicleDetails: {
    make: { type: String },
    model: { type: String },
    year: { type: Number },
    fuelType: { type: String, enum: ['Gasoline', 'Diesel', 'Electric', 'Hybrid'] },
    transmission: { type: String, enum: ['Automatic', 'Manual'] },
    mileageLimit: { type: Number },
    extraMileageCharge: { type: Number }, // Charge per mile over the limit
  },
  availability: [
    {
      date: { type: Date, required: true },
      isAvailable: { type: Boolean, default: true },
    }
  ],
  blockedDates: [
    {
      startDate: { type: Date, required: true },
      endDate: { type: Date, required: true },
    }
  ],
  dynamicPricing: [
    {
      startDate: { type: Date, required: true },
      endDate: { type: Date, required: true },
      priceMultiplier: { type: Number, default: 1 },
    }
  ],
  pickupSpots: [{ type: String }], // Array of available pickup spots for this option
  dropoffSpots: [{ type: String }], // Array of available drop-off spots for this option
});

const TransportationSchema = new mongoose.Schema(
  {
    type: { 
      type: String, 
      enum: ['Car Rental', 'Taxi', 'Airport Transfer', 'Shuttle', 'Scooter', 'Bicycle', 'Water Taxi', 'Ferry', 'Chauffeur', 'Adventure'], 
      required: true 
    },
    title: { type: String, required: true }, 
    description: { type: String, required: true },
    pricingModel: { 
      type: String, 
      enum: ['flat', 'per-mile', 'per-hour'], // Include hourly pricing for rental cars
      required: true 
    },
    flatPrice: { type: Number },
    pricePerMile: { type: Number },
    pricePerHour: { type: Number }, // Hourly rate for rental cars
    minimumFare: { type: Number, default: 0 },
    fixedRoutes: [
      {
        title: { type: String, required: true }, // Route name, e.g., "Airport to Grace Bay"
        description: { type: String },
        pickupLocation: { type: String, required: true },
        dropoffLocation: { type: String, required: true },
        pickupTime: { type: String }, // Optional pickup time
        dropoffTime: { type: String }, // Optional dropoff time
        distance: { type: Number, required: true },
        price: { type: Number, required: true },
      }
    ],
    capacity: { type: Number, default: 4 }, // Max passengers for standalone transportation
    options: [OptionSchema], // Array of options for multi-vehicle or ride-share services
    bookings: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        date: { type: Date, required: true },
        pickupLocation: { type: String, required: true }, // Selected pickup location for the booking
        dropoffLocation: { type: String, required: true }, // Selected dropoff location for the booking
        pickupTime: { type: String }, // User-specific pickup time
        dropoffTime: { type: String }, // User-specific dropoff time
        numPassengers: { type: Number, required: true },
        selectedOption: { type: mongoose.Schema.Types.ObjectId, ref: 'Option' }, // Reference to a specific option
        totalCost: { type: Number, required: true },
      }
    ],
    amenities: [{ type: String }],
    insuranceDetails: {
      isInsured: { type: Boolean, default: false },
      coverageAmount: { type: Number },
    },
    reviews: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        rating: { type: Number, min: 1, max: 5, required: true },
        comment: { type: String },
        createdAt: { type: Date, default: Date.now },
      }
    ],
    cancellationPolicy: {
      freeCancellationUntil: { type: Number, default: 24 }, // Hours before booking time
      cancellationFee: { type: Number }, // Fee for late cancellations
    },
    island: { type: String, required: true }, // Base location
    coordinates: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
    },
    images: [
      {
        url: { type: String, required: true },
        isMain: { type: Boolean, default: false },
      }
    ],
    blockedDates: [
      {
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true },
      }
    ], // Blocked availability for the entire service
    pickupSpots: [{ type: String }], // Array of available global pickup spots
    dropoffSpots: [{ type: String }], // Array of available global dropoff spots
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Transportation', TransportationSchema);
