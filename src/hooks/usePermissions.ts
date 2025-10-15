
'use client';

import { useState, useEffect, useCallback } from 'react';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, writeBatch, serverTimestamp, getDocs, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { collections } from '@/lib/paths';
import type { Organization, User, AppPermissions } from '@/lib/types';
import { useToast } from './use-toast';
import { usePermissionHistory } from './usePermissionHistory';
import { diffPermissions } from '@/lib/perm-diff';
import { defaultPermissions } from '@/lib/permissions';

export function usePermissions() {
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();
    const { logPermissionChange } = usePermissionHistory();

    useEffect(() => {
        setIsLoading(true);
        const orgQuery = query(collection(db, collections.organizations), orderBy('name'));
        const usersQuery = query(collection(db, collections.users), orderBy('name'));

        const unsubOrgs = onSnapshot(orgQuery, (snapshot) => {
            const orgsData = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Organization));
            setOrganizations(orgsData);
        }, (err) => {
            console.error("Failed to fetch organizations:", err);
            toast({ title: "Error", description: "Could not load organizations.", variant: "destructive" });
        });

        const unsubUsers = onSnapshot(usersQuery, (snapshot) => {
            const usersData = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as User));
            setUsers(usersData);
            setIsLoading(false);
        }, (err) => {
            console.error("Failed to fetch users:", err);
            toast({ title: "Error", description: "Could not load users.", variant: "destructive" });
            setIsLoading(false);
        });

        return () => {
            unsubOrgs();
            unsubUsers();
        };
    }, [toast]);

    const updatePermission = useCallback(async (
        target: 'organization' | 'user',
        id: string,
        permissionKey: keyof Omit<AppPermissions, 'lastUpdated' | 'inheritedFromOrg'>,
        value: boolean
    ) => {
        const collectionName = target === 'organization' ? collections.organizations : collections.users;
        const docRef = doc(db, collectionName, id);
        
        const currentDoc = target === 'organization'
            ? organizations.find(o => o.id === id)
            : users.find(u => u.id === id);

        if (!currentDoc) {
            toast({ title: "Error", description: "Document not found.", variant: "destructive" });
            return;
        }

        const oldPermissions = currentDoc.permissions || defaultPermissions;
        const newPermissions = { ...oldPermissions, [permissionKey]: value };

        try {
            const updatePayload: Record<string, any> = {
                [`permissions.${permissionKey}`]: value,
                'permissions.lastUpdated': serverTimestamp(),
            };
            
            if (target === 'user') {
                updatePayload['permissions.inheritedFromOrg'] = false;
            }
            
            await updateDoc(docRef, updatePayload);

            // Log the change
            const org = target === 'organization' ? currentDoc as Organization : organizations.find(o => o.id === (currentDoc as User).organizationId);
            if (org) {
                 await logPermissionChange({
                    orgId: org.id,
                    orgName: org.name,
                    userId: target === 'user' ? currentDoc.id : null,
                    userEmail: target === 'user' ? (currentDoc as User).email : null,
                    scope: target,
                    action: 'update',
                    changed: diffPermissions(oldPermissions, newPermissions),
                });
            }

            toast({ title: "Permission Updated", description: "The change has been saved." });
        } catch (error: any) {
            console.error("Failed to update permission:", error);
            toast({ title: "Update Failed", description: error.message, variant: "destructive" });
        }
    }, [toast, logPermissionChange, organizations, users]);
    
    const applyOrgPermissionsToAllUsers = useCallback(async (org: Organization) => {
        if (!org.permissions) {
            toast({ title: "No Permissions", description: "Organization has no defined permissions to apply.", variant: "destructive" });
            return;
        }

        const batch = writeBatch(db);
        const usersQuery = query(collection(db, collections.users), where('organizationId', '==', org.id));
        
        try {
            const userSnapshots = await getDocs(usersQuery);
            userSnapshots.forEach(userDoc => {
                const userRef = doc(db, collections.users, userDoc.id);
                batch.update(userRef, {
                    'permissions.inheritedFromOrg': true,
                    'permissions.lastUpdated': serverTimestamp(),
                });
            });

            await batch.commit();

            await logPermissionChange({
                orgId: org.id,
                orgName: org.name,
                scope: 'organization',
                action: 'reset',
                changed: [{ key: 'inheritedFromOrg', from: false, to: true }], // Symbolic change
                notes: 'Applied organization defaults to all users.'
            });

            toast({ title: "Permissions Applied", description: `All users in ${org.name} now inherit organization permissions.` });
        } catch (error: any) {
             console.error("Failed to apply permissions to all users:", error);
            toast({ title: "Update Failed", description: error.message, variant: "destructive" });
        }

    }, [toast, logPermissionChange]);
    
    const resetUserToOrgDefaults = useCallback(async (user: User) => {
        const org = organizations.find(o => o.id === user.organizationId);
        if (!org) {
            toast({ title: "Error", description: "Could not find organization for this user.", variant: "destructive" });
            return;
        }
        
        const userRef = doc(db, collections.users, user.id);
        const oldPermissions = user.permissions || defaultPermissions;
        const newPermissions = { ...oldPermissions, inheritedFromOrg: true };

        try {
            await updateDoc(userRef, {
                'permissions.inheritedFromOrg': true,
                'permissions.lastUpdated': serverTimestamp(),
            });

             await logPermissionChange({
                orgId: org.id,
                orgName: org.name,
                userId: user.id,
                userEmail: user.email,
                scope: 'user',
                action: 'reset',
                changed: diffPermissions(oldPermissions, newPermissions)
            });

            toast({ title: "Permissions Reset", description: `${user.name}'s permissions have been reset to organization defaults.` });
        } catch (error: any) {
            console.error("Failed to reset user permissions:", error);
            toast({ title: "Reset Failed", description: error.message, variant: "destructive" });
        }

    }, [organizations, toast, logPermissionChange]);

    return { organizations, users, isLoading, updatePermission, applyOrgPermissionsToAllUsers, resetUserToOrgDefaults };
}
