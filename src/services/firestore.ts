
/**
 * @fileoverview
 * This file provides a centralized, type-safe service layer for interacting with Firestore.
 * It includes:
 * - FirestoreDataConverter instances for each major data model to ensure type safety.
 * - A simple in-memory cache for document reads to reduce redundant fetches.
 * - Helper functions for common operations like paginated queries and real-time subscriptions.
 * - Automatic normalization for Firestore Timestamps into JS Date objects.
 */

import {
  doc,
  getDoc,
  collection,
  query,
  getDocs,
  orderBy,
  limit,
  startAfter,
  onSnapshot,
  DocumentReference,
  Query,
  QueryDocumentSnapshot,
  FirestoreDataConverter,
  Timestamp,
  WithFieldValue,
  DocumentData,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  User,
  Organization,
  Incident,
  Report,
  Chat,
  Notification,
  Category,
  SubCategory,
} from '@/lib/types';

// A simple in-memory cache for documents.
const docCache = new Map<string, any>();

/**
 * Normalizes Firestore Timestamps to JavaScript Date objects.
 * @param data The Firestore document data.
 * @returns The data with Timestamps converted to Dates.
 */
function normalizeTimestamps<T>(data: WithFieldValue<T>): T {
  const normalizedData: any = { ...data };
  for (const key in normalizedData) {
    if (normalizedData[key] instanceof Timestamp) {
      normalizedData[key] = normalizedData[key].toDate();
    }
  }
  return normalizedData as T;
}

/**
 * Creates a FirestoreDataConverter for a given type.
 * @template T The type of the document data.
 * @returns A FirestoreDataConverter for the specified type.
 */
function createConverter<T>(): FirestoreDataConverter<T> {
  return {
    toFirestore: (data: WithFieldValue<T>): DocumentData => {
      // Note: We are not converting JS Dates back to Timestamps on write
      // because we exclusively use serverTimestamp() for setting dates.
      return data as DocumentData;
    },
    fromFirestore: (snapshot, options): T => {
      const data = snapshot.data(options);
      // Add the document ID to the data object
      return { ...normalizeTimestamps(data as WithFieldValue<T>), id: snapshot.id };
    },
  };
}

// Typed converters for all our models
export const userConverter = createConverter<User>();
export const organizationConverter = createConverter<Organization>();
export const incidentConverter = createConverter<Incident>();
export const reportConverter = createConverter<Report>();
export const chatConverter = createConverter<Chat>();
export const notificationConverter = createConverter<Notification>();
export const categoryConverter = createConverter<Category>();
export const subCategoryConverter = createConverter<SubCategory>();

/**
 * Fetches a single document from Firestore, using an in-memory cache.
 * @template T The type of the document.
 * @param ref A DocumentReference for the document to fetch.
 * @returns The document data or null if it doesn't exist.
 */
export async function getDocCached<T>(ref: DocumentReference<T>): Promise<T | null> {
  const path = ref.path;
  if (docCache.has(path)) {
    return docCache.get(path) as T;
  }

  try {
    const docSnap = await getDoc(ref);
    if (docSnap.exists()) {
      const data = docSnap.data();
      docCache.set(path, data);
      return data;
    }
    return null;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[getDocCached] Error fetching doc at ${path}:`, error);
    }
    return null;
  }
}

/**
 * Fetches a paginated list of documents from a collection.
 * @template T The type of the documents in the collection.
 * @param q The Firestore Query to execute.
 * @param pageSize The number of items to fetch per page.
 * @param cursor The starting point for the query (the last document from the previous page).
 * @returns An object containing the fetched items and the last document snapshot for the next page's cursor.
 */
export async function getCollectionPaginated<T>(
  q: Query<T>,
  pageSize: number,
  cursor?: QueryDocumentSnapshot<T>
) {
  let paginatedQuery = query(q, limit(pageSize));
  if (cursor) {
    paginatedQuery = query(paginatedQuery, startAfter(cursor));
  }

  try {
    const querySnapshot = await getDocs(paginatedQuery);
    const items = querySnapshot.docs.map(doc => doc.data());
    const lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];

    return {
      items,
      last: lastVisible,
    };
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[getCollectionPaginated] Error executing query:`, error);
    }
    return { items: [], last: undefined };
  }
}

/**
 * Subscribes to real-time updates for a Firestore query.
 * @template T The type of the documents.
 * @param q The Firestore Query to listen to.
 * @param cb The callback function to execute with the updated data.
 * @returns An Unsubscribe function to stop listening for updates.
 */
export function subscribe<T>(
  q: Query<T>,
  cb: (items: T[]) => void
): Unsubscribe {
  const unsubscribe = onSnapshot(
    q,
    (querySnapshot) => {
      const items = querySnapshot.docs.map(doc => doc.data());
      cb(items);
    },
    (error) => {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`[subscribe] Error listening to query:`, error);
      }
    }
  );
  return unsubscribe;
}
