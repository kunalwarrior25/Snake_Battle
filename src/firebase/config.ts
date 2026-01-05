import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyBoPGBbv5SHN2pua7a0wOubfh35OKnFRWE",
  authDomain: "snake-battle-545df.firebaseapp.com",
  databaseURL: "https://snake-battle-545df-default-rtdb.firebaseio.com",
  projectId: "snake-battle-545df",
  storageBucket: "snake-battle-545df.firebasestorage.app",
  messagingSenderId: "741299491424",
  appId: "1:741299491424:web:51c36c7b6b09215c3b6905"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);