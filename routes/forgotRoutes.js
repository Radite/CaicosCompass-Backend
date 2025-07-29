// routes/forgotRoutes.js - UPDATED with authProvider checking
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const Brevo = require('sib-api-v3-sdk');

// Configure Brevo API client
const brevoClient = Brevo.ApiClient.instance;
const apiKey = brevoClient.authentications['api-key'];
apiKey.apiKey = process.env.BREVO_API_KEY;

// Enhanced email template for password reset
const sendResetEmail = async (email, resetLink) => {
  try {
    const apiInstance = new Brevo.TransactionalEmailsApi();
    
    const sender = {
      email: process.env.BREVO_SENDER_EMAIL,
      name: "CaicosCompass Security Team",
    };
    
    const receivers = [{ email: email }];
    
    const emailParams = {
      sender,
      to: receivers,
      subject: "🔐 Reset Your CaicosCompass Password",
      htmlContent: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8f9fa;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); padding: 40px 20px; text-align: center;">
            <div style="background: white; width: 60px; height: 60px; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
              <span style="font-size: 24px; color: #dc3545; font-weight: bold;">🔐</span>
            </div>
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 300;">
              CaicosCompass
            </h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">
              Password Reset Request
            </p>
          </div>

          <!-- Main Content -->
          <div style="background-color: white; padding: 40px 30px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h2 style="color: #333333; font-size: 24px; margin: 0 0 10px 0;">
                🔓 Reset Your Password
              </h2>
              <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0;">
                We received a request to reset your CaicosCompass password.
              </p>
            </div>

            <!-- Reset Button -->
            <div style="text-align: center; margin: 40px 0;">
              <a href="${resetLink}" 
                 style="display: inline-block; background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); 
                        color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; 
                        font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(220,53,69,0.3);">
                🔓 Reset My Password
              </a>
            </div>

            <!-- Security Notice -->
            <div style="border-left: 4px solid #dc3545; background-color: #f8d7da; padding: 16px; margin: 30px 0;">
              <p style="color: #721c24; font-size: 14px; margin: 0; font-weight: 500;">
                ⚡ This link expires in 1 hour for your security.
              </p>
            </div>

            <!-- Alternative Link -->
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 30px 0;">
              <p style="color: #666666; font-size: 14px; margin: 0 0 10px 0; text-align: center;">
                Button not working? Copy and paste this link:
              </p>
              <div style="word-break: break-all; background-color: white; padding: 12px; border-radius: 4px; border: 1px solid #e0e0e0; font-family: monospace;">
                <a href="${resetLink}" style="color: #dc3545; text-decoration: none; font-size: 13px;">
                  ${resetLink}
                </a>
              </div>
            </div>

            <!-- Security Tips -->
            <div style="margin-top: 40px;">
              <h3 style="color: #333333; font-size: 18px; margin: 0 0 15px 0;">
                🛡️ Security Reminder
              </h3>
              <ul style="color: #666666; font-size: 14px; line-height: 1.6; padding-left: 20px;">
                <li>We never ask for your password via email</li>
                <li>If you didn't request this reset, you can ignore this email</li>
                <li>Your account remains secure</li>
              </ul>
            </div>
          </div>

          <!-- Footer -->
          <div style="background-color: #333333; padding: 30px 20px; text-align: center;">
            <p style="color: rgba(255,255,255,0.8); font-size: 12px; margin: 0 0 10px 0;">
              This email was sent to ${email}
            </p>
            <p style="color: rgba(255,255,255,0.6); font-size: 11px; margin: 0;">
              © ${new Date().getFullYear()} CaicosCompass. All rights reserved.
            </p>
          </div>
        </div>
      `,
    };
    
    const data = await apiInstance.sendTransacEmail(emailParams);
    return { success: true, data };
  } catch (error) {
    console.error("Error sending password reset email via Brevo:", error);
    return { success: false, error };
  }
};

// Secure forgot password route - only for local auth users
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ 
        message: "Email address is required." 
      });
    }

    // Find user with this email
    const user = await User.findOne({ email: email.toLowerCase() });
    
    // SECURITY: Always return the same generic message regardless of:
    // 1. User doesn't exist
    // 2. User exists but uses OAuth (Google/Facebook/Apple)
    // 3. User exists and uses local auth (only this case gets an email)
    const genericMessage = "If your email is registered with us, you will receive a password reset link.";
    
    // Case 1: User doesn't exist
    if (!user) {
      console.log(`🔍 Password reset attempted for non-existent email: ${email}`);
      return res.status(200).json({ message: genericMessage });
    }

    // Case 2: User exists but uses OAuth authentication
    if (user.authProvider !== 'local') {
      console.log(`🚫 Password reset attempted for ${user.authProvider} user: ${email}`);
      
      // Log this for security monitoring
      console.log(`⚠️ OAuth user tried password reset:`, {
        email: user.email,
        authProvider: user.authProvider,
        hasGoogleId: !!user.googleId,
        hasFacebookId: !!user.facebookId,
        hasAppleId: !!user.appleId
      });
      
      // Return same generic message (don't reveal auth method)
      return res.status(200).json({ message: genericMessage });
    }

    // Case 3: User exists and uses local authentication - proceed with reset
    console.log(`✅ Valid password reset request for local user: ${email}`);

    // Generate reset token and expiry
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetPasswordExpires = Date.now() + 3600000; // 1 hour
    
    // Save token and expiry to user document
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetPasswordExpires;
    
    // Fix accessibilityNeeds field if it has invalid values (data cleanup)
    if (user.groupDetails && user.groupDetails.accessibilityNeeds) {
      const validEnumValues = ['wheelchair accessible', 'visual assistance', 'hearing assistance', 'cognitive support', 'none'];
      
      user.groupDetails.accessibilityNeeds = user.groupDetails.accessibilityNeeds.filter(need => 
        validEnumValues.includes(need)
      );
      
      if (user.groupDetails.accessibilityNeeds.length === 0) {
        user.groupDetails.accessibilityNeeds = ['none'];
      }
    }
    
    // Save the user document
    await user.save();
    
    // Create reset link
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;
    
    console.log(`📧 Sending password reset email to: ${email}`);
    const emailResult = await sendResetEmail(email, resetLink);
    console.log("Email send result:", emailResult.success ? "✅ Success" : "❌ Failed");
    
    if (!emailResult.success) {
      console.error("Failed to send reset email:", emailResult.error);
      return res.status(500).json({ 
        message: "Failed to send password reset email. Please try again later." 
      });
    }
    
    // Return same generic message for security
    return res.status(200).json({ message: genericMessage });
    
  } catch (error) {
    console.error("Forgot password error:", error);
    return res.status(500).json({ 
      message: "An error occurred. Please try again later." 
    });
  }
});

// Enhanced token validation with authProvider check
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

    // Additional security: Ensure user still uses local auth
    if (user.authProvider !== 'local') {
      console.log(`🚫 Token validation failed - user switched to ${user.authProvider} auth: ${email}`);
      return res.status(400).json({ 
        message: "This account uses social login. Please sign in with your social account." 
      });
    }
    
    return res.status(200).json({ message: "Token is valid." });
    
  } catch (error) {
    console.error("Token validation error:", error);
    return res.status(500).json({ message: "An error occurred. Please try again later." });
  }
});

// Enhanced password reset with authProvider check
router.post('/reset-password', async (req, res) => {
  try {
    const { email, token, password } = req.body;
    
    if (!email || !token || !password) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters long." });
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

    // Security check: Ensure user still uses local auth
    if (user.authProvider !== 'local') {
      console.log(`🚫 Password reset failed - user switched to ${user.authProvider} auth: ${email}`);
      return res.status(400).json({ 
        message: "This account uses social login. Password reset is not available." 
      });
    }
    
    // Fix accessibilityNeeds field if needed (data cleanup)
    if (user.groupDetails && user.groupDetails.accessibilityNeeds) {
      const validEnumValues = ['wheelchair accessible', 'visual assistance', 'hearing assistance', 'cognitive support', 'none'];
      
      user.groupDetails.accessibilityNeeds = user.groupDetails.accessibilityNeeds.filter(need => 
        validEnumValues.includes(need)
      );
      
      if (user.groupDetails.accessibilityNeeds.length === 0) {
        user.groupDetails.accessibilityNeeds = ['none'];
      }
    }
    
    // Update user's password and clear reset token fields
    user.password = password; // The pre-save hook in User model will hash this
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    
    await user.save();
    
    console.log(`✅ Password reset successful for user: ${email}`);
    
    return res.status(200).json({ message: "Password has been reset successfully." });
    
  } catch (error) {
    console.error("Password reset error:", error);
    return res.status(500).json({ message: "An error occurred. Please try again later." });
  }
});

module.exports = router;