// Service.js (Base Model)
const mongoose = require('mongoose');

const BaseServiceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    location: { type: String, required: true },
    coordinates: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
    },
    images: [
      {
        url: { type: String, required: true },
        isMain: { type: Boolean, default: false },
      },
    ],
    island: { type: String, required: true },

    // Changed from host to vendor
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      validate: {
        validator: async function(vendorId) {
          const user = await mongoose.model('User').findById(vendorId);
          return user && user.role === 'business-manager' && user.businessProfile?.isApproved;
        },
        message: 'Vendor must be an approved business manager'
      }
    },

    reviews: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        rating: { type: Number, min: 1, max: 5, required: true },
        comment: { type: String },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { discriminatorKey: 'serviceType', timestamps: true }
);

const Service = mongoose.model('Service', BaseServiceSchema);
module.exports = Service;
