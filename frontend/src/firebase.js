// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyD5O1jKptv3gOTzJPzGqU9IIjIyEY7IhQI",
  authDomain: "slide-it-9cbd2.firebaseapp.com",
  projectId: "slide-it-9cbd2",
  storageBucket: "slide-it-9cbd2.firebasestorage.app",
  messagingSenderId: "814290391915",
  appId: "1:814290391915:web:d567012323a30604b9f22e",
};

// ✅ Initialize Firebase
const app = initializeApp(firebaseConfig);

// ✅ Export services
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
