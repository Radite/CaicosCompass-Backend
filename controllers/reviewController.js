// reviewController.js
const Review = require('../models/Review');

// Add a new review
exports.addReview = async (req, res) => {
  try {
    const { item, itemType, stars, title, description } = req.body;

    const existingReview = await Review.findOne({ user: req.user.id, item, itemType });
    if (existingReview) {
      return res.status(400).json({ message: 'You have already reviewed this item.' });
    }

    const review = await Review.create({
      user: req.user.id,
      item,
      itemType,
      stars,
      title,
      description,
    });

    res.status(201).json({ success: true, data: review });
  } catch (error) {
    console.error('Error adding review:', error.message);
    res.status(500).json({ success: false, message: 'Error adding review.', error: error.message });
  }
};

// Get all reviews with optional filters
exports.getReviews = async (req, res) => {
  try {
    const { item, itemType, user } = req.query;
    const filters = {};

    if (item) filters.item = item;
    if (itemType) filters.itemType = itemType;
    if (user) filters.user = user;

    const reviews = await Review.find(filters).populate('user').sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: reviews });
  } catch (error) {
    console.error('Error fetching reviews:', error.message);
    res.status(500).json({ success: false, message: 'Error fetching reviews.', error: error.message });
  }
};

// Get a single review by ID
exports.getReviewById = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id).populate('user');
    if (!review) {
      return res.status(404).json({ message: 'Review not found.' });
    }
    res.status(200).json({ success: true, data: review });
  } catch (error) {
    console.error('Error fetching review:', error.message);
    res.status(500).json({ success: false, message: 'Error fetching review.', error: error.message });
  }
};

// Update a review
exports.updateReview = async (req, res) => {
  try {
    const { stars, title, description } = req.body;
    const review = await Review.findOne({ _id: req.params.id, user: req.user.id });

    if (!review) {
      return res.status(404).json({ message: 'Review not found or not authorized to update.' });
    }

    if (stars) review.stars = stars;
    if (title) review.title = title;
    if (description) review.description = description;
    review.updatedAt = new Date();

    await review.save();
    res.status(200).json({ success: true, data: review });
  } catch (error) {
    console.error('Error updating review:', error.message);
    res.status(500).json({ success: false, message: 'Error updating review.', error: error.message });
  }
};

// Delete a review
exports.deleteReview = async (req, res) => {
  try {
    const review = await Review.findOneAndDelete({ _id: req.params.id, user: req.user.id });

    if (!review) {
      return res.status(404).json({ message: 'Review not found or not authorized to delete.' });
    }

    res.status(200).json({ success: true, message: 'Review deleted successfully.' });
  } catch (error) {
    console.error('Error deleting review:', error.message);
    res.status(500).json({ success: false, message: 'Error deleting review.', error: error.message });
  }
};

// Mark a review as helpful
exports.markHelpful = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({ message: 'Review not found.' });
    }

    review.helpfulVotes += 1;
    await review.save();

    res.status(200).json({ success: true, message: 'Review marked as helpful.', data: review });
  } catch (error) {
    console.error('Error marking review as helpful:', error.message);
    res.status(500).json({ success: false, message: 'Error marking review as helpful.', error: error.message });
  }
};

// Add a reply to a review
exports.addReply = async (req, res) => {
  try {
    const { comment } = req.body;
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({ message: 'Review not found.' });
    }

    review.replies.push({ user: req.user.id, comment });
    await review.save();

    res.status(200).json({ success: true, message: 'Reply added successfully.', data: review });
  } catch (error) {
    console.error('Error adding reply to review:', error.message);
    res.status(500).json({ success: false, message: 'Error adding reply to review.', error: error.message });
  }
};
