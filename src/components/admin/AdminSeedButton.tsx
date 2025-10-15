
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import {
  writeBatch,
  doc,
  serverTimestamp,
  collection,
  getDoc,
  query,
  where,
  getDocs,
  setDoc,
  DocumentReference,
} from 'firebase/firestore';
import { useAuth } from '@/hooks/use-auth';
import { Loader2, ShieldAlert } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Organization, User, AccessRights } from '@/lib/types';
import { getAuth, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { collections } from '@/lib/paths';


// ✅ Static constants
const SUPER_ADMIN_EMAIL = 'basil.khoury14@gmail.com';
const ADMIN_EMAIL = 'info@localfocus.ps';
const LOCAL_FOCUS_ORG_ID = 'LOCAL_FOCUS_ORG_ID'; // Fixed ID

// ✅ Default access permissions
const DEFAULT_ACCESS_RIGHTS: AccessRights = {
  canViewPublicIncidents: true,
  canViewWeeklyReports: true,
  canViewMonthlyReports: true,
  canViewAiReports: true,
};

// ✅ Firestore-safe overrides
const DEFAULT_OVERRIDES: Partial<AccessRights> = {};

// ✅ Remove undefined before Firestore writes
const cleanData = (obj: any) =>
  Object.fromEntries(Object.entries(obj).filter(([_, v]) => v !== undefined));


export function AdminSeedButton() {
  const { toast } = useToast();
  const router = useRouter();
  const { user, isSuperAdmin } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const getTimestamp = () => {
    const now = new Date();
    return `[${now.getHours().toString().padStart(2, '0')}:${now
      .getMinutes()
      .toString()
      .padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}]`;
  };

  const log = (message: string) => {
    const timed = `${getTimestamp()} ${message}`;
    setLogs((prev) => [...prev, timed]);
    console.log(timed);
  };

  const generateRandomPassword = () =>
    Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-4);

  const handleSeedDatabase = async () => {
    if (!user || !isSuperAdmin) {
      toast({
        title: '⛔ Unauthorized',
        description: 'Only the Super Admin can run the seeder.',
        variant: 'destructive',
      });
      return;
    }
    
    // Explicit check for the Super Admin email for this specific action
    if (user.email !== SUPER_ADMIN_EMAIL) {
         toast({
            title: '⛔ Unauthorized',
            description: 'This seeding operation is restricted to the primary Super Admin account.',
            variant: 'destructive',
        });
        return;
    }

    setIsLoading(true);
    setLogs([]);
    const auth = getAuth();
    const batch = writeBatch(db);

    let createdCount = 0;
    let updatedCount = 0;
    let orgRightsCount = 0;
    let userOverridesCount = 0;

    const addToBatch = (ref: DocumentReference, data: any) => {
      const cleaned = cleanData(data);
      batch.set(ref, cleaned, { merge: true });
    };

    try {
      log('🚀 Starting Admin Seeder...');

      // 1️⃣ Organization setup (uses LOCAL_FOCUS_ORG_ID)
      const orgRef = doc(db, collections.organizations, LOCAL_FOCUS_ORG_ID);
      const orgSnap = await getDoc(orgRef).catch(e => { throw e });

      const orgData: Partial<Organization> = {
        name: 'Local Focus',
        domainEmail: 'localfocus.ps',
        type: 'core',
        isActive: true,
        createdBy: user?.uid || 'system',
        createdAt: orgSnap.exists() ? orgSnap.data().createdAt : serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      if (!orgSnap.exists() || !orgSnap.data().accessRights) {
        orgData.accessRights = DEFAULT_ACCESS_RIGHTS;
        orgRightsCount++;
        log(`✅ Added default accessRights to Local Focus organization.`);
      } else {
        log(`ℹ️ Skipped access rights for Local Focus - already exists.`);
      }

      addToBatch(orgRef, orgData);
      orgSnap.exists()
        ? (updatedCount++, log('✅ Local Focus organization queued for update.'))
        : (createdCount++, log('✅ Local Focus organization queued for creation.'));

      // 2️⃣ Seed Users
      const processUser = async (email: string, name: string, role: User['role']) => {
        const qUsers = query(collection(db, collections.users), where('email', '==', email));
        const userSnap = await getDocs(qUsers).catch(e => { throw e });

        let uid: string | undefined;
        let existingUserDoc: User | null = null;

        if (!userSnap.empty) {
          const docSnap = userSnap.docs[0];
          uid = docSnap.id;
          existingUserDoc = docSnap.data() as User;
          updatedCount++;
          log(`ℹ️ Firestore user for ${email} already exists.`);
        } else {
          try {
            const pwd = generateRandomPassword();
            const cred = await createUserWithEmailAndPassword(auth, email, pwd);
            uid = cred.user.uid;
            createdCount++;
            log(`✅ Created Auth user for ${role}: ${email}`);
            await sendPasswordResetEmail(auth, email);
            log(`📨 Password reset email sent to ${email}.`);
          } catch (e: any) {
            if (e.code === 'auth/email-already-in-use') {
              log(`⚠️ ${email} exists in Auth but no Firestore doc found. Skipping.`);
              return;
            }
            throw e;
          }
        }

        if (uid) {
          const isSuper = role === 'SuperAdmin';
          const isAdmin = role === 'Admin';
          const userRef = doc(db, collections.users, uid);

          const userData: Partial<User> = {
            uid,
            email,
            name,
            role,
            organizationId: LOCAL_FOCUS_ORG_ID,
            status: 'active',
            isActive: true,
            editorCanModerate: isSuper || isAdmin,
            canManageUsers: isSuper || isAdmin,
            canEditIncidents: true,
            canEditReports: true,
            canManageCategories: isSuper || isAdmin,
            canGenerateAiReports: isSuper || isAdmin,
            canViewWeeklyReports: true,
            canViewMonthlyReports: true,
            canViewLocationAnalytics: true,
            updatedAt: serverTimestamp(),
          };

          if (!existingUserDoc) userData.createdAt = serverTimestamp();

          if (!existingUserDoc || existingUserDoc.overrides === undefined) {
            userData.overrides = DEFAULT_OVERRIDES;
            userOverridesCount++;
            log(`✅ Added default overrides to ${email}.`);
          } else {
            log(`ℹ️ Skipped overrides for ${email} - already exists.`);
          }

          addToBatch(userRef, userData);
          log(`✅ ${role} Firestore doc queued: ${email}`);
        }
      };

      await processUser(SUPER_ADMIN_EMAIL, 'Basil Khoury', 'SuperAdmin');
      await processUser(ADMIN_EMAIL, 'Local Focus Admin', 'Admin');

      log('--- Committing Batch Write ---');
      await batch.commit().catch(e => { throw e });
      log('--- ✅ Batch Commit Successful ---');
      
      toast({
        title: '✅ Seeder Completed!',
        description: `Created ${createdCount}, Updated ${updatedCount}, Added rights for ${orgRightsCount} orgs, Added overrides for ${userOverridesCount} users.`,
        duration: 4000,
      });

      log(`🎯 Seeder complete: ${createdCount} created, ${updatedCount} updated, ${orgRightsCount} rights added, ${userOverridesCount} overrides added.`);
      log('🔁 Redirecting to /dashboard ...');

      // 🚀 Redirect after short delay
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);

    } catch (error: any) {
      console.error(`❌ Seeding Failed: ${error.message}`, error);
      log(`❌ Seeding Failed: ${error.message}`);
      toast({
        title: 'Seeding Failed',
        description: error.message || 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <Card>
      <CardHeader>
        <CardTitle>Seed Core Database</CardTitle>
        <CardDescription>
          Initializes the Local Focus organization and admin users.
          Only the Super Admin can execute this seeding operation.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!isSuperAdmin && (
          <Alert variant="destructive" className="mb-6">
            <AlertTitle className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4" /> Access Restricted
            </AlertTitle>
            <AlertDescription>
              Only a Super Admin can run this seeder.
            </AlertDescription>
          </Alert>
        )}

        <Button onClick={handleSeedDatabase} disabled={isLoading || !isSuperAdmin || user?.email !== SUPER_ADMIN_EMAIL}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isLoading ? 'Seeding Core Data…' : 'Run Core Seeder'}
        </Button>

        {logs.length > 0 && (
          <div className="mt-4 p-4 bg-muted rounded-md text-xs font-mono max-h-48 overflow-y-auto">
            {logs.map((logMsg, i) => (
              <p key={i}>{logMsg}</p>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
