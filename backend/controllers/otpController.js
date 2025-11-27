import { sendOTP, verifyOTP, resendOTP } from '../services/otpService.js';

/**
 * OTP Controller
 * Handles HTTP requests for OTP operations
 */

/**
 * Send OTP to user's email
 * POST /api/otp/send
 * Body: { email: string, userName?: string }
 */
export const sendOTPController = async (req, res) => {
  try {
    const { email, userName } = req.body;

    // Validate input
    if (!email || typeof email !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Email is required',
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format',
      });
    }

    console.log(`📨 OTP request received for: ${email}`);

    // Send OTP
    const result = await sendOTP(email, userName || 'User');

    if (result.success) {
      return res.status(200).json(result);
    } else {
      // Return the error message from the service
      return res.status(400).json(result);
    }
  } catch (error) {
    console.error('❌ Error in sendOTPController:', error);
    console.error('❌ Stack trace:', error.stack);
    return res.status(500).json({
      success: false,
      error: 'Failed to send OTP. Please try again later.',
      details: error.message,
    });
  }
};

/**
 * Verify OTP code
 * POST /api/otp/verify
 * Body: { email: string, otp: string }
 */
export const verifyOTPController = async (req, res) => {
  try {
    const { email, otp } = req.body;

    // Validate input
    if (!email || typeof email !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Email is required',
      });
    }

    if (!otp || typeof otp !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'OTP is required',
      });
    }

    // Validate OTP format (6 digits)
    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({
        success: false,
        error: 'OTP must be a 6-digit code',
      });
    }

    // Verify OTP
    const result = await verifyOTP(email, otp);

    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(400).json(result);
    }
  } catch (error) {
    console.error('❌ Error in verifyOTPController:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to verify OTP. Please try again later.',
    });
  }
};

/**
 * Resend OTP to user's email
 * POST /api/otp/resend
 * Body: { email: string, userName?: string }
 */
export const resendOTPController = async (req, res) => {
  try {
    const { email, userName } = req.body;

    // Validate input
    if (!email || typeof email !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Email is required',
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format',
      });
    }

    // Resend OTP
    const result = await resendOTP(email, userName || 'User');

    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(429).json(result); // 429 Too Many Requests for rate limiting
    }
  } catch (error) {
    console.error('❌ Error in resendOTPController:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to resend OTP. Please try again later.',
    });
  }
};

export default {
  sendOTPController,
  verifyOTPController,
  resendOTPController,
};
