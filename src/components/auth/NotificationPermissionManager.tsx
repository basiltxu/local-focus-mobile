
'use client';

import { useEffect, useState } from 'react';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { app, db, functions } from '@/lib/firebase';
import { doc, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';
import { collections } from '@/lib/paths';
import { httpsCallable } from 'firebase/functions';

async function requestNotificationPermission(uid: string, organizationId: string | null) {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    console.log('This browser does not support desktop notification');
    return null;
  }

  const messaging = getMessaging(app);
  const permission = await Notification.requestPermission();

  if (permission === 'granted') {
    console.log('Notification permission granted.');
    try {
      const currentToken = await getToken(messaging, {
        vapidKey: process.env.NEXT_PUBLIC_FCM_VAPID_KEY,
      });
      if (currentToken) {
        console.log('FCM Token:', currentToken);
        
        // Save token to user document
        const userRef = doc(db, collections.users, uid);
        const userSnap = await getDoc(userRef);
        const userData = userSnap.data();
        const existingTokens = userData?.fcmTokens || [];
        
        if (!existingTokens.includes(currentToken)) {
            await updateDoc(userRef, {
                fcmTokens: arrayUnion(currentToken),
            });
            console.log('FCM token saved for user.');
        } else {
            console.log('FCM token already exists for user.');
        }

        // Subscribe to organization topic
        if (organizationId) {
            try {
                const subscribeToTopic = httpsCallable(functions, 'subscribeToTopic');
                const result = await subscribeToTopic({ token: currentToken, topic: `org_${organizationId}` });
                console.log('Topic subscription result:', result.data);
            } catch (error) {
                console.error('Error subscribing to topic:', error);
            }
        }
        
        return currentToken;

      } else {
        console.log('No registration token available. Request permission to generate one.');
        return null;
      }
    } catch (err) {
      console.error('An error occurred while retrieving token. ', err);
      return null;
    }
  } else {
    console.log('Unable to get permission to notify.');
    return null;
  }
}


export function NotificationPermissionManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (user && user.organizationId && !initialized) {
      requestNotificationPermission(user.uid, user.organizationId);
      setInitialized(true);
    }
  }, [user, initialized]);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        const messaging = getMessaging(app);
        const unsubscribe = onMessage(messaging, (payload) => {
            console.log('Foreground message received.', payload);
            toast({
                title: payload.notification?.title || 'New Notification',
                description: payload.notification?.body || '',
            });
        });
        return () => unsubscribe();
    }
  }, [toast]);

  return null; // This component does not render anything
}
