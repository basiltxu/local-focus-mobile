
/**
 * @fileoverview Search service for Firestore-native queries.
 * This service provides functions for searching messages, users, and announcements.
 * It's designed to be replaced by a more robust search provider like Algolia in the future.
 */
import { db } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  Timestamp,
  collectionGroup,
} from 'firebase/firestore';
import {
  SearchQuery,
  User,
  Announcement,
  Message,
  MessageSearchResult,
  Chat,
} from '@/lib/types';
import { isLFPrivileged } from '../chat-utils';

const LOCAL_FOCUS_ORG_ID = 'LOCAL_FOCUS_ORG_ID';

/**
 * TODO: Option B - Algolia Search
 * This function is a placeholder for a future implementation using Algolia.
 *
 * export async function searchAlgolia(query: SearchQuery, currentUser: User) {
 *   // 1. Initialize Algolia client
 *   // 2. Apply security filters based on currentUser's roles/org
 *   // 3. Perform search query against the relevant index (messages, users, etc.)
 *   // 4. Format and return results
 * }
 */

// ===============================================
// OPTION A: Firestore-native Search Implementation
// ===============================================

export async function searchUsers(q: SearchQuery, currentUser: User): Promise<User[]> {
  if (!currentUser) return [];

  const usersRef = collection(db, 'users');
  let usersQuery;

  if (isLFPrivileged(currentUser)) {
    // LF privileged users can search all users
    usersQuery = query(usersRef, orderBy('name'));
  } else {
    // External users can only search within their own org and LF users
    usersQuery = query(
      usersRef,
      where('organizationId', 'in', [currentUser.organizationId, LOCAL_FOCUS_ORG_ID])
    );
  }

  const snapshot = await getDocs(usersQuery);
  const allVisibleUsers = snapshot.docs.map(doc => doc.data() as User);

  const searchTerm = q.term.toLowerCase();
  if (!searchTerm) return allVisibleUsers.slice(0, 50); // Return recent/all if no term

  // Client-side filtering
  const filteredUsers = allVisibleUsers.filter(
    u =>
      u.name.toLowerCase().includes(searchTerm) ||
      u.email.toLowerCase().includes(searchTerm)
  );

  return filteredUsers.slice(0, 50); // Limit results
}

export async function searchAnnouncements(q: SearchQuery, currentUser: User): Promise<Announcement[]> {
    if (!currentUser.organizationId) return [];

    const announcementsRef = collection(db, 'announcements');
    let announcementsQuery = query(
        announcementsRef,
        where('targetOrgs', 'array-contains-any', ['*', currentUser.organizationId]),
        orderBy('createdAt', 'desc'),
        limit(100)
    );

    // Apply date filters if they exist
    if (q.from) {
        announcementsQuery = query(announcementsQuery, where('createdAt', '>=', Timestamp.fromDate(q.from)));
    }
    if (q.to) {
        announcementsQuery = query(announcementsQuery, where('createdAt', '<=', Timestamp.fromDate(q.to)));
    }
    
    const snapshot = await getDocs(announcementsQuery);
    const allVisibleAnnouncements = snapshot.docs.map(doc => doc.data() as Announcement);

    const searchTerm = q.term.toLowerCase();

    const filtered = allVisibleAnnouncements.filter(ann => {
        const matchesTerm = searchTerm ? (ann.search || (ann.title + ann.content).toLowerCase()).includes(searchTerm) : true;
        const matchesAttachments = typeof q.hasAttachments === 'boolean' ? (ann.attachments?.length > 0) === q.hasAttachments : true;
        return matchesTerm && matchesAttachments;
    });

    return filtered.slice(0, 50);
}

export async function searchMessages(q: SearchQuery, currentUser: User): Promise<MessageSearchResult[]> {
  if (!currentUser) return [];

  // 1. Get the chats the user is part of
  const chatsRef = collection(db, 'chats');
  const userChatsQuery = query(chatsRef, where('participants', 'array-contains', currentUser.uid), orderBy('lastMessageAt', 'desc'), limit(50));
  const chatsSnapshot = await getDocs(userChatsQuery);
  const userChats = chatsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chat));

  const searchTerm = q.term.toLowerCase();
  const searchPromises: Promise<MessageSearchResult[]>[] = [];

  // 2. For each chat, query messages and filter them
  for (const chat of userChats) {
    const promise = async (): Promise<MessageSearchResult[]> => {
      const messagesRef = collection(db, 'chats', chat.id, 'messages');
      let messagesQuery = query(messagesRef, orderBy('createdAt', 'desc'), limit(100)); // Search last 100 messages

      // Apply date filters
      if (q.from) {
        messagesQuery = query(messagesQuery, where('createdAt', '>=', Timestamp.fromDate(q.from)));
      }
       if (q.to) {
        messagesQuery = query(messagesQuery, where('createdAt', '<=', Timestamp.fromDate(q.to)));
      }

      const messagesSnapshot = await getDocs(messagesQuery);
      const messages = messagesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      
      const filteredMessages = messages.filter(msg => {
          const matchesTerm = searchTerm ? msg.text.toLowerCase().includes(searchTerm) || msg.senderName.toLowerCase().includes(searchTerm) : true;
          const matchesAttachments = typeof q.hasAttachments === 'boolean' ? (msg.attachments?.length > 0) === q.hasAttachments : true;
          const matchesSenders = q.senders && q.senders.length > 0 ? q.senders.includes(msg.senderId) : true;
          return matchesTerm && matchesAttachments && matchesSenders;
      });

      // 3. Format results
      return filteredMessages.map(msg => {
          const otherParticipant = chat.participantDetails?.find(p => p.uid !== currentUser.uid);
          const chatName = chat.isGroup ? (chat.name || 'Group Chat') : (otherParticipant?.name || 'DM');
          return {
              id: msg.id,
              chatId: chat.id,
              chatName,
              text: msg.text,
              snippet: msg.text.substring(0, 140),
              senderId: msg.senderId,
              senderName: msg.senderName,
              createdAt: msg.createdAt,
          };
      });
    };
    searchPromises.push(promise());
  }

  const allResultsNested = await Promise.all(searchPromises);
  const allResults = allResultsNested.flat();
  
  // Sort all found messages by date
  allResults.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());

  return allResults.slice(0, 100); // Return top 100 overall
}
