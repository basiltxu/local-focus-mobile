
// src/lib/firebase.ts
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, connectAuthEmulator, type Auth } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator, type Firestore } from "firebase/firestore";
import { getFunctions, connectFunctionsEmulator, type Functions } from "firebase/functions";
import { getStorage, connectStorageEmulator, type FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

const FUNCTIONS_REGION = process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_REGION || "us-central1";
const USE_EMULATORS = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true";

declare global {
  // eslint-disable-next-line no-var
  var __FIREBASE_EMULATORS_CONNECTED__: boolean | undefined;
}

// HMR-safe initialization
const app: FirebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);
const functions: Functions = getFunctions(app, FUNCTIONS_REGION);
const storage: FirebaseStorage = getStorage(app);

if (USE_EMULATORS && typeof window !== 'undefined' && !global.__FIREBASE_EMULATORS_CONNECTED__) {
  const host = window.location.hostname;
  try { connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true }); } catch (e) { console.error(e); }
  try { connectFirestoreEmulator(db, host, 8080); } catch (e) { console.error(e); }
  try { connectFunctionsEmulator(functions, host, 5001); } catch (e) { console.error(e); }
  try { connectStorageEmulator(storage, host, 9199); } catch (e) { console.error(e); }
  global.__FIREBASE_EMULATORS_CONNECTED__ = true;
  console.log('Firebase Emulators connected.');
}

export { app, auth, db, functions, storage };
export default app;
