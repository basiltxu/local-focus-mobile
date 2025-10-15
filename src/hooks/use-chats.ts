
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from './use-auth';
import type { Chat, User, UserPresence } from '@/lib/types';
import { collections } from '@/lib/paths';
import { getDatabase, ref, onValue } from "firebase/database";
import { shallowEqualArray } from '@/lib/utils';
import { startOrOpenDM as apiStartOrOpenDM } from '@/lib/chat-utils';

// Maps over chats and enriches them with participant details and presence.
const enrichChats = (chats: Chat[], allUsers: User[], presences: Record<string, UserPresence>): Chat[] => {
  return chats.map(chat => {
    const participantDetails = chat.participants
      .map(uid => {
        const userDetail = allUsers.find(u => u.uid === uid);
        if (!userDetail) return null;
        
        const presence = presences[uid];
        return {
          uid: userDetail.uid,
          name: userDetail.name,
          avatar: userDetail.avatar,
          organizationId: userDetail.organizationId,
          presence: presence,
        };
      })
      .filter(Boolean) as Chat['participantDetails'];

    const lastMessageSender = participantDetails?.find(p => p.uid === (chat as any).lastMessageSenderId);

    return {
      ...chat,
      participantDetails,
      lastMessageSenderName: lastMessageSender?.name || "System",
    };
  });
};


export function useChats() {
  const { user } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [presences, setPresences] = useState<Record<string, UserPresence>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Effect for fetching all users
  useEffect(() => {
    const usersQuery = query(collection(db, collections.users));
    const unsubscribe = onSnapshot(usersQuery, (snapshot) => {
      const usersData = snapshot.docs.map(doc => doc.data() as User);
      setAllUsers(prev => shallowEqualArray(prev, usersData) ? prev : usersData);
    });
    return () => unsubscribe();
  }, []);

  // Effect for fetching chats
  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    const chatsQuery = query(
      collection(db, collections.chats),
      where('participants', 'array-contains', user.uid),
      orderBy('lastMessageAt', 'desc')
    );

    const unsubscribe = onSnapshot(chatsQuery, (snapshot) => {
      const chatsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chat));
      setChats(prev => shallowEqualArray(prev, chatsData) ? prev : chatsData);
      setIsLoading(false);
    }, (error) => {
        console.error("Error fetching chats:", error);
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Effect for fetching presence information
  useEffect(() => {
    const rtdb = getDatabase();
    const statusRef = ref(rtdb, 'status/');
    
    const unsubscribe = onValue(statusRef, (snapshot) => {
        const presencesData = snapshot.val() || {};
        setPresences(presencesData);
    });

    return () => unsubscribe();
  }, []);

  const enrichedChats = useMemo(() => {
    if (isLoading || !chats.length || !allUsers.length) return chats;
    return enrichChats(chats, allUsers, presences);
  }, [chats, allUsers, presences, isLoading]);
  
  const startOrOpenDM = useCallback(async (peerUser: User): Promise<string> => {
    if (!user) throw new Error("Current user not found.");
    return apiStartOrOpenDM(user, peerUser);
  }, [user]);


  return { 
    chats: enrichedChats, 
    isLoading: isLoading && chats.length === 0,
    startOrOpenDM
  };
}
