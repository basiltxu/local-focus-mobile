'use client';

import {
  createContext,
  useContext,
  type ReactNode,
} from 'react';
import { Auth } from 'firebase/auth';
import { FirebaseApp } from 'firebase/app';
import { Firestore } from 'firebase/firestore';

export interface FirebaseContextValue {
  app: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
}

const FirebaseContext = createContext<FirebaseContextValue | undefined>(
  undefined
);

export function FirebaseProvider({
  children,
  ...value
}: {
  children: ReactNode;
} & FirebaseContextValue) {
  return (
    <FirebaseContext.Provider value={value}>
      {children}
    </FirebaseContext.Provider>
  );
}

export function useFirebaseApp() {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebaseApp must be used within a FirebaseProvider');
  }
  return context.app;
}

export function useFirestore() {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    // This can happen in certain scenarios, so we return undefined
    // and let the caller handle it.
    return undefined;
  }
  return context.firestore;
}

export function useAuthContext() {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within a FirebaseProvider');
  }
  return context.auth;
}