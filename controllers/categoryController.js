// controllers/categoryController.js
const Category = require('../models/Category');
const FAQ = require('../models/FAQ');

const categoryController = {
  // Get all categories
  getAllCategories: async (req, res) => {
    try {
      const categories = await Category.find({ isActive: true })
        .sort({ sortOrder: 1, name: 1 });

      // Get FAQ count for each category
      const categoriesWithCount = await Promise.all(
        categories.map(async (category) => {
          const faqCount = await FAQ.countDocuments({
            category: category._id,
            isActive: true,
            status: 'published'
          });
          return {
            ...category.toObject(),
            faqCount
          };
        })
      );

      res.json({
        success: true,
        data: categoriesWithCount
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching categories',
        error: error.message
      });
    }
  },

  // Get single category
  getCategoryById: async (req, res) => {
    try {
      const category = await Category.findById(req.params.id);
      
      if (!category || !category.isActive) {
        return res.status(404).json({
          success: false,
          message: 'Category not found'
        });
      }

      res.json({
        success: true,
        data: category
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching category',
        error: error.message
      });
    }
  },

  // Create category
  createCategory: async (req, res) => {
    try {
      const { name, description, color, icon, sortOrder } = req.body;

      const category = new Category({
        name,
        description,
        color: color || '#3B82F6',
        icon: icon || 'HelpCircle',
        sortOrder: sortOrder || 0
      });

      await category.save();

      res.status(201).json({
        success: true,
        data: category,
        message: 'Category created successfully'
      });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          message: 'Category name already exists'
        });
      }
      res.status(400).json({
        success: false,
        message: 'Error creating category',
        error: error.message
      });
    }
  },

  // Update category
  updateCategory: async (req, res) => {
    try {
      const { name, description, color, icon, sortOrder } = req.body;

      const category = await Category.findByIdAndUpdate(
        req.params.id,
        { name, description, color, icon, sortOrder },
        { new: true, runValidators: true }
      );

      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Category not found'
        });
      }

      res.json({
        success: true,
        data: category,
        message: 'Category updated successfully'
      });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          message: 'Category name already exists'
        });
      }
      res.status(400).json({
        success: false,
        message: 'Error updating category',
        error: error.message
      });
    }
  },

  // Delete category
  deleteCategory: async (req, res) => {
    try {
      // Check if category has FAQs
      const faqCount = await FAQ.countDocuments({
        category: req.params.id,
        isActive: true
      });

      if (faqCount > 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete category with existing FAQs'
        });
      }

      const category = await Category.findByIdAndUpdate(
        req.params.id,
        { isActive: false },
        { new: true }
      );

      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Category not found'
        });
      }

      res.json({
        success: true,
        message: 'Category deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error deleting category',
        error: error.message
      });
    }
  },

  // BULK CREATE CATEGORIES
  bulkCreateCategories: async (req, res) => {
    try {
      const { categories } = req.body;

      if (!Array.isArray(categories) || categories.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Categories array is required and cannot be empty'
        });
      }

      // Validate each category
      const validCategories = [];
      const errors = [];

      for (let i = 0; i < categories.length; i++) {
        const cat = categories[i];
        if (!cat.name || cat.name.trim() === '') {
          errors.push(`Category at index ${i}: name is required`);
          continue;
        }

        validCategories.push({
          name: cat.name.trim(),
          description: cat.description || '',
          color: cat.color || '#3B82F6',
          icon: cat.icon || 'HelpCircle',
          sortOrder: cat.sortOrder || i + 1,
          isActive: true
        });
      }

      if (errors.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors
        });
      }

      // Bulk insert categories
      const createdCategories = await Category.insertMany(validCategories, { 
        ordered: false // Continue inserting even if some fail due to duplicates
      });

      res.status(201).json({
        success: true,
        data: createdCategories,
        message: `Successfully created ${createdCategories.length} categories`,
        total: createdCategories.length
      });

    } catch (error) {
      // Handle duplicate key errors
      if (error.code === 11000) {
        const duplicateErrors = [];
        if (error.writeErrors) {
          error.writeErrors.forEach((err, index) => {
            if (err.code === 11000) {
              duplicateErrors.push(`Category "${categories[err.index]?.name}" already exists`);
            }
          });
        }

        return res.status(400).json({
          success: false,
          message: 'Some categories already exist',
          errors: duplicateErrors,
          insertedCount: error.result?.nInserted || 0
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error creating categories',
        error: error.message
      });
    }
  }

};



module.exports = categoryController;

