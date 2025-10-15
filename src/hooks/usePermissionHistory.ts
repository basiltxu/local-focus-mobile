
'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  Query,
  DocumentData,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { PermissionLog } from '@/lib/types';
import { useAuth } from './use-auth';
import { collections } from '@/lib/paths';

const PAGE_SIZE = 25;

interface HistoryFilters {
  orgId?: string;
  userId?: string;
  from?: Date;
  to?: Date;
  actorEmail?: string;
  key?: string;
  scope?: string;
}

export function usePermissionHistory(filters: HistoryFilters) {
  const { user } = useAuth();
  const [logs, setLogs] = useState<PermissionLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const fetchLogs = useCallback(async (loadMore = false) => {
    if (!user || (!loadMore && isLoading)) return;

    setIsLoading(true);
    setError(null);

    try {
      let q: Query<DocumentData> = collection(db, collections.permissionLogs);

      if (filters.orgId) q = query(q, where('orgId', '==', filters.orgId));
      if (filters.userId) q = query(q, where('userId', '==', filters.userId));
      if (filters.from) q = query(q, where('createdAt', '>=', filters.from));
      if (filters.to) q = query(q, where('createdAt', '<=', filters.to));
      if (filters.actorEmail) q = query(q, where('actorEmail', '==', filters.actorEmail));
      if (filters.key) q = query(q, where('keys', 'array-contains', filters.key));
      if (filters.scope) q = query(q, where('scope', '==', filters.scope));

      q = query(q, orderBy('createdAt', 'desc'), limit(PAGE_SIZE));

      if (loadMore && lastDoc) {
        q = query(q, startAfter(lastDoc));
      }

      const snapshot = await getDocs(q);
      const newLogs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PermissionLog));

      setLogs(prev => loadMore ? [...prev, ...newLogs] : newLogs);
      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(snapshot.docs.length === PAGE_SIZE);

    } catch (err: any) {
      console.error("Error fetching permission history:", err);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [user, filters, lastDoc, isLoading]);
  
  useEffect(() => {
    // Reset and fetch when filters change
    setLastDoc(null);
    setHasMore(true);
    fetchLogs(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const loadMore = () => {
    if (hasMore && !isLoading) {
      fetchLogs(true);
    }
  };

  const logPermissionChange = useCallback(async (
    logData: Omit<PermissionLog, 'id' | 'actorId' | 'actorEmail' | 'createdAt' | 'keys'>
  ) => {
    if (!user) return; // Should be handled by caller, but as a safeguard.
    
    // This is a client-side implementation. Ideally, this would call a secure API route.
    try {
        const res = await fetch('/api/permissions/log', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${await user.getIdToken()}`,
            },
            body: JSON.stringify(logData)
        });

        if (!res.ok) {
            const errorBody = await res.json();
            throw new Error(errorBody.error || 'Failed to log permission change.');
        }
    } catch (error) {
      console.error('Failed to log permission change:', error);
      // Optionally show a toast to the admin
    }
  }, [user]);

  return { logs, isLoading, error, hasMore, loadMore, logPermissionChange };
}
