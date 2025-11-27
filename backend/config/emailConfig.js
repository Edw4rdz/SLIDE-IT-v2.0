import { createTransport } from 'nodemailer';

/**
 * Email configuration for sending OTP emails via Gmail SMTP
 * 
 * Setup Instructions:
 * 1. Enable 2-Step Verification in your Google Account
 * 2. Go to: https://myaccount.google.com/apppasswords
 * 3. Generate an App Password for "Mail"
 * 4. Add to your .env file:
 *    EMAIL_USER=your-email@gmail.com
 *    EMAIL_PASS=your-16-digit-app-password
 */

const createTransporter = () => {
  // Validate environment variables
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('⚠️ EMAIL_USER or EMAIL_PASS not set in environment variables');
    console.warn('Email functionality will not work until credentials are configured.');
  }

  // Remove spaces from app password (in case user included them)
  const emailPass = process.env.EMAIL_PASS ? process.env.EMAIL_PASS.replace(/\s/g, '') : '';

  return createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: emailPass,
    },
  });
};

/**
 * Send an email
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} html - HTML content of the email
 * @returns {Promise<Object>} - Email send result
 */
export const sendEmail = async (to, subject, html) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"SLIDE-IT Support" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    };

    console.log(`📧 Attempting to send email to: ${to}`);
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending email:', error);
    console.error('❌ Error details:', {
      code: error.code,
      command: error.command,
      response: error.response,
      responseCode: error.responseCode,
    });
    throw new Error('Failed to send email: ' + error.message);
  }
};

/**
 * Send OTP verification email
 * @param {string} to - Recipient email address
 * @param {string} otp - 6-digit OTP code
 * @param {string} userName - User's name for personalization
 * @returns {Promise<Object>} - Email send result
 */
export const sendOTPEmail = async (to, otp, userName = 'User') => {
  const subject = 'SLIDE-IT Email Verification - OTP Code';
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background-color: #f4f4f9;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 40px auto;
          background-color: #ffffff;
          border-radius: 10px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 30px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 600;
        }
        .content {
          padding: 40px 30px;
          text-align: center;
        }
        .greeting {
          font-size: 18px;
          color: #333;
          margin-bottom: 20px;
        }
        .message {
          font-size: 16px;
          color: #555;
          line-height: 1.6;
          margin-bottom: 30px;
        }
        .otp-box {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          font-size: 32px;
          font-weight: bold;
          letter-spacing: 8px;
          padding: 20px;
          border-radius: 8px;
          display: inline-block;
          margin: 20px 0;
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
        }
        .expiry {
          font-size: 14px;
          color: #ff6b6b;
          margin-top: 20px;
          font-weight: 600;
        }
        .footer {
          background-color: #f8f9fa;
          padding: 20px;
          text-align: center;
          font-size: 12px;
          color: #888;
          border-top: 1px solid #e0e0e0;
        }
        .warning {
          background-color: #fff3cd;
          border-left: 4px solid #ffc107;
          padding: 15px;
          margin: 20px 0;
          font-size: 14px;
          color: #856404;
          text-align: left;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎯 SLIDE-IT</h1>
        </div>
        <div class="content">
          <div class="greeting">Hello, ${userName}!</div>
          <div class="message">
            Thank you for signing up with SLIDE-IT! To complete your registration, 
            please verify your email address using the One-Time Password (OTP) below:
          </div>
          <div class="otp-box">${otp}</div>
          <div class="expiry">⏱️ This OTP will expire in 10 minutes</div>
          <div class="warning">
            <strong>⚠️ Security Notice:</strong> Never share this OTP with anyone. 
            SLIDE-IT staff will never ask for your OTP.
          </div>
        </div>
        <div class="footer">
          <p>If you didn't request this verification, please ignore this email.</p>
          <p>&copy; ${new Date().getFullYear()} SLIDE-IT. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail(to, subject, html);
};

export default { sendEmail, sendOTPEmail };
