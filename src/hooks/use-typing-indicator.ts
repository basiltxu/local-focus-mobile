
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, setDoc, serverTimestamp, deleteDoc, collection } from 'firebase/firestore';
import type { TypingUser } from '@/lib/types';
import { useAuth } from './use-auth';
import { useDebounce } from 'use-debounce';

const TYPING_TIMEOUT = 5000; // 5 seconds

export function useTypingIndicator(chatId: string | null) {
  const { user } = useAuth();
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const lastTypedTimeRef = useRef<number>(0);

  // Listener for typing indicators from other users
  useEffect(() => {
    if (!chatId) {
      setTypingUsers([]);
      return;
    }

    const typingRef = collection(db, 'chats', chatId, 'typing');
    const unsubscribe = onSnapshot(typingRef, (snapshot) => {
      const now = Date.now();
      const typingData: TypingUser[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.updatedAt && (now - data.updatedAt.toMillis() < TYPING_TIMEOUT) && doc.id !== user?.uid) {
          typingData.push({ uid: doc.id, name: data.name });
        }
      });
      setTypingUsers(typingData);
    });

    return () => unsubscribe();
  }, [chatId, user?.uid]);
  
  // Function for the current user to indicate they are typing
  const indicateTyping = useCallback(() => {
    if (!chatId || !user) return;
    
    lastTypedTimeRef.current = Date.now();

    const typingDocRef = doc(db, 'chats', chatId, 'typing', user.uid);
    setDoc(typingDocRef, {
      name: user.name,
      updatedAt: serverTimestamp(),
    });
  }, [chatId, user]);

  const [debouncedIndicateTyping] = useDebounce(indicateTyping, 300);

  // Cleanup effect to remove the user's typing indicator after they stop
  useEffect(() => {
    const interval = setInterval(() => {
      if (lastTypedTimeRef.current && (Date.now() - lastTypedTimeRef.current > TYPING_TIMEOUT)) {
        if (chatId && user) {
          const typingDocRef = doc(db, 'chats', chatId, 'typing', user.uid);
          deleteDoc(typingDocRef);
          lastTypedTimeRef.current = 0;
        }
      }
    }, TYPING_TIMEOUT);

    return () => clearInterval(interval);
  }, [chatId, user]);

  return { typingUsers, indicateTyping: debouncedIndicateTyping };
}
