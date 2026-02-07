import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth'; // Import auth
import { getFirestore } from 'firebase/firestore'; // Import firestore
import { getAnalytics } from 'firebase/analytics'; // Import analytics
import { config } from '../config';

const firebaseConfig = {
  apiKey: config.firebase.apiKey,
  authDomain: config.firebase.authDomain,
  projectId: config.firebase.projectId,
  storageBucket: config.firebase.storageBucket,
  messagingSenderId: config.firebase.messagingSenderId,
  appId: config.firebase.appId,
  measurementId: config.firebase.measurementId,
};

// Initialize Firebase
// Use getApps() to check if an app is already initialized to prevent errors in development (hot modules)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize services
const auth = getAuth(app);
const db = getFirestore(app);
const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

// Export generic app and specific services so the rest of the application can use them
export { app, auth, db, analytics };
