const mongoose = require('mongoose');

// Room Schema
const RoomSchema = new mongoose.Schema({
  name: { type: String, required: true },
  pricePerNight: { type: Number, required: true },
  maxGuests: { type: Number, required: true },
  amenities: [{ type: String }],
  bedType: { type: String },
  bathrooms: { type: Number, default: 1 },
  bedrooms: { type: Number },
  beds: { type: Number },
  images: [{ type: String }],
  allowsKids: { type: Boolean, default: true },
  allowsInfants: { type: Boolean, default: true },
  bookings: [
    {
      checkIn: { type: Date, required: true },
      checkOut: { type: Date, required: true },
    },
  ],
  blockedDates: [
    {
      startDate: { type: Date, required: true },
      endDate: { type: Date, required: true },
    },
  ],
  availableOccupancy: { type: Number, default: 0 },
});

// Stay Schema
const StaySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    pricePerNight: { type: Number },
    type: { type: String, enum: ['Hotel', 'Villa', 'Airbnb'], required: true },
    bedrooms: { type: Number },
    beds: { type: Number },
    bathrooms: { type: Number },
    amenities: [{ type: String }],
    standoutStays: { type: Boolean, default: false },
    petsAllowed: { type: Boolean, default: false },
    selfCheckIn: { type: Boolean, default: false },
    images: [{ type: String }],
    island: { type: String, required: true },
    ratings: { type: Number, default: 0 },
    reviews: { type: Number, default: 0 },
    maxGuests: { type: Number, required: true },
    allowsKids: { type: Boolean, default: true },
    allowsInfants: { type: Boolean, default: true },
    location: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
    },
    bookings: [
      {
        checkIn: { type: Date, required: true },
        checkOut: { type: Date, required: true },
      },
    ],
    blockedDates: [
      {
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true },
      },
    ],
    rooms: [RoomSchema],
    dynamicPricing: [
      {
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true },
        pricePerNight: { type: Number, required: true },
      },
    ],
    policies: {
      checkInTime: { type: String },
      checkOutTime: { type: String },
      cancellationPolicy: { type: String },
    },
    ratingBreakdown: {
      cleanliness: { type: Number, default: 0, min: 0, max: 5 },
      communication: { type: Number, default: 0, min: 0, max: 5 },
      location: { type: Number, default: 0, min: 0, max: 5 },
      value: { type: Number, default: 0, min: 0, max: 5 },
    },
    tags: [{ type: String }],
    promotions: [
      {
        title: { type: String },
        discountPercentage: { type: Number, default: 0 },
        startDate: { type: Date },
        endDate: { type: Date },
      },
    ],
    accessibility: {
      wheelchairAccessible: { type: Boolean, default: false },
      elevatorAvailable: { type: Boolean, default: false },
      specialFeatures: [{ type: String }],
    },
    reviews: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        stars: { type: Number, required: true, min: 1, max: 5 },
        title: { type: String },
        description: { type: String },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Stay', StaySchema);
