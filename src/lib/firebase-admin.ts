
import * as admin from 'firebase-admin';

// Ensure the environment variable is loaded. In a real environment (like Vercel or Firebase Functions),
// you would set this in the environment configuration.
const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

if (!serviceAccountKey) {
  // This check is important for server-side operations.
  // The app will fail to start if this variable is missing.
  console.error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set. This is required for Admin SDK initialization.');
}

// HMR-safe initialization
if (!admin.apps.length) {
  try {
    // We only try to initialize if the key is present.
    if (serviceAccountKey) {
      admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(serviceAccountKey)),
      });
      console.log('Firebase Admin SDK initialized successfully.');
    } else {
      console.warn('Firebase Admin SDK not initialized because service account key is missing.');
    }
  } catch (error: any) {
    console.error('Firebase Admin SDK initialization error:', error.message);
  }
}

// These are exported conditionally to prevent errors if initialization fails.
export const adminAuth = admin.apps.length ? admin.auth() : null;
export const adminDb = admin.apps.length ? admin.firestore() : null;
