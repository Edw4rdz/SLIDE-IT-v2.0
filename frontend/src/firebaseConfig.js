import { initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyD5O1jKptv3gOTzJPzGqU9IIjIyEY7IhQI",
  authDomain: "slide-it-9cbd2.firebaseapp.com",
  projectId: "slide-it-9cbd2",
  storageBucket: "slide-it-9cbd2.firebasestorage.app",
  messagingSenderId: "814290391915",
  appId: "1:814290391915:web:d567012323a30604b9f22e"
};

const app = initializeApp(firebaseConfig);
export const storage = getStorage(app);


