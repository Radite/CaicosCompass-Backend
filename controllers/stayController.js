const Stay = require('../models/Stay');

// Get all stays
exports.getStays = async (req, res) => {
  try {
    const stays = await Stay.find();
    res.status(200).json({ success: true, data: stays });
  } catch (error) {
    console.error('Error fetching stays:', error.message);
    res.status(500).json({ success: false, message: 'Error fetching stays.', error: error.message });
  }
};

// Get price range for stays
exports.getPrices = async (req, res) => {
  try {
    const prices = await Stay.aggregate([
      {
        $group: {
          _id: null,
          minPrice: { $min: '$pricePerNight' },
          maxPrice: { $max: '$pricePerNight' },
        },
      },
    ]);
    res.status(200).json({ success: true, data: prices[0] });
  } catch (error) {
    console.error('Error fetching price range:', error.message);
    res.status(500).json({ success: false, message: 'Error fetching price range.', error: error.message });
  }
};

// Filter available stays
exports.filterAvailablePlaces = async (req, res) => {
  try {
    const { guests } = req.query;
    const stays = await Stay.find({ maxGuests: { $gte: guests } });
    res.status(200).json({ success: true, data: stays });
  } catch (error) {
    console.error('Error filtering stays:', error.message);
    res.status(500).json({ success: false, message: 'Error filtering stays.', error: error.message });
  }
};

// Filter available stays by date range
exports.filterAvailableByDate = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const stays = await Stay.find({
      $and: [
        { 'blockedDates.startDate': { $not: { $lte: new Date(endDate) } } },
        { 'blockedDates.endDate': { $not: { $gte: new Date(startDate) } } },
      ],
    });

    res.status(200).json({ success: true, data: stays });
  } catch (error) {
    console.error('Error filtering stays by date range:', error.message);
    res.status(500).json({ success: false, message: 'Error filtering stays by date range.', error: error.message });
  }
};

// Get islands with stays
exports.getIslandsWithStays = async (req, res) => {
  try {
    const islands = await Stay.distinct('island');
    res.status(200).json({ success: true, data: islands });
  } catch (error) {
    console.error('Error fetching islands with stays:', error.message);
    res.status(500).json({ success: false, message: 'Error fetching islands with stays.', error: error.message });
  }
};

// Get a specific stay by ID
exports.getStayById = async (req, res) => {
  try {
    const stay = await Stay.findById(req.params.id);
    if (!stay) return res.status(404).json({ message: 'Stay not found.' });
    res.status(200).json({ success: true, data: stay });
  } catch (error) {
    console.error('Error fetching stay:', error.message);
    res.status(500).json({ success: false, message: 'Error fetching stay.', error: error.message });
  }
};

// Create a new stay
exports.createStay = async (req, res) => {
  try {
    const newStay = await Stay.create(req.body);
    res.status(201).json({ success: true, data: newStay });
  } catch (error) {
    console.error('Error creating stay:', error.message);
    res.status(500).json({ success: false, message: 'Error creating stay.', error: error.message });
  }
};

// Update a stay
exports.updateStay = async (req, res) => {
  try {
    const updatedStay = await Stay.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedStay) return res.status(404).json({ message: 'Stay not found.' });
    res.status(200).json({ success: true, data: updatedStay });
  } catch (error) {
    console.error('Error updating stay:', error.message);
    res.status(500).json({ success: false, message: 'Error updating stay.', error: error.message });
  }
};

// Delete a stay
exports.deleteStay = async (req, res) => {
  try {
    const deletedStay = await Stay.findByIdAndDelete(req.params.id);
    if (!deletedStay) return res.status(404).json({ message: 'Stay not found.' });
    res.status(200).json({ success: true, message: 'Stay deleted successfully.' });
  } catch (error) {
    console.error('Error deleting stay:', error.message);
    res.status(500).json({ success: false, message: 'Error deleting stay.', error: error.message });
  }
};

// Add blocked dates to a stay
exports.addBlockedDates = async (req, res) => {
  try {
    const stay = await Stay.findById(req.params.id);
    if (!stay) return res.status(404).json({ message: 'Stay not found.' });

    stay.blockedDates.push(req.body);
    await stay.save();

    res.status(200).json({ success: true, data: stay });
  } catch (error) {
    console.error('Error adding blocked dates:', error.message);
    res.status(500).json({ success: false, message: 'Error adding blocked dates.', error: error.message });
  }
};

// Remove blocked dates from a stay
exports.removeBlockedDates = async (req, res) => {
  try {
    const stay = await Stay.findById(req.params.id);
    if (!stay) return res.status(404).json({ message: 'Stay not found.' });

    stay.blockedDates = stay.blockedDates.filter((date) => date._id.toString() !== req.body.id);
    await stay.save();

    res.status(200).json({ success: true, data: stay });
  } catch (error) {
    console.error('Error removing blocked dates:', error.message);
    res.status(500).json({ success: false, message: 'Error removing blocked dates.', error: error.message });
  }
};

// Add a new room to a stay
exports.addRoomToStay = async (req, res) => {
  try {
    const stay = await Stay.findById(req.params.id);
    if (!stay) return res.status(404).json({ message: 'Stay not found.' });

    stay.rooms.push(req.body);
    await stay.save();

    res.status(201).json({ success: true, data: stay });
  } catch (error) {
    console.error('Error adding room to stay:', error.message);
    res.status(500).json({ success: false, message: 'Error adding room to stay.', error: error.message });
  }
};

// Update a specific room in a stay
exports.updateRoomInStay = async (req, res) => {
  try {
    const stay = await Stay.findById(req.params.id);
    if (!stay) return res.status(404).json({ message: 'Stay not found.' });

    const room = stay.rooms.id(req.params.roomId);
    if (!room) return res.status(404).json({ message: 'Room not found.' });

    Object.assign(room, req.body);
    await stay.save();

    res.status(200).json({ success: true, data: stay });
  } catch (error) {
    console.error('Error updating room in stay:', error.message);
    res.status(500).json({ success: false, message: 'Error updating room in stay.', error: error.message });
  }
};

// Delete a specific room from a stay
exports.deleteRoomFromStay = async (req, res) => {
  try {
    const stay = await Stay.findById(req.params.id);
    if (!stay) return res.status(404).json({ message: 'Stay not found.' });

    stay.rooms = stay.rooms.filter((room) => room._id.toString() !== req.params.roomId);
    await stay.save();

    res.status(200).json({ success: true, data: stay });
  } catch (error) {
    console.error('Error deleting room from stay:', error.message);
    res.status(500).json({ success: false, message: 'Error deleting room from stay.', error: error.message });
  }
};

// Add a promotion to a stay
exports.addPromotionToStay = async (req, res) => {
  try {
    const stay = await Stay.findById(req.params.id);
    if (!stay) return res.status(404).json({ message: 'Stay not found.' });

    stay.promotions.push(req.body);
    await stay.save();

    res.status(201).json({ success: true, data: stay });
  } catch (error) {
    console.error('Error adding promotion to stay:', error.message);
    res.status(500).json({ success: false, message: 'Error adding promotion to stay.', error: error.message });
  }
};

// Remove a promotion from a stay
exports.removePromotionFromStay = async (req, res) => {
  try {
    const stay = await Stay.findById(req.params.id);
    if (!stay) return res.status(404).json({ message: 'Stay not found.' });

    stay.promotions = stay.promotions.filter((promo) => promo._id.toString() !== req.params.promoId);
    await stay.save();

    res.status(200).json({ success: true, data: stay });
  } catch (error) {
    console.error('Error removing promotion from stay:', error.message);
    res.status(500).json({ success: false, message: 'Error removing promotion from stay.', error: error.message });
  }
};

// Update stay policies
exports.updatePolicies = async (req, res) => {
  try {
    const stay = await Stay.findById(req.params.id);
    if (!stay) return res.status(404).json({ message: 'Stay not found.' });

    stay.policies = req.body;
    await stay.save();

    res.status(200).json({ success: true, data: stay });
  } catch (error) {
    console.error('Error updating policies:', error.message);
    res.status(500).json({ success: false, message: 'Error updating policies.', error: error.message });
  }
};

// Update accessibility features
exports.updateAccessibilityFeatures = async (req, res) => {
  try {
    const stay = await Stay.findById(req.params.id);
    if (!stay) return res.status(404).json({ message: 'Stay not found.' });

    stay.accessibility = req.body;
    await stay.save();

    res.status(200).json({ success: true, data: stay });
  } catch (error) {
    console.error('Error updating accessibility features:', error.message);
    res.status(500).json({ success: false, message: 'Error updating accessibility features.', error: error.message });
  }
};

// Update tags for filtering stays
exports.updateTags = async (req, res) => {
  try {
    const stay = await Stay.findById(req.params.id);
    if (!stay) return res.status(404).json({ message: 'Stay not found.' });

    stay.tags = req.body.tags;
    await stay.save();

    res.status(200).json({ success: true, data: stay });
  } catch (error) {
    console.error('Error updating tags:', error.message);
    res.status(500).json({ success: false, message: 'Error updating tags.', error: error.message });
  }
};
