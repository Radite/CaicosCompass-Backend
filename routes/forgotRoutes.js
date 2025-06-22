const express = require('express');
const router = express.Router();
const User = require('../models/User');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const Brevo = require('sib-api-v3-sdk');

// Configure Brevo API client
const brevoClient = Brevo.ApiClient.instance;
const apiKey = brevoClient.authentications['api-key'];
apiKey.apiKey = process.env.BREVO_API_KEY; // Set this in your .env file

// Function to send reset password email using Brevo
const sendResetEmail = async (email, resetLink) => {
  try {
    const apiInstance = new Brevo.TransactionalEmailsApi();
    
    const sender = {
      email: "noreply@caicoscompass.com",
      name: "CaicosCompass",
    };
    
    const receivers = [
      {
        email: email,
      },
    ];
    
    const emailParams = {
      sender,
      to: receivers,
      subject: "Reset Your CaicosCompass Password",
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #0078C8;">CaicosCompass</h1>
          </div>
          <div style="background-color: #f8f8f8; padding: 20px; border-radius: 5px; border-left: 4px solid #0078C8;">
            <h2>Password Reset Request</h2>
            <p>We received a request to reset your password. Click the button below to create a new password:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" style="background-color: #0078C8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Reset Password</a>
            </div>
            <p>This link will expire in 1 hour for security reasons.</p>
            <p>If you didn't request this password reset, you can safely ignore this email.</p>
          </div>
          <div style="margin-top: 30px; font-size: 12px; color: #777; text-align: center;">
            <p>© ${new Date().getFullYear()} CaicosCompass. All rights reserved.</p>
          </div>
        </div>
      `,
    };
    
    const data = await apiInstance.sendTransacEmail(emailParams);
    return { success: true, data };
  } catch (error) {
    console.error("Error sending email via Brevo:", error);
    return { success: false, error };
  }
};

// Route to request password reset
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    // Find user with this email
    const user = await User.findOne({ email: email.toLowerCase() });
    
    // Don't reveal if the email exists in the database for security
    if (!user) {
      return res.status(200).json({ 
        message: "If your email is registered with us, you will receive a password reset link." 
      });
    }
    
    // Generate reset token and expiry
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetPasswordExpires = Date.now() + 3600000; // 1 hour
    
    // Save token and expiry to user document
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetPasswordExpires;
    
    // Fix accessibilityNeeds field if it has invalid values
    if (user.groupDetails && user.groupDetails.accessibilityNeeds) {
      const validEnumValues = ['wheelchair accessible', 'visual assistance', 'hearing assistance', 'cognitive support', 'none'];
      
      // Filter out invalid values
      user.groupDetails.accessibilityNeeds = user.groupDetails.accessibilityNeeds.filter(need => 
        validEnumValues.includes(need)
      );
      
      // If empty after filtering, set to 'none'
      if (user.groupDetails.accessibilityNeeds.length === 0) {
        user.groupDetails.accessibilityNeeds = ['none'];
      }
    }
    
    // Save the user document
    await user.save();
    
    // Create reset link
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;
    
    console.log("Attempting to send email to:", email);
    const emailResult = await sendResetEmail(email, resetLink);
    console.log("Email send result:", emailResult);
    
    if (!emailResult.success) {
      console.error("Failed to send reset email:", emailResult.error);
      return res.status(500).json({ message: "Failed to send reset email. Please try again later." });
    }
    
    return res.status(200).json({ 
      message: "If your email is registered with us, you will receive a password reset link." 
    });
    
  } catch (error) {
    console.error("Forgot password error:", error);
    return res.status(500).json({ message: "An error occurred. Please try again later." });
  }
});

// Route to validate reset token
router.get('/validate-reset-token', async (req, res) => {
  try {
    const { token, email } = req.query;
    
    if (!token || !email) {
      return res.status(400).json({ message: "Invalid reset link." });
    }
    
    const user = await User.findOne({
      email: email.toLowerCase(),
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).json({ message: "Reset link is invalid or has expired." });
    }
    
    return res.status(200).json({ message: "Token is valid." });
    
  } catch (error) {
    console.error("Token validation error:", error);
    return res.status(500).json({ message: "An error occurred. Please try again later." });
  }
});

// Route to reset password
router.post('/reset-password', async (req, res) => {
  try {
    const { email, token, password } = req.body;
    
    if (!email || !token || !password) {
      return res.status(400).json({ message: "Missing required fields." });
    }
    
    // Find user with matching email and valid token
    const user = await User.findOne({
      email: email.toLowerCase(),
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).json({ message: "Reset link is invalid or has expired." });
    }
    
    // Fix accessibilityNeeds field if it has invalid values
    if (user.groupDetails && user.groupDetails.accessibilityNeeds) {
      const validEnumValues = ['wheelchair accessible', 'visual assistance', 'hearing assistance', 'cognitive support', 'none'];
      
      // Filter out invalid values
      user.groupDetails.accessibilityNeeds = user.groupDetails.accessibilityNeeds.filter(need => 
        validEnumValues.includes(need)
      );
      
      // If empty after filtering, set to 'none'
      if (user.groupDetails.accessibilityNeeds.length === 0) {
        user.groupDetails.accessibilityNeeds = ['none'];
      }
    }
    
    // Update user's password and clear reset token fields
    user.password = password; // The pre-save hook in your User model will hash this password
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    
    await user.save();
    
    return res.status(200).json({ message: "Password has been reset successfully." });
    
  } catch (error) {
    console.error("Password reset error:", error);
    return res.status(500).json({ message: "An error occurred. Please try again later." });
  }
});

module.exports = router;