import admin from '../config/firebaseAdmin.js';
import { sendEmail } from '../config/emailConfig.js';

/**
 * Send password reset email using custom Nodemailer
 */
export const sendPasswordResetEmail = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email is required' 
      });
    }

    // Check if user exists in Firebase Auth
    let user;
    try {
      user = await admin.auth().getUserByEmail(email.toLowerCase());
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        return res.status(404).json({ 
          success: false, 
          error: 'No account exists with that email address' 
        });
      }
      throw error;
    }

    // Password reset link using Firebase Admin SDK
    const resetLink = await admin.auth().generatePasswordResetLink(email.toLowerCase(), {
      url: process.env.FRONTEND_URL || 'http://localhost:3000/login',
    });

    //HTML email template
    const subject = 'Reset Your SLIDE-IT Password';
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
          }
          .content {
            padding: 40px 30px;
            color: #333;
          }
          .content p {
            line-height: 1.6;
            margin: 15px 0;
          }
          .button {
            display: inline-block;
            padding: 15px 30px;
            margin: 25px 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-weight: bold;
            font-size: 16px;
          }
          .button:hover {
            opacity: 0.9;
          }
          .footer {
            background-color: #f8f9fa;
            padding: 20px;
            text-align: center;
            color: #666;
            font-size: 14px;
          }
          .warning {
            background-color: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Password Reset</h1>
          </div>
          <div class="content">
            <p>Hello,</p>
            <p>We received a request to reset your password for your SLIDE-IT account.</p>
            <p>Click the button below to reset your password:</p>
            
            <center>
              <a href="${resetLink}" class="button">Reset Password</a>
            </center>
            
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #667eea;">${resetLink}</p>
            
            <div class="warning">
              <p style="margin: 0;"><strong>⚠️ Security Notice:</strong></p>
              <p style="margin: 5px 0 0 0;">This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.</p>
            </div>
            
            <p>Thanks,<br>Your SLIDE-IT Team</p>
          </div>
          <div class="footer">
            <p>This is an automated message, please do not reply to this email.</p>
            <p>&copy; 2025 SLIDE-IT. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send email using Nodemailer
    await sendEmail(email.toLowerCase(), subject, html);

    res.json({ 
      success: true, 
      message: 'Password reset email sent successfully' 
    });

  } catch (error) {
    console.error('Error in sendPasswordResetEmail:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to send password reset email. Please try again later.' 
    });
  }
};
