// controllers/vendorTransportationController.js
const Transportation = require('../models/Transportation');
const Booking = require('../models/Booking');
const { validationResult } = require('express-validator');
const mongoose = require('mongoose');

// Helper function to check vendor ownership
const checkVendorOwnership = async (transportationId, vendorId) => {
  const transportation = await Transportation.findOne({ _id: transportationId, vendor: vendorId });
  if (!transportation) {
    throw new Error('Transportation service not found or access denied');
  }
  return transportation;
};

// Helper function to generate unique IDs
const generateUniqueId = (prefix = '') => {
  return prefix + Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// TRANSPORTATION SERVICE MANAGEMENT
// ================================

// @desc    Get all transportation services for vendor
// @route   GET /api/vendor/transportation
// @access  Private (Business Manager)
exports.getVendorTransportationServices = async (req, res) => {
  try {
    const { page = 1, limit = 10, category, status, search } = req.query;
    const vendorId = req.user._id;

    const query = { vendor: vendorId };
    
    if (category) query.category = category;
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [services, total] = await Promise.all([
      Transportation.find(query)
        .select('name description category status basePrice location island createdAt performanceMetrics images')
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 }),
      Transportation.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        services,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalServices: total,
          hasNext: skip + services.length < total,
          hasPrev: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    console.error('Error fetching vendor transportation services:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Get single transportation service
// @route   GET /api/vendor/transportation/:id
// @access  Private (Business Manager)
exports.getTransportationService = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const transportation = await checkVendorOwnership(req.params.id, req.user._id);

    res.json({
      success: true,
      data: transportation
    });
  } catch (error) {
    console.error('Error fetching transportation service:', error);
    res.status(error.message.includes('not found') ? 404 : 500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @desc    Create new transportation service
// @route   POST /api/vendor/transportation
// @access  Private (Business Manager)
// Updated createTransportationService method in vendorTransportationController.js

// @desc    Create new transportation service
// @route   POST /api/vendor/transportation
// @access  Private (Business Manager)
exports.createTransportationService = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    // Debug: Log the user object to see what's available
    console.log('Authenticated user:', req.user);
    console.log('User ID:', req.user._id);
    console.log('User role:', req.user.role);

    // Ensure vendor ID is set correctly
    const vendorId = req.user._id || req.user.id;
    
    if (!vendorId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Vendor ID not found in authenticated user' 
      });
    }

    const serviceData = {
      ...req.body,
      vendor: vendorId,
      serviceType: 'Transportation',
      performanceMetrics: {
        totalBookings: 0,
        totalRevenue: 0,
        averageRating: 0,
        totalReviews: 0,
        repeatCustomers: 0,
        cancellationRate: 0,
        onTimePerformance: 100,
        customerSatisfactionScore: 0,
        lastUpdated: new Date()
      }
    };

    // Debug: Log the service data being saved
    console.log('Service data to save:', JSON.stringify({
      ...serviceData,
      fleet: serviceData.fleet?.length || 0,
      presetLocations: serviceData.presetLocations?.length || 0
    }, null, 2));

    const transportation = new Transportation(serviceData);
    const savedTransportation = await transportation.save();

    res.status(201).json({
      success: true,
      message: 'Transportation service created successfully',
      data: savedTransportation
    });
  } catch (error) {
    console.error('Error creating transportation service:', error);
    
    // More detailed error handling
    if (error.name === 'ValidationError') {
      const validationErrors = Object.keys(error.errors).map(field => ({
        field,
        message: error.errors[field].message
      }));
      
      return res.status(400).json({ 
        success: false, 
        message: 'Validation failed',
        errors: validationErrors
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
};

// @desc    Update transportation service
// @route   PUT /api/vendor/transportation/:id
// @access  Private (Business Manager)
exports.updateTransportationService = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const transportation = await checkVendorOwnership(req.params.id, req.user._id);

    // Update fields
    Object.keys(req.body).forEach(key => {
      if (key !== 'vendor' && key !== '_id' && key !== '__v') {
        transportation[key] = req.body[key];
      }
    });

    await transportation.save();

    res.json({
      success: true,
      message: 'Transportation service updated successfully',
      data: transportation
    });
  } catch (error) {
    console.error('Error updating transportation service:', error);
    res.status(error.message.includes('not found') ? 404 : 500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @desc    Delete transportation service
// @route   DELETE /api/vendor/transportation/:id
// @access  Private (Business Manager)
exports.deleteTransportationService = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    await checkVendorOwnership(req.params.id, req.user._id);
    await Transportation.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Transportation service deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting transportation service:', error);
    res.status(error.message.includes('not found') ? 404 : 500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @desc    Toggle service status
// @route   PATCH /api/vendor/transportation/:id/toggle-status
// @access  Private (Business Manager)
exports.toggleServiceStatus = async (req, res) => {
  try {
    const transportation = await checkVendorOwnership(req.params.id, req.user._id);
    
    transportation.status = transportation.status === 'active' ? 'inactive' : 'active';
    await transportation.save();

    res.json({
      success: true,
      message: `Service ${transportation.status === 'active' ? 'activated' : 'deactivated'} successfully`,
      data: { status: transportation.status }
    });
  } catch (error) {
    console.error('Error toggling service status:', error);
    res.status(error.message.includes('not found') ? 404 : 500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// FLEET MANAGEMENT
// ===============

// @desc    Get all vehicles in fleet
// @route   GET /api/vendor/transportation/:id/fleet
// @access  Private (Business Manager)
exports.getFleet = async (req, res) => {
  try {
    const transportation = await checkVendorOwnership(req.params.id, req.user._id);

    const { status, category } = req.query;
    let fleet = transportation.fleet;

    if (status) {
      fleet = fleet.filter(vehicle => vehicle.status === status);
    }
    if (category) {
      fleet = fleet.filter(vehicle => vehicle.category === category);
    }

    const fleetSummary = {
      totalVehicles: transportation.fleet.length,
      available: transportation.fleet.filter(v => v.status === 'available').length,
      rented: transportation.fleet.filter(v => v.status === 'rented').length,
      maintenance: transportation.fleet.filter(v => v.status === 'maintenance').length,
      outOfService: transportation.fleet.filter(v => v.status === 'out-of-service').length
    };

    res.json({
      success: true,
      data: {
        fleet,
        summary: fleetSummary
      }
    });
  } catch (error) {
    console.error('Error fetching fleet:', error);
    res.status(error.message.includes('not found') ? 404 : 500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @desc    Add vehicle to fleet
// @route   POST /api/vendor/transportation/:id/fleet
// @access  Private (Business Manager)
exports.addVehicle = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const transportation = await checkVendorOwnership(req.params.id, req.user._id);

    const vehicle = {
      vehicleId: generateUniqueId('VEH_'),
      ...req.body,
      status: 'available'
    };

    transportation.fleet.push(vehicle);
    await transportation.save();

    res.status(201).json({
      success: true,
      message: 'Vehicle added to fleet successfully',
      data: vehicle
    });
  } catch (error) {
    console.error('Error adding vehicle to fleet:', error);
    res.status(error.message.includes('not found') ? 404 : 500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @desc    Update vehicle in fleet
// @route   PUT /api/vendor/transportation/:id/fleet/:vehicleId
// @access  Private (Business Manager)
exports.updateVehicle = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const transportation = await checkVendorOwnership(req.params.id, req.user._id);
    const vehicle = transportation.fleet.id(req.params.vehicleId);

    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }

    Object.keys(req.body).forEach(key => {
      if (key !== 'vehicleId') {
        vehicle[key] = req.body[key];
      }
    });

    await transportation.save();

    res.json({
      success: true,
      message: 'Vehicle updated successfully',
      data: vehicle
    });
  } catch (error) {
    console.error('Error updating vehicle:', error);
    res.status(error.message.includes('not found') ? 404 : 500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @desc    Remove vehicle from fleet
// @route   DELETE /api/vendor/transportation/:id/fleet/:vehicleId
// @access  Private (Business Manager)
exports.removeVehicle = async (req, res) => {
  try {
    const transportation = await checkVendorOwnership(req.params.id, req.user._id);
    const vehicle = transportation.fleet.id(req.params.vehicleId);

    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }

    // Check if vehicle is currently rented
    if (vehicle.status === 'rented') {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot remove vehicle that is currently rented' 
      });
    }

    vehicle.remove();
    await transportation.save();

    res.json({
      success: true,
      message: 'Vehicle removed from fleet successfully'
    });
  } catch (error) {
    console.error('Error removing vehicle:', error);
    res.status(error.message.includes('not found') ? 404 : 500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @desc    Update vehicle status
// @route   PATCH /api/vendor/transportation/:id/fleet/:vehicleId/status
// @access  Private (Business Manager)
exports.updateVehicleStatus = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const transportation = await checkVendorOwnership(req.params.id, req.user._id);
    const vehicle = transportation.fleet.id(req.params.vehicleId);

    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }

    vehicle.status = req.body.status;
    await transportation.save();

    res.json({
      success: true,
      message: 'Vehicle status updated successfully',
      data: { vehicleId: vehicle.vehicleId, status: vehicle.status }
    });
  } catch (error) {
    console.error('Error updating vehicle status:', error);
    res.status(error.message.includes('not found') ? 404 : 500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @desc    Bulk import vehicles
// @route   POST /api/vendor/transportation/:id/fleet/bulk-import
// @access  Private (Business Manager)
exports.bulkImportVehicles = async (req, res) => {
  try {
    const transportation = await checkVendorOwnership(req.params.id, req.user._id);
    const { vehicles } = req.body;

    if (!Array.isArray(vehicles) || vehicles.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Vehicles array is required and must not be empty' 
      });
    }

    const newVehicles = vehicles.map(vehicle => ({
      vehicleId: generateUniqueId('VEH_'),
      ...vehicle,
      status: vehicle.status || 'available'
    }));

    transportation.fleet.push(...newVehicles);
    await transportation.save();

    res.json({
      success: true,
      message: `${newVehicles.length} vehicles imported successfully`,
      data: { importedCount: newVehicles.length, vehicles: newVehicles }
    });
  } catch (error) {
    console.error('Error bulk importing vehicles:', error);
    res.status(error.message.includes('not found') ? 404 : 500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// DRIVER MANAGEMENT  
// ================

// @desc    Get all drivers
// @route   GET /api/vendor/transportation/:id/drivers
// @access  Private (Business Manager)
exports.getDrivers = async (req, res) => {
  try {
    const transportation = await checkVendorOwnership(req.params.id, req.user._id);

    const { status } = req.query;
    let drivers = transportation.drivers;

    if (status) {
      drivers = drivers.filter(driver => driver.status === status);
    }

    const driversSummary = {
      totalDrivers: transportation.drivers.length,
      active: transportation.drivers.filter(d => d.status === 'active').length,
      inactive: transportation.drivers.filter(d => d.status === 'inactive').length,
      onDuty: transportation.drivers.filter(d => d.status === 'on-duty').length,
      offDuty: transportation.drivers.filter(d => d.status === 'off-duty').length
    };

    res.json({
      success: true,
      data: {
        drivers,
        summary: driversSummary
      }
    });
  } catch (error) {
    console.error('Error fetching drivers:', error);
    res.status(error.message.includes('not found') ? 404 : 500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @desc    Add new driver
// @route   POST /api/vendor/transportation/:id/drivers
// @access  Private (Business Manager)
exports.addDriver = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const transportation = await checkVendorOwnership(req.params.id, req.user._id);

    const driver = {
      driverId: generateUniqueId('DRV_'),
      ...req.body,
      status: 'active',
      rating: 0
    };

    transportation.drivers.push(driver);
    await transportation.save();

    res.status(201).json({
      success: true,
      message: 'Driver added successfully',
      data: driver
    });
  } catch (error) {
    console.error('Error adding driver:', error);
    res.status(error.message.includes('not found') ? 404 : 500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @desc    Update driver information
// @route   PUT /api/vendor/transportation/:id/drivers/:driverId
// @access  Private (Business Manager)
exports.updateDriver = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const transportation = await checkVendorOwnership(req.params.id, req.user._id);
    const driver = transportation.drivers.id(req.params.driverId);

    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }

    Object.keys(req.body).forEach(key => {
      if (key !== 'driverId') {
        driver[key] = req.body[key];
      }
    });

    await transportation.save();

    res.json({
      success: true,
      message: 'Driver updated successfully',
      data: driver
    });
  } catch (error) {
    console.error('Error updating driver:', error);
    res.status(error.message.includes('not found') ? 404 : 500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @desc    Remove driver
// @route   DELETE /api/vendor/transportation/:id/drivers/:driverId
// @access  Private (Business Manager)
exports.removeDriver = async (req, res) => {
  try {
    const transportation = await checkVendorOwnership(req.params.id, req.user._id);
    const driver = transportation.drivers.id(req.params.driverId);

    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }

    // Check if driver is currently on duty
    if (driver.status === 'on-duty') {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot remove driver who is currently on duty' 
      });
    }

    driver.remove();
    await transportation.save();

    res.json({
      success: true,
      message: 'Driver removed successfully'
    });
  } catch (error) {
    console.error('Error removing driver:', error);
    res.status(error.message.includes('not found') ? 404 : 500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @desc    Update driver availability
// @route   PATCH /api/vendor/transportation/:id/drivers/:driverId/availability
// @access  Private (Business Manager)
exports.updateDriverAvailability = async (req, res) => {
  try {
    const transportation = await checkVendorOwnership(req.params.id, req.user._id);
    const driver = transportation.drivers.id(req.params.driverId);

    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }

    const { availability } = req.body;
    driver.availability = availability;
    await transportation.save();

    res.json({
      success: true,
      message: 'Driver availability updated successfully',
      data: { driverId: driver.driverId, availability: driver.availability }
    });
  } catch (error) {
    console.error('Error updating driver availability:', error);
    res.status(error.message.includes('not found') ? 404 : 500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @desc    Update driver status
// @route   PATCH /api/vendor/transportation/:id/drivers/:driverId/status
// @access  Private (Business Manager)
exports.updateDriverStatus = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const transportation = await checkVendorOwnership(req.params.id, req.user._id);
    const driver = transportation.drivers.id(req.params.driverId);

    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }

    driver.status = req.body.status;
    await transportation.save();

    res.json({
      success: true,
      message: 'Driver status updated successfully',
      data: { driverId: driver.driverId, status: driver.status }
    });
  } catch (error) {
    console.error('Error updating driver status:', error);
    res.status(error.message.includes('not found') ? 404 : 500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// LOCATION MANAGEMENT
// ==================

// @desc    Get all preset locations
// @route   GET /api/vendor/transportation/:id/locations
// @access  Private (Business Manager)
exports.getPresetLocations = async (req, res) => {
  try {
    const transportation = await checkVendorOwnership(req.params.id, req.user._id);

    const { type, popular } = req.query;
    let locations = transportation.presetLocations;

    if (type) {
      locations = locations.filter(location => location.type === type);
    }
    if (popular === 'true') {
      locations = locations.filter(location => location.isPopular);
    }

    res.json({
      success: true,
      data: locations
    });
  } catch (error) {
    console.error('Error fetching preset locations:', error);
    res.status(error.message.includes('not found') ? 404 : 500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @desc    Add new preset location
// @route   POST /api/vendor/transportation/:id/locations
// @access  Private (Business Manager)
exports.addPresetLocation = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const transportation = await checkVendorOwnership(req.params.id, req.user._id);

    const location = {
      ...req.body,
      _id: new mongoose.Types.ObjectId()
    };

    transportation.presetLocations.push(location);
    await transportation.save();

    res.status(201).json({
      success: true,
      message: 'Preset location added successfully',
      data: location
    });
  } catch (error) {
    console.error('Error adding preset location:', error);
    res.status(error.message.includes('not found') ? 404 : 500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @desc    Update preset location
// @route   PUT /api/vendor/transportation/:id/locations/:locationId
// @access  Private (Business Manager)
exports.updatePresetLocation = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const transportation = await checkVendorOwnership(req.params.id, req.user._id);
    const location = transportation.presetLocations.id(req.params.locationId);

    if (!location) {
      return res.status(404).json({ success: false, message: 'Location not found' });
    }

    Object.keys(req.body).forEach(key => {
      location[key] = req.body[key];
    });

    await transportation.save();

    res.json({
      success: true,
      message: 'Preset location updated successfully',
      data: location
    });
  } catch (error) {
    console.error('Error updating preset location:', error);
    res.status(error.message.includes('not found') ? 404 : 500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @desc    Remove preset location
// @route   DELETE /api/vendor/transportation/:id/locations/:locationId
// @access  Private (Business Manager)
exports.removePresetLocation = async (req, res) => {
  try {
    const transportation = await checkVendorOwnership(req.params.id, req.user._id);
    const location = transportation.presetLocations.id(req.params.locationId);

    if (!location) {
      return res.status(404).json({ success: false, message: 'Location not found' });
    }

    location.remove();
    await transportation.save();

    res.json({
      success: true,
      message: 'Preset location removed successfully'
    });
  } catch (error) {
    console.error('Error removing preset location:', error);
    res.status(error.message.includes('not found') ? 404 : 500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @desc    Bulk import locations
// @route   POST /api/vendor/transportation/:id/locations/bulk-import
// @access  Private (Business Manager)
exports.bulkImportLocations = async (req, res) => {
  try {
    const transportation = await checkVendorOwnership(req.params.id, req.user._id);
    const { locations } = req.body;

    if (!Array.isArray(locations) || locations.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Locations array is required and must not be empty' 
      });
    }

    const newLocations = locations.map(location => ({
      ...location,
      _id: new mongoose.Types.ObjectId()
    }));

    transportation.presetLocations.push(...newLocations);
    await transportation.save();

    res.json({
      success: true,
      message: `${newLocations.length} locations imported successfully`,
      data: { importedCount: newLocations.length, locations: newLocations }
    });
  } catch (error) {
    console.error('Error bulk importing locations:', error);
    res.status(error.message.includes('not found') ? 404 : 500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// ROUTE MANAGEMENT
// ===============

// @desc    Get all preset routes
// @route   GET /api/vendor/transportation/:id/routes
// @access  Private (Business Manager)
exports.getPresetRoutes = async (req, res) => {
  try {
    const transportation = await checkVendorOwnership(req.params.id, req.user._id);

    const { active } = req.query;
    let routes = transportation.presetRoutes;

    if (active !== undefined) {
      routes = routes.filter(route => route.isActive === (active === 'true'));
    }

    res.json({
      success: true,
      data: routes
    });
  } catch (error) {
    console.error('Error fetching preset routes:', error);
    res.status(error.message.includes('not found') ? 404 : 500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @desc    Add new preset route
// @route   POST /api/vendor/transportation/:id/routes
// @access  Private (Business Manager)
exports.addPresetRoute = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const transportation = await checkVendorOwnership(req.params.id, req.user._id);

    const route = {
      ...req.body,
      _id: new mongoose.Types.ObjectId(),
      isActive: true
    };

    transportation.presetRoutes.push(route);
    await transportation.save();

    res.status(201).json({
      success: true,
      message: 'Preset route added successfully',
      data: route
    });
  } catch (error) {
    console.error('Error adding preset route:', error);
    res.status(error.message.includes('not found') ? 404 : 500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @desc    Update preset route
// @route   PUT /api/vendor/transportation/:id/routes/:routeId
// @access  Private (Business Manager)
exports.updatePresetRoute = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const transportation = await checkVendorOwnership(req.params.id, req.user._id);
    const route = transportation.presetRoutes.id(req.params.routeId);

    if (!route) {
      return res.status(404).json({ success: false, message: 'Route not found' });
    }

    Object.keys(req.body).forEach(key => {
      route[key] = req.body[key];
    });

    await transportation.save();

    res.json({
      success: true,
      message: 'Preset route updated successfully',
      data: route
    });
  } catch (error) {
    console.error('Error updating preset route:', error);
    res.status(error.message.includes('not found') ? 404 : 500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @desc    Remove preset route
// @route   DELETE /api/vendor/transportation/:id/routes/:routeId
// @access  Private (Business Manager)
exports.removePresetRoute = async (req, res) => {
  try {
    const transportation = await checkVendorOwnership(req.params.id, req.user._id);
    const route = transportation.presetRoutes.id(req.params.routeId);

    if (!route) {
      return res.status(404).json({ success: false, message: 'Route not found' });
    }

    route.remove();
    await transportation.save();

    res.json({
      success: true,
      message: 'Preset route removed successfully'
    });
  } catch (error) {
    console.error('Error removing preset route:', error);
    res.status(error.message.includes('not found') ? 404 : 500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @desc    Calculate route price
// @route   POST /api/vendor/transportation/:id/routes/calculate-price
// @access  Private (Business Manager)
exports.calculateRoutePrice = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const transportation = await checkVendorOwnership(req.params.id, req.user._id);
    const { startCoordinates, endCoordinates, passengers = 1, vehicleType } = req.body;

    // Calculate distance using Haversine formula
    const calculateDistance = (lat1, lon1, lat2, lon2) => {
      const R = 3959; // Earth's radius in miles
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) + 
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c;
    };

    const distance = calculateDistance(
      startCoordinates.latitude,
      startCoordinates.longitude,
      endCoordinates.latitude,
      endCoordinates.longitude
    );

    // Calculate price based on transportation pricing model
    let price = 0;
    if (transportation.distancePricing && transportation.distancePricing.enabled) {
      price = transportation.calculateDistancePrice(distance);
    } else {
      price = transportation.basePrice;
    }

    // Apply vehicle type multiplier if specified
    if (vehicleType) {
      const vehicle = transportation.fleet.find(v => v.category === vehicleType);
      if (vehicle && vehicle.priceOverride) {
        price = vehicle.priceOverride;
      }
    }

    const estimatedDuration = Math.ceil(distance / 30 * 60); // Assuming average speed of 30 mph

    res.json({
      success: true,
      data: {
        distance: Math.round(distance * 100) / 100,
        estimatedDuration,
        basePrice: price,
        totalPrice: price * passengers,
        breakdown: {
          baseRate: transportation.distancePricing?.baseRate || transportation.basePrice,
          distanceCharge: transportation.distancePricing?.enabled ? 
            Math.max(0, distance - (transportation.distancePricing.baseMileage || 0)) * 
            (transportation.distancePricing.perMileRate || 0) : 0,
          surgeMultiplier: transportation.distancePricing?.surgeMultiplier || 1,
          passengers
        }
      }
    });
  } catch (error) {
    console.error('Error calculating route price:', error);
    res.status(error.message.includes('not found') ? 404 : 500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// AVAILABILITY MANAGEMENT
// ======================

// @desc    Get availability calendar
// @route   GET /api/vendor/transportation/:id/availability
// @access  Private (Business Manager)
exports.getAvailabilityCalendar = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const transportation = await checkVendorOwnership(req.params.id, req.user._id);
    
    const { startDate, endDate } = req.query;
    let availability = transportation.availability;

    if (startDate || endDate) {
      availability = availability.filter(slot => {
        const slotDate = new Date(slot.date);
        if (startDate && slotDate < new Date(startDate)) return false;
        if (endDate && slotDate > new Date(endDate)) return false;
        return true;
      });
    }

    // Also include blocked dates
    const blockedDates = transportation.blockedDates.filter(blocked => {
      if (startDate && new Date(blocked.endDate) < new Date(startDate)) return false;
      if (endDate && new Date(blocked.startDate) > new Date(endDate)) return false;
      return true;
    });

    res.json({
      success: true,
      data: {
        availability,
        blockedDates,
        summary: {
          totalSlots: availability.length,
          availableSlots: availability.filter(slot => slot.isAvailable).length,
          blockedPeriods: blockedDates.length
        }
      }
    });
  } catch (error) {
    console.error('Error fetching availability calendar:', error);
    res.status(error.message.includes('not found') ? 404 : 500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @desc    Update availability slots
// @route   POST /api/vendor/transportation/:id/availability
// @access  Private (Business Manager)
exports.updateAvailability = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const transportation = await checkVendorOwnership(req.params.id, req.user._id);
    const { availabilitySlots, overwrite = false } = req.body;

    if (overwrite) {
      transportation.availability = availabilitySlots;
    } else {
      // Update existing slots or add new ones
      availabilitySlots.forEach(newSlot => {
        const existingSlotIndex = transportation.availability.findIndex(
          slot => new Date(slot.date).toDateString() === new Date(newSlot.date).toDateString()
        );

        if (existingSlotIndex !== -1) {
          transportation.availability[existingSlotIndex] = newSlot;
        } else {
          transportation.availability.push(newSlot);
        }
      });
    }

    await transportation.save();

    res.json({
      success: true,
      message: 'Availability updated successfully',
      data: transportation.availability
    });
  } catch (error) {
    console.error('Error updating availability:', error);
    res.status(error.message.includes('not found') ? 404 : 500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// Continuation of vendorTransportationController.js

// @desc    Add blocked dates
// @route   POST /api/vendor/transportation/:id/blocked-dates
// @access  Private (Business Manager)
exports.addBlockedDates = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const transportation = await checkVendorOwnership(req.params.id, req.user._id);
    const { startDate, endDate, reason, description, affectedVehicles, affectedDrivers } = req.body;

    const blockedPeriod = {
      _id: new mongoose.Types.ObjectId(),
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      reason,
      description,
      affectedVehicles: affectedVehicles || [],
      affectedDrivers: affectedDrivers || []
    };

    transportation.blockedDates.push(blockedPeriod);
    await transportation.save();

    res.status(201).json({
      success: true,
      message: 'Blocked dates added successfully',
      data: blockedPeriod
    });
  } catch (error) {
    console.error('Error adding blocked dates:', error);
    res.status(error.message.includes('not found') ? 404 : 500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @desc    Remove blocked dates
// @route   DELETE /api/vendor/transportation/:id/blocked-dates/:blockId
// @access  Private (Business Manager)
exports.removeBlockedDates = async (req, res) => {
  try {
    const transportation = await checkVendorOwnership(req.params.id, req.user._id);
    const blockedDate = transportation.blockedDates.id(req.params.blockId);

    if (!blockedDate) {
      return res.status(404).json({ success: false, message: 'Blocked date period not found' });
    }

    blockedDate.remove();
    await transportation.save();

    res.json({
      success: true,
      message: 'Blocked dates removed successfully'
    });
  } catch (error) {
    console.error('Error removing blocked dates:', error);
    res.status(error.message.includes('not found') ? 404 : 500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// PRICING MANAGEMENT
// =================

// @desc    Update pricing model
// @route   PUT /api/vendor/transportation/:id/pricing
// @access  Private (Business Manager)
exports.updatePricingModel = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const transportation = await checkVendorOwnership(req.params.id, req.user._id);
    const { 
      pricingModel, 
      basePrice, 
      flatPrice, 
      perMilePrice, 
      perHourPrice, 
      perDayPrice,
      longTermDiscounts,
      ageBasedPricing 
    } = req.body;

    transportation.pricingModel = pricingModel;
    transportation.basePrice = basePrice;
    
    if (flatPrice !== undefined) transportation.flatPrice = flatPrice;
    if (perMilePrice !== undefined) transportation.perMilePrice = perMilePrice;
    if (perHourPrice !== undefined) transportation.perHourPrice = perHourPrice;
    if (perDayPrice !== undefined) transportation.perDayPrice = perDayPrice;
    if (longTermDiscounts) transportation.longTermDiscounts = longTermDiscounts;
    if (ageBasedPricing) transportation.ageBasedPricing = ageBasedPricing;

    await transportation.save();

    res.json({
      success: true,
      message: 'Pricing model updated successfully',
      data: {
        pricingModel: transportation.pricingModel,
        basePrice: transportation.basePrice,
        flatPrice: transportation.flatPrice,
        perMilePrice: transportation.perMilePrice,
        perHourPrice: transportation.perHourPrice,
        perDayPrice: transportation.perDayPrice
      }
    });
  } catch (error) {
    console.error('Error updating pricing model:', error);
    res.status(error.message.includes('not found') ? 404 : 500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @desc    Update distance-based pricing
// @route   PUT /api/vendor/transportation/:id/distance-pricing
// @access  Private (Business Manager)
exports.updateDistancePricing = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const transportation = await checkVendorOwnership(req.params.id, req.user._id);
    
    transportation.distancePricing = {
      ...transportation.distancePricing,
      ...req.body
    };

    await transportation.save();

    res.json({
      success: true,
      message: 'Distance-based pricing updated successfully',
      data: transportation.distancePricing
    });
  } catch (error) {
    console.error('Error updating distance pricing:', error);
    res.status(error.message.includes('not found') ? 404 : 500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @desc    Update age-based pricing
// @route   PUT /api/vendor/transportation/:id/age-pricing
// @access  Private (Business Manager)
exports.updateAgePricing = async (req, res) => {
  try {
    const transportation = await checkVendorOwnership(req.params.id, req.user._id);
    const { ageBasedPricing } = req.body;

    transportation.ageBasedPricing = ageBasedPricing;
    await transportation.save();

    res.json({
      success: true,
      message: 'Age-based pricing updated successfully',
      data: transportation.ageBasedPricing
    });
  } catch (error) {
    console.error('Error updating age-based pricing:', error);
    res.status(error.message.includes('not found') ? 404 : 500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// PROMOTION MANAGEMENT
// ===================

// @desc    Get all promotions
// @route   GET /api/vendor/transportation/:id/promotions
// @access  Private (Business Manager)
exports.getPromotions = async (req, res) => {
  try {
    const transportation = await checkVendorOwnership(req.params.id, req.user._id);

    const { active, type } = req.query;
    let promotions = transportation.promotions;

    if (active !== undefined) {
      promotions = promotions.filter(promo => promo.isActive === (active === 'true'));
    }
    if (type) {
      promotions = promotions.filter(promo => promo.type === type);
    }

    // Filter out expired promotions unless specifically requested
    const now = new Date();
    if (active === 'true') {
      promotions = promotions.filter(promo => new Date(promo.validUntil) >= now);
    }

    res.json({
      success: true,
      data: promotions
    });
  } catch (error) {
    console.error('Error fetching promotions:', error);
    res.status(error.message.includes('not found') ? 404 : 500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @desc    Create new promotion
// @route   POST /api/vendor/transportation/:id/promotions
// @access  Private (Business Manager)
exports.createPromotion = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const transportation = await checkVendorOwnership(req.params.id, req.user._id);

    const promotion = {
      ...req.body,
      _id: new mongoose.Types.ObjectId(),
      currentUsage: 0,
      isActive: true
    };

    // Generate promo code if not provided
    if (!promotion.promoCode) {
      promotion.promoCode = generateUniqueId('PROMO').toUpperCase();
    }

    transportation.promotions.push(promotion);
    await transportation.save();

    res.status(201).json({
      success: true,
      message: 'Promotion created successfully',
      data: promotion
    });
  } catch (error) {
    console.error('Error creating promotion:', error);
    res.status(error.message.includes('not found') ? 404 : 500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @desc    Update promotion
// @route   PUT /api/vendor/transportation/:id/promotions/:promoId
// @access  Private (Business Manager)
exports.updatePromotion = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const transportation = await checkVendorOwnership(req.params.id, req.user._id);
    const promotion = transportation.promotions.id(req.params.promoId);

    if (!promotion) {
      return res.status(404).json({ success: false, message: 'Promotion not found' });
    }

    Object.keys(req.body).forEach(key => {
      if (key !== '_id' && key !== 'currentUsage') {
        promotion[key] = req.body[key];
      }
    });

    await transportation.save();

    res.json({
      success: true,
      message: 'Promotion updated successfully',
      data: promotion
    });
  } catch (error) {
    console.error('Error updating promotion:', error);
    res.status(error.message.includes('not found') ? 404 : 500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @desc    Delete promotion
// @route   DELETE /api/vendor/transportation/:id/promotions/:promoId
// @access  Private (Business Manager)
exports.deletePromotion = async (req, res) => {
  try {
    const transportation = await checkVendorOwnership(req.params.id, req.user._id);
    const promotion = transportation.promotions.id(req.params.promoId);

    if (!promotion) {
      return res.status(404).json({ success: false, message: 'Promotion not found' });
    }

    promotion.remove();
    await transportation.save();

    res.json({
      success: true,
      message: 'Promotion deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting promotion:', error);
    res.status(error.message.includes('not found') ? 404 : 500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @desc    Toggle promotion status
// @route   PATCH /api/vendor/transportation/:id/promotions/:promoId/toggle
// @access  Private (Business Manager)
exports.togglePromotionStatus = async (req, res) => {
  try {
    const transportation = await checkVendorOwnership(req.params.id, req.user._id);
    const promotion = transportation.promotions.id(req.params.promoId);

    if (!promotion) {
      return res.status(404).json({ success: false, message: 'Promotion not found' });
    }

    promotion.isActive = !promotion.isActive;
    await transportation.save();

    res.json({
      success: true,
      message: `Promotion ${promotion.isActive ? 'activated' : 'deactivated'} successfully`,
      data: { promoCode: promotion.promoCode, isActive: promotion.isActive }
    });
  } catch (error) {
    console.error('Error toggling promotion status:', error);
    res.status(error.message.includes('not found') ? 404 : 500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// BOOKING MANAGEMENT
// =================

// @desc    Get all bookings for service
// @route   GET /api/vendor/transportation/:id/bookings
// @access  Private (Business Manager)
exports.getServiceBookings = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const transportation = await checkVendorOwnership(req.params.id, req.user._id);
    const { 
      status, 
      startDate, 
      endDate, 
      page = 1, 
      limit = 10 
    } = req.query;

    const query = { service: req.params.id };
    
    if (status) query.status = status;
    if (startDate || endDate) {
      query.bookingDate = {};
      if (startDate) query.bookingDate.$gte = new Date(startDate);
      if (endDate) query.bookingDate.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [bookings, total] = await Promise.all([
      Booking.find(query)
        .populate('customer', 'name email phoneNumber')
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 }),
      Booking.countDocuments(query)
    ]);

    const bookingsSummary = await Booking.aggregate([
      { $match: { service: new mongoose.Types.ObjectId(req.params.id) } },
      { $group: { 
          _id: '$status',
          count: { $sum: 1 },
          totalRevenue: { $sum: '$totalAmount' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        bookings,
        summary: bookingsSummary.reduce((acc, item) => {
          acc[item._id] = { count: item.count, revenue: item.totalRevenue };
          return acc;
        }, {}),
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalBookings: total,
          hasNext: skip + bookings.length < total,
          hasPrev: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    console.error('Error fetching service bookings:', error);
    res.status(error.message.includes('not found') ? 404 : 500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @desc    Update booking status
// @route   PATCH /api/vendor/transportation/:id/bookings/:bookingId/status
// @access  Private (Business Manager)
exports.updateBookingStatus = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    await checkVendorOwnership(req.params.id, req.user._id);
    
    const { status, reason } = req.body;
    const booking = await Booking.findOneAndUpdate(
      { _id: req.params.bookingId, service: req.params.id },
      { 
        status,
        ...(reason && { statusReason: reason }),
        updatedAt: new Date()
      },
      { new: true }
    ).populate('customer', 'name email');

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    res.json({
      success: true,
      message: 'Booking status updated successfully',
      data: booking
    });
  } catch (error) {
    console.error('Error updating booking status:', error);
    res.status(error.message.includes('not found') ? 404 : 500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @desc    Add booking notes
// @route   PATCH /api/vendor/transportation/:id/bookings/:bookingId/notes
// @access  Private (Business Manager)
exports.addBookingNotes = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    await checkVendorOwnership(req.params.id, req.user._id);
    
    const { notes } = req.body;
    const booking = await Booking.findOneAndUpdate(
      { _id: req.params.bookingId, service: req.params.id },
      { 
        $push: { 
          vendorNotes: {
            note: notes,
            addedBy: req.user._id,
            addedAt: new Date()
          }
        }
      },
      { new: true }
    );

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    res.json({
      success: true,
      message: 'Notes added to booking successfully',
      data: booking.vendorNotes
    });
  } catch (error) {
    console.error('Error adding booking notes:', error);
    res.status(error.message.includes('not found') ? 404 : 500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// ANALYTICS AND REPORTING
// =======================

// @desc    Get service analytics
// @route   GET /api/vendor/transportation/:id/analytics
// @access  Private (Business Manager)
exports.getServiceAnalytics = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const transportation = await checkVendorOwnership(req.params.id, req.user._id);
    const { period = 'month', startDate, endDate } = req.query;

    // Define date range
    let dateRange = {};
    if (startDate && endDate) {
      dateRange = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else {
      const now = new Date();
      switch (period) {
        case 'week':
          dateRange.$gte = new Date(now.setDate(now.getDate() - 7));
          break;
        case 'month':
          dateRange.$gte = new Date(now.setMonth(now.getMonth() - 1));
          break;
        case 'quarter':
          dateRange.$gte = new Date(now.setMonth(now.getMonth() - 3));
          break;
        case 'year':
          dateRange.$gte = new Date(now.setFullYear(now.getFullYear() - 1));
          break;
      }
    }

    const [bookingStats, revenueStats, ratingStats] = await Promise.all([
      Booking.aggregate([
        { 
          $match: { 
            service: new mongoose.Types.ObjectId(req.params.id),
            createdAt: dateRange
          }
        },
        {
          $group: {
            _id: null,
            totalBookings: { $sum: 1 },
            confirmedBookings: { $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] } },
            cancelledBookings: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
            completedBookings: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } }
          }
        }
      ]),
      Booking.aggregate([
        { 
          $match: { 
            service: new mongoose.Types.ObjectId(req.params.id),
            status: { $in: ['confirmed', 'completed'] },
            createdAt: dateRange
          }
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$totalAmount' },
            averageBookingValue: { $avg: '$totalAmount' }
          }
        }
      ]),
      Transportation.aggregate([
        { $match: { _id: new mongoose.Types.ObjectId(req.params.id) } },
        { $unwind: '$reviews' },
        {
          $group: {
            _id: null,
            averageRating: { $avg: '$reviews.rating' },
            totalReviews: { $sum: 1 }
          }
        }
      ])
    ]);

    const analytics = {
      bookings: bookingStats[0] || {
        totalBookings: 0,
        confirmedBookings: 0,
        cancelledBookings: 0,
        completedBookings: 0
      },
      revenue: revenueStats[0] || {
        totalRevenue: 0,
        averageBookingValue: 0
      },
      ratings: ratingStats[0] || {
        averageRating: 0,
        totalReviews: 0
      },
      fleet: {
        totalVehicles: transportation.fleet.length,
        availableVehicles: transportation.fleet.filter(v => v.status === 'available').length,
        maintenanceVehicles: transportation.fleet.filter(v => v.status === 'maintenance').length
      },
      performance: transportation.performanceMetrics
    };

    // Calculate derived metrics
    if (analytics.bookings.totalBookings > 0) {
      analytics.conversionRate = (analytics.bookings.confirmedBookings / analytics.bookings.totalBookings * 100).toFixed(2);
      analytics.cancellationRate = (analytics.bookings.cancelledBookings / analytics.bookings.totalBookings * 100).toFixed(2);
      analytics.completionRate = (analytics.bookings.completedBookings / analytics.bookings.confirmedBookings * 100).toFixed(2);
    }

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Error fetching service analytics:', error);
    res.status(error.message.includes('not found') ? 404 : 500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @desc    Get performance metrics
// @route   GET /api/vendor/transportation/:id/metrics
// @access  Private (Business Manager)
exports.getPerformanceMetrics = async (req, res) => {
  try {
    const transportation = await checkVendorOwnership(req.params.id, req.user._id);

    // Calculate real-time metrics
    const totalBookings = await Booking.countDocuments({ service: req.params.id });
    const completedBookings = await Booking.countDocuments({ 
      service: req.params.id, 
      status: 'completed' 
    });
    const cancelledBookings = await Booking.countDocuments({ 
      service: req.params.id, 
      status: 'cancelled' 
    });

    const totalRevenue = await Booking.aggregate([
      { $match: { service: new mongoose.Types.ObjectId(req.params.id), status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);

    const metrics = {
      ...transportation.performanceMetrics,
      realTimeMetrics: {
        totalBookings,
        completedBookings,
        cancelledBookings,
        totalRevenue: totalRevenue[0]?.total || 0,
        cancellationRate: totalBookings > 0 ? ((cancelledBookings / totalBookings) * 100).toFixed(2) : 0,
        completionRate: totalBookings > 0 ? ((completedBookings / totalBookings) * 100).toFixed(2) : 0
      },
      fleetUtilization: {
        totalVehicles: transportation.fleet.length,
        activeVehicles: transportation.fleet.filter(v => v.status === 'available' || v.status === 'rented').length,
        utilizationRate: transportation.fleet.length > 0 ? 
          ((transportation.fleet.filter(v => v.status === 'rented').length / transportation.fleet.length) * 100).toFixed(2) : 0
      }
    };

    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error('Error fetching performance metrics:', error);
    res.status(error.message.includes('not found') ? 404 : 500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @desc    Get revenue report
// @route   GET /api/vendor/transportation/:id/revenue-report
// @access  Private (Business Manager)
exports.getRevenueReport = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    await checkVendorOwnership(req.params.id, req.user._id);
    const { groupBy = 'day', startDate, endDate } = req.query;

    let dateRange = {};
    if (startDate && endDate) {
      dateRange = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    let groupByFormat;
    switch (groupBy) {
      case 'day':
        groupByFormat = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
        break;
      case 'week':
        groupByFormat = { $dateToString: { format: '%Y-W%U', date: '$createdAt' } };
        break;
      case 'month':
        groupByFormat = { $dateToString: { format: '%Y-%m', date: '$createdAt' } };
        break;
      default:
        groupByFormat = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
    }

    const revenueData = await Booking.aggregate([
      {
        $match: {
          service: new mongoose.Types.ObjectId(req.params.id),
          status: 'completed',
          ...(Object.keys(dateRange).length && { createdAt: dateRange })
        }
      },
      {
        $group: {
          _id: groupByFormat,
          totalRevenue: { $sum: '$totalAmount' },
          bookingCount: { $sum: 1 },
          averageBookingValue: { $avg: '$totalAmount' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const summary = revenueData.reduce((acc, item) => {
      acc.totalRevenue += item.totalRevenue;
      acc.totalBookings += item.bookingCount;
      return acc;
    }, { totalRevenue: 0, totalBookings: 0 });

    summary.averageBookingValue = summary.totalBookings > 0 ? 
      (summary.totalRevenue / summary.totalBookings).toFixed(2) : 0;

    res.json({
      success: true,
      data: {
        revenueData,
        summary,
        period: { groupBy, startDate, endDate }
      }
    });
  } catch (error) {
    console.error('Error generating revenue report:', error);
    res.status(error.message.includes('not found') ? 404 : 500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// SETTINGS AND CONFIGURATION
// ==========================

// @desc    Get business settings
// @route   GET /api/vendor/transportation/:id/settings
// @access  Private (Business Manager)
exports.getBusinessSettings = async (req, res) => {
  try {
    const transportation = await checkVendorOwnership(req.params.id, req.user._id);

    res.json({
      success: true,
      data: {
        businessSettings: transportation.businessSettings,
        cancellationPolicy: transportation.cancellationPolicy,
        paymentOptions: transportation.paymentOptions,
        contactDetails: transportation.contactDetails,
        loyaltyProgram: transportation.loyaltyProgram
      }
    });
  } catch (error) {
    console.error('Error fetching business settings:', error);
    res.status(error.message.includes('not found') ? 404 : 500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @desc    Update business settings
// @route   PUT /api/vendor/transportation/:id/settings
// @access  Private (Business Manager)
exports.updateBusinessSettings = async (req, res) => {
  try {
    const transportation = await checkVendorOwnership(req.params.id, req.user._id);
    
    transportation.businessSettings = {
      ...transportation.businessSettings,
      ...req.body
    };

    await transportation.save();

    res.json({
      success: true,
      message: 'Business settings updated successfully',
      data: transportation.businessSettings
    });
  } catch (error) {
    console.error('Error updating business settings:', error);
    res.status(error.message.includes('not found') ? 404 : 500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @desc    Update cancellation policy
// @route   PUT /api/vendor/transportation/:id/cancellation-policy
// @access  Private (Business Manager)
exports.updateCancellationPolicy = async (req, res) => {
  try {
    const transportation = await checkVendorOwnership(req.params.id, req.user._id);
    
    transportation.cancellationPolicy = {
      ...transportation.cancellationPolicy,
      ...req.body
    };

    await transportation.save();

    res.json({
      success: true,
      message: 'Cancellation policy updated successfully',
      data: transportation.cancellationPolicy
    });
  } catch (error) {
    console.error('Error updating cancellation policy:', error);
    res.status(error.message.includes('not found') ? 404 : 500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @desc    Update contact details
// @route   PUT /api/vendor/transportation/:id/contact-details
// @access  Private (Business Manager)
exports.updateContactDetails = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const transportation = await checkVendorOwnership(req.params.id, req.user._id);
    
    transportation.contactDetails = {
      ...transportation.contactDetails,
      ...req.body
    };

    await transportation.save();

    res.json({
      success: true,
      message: 'Contact details updated successfully',
      data: transportation.contactDetails
    });
  } catch (error) {
    console.error('Error updating contact details:', error);
    res.status(error.message.includes('not found') ? 404 : 500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// BULK OPERATIONS
// ==============

// @desc    Bulk update availability
// @route   POST /api/vendor/transportation/bulk-availability
// @access  Private (Business Manager)
exports.bulkUpdateAvailability = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { serviceIds, availabilityData } = req.body;
    const vendorId = req.user._id;

    const updateResults = await Transportation.updateMany(
      { _id: { $in: serviceIds }, vendor: vendorId },
      { $set: { availability: availabilityData } }
    );

    res.json({
      success: true,
      message: `Availability updated for ${updateResults.modifiedCount} services`,
      data: { 
        servicesUpdated: updateResults.modifiedCount,
        servicesMatched: updateResults.matchedCount
      }
    });
  } catch (error) {
    console.error('Error bulk updating availability:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Bulk update pricing
// @route   POST /api/vendor/transportation/bulk-pricing
// @access  Private (Business Manager)
exports.bulkUpdatePricing = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { serviceIds, pricingData } = req.body;
    const vendorId = req.user._id;

    const updateResults = await Transportation.updateMany(
      { _id: { $in: serviceIds }, vendor: vendorId },
      { $set: pricingData }
    );

    res.json({
      success: true,
      message: `Pricing updated for ${updateResults.modifiedCount} services`,
      data: { 
        servicesUpdated: updateResults.modifiedCount,
        servicesMatched: updateResults.matchedCount
      }
    });
  } catch (error) {
    console.error('Error bulk updating pricing:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Export service data
// @route   GET /api/vendor/transportation/:id/export
// @access  Private (Business Manager)
exports.exportServiceData = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const transportation = await checkVendorOwnership(req.params.id, req.user._id);
    const { format = 'json', dataType = 'bookings' } = req.query;

    let data;
    let filename;

    switch (dataType) {
      case 'bookings':
        data = await Booking.find({ service: req.params.id })
          .populate('customer', 'name email phoneNumber')
          .lean();
        filename = `bookings_${req.params.id}_${Date.now()}`;
        break;
      case 'fleet':
        data = transportation.fleet;
        filename = `fleet_${req.params.id}_${Date.now()}`;
        break;
      case 'drivers':
        data = transportation.drivers;
        filename = `drivers_${req.params.id}_${Date.now()}`;
        break;
      case 'analytics':
        // Generate analytics data export
        data = {
          serviceInfo: {
            name: transportation.name,
            category: transportation.category,
            createdAt: transportation.createdAt
          },
          performanceMetrics: transportation.performanceMetrics,
          totalFleet: transportation.fleet.length,
          totalDrivers: transportation.drivers.length,
          totalPromotions: transportation.promotions.length
        };
        filename = `analytics_${req.params.id}_${Date.now()}`;
        break;
      default:
        return res.status(400).json({ success: false, message: 'Invalid data type' });
    }

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.json"`);
      res.json(data);
    } else {
      // For CSV/Excel formats, you would typically use libraries like csv-writer or xlsx
      res.status(501).json({ 
        success: false, 
        message: 'CSV/Excel export not implemented yet',
        availableFormats: ['json']
      });
    }
  } catch (error) {
    console.error('Error exporting service data:', error);
    res.status(error.message.includes('not found') ? 404 : 500).json({ 
      success: false, 
      message: error.message 
    });
  }
};