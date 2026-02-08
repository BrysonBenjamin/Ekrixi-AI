import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';
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
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize services
const auth = getAuth(app);

// Use initializeFirestore to allow for settings like ignoring undefined values
const db = initializeFirestore(
  app,
  {
    ignoreUndefinedProperties: true,
  },
  config.firebase.databaseId,
);

const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

// Export generic app and specific services so the rest of the application can use them
export { app, auth, db, analytics };
