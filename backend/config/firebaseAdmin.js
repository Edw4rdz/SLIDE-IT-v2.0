import admin from "firebase-admin";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


let serviceAccount;
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} else {

  serviceAccount = JSON.parse(
    readFileSync(join(__dirname, "serviceAccountkey.json"), "utf8")
  );
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

export const db = admin.firestore();

export default admin;