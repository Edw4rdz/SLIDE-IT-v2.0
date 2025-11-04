import { db } from "../config/firebaseAdmin.js";
import admin from "../config/firebaseAdmin.js";

/**
 * Middleware to verify if a user is an admin.
 * Assumes a Firebase ID Token is passed in the Authorization header.
 * e.g., "Authorization: Bearer <ID_TOKEN>"
 */
export const checkAdmin = async (req, res, next) => {
  try {
    const idToken = req.headers.authorization?.split("Bearer ")[1];
    if (!idToken) {
      return res.status(401).json({ error: "Unauthorized: No token provided" });
    }

    // 1. Verify the Firebase ID token
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const authUID = decodedToken.uid;

    // 2. Check the user's document in Firestore for the 'isAdmin' flag
    // We check the 'users' collection for a document where authUID matches
    const userRef = db.collection("users").where("authUID", "==", authUID);
    const userSnap = await userRef.get();

    if (userSnap.empty) {
      // As a fallback, check if the doc ID is the authUID
      const userDocById = await db.collection("users").doc(authUID).get();
      if (!userDocById.exists || userDocById.data().isAdmin !== true) {
         return res.status(404).json({ error: "User not found or not admin" });
      }

      // User found by doc ID and is admin
      req.user = userDocById.data();
      return next();
    }

    const userData = userSnap.docs[0].data();

    // 3. Verify if the user is an admin
    if (userData.isAdmin === true) {
      // User is an admin, add user info to request and proceed
      req.user = userData;
      next();
    } else {
      // User is not an admin
      return res.status(403).json({ error: "Forbidden: Admin access required" });
    }
  } catch (error) {
    console.error("Admin check failed:", error);
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({ error: "Unauthorized: Token expired" });
    }
    return res.status(401).json({ error: "Unauthorized: Invalid token" });
  }
};