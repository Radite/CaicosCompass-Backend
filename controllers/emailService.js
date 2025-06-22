const SibApiV3Sdk = require('sib-api-v3-sdk');
require('dotenv').config();

const sendVerificationEmail = async (recipientEmail, verificationLink) => {
  try {
    SibApiV3Sdk.ApiClient.instance.authentications['api-key'].apiKey = process.env.BREVO_API_KEY;

    const emailApi = new SibApiV3Sdk.TransactionalEmailsApi();

    const sender = {
      email: process.env.BREVO_SENDER_EMAIL,
      name: "CaicosCompass"
    };

    const receivers = [
      {
        email: recipientEmail,
      }
    ];

    const mailOptions = {
      sender,
      to: receivers,
      subject: 'Verify Your Email - CaicosCompass',
      htmlContent: `
        <h2>Email Verification</h2>
        <p>Click the link below to verify your email:</p>
        <a href="${verificationLink}" target="_blank">${verificationLink}</a>
        <p>This link will expire in 24 hours.</p>
      `
    };

    await emailApi.sendTransacEmail(mailOptions);

    console.log(`Verification email sent to ${recipientEmail}`);
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Unable to send verification email. Please try again later.');
  }
};

const sendPasswordResetEmail = async (recipientEmail, resetLink) => {
    try {
      SibApiV3Sdk.ApiClient.instance.authentications['api-key'].apiKey = process.env.BREVO_API_KEY;
      const emailApi = new SibApiV3Sdk.TransactionalEmailsApi();
  
      const sender = {
        email: process.env.BREVO_SENDER_EMAIL,
        name: "CaicosCompass"
      };
  
      const receivers = [{ email: recipientEmail }];
  
      const mailOptions = {
        sender,
        to: receivers,
        subject: 'Reset Your Password - CaicosCompass',
        htmlContent: `
          <h2>Password Reset Request</h2>
          <p>Click the link below to reset your password:</p>
          <a href="${resetLink}" target="_blank">${resetLink}</a>
          <p>This link will expire in 1 hour.</p>
        `
      };
  
      await emailApi.sendTransacEmail(mailOptions);
      console.log(`Password reset email sent to ${recipientEmail}`);
    } catch (error) {
      console.error('Error sending password reset email:', error);
      throw new Error('Unable to send password reset email. Please try again later.');
    }
  };
  
  module.exports = {
    sendVerificationEmail,
    sendPasswordResetEmail,
  };
  