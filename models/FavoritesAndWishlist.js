const mongoose = require('mongoose');

const FavoritesAndWishlistSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true }, // References Service model
    optionId: { type: mongoose.Schema.Types.ObjectId }, // Room (for stays) or option (for transportation/activities)
    type: { 
      type: String, 
      enum: ['favorite', 'wishlist'], 
      required: true 
    }, 
  },
  { timestamps: true }
);

module.exports = mongoose.model('FavoritesAndWishlist', FavoritesAndWishlistSchema);
