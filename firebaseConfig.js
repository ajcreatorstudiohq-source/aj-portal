import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDp2od-lrfAhEHV5oAIqBW5rWjaRbnAdFM",
  authDomain: "aj-super-portal.firebaseapp.com",
  projectId: "aj-super-portal",
  storageBucket: "aj-super-portal.firebasestorage.app",
  messagingSenderId: "288191292906",
  appId: "1:288191292906:web:bc31cb072948533f88fe93",
  measurementId: "G-8WYD1ZB96D"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);