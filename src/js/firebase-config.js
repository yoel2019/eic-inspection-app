// Firebase configuration
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

// Your Firebase config - REPLACE WITH YOUR ACTUAL CONFIG
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDW5-bqI0T6_39XrNEWD_eqU012kjbMGDg",
  authDomain: "eicl-31769.firebaseapp.com",
  projectId: "eicl-31769",
  storageBucket: "eicl-31769.firebasestorage.app",
  messagingSenderId: "173062549381",
  appId: "1:173062549381:web:e38b2c11fb8097f1a45eec",
  measurementId: "G-HWTPTMFDZ8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();