
'use client';

import { AuthContext } from '@/hooks/use-auth';
import { onAuthStateChanged, getAuth, User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot, serverTimestamp, setDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { User } from '@/lib/types';
import { useEffect, useMemo, useState } from 'react';
import { getDatabase, ref, onValue, set, onDisconnect, serverTimestamp as rtdbServerTimestamp } from "firebase/database";

const LOCAL_FOCUS_ORG_ID = "LOCAL_FOCUS_ORG_ID";
const SUPER_ADMIN_EMAIL = "basil.khoury14@gmail.com";

// This is the real AuthProvider for production.
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth();
    const rtdb = getDatabase();

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
        if (firebaseUser) {
            const userDocRef = doc(db, 'users', firebaseUser.uid);

            // --- Failsafe for Super Admin ---
            if (firebaseUser.email === SUPER_ADMIN_EMAIL) {
                const superAdminData = {
                    uid: firebaseUser.uid,
                    email: SUPER_ADMIN_EMAIL,
                    name: firebaseUser.displayName || 'Basil Khoury',
                    role: 'SuperAdmin',
                    organizationId: LOCAL_FOCUS_ORG_ID,
                    status: 'active',
                    isActive: true,
                    updatedAt: serverTimestamp(),
                };
                // Check if doc exists to add createdAt only once
                const docSnap = await getDoc(userDocRef);
                if (!docSnap.exists()) {
                    superAdminData.createdAt = serverTimestamp();
                }
                
                await setDoc(userDocRef, superAdminData, { merge: true });
                console.log("✅ Super Admin (Basil) reactivated successfully.");
            }
            
            // --- Presence Management ---
            const userStatusDatabaseRef = ref(rtdb, '/status/' + firebaseUser.uid);
            const isOfflineForDatabase = {
                state: 'offline',
                last_changed: rtdbServerTimestamp(),
            };
            const isOnlineForDatabase = {
                state: 'online',
                last_changed: rtdbServerTimestamp(),
            };

            const connectedRef = ref(rtdb, '.info/connected');
            onValue(connectedRef, (snap) => {
                if (snap.val() === true) {
                    onDisconnect(userStatusDatabaseRef).set(isOfflineForDatabase).then(() => {
                        set(userStatusDatabaseRef, isOnlineForDatabase);
                    });
                }
            });
            // --- End Presence Management ---

            const unsubscribeFirestore = onSnapshot(userDocRef, (userDocSnap) => {
                 if (userDocSnap.exists()) {
                    const userData = { id: userDocSnap.id, ...userDocSnap.data() } as User;
                    // Force super admin role in context if email matches, regardless of what's in Firestore
                    if(userData.email === SUPER_ADMIN_EMAIL) {
                        userData.role = 'SuperAdmin';
                        userData.isActive = true;
                        userData.status = 'active';
                        userData.organizationId = LOCAL_FOCUS_ORG_ID;
                    }

                    if(userData.isActive) {
                        setUser(userData);
                    } else {
                        // User is not active, treat as logged out
                        setUser(null);
                    }
                } else {
                    console.log(`No user document found for UID: ${firebaseUser.uid}. This might happen during initial seeding or if the user is not yet activated.`);
                    setUser(null);
                }
                setIsLoading(false);
            }, (error) => {
                console.error("Error listening to user document:", error);
                setUser(null);
                setIsLoading(false);
            });
            return () => unsubscribeFirestore();
        } else {
            setUser(null);
            setIsLoading(false);
        }
    });

    return () => unsubscribeAuth();
  }, []);

  const value = useMemo(() => {
    const isSuperAdminByEmail = user?.email === SUPER_ADMIN_EMAIL;
    const isLocalFocus = user?.organizationId === LOCAL_FOCUS_ORG_ID;
    const isSuperAdmin = (user?.role === 'SuperAdmin' && isLocalFocus) || isSuperAdminByEmail;
    const isAdmin = user?.role === 'Admin' && isLocalFocus;
    const isEditor = user?.role === 'Editor' && isLocalFocus;
    const isOrgAdmin = user?.role === 'orgAdmin' && !isLocalFocus;
    
    return {
        user,
        isLoading,
        isLocalFocus,
        isSuperAdmin,
        isAdmin: isSuperAdmin || isAdmin, // Combined for simplicity
        isEditor: isSuperAdmin || isAdmin || isEditor,
        isOrgAdmin,
    };
  }, [user, isLoading]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
