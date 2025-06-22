const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema(
  {
    user: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User', 
      required: true 
    },
    // Reference to the service (activity, stay, dining, transportation)
    service: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Service', 
      required: true 
    },
    // The type of service (helps determine which subfields are relevant)
    serviceType: {
      type: String,
      enum: ['activity', 'stay', 'dining', 'transportation'],
      required: true,
    },
    // Optional: if reviewing a specific option (e.g. an option in transportation or activity)
    option: { 
      type: mongoose.Schema.Types.ObjectId, 
      default: null 
    },
    // Optional: if reviewing a specific room for stays (rooms are subdocuments that get an _id by default)
    room: { 
      type: mongoose.Schema.Types.ObjectId, 
      default: null 
    },
    stars: { 
      type: Number, 
      required: true, 
      min: 1, 
      max: 5 
    },
    title: { type: String },        // Optional title of the review
    description: { type: String },    // Detailed review text
    helpfulVotes: { type: Number, default: 0 },
    replies: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Admin/host reply
        comment: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

// Enforce uniqueness so that a user can leave only one review per service target.
// For a general review (no option or room), this ensures one review per service per user.
// For specific reviews, uniqueness is applied on the combination.
ReviewSchema.index(
  { user: 1, service: 1, serviceType: 1, option: 1, room: 1 },
  { unique: true }
);

module.exports = mongoose.model('Review', ReviewSchema);
