import { db } from '../config/firebaseAdmin.js';
import { sendOTPEmail } from '../config/emailConfig.js';
import crypto from 'crypto';

/**
 * OTP Service for email verification
 * Handles OTP generation, storage, verification, and email sending
 */

const OTP_EXPIRY_MINUTES = 10;
const MAX_RESEND_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW = 60000; // 1 minute in milliseconds

/**
 * Generate a secure 6-digit OTP
 * @returns {string} - 6-digit OTP code
 */
const generateOTP = () => {
  // Use crypto for secure random number generation
  const otp = crypto.randomInt(100000, 999999).toString();
  return otp;
};

/**
 * Store OTP in Firestore with expiration
 * @param {string} email - User's email address
 * @param {string} otp - Generated OTP
 * @returns {Promise<void>}
 */
const storeOTP = async (email, otp) => {
  try {
    const otpRef = db.collection('otps').doc(email);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60000);

    // Get existing document to track resend attempts
    const existingDoc = await otpRef.get();
    const existingData = existingDoc.exists ? existingDoc.data() : {};
    
    // Reset attempts if last request was more than rate limit window ago
    const lastCreated = existingData.createdAt?.toDate() || new Date(0);
    const timeSinceLastRequest = Date.now() - lastCreated.getTime();
    const resendCount = timeSinceLastRequest > RATE_LIMIT_WINDOW ? 0 : (existingData.resendCount || 0);

    await otpRef.set({
      otp,
      email,
      createdAt: new Date(),
      expiresAt,
      verified: false,
      resendCount: resendCount + 1,
    });

    console.log(`✅ OTP stored for ${email}, expires at ${expiresAt.toISOString()}`);
  } catch (error) {
    console.error('❌ Error storing OTP:', error);
    throw new Error('Failed to store OTP');
  }
};

/**
 * Verify OTP code
 * @param {string} email - User's email address
 * @param {string} otp - OTP code to verify
 * @returns {Promise<Object>} - Verification result
 */
export const verifyOTP = async (email, otp, userId) => {
  try {
    const otpRef = db.collection('otps').doc(email);
    const otpDoc = await otpRef.get();

    if (!otpDoc.exists) {
      return {
        success: false,
        message: 'No OTP found for this email. Please request a new one.',
      };
    }

    const otpData = otpDoc.data();
    const now = new Date();
    const expiresAt = otpData.expiresAt.toDate();

    // Check if OTP is expired
    if (now > expiresAt) {
      await otpRef.delete(); // Clean up expired OTP
      return {
        success: false,
        message: 'OTP has expired. Please request a new one.',
      };
    }

    // Check if OTP is already verified
    if (otpData.verified) {
      return {
        success: false,
        message: 'This OTP has already been used.',
      };
    }

    // Verify OTP code
    if (otpData.otp !== otp) {
      return {
        success: false,
        message: 'Invalid OTP code. Please try again.',
      };
    }

    // Mark OTP as verified
    await otpRef.update({ verified: true });

    // Update user's email verification status in Firestore
    if (userId) {
      const userDocRef = db.collection('users').doc(String(userId));
      await userDocRef.update({ emailVerified: true });
    } else {
      // Fallback to email query if no userId
      const usersRef = db.collection('users');
      const userQuery = await usersRef.where('email', '==', email).get();
      if (!userQuery.empty) {
        const userDoc = userQuery.docs[0];
        await userDoc.ref.update({ emailVerified: true });
      }
    }

    console.log(`✅ OTP verified successfully for ${email}`);
    
    // Clean up verified OTP after a delay (optional)
    setTimeout(async () => {
      try {
        await otpRef.delete();
      } catch (err) {
        console.warn('Could not delete verified OTP:', err);
      }
    }, 5000);

    return {
      success: true,
      message: 'Email verified successfully!',
    };
  } catch (error) {
    console.error('❌ Error verifying OTP:', error);
    throw new Error('Failed to verify OTP');
  }
};

/**
 * Send OTP to user's email
 * @param {string} email - User's email address
 * @param {string} userName - User's name (optional)
 * @returns {Promise<Object>} - Send result
 */
export const sendOTP = async (email, userName = 'User') => {
  try {
    // Debug: Log environment variables (without exposing password)
    console.log('🔍 Email Configuration Check:');
    console.log('  EMAIL_USER:', process.env.EMAIL_USER ? '✅ Set' : '❌ Not set');
    console.log('  EMAIL_PASS:', process.env.EMAIL_PASS ? `✅ Set (length: ${process.env.EMAIL_PASS.length})` : '❌ Not set');
    
    // Check rate limiting
    const otpRef = db.collection('otps').doc(email);
    const existingDoc = await otpRef.get();
    
    if (existingDoc.exists) {
      const existingData = existingDoc.data();
      const lastCreated = existingData.createdAt?.toDate() || new Date(0);
      const timeSinceLastRequest = Date.now() - lastCreated.getTime();
      
      // Prevent spam: must wait at least 1 minute between requests
      if (timeSinceLastRequest < RATE_LIMIT_WINDOW) {
        const waitTime = Math.ceil((RATE_LIMIT_WINDOW - timeSinceLastRequest) / 1000);
        return {
          success: false,
          message: `Please wait ${waitTime} seconds before requesting another OTP.`,
        };
      }

      // Check maximum resend attempts
      if (existingData.resendCount >= MAX_RESEND_ATTEMPTS) {
        return {
          success: false,
          message: 'Maximum OTP request limit reached. Please try again later.',
        };
      }
    }

    // Generate and store OTP
    const otp = generateOTP();
    await storeOTP(email, otp);

    // Send email
    console.log(`📧 Sending OTP to ${email}...`);
    await sendOTPEmail(email, otp, userName);

    console.log(`✅ OTP sent successfully to ${email}`);
    
    return {
      success: true,
      message: 'OTP sent successfully! Please check your email.',
      expiresIn: OTP_EXPIRY_MINUTES,
    };
  } catch (error) {
    console.error('❌ Error sending OTP:', error);
    console.error('❌ Error stack:', error.stack);
    
    // Check if it's an email sending error
    if (error.message.includes('Failed to send email')) {
      return {
        success: false,
        message: 'Failed to send email. Please check your email configuration.',
        error: error.message,
      };
    }
    
    return {
      success: false,
      message: 'Failed to send OTP. Please try again.',
      error: error.message,
    };
  }
};

/**
 * Resend OTP to user's email
 * @param {string} email - User's email address
 * @param {string} userName - User's name (optional)
 * @returns {Promise<Object>} - Resend result
 */
export const resendOTP = async (email, userName = 'User') => {
  // Resend uses the same logic as send, with rate limiting
  return sendOTP(email, userName);
};

/**
 * Clean up expired OTPs (can be run as a scheduled job)
 * @returns {Promise<number>} - Number of deleted OTPs
 */
export const cleanupExpiredOTPs = async () => {
  try {
    const now = new Date();
    const otpsRef = db.collection('otps');
    const expiredOTPs = await otpsRef.where('expiresAt', '<', now).get();

    let deleteCount = 0;
    const batch = db.batch();

    expiredOTPs.docs.forEach((doc) => {
      batch.delete(doc.ref);
      deleteCount++;
    });

    if (deleteCount > 0) {
      await batch.commit();
      console.log(`🧹 Cleaned up ${deleteCount} expired OTPs`);
    }

    return deleteCount;
  } catch (error) {
    console.error('❌ Error cleaning up expired OTPs:', error);
    throw new Error('Failed to cleanup expired OTPs');
  }
};

export default {
  sendOTP,
  verifyOTP,
  resendOTP,
  cleanupExpiredOTPs,
};
