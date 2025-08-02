const Service = require('../models/Service');
const Activity = require('../models/Activity');
const Stay = require('../models/Stay');
const Dining = require('../models/Dining');
const Transportation = require('../models/Transportation');
const mongoose = require('mongoose');
const Shopping = require('../models/Shopping');
const WellnessSpa = require('../models/WellnessSpa');

// Model mapping to link service types to Mongoose models
const modelMap = {
  stays: Stay,
  transportations: Transportation,
  dinings: Dining,
  activities: Activity,
  shoppings: Shopping,  // Add this line
  wellnessspas: WellnessSpa
};


// Get all services
exports.getAllServices = async (req, res) => {
  try {
    const services = await Service.find().populate('vendor', 'name email');
    res.status(200).json(services);
  } catch (error) {
    console.error('Error retrieving services:', error);
    res.status(500).json({ message: 'Error retrieving services', error });
  }
};

// Get all services of a specific type
exports.getAllServicesByType = async (req, res) => {
  try {
    const { serviceType } = req.params;

    if (!modelMap[serviceType]) {
      return res.status(400).json({ error: 'Invalid service type' });
    }

    const services = await modelMap[serviceType].find().populate('vendor', 'name email');
    res.status(200).json(services);
  } catch (error) {
    console.error('Error fetching services by type:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get a specific service by ID and type
exports.getServiceById = async (req, res) => {
  try {
    const { serviceType, id } = req.params;

    if (!modelMap[serviceType]) {
      return res.status(400).json({ error: 'Invalid service type' });
    }

    const service = await modelMap[serviceType].findById(id).populate('vendor', 'name email');
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    res.status(200).json(service);
  } catch (error) {
    console.error('Error fetching service by ID:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get a specific stay service and room by ID and optionId (roomId)
exports.getServiceByIdAndOption = async (req, res) => {
  try {
    const { serviceType, id, optionId } = req.params;

    if (serviceType !== 'stays') {
      return res.status(400).json({ error: 'Option ID only applicable for stays' });
    }

    const stay = await Stay.findById(id).populate('vendor', 'name email');
    if (!stay) {
      return res.status(404).json({ error: 'Stay not found' });
    }

    const room = stay.rooms.id(optionId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found for the given stay' });
    }

    res.status(200).json(room);
  } catch (error) {
    console.error('Error fetching service by ID and option:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Create a new service (dynamic by type)
exports.createService = async (req, res) => {
  try {
    const { serviceType, ...data } = req.body;

    let newService;
switch (serviceType) {
  case 'activities':
    newService = new Activity(data);
    break;
  case 'stays':
    newService = new Stay(data);
    break;
  case 'dinings':              // Updated
    newService = new Dining(data);
    break;
  case 'transportations':      // Updated
    newService = new Transportation(data);
    break;
  case 'shoppings':            // Updated
    newService = new Shopping(data);
    break;
  case 'wellnessspas':         // Updated
    newService = new WellnessSpa(data);
    break;
  default:
    return res.status(400).json({ message: 'Invalid service type' });
}

    await newService.save();
    res.status(201).json(newService);
  } catch (error) {
    console.error('Error creating service:', error);
    res.status(500).json({ message: 'Error creating service', error });
  }
};
// Update an existing service
exports.updateService = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedService = await Service.findByIdAndUpdate(id, req.body, { new: true }).populate('vendor', 'name email');
    if (!updatedService) {
      return res.status(404).json({ message: 'Service not found' });
    }

    res.status(200).json(updatedService);
  } catch (error) {
    console.error('Error updating service:', error);
    res.status(500).json({ message: 'Error updating service', error });
  }
};

// Delete a service
exports.deleteService = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedService = await Service.findByIdAndDelete(id);
    if (!deletedService) {
      return res.status(404).json({ message: 'Service not found' });
    }

    res.status(200).json({ message: 'Service deleted successfully' });
  } catch (error) {
    console.error('Error deleting service:', error);
    res.status(500).json({ message: 'Error deleting service', error });
  }
};

// Get all services of a specific type (alternative approach)
exports.getServicesByType = async (req, res) => {
  try {
    const { type } = req.params;

    if (!modelMap[type]) {
      return res.status(400).json({ message: 'Invalid service type' });
    }

    const services = await modelMap[type].find().populate('vendor', 'name email');
    res.status(200).json(services);
  } catch (error) {
    console.error('Error retrieving services by type:', error);
    res.status(500).json({ message: 'Error retrieving services by type', error });
  }
};

// Get transportation services by category
exports.getTransportationByCategory = async (req, res) => {
  try {
    const { category } = req.params;

    const validCategories = [
      'Car Rental',
      'Jeep & 4x4 Rental',
      'Scooter & Moped Rental',
      'Taxi',
      'Airport Transfer',
      'Private VIP Transport',
      'Ferry',
      'Flight'
    ];

    if (!validCategories.includes(category)) {
      return res.status(400).json({ message: 'Invalid transportation category' });
    }

    const transportationServices = await Transportation.find({ category }).populate('vendor', 'name email');

    if (!transportationServices.length) {
      return res.status(404).json({ message: 'No transportation services found for this category' });
    }

    res.status(200).json(transportationServices);
  } catch (error) {
    console.error('Error retrieving transportation services by category:', error);
    res.status(500).json({ message: 'Error retrieving transportation services by category', error });
  }
};


// Fetch stays with filters
exports.getFilteredStays = async (req, res) => {
  try {
    const filters = req.query;
    let query = {};

    if (filters.type && filters.type !== 'All') {
      query.type = filters.type;
    }

    if (filters.priceRange) {
      const [minPrice, maxPrice] = filters.priceRange.split(',').map(Number);
      query.pricePerNight = { $gte: minPrice, $lte: maxPrice };
    }

    if (filters.bedrooms) {
      query['rooms.bedrooms'] = { $gte: Number(filters.bedrooms) };
    }

    if (filters.beds) {
      query['rooms.beds'] = { $gte: Number(filters.beds) };
    }

    if (filters.bathrooms) {
      query['rooms.bathrooms'] = { $gte: Number(filters.bathrooms) };
    }

    if (filters.petsAllowed) {
      query.petsAllowed = filters.petsAllowed === 'true';
    }

    if (filters.selfCheckIn) {
      query.selfCheckIn = filters.selfCheckIn === 'true';
    }

    if (filters.amenities) {
      const amenitiesArray = filters.amenities.split(',');
      query.amenities = { $all: amenitiesArray };
    }

    if (filters.island) {
      query.island = filters.island;
    }

    const stays = await Stay.find(query);
    res.status(200).json(stays);
  } catch (error) {
    console.error('Error fetching stays:', error);
    res.status(500).json({ message: 'Error fetching stays', error });
  }
};

exports.getStayPriceRange = async (req, res) => {
  try {
    // Fetch all stays and extract room prices
    const stays = await Stay.find().select('pricePerNight rooms');

    // Collect all price values from rooms and overall stays
    const allPrices = stays.flatMap(stay => 
      stay.rooms && stay.rooms.length > 0 
        ? stay.rooms.map(room => room.pricePerNight) 
        : [stay.pricePerNight]
    ).filter(price => price !== undefined && price !== null);

    // Determine highest and lowest prices
    const highestPrice = allPrices.length > 0 ? Math.max(...allPrices) : null;
    const lowestPrice = allPrices.length > 0 ? Math.min(...allPrices) : null;

    res.status(200).json({ highestPrice, lowestPrice });
  } catch (error) {
    console.error('Error fetching price range:', error);
    res.status(500).json({ message: 'Error fetching price range', error });
  }
};
