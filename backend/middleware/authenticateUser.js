import admin from "../config/firebaseAdmin.js";

/**
 * Middleware to verify Firebase ID Token and attach user info to req.user
 * Works for any authenticated user (not just admin)
 * Usage: router.use(authenticateUser) or as needed per route
 */
export const authenticateUser = async (req, res, next) => {
  try {
    const idToken = req.headers.authorization?.split("Bearer ")[1];
    if (!idToken) {
      return res.status(401).json({ error: "Unauthorized: No token provided" });
    }
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = { uid: decodedToken.uid, email: decodedToken.email };
    next();
  } catch (error) {
    return res.status(401).json({ error: "Unauthorized: Invalid token" });
  }
};
