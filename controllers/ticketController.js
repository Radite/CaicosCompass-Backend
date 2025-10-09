const Ticket = require('../models/Ticket');
const { check, validationResult } = require('express-validator');

// Helper function to get category display name
const getCategoryName = (category) => {
  const categories = {
    'general_inquiry': 'General Inquiry',
    'booking_issue': 'Booking Issue',
    'payment_problem': 'Payment Problem',
    'technical_support': 'Technical Support',
    'account_access': 'Account Access',
    'feature_request': 'Feature Request',
    'bug_report': 'Bug Report',
    'partnership_inquiry': 'Partnership Inquiry',
    'vendor_support': 'Vendor Support',
    'refund_request': 'Refund Request',
    'complaint': 'Complaint',
    'other': 'Other'
  };
  return categories[category] || category;
};

// Helper function to send ticket emails using Brevo
const sendTicketEmails = async (ticket) => {
  const SibApiV3Sdk = require('sib-api-v3-sdk');
  const defaultClient = SibApiV3Sdk.ApiClient.instance;
  
  const apiKey = defaultClient.authentications['api-key'];
  apiKey.apiKey = process.env.BREVO_API_KEY;
  
  const emailApi = new SibApiV3Sdk.TransactionalEmailsApi();

  const categoryName = getCategoryName(ticket.category);
  
  // Email to customer
  const customerEmail = {
    sender: { 
      name: 'TurksExplorer Support', 
      email: process.env.FROM_EMAIL || 'noreply@turksexplorer.com' 
    },
    to: [{ email: ticket.email, name: ticket.name }],
    subject: `Support Ticket Created - ${ticket.ticketNumber}`,
    htmlContent: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
          .ticket-info { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
          .ticket-number { font-size: 24px; font-weight: bold; color: #667eea; margin-bottom: 10px; }
          .label { font-weight: bold; color: #555; display: inline-block; width: 120px; }
          .footer { text-align: center; margin-top: 30px; color: #888; font-size: 12px; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎫 Support Ticket Received</h1>
          </div>
          <div class="content">
            <p>Hi ${ticket.name},</p>
            <p>Thank you for contacting TurksExplorer Support. We've received your support ticket and our team will review it shortly.</p>
            
            <div class="ticket-info">
              <div class="ticket-number">${ticket.ticketNumber}</div>
              <p><span class="label">Category:</span> ${categoryName}</p>
              <p><span class="label">Subject:</span> ${ticket.subject}</p>
              <p><span class="label">Status:</span> Open</p>
              <p><span class="label">Priority:</span> ${ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}</p>
              <p><span class="label">Submitted:</span> ${new Date(ticket.createdAt).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })}</p>
            </div>

            <div style="background: #fff; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="font-weight: bold; margin-bottom: 10px;">Your Message:</p>
              <p style="color: #555;">${ticket.message.replace(/\n/g, '<br>')}</p>
            </div>

            <p><strong>What happens next?</strong></p>
            <ul>
              <li>Our support team will review your ticket within 24-48 hours</li>
              <li>You'll receive updates via email at ${ticket.email}</li>
              <li>For urgent matters, we may contact you directly</li>
            </ul>

            <p>Please reference ticket number <strong>${ticket.ticketNumber}</strong> in any future correspondence.</p>
            
            <div class="footer">
              <p>TurksExplorer Support Team<br>
              © ${new Date().getFullYear()} TurksExplorer. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  };

  // Email to admin
  const adminEmail = {
    sender: { 
      name: 'TurksExplorer System', 
      email: process.env.FROM_EMAIL || 'noreply@turksexplorer.com' 
    },
    to: [{ email: process.env.SUPPORT_EMAIL || 'support@turksexplorer.com' }],
    subject: `🆕 New Support Ticket: ${ticket.ticketNumber} - ${categoryName}`,
    htmlContent: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 700px; margin: 0 auto; padding: 20px; }
          .header { background: #dc3545; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .alert { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }
          .details { background: white; padding: 25px; border: 1px solid #dee2e6; border-radius: 8px; }
          .field { margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #f0f0f0; }
          .field:last-child { border-bottom: none; }
          .label { font-weight: bold; color: #495057; margin-bottom: 5px; }
          .value { color: #212529; }
          .priority-${ticket.priority} { 
            display: inline-block; 
            padding: 4px 12px; 
            border-radius: 12px; 
            font-size: 12px; 
            font-weight: bold;
            ${ticket.priority === 'urgent' ? 'background: #dc3545; color: white;' : 
              ticket.priority === 'high' ? 'background: #fd7e14; color: white;' :
              ticket.priority === 'medium' ? 'background: #ffc107; color: #212529;' :
              'background: #6c757d; color: white;'}
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>🆕 New Support Ticket</h2>
          </div>
          <div class="alert">
            <strong>Action Required:</strong> A new support ticket has been submitted and requires attention.
          </div>
          <div class="details">
            <div class="field">
              <div class="label">Ticket Number</div>
              <div class="value" style="font-size: 20px; font-weight: bold; color: #667eea;">${ticket.ticketNumber}</div>
            </div>
            <div class="field">
              <div class="label">Category</div>
              <div class="value">${categoryName}</div>
            </div>
            <div class="field">
              <div class="label">Priority</div>
              <div class="value"><span class="priority-${ticket.priority}">${ticket.priority.toUpperCase()}</span></div>
            </div>
            <div class="field">
              <div class="label">Customer Information</div>
              <div class="value">
                <strong>Name:</strong> ${ticket.name}<br>
                <strong>Email:</strong> <a href="mailto:${ticket.email}">${ticket.email}</a>
              </div>
            </div>
            <div class="field">
              <div class="label">Subject</div>
              <div class="value">${ticket.subject}</div>
            </div>
            <div class="field">
              <div class="label">Message</div>
              <div class="value" style="white-space: pre-wrap; background: #f8f9fa; padding: 15px; border-radius: 4px;">${ticket.message}</div>
            </div>
            <div class="field">
              <div class="label">Submitted</div>
              <div class="value">${new Date(ticket.createdAt).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })}</div>
            </div>
            ${ticket.metadata?.ipAddress ? `
            <div class="field">
              <div class="label">Technical Details</div>
              <div class="value" style="font-size: 12px; color: #6c757d;">
                IP: ${ticket.metadata.ipAddress}<br>
                ${ticket.metadata.userAgent ? `User Agent: ${ticket.metadata.userAgent}` : ''}
              </div>
            </div>
            ` : ''}
          </div>
          <p style="text-align: center; margin-top: 30px; color: #6c757d; font-size: 12px;">
            This is an automated notification from TurksExplorer Support System
          </p>
        </div>
      </body>
      </html>
    `
  };

  try {
    await Promise.all([
      emailApi.sendTransacEmail(customerEmail),
      emailApi.sendTransacEmail(adminEmail)
    ]);
    console.log(`✅ Ticket emails sent successfully for ${ticket.ticketNumber}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Error sending ticket emails:', error);
    // Don't throw error - ticket should still be created even if emails fail
    return { success: false, error: error.message };
  }
};

// Validation rules
exports.validateTicket = [
  check('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
  check('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail(),
  check('category')
    .notEmpty().withMessage('Category is required')
    .isIn([
      'general_inquiry', 'booking_issue', 'payment_problem', 
      'technical_support', 'account_access', 'feature_request',
      'bug_report', 'partnership_inquiry', 'vendor_support',
      'refund_request', 'complaint', 'other'
    ]).withMessage('Invalid category'),
  check('subject')
    .trim()
    .notEmpty().withMessage('Subject is required')
    .isLength({ min: 5, max: 200 }).withMessage('Subject must be between 5 and 200 characters'),
  check('message')
    .trim()
    .notEmpty().withMessage('Message is required')
    .isLength({ min: 10, max: 5000 }).withMessage('Message must be between 10 and 5000 characters')
];

// Create new ticket
exports.createTicket = async (req, res) => {
  try {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Validation failed',
        errors: errors.array() 
      });
    }

    const { name, email, category, subject, message } = req.body;

    // Create ticket
    const ticket = new Ticket({
      name,
      email,
      category,
      subject,
      message,
      userId: req.user?._id || null,
      metadata: {
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'],
        referrer: req.headers['referer'] || req.headers['referrer']
      }
    });

    await ticket.save();

    // Send notification emails (async, don't wait)
    sendTicketEmails(ticket).catch(err => 
      console.error('Failed to send ticket emails:', err)
    );

    res.status(201).json({
      success: true,
      message: 'Support ticket created successfully',
      data: {
        ticketNumber: ticket.ticketNumber,
        category: getCategoryName(ticket.category),
        status: ticket.status,
        createdAt: ticket.createdAt
      }
    });

  } catch (error) {
    console.error('Error creating ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create support ticket',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get all tickets (admin only)
exports.getAllTickets = async (req, res) => {
  try {
    const { 
      status, 
      category, 
      priority, 
      page = 1, 
      limit = 20,
      sortBy = 'createdAt',
      order = 'desc'
    } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (priority) filter.priority = priority;

    const tickets = await Ticket.find(filter)
      .sort({ [sortBy]: order === 'desc' ? -1 : 1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .select('-metadata');

    const total = await Ticket.countDocuments(filter);

    res.json({
      success: true,
      data: tickets,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error fetching tickets:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tickets'
    });
  }
};

// Get single ticket
exports.getTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findOne({ 
      ticketNumber: req.params.ticketNumber 
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    res.json({
      success: true,
      data: ticket
    });

  } catch (error) {
    console.error('Error fetching ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch ticket'
    });
  }
};

// Update ticket status (admin only)
exports.updateTicketStatus = async (req, res) => {
  try {
    const { status, priority, notes } = req.body;
    const ticket = await Ticket.findOne({ 
      ticketNumber: req.params.ticketNumber 
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    if (status) ticket.status = status;
    if (priority) ticket.priority = priority;
    if (notes) {
      ticket.notes.push({
        text: notes,
        addedBy: req.user._id,
        addedAt: new Date()
      });
    }

    await ticket.save();

    res.json({
      success: true,
      message: 'Ticket updated successfully',
      data: ticket
    });

  } catch (error) {
    console.error('Error updating ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update ticket'
    });
  }
};

// Get ticket statistics (admin only)
exports.getTicketStats = async (req, res) => {
  try {
    const [
      totalTickets,
      openTickets,
      inProgressTickets,
      resolvedTickets,
      categoryStats,
      priorityStats
    ] = await Promise.all([
      Ticket.countDocuments(),
      Ticket.countDocuments({ status: 'open' }),
      Ticket.countDocuments({ status: 'in_progress' }),
      Ticket.countDocuments({ status: 'resolved' }),
      Ticket.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      Ticket.aggregate([
        { $group: { _id: '$priority', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ])
    ]);

    res.json({
      success: true,
      data: {
        total: totalTickets,
        byStatus: {
          open: openTickets,
          inProgress: inProgressTickets,
          resolved: resolvedTickets,
          closed: totalTickets - (openTickets + inProgressTickets + resolvedTickets)
        },
        byCategory: categoryStats.map(stat => ({
          category: getCategoryName(stat._id),
          count: stat.count
        })),
        byPriority: priorityStats
      }
    });

  } catch (error) {
    console.error('Error fetching ticket stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch ticket statistics'
    });
  }
};

module.exports = exports;