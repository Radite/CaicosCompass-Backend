const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    item: { type: mongoose.Schema.Types.ObjectId, required: true }, // Reference to the reviewed item
    itemType: {
      type: String,
      enum: ['activity', 'stay', 'dining', 'transportation'], // Type of the reviewed item
      required: true,
    },
    stars: { type: Number, required: true, min: 1, max: 5 }, // Rating from 1 to 5
    title: { type: String }, // Optional title of the review
    description: { type: String }, // Detailed review
    createdAt: { type: Date, default: Date.now }, // Creation timestamp
    updatedAt: { type: Date, default: Date.now }, // Last update timestamp
    helpfulVotes: { type: Number, default: 0 }, // Helpful vote count
    replies: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Admin or host replying
        comment: { type: String, required: true }, // Reply content
        createdAt: { type: Date, default: Date.now }, // Reply timestamp
      },
    ],
  },
  { timestamps: true }
);

// Ensure uniqueness of reviews for a user and an item of a specific type
ReviewSchema.index({ user: 1, item: 1, itemType: 1 }, { unique: true });

module.exports = mongoose.model('Review', ReviewSchema);
