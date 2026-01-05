import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth } from 'firebase/auth';

// Firebase configuration (read from Vite env vars - see .env.example)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? "AIzaSyBoPGBbv5SHN2pua7a0wOubfh35OKnFRWE",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? "snake-battle-545df.firebaseapp.com",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL ?? "https://snake-battle-545df-default-rtdb.firebaseio.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "snake-battle-545df",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? "snake-battle-545df.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "741299491424",
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? "1:741299491424:web:51c36c7b6b09215c3b6905"
};

// Warn developer if env vars are not provided (recommended: move secrets to .env)
if (!import.meta.env.VITE_FIREBASE_API_KEY) {
  console.warn('VITE_FIREBASE_API_KEY not set — using value embedded in source. For safety, add a .env file with VITE_FIREBASE_* variables and remove keys from source.');
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Realtime Database and get a reference to the service
export const database = getDatabase(app);

// Initialize Firebase Authentication
export const auth = getAuth(app);

export default app;