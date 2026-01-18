import { createTransport } from 'nodemailer';


const createTransporter = () => {
  // Validate environment variables
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('⚠️ EMAIL_USER or EMAIL_PASS not set in environment variables');
    console.warn('Email functionality will not work until credentials are configured.');
  }

  // Remove spaces from app password
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
          <div class="expiry">⏱️ This OTP will expire in 5 minutes</div>
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

/**
 * Send a welcome/acknowledgement email after sign up
 * @param {string} to - Recipient email
 * @param {string} userName - Recipient name for personalization
 * @returns {Promise<Object>} - Email send result
 */
export const sendWelcomeEmail = async (to, userName = 'User') => {
  const subject = 'Welcome to SLIDE-IT — Let’s get started!';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f9; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.08); overflow: hidden; }
        .header { background: linear-gradient(135deg, #20c997 0%, #198754 100%); color: white; padding: 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 26px; }
        .content { padding: 30px; color: #333; }
        .greeting { font-size: 18px; margin-bottom: 10px; }
        .message { font-size: 15px; line-height: 1.6; margin-bottom: 20px; }
        .cta { display: inline-block; background: #198754; color: white; padding: 12px 20px; border-radius: 6px; text-decoration: none; font-weight: 600; }
        .footer { background-color: #f8f9fa; padding: 18px; text-align: center; font-size: 12px; color: #888; border-top: 1px solid #e0e0e0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome to SLIDE-IT</h1>
        </div>
        <div class="content">
          <div class="greeting">Hi ${userName},</div>
          <div class="message">
            Thanks for joining SLIDE-IT — we're excited to have you on board!
          </div>
          <div class="message">
            Here are a few quick links to help you get started:
            <ul>
              <li>Upload your content and convert to slides quickly.</li>
              <li>Explore prebuilt templates to speed up your workflow.</li>
              <li>Visit our Help Center for tips and tricks.</li>
            </ul>
          </div>
          <div class="message" style="margin-top:18px; font-size:13px; color:#666;">
            If you need help, reply to this email or visit our support page.
          </div>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} SLIDE-IT. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail(to, subject, html);
};

/**
 * Send security alert email for suspicious login activity
 * @param {string} to - Recipient email address
 * @param {string} userName - User's name for personalization
 * @param {number} attempts - Number of failed login attempts
 * @param {string} lockoutTime - How long the account is locked
 * @returns {Promise<Object>} - Email send result
 */
export const sendSecurityAlertEmail = async (to, userName = 'User', attempts = 5, lockoutTime = '5 minutes') => {
  const subject = '⚠️ SLIDE-IT Security Alert - Suspicious Login Activity';
  
  const currentTime = new Date().toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  });

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
          background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
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
        }
        .greeting {
          font-size: 18px;
          color: #333;
          margin-bottom: 20px;
        }
        .alert-box {
          background-color: #fff3cd;
          border-left: 4px solid #ffc107;
          padding: 20px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .alert-box h3 {
          margin: 0 0 10px 0;
          color: #856404;
          font-size: 16px;
        }
        .alert-box p {
          margin: 0;
          color: #856404;
          font-size: 14px;
          line-height: 1.6;
        }
        .details-box {
          background-color: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
        }
        .details-box p {
          margin: 8px 0;
          font-size: 14px;
          color: #555;
        }
        .details-box strong {
          color: #333;
        }
        .message {
          font-size: 15px;
          color: #555;
          line-height: 1.6;
          margin-bottom: 20px;
        }
        .action-box {
          background-color: #d4edda;
          border-left: 4px solid #28a745;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .action-box h3 {
          margin: 0 0 10px 0;
          color: #155724;
          font-size: 16px;
        }
        .action-box ul {
          margin: 0;
          padding-left: 20px;
          color: #155724;
          font-size: 14px;
        }
        .action-box li {
          margin: 5px 0;
        }
        .footer {
          background-color: #f8f9fa;
          padding: 20px;
          text-align: center;
          font-size: 12px;
          color: #888;
          border-top: 1px solid #e0e0e0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔒 Security Alert</h1>
        </div>
        <div class="content">
          <div class="greeting">Hello, ${userName}!</div>
          
          <div class="alert-box">
            <h3>⚠️ Suspicious Login Activity Detected</h3>
            <p>We detected multiple failed login attempts on your SLIDE-IT account. Your account has been temporarily locked for security purposes.</p>
          </div>
          
          <div class="details-box">
            <p><strong>Failed Attempts:</strong> ${attempts}</p>
            <p><strong>Account Locked For:</strong> ${lockoutTime}</p>
            <p><strong>Time of Alert:</strong> ${currentTime}</p>
          </div>
          
          <div class="message">
            If this was you, please wait for the lockout period to end and try again with the correct password. If you've forgotten your password, you can reset it using the "Forgot Password" option.
          </div>
          
          <div class="action-box">
            <h3>🛡️ If this wasn't you:</h3>
            <ul>
              <li>Reset your password immediately after the lockout ends</li>
              <li>Enable two-factor authentication if available</li>
              <li>Check for any unauthorized changes to your account</li>
              <li>Contact our support team if you need assistance</li>
            </ul>
          </div>
        </div>
        <div class="footer">
          <p>This is an automated security alert from SLIDE-IT.</p>
          <p>&copy; ${new Date().getFullYear()} SLIDE-IT. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail(to, subject, html);
};

export default { sendEmail, sendOTPEmail, sendWelcomeEmail, sendSecurityAlertEmail };
