// controllers/faqController.js
const FAQ = require('../models/FAQ');
const Category = require('../models/Category');
const mongoose = require('mongoose');

const faqController = {
  // Get all FAQs with filtering and pagination
  getAllFAQs: async (req, res) => {
    try {
      const {
        category,
        status = 'published',
        search,
        page = 1,
        limit = 10,
        sortBy = 'priority'
      } = req.query;

      const filter = { isActive: true };
      
      if (category) {
        const categoryDoc = await Category.findOne({ name: category });
        if (categoryDoc) {
          filter.category = categoryDoc._id;
        }
      }
      
      if (status !== 'all') {
        filter.status = status;
      }

      let query = FAQ.find(filter).populate('category', 'name color icon');

      // Text search
      if (search) {
        query = query.find({
          $or: [
            { question: { $regex: search, $options: 'i' } },
            { answer: { $regex: search, $options: 'i' } },
            { tags: { $in: [new RegExp(search, 'i')] } }
          ]
        });
      }

      // Sorting
      const sortOptions = {
        priority: { priority: 1, createdAt: -1 },
        newest: { createdAt: -1 },
        oldest: { createdAt: 1 },
        popular: { viewCount: -1 }
      };
      query = query.sort(sortOptions[sortBy] || sortOptions.priority);

      // Pagination
      const skip = (page - 1) * limit;
      query = query.skip(skip).limit(parseInt(limit));

      const faqs = await query;
      const total = await FAQ.countDocuments(filter);

      res.json({
        success: true,
        data: faqs,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total,
          limit: parseInt(limit)
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching FAQs',
        error: error.message
      });
    }
  },

  // Get single FAQ by ID
  getFAQById: async (req, res) => {
    try {
      const faq = await FAQ.findById(req.params.id).populate('category');
      
      if (!faq || !faq.isActive) {
        return res.status(404).json({
          success: false,
          message: 'FAQ not found'
        });
      }

      // Increment view count
      faq.viewCount += 1;
      await faq.save();

      res.json({
        success: true,
        data: faq
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching FAQ',
        error: error.message
      });
    }
  },

  // UPDATED CREATE FAQ - Works with category name OR id
  createFAQ: async (req, res) => {
    try {
      const { question, answer, category, tags, priority, status } = req.body;

      let categoryDoc;

      // Check if category is provided as name or ID
      if (mongoose.Types.ObjectId.isValid(category)) {
        // It's an ObjectId
        categoryDoc = await Category.findById(category);
      } else {
        // It's a name, find by name
        categoryDoc = await Category.findOne({ 
          name: { $regex: new RegExp(`^${category}$`, 'i') }, // Case insensitive
          isActive: true 
        });
      }

      if (!categoryDoc) {
        return res.status(400).json({
          success: false,
          message: `Category '${category}' not found`
        });
      }

      const faq = new FAQ({
        question,
        answer,
        category: categoryDoc._id, // Always store as ObjectId
        tags: tags || [],
        priority: priority || 1,
        status: status || 'published'
      });

      await faq.save();
      await faq.populate('category');

      res.status(201).json({
        success: true,
        data: faq,
        message: 'FAQ created successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'Error creating FAQ',
        error: error.message
      });
    }
  },

  // BULK CREATE FAQS
  bulkCreateFAQs: async (req, res) => {
    try {
      const { faqs } = req.body;

      if (!Array.isArray(faqs) || faqs.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'FAQs array is required and cannot be empty'
        });
      }

      const validFAQs = [];
      const errors = [];

      // Get all categories for name lookup
      const allCategories = await Category.find({ isActive: true });
      const categoryMap = {};
      allCategories.forEach(cat => {
        categoryMap[cat.name.toLowerCase()] = cat._id;
      });

      for (let i = 0; i < faqs.length; i++) {
        const faq = faqs[i];
        
        // Validate required fields
        if (!faq.question || faq.question.trim() === '') {
          errors.push(`FAQ at index ${i}: question is required`);
          continue;
        }
        if (!faq.answer || faq.answer.trim() === '') {
          errors.push(`FAQ at index ${i}: answer is required`);
          continue;
        }
        if (!faq.category) {
          errors.push(`FAQ at index ${i}: category is required`);
          continue;
        }

        // Find category by name or ID
        let categoryId;
        if (mongoose.Types.ObjectId.isValid(faq.category)) {
          categoryId = faq.category;
        } else {
          categoryId = categoryMap[faq.category.toLowerCase()];
          if (!categoryId) {
            errors.push(`FAQ at index ${i}: category '${faq.category}' not found`);
            continue;
          }
        }

        validFAQs.push({
          question: faq.question.trim(),
          answer: faq.answer.trim(),
          category: categoryId,
          tags: faq.tags || [],
          priority: faq.priority || 1,
          status: faq.status || 'published',
          viewCount: 0,
          isActive: true
        });
      }

      if (errors.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors,
          validCount: validFAQs.length
        });
      }

      // Bulk insert FAQs
      const createdFAQs = await FAQ.insertMany(validFAQs);

      // Populate categories for response
      const populatedFAQs = await FAQ.find({
        _id: { $in: createdFAQs.map(f => f._id) }
      }).populate('category');

      res.status(201).json({
        success: true,
        data: populatedFAQs,
        message: `Successfully created ${createdFAQs.length} FAQs`,
        total: createdFAQs.length
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error creating FAQs',
        error: error.message
      });
    }
  },

  // Update FAQ
  updateFAQ: async (req, res) => {
    try {
      const { question, answer, category, tags, priority, status } = req.body;

      // Validate category if provided
      if (category) {
        const categoryDoc = await Category.findById(category);
        if (!categoryDoc) {
          return res.status(400).json({
            success: false,
            message: 'Invalid category'
          });
        }
      }

      const faq = await FAQ.findByIdAndUpdate(
        req.params.id,
        {
          question,
          answer,
          category,
          tags,
          priority,
          status
        },
        { new: true, runValidators: true }
      ).populate('category');

      if (!faq) {
        return res.status(404).json({
          success: false,
          message: 'FAQ not found'
        });
      }

      res.json({
        success: true,
        data: faq,
        message: 'FAQ updated successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'Error updating FAQ',
        error: error.message
      });
    }
  },

  // Delete FAQ (soft delete)
  deleteFAQ: async (req, res) => {
    try {
      const faq = await FAQ.findByIdAndUpdate(
        req.params.id,
        { isActive: false },
        { new: true }
      );

      if (!faq) {
        return res.status(404).json({
          success: false,
          message: 'FAQ not found'
        });
      }

      res.json({
        success: true,
        message: 'FAQ deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error deleting FAQ',
        error: error.message
      });
    }
  },

  // Get FAQ statistics
  getFAQStats: async (req, res) => {
    try {
      const stats = await FAQ.aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);

      const totalFAQs = await FAQ.countDocuments({ isActive: true });
      const totalViews = await FAQ.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: null, total: { $sum: '$viewCount' } } }
      ]);

      res.json({
        success: true,
        data: {
          total: totalFAQs,
          totalViews: totalViews[0]?.total || 0,
          byStatus: stats
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching FAQ statistics',
        error: error.message
      });
    }
  }
};

module.exports = faqController;

