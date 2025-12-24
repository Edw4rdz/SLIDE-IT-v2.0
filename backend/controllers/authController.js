import admin from "../config/firebaseAdmin.js";
import { sendWelcomeEmail } from "../config/emailConfig.js";

// Dummy login
export const login = (req, res) => {
  res.json({ success: true, message: "Dummy login successful" });
};

// Register (sends welcome email). This endpoint intentionally does NOT create
// an Auth user here — it only sends the welcome/acknowledgement email after
// client-side or other service handles actual user creation.
export const register = async (req, res) => {
  try {
    const { email, userName, name, displayName } = req.body || {};
    const recipient = email && typeof email === 'string' ? email.trim() : null;
    const persona = userName || name || displayName || 'User';

    if (!recipient) {
      return res.status(400).json({ error: 'Email is required to send welcome message.' });
    }

    await sendWelcomeEmail(recipient, persona);

    return res.json({ success: true, message: 'Welcome email sent.' });
  } catch (err) {
    console.error('Error in register handler sending welcome email:', err);
    return res.status(500).json({ error: 'Failed to send welcome email.' });
  }
};

// Check if a Firebase Auth user exists by email (uses Admin SDK)
export const checkEmailExists = async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email is required' });
    }
    try {
      await admin.auth().getUserByEmail(email);
      return res.json({ exists: true });
    } catch (err) {
      if (err && err.code === 'auth/user-not-found') {
        return res.json({ exists: false });
      }
      console.error('Error checking email existence:', err);
      return res.status(500).json({ error: 'Failed to check email' });
    }
  } catch (e) {
    console.error('Unexpected error in checkEmailExists:', e);
    return res.status(500).json({ error: 'Unexpected server error' });
  }
};