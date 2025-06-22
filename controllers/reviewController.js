// controllers/reviewController.js
const Review = require('../models/Review'); // Adjust the path if necessary
const Service = require('../models/Service'); // (Optional) for service existence verification

// Create a new review
exports.createReview = async (req, res) => {
  try {
    const { service, serviceType, option, room, stars, title, description } = req.body;
    // Use req.user.id as set by the protect middleware
    const user = req.user.id;

    // Optionally, verify that the service exists (if desired)
    // const serviceExists = await Service.findById(service);
    // if (!serviceExists) {
    //   return res.status(404).json({ message: 'Service not found' });
    // }

    // Check for an existing review to enforce one review per target per user.
    const existingReview = await Review.findOne({
      user,
      service,
      serviceType,
      option: option || null,
      room: room || null,
    });

    if (existingReview) {
      return res
        .status(400)
        .json({ message: 'You have already left a review for this target.' });
    }

    const review = new Review({
      user,
      service,
      serviceType,
      option: option || null,
      room: room || null,
      stars,
      title,
      description,
    });

    const savedReview = await review.save();
    return res.status(201).json(savedReview);
  } catch (error) {
    console.error('Error creating review:', error.message);
    return res.status(500).json({ message: error.message });
  }
};

// Get all reviews for a specific service
exports.getReviewsForService = async (req, res) => {
  try {
    const { serviceId } = req.params;
    const reviews = await Review.find({ service: serviceId })
      .populate('user', 'name email') // Populate user fields as needed
      .exec();

    return res.json(reviews);
  } catch (error) {
    console.error('Error fetching reviews:', error.message);
    return res.status(500).json({ message: error.message });
  }
};

// Update a review (only allowed for the review owner)
exports.updateReview = async (req, res) => {
  try {
    const reviewId = req.params.id;
    const user = req.user.id;
    const review = await Review.findById(reviewId);

    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    // Only allow the review owner to update
    if (review.user.toString() !== user.toString()) {
      return res
        .status(403)
        .json({ message: 'Not authorized to update this review' });
    }

    const { stars, title, description } = req.body;
    if (stars !== undefined) review.stars = stars;
    if (title !== undefined) review.title = title;
    if (description !== undefined) review.description = description;
    review.updatedAt = Date.now();

    const updatedReview = await review.save();
    return res.json(updatedReview);
  } catch (error) {
    console.error('Error updating review:', error.message);
    return res.status(500).json({ message: error.message });
  }
};

// Delete a review (only allowed for the review owner)
exports.deleteReview = async (req, res) => {
  try {
    const reviewId = req.params.id;
    const user = req.user.id;
    const review = await Review.findById(reviewId);

    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    if (review.user.toString() !== user.toString()) {
      return res
        .status(403)
        .json({ message: 'Not authorized to delete this review' });
    }

    await review.remove();
    return res.json({ message: 'Review removed successfully' });
  } catch (error) {
    console.error('Error deleting review:', error.message);
    return res.status(500).json({ message: error.message });
  }
};
