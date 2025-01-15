const Transportation = require('../models/Transportation');
const Booking = require('../models/Booking'); // Assuming you have a separate Booking model

// Get all transportation services
exports.getAllTransportation = async (req, res) => {
  try {
    const transportation = await Transportation.find();
    res.status(200).json({ success: true, data: transportation });
  } catch (error) {
    console.error('Error fetching transportation services:', error.message);
    res.status(500).json({ success: false, message: 'Error fetching transportation services.' });
  }
};

// Filter available transportation
exports.filterAvailableTransportation = async (req, res) => {
  try {
    const { startDate, endDate, pickupSpot, dropoffSpot } = req.query;

    const query = {
      blockedDates: {
        $not: {
          $elemMatch: {
            $or: [
              { startDate: { $lte: new Date(endDate) }, endDate: { $gte: new Date(startDate) } },
            ],
          },
        },
      },
    };

    if (pickupSpot) query.pickupSpots = pickupSpot;
    if (dropoffSpot) query.dropoffSpots = dropoffSpot;

    const availableTransportation = await Transportation.find(query);
    res.status(200).json({ success: true, data: availableTransportation });
  } catch (error) {
    console.error('Error filtering transportation:', error.message);
    res.status(500).json({ success: false, message: 'Error filtering transportation.' });
  }
};

// Get a specific transportation service by ID
exports.getTransportationById = async (req, res) => {
  try {
    const transportation = await Transportation.findById(req.params.id);
    if (!transportation) return res.status(404).json({ message: 'Transportation service not found.' });
    res.status(200).json({ success: true, data: transportation });
  } catch (error) {
    console.error('Error fetching transportation service:', error.message);
    res.status(500).json({ success: false, message: 'Error fetching transportation service.' });
  }
};

// Create a new transportation service
exports.createTransportation = async (req, res) => {
  try {
    const newTransportation = await Transportation.create(req.body);
    res.status(201).json({ success: true, data: newTransportation });
  } catch (error) {
    console.error('Error creating transportation service:', error.message);
    res.status(500).json({ success: false, message: 'Error creating transportation service.' });
  }
};

// Update a transportation service
exports.updateTransportation = async (req, res) => {
  try {
    const updatedTransportation = await Transportation.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedTransportation) return res.status(404).json({ message: 'Transportation service not found.' });
    res.status(200).json({ success: true, data: updatedTransportation });
  } catch (error) {
    console.error('Error updating transportation service:', error.message);
    res.status(500).json({ success: false, message: 'Error updating transportation service.' });
  }
};

// Delete a transportation service
exports.deleteTransportation = async (req, res) => {
  try {
    const deletedTransportation = await Transportation.findByIdAndDelete(req.params.id);
    if (!deletedTransportation) return res.status(404).json({ message: 'Transportation service not found.' });
    res.status(200).json({ success: true, message: 'Transportation service deleted successfully.' });
  } catch (error) {
    console.error('Error deleting transportation service:', error.message);
    res.status(500).json({ success: false, message: 'Error deleting transportation service.' });
  }
};

// Add a new booking for transportation
exports.bookTransportation = async (req, res) => {
  try {
    const { date, pickupLocation, dropoffLocation, pickupTime, dropoffTime, numPassengers, selectedOption, totalCost } = req.body;

    const transportation = await Transportation.findById(req.params.id);
    if (!transportation) return res.status(404).json({ message: 'Transportation service not found.' });

    const booking = {
      user: req.user._id,
      date,
      pickupLocation,
      dropoffLocation,
      pickupTime,
      dropoffTime,
      numPassengers,
      selectedOption,
      totalCost,
    };

    transportation.bookings.push(booking);
    await transportation.save();

    res.status(201).json({ success: true, data: booking });
  } catch (error) {
    console.error('Error creating booking:', error.message);
    res.status(500).json({ success: false, message: 'Error creating booking.' });
  }
};

// Get bookings for a specific transportation service
exports.getBookingsForTransportation = async (req, res) => {
  try {
    const transportation = await Transportation.findById(req.params.id).populate('bookings.user');
    if (!transportation) return res.status(404).json({ message: 'Transportation service not found.' });
    res.status(200).json({ success: true, data: transportation.bookings });
  } catch (error) {
    console.error('Error fetching bookings:', error.message);
    res.status(500).json({ success: false, message: 'Error fetching bookings.' });
  }
};

// Add blocked dates to a transportation service
exports.addBlockedDates = async (req, res) => {
  try {
    const transportation = await Transportation.findById(req.params.id);
    if (!transportation) return res.status(404).json({ message: 'Transportation service not found.' });

    transportation.blockedDates.push(req.body);
    await transportation.save();

    res.status(200).json({ success: true, data: transportation });
  } catch (error) {
    console.error('Error adding blocked dates:', error.message);
    res.status(500).json({ success: false, message: 'Error adding blocked dates.' });
  }
};

// Remove blocked dates from a transportation service
exports.removeBlockedDates = async (req, res) => {
  try {
    const transportation = await Transportation.findById(req.params.id);
    if (!transportation) return res.status(404).json({ message: 'Transportation service not found.' });

    transportation.blockedDates = transportation.blockedDates.filter(
      (blocked) => blocked._id.toString() !== req.body.id
    );
    await transportation.save();

    res.status(200).json({ success: true, data: transportation });
  } catch (error) {
    console.error('Error removing blocked dates:', error.message);
    res.status(500).json({ success: false, message: 'Error removing blocked dates.' });
  }
};

// Add a new option to a transportation service
exports.addOption = async (req, res) => {
  try {
    const transportation = await Transportation.findById(req.params.id);
    if (!transportation) return res.status(404).json({ message: 'Transportation service not found.' });

    transportation.options.push(req.body);
    await transportation.save();

    res.status(201).json({ success: true, data: transportation });
  } catch (error) {
    console.error('Error adding option:', error.message);
    res.status(500).json({ success: false, message: 'Error adding option.' });
  }
};

// Update an option in a transportation service
exports.updateOption = async (req, res) => {
  try {
    const transportation = await Transportation.findById(req.params.id);
    if (!transportation) return res.status(404).json({ message: 'Transportation service not found.' });

    const option = transportation.options.id(req.params.optionId);
    if (!option) return res.status(404).json({ message: 'Option not found.' });

    Object.assign(option, req.body);
    await transportation.save();

    res.status(200).json({ success: true, data: transportation });
  } catch (error) {
    console.error('Error updating option:', error.message);
    res.status(500).json({ success: false, message: 'Error updating option.' });
  }
};

// Delete an option from a transportation service
exports.deleteOption = async (req, res) => {
  try {
    const transportation = await Transportation.findById(req.params.id);
    if (!transportation) return res.status(404).json({ message: 'Transportation service not found.' });

    transportation.options = transportation.options.filter((option) => option._id.toString() !== req.params.optionId);
    await transportation.save();

    res.status(200).json({ success: true, data: transportation });
  } catch (error) {
    console.error('Error deleting option:', error.message);
    res.status(500).json({ success: false, message: 'Error deleting option.' });
  }
};

// Add a review for a transportation service
exports.addReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;

    const transportation = await Transportation.findById(req.params.id);
    if (!transportation) return res.status(404).json({ message: 'Transportation service not found.' });

    const review = {
      user: req.user._id,
      rating,
      comment,
    };

    transportation.reviews.push(review);
    await transportation.save();

    res.status(201).json({ success: true, data: review });
  } catch (error) {
    console.error('Error adding review:', error.message);
    res.status(500).json({ success: false, message: 'Error adding review.' });
  }
};

// Get all reviews for a transportation service
exports.getReviews = async (req, res) => {
  try {
    const transportation = await Transportation.findById(req.params.id).populate('reviews.user', 'name');
    if (!transportation) return res.status(404).json({ message: 'Transportation service not found.' });

    res.status(200).json({ success: true, data: transportation.reviews });
  } catch (error) {
    console.error('Error fetching reviews:', error.message);
    res.status(500).json({ success: false, message: 'Error fetching reviews.' });
  }
};
