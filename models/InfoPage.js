// File Path: models/InfoPage.js

const mongoose = require('mongoose');

const InfoPageSchema = new mongoose.Schema(
  {
    title: { 
      type: String, 
      required: true,
      trim: true,
      index: true
    },
    description: { 
      type: String, 
      required: true,
      trim: true,
      index: true
    },
    slug: { 
      type: String, 
      required: true, 
      unique: true,
      trim: true,
      lowercase: true
    },
    icon: { 
      type: String, 
      required: true 
    },
    color: { 
      type: String, 
      required: true,
      match: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/
    },
    category: {
      type: String,
      enum: [
        'essential-services',
        'transportation',
        'accommodation',
        'dining',
        'activities',
        'culture-history',
        'practical-info',
        'safety-health',
        'weather-climate',
        'sustainability'
      ],
      required: true,
      index: true
    },
    sections: [
      {
        title: { 
          type: String, 
          required: true,
          trim: true,
          index: true
        },
        content: [
          {
            name: { 
              type: String, 
              required: true,
              trim: true,
              index: true
            },
            description: { 
              type: String, 
              required: true,
              trim: true,
              index: true
            },
            image: { 
              type: String,
              default: null
            },
            additionalInfo: {
              phone: { type: String },
              website: { type: String },
              hours: { type: String },
              address: { type: String },
              priceRange: { type: String },
              features: [{ type: String }],
              tips: [{ type: String }],
              warnings: [{ type: String }],
              locations: [{ type: String }],
              companies: [{ type: String }],
              dishes: [{ type: String }],
              preparations: [{ type: String }],
              specialties: [{ type: String }],
              varieties: [{ type: String }],
              activities: [{ type: String }],
              conditions: [{ type: String }],
              schools: [{ type: String }],
              topSites: [{ type: String }],
              marineLife: [{ type: String }],
              types: [{ type: String }],
              seasons: [{ type: String }],
              accepted: [{ type: String }],
              limitations: [{ type: String }],
              fees: [{ type: String }],
              banks: [{ type: String }],
              services: [{ type: String }],
              restaurants: { type: String },
              bars: { type: String },
              taxis: { type: String },
              hotels: { type: String },
              tours: { type: String },
              spas: { type: String }
            }
          }
        ]
      }
    ],
    markers: [
      {
        coordinates: {
          latitude: { 
            type: Number, 
            required: true,
            min: -90,
            max: 90
          },
          longitude: { 
            type: Number, 
            required: true,
            min: -180,
            max: 180
          }
        },
        title: { 
          type: String, 
          required: true,
          trim: true
        },
        description: { 
          type: String, 
          required: true,
          trim: true
        },
        type: {
          type: String,
          enum: ['store', 'restaurant', 'hotel', 'attraction', 'beach', 'airport', 'hospital', 'bank'],
          default: 'attraction'
        }
      }
    ],
    tags: [{ 
      type: String,
      trim: true,
      lowercase: true,
      index: true
    }],
    featured: { 
      type: Boolean, 
      default: false,
      index: true
    },
    priority: { 
      type: Number, 
      default: 0,
      min: 0,
      max: 100
    },
    isActive: { 
      type: Boolean, 
      default: true,
      index: true
    },
    views: { 
      type: Number, 
      default: 0 
    },
    lastUpdated: { 
      type: Date, 
      default: Date.now 
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false
    },
    seoMeta: {
      metaTitle: { type: String, maxlength: 60 },
      metaDescription: { type: String, maxlength: 160 },
      keywords: [{ type: String }]
    }
  },
  { 
    timestamps: true,
    collection: 'infopages'
  }
);

// Create text indexes for search functionality
InfoPageSchema.index({
  title: 'text',
  description: 'text',
  'sections.title': 'text',
  'sections.content.name': 'text',
  'sections.content.description': 'text',
  tags: 'text'
}, {
  weights: {
    title: 10,
    'sections.content.name': 8,
    description: 5,
    'sections.title': 5,
    'sections.content.description': 3,
    tags: 2
  },
  name: 'info_text_index'
});

// Create compound indexes for efficient querying
InfoPageSchema.index({ category: 1, featured: -1, priority: -1 });
InfoPageSchema.index({ isActive: 1, priority: -1, createdAt: -1 });
InfoPageSchema.index({ slug: 1 }, { unique: true });

// Pre-save middleware to generate slug and update lastUpdated
InfoPageSchema.pre('save', function(next) {
  if (this.isNew || this.isModified('title')) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  
  if (this.isModified() && !this.isNew) {
    this.lastUpdated = new Date();
  }
  
  next();
});

// Instance method to increment views
InfoPageSchema.methods.incrementViews = function() {
  this.views += 1;
  return this.save();
};

// Static method for search
InfoPageSchema.statics.searchPages = function(query, options = {}) {
  const {
    category,
    featured,
    limit = 20,
    skip = 0,
    sortBy = 'priority'
  } = options;

  const searchQuery = {
    isActive: true,
    ...(category && { category }),
    ...(featured !== undefined && { featured })
  };

  if (query && query.trim()) {
    searchQuery.$text = { $search: query };
  }

  let sortOptions = {};
  if (query && query.trim()) {
    sortOptions = { score: { $meta: 'textScore' }, priority: -1 };
  } else {
    switch (sortBy) {
      case 'views':
        sortOptions = { views: -1, priority: -1 };
        break;
      case 'recent':
        sortOptions = { lastUpdated: -1, priority: -1 };
        break;
      default:
        sortOptions = { priority: -1, createdAt: -1 };
    }
  }

  return this.find(searchQuery)
    .sort(sortOptions)
    .skip(skip)
    .limit(limit)
    .populate('author', 'username email')
    .lean();
};

module.exports = mongoose.model('InfoPage', InfoPageSchema);