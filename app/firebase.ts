import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDp2od-lrfAhEHV5oAIqBW5rWjaRbnAdFM",
  authDomain: "aj-super-portal.firebaseapp.com",
  databaseURL: "https://aj-super-portal-default-rtdb.firebaseio.com",
  projectId: "aj-super-portal",
  storageBucket: "aj-super-portal.appspot.com",
  messagingSenderId: "288191292906",
  appId: "1:288191292906:web:bc31cb072948533f88fe93",
  measurementId: "G-8WYD1ZB96D"
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();