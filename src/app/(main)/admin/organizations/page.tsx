
'use client';

import { useState, useEffect, useCallback } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Organization } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import PageHeader from '@/components/page-header';
import { OrganizationAlertCards } from '@/components/admin/organizations/OrganizationAlertCards';
import { OrganizationsTable } from '@/components/admin/organizations/OrganizationsTable';
import { useToast } from '@/hooks/use-toast';
import { collections } from '@/lib/paths';

export default function OrganizationsPage() {
  const { toast } = useToast();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchOrgs = useCallback(() => {
    const orgsQuery = query(collection(db, collections.organizations), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(orgsQuery, (snapshot) => {
      const orgsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Organization));
      setOrganizations(orgsData);
      setIsLoading(false);
    }, (error) => {
        toast({ title: 'Error', description: 'Could not load organizations.', variant: 'destructive'});
        console.error("Error fetching organizations: ", error);
        setIsLoading(false);
    });

    return unsubscribe;
  }, [toast]);
  
  useEffect(() => {
    const unsubscribe = fetchOrgs();
    return () => unsubscribe();
  }, [fetchOrgs]);

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <main className="flex-1 p-6 space-y-6">
      <PageHeader
        title="Organizations Dashboard"
        description="Monitor organization health, quotas, and status in real-time."
      />
      <OrganizationAlertCards organizations={organizations} />
      <OrganizationsTable organizations={organizations} onUpdate={fetchOrgs} />
    </main>
  );
}
