
'use client';

// THIS HOOK IS DEPRECATED IN DEV MODE.
// All pages have been refactored to use simple getDocs() calls instead.
// This file can be removed or kept for reference for a future production mode.

import { useEffect, useRef } from 'react';
import {
  onSnapshot,
  Query,
  DocumentData,
  Unsubscribe,
  getDocs,
} from 'firebase/firestore';
import { useAuth } from './use-auth';

export function useSafeSnapshot<T>(
    collectionName: string,
    queryBuilder: (user: any) => Query<DocumentData> | null,
    setData: (data: T[]) => void,
) {
    const { user, isLoading: authLoading } = useAuth();
    const unsubscribeRef = useRef<Unsubscribe | null>(null);

    useEffect(() => {
        (async () => {
            if (authLoading || !user) {
                return;
            }

            const finalQuery = queryBuilder(user);

            if (!finalQuery) {
                setData([]);
                return;
            }
            
            console.log(`[useSafeSnapshot] DEV MODE: Fetching one-time snapshot for ${collectionName}`);
            try {
                const snapshot = await getDocs(finalQuery);
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
                setData(data);
            } catch (err: any) {
                console.log(`[useSafeSnapshot] Firestore action allowed in dev mode for ${collectionName}. Error:`, err.message);
            }
        })();
        
        return () => {
            if (unsubscribeRef.current) {
                unsubscribeRef.current();
                unsubscribeRef.current = null;
            }
        };

    }, [user, authLoading, collectionName]); // Re-run when auth state changes
}
