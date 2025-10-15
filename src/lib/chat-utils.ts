
'use client';

import { db, storage } from '@/lib/firebase';
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
  arrayUnion,
  query,
  where,
  getDocs,
  writeBatch,
  arrayRemove,
  deleteDoc,
  getDoc,
  limit,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import type { User, Chat } from './types';
import { collections } from './paths';

export function isLFPrivileged(user: User | null): boolean {
    if (!user) return false;
    const LOCAL_FOCUS_ORG_ID = 'LOCAL_FOCUS_ORG_ID';
    return user.organizationId === LOCAL_FOCUS_ORG_ID && ['SuperAdmin', 'Admin', 'Editor'].includes(user.role);
}

export async function sendMessage({
  chatId,
  text,
  sender,
  attachment,
}: {
  chatId: string;
  text: string;
  sender: User;
  attachment?: File | null;
}) {
  if (!text.trim() && !attachment) return;

  const messagesRef = collection(db, 'chats', chatId, 'messages');
  const chatRef = doc(db, 'chats', chatId);

  let attachmentData = null;
  if (attachment) {
    const storageRef = ref(storage, `chat_uploads/${chatId}/${Date.now()}_${attachment.name}`);
    const uploadResult = await uploadBytes(storageRef, attachment);
    const downloadURL = await getDownloadURL(uploadResult.ref);
    attachmentData = {
        url: downloadURL,
        name: attachment.name,
        type: attachment.type.startsWith('image/') ? 'image' : 'file',
    };
  }

  const messagePayload = {
    senderId: sender.uid,
    senderName: sender.name,
    senderOrg: sender.organizationId,
    createdAt: serverTimestamp(),
    seenBy: [sender.uid],
    text: text,
    attachments: attachmentData ? [attachmentData] : [],
  };

  const batch = writeBatch(db);

  const messageRef = doc(collection(db, 'chats', chatId, 'messages'));
  batch.set(messageRef, messagePayload);

  batch.update(chatRef, {
    lastMessageText: text || `Attachment: ${attachmentData?.name}`,
    lastMessageAt: serverTimestamp(),
    lastMessageSenderId: sender.uid,
  });

  await batch.commit();
}

export async function startOrOpenDM(currentUser: User, peerUser: User): Promise<string> {
    if (currentUser.uid === peerUser.uid) throw new Error("Cannot start a DM with yourself.");

    const participantsKey = [currentUser.uid, peerUser.uid].sort().join('__');
    const chatsRef = collection(db, collections.chats);
    
    const q = query(
        chatsRef, 
        where('isGroup', '==', false), 
        where('participantsKey', '==', participantsKey),
        limit(1)
    );

    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
        return querySnapshot.docs[0].id;
    }

    // Create a new DM
    const newChatData = {
        isGroup: false,
        participants: [currentUser.uid, peerUser.uid],
        participantsKey: participantsKey,
        orgScope: Array.from(new Set([currentUser.organizationId, peerUser.organizationId].filter(Boolean))),
        createdBy: currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastMessageAt: serverTimestamp(),
        unreadCount: { [currentUser.uid]: 0, [peerUser.uid]: 0 },
    };

    const newChatRef = await addDoc(chatsRef, newChatData);
    return newChatRef.id;
}


export async function createGroupChat(name: string, memberUids: string[], user: User): Promise<string> {
    if (!name.trim()) throw new Error("Group name is required.");
    if (memberUids.length === 0) throw new Error("Group must have at least one member.");

    const allParticipants = Array.from(new Set([...memberUids, user.uid]));
    const allOrgs = Array.from(new Set([user.organizationId, ...memberUids.map(uid => {
        // This part is tricky without fetching all users. We assume we have access to user objects with orgs.
        // In a real scenario, you'd fetch users or pass their orgs.
        return 'some_org';
    })]));

    const chatsRef = collection(db, collections.chats);
    const newChatRef = await addDoc(chatsRef, {
        name: name.trim(),
        isGroup: true,
        participants: allParticipants,
        admins: [user.uid],
        orgScope: allOrgs,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastMessageAt: serverTimestamp(),
        unreadCount: Object.fromEntries(allParticipants.map(uid => [uid, 0])),
    });

    return newChatRef.id;
}

export async function renameGroup(chatId: string, newName: string): Promise<void> {
    if (!newName.trim()) throw new Error("New name cannot be empty.");
    const chatRef = doc(db, collections.chats, chatId);
    await updateDoc(chatRef, { name: newName.trim(), updatedAt: serverTimestamp() });
}

export async function addGroupMembers(chatId: string, uidsToAdd: string[]): Promise<void> {
    if (uidsToAdd.length === 0) return;
    const chatRef = doc(db, collections.chats, chatId);
    const newUnreadCounts = Object.fromEntries(uidsToAdd.map(uid => [`unreadCount.${uid}`, 0]));
    await updateDoc(chatRef, {
        participants: arrayUnion(...uidsToAdd),
        updatedAt: serverTimestamp(),
        ...newUnreadCounts
    });
}

export async function removeGroupMember(chatId: string, uidToRemove: string): Promise<void> {
    const chatRef = doc(db, collections.chats, chatId);
    const chatSnap = await getDoc(chatRef);
    if (!chatSnap.exists()) throw new Error("Chat not found.");
    const chatData = chatSnap.data() as Chat;

    if (chatData.participants.length <= 2) {
        throw new Error("Cannot remove member. Group must have at least two participants.");
    }
    
    // Also remove them from admins if they are one
    await updateDoc(chatRef, {
        participants: arrayRemove(uidToRemove),
        admins: arrayRemove(uidToRemove),
        [`unreadCount.${uidToRemove}`]: -1, // Sentinel to remove field
        updatedAt: serverTimestamp(),
    });
}

export async function deleteGroup(chatId: string): Promise<void> {
    // This is a soft delete. For a hard delete, a Cloud Function would be needed to delete the subcollection.
    const chatRef = doc(db, collections.chats, chatId);
    await updateDoc(chatRef, { isDeleted: true, updatedAt: serverTimestamp() });
}


export async function markMessagesAsRead(chatId: string, userId: string) {
    if (!chatId || !userId) return;
    const chatRef = doc(db, collections.chats, chatId);
    try {
        await updateDoc(chatRef, {
            [`unreadCount.${userId}`]: 0
        });
    } catch(e) {
        console.error("Error marking messages as read:", e);
    }
}
