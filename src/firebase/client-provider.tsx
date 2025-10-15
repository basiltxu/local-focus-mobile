
'use client';

import { useEffect, useState } from 'react';
import { AuthProvider } from '@/components/auth/auth-provider';
import { app, db, auth } from '@/lib/firebase';
import { FirebaseProvider } from './provider';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { Loader2 } from 'lucide-react';

export function FirebaseClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        signInAnonymously(auth).catch((err) =>
          console.error('Anonymous sign-in failed', err)
        );
      }
      setIsAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (isAuthLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <FirebaseProvider app={app} firestore={db} auth={auth}>
      <AuthProvider>{children}</AuthProvider>
    </FirebaseProvider>
  );
}
