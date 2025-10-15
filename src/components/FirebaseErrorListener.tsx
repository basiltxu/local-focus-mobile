
'use client';

import { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { useToast } from '@/hooks/use-toast';

// This is a workaround to get the Next.js error overlay to show for client-side errors.
// The overlay does not show for errors that are caught in a try/catch block.
// This component listens for a custom event and then re-throws the error.
// This allows us to have a central error handler for Firestore permission errors.
export function FirebaseErrorListener() {
  const { toast } = useToast();

  useEffect(() => {
    const handleError = (error: any) => {
      // In development, we want to show the rich error overlay.
      if (process.env.NODE_ENV === 'development') {
         console.error("DEV MODE: Firestore Permission Error caught by listener:", error);
         // Re-throwing the error makes it visible in the Next.js error overlay.
         throw error;
      } else {
        // In production, we might want to show a toast or log to a service.
        toast({
          variant: "destructive",
          title: "Permission Denied",
          description: "You do not have permission to perform this action.",
        });
      }
    };

    errorEmitter.on('permission-error', handleError);

    return () => {
      errorEmitter.off('permission-error', handleError);
    };
  }, [toast]);

  return null;
}
