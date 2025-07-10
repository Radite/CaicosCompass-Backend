// controllers/emailService.js - Complete Email Service
const nodemailer = require('nodemailer');
const SibApiV3Sdk = require('sib-api-v3-sdk');

// Configure email transporter (using Gmail SMTP as fallback)
const createTransporter = () => {
  if (process.env.SENDINBLUE_API_KEY) {
    // Use SendinBlue/Brevo for production
    const defaultClient = SibApiV3Sdk.ApiClient.instance;
    const apiKey = defaultClient.authentications['api-key'];
    apiKey.apiKey = process.env.SENDINBLUE_API_KEY;
    return new SibApiV3Sdk.TransactionalEmailsApi();
  } else {
    // Use Gmail SMTP for development
    return nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  }
};

// Email templates
const emailTemplates = {
  bookingConfirmation: (booking) => ({
    subject: `Booking Confirmed - TurksExplorer #${booking._id.toString().slice(-8)}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #007bff; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .booking-details { background: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
          .footer { text-align: center; padding: 20px; color: #666; }
          .status { background: #28a745; color: white; padding: 5px 10px; border-radius: 3px; }
          .amount { font-size: 24px; font-weight: bold; color: #007bff; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏝️ TurksExplorer</h1>
            <h2>Booking Confirmed!</h2>
          </div>
          
          <div class="content">
            <p>Hi there!</p>
            <p>Great news! Your booking has been confirmed. Here are your details:</p>
            
            <div class="booking-details">
              <h3>Booking Details</h3>
              <p><strong>Confirmation Number:</strong> #${booking._id.toString().slice(-8)}</p>
              <p><strong>Status:</strong> <span class="status">${booking.status.toUpperCase()}</span></p>
              <p><strong>Service Type:</strong> ${booking.category.charAt(0).toUpperCase() + booking.category.slice(1)}</p>
              
              ${booking.date ? `<p><strong>Date:</strong> ${new Date(booking.date).toLocaleDateString()}</p>` : ''}
              ${booking.time ? `<p><strong>Time:</strong> ${booking.time}</p>` : ''}
              ${booking.startDate ? `<p><strong>Check-in:</strong> ${new Date(booking.startDate).toLocaleDateString()}</p>` : ''}
              ${booking.endDate ? `<p><strong>Check-out:</strong> ${new Date(booking.endDate).toLocaleDateString()}</p>` : ''}
              ${booking.numOfPeople ? `<p><strong>Number of People:</strong> ${booking.numOfPeople}</p>` : ''}
              
              <h4>Payment Information</h4>
              <p><strong>Total Amount:</strong> <span class="amount">$${booking.paymentDetails.totalAmount.toFixed(2)}</span></p>
              <p><strong>Amount Paid:</strong> $${booking.paymentDetails.amountPaid.toFixed(2)}</p>
              ${booking.paymentDetails.remainingBalance > 0 ? `<p><strong>Remaining Balance:</strong> $${booking.paymentDetails.remainingBalance.toFixed(2)}</p>` : ''}
            </div>
            
            <p><strong>What's Next?</strong></p>
            <ul>
              <li>Save this confirmation email for your records</li>
              <li>Arrive 15 minutes early for your booking</li>
              <li>Bring a valid ID and this confirmation</li>
              <li>Contact us if you need to make any changes</li>
            </ul>
            
            <p>We're excited to help you explore the beautiful Turks and Caicos Islands!</p>
          </div>
          
          <div class="footer">
            <p>Questions? Contact us at support@turksexplorer.com</p>
            <p>TurksExplorer - Your Gateway to Paradise</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Booking Confirmed - TurksExplorer #${booking._id.toString().slice(-8)}
      
      Hi there!
      
      Your booking has been confirmed. Here are your details:
      
      Confirmation Number: #${booking._id.toString().slice(-8)}
      Status: ${booking.status.toUpperCase()}
      Service Type: ${booking.category.charAt(0).toUpperCase() + booking.category.slice(1)}
      ${booking.date ? `Date: ${new Date(booking.date).toLocaleDateString()}` : ''}
      ${booking.time ? `Time: ${booking.time}` : ''}
      Total Amount: $${booking.paymentDetails.totalAmount.toFixed(2)}
      
      Questions? Contact us at support@turksexplorer.com
    `
  }),

  passwordReset: (email, resetLink) => ({
    subject: 'Reset Your TurksExplorer Password',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #007bff; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .button { display: inline-block; background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 15px 0; }
          .footer { text-align: center; padding: 20px; color: #666; }
          .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 10px; border-radius: 5px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏝️ TurksExplorer</h1>
            <h2>Password Reset Request</h2>
          </div>
          
          <div class="content">
            <p>Hi there!</p>
            <p>We received a request to reset your password for your TurksExplorer account.</p>
            
            <p>Click the button below to reset your password:</p>
            <a href="${resetLink}" class="button">Reset My Password</a>
            
            <div class="warning">
              <p><strong>⚠️ Important:</strong></p>
              <ul>
                <li>This link will expire in 1 hour</li>
                <li>If you didn't request this reset, please ignore this email</li>
                <li>Never share this link with anyone</li>
              </ul>
            </div>
            
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background: #f8f9fa; padding: 10px; border-radius: 3px;">${resetLink}</p>
          </div>
          
          <div class="footer">
            <p>Questions? Contact us at support@turksexplorer.com</p>
            <p>TurksExplorer - Your Gateway to Paradise</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Password Reset Request - TurksExplorer
      
      Hi there!
      
      We received a request to reset your password for your TurksExplorer account.
      
      Click this link to reset your password: ${resetLink}
      
      This link will expire in 1 hour. If you didn't request this reset, please ignore this email.
      
      Questions? Contact us at support@turksexplorer.com
    `
  }),

  emailVerification: (email, verificationLink) => ({
    subject: 'Verify Your TurksExplorer Account',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #28a745; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .button { display: inline-block; background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 15px 0; }
          .footer { text-align: center; padding: 20px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏝️ TurksExplorer</h1>
            <h2>Welcome to TurksExplorer!</h2>
          </div>
          
          <div class="content">
            <p>Hi there!</p>
            <p>Welcome to TurksExplorer! We're excited to help you discover the beauty of the Turks and Caicos Islands.</p>
            
            <p>To get started, please verify your email address by clicking the button below:</p>
            <a href="${verificationLink}" class="button">Verify My Email</a>
            
            <p>Once verified, you'll be able to:</p>
            <ul>
              <li>Book amazing activities and experiences</li>
              <li>Reserve accommodations</li>
              <li>Discover local dining gems</li>
              <li>Arrange transportation</li>
              <li>Save favorites and create wishlists</li>
            </ul>
            
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background: #f8f9fa; padding: 10px; border-radius: 3px;">${verificationLink}</p>
          </div>
          
          <div class="footer">
            <p>Questions? Contact us at support@turksexplorer.com</p>
            <p>TurksExplorer - Your Gateway to Paradise</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Welcome to TurksExplorer!
      
      Please verify your email address by clicking this link: ${verificationLink}
      
      Once verified, you'll be able to book activities, accommodations, dining, and transportation in the beautiful Turks and Caicos Islands.
      
      Questions? Contact us at support@turksexplorer.com
    `
  }),

  bookingCancellation: (booking, refundAmount) => ({
    subject: `Booking Cancelled - TurksExplorer #${booking._id.toString().slice(-8)}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #dc3545; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .booking-details { background: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
          .footer { text-align: center; padding: 20px; color: #666; }
          .refund-info { background: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 5px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏝️ TurksExplorer</h1>
            <h2>Booking Cancelled</h2>
          </div>
          
          <div class="content">
            <p>Hi there,</p>
            <p>Your booking has been cancelled as requested. Here are the details:</p>
            
            <div class="booking-details">
              <h3>Cancelled Booking Details</h3>
              <p><strong>Confirmation Number:</strong> #${booking._id.toString().slice(-8)}</p>
              <p><strong>Service Type:</strong> ${booking.category.charAt(0).toUpperCase() + booking.category.slice(1)}</p>
              <p><strong>Original Amount:</strong> $${booking.paymentDetails.totalAmount.toFixed(2)}</p>
            </div>
            
            ${refundAmount > 0 ? `
            <div class="refund-info">
              <h4>💰 Refund Information</h4>
              <p><strong>Refund Amount:</strong> $${refundAmount.toFixed(2)}</p>
              <p>Your refund will be processed within 5-7 business days and will appear on the original payment method.</p>
            </div>
            ` : ''}
            
            <p>We're sorry to see you go, but we understand plans can change. We hope to serve you again in the future!</p>
          </div>
          
          <div class="footer">
            <p>Questions? Contact us at support@turksexplorer.com</p>
            <p>TurksExplorer - Your Gateway to Paradise</p>
          </div>
        </div>
      </body>
      </html>
    `
  })
};

// Send booking confirmation email
const sendBookingConfirmationEmail = async (booking) => {
  try {
    // Get user email from booking
    const User = require('../models/User');
    const user = await User.findById(booking.user).select('email name');
    
    if (!user) {
      throw new Error('User not found for booking');
    }

    const template = emailTemplates.bookingConfirmation(booking);
    
    await sendEmail({
      to: user.email,
      subject: template.subject,
      html: template.html,
      text: template.text
    });

    console.log('Booking confirmation email sent to:', user.email);
    return { success: true };
  } catch (error) {
    console.error('Error sending booking confirmation email:', error);
    return { success: false, error: error.message };
  }
};

// Send password reset email
const sendPasswordResetEmail = async (email, resetLink) => {
  try {
    const template = emailTemplates.passwordReset(email, resetLink);
    
    await sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text
    });

    console.log('Password reset email sent to:', email);
    return { success: true };
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return { success: false, error: error.message };
  }
};

// Send verification email
const sendVerificationEmail = async (email, verificationLink) => {
  try {
    const template = emailTemplates.emailVerification(email, verificationLink);
    
    await sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text
    });

    console.log('Verification email sent to:', email);
    return { success: true };
  } catch (error) {
    console.error('Error sending verification email:', error);
    return { success: false, error: error.message };
  }
};

// Send cancellation email
const sendCancellationEmail = async (booking, refundAmount = 0) => {
  try {
    const User = require('../models/User');
    const user = await User.findById(booking.user).select('email name');
    
    if (!user) {
      throw new Error('User not found for booking');
    }

    const template = emailTemplates.bookingCancellation(booking, refundAmount);
    
    await sendEmail({
      to: user.email,
      subject: template.subject,
      html: template.html,
      text: template.text
    });

    console.log('Cancellation email sent to:', user.email);
    return { success: true };
  } catch (error) {
    console.error('Error sending cancellation email:', error);
    return { success: false, error: error.message };
  }
};

// Generic send email function
const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const transporter = createTransporter();
    
    if (process.env.SENDINBLUE_API_KEY) {
      // Use SendinBlue API
      const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
      sendSmtpEmail.subject = subject;
      sendSmtpEmail.htmlContent = html;
      sendSmtpEmail.textContent = text;
      sendSmtpEmail.sender = { 
        name: "TurksExplorer", 
        email: process.env.EMAIL_FROM || "noreply@turksexplorer.com" 
      };
      sendSmtpEmail.to = [{ email: to }];

      await transporter.sendTransacEmail(sendSmtpEmail);
    } else {
      // Use nodemailer (Gmail SMTP)
      const mailOptions = {
        from: `"TurksExplorer" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
        to: to,
        subject: subject,
        html: html,
        text: text
      };

      await transporter.sendMail(mailOptions);
    }

    return { success: true };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error.message };
  }
};

// Send email notification for new booking (to admin)
const sendAdminBookingNotification = async (booking) => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@turksexplorer.com';
    
    const subject = `New Booking Received - #${booking._id.toString().slice(-8)}`;
    const html = `
      <h3>New Booking Alert</h3>
      <p><strong>Booking ID:</strong> ${booking._id}</p>
      <p><strong>Service Type:</strong> ${booking.category}</p>
      <p><strong>Amount:</strong> $${booking.paymentDetails.totalAmount.toFixed(2)}</p>
      <p><strong>Date:</strong> ${booking.date ? new Date(booking.date).toLocaleDateString() : 'N/A'}</p>
      <p><strong>Status:</strong> ${booking.status}</p>
    `;

    await sendEmail({
      to: adminEmail,
      subject,
      html,
      text: subject
    });

  } catch (error) {
    console.error('Error sending admin notification:', error);
  }
};

module.exports = {
  sendBookingConfirmationEmail,
  sendPasswordResetEmail,
  sendVerificationEmail,
  sendCancellationEmail,
  sendAdminBookingNotification,
  sendEmail
};