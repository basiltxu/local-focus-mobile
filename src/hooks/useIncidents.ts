
'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy, or } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useCurrentUserRole } from './useCurrentUserRole';
import type { Incident } from '@/lib/types';
import { collections } from '@/lib/paths';

export function useIncidents() {
  const { isLFPrivileged, uid, isReady } = useCurrentUserRole();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!isReady) {
      // Don't start fetching until the user role is determined
      return;
    }

    setIsLoading(true);
    
    const incidentsRef = collection(db, collections.incidents);
    let incidentsQuery;

    if (isLFPrivileged) {
      // Local Focus Admin/Editor/SuperAdmin sees all incidents, most recent first.
      incidentsQuery = query(incidentsRef, orderBy('updatedAt', 'desc'));
    } else if (uid) {
      // Regular users see their own private incidents AND all public incidents.
      incidentsQuery = query(
        incidentsRef,
        or(
          where('visibility', '==', 'public'),
          where('createdBy', '==', uid)
        ),
        orderBy('updatedAt', 'desc')
      );
    } else {
        // Unauthenticated or user with no UID
        setIsLoading(false);
        setIncidents([]);
        return;
    }
    
    const unsubscribe = onSnapshot(
      incidentsQuery, 
      (snapshot) => {
        const fetchedIncidents = snapshot.docs.map(d => ({
            id: d.id,
            ...d.data(),
        } as Incident));
        
        setIncidents(prevIncidents => {
            if (JSON.stringify(prevIncidents) === JSON.stringify(fetchedIncidents)) {
                return prevIncidents;
            }
            return fetchedIncidents;
        });
        setIsLoading(false);
      }, 
      (err) => {
        console.error("Error fetching incidents:", err);
        setError(err);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [isReady, uid, isLFPrivileged]);

  return { incidents, isLoading, error };
}
