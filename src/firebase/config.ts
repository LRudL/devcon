import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getMessaging } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "AIzaSyCbt7YF2RkUKNaC0R2jcdbd1evBm3gG1WY",
  authDomain: "devcon-2ce74.firebaseapp.com",
  projectId: "devcon-2ce74",
  storageBucket: "devcon-2ce74.firebasestorage.app",
  messagingSenderId: "951484490367",
  appId: "1:951484490367:web:24121f0f0be2a4fb"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const firestore = getFirestore(app); 
export const messaging = getMessaging(app);
