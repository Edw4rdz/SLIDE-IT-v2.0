import express from 'express';
import {
  sendOTPController,
  verifyOTPController,
  resendOTPController,
} from '../controllers/otpController.js';

const router = express.Router();

/**
 * OTP Routes
 * Base path: /api/otp
 */

// Send OTP to email
// POST /api/otp/send
// Body: { email: string, userName?: string }
router.post('/send', sendOTPController);

// Verify OTP code
// POST /api/otp/verify
// Body: { email: string, otp: string }
router.post('/verify', verifyOTPController);

// Resend OTP to email
// POST /api/otp/resend
// Body: { email: string, userName?: string }
router.post('/resend', resendOTPController);

export default router;
