import admin from "firebase-admin";
// We need to import the 'createRequire' function to read the JSON file
import { createRequire } from "module";
const require = createRequire(import.meta.url);

// Load the service account key
const serviceAccount = require("./serviceAccountKey.json");

// Initialize the Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Export the Firestore database instance
export const db = admin.firestore();

export default admin;