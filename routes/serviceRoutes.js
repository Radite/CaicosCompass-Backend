const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/serviceController');
const Service = require('../models/Service');
const Activity = require('../models/Activity');
const Stay = require('../models/Stay');
const Dining = require('../models/Dining');
const Transportation = require('../models/Transportation');
// Get all services
router.get('/', serviceController.getAllServices);

// Get a service by ID and option ID (for Stay, optionId refers to roomId)
router.get('/:id/option/:optionId', serviceController.getServiceByIdAndOption);

// Get all services of a specific type (e.g. Stay, Dining, Transportation, Activity)
router.get('/type/:serviceType', serviceController.getAllServicesByType);

// Get a specific service by ID and type
router.get('/type/:serviceType/:id', serviceController.getServiceById);

// Get a specific stay service with room details (optionId)
router.get('/type/:serviceType/:id/option/:optionId', serviceController.getServiceByIdAndOption);

// Create a new service
router.post('/', serviceController.createService);

// Update an existing service
router.put('/:id', serviceController.updateService);

// Delete a service
router.delete('/:id', serviceController.deleteService);

// Get all services of a specific type (alternative approach)
router.get('/type/:type', serviceController.getServicesByType);

router.get('/transportation/category/:category', serviceController.getTransportationByCategory);

// Fetch stays with filters
router.get('/stays', serviceController.getFilteredStays);

// Fetch highest and lowest price per night for stays
router.get('/stays/prices', serviceController.getStayPriceRange);

const modelMap = {
    stays: Stay,
    transportation: Transportation,
    dining: Dining,
    activities: Activity
  };
  
  // Route for bulk adding services
  router.post('/bulk-add-services', async (req, res) => {
    try {
      const { serviceType, services } = req.body;
      const Model = modelMap[serviceType];
  
      if (!Model) {
        return res.status(400).json({ message: 'Invalid service type' });
      }
  
      const result = await Model.insertMany(services);
      res.status(201).json(result);
    } catch (error) {
      console.error('Error adding services:', error);
      res.status(500).json({ message: 'Error adding services', error });
    }});
module.exports = router;
