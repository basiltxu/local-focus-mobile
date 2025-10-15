
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/hooks/use-auth';
import { Loader2 } from 'lucide-react';
import { collections } from '@/lib/paths';

const LOCAL_FOCUS_ORG_ID = 'LOCAL_FOCUS_ORG_ID';

export function LocalFocusOrgSeedButton() {
  const { toast } = useToast();
  const { user, isSuperAdmin } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const log = (message: string) => {
    const timed = `[${new Date().toLocaleTimeString()}] ${message}`;
    setLogs((prev) => [...prev, timed]);
    console.log(timed);
  };

  const handleSeed = async () => {
    if (!user || !isSuperAdmin) {
      toast({
        title: '⛔ Unauthorized',
        description: 'Only a Super Admin can run this seeder.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setLogs([]);
    log('🚀 Starting Local Focus Org Seeder...');

    const orgRef = doc(db, collections.organizations, LOCAL_FOCUS_ORG_ID);
    const organizationData = {
      name: 'Local Focus',
      domain: 'localfocus.ps',
      domainEmail: 'localfocus.ps',
      isActive: true,
      type: 'core',
      createdBy: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      accessRights: {
        canViewAiReports: true,
        canViewMonthlyReports: true,
        canViewPublicIncidents: true,
        canViewWeeklyReports: true,
      },
    };

    try {
      await setDoc(orgRef, organizationData, { merge: true });
      log(`✅ Local Focus organization seeded successfully in document: ${LOCAL_FOCUS_ORG_ID}`);
      toast({
        title: '✅ Success!',
        description: 'Local Focus organization document has been created or updated.',
      });
    } catch (error: any) {
      log(`❌ Error seeding Local Focus organization: ${error.message}`);
      console.error("Error seeding org:", error);
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
        <CardTitle>Seed Local Focus Organization</CardTitle>
        <CardDescription>
          Creates or updates the single document for the Local Focus organization.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={handleSeed} disabled={isLoading || !isSuperAdmin}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isLoading ? 'Seeding Org...' : 'Run Local Focus Org Seeder'}
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
