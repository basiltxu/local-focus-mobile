
'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from './use-auth';
import type { Chat } from '@/lib/types';
import { collections } from '@/lib/paths';

export function useUnreadCount() {
  const { user } = useAuth();
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setTotalUnreadCount(0);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const chatsRef = collection(db, collections.chats);
    // Query for all chats the user is a participant in
    const q = query(chatsRef, where('participants', 'array-contains', user.uid));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let total = 0;
      snapshot.forEach(doc => {
        const chat = doc.data() as Chat;
        // Sum up the unread count for the current user from each chat
        if (chat.unreadCount && chat.unreadCount[user.uid]) {
          total += chat.unreadCount[user.uid];
        }
      });
      setTotalUnreadCount(total);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching unread counts:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  return { totalUnreadCount, isLoading };
}
