import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { getAnalytics } from 'firebase/analytics';

const env = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : (typeof process !== 'undefined' && process.env) ? process.env : {};

const firebaseConfig = {
  apiKey:            env.VITE_FIREBASE_API_KEY,
  authDomain:        env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             env.VITE_FIREBASE_APP_ID,
  measurementId:     env.VITE_FIREBASE_MEASUREMENT_ID,
};

let app, auth, googleProvider, analytics;

try {
  if (firebaseConfig.apiKey) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();
    // Analytics only works in browser environments
    if (typeof window !== 'undefined') {
      analytics = getAnalytics(app);
    }
  } else {
    console.warn('Firebase config is missing. Auth will be disabled.');
  }
} catch (e) {
  console.error('Firebase init error', e);
}

export { auth, googleProvider, signInWithPopup, signOut, onAuthStateChanged, analytics };
