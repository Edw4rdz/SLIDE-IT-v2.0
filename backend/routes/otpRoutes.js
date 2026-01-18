import express from 'express';
import {
  sendOTPController,
  verifyOTPController,
  resendOTPController,
  sendSecurityAlertController,
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

// Send security alert email
// POST /api/otp/security-alert
// Body: { email: string, userName?: string, attempts?: number, lockoutTime?: string }
router.post('/security-alert', sendSecurityAlertController);

export default router;
