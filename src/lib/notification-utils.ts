
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc, query, where, getDocs, writeBatch } from 'firebase/firestore';
import type { Notification } from './types';

type NotificationInput = Omit<Notification, 'id' | 'createdAt' | 'read'>;

export async function createNotification(data: NotificationInput) {
  try {
    await addDoc(collection(db, 'notifications'), {
      ...data,
      read: false,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Failed to create notification:", error);
  }
}

export async function markAsRead(notificationId: string) {
  const notifRef = doc(db, 'notifications', notificationId);
  try {
    await updateDoc(notifRef, { read: true });
  } catch (error) {
    console.error("Failed to mark notification as read:", error);
  }
}

export async function markAllAsRead(userId: string) {
  const q = query(collection(db, 'notifications'), where('userId', '==', userId), where('read', '==', false));
  try {
    const snapshot = await getDocs(q);
    if (snapshot.empty) return;

    const batch = writeBatch(db);
    snapshot.docs.forEach(doc => {
      batch.update(doc.ref, { read: true });
    });
    await batch.commit();
  } catch (error) {
    console.error("Failed to mark all notifications as read:", error);
  }
}
