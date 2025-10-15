
'use client';

import { useState, useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot, orderBy, or } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Announcement, User } from '@/lib/types';
import { collections } from '@/lib/paths';
import { useSound } from './use-sound';

// Helper to check for shallow equality of announcement arrays based on ID
const areAnnouncementsEqual = (arr1: Announcement[], arr2: Announcement[]): boolean => {
  if (arr1.length !== arr2.length) return false;
  for (let i = 0; i < arr1.length; i++) {
    if (arr1[i].id !== arr2[i].id) {
      return false;
    }
  }
  return true;
};

export function useAnnouncements(user: User | null) {
  const { play } = useSound();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isInitialLoadRef = useRef(true);

  useEffect(() => {
    if (!user || !user.organizationId) {
      setAnnouncements([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const announcementsRef = collection(db, collections.announcements);
    const q = query(
      announcementsRef,
      or(
        where('targetOrgs', 'array-contains', user.organizationId),
        where('targetOrgs', 'array-contains', '*')
      ),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newAnnouncements: Announcement[] = [];
      snapshot.docChanges().forEach(change => {
        if(change.type === "added" && !change.doc.metadata.hasPendingWrites) {
            newAnnouncements.push({ id: change.doc.id, ...change.doc.data() } as Announcement);
        }
      });

      if (!isInitialLoadRef.current && newAnnouncements.length > 0) {
        play('announcement');
      }

      const allAnnouncements = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Announcement));
      
      setAnnouncements(prev => {
        // Prevent re-render if data is identical
        if (areAnnouncementsEqual(prev, allAnnouncements)) {
          return prev;
        }
        return allAnnouncements;
      });

      setIsLoading(false);
      isInitialLoadRef.current = false;
    }, (error) => {
      console.error("Error fetching announcements:", error);
      setIsLoading(false);
    });

    return () => {
        unsubscribe();
        isInitialLoadRef.current = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, user?.organizationId]); // Using organizationId as well to re-run if it changes

  return { announcements, isLoading };
}
    