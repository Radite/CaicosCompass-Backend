// File Path: controllers/infoController.js

const InfoPage = require('../models/InfoPage');
const { validationResult } = require('express-validator');

// @desc    Get all info pages with search and filtering
// @route   GET /api/info
// @access  Public
exports.getAllInfoPages = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const {
      search = '',
      category,
      featured,
      page = 1,
      limit = 20,
      sortBy = 'priority'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get total count for pagination
    const countQuery = {
      isActive: true,
      ...(category && { category }),
      ...(featured !== undefined && { featured: featured === 'true' })
    };
    
    if (search.trim()) {
      countQuery.$text = { $search: search };
    }
    
    const totalPages = await InfoPage.countDocuments(countQuery);
    
    // Get the actual results
    const pages = await InfoPage.searchPages(search, {
      category,
      featured: featured === 'true' ? true : featured === 'false' ? false : undefined,
      limit: parseInt(limit),
      skip,
      sortBy
    });

    res.json({
      success: true,
      data: pages,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalPages / parseInt(limit)),
        totalItems: totalPages,
        hasNextPage: parseInt(page) < Math.ceil(totalPages / parseInt(limit)),
        hasPrevPage: parseInt(page) > 1,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching info pages:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while fetching info pages'
    });
  }
};

// @desc    Get single info page by slug
// @route   GET /api/info/:slug
// @access  Public
exports.getInfoPageBySlug = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid slug format',
        errors: errors.array()
      });
    }

    const page = await InfoPage.findOne({ 
      slug: req.params.slug, 
      isActive: true 
    }).populate('author', 'username email');

    if (!page) {
      return res.status(404).json({ 
        success: false,
        message: 'Info page not found'
      });
    }

    // Increment view count
    await page.incrementViews();

    res.json({
      success: true,
      data: page
    });
  } catch (error) {
    console.error('Error fetching info page:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while fetching info page'
    });
  }
};

// @desc    Get featured info pages
// @route   GET /api/info/featured/pages
// @access  Public
exports.getFeaturedPages = async (req, res) => {
  try {
    const featuredPages = await InfoPage.find({ 
      featured: true, 
      isActive: true 
    })
    .sort({ priority: -1, createdAt: -1 })
    .limit(6)
    .select('title description slug icon color category views')
    .lean();

    res.json({
      success: true,
      data: featuredPages
    });
  } catch (error) {
    console.error('Error fetching featured pages:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while fetching featured pages'
    });
  }
};

// @desc    Get info pages by category
// @route   GET /api/info/category/:category
// @access  Public
exports.getPagesByCategory = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid category',
        errors: errors.array()
      });
    }

    const { limit = 20 } = req.query;
    
    const pages = await InfoPage.find({ 
      category: req.params.category, 
      isActive: true 
    })
    .sort({ priority: -1, createdAt: -1 })
    .limit(parseInt(limit))
    .select('title description slug icon color views lastUpdated')
    .lean();

    res.json({
      success: true,
      data: pages
    });
  } catch (error) {
    console.error('Error fetching pages by category:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while fetching pages by category'
    });
  }
};

// @desc    Create new info page
// @route   POST /api/info
// @access  Private/Admin
exports.createInfoPage = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const pageData = {
      ...req.body,
      author: req.user.id
    };

    // Check if slug already exists
    const slug = pageData.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    
    const existingPage = await InfoPage.findOne({ slug });
    if (existingPage) {
      return res.status(400).json({ 
        success: false,
        message: 'A page with this title already exists'
      });
    }

    const newPage = new InfoPage(pageData);
    await newPage.save();

    res.status(201).json({
      success: true,
      message: 'Info page created successfully',
      data: newPage
    });
  } catch (error) {
    console.error('Error creating info page:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while creating info page'
    });
  }
};

// @desc    Update info page
// @route   PUT /api/info/:id
// @access  Private/Admin
exports.updateInfoPage = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const page = await InfoPage.findById(req.params.id);
    if (!page) {
      return res.status(404).json({ 
        success: false,
        message: 'Info page not found'
      });
    }

    // Update fields
    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== undefined) {
        page[key] = req.body[key];
      }
    });

    await page.save();

    res.json({
      success: true,
      message: 'Info page updated successfully',
      data: page
    });
  } catch (error) {
    console.error('Error updating info page:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while updating info page'
    });
  }
};

// @desc    Toggle page active status
// @route   PATCH /api/info/:id/toggle-active
// @access  Private/Admin
exports.toggleActiveStatus = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const page = await InfoPage.findById(req.params.id);
    if (!page) {
      return res.status(404).json({ 
        success: false,
        message: 'Info page not found'
      });
    }

    page.isActive = !page.isActive;
    await page.save();

    res.json({
      success: true,
      message: `Info page ${page.isActive ? 'activated' : 'deactivated'} successfully`,
      data: { isActive: page.isActive }
    });
  } catch (error) {
    console.error('Error toggling page status:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while toggling page status'
    });
  }
};

// @desc    Delete info page
// @route   DELETE /api/info/:id
// @access  Private/Admin
exports.deleteInfoPage = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const page = await InfoPage.findById(req.params.id);
    if (!page) {
      return res.status(404).json({ 
        success: false,
        message: 'Info page not found'
      });
    }

    await page.deleteOne();

    res.json({
      success: true,
      message: 'Info page deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting info page:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while deleting info page'
    });
  }
};

// @desc    Get info page analytics/stats
// @route   GET /api/info/admin/analytics
// @access  Private/Admin
exports.getAnalytics = async (req, res) => {
  try {
    const totalPages = await InfoPage.countDocuments();
    const activePages = await InfoPage.countDocuments({ isActive: true });
    const featuredPages = await InfoPage.countDocuments({ featured: true });
    
    const categoryStats = await InfoPage.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const topViewedPages = await InfoPage.find({ isActive: true })
      .sort({ views: -1 })
      .limit(5)
      .select('title views slug')
      .lean();

    const recentlyUpdated = await InfoPage.find({ isActive: true })
      .sort({ lastUpdated: -1 })
      .limit(5)
      .select('title lastUpdated slug')
      .lean();

    const totalViews = await InfoPage.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: null, totalViews: { $sum: '$views' } } }
    ]);

    res.json({
      success: true,
      data: {
        overview: {
          totalPages,
          activePages,
          featuredPages,
          inactivePages: totalPages - activePages,
          totalViews: totalViews[0]?.totalViews || 0
        },
        categoryStats,
        topViewedPages,
        recentlyUpdated
      }
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while fetching analytics'
    });
  }
};