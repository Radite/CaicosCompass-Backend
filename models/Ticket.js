const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  ticketNumber: {
    type: String,
    unique: true,
    index: true
    // Not required - will be auto-generated in pre-save hook
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: [
      'general_inquiry',
      'booking_issue',
      'payment_problem',
      'technical_support',
      'account_access',
      'feature_request',
      'bug_report',
      'partnership_inquiry',
      'vendor_support',
      'refund_request',
      'complaint',
      'other'
    ]
  },
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    trim: true,
    maxlength: [200, 'Subject cannot exceed 200 characters']
  },
  message: {
    type: String,
    required: [true, 'Message is required'],
    trim: true,
    maxlength: [5000, 'Message cannot exceed 5000 characters']
  },
  status: {
    type: String,
    enum: ['open', 'in_progress', 'resolved', 'closed'],
    default: 'open'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  notes: [{
    text: String,
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  metadata: {
    ipAddress: String,
    userAgent: String,
    referrer: String
  }
}, {
  timestamps: true
});

// Generate unique ticket number before saving
ticketSchema.pre('save', async function(next) {
  if (!this.ticketNumber) {
    let isUnique = false;
    let attempts = 0;
    
    while (!isUnique && attempts < 10) {
      const date = new Date();
      const year = date.getFullYear().toString().slice(-2);
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
      const ticketNumber = `TKT-${year}${month}-${random}`;
      
      // Check if ticket number already exists
      const existing = await this.constructor.findOne({ ticketNumber });
      if (!existing) {
        this.ticketNumber = ticketNumber;
        isUnique = true;
      }
      attempts++;
    }
    
    if (!isUnique) {
      throw new Error('Failed to generate unique ticket number');
    }
  }
  next();
});

// Index for faster queries
ticketSchema.index({ email: 1, createdAt: -1 });
ticketSchema.index({ status: 1, priority: -1 });
ticketSchema.index({ category: 1, createdAt: -1 });

const Ticket = mongoose.model('Ticket', ticketSchema);

module.exports = Ticket;