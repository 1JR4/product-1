import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyD6rG1si9sPVaaYPWCWJ65VpcVBUtLrMWg",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "product-1-49e47.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "product-1-49e47",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "product-1-49e47.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "766228649288",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:766228649288:web:8158e83bf917bb4ae14f7d",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-J443QJ9E39",
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || "https://product-1-49e47-default-rtdb.firebaseio.com/"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const db = getFirestore(app);
export const realtimeDb = getDatabase(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

export default app;