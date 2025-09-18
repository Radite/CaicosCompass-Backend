const User = require('../models/User');
const Service = require('../models/Service');
const { validationResult } = require('express-validator');
const mongoose = require('mongoose');

// Helper function to get service model based on type
const getServiceModel = (serviceType) => {
  const models = {
    'Activity': require('../models/Activity'),
    'Stay': require('../models/Stay'),
    'Dining': require('../models/Dining'),
    'Transportation': require('../models/Transportation')
  };
  return models[serviceType];
};

// Helper function to calculate average rating
const calculateAverageRating = (reviews) => {
  if (!reviews || reviews.length === 0) return 0;
  const sum = reviews.reduce((acc, review) => acc + (review.rating || 0), 0);
  return Math.round((sum / reviews.length) * 10) / 10; // Round to 1 decimal place
};

// Helper function to get vendor metrics
const getVendorMetrics = async (vendorId) => {
  try {
    // Get all services for this vendor
    const services = await Service.find({ vendor: vendorId, status: 'active' });
    
    // Calculate total reviews and average rating across all services
    let totalReviews = 0;
    let totalRatingSum = 0;
    
    services.forEach(service => {
      if (service.reviews && service.reviews.length > 0) {
        totalReviews += service.reviews.length;
        service.reviews.forEach(review => {
          totalRatingSum += review.rating || 0;
        });
      }
    });

    const averageRating = totalReviews > 0 ? Math.round((totalRatingSum / totalReviews) * 10) / 10 : 0;

    return {
      totalServices: services.length,
      totalReviews,
      averageRating,
      serviceTypes: [...new Set(services.map(s => s.serviceType))]
    };
  } catch (error) {
    console.error('Error calculating vendor metrics:', error);
    return {
      totalServices: 0,
      totalReviews: 0,
      averageRating: 0,
      serviceTypes: []
    };
  }
};

// @desc    Get vendor public profile
// @route   GET /api/vendor/public/:vendorId
// @access  Public
exports.getVendorPublicProfile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { vendorId } = req.params;

    // Find vendor with business profile
    const vendor = await User.findById(vendorId)
      .select('name email role businessProfile dateOfBirth createdAt')
      .lean();

    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }

    // Check if vendor is a business manager and approved
    if (vendor.role !== 'business-manager' || !vendor.businessProfile?.isApproved) {
      return res.status(404).json({ 
        message: 'Vendor profile not available',
        debug: {
          role: vendor.role,
          isApproved: vendor.businessProfile?.isApproved,
          hasBusinessProfile: !!vendor.businessProfile
        }
      });
    }

    // Get vendor metrics
    const metrics = await getVendorMetrics(vendorId);

    // Format response
    const publicProfile = {
      _id: vendor._id,
      name: vendor.name,
      businessName: vendor.businessProfile.businessName,
      businessType: vendor.businessProfile.businessType,
      description: vendor.businessProfile.businessDescription,
      location: {
        address: vendor.businessProfile.businessAddress,
        island: vendor.businessProfile.businessAddress?.island
      },
      contact: {
        phone: vendor.businessProfile.settings?.showPhoneNumber ? vendor.businessProfile.businessPhone : null,
        website: vendor.businessProfile.businessWebsite || vendor.businessProfile.socialMedia?.website
      },
      socialMedia: vendor.businessProfile.socialMedia,
      servicesOffered: vendor.businessProfile.servicesOffered,
      images: {
        logo: vendor.businessProfile.logo,
        coverImage: vendor.businessProfile.coverImage
      },
      operatingHours: vendor.businessProfile.operatingHours,
      metrics,
      memberSince: vendor.createdAt,
      settings: {
        allowReviews: vendor.businessProfile.settings?.allowReviews !== false
      }
    };

    res.status(200).json({
      success: true,
      data: publicProfile
    });

  } catch (error) {
    console.error('Error fetching vendor public profile:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching vendor profile', 
      error: error.message 
    });
  }
};

// @desc    Get vendor services with pagination and filtering
// @route   GET /api/vendor/public/:vendorId/services
// @access  Public
exports.getVendorServices = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { vendorId } = req.params;
    const { 
      page = 1, 
      limit = 12, 
      serviceType, 
      sortBy = 'createdAt',
      sortOrder = 'desc',
      minPrice,
      maxPrice
    } = req.query;

    // Build the base filter query
    const filter = { 
      vendor: vendorId, 
      status: 'active' 
    };

    if (serviceType) {
      filter.serviceType = serviceType;
    }

    // UPDATED: Handle price filtering for both regular services and stays
    if (minPrice || maxPrice) {
      const priceCondition = {};
      if (minPrice) priceCondition.$gte = Number(minPrice);
      if (maxPrice) priceCondition.$lte = Number(maxPrice);
      
      filter.$or = [
        { price: priceCondition },
        { pricePerNight: priceCondition }
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const sortOptions = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    // Fetch services from the database
    const services = await Service.find(filter)
      .sort(sortOptions)
      .skip(skip)
      .limit(Number(limit))
      // UPDATED: Added 'pricePerNight' to the select statement
      .select('name description images price pricePerNight pricingType serviceType category reviews location')
      .lean();

    const totalServices = await Service.countDocuments(filter);
    const totalPages = Math.ceil(totalServices / Number(limit));

    // Map services to add calculated fields
    const servicesWithRating = services.map(service => ({
      ...service,
      averageRating: calculateAverageRating(service.reviews),
      reviewCount: service.reviews?.length || 0
    }));

    res.status(200).json({
      success: true,
      data: {
        services: servicesWithRating,
        pagination: {
          currentPage: Number(page),
          totalPages,
          totalServices,
          hasNextPage: Number(page) < totalPages,
          hasPrevPage: Number(page) > 1
        }
      }
    });

  } catch (error) {
    console.error('Error fetching vendor services:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching vendor services', 
      error: error.message 
    });
  }
};
// @desc    Get vendor reviews
// @route   GET /api/vendor/public/:vendorId/reviews
// @access  Public
exports.getVendorReviews = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { page = 1, limit = 10, rating } = req.query;

    // Get all services for this vendor
    const services = await Service.find({ vendor: vendorId, status: 'active' })
      .populate({
        path: 'reviews.user',
        select: 'name'
      })
      .lean();

    // Aggregate all reviews from all services
    let allReviews = [];
    services.forEach(service => {
      if (service.reviews && service.reviews.length > 0) {
        service.reviews.forEach(review => {
          allReviews.push({
            ...review,
            serviceName: service.name,
            serviceId: service._id,
            serviceType: service.serviceType
          });
        });
      }
    });

    // Filter by rating if specified
    if (rating) {
      allReviews = allReviews.filter(review => review.rating === Number(rating));
    }

    // Sort by date (newest first)
    allReviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Pagination
    const skip = (Number(page) - 1) * Number(limit);
    const paginatedReviews = allReviews.slice(skip, skip + Number(limit));
    const totalReviews = allReviews.length;
    const totalPages = Math.ceil(totalReviews / Number(limit));

    // Calculate rating distribution
    const ratingDistribution = {
      5: allReviews.filter(r => r.rating === 5).length,
      4: allReviews.filter(r => r.rating === 4).length,
      3: allReviews.filter(r => r.rating === 3).length,
      2: allReviews.filter(r => r.rating === 2).length,
      1: allReviews.filter(r => r.rating === 1).length
    };

    const averageRating = calculateAverageRating(allReviews);

    res.status(200).json({
      success: true,
      data: {
        reviews: paginatedReviews,
        summary: {
          totalReviews,
          averageRating,
          ratingDistribution
        },
        pagination: {
          currentPage: Number(page),
          totalPages,
          hasNextPage: Number(page) < totalPages,
          hasPrevPage: Number(page) > 1
        }
      }
    });

  } catch (error) {
    console.error('Error fetching vendor reviews:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching vendor reviews', 
      error: error.message 
    });
  }
};

// @desc    Get vendor by username (SEO-friendly)
// @route   GET /api/vendor/profile/:username
// @access  Public
exports.getVendorByUsername = async (req, res) => {
  try {
    const { username } = req.params;

    const vendor = await User.findOne({ username })
      .select('_id name role businessProfile')
      .lean();

    if (!vendor || vendor.role !== 'business-manager' || !vendor.businessProfile?.isApproved) {
      return res.status(404).json({ message: 'Vendor not found' });
    }

    // Redirect to vendor ID-based profile
    res.status(200).json({
      success: true,
      data: {
        vendorId: vendor._id,
        redirectUrl: `/vendor/public/${vendor._id}`
      }
    });

  } catch (error) {
    console.error('Error fetching vendor by username:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching vendor profile', 
      error: error.message 
    });
  }
};