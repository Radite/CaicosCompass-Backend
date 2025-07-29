// controllers/emailService.js - Fixed Business Email Templates
const SibApiV3Sdk = require('sib-api-v3-sdk');
require('dotenv').config();

// Helper function to format business type for display
const formatBusinessType = (type) => {
  const typeMap = {
    'restaurant': 'Restaurant',
    'hotel-resort': 'Hotel/Resort', 
    'villa-rental': 'Villa Rental',
    'airbnb-host': 'Airbnb Host',
    'tour-operator': 'Tour Operator',
    'transportation-service': 'Transportation Service',
    'retail-shop': 'Retail Shop',
    'wellness-spa': 'Wellness/Spa',
    'other': 'Other'
  };
  return typeMap[type] || type;
};

// Helper function to format services
const formatServices = (services) => {
  const serviceMap = {
    'dining': 'Dining',
    'stays': 'Accommodations', 
    'activities': 'Activities',
    'transportation': 'Transportation',
    'shopping': 'Shopping',
    'wellness-spa': 'Wellness & Spa'
  };
  return services.map(service => serviceMap[service] || service);
};

// Fixed verification email function
const sendVerificationEmail = async (recipientEmail, verificationLink) => {
  try {
    SibApiV3Sdk.ApiClient.instance.authentications['api-key'].apiKey = process.env.BREVO_API_KEY;

    const emailApi = new SibApiV3Sdk.TransactionalEmailsApi();

    const sender = {
      email: process.env.BREVO_SENDER_EMAIL,
      name: "CaicosCompass Team"
    };

    const receivers = [{ email: recipientEmail }];

    const mailOptions = {
      sender,
      to: receivers,
      subject: '🏝️ Welcome to CaicosCompass - Verify Your Email',
      htmlContent: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to CaicosCompass</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f8f9fa;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa;">
            <tr>
              <td align="center" style="padding: 20px 0;">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                  
                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #0078C8 0%, #005a9c 100%); padding: 40px 20px; text-align: center;">
                      <img src="https://i.imgur.com/jjYqLQJ.png" alt="CaicosCompass" style="width: 120px; height: auto; margin-bottom: 20px;">

                      <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 300;">CaicosCompass</h1>
                      <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Your Guide to the Turks & Caicos Islands</p>
                    </td>
                  </tr>

                  <!-- Main Content -->
                  <tr>
                    <td style="padding: 40px 30px;">
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="text-align: center; padding-bottom: 30px;">
                            <h2 style="color: #333333; font-size: 24px; margin: 0 0 10px 0;">Welcome to Your Island Adventure!</h2>
                            <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0;">We're excited to have you join our community of island explorers.</p>
                          </td>
                        </tr>
                        
                        <!-- Verification Button -->
                        <tr>
                          <td style="text-align: center; padding: 20px 0;">
                            <a href="${verificationLink}" style="display: inline-block; background: linear-gradient(135deg, #0078C8 0%, #005a9c 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                              ✅ Verify My Email Address
                            </a>
                          </td>
                        </tr>

                        <!-- Security Notice -->
                        <tr>
                          <td style="background-color: #fff8e1; border-left: 4px solid #ffc107; padding: 16px; margin: 30px 0;">
                            <p style="color: #333333; font-size: 14px; margin: 0; font-weight: 500;">⏰ Important: This verification link expires in 24 hours for security.</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #333333; padding: 30px 20px; text-align: center;">
                      <p style="color: rgba(255,255,255,0.8); font-size: 12px; margin: 0 0 10px 0;">© ${new Date().getFullYear()} CaicosCompass. All rights reserved.</p>
                      <p style="color: rgba(255,255,255,0.6); font-size: 11px; margin: 0;">This email was sent to ${recipientEmail}. If you didn't create this account, you can safely ignore this email.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `
    };

    await emailApi.sendTransacEmail(mailOptions);
    console.log(`🎉 Verification email sent successfully to ${recipientEmail}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Error sending verification email:', error);
    throw new Error('Unable to send verification email. Please try again later.');
  }
};

// FIXED: Business Application Confirmation Email
const sendBusinessApplicationEmail = async (recipientEmail, businessData, ownerName) => {
  try {
    SibApiV3Sdk.ApiClient.instance.authentications['api-key'].apiKey = process.env.BREVO_API_KEY;
    const emailApi = new SibApiV3Sdk.TransactionalEmailsApi();

    const sender = {
      email: process.env.BREVO_SENDER_EMAIL,
      name: "CaicosCompass Business Team"
    };

    const receivers = [{ email: recipientEmail }];

    // Format business information
    const businessType = formatBusinessType(businessData.businessType);
    const services = formatServices(businessData.servicesOffered);
    const address = `${businessData.businessAddress.street}, ${businessData.businessAddress.city}, ${businessData.businessAddress.island}`;

    const mailOptions = {
      sender,
      to: receivers,
      subject: '🏢 Business Application Received - CaicosCompass',
      htmlContent: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Business Application Received</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f8f9fa;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa;">
            <tr>
              <td align="center" style="padding: 20px 0;">
                <table width="650" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                  
                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 40px 20px; text-align: center;">
                      <img src="https://i.imgur.com/jjYqLQJ.png" alt="CaicosCompass" style="width: 120px; height: auto; margin-bottom: 20px;">

                      <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 300;">CaicosCompass</h1>
                      <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Business Partner Network</p>
                    </td>
                  </tr>

                  <!-- Main Content -->
                  <tr>
                    <td style="padding: 40px 30px;">
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <!-- Welcome Message -->
                        <tr>
                          <td style="text-align: center; padding-bottom: 30px;">
                            <h2 style="color: #333333; font-size: 24px; margin: 0 0 10px 0;">Application Received! 🎉</h2>
                            <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0;">Thank you for applying to join the CaicosCompass business network, ${ownerName}.</p>
                          </td>
                        </tr>

                        <!-- Status Notice -->
                        <tr>
                          <td style="background: linear-gradient(135deg, #e8f5e8 0%, #f0f8f0 100%); border: 1px solid #28a745; border-radius: 12px; padding: 25px; text-align: center;">
                            <h3 style="color: #2e7d32; margin: 0 0 10px 0; font-size: 18px;">📋 Application Status: Under Review</h3>
                            <p style="color: #388e3c; margin: 0; font-size: 14px;">Our team will review your application within 24-48 hours</p>
                          </td>
                        </tr>

                        <!-- Spacing -->
                        <tr><td style="height: 30px;"></td></tr>

                        <!-- Application Details -->
                        <tr>
                          <td>
                            <h3 style="color: #333333; font-size: 20px; margin: 0 0 20px 0; border-bottom: 2px solid #28a745; padding-bottom: 10px;">📝 Application Details</h3>
                          </td>
                        </tr>

                        <!-- Business Overview -->
                        <tr>
                          <td style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
                            <h4 style="color: #2e7d32; margin: 0 0 15px 0; font-size: 16px;">Business Overview</h4>
                            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                              <tr>
                                <td style="padding: 8px 0; color: #666; font-weight: 500; width: 30%;">Business Name:</td>
                                <td style="padding: 8px 0; color: #333; font-weight: 600;">${businessData.businessName}</td>
                              </tr>
                              <tr>
                                <td style="padding: 8px 0; color: #666; font-weight: 500;">Business Type:</td>
                                <td style="padding: 8px 0; color: #333;">${businessType}</td>
                              </tr>
                              <tr>
                                <td style="padding: 8px 0; color: #666; font-weight: 500;">Phone:</td>
                                <td style="padding: 8px 0; color: #333;">${businessData.businessPhone}</td>
                              </tr>
                              ${businessData.businessWebsite ? `
                              <tr>
                                <td style="padding: 8px 0; color: #666; font-weight: 500;">Website:</td>
                                <td style="padding: 8px 0; color: #333;"><a href="${businessData.businessWebsite}" style="color: #0078C8;">${businessData.businessWebsite}</a></td>
                              </tr>
                              ` : ''}
                            </table>
                          </td>
                        </tr>

                        <!-- Spacing -->
                        <tr><td style="height: 20px;"></td></tr>

                        <!-- Services & Location -->
                        <tr>
                          <td style="background-color: #f8f9fa; border-radius: 8px; padding: 20px;">
                            <h4 style="color: #2e7d32; margin: 0 0 15px 0; font-size: 16px;">Services & Location</h4>
                            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                              <tr>
                                <td style="padding: 8px 0; color: #666; font-weight: 500; width: 30%;">Services Offered:</td>
                                <td style="padding: 8px 0; color: #333;">${services.join(', ')}</td>
                              </tr>
                              <tr>
                                <td style="padding: 8px 0; color: #666; font-weight: 500;">Address:</td>
                                <td style="padding: 8px 0; color: #333;">${address}</td>
                              </tr>
                              ${businessData.businessAddress.postalCode ? `
                              <tr>
                                <td style="padding: 8px 0; color: #666; font-weight: 500;">Postal Code:</td>
                                <td style="padding: 8px 0; color: #333;">${businessData.businessAddress.postalCode}</td>
                              </tr>
                              ` : ''}
                            </table>
                          </td>
                        </tr>

                        <!-- Spacing -->
                        <tr><td style="height: 20px;"></td></tr>

                        <!-- Description -->
                        ${businessData.businessDescription ? `
                        <tr>
                          <td style="background-color: #f8f9fa; border-radius: 8px; padding: 20px;">
                            <h4 style="color: #2e7d32; margin: 0 0 15px 0; font-size: 16px;">Business Description</h4>
                            <p style="color: #333; margin: 0; line-height: 1.6;">${businessData.businessDescription}</p>
                          </td>
                        </tr>
                        <tr><td style="height: 20px;"></td></tr>
                        ` : ''}

                        <!-- What's Next -->
                        <tr>
                          <td style="padding-top: 30px;">
                            <h3 style="color: #333333; font-size: 18px; margin: 0 0 15px 0;">🚀 What Happens Next?</h3>
                            <table width="100%" cellpadding="0" cellspacing="0">
                              <tr>
                                <td style="border-left: 4px solid #28a745; padding-left: 20px;">
                                  <p style="color: #666666; font-size: 14px; line-height: 1.8; margin: 5px 0;"><strong>Document Verification:</strong> Our team will verify your business credentials</p>
                                  <p style="color: #666666; font-size: 14px; line-height: 1.8; margin: 5px 0;"><strong>Quality Review:</strong> We'll review your services and business information</p>
                                  <p style="color: #666666; font-size: 14px; line-height: 1.8; margin: 5px 0;"><strong>Approval Notification:</strong> You'll receive an email confirmation within 24-48 hours</p>
                                  <p style="color: #666666; font-size: 14px; line-height: 1.8; margin: 5px 0;"><strong>Platform Access:</strong> Once approved, you can log in and start creating listings</p>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>

                        <!-- Contact Information -->
                        <tr>
                          <td style="background-color: #e8f5e8; border-radius: 8px; padding: 20px; margin: 30px 0;">
                            <h4 style="color: #2e7d32; margin: 0 0 10px 0; font-size: 16px;">💬 Questions or Need Changes?</h4>
                            <p style="color: #388e3c; margin: 0; font-size: 14px;">
                              Contact our business support team at 
                              <a href="mailto:business@caicoscompass.com" style="color: #0078C8; text-decoration: none;">business@caicoscompass.com</a>
                              or reply directly to this email.
                            </p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #333333; padding: 30px 20px; text-align: center;">
                      <p style="color: rgba(255,255,255,0.8); font-size: 12px; margin: 0 0 10px 0;">© ${new Date().getFullYear()} CaicosCompass Business Network. All rights reserved.</p>
                      <p style="color: rgba(255,255,255,0.6); font-size: 11px; margin: 0;">This email was sent to ${recipientEmail}</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `
    };

    await emailApi.sendTransacEmail(mailOptions);
    console.log(`🎉 Business application confirmation email sent to ${recipientEmail}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Error sending business application email:', error);
    throw new Error('Unable to send business application confirmation email.');
  }
};

// FIXED: Business Approval Email
const sendBusinessApprovalEmail = async (recipientEmail, businessData, ownerName) => {
  try {
    SibApiV3Sdk.ApiClient.instance.authentications['api-key'].apiKey = process.env.BREVO_API_KEY;
    const emailApi = new SibApiV3Sdk.TransactionalEmailsApi();

    const sender = {
      email: process.env.BREVO_SENDER_EMAIL,
      name: "CaicosCompass Business Team"
    };

    const receivers = [{ email: recipientEmail }];

    const loginUrl = `${process.env.FRONTEND_URL}/login`;
    const dashboardUrl = `${process.env.FRONTEND_URL}/vendor/dashboard`;

    const mailOptions = {
      sender,
      to: receivers,
      subject: '🎉 Welcome to CaicosCompass - Your Business is Approved!',
      htmlContent: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Business Approved - Welcome to CaicosCompass</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f8f9fa;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa;">
            <tr>
              <td align="center" style="padding: 20px 0;">
                <table width="650" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                  
                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 40px 20px; text-align: center;">
                      <img src="https://i.imgur.com/jjYqLQJ.png" alt="CaicosCompass" style="width: 120px; height: auto; margin-bottom: 20px;">

                      <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 300;">CaicosCompass</h1>
                      <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Business Partner Network</p>
                    </td>
                  </tr>

                  <!-- Main Content -->
                  <tr>
                    <td style="padding: 40px 30px;">
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <!-- Welcome Message -->
                        <tr>
                          <td style="text-align: center; padding-bottom: 30px;">
                            <h2 style="color: #28a745; font-size: 28px; margin: 0 0 10px 0;">Congratulations ${ownerName}! 🎉</h2>
                            <p style="color: #666666; font-size: 18px; line-height: 1.6; margin: 0;">
                              <strong>${businessData.businessName}</strong> has been approved to join the CaicosCompass business network!
                            </p>
                          </td>
                        </tr>

                        <!-- Success Notice -->
                        <tr>
                          <td style="background: linear-gradient(135deg, #e8f5e8 0%, #f0f8f0 100%); border: 2px solid #28a745; border-radius: 12px; padding: 25px; text-align: center;">
                            <h3 style="color: #2e7d32; margin: 0 0 15px 0; font-size: 20px;">✅ Your Business is Now Active!</h3>
                            <p style="color: #388e3c; margin: 0; font-size: 16px; line-height: 1.5;">
                              You can now log in to your business dashboard and start creating listings to showcase your services to thousands of potential customers.
                            </p>
                          </td>
                        </tr>

                        <!-- Spacing -->
                        <tr><td style="height: 30px;"></td></tr>

                        <!-- Get Started Guide -->
                        <tr>
                          <td>
                            <h3 style="color: #333333; font-size: 22px; margin: 0 0 20px 0; border-bottom: 2px solid #28a745; padding-bottom: 10px;">🚀 Get Started in 3 Easy Steps</h3>
                          </td>
                        </tr>

                        <!-- Step 1 -->
                        <tr>
                          <td style="background-color: #f8f9fa; border-radius: 10px; padding: 20px; border-left: 4px solid #28a745; margin-bottom: 20px;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                              <tr>
                                <td width="40" style="vertical-align: top;">
                                  <div style="background: #28a745; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-weight: bold; text-align: center; line-height: 30px;">1</div>
                                </td>
                                <td style="padding-left: 15px;">
                                  <h4 style="color: #2e7d32; margin: 0 0 8px 0; font-size: 16px;">Log In to Your Dashboard</h4>
                                  <p style="color: #555; margin: 0 0 10px 0; font-size: 14px;">Access your business dashboard to manage your listings and bookings.</p>
                                  <a href="${loginUrl}" style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 8px 16px; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 500;">
                                    🔑 Log In Now
                                  </a>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>

                        <!-- Spacing -->
                        <tr><td style="height: 15px;"></td></tr>

                        <!-- Step 2 -->
                        <tr>
                          <td style="background-color: #f8f9fa; border-radius: 10px; padding: 20px; border-left: 4px solid #0078C8;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                              <tr>
                                <td width="40" style="vertical-align: top;">
                                  <div style="background: #0078C8; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-weight: bold; text-align: center; line-height: 30px;">2</div>
                                </td>
                                <td style="padding-left: 15px;">
                                  <h4 style="color: #1565c0; margin: 0 0 8px 0; font-size: 16px;">Create Your First Listing</h4>
                                  <p style="color: #555; margin: 0; font-size: 14px;">Add photos, descriptions, and pricing for your services or accommodations.</p>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>

                        <!-- Spacing -->
                        <tr><td style="height: 15px;"></td></tr>

                        <!-- Step 3 -->
                        <tr>
                          <td style="background-color: #f8f9fa; border-radius: 10px; padding: 20px; border-left: 4px solid #ffc107;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                              <tr>
                                <td width="40" style="vertical-align: top;">
                                  <div style="background: #ffc107; color: #333; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-weight: bold; text-align: center; line-height: 30px;">3</div>
                                </td>
                                <td style="padding-left: 15px;">
                                  <h4 style="color: #e65100; margin: 0 0 8px 0; font-size: 16px;">Start Receiving Bookings</h4>
                                  <p style="color: #555; margin: 0; font-size: 14px;">Your listings will go live immediately and start appearing to customers.</p>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>

                        <!-- Spacing -->
                        <tr><td style="height: 30px;"></td></tr>

                        <!-- Dashboard Access -->
                        <tr>
                          <td style="text-align: center;">
                            <a href="${dashboardUrl}" 
                               style="display: inline-block; background: linear-gradient(135deg, #28a745 0%, #20c997 100%); 
                                      color: white; padding: 18px 36px; text-decoration: none; border-radius: 10px; 
                                      font-weight: 600; font-size: 18px;">
                              🏢 Access Your Business Dashboard
                            </a>
                          </td>
                        </tr>

                        <!-- Spacing -->
                        <tr><td style="height: 30px;"></td></tr>

                        <!-- Business Features -->
                        <tr>
                          <td>
                            <h3 style="color: #333333; font-size: 18px; margin: 0 0 15px 0;">🌟 What You Can Do Now</h3>
                            <table width="100%" cellpadding="0" cellspacing="0">
                              <tr>
                                <td width="50%" style="background: #f8f9fa; padding: 15px; border-radius: 8px; vertical-align: top;">
                                  <p style="margin: 0; font-size: 14px; color: #333;"><strong>📝</strong> Create unlimited listings</p>
                                </td>
                                <td width="50%" style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-left: 15px; vertical-align: top;">
                                  <p style="margin: 0; font-size: 14px; color: #333;"><strong>📊</strong> Track booking analytics</p>
                                </td>
                              </tr>
                              <tr><td colspan="2" style="height: 10px;"></td></tr>
                              <tr>
                                <td width="50%" style="background: #f8f9fa; padding: 15px; border-radius: 8px; vertical-align: top;">
                                  <p style="margin: 0; font-size: 14px; color: #333;"><strong>💬</strong> Communicate with customers</p>
                                </td>
                                <td width="50%" style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-left: 15px; vertical-align: top;">
                                  <p style="margin: 0; font-size: 14px; color: #333;"><strong>💰</strong> Manage payments & revenue</p>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>

                        <!-- Support Information -->
                        <tr>
                          <td style="background-color: #e3f2fd; border-radius: 10px; padding: 20px; margin: 30px 0;">
                            <h4 style="color: #1565c0; margin: 0 0 15px 0; font-size: 16px;">💬 Need Help Getting Started?</h4>
                            <p style="color: #1976d2; margin: 5px 0; font-size: 14px; line-height: 1.6;">📧 Email us: <a href="mailto:business@caicoscompass.com" style="color: #0078C8;">business@caicoscompass.com</a></p>
                            <p style="color: #1976d2; margin: 5px 0; font-size: 14px; line-height: 1.6;">📞 Business Support: Available Monday-Friday, 9 AM - 6 PM EST</p>
                            <p style="color: #1976d2; margin: 5px 0; font-size: 14px; line-height: 1.6;">💬 Live Chat: Available in your dashboard</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #333333; padding: 30px 20px; text-align: center;">
                      <p style="color: rgba(255,255,255,0.8); font-size: 12px; margin: 0 0 10px 0;">Welcome to the CaicosCompass business family! 🎉</p>
                      <p style="color: rgba(255,255,255,0.6); font-size: 11px; margin: 0;">© ${new Date().getFullYear()} CaicosCompass Business Network. All rights reserved.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `
    };

    await emailApi.sendTransacEmail(mailOptions);
    console.log(`🎉 Business approval email sent to ${recipientEmail}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Error sending business approval email:', error);
    throw new Error('Unable to send business approval email.');
  }
};

// Fixed password reset email function
const sendPasswordResetEmail = async (recipientEmail, resetLink) => {
  try {
    SibApiV3Sdk.ApiClient.instance.authentications['api-key'].apiKey = process.env.BREVO_API_KEY;
    const emailApi = new SibApiV3Sdk.TransactionalEmailsApi();

    const sender = {
      email: process.env.BREVO_SENDER_EMAIL,
      name: "CaicosCompass Security Team"
    };

    const receivers = [{ email: recipientEmail }];

    const mailOptions = {
      sender,
      to: receivers,
      subject: '🔐 Reset Your CaicosCompass Password',
      htmlContent: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Password</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f8f9fa;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa;">
            <tr>
              <td align="center" style="padding: 20px 0;">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                  
                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); padding: 40px 20px; text-align: center;">
                      <img src="https://i.imgur.com/jjYqLQJ.png" alt="CaicosCompass" style="width: 120px; height: auto; margin-bottom: 20px;">

                      <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 300;">CaicosCompass</h1>
                      <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Password Reset Request</p>
                    </td>
                  </tr>

                  <!-- Main Content -->
                  <tr>
                    <td style="padding: 40px 30px;">
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="text-align: center; padding-bottom: 30px;">
                            <h2 style="color: #333333; font-size: 24px; margin: 0 0 10px 0;">🔓 Reset Your Password</h2>
                            <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0;">We received a request to reset your CaicosCompass password.</p>
                          </td>
                        </tr>

                        <!-- Reset Button -->
                        <tr>
                          <td style="text-align: center; padding: 20px 0;">
                            <a href="${resetLink}" 
                               style="display: inline-block; background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); 
                                      color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; 
                                      font-weight: 600; font-size: 16px;">
                              🔓 Reset My Password
                            </a>
                          </td>
                        </tr>

                        <!-- Security Notice -->
                        <tr>
                          <td style="background-color: #f8d7da; border-left: 4px solid #dc3545; padding: 16px;">
                            <p style="color: #721c24; font-size: 14px; margin: 0; font-weight: 500;">⚡ This link expires in 1 hour for your security.</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #333333; padding: 30px 20px; text-align: center;">
                      <p style="color: rgba(255,255,255,0.8); font-size: 12px; margin: 0 0 10px 0;">If you didn't request this password reset, please ignore this email.</p>
                      <p style="color: rgba(255,255,255,0.6); font-size: 11px; margin: 0;">© ${new Date().getFullYear()} CaicosCompass. All rights reserved.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `
    };

    await emailApi.sendTransacEmail(mailOptions);
    console.log(`🎉 Password reset email sent successfully to ${recipientEmail}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Error sending password reset email:', error);
    throw new Error('Unable to send password reset email. Please try again later.');
  }
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendBusinessApplicationEmail,  // NEW
  sendBusinessApprovalEmail      // NEW
};