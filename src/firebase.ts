import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Load Firebase config from environment variables.
// Prefix all with VITE_ so Vite exposes them to the client bundle.
// Fall back to the JSON file only in development if env vars are missing.
const getEnv = (key: string) =>
  (import.meta as any).env?.[key] || (globalThis as any)[key] || '';

const firebaseConfig = {
  apiKey:            getEnv('VITE_FIREBASE_API_KEY'),
  authDomain:        getEnv('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId:         getEnv('VITE_FIREBASE_PROJECT_ID'),
  storageBucket:     getEnv('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId:             getEnv('VITE_FIREBASE_APP_ID'),
};

const firestoreDatabaseId = getEnv('VITE_FIREBASE_FIRESTORE_DATABASE_ID') || '(default)';

if (!firebaseConfig.apiKey) {
  console.error(
    '[Firebase] VITE_FIREBASE_API_KEY is not set. ' +
    'Copy .env.example to .env and fill in your Firebase project values.'
  );
}

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Set persistence to local to help with iframe/network issues
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.error("Auth persistence error:", err);
});

export const db = getFirestore(app, firestoreDatabaseId);
export const storage = getStorage(app);

export default app;
