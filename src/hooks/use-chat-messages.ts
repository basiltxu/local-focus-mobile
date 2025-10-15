
'use client';

import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Message } from '@/lib/types';
import { markMessagesAsRead } from '@/lib/chat-utils';
import { useAuth } from './use-auth';
import { shallowEqualArray } from '@/lib/utils';
import { useToast } from './use-toast';

export function useChatMessages(chatId: string | null) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!chatId || !user) {
      setMessages([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const messagesQuery = query(
      collection(db, 'chats', chatId, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(
      messagesQuery,
      (snapshot) => {
        const newMessages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
        
        setMessages(prev => shallowEqualArray(prev, newMessages) ? prev : newMessages);
        
        if (snapshot.docs.length > 0) {
            markMessagesAsRead(chatId, user.uid);
        }
        
        setIsLoading(false);
      },
      (error) => {
        console.error(`Error fetching messages for chat ${chatId}:`, error);
        toast({ title: "Error", description: "Could not load messages.", variant: "destructive" });
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [chatId, user, toast]);

  return { messages, isLoading };
}
