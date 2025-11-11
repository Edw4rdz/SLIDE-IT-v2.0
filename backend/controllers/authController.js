import admin from "../config/firebaseAdmin.js";

// Dummy login
export const login = (req, res) => {
  res.json({ success: true, message: "Dummy login successful" });
};

// Dummy register
export const register = (req, res) => {
  res.json({ success: true, message: "Dummy register successful" });
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