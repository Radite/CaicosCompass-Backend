// File Path: routes/infoRoutes.js

const express = require('express');
const router = express.Router();
const { body, validationResult, query, param } = require('express-validator');
const { protect, adminProtect } = require('../middleware/authMiddleware');
const {
  getAllInfoPages,
  getInfoPageBySlug,
  getFeaturedPages,
  getPagesByCategory,
  createInfoPage,
  updateInfoPage,
  toggleActiveStatus,
  deleteInfoPage,
  getAnalytics
} = require('../controllers/infoController');

// Validation middleware arrays
const searchValidation = [
  query('search').optional().trim().escape(),
  query('category').optional().isIn([
    'essential-services', 'transportation', 'accommodation', 'dining', 
    'activities', 'culture-history', 'practical-info', 'safety-health', 
    'weather-climate', 'sustainability'
  ]),
  query('featured').optional().isBoolean(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  query('sortBy').optional().isIn(['priority', 'views', 'recent'])
];

const slugValidation = [
  param('slug').trim().escape().isLength({ min: 1 }).withMessage('Slug is required')
];

const categoryValidation = [
  param('category').isIn([
    'essential-services', 'transportation', 'accommodation', 'dining', 
    'activities', 'culture-history', 'practical-info', 'safety-health', 
    'weather-climate', 'sustainability'
  ]).withMessage('Valid category required'),
  query('limit').optional().isInt({ min: 1, max: 50 })
];

const createValidation = [
  body('title').notEmpty().trim().escape().withMessage('Title is required'),
  body('description').notEmpty().trim().escape().withMessage('Description is required'),
  body('icon').notEmpty().trim().withMessage('Icon is required'),
  body('color').matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).withMessage('Valid color hex code required'),
  body('category').isIn([
    'essential-services', 'transportation', 'accommodation', 'dining', 
    'activities', 'culture-history', 'practical-info', 'safety-health', 
    'weather-climate', 'sustainability'
  ]).withMessage('Valid category required'),
  body('sections').isArray({ min: 1 }).withMessage('At least one section is required'),
  body('sections.*.title').notEmpty().trim().escape().withMessage('Section title is required'),
  body('sections.*.content').isArray({ min: 1 }).withMessage('Section content is required'),
  body('sections.*.content.*.name').notEmpty().trim().escape().withMessage('Content name is required'),
  body('sections.*.content.*.description').notEmpty().trim().escape().withMessage('Content description is required'),
  body('priority').optional().isInt({ min: 0, max: 100 }).withMessage('Priority must be between 0 and 100'),
  body('featured').optional().isBoolean().withMessage('Featured must be boolean'),
  body('tags').optional().isArray().withMessage('Tags must be an array'),
  body('markers').optional().isArray().withMessage('Markers must be an array')
];

const updateValidation = [
  param('id').isMongoId().withMessage('Valid page ID required'),
  body('title').optional().trim().escape(),
  body('description').optional().trim().escape(),
  body('color').optional().matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/),
  body('category').optional().isIn([
    'essential-services', 'transportation', 'accommodation', 'dining', 
    'activities', 'culture-history', 'practical-info', 'safety-health', 
    'weather-climate', 'sustainability'
  ]),
  body('priority').optional().isInt({ min: 0, max: 100 }),
  body('featured').optional().isBoolean(),
  body('tags').optional().isArray(),
  body('markers').optional().isArray()
];

const idValidation = [
  param('id').isMongoId().withMessage('Valid page ID required')
];

// PUBLIC ROUTES

// @desc    Get all info pages with search and filtering
// @route   GET /api/info
// @access  Public
router.get('/', searchValidation, getAllInfoPages);

// @desc    Get featured info pages
// @route   GET /api/info/featured/pages
// @access  Public
router.get('/featured/pages', getFeaturedPages);

// @desc    Get info pages by category
// @route   GET /api/info/category/:category
// @access  Public
router.get('/category/:category', categoryValidation, getPagesByCategory);

// @desc    Get single info page by slug
// @route   GET /api/info/:slug
// @access  Public
router.get('/:slug', slugValidation, getInfoPageBySlug);

// PROTECTED ADMIN ROUTES

// @desc    Get info page analytics/stats
// @route   GET /api/info/admin/analytics
// @access  Private/Admin
router.get('/admin/analytics', adminProtect, getAnalytics);

// @desc    Create new info page
// @route   POST /api/info
// @access  Private/Admin
router.post('/', adminProtect, createValidation, createInfoPage);

// @desc    Update info page
// @route   PUT /api/info/:id
// @access  Private/Admin
router.put('/:id', adminProtect, updateValidation, updateInfoPage);

// @desc    Toggle page active status
// @route   PATCH /api/info/:id/toggle-active
// @access  Private/Admin
router.patch('/:id/toggle-active', adminProtect, idValidation, toggleActiveStatus);

// @desc    Delete info page
// @route   DELETE /api/info/:id
// @access  Private/Admin
router.delete('/:id', adminProtect, idValidation, deleteInfoPage);

module.exports = router;