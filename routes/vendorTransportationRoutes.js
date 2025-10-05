// routes/vendorTransportationRoutes.js
const express = require('express');
const router = express.Router();
const vendorTransportationController = require('../controllers/vendorTransportationController');
const { protect, businessManagerProtect } = require('../middleware/authMiddleware');
const { body, param, query } = require('express-validator');

// Validation middleware
const validateTransportationId = [
  param('id').isMongoId().withMessage('Invalid transportation service ID')
];

const validateVehicleData = [
  body('make').notEmpty().trim().withMessage('Vehicle make is required'),
  body('model').notEmpty().trim().withMessage('Vehicle model is required'),
  body('year').isInt({ min: 1990, max: new Date().getFullYear() + 1 }).withMessage('Valid year is required'),
  body('capacity').isInt({ min: 1, max: 50 }).withMessage('Capacity must be between 1 and 50'),
  body('licensePlate').optional().trim(),
  body('fuelType').optional().isIn(['Petrol', 'Diesel', 'Electric', 'Hybrid']),
  body('transmission').optional().isIn(['Automatic', 'Manual'])
];

const validateDriverData = [
  body('name').notEmpty().trim().withMessage('Driver name is required'),
  body('licenseNumber').notEmpty().trim().withMessage('License number is required'),
  body('licenseExpiry').isISO8601().withMessage('Valid license expiry date is required'),
  body('phoneNumber').isMobilePhone().withMessage('Valid phone number is required'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('experience').optional().isInt({ min: 0, max: 50 }).withMessage('Experience must be between 0 and 50 years')
];

const validateLocationData = [
  body('name').notEmpty().trim().withMessage('Location name is required'),
  body('address').notEmpty().trim().withMessage('Address is required'),
  body('coordinates.latitude').isFloat({ min: -90, max: 90 }).withMessage('Valid latitude is required'),
  body('coordinates.longitude').isFloat({ min: -180, max: 180 }).withMessage('Valid longitude is required'),
  body('type').optional().isIn(['pickup', 'dropoff', 'both'])
];

const validateRouteData = [
  body('name').notEmpty().trim().withMessage('Route name is required'),
  body('startLocation.name').notEmpty().trim().withMessage('Start location name is required'),
  body('startLocation.coordinates.latitude').isFloat({ min: -90, max: 90 }).withMessage('Valid start latitude is required'),
  body('startLocation.coordinates.longitude').isFloat({ min: -180, max: 180 }).withMessage('Valid start longitude is required'),
  body('endLocation.name').notEmpty().trim().withMessage('End location name is required'),
  body('endLocation.coordinates.latitude').isFloat({ min: -90, max: 90 }).withMessage('Valid end latitude is required'),
  body('endLocation.coordinates.longitude').isFloat({ min: -180, max: 180 }).withMessage('Valid end longitude is required'),
  body('distance').isFloat({ min: 0 }).withMessage('Valid distance is required'),
  body('estimatedDuration').isInt({ min: 1 }).withMessage('Valid estimated duration is required'),
  body('basePrice').isFloat({ min: 0 }).withMessage('Valid base price is required')
];

const validatePromotionData = [
  body('title').notEmpty().trim().withMessage('Promotion title is required'),
  body('type').isIn(['percentage', 'fixed-amount', 'buy-x-get-y', 'loyalty']).withMessage('Valid promotion type is required'),
  body('value').isFloat({ min: 0 }).withMessage('Valid promotion value is required'),
  body('validFrom').isISO8601().withMessage('Valid start date is required'),
  body('validUntil').isISO8601().withMessage('Valid end date is required'),
  body('promoCode').optional().trim().isLength({ min: 3, max: 20 }).withMessage('Promo code must be 3-20 characters')
];

// All routes require business manager authentication
router.use(protect, businessManagerProtect);

// TRANSPORTATION SERVICE MANAGEMENT
// ================================

// @desc    Get all transportation services for vendor
// @route   GET /api/vendor/transportation
// @access  Private (Business Manager)
router.get('/', vendorTransportationController.getVendorTransportationServices);

// @desc    Get single transportation service
// @route   GET /api/vendor/transportation/:id
// @access  Private (Business Manager)
router.get('/:id', validateTransportationId, vendorTransportationController.getTransportationService);

// @desc    Create new transportation service
// @route   POST /api/vendor/transportation
// @access  Private (Business Manager)
router.post('/', [
  body('name').notEmpty().trim().withMessage('Service name is required'),
  body('description').notEmpty().trim().withMessage('Description is required'),
  body('category').isIn(['Car Rental', 'Jeep & 4x4 Rental', 'Scooter & Moped Rental', 'Taxi', 'Airport Transfer', 'Private VIP Transport', 'Ferry', 'Flight']).withMessage('Valid category is required'),
  body('pricingModel').isIn(['flat', 'per-mile', 'per-hour', 'per-day', 'age-based', 'per-flight', 'per-trip', 'distance-based']).withMessage('Valid pricing model is required'),
  body('basePrice').isFloat({ min: 0 }).withMessage('Valid base price is required'),
  body('location').notEmpty().trim().withMessage('Location is required'),
  body('coordinates.latitude').isFloat({ min: -90, max: 90 }).withMessage('Valid latitude is required'),
  body('coordinates.longitude').isFloat({ min: -180, max: 180 }).withMessage('Valid longitude is required'),
  body('island').notEmpty().trim().withMessage('Island is required'),
  body('contactDetails.phone').isMobilePhone().withMessage('Valid phone number is required')
], vendorTransportationController.createTransportationService);

// @desc    Update transportation service
// @route   PUT /api/vendor/transportation/:id
// @access  Private (Business Manager)
router.put('/:id', validateTransportationId, vendorTransportationController.updateTransportationService);

// @desc    Delete transportation service
// @route   DELETE /api/vendor/transportation/:id
// @access  Private (Business Manager)
router.delete('/:id', validateTransportationId, vendorTransportationController.deleteTransportationService);

// @desc    Toggle service status (active/inactive)
// @route   PATCH /api/vendor/transportation/:id/toggle-status
// @access  Private (Business Manager)
router.patch('/:id/toggle-status', validateTransportationId, vendorTransportationController.toggleServiceStatus);

// FLEET MANAGEMENT
// ===============

// @desc    Get all vehicles in fleet
// @route   GET /api/vendor/transportation/:id/fleet
// @access  Private (Business Manager)
router.get('/:id/fleet', validateTransportationId, vendorTransportationController.getFleet);

// @desc    Add vehicle to fleet
// @route   POST /api/vendor/transportation/:id/fleet
// @access  Private (Business Manager)
router.post('/:id/fleet', validateTransportationId, validateVehicleData, vendorTransportationController.addVehicle);

// @desc    Update vehicle in fleet
// @route   PUT /api/vendor/transportation/:id/fleet/:vehicleId
// @access  Private (Business Manager)
router.put('/:id/fleet/:vehicleId', validateTransportationId, validateVehicleData, vendorTransportationController.updateVehicle);

// @desc    Remove vehicle from fleet
// @route   DELETE /api/vendor/transportation/:id/fleet/:vehicleId
// @access  Private (Business Manager)
router.delete('/:id/fleet/:vehicleId', validateTransportationId, vendorTransportationController.removeVehicle);

// @desc    Update vehicle status
// @route   PATCH /api/vendor/transportation/:id/fleet/:vehicleId/status
// @access  Private (Business Manager)
router.patch('/:id/fleet/:vehicleId/status', [
  ...validateTransportationId,
  body('status').isIn(['available', 'rented', 'maintenance', 'out-of-service']).withMessage('Valid status is required')
], vendorTransportationController.updateVehicleStatus);

// @desc    Bulk import vehicles
// @route   POST /api/vendor/transportation/:id/fleet/bulk-import
// @access  Private (Business Manager)
router.post('/:id/fleet/bulk-import', validateTransportationId, vendorTransportationController.bulkImportVehicles);

// DRIVER MANAGEMENT  
// ================

// @desc    Get all drivers
// @route   GET /api/vendor/transportation/:id/drivers
// @access  Private (Business Manager)
router.get('/:id/drivers', validateTransportationId, vendorTransportationController.getDrivers);

// @desc    Add new driver
// @route   POST /api/vendor/transportation/:id/drivers
// @access  Private (Business Manager)
router.post('/:id/drivers', validateTransportationId, validateDriverData, vendorTransportationController.addDriver);

// @desc    Update driver information
// @route   PUT /api/vendor/transportation/:id/drivers/:driverId
// @access  Private (Business Manager)
router.put('/:id/drivers/:driverId', validateTransportationId, validateDriverData, vendorTransportationController.updateDriver);

// @desc    Remove driver
// @route   DELETE /api/vendor/transportation/:id/drivers/:driverId
// @access  Private (Business Manager)
router.delete('/:id/drivers/:driverId', validateTransportationId, vendorTransportationController.removeDriver);

// @desc    Update driver availability
// @route   PATCH /api/vendor/transportation/:id/drivers/:driverId/availability
// @access  Private (Business Manager)
router.patch('/:id/drivers/:driverId/availability', validateTransportationId, vendorTransportationController.updateDriverAvailability);

// @desc    Update driver status
// @route   PATCH /api/vendor/transportation/:id/drivers/:driverId/status
// @access  Private (Business Manager)
router.patch('/:id/drivers/:driverId/status', [
  ...validateTransportationId,
  body('status').isIn(['active', 'inactive', 'on-duty', 'off-duty']).withMessage('Valid status is required')
], vendorTransportationController.updateDriverStatus);

// LOCATION MANAGEMENT
// ==================

// @desc    Get all preset locations
// @route   GET /api/vendor/transportation/:id/locations
// @access  Private (Business Manager)
router.get('/:id/locations', validateTransportationId, vendorTransportationController.getPresetLocations);

// @desc    Add new preset location
// @route   POST /api/vendor/transportation/:id/locations
// @access  Private (Business Manager)
router.post('/:id/locations', validateTransportationId, validateLocationData, vendorTransportationController.addPresetLocation);

// @desc    Update preset location
// @route   PUT /api/vendor/transportation/:id/locations/:locationId
// @access  Private (Business Manager)
router.put('/:id/locations/:locationId', validateTransportationId, validateLocationData, vendorTransportationController.updatePresetLocation);

// @desc    Remove preset location
// @route   DELETE /api/vendor/transportation/:id/locations/:locationId
// @access  Private (Business Manager)
router.delete('/:id/locations/:locationId', validateTransportationId, vendorTransportationController.removePresetLocation);

// @desc    Bulk import locations
// @route   POST /api/vendor/transportation/:id/locations/bulk-import
// @access  Private (Business Manager)
router.post('/:id/locations/bulk-import', validateTransportationId, vendorTransportationController.bulkImportLocations);

// ROUTE MANAGEMENT
// ===============

// @desc    Get all preset routes
// @route   GET /api/vendor/transportation/:id/routes
// @access  Private (Business Manager)
router.get('/:id/routes', validateTransportationId, vendorTransportationController.getPresetRoutes);

// @desc    Add new preset route
// @route   POST /api/vendor/transportation/:id/routes
// @access  Private (Business Manager)
router.post('/:id/routes', validateTransportationId, validateRouteData, vendorTransportationController.addPresetRoute);

// @desc    Update preset route
// @route   PUT /api/vendor/transportation/:id/routes/:routeId
// @access  Private (Business Manager)
router.put('/:id/routes/:routeId', validateTransportationId, validateRouteData, vendorTransportationController.updatePresetRoute);

// @desc    Remove preset route
// @route   DELETE /api/vendor/transportation/:id/routes/:routeId
// @access  Private (Business Manager)
router.delete('/:id/routes/:routeId', validateTransportationId, vendorTransportationController.removePresetRoute);

// @desc    Calculate route price
// @route   POST /api/vendor/transportation/:id/routes/calculate-price
// @access  Private (Business Manager)
router.post('/:id/routes/calculate-price', [
  ...validateTransportationId,
  body('startCoordinates.latitude').isFloat({ min: -90, max: 90 }).withMessage('Valid start latitude is required'),
  body('startCoordinates.longitude').isFloat({ min: -180, max: 180 }).withMessage('Valid start longitude is required'),
  body('endCoordinates.latitude').isFloat({ min: -90, max: 90 }).withMessage('Valid end latitude is required'),
  body('endCoordinates.longitude').isFloat({ min: -180, max: 180 }).withMessage('Valid end longitude is required')
], vendorTransportationController.calculateRoutePrice);

// AVAILABILITY MANAGEMENT
// ======================

// @desc    Get availability calendar
// @route   GET /api/vendor/transportation/:id/availability
// @access  Private (Business Manager)
router.get('/:id/availability', [
  ...validateTransportationId,
  query('startDate').optional().isISO8601().withMessage('Valid start date is required'),
  query('endDate').optional().isISO8601().withMessage('Valid end date is required')
], vendorTransportationController.getAvailabilityCalendar);

// @desc    Update availability slots
// @route   POST /api/vendor/transportation/:id/availability
// @access  Private (Business Manager)
router.post('/:id/availability', [
  ...validateTransportationId,
  body('availabilitySlots').isArray({ min: 1 }).withMessage('Availability slots array is required'),
  body('availabilitySlots.*.date').isISO8601().withMessage('Valid date is required'),
  body('availabilitySlots.*.isAvailable').isBoolean().withMessage('Availability status is required')
], vendorTransportationController.updateAvailability);

// @desc    Add blocked dates
// @route   POST /api/vendor/transportation/:id/blocked-dates
// @access  Private (Business Manager)
router.post('/:id/blocked-dates', [
  ...validateTransportationId,
  body('startDate').isISO8601().withMessage('Valid start date is required'),
  body('endDate').isISO8601().withMessage('Valid end date is required'),
  body('reason').isIn(['maintenance', 'personal', 'holiday', 'repair', 'inspection', 'other']).withMessage('Valid reason is required')
], vendorTransportationController.addBlockedDates);

// @desc    Remove blocked dates
// @route   DELETE /api/vendor/transportation/:id/blocked-dates/:blockId
// @access  Private (Business Manager)
router.delete('/:id/blocked-dates/:blockId', validateTransportationId, vendorTransportationController.removeBlockedDates);

// PRICING MANAGEMENT
// =================

// @desc    Update pricing model
// @route   PUT /api/vendor/transportation/:id/pricing
// @access  Private (Business Manager)
router.put('/:id/pricing', [
  ...validateTransportationId,
  body('pricingModel').isIn(['flat', 'per-mile', 'per-hour', 'per-day', 'age-based', 'per-flight', 'per-trip', 'distance-based']).withMessage('Valid pricing model is required'),
  body('basePrice').isFloat({ min: 0 }).withMessage('Valid base price is required')
], vendorTransportationController.updatePricingModel);

// @desc    Update distance-based pricing
// @route   PUT /api/vendor/transportation/:id/distance-pricing
// @access  Private (Business Manager)
router.put('/:id/distance-pricing', [
  ...validateTransportationId,
  body('enabled').isBoolean().withMessage('Enabled status is required'),
  body('baseRate').optional().isFloat({ min: 0 }).withMessage('Valid base rate is required'),
  body('perMileRate').optional().isFloat({ min: 0 }).withMessage('Valid per-mile rate is required')
], vendorTransportationController.updateDistancePricing);

// @desc    Update age-based pricing
// @route   PUT /api/vendor/transportation/:id/age-pricing
// @access  Private (Business Manager)
router.put('/:id/age-pricing', validateTransportationId, vendorTransportationController.updateAgePricing);

// PROMOTION MANAGEMENT
// ===================

// @desc    Get all promotions
// @route   GET /api/vendor/transportation/:id/promotions
// @access  Private (Business Manager)
router.get('/:id/promotions', validateTransportationId, vendorTransportationController.getPromotions);

// @desc    Create new promotion
// @route   POST /api/vendor/transportation/:id/promotions
// @access  Private (Business Manager)
router.post('/:id/promotions', validateTransportationId, validatePromotionData, vendorTransportationController.createPromotion);

// @desc    Update promotion
// @route   PUT /api/vendor/transportation/:id/promotions/:promoId
// @access  Private (Business Manager)
router.put('/:id/promotions/:promoId', validateTransportationId, validatePromotionData, vendorTransportationController.updatePromotion);

// @desc    Delete promotion
// @route   DELETE /api/vendor/transportation/:id/promotions/:promoId
// @access  Private (Business Manager)
router.delete('/:id/promotions/:promoId', validateTransportationId, vendorTransportationController.deletePromotion);

// @desc    Toggle promotion status
// @route   PATCH /api/vendor/transportation/:id/promotions/:promoId/toggle
// @access  Private (Business Manager)
router.patch('/:id/promotions/:promoId/toggle', validateTransportationId, vendorTransportationController.togglePromotionStatus);

// BOOKING MANAGEMENT
// =================

// @desc    Get all bookings for service
// @route   GET /api/vendor/transportation/:id/bookings
// @access  Private (Business Manager)
router.get('/:id/bookings', [
  ...validateTransportationId,
  query('status').optional().isIn(['pending', 'confirmed', 'in-progress', 'completed', 'cancelled']),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], vendorTransportationController.getServiceBookings);

// @desc    Update booking status
// @route   PATCH /api/vendor/transportation/:id/bookings/:bookingId/status
// @access  Private (Business Manager)
router.patch('/:id/bookings/:bookingId/status', [
  ...validateTransportationId,
  body('status').isIn(['pending', 'confirmed', 'in-progress', 'completed', 'cancelled']).withMessage('Valid status is required'),
body('reason').optional({ checkFalsy: true }).trim().isLength({ min: 1 }).withMessage('Reason for status change is required')
], vendorTransportationController.updateBookingStatus);

// @desc    Add booking notes
// @route   PATCH /api/vendor/transportation/:id/bookings/:bookingId/notes
// @access  Private (Business Manager)
router.patch('/:id/bookings/:bookingId/notes', [
  ...validateTransportationId,
  body('notes').notEmpty().trim().withMessage('Notes are required')
], vendorTransportationController.addBookingNotes);

// ANALYTICS AND REPORTING
// =======================

// @desc    Get service analytics
// @route   GET /api/vendor/transportation/:id/analytics
// @access  Private (Business Manager)
router.get('/:id/analytics', [
  ...validateTransportationId,
  query('period').optional().isIn(['week', 'month', 'quarter', 'year']),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601()
], vendorTransportationController.getServiceAnalytics);

// @desc    Get performance metrics
// @route   GET /api/vendor/transportation/:id/metrics
// @access  Private (Business Manager)
router.get('/:id/metrics', validateTransportationId, vendorTransportationController.getPerformanceMetrics);

// @desc    Get revenue report
// @route   GET /api/vendor/transportation/:id/revenue-report
// @access  Private (Business Manager)
router.get('/:id/revenue-report', [
  ...validateTransportationId,
  query('groupBy').optional().isIn(['day', 'week', 'month']),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601()
], vendorTransportationController.getRevenueReport);

// SETTINGS AND CONFIGURATION
// ==========================

// @desc    Get business settings
// @route   GET /api/vendor/transportation/:id/settings
// @access  Private (Business Manager)
router.get('/:id/settings', validateTransportationId, vendorTransportationController.getBusinessSettings);

// @desc    Update business settings
// @route   PUT /api/vendor/transportation/:id/settings
// @access  Private (Business Manager)
router.put('/:id/settings', validateTransportationId, vendorTransportationController.updateBusinessSettings);

// @desc    Update cancellation policy
// @route   PUT /api/vendor/transportation/:id/cancellation-policy
// @access  Private (Business Manager)
router.put('/:id/cancellation-policy', validateTransportationId, vendorTransportationController.updateCancellationPolicy);

// @desc    Update contact details
// @route   PUT /api/vendor/transportation/:id/contact-details
// @access  Private (Business Manager)
router.put('/:id/contact-details', [
  ...validateTransportationId,
  body('phone').isMobilePhone().withMessage('Valid phone number is required'),
  body('email').optional().isEmail().normalizeEmail()
], vendorTransportationController.updateContactDetails);

// BULK OPERATIONS
// ==============

// @desc    Bulk update availability
// @route   POST /api/vendor/transportation/bulk-availability
// @access  Private (Business Manager)
router.post('/bulk-availability', [
  body('serviceIds').isArray({ min: 1 }).withMessage('Service IDs array is required'),
  body('availabilityData').isObject().withMessage('Availability data is required')
], vendorTransportationController.bulkUpdateAvailability);

// @desc    Bulk update pricing
// @route   POST /api/vendor/transportation/bulk-pricing
// @access  Private (Business Manager)
router.post('/bulk-pricing', [
  body('serviceIds').isArray({ min: 1 }).withMessage('Service IDs array is required'),
  body('pricingData').isObject().withMessage('Pricing data is required')
], vendorTransportationController.bulkUpdatePricing);

// @desc    Export service data
// @route   GET /api/vendor/transportation/:id/export
// @access  Private (Business Manager)
router.get('/:id/export', [
  ...validateTransportationId,
  query('format').optional().isIn(['csv', 'excel', 'json']),
  query('dataType').optional().isIn(['bookings', 'fleet', 'drivers', 'analytics'])
], vendorTransportationController.exportServiceData);

module.exports = router;