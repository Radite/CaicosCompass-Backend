const FavoritesAndWishlist = require('../models/FavoritesAndWishlist');
const Service = require('../models/Service');
const Stay = require('../models/Stay');
const Transportation = require('../models/Transportation');
const Activity = require('../models/Activity');

// Toggle favorite or wishlist
exports.toggleFavoriteOrWishlist = async (req, res) => {
  try {
    console.log('Request received for toggling favorite/wishlist');
    console.log('Request Body:', req.body);

    if (!req.user) {
      console.error('User is not authenticated');
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { serviceId, optionId, type } = req.body;
    const userId = req.user.id;

    console.log('Authenticated User ID:', userId);
    console.log('Service ID:', serviceId, 'Option ID:', optionId, 'Type:', type);

    if (!['favorite', 'wishlist'].includes(type)) {
      return res.status(400).json({ error: 'Invalid type' });
    }

    if (!serviceId) {
      return res.status(400).json({ error: 'serviceId is required' });
    }

    // Fetch the service
    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    // Validate the optionId based on service type
    if (service.serviceType === 'stays') {
      if (!optionId) {
        return res.status(400).json({ error: 'Room (optionId) is required for stays' });
      }

      const stay = await Stay.findById(serviceId);
      if (!stay) {
        return res.status(404).json({ error: 'Stay not found' });
      }

      const room = stay.rooms.id(optionId);
      if (!room) {
        return res.status(404).json({ error: 'Room not found for the given stay' });
      }
    } else if (service.serviceType === 'transportation' || service.serviceType === 'activities') {
      if (!optionId) {
        return res.status(400).json({ error: 'Option (optionId) is required for transportation and activities' });
      }

      let model = service.serviceType === 'transportation' ? Transportation : Activity;
      const item = await model.findById(serviceId);
      const option = item.options.id(optionId);

      if (!option) {
        return res.status(404).json({ error: 'Option not found for the given service' });
      }
    } else if (service.serviceType === 'dining' && optionId) {
      return res.status(400).json({ error: 'Dining services do not support options' });
    }

    let query = { user: userId, serviceId, type };
    if (optionId) {
      query.optionId = optionId;
    }

    const existingEntry = await FavoritesAndWishlist.findOne(query);
    if (existingEntry) {
      await existingEntry.deleteOne();
      res.status(200).json({ message: `${type} removed successfully` });
    } else {
      await FavoritesAndWishlist.create({ user: userId, serviceId, optionId, type });
      res.status(201).json({ message: `${type} added successfully` });
    }

  } catch (error) {
    console.error('Error in toggleFavoriteOrWishlist:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get user's favorites or wishlist items
exports.getFavoritesOrWishlist = async (req, res) => {
  try {
    console.log('Processing getFavoritesOrWishlist request...');

    const userId = req.user.id;
    if (!userId) {
      return res.status(400).json({ error: 'User not authenticated' });
    }

    const { type } = req.query;
    if (!['favorite', 'wishlist'].includes(type)) {
      return res.status(400).json({ error: 'Invalid type. Must be "favorite" or "wishlist".' });
    }

    const entries = await FavoritesAndWishlist.find({ user: userId, type }).populate('serviceId');
    res.status(200).json(entries);
  } catch (error) {
    console.error('Error in getFavoritesOrWishlist:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
};

// Check if serviceId exists in favorites or wishlist
exports.checkServiceInList = async (req, res) => {
  try {
    const { serviceId, type } = req.query;
    if (!['favorite', 'wishlist'].includes(type)) {
      return res.status(400).json({ error: 'Invalid type. Must be "favorite" or "wishlist".' });
    }

    const exists = await FavoritesAndWishlist.exists({ user: req.user.id, serviceId, type });
    res.status(200).json({ exists: !!exists });
  } catch (error) {
    console.error('Error in checkServiceInList:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
};

// Check if serviceId and optionId combo exists in favorites or wishlist
exports.checkServiceAndOptionInList = async (req, res) => {
  try {
    const { serviceId, optionId, type } = req.query;
    if (!['favorite', 'wishlist'].includes(type)) {
      return res.status(400).json({ error: 'Invalid type. Must be "favorite" or "wishlist".' });
    }

    const exists = await FavoritesAndWishlist.exists({ user: req.user.id, serviceId, optionId, type });
    res.status(200).json({ exists: !!exists });
  } catch (error) {
    console.error('Error in checkServiceAndOptionInList:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
};
