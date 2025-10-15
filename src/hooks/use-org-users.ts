
'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from './use-auth';
import type { User, Organization } from '@/lib/types';
import { collections } from '@/lib/paths';
import { isLFPrivileged } from '@/lib/chat-utils';

const LOCAL_FOCUS_ORG_ID = 'LOCAL_FOCUS_ORG_ID';

/**
 * Fetches users and organizations based on the current user's role.
 * - LF Privileged users get all users and all orgs.
 * - External users get their own org's users and all LF privileged users.
 */
export function useOrgUsers() {
  const { user } = useAuth();
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [myOrgUsers, setMyOrgUsers] = useState<User[]>([]);
  const [lfUsers, setLfUsers] = useState<User[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const isPrivileged = isLFPrivileged(user);
    const usersRef = collection(db, collections.users);
    
    // Determine which users to query
    let usersQuery;
    if (isPrivileged) {
        usersQuery = query(usersRef, where('isActive', '==', true));
    } else {
        // Query for users in my org OR users in Local Focus org
        usersQuery = query(
            usersRef,
            where('isActive', '==', true),
            where('organizationId', 'in', [user.organizationId, LOCAL_FOCUS_ORG_ID])
        );
    }

    const unsubUsers = onSnapshot(usersQuery, (snapshot) => {
      const fetchedUsers = snapshot.docs.map(doc => doc.data() as User);
      setAllUsers(fetchedUsers);
      
      if (isPrivileged) {
          setMyOrgUsers(fetchedUsers.filter(u => u.organizationId === LOCAL_FOCUS_ORG_ID));
          setLfUsers([]); // They are the LF users
      } else {
          setMyOrgUsers(fetchedUsers.filter(u => u.organizationId === user.organizationId));
          setLfUsers(fetchedUsers.filter(u => u.organizationId === LOCAL_FOCUS_ORG_ID));
      }

      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching users for chat:", error);
      setIsLoading(false);
    });
    
    // Fetch organizations
    const orgsQuery = query(collection(db, collections.organizations));
    const unsubOrgs = onSnapshot(orgsQuery, (snapshot) => {
        setOrganizations(snapshot.docs.map(doc => ({id: doc.id, ...doc.data()} as Organization)));
    });


    return () => {
      unsubUsers();
      unsubOrgs();
    };
  }, [user]);

  return { 
      allUsers,       // All users visible to current user
      myOrgUsers,     // Users in current user's org
      lfUsers,        // Local Focus users (for external orgs)
      organizations, 
      isLoading 
  };
}
