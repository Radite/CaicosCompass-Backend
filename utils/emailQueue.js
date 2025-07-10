// utils/emailQueue.js - Email queue system
const nodemailer = require('nodemailer');
const { logger } = require('../middleware/logging');

class EmailQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
    this.retryAttempts = 3;
    this.retryDelay = 5000; // 5 seconds
  }

  // Add email to queue
  add(emailData) {
    this.queue.push({
      ...emailData,
      attempts: 0,
      createdAt: new Date()
    });
    
    if (!this.processing) {
      this.process();
    }
  }

  // Process email queue
  async process() {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;
    
    while (this.queue.length > 0) {
      const emailData = this.queue.shift();
      
      try {
        await this.sendEmail(emailData);
        logger.info(`Email sent successfully to ${emailData.to}`);
      } catch (error) {
        emailData.attempts++;
        
        if (emailData.attempts < this.retryAttempts) {
          // Re-queue for retry
          setTimeout(() => {
            this.queue.push(emailData);
          }, this.retryDelay);
          
          logger.warn(`Email failed, retrying (${emailData.attempts}/${this.retryAttempts}): ${error.message}`);
        } else {
          logger.error(`Email failed permanently after ${this.retryAttempts} attempts:`, error);
        }
      }
    }
    
    this.processing = false;
  }

  // Send individual email
  async sendEmail(emailData) {
    const { sendEmail } = require('../controllers/emailService');
    return await sendEmail(emailData);
  }

  // Get queue status
  getStatus() {
    return {
      queueLength: this.queue.length,
      processing: this.processing
    };
  }
}

// Create singleton instance
const emailQueue = new EmailQueue();

module.exports = emailQueue;

