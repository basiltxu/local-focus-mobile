'use client';

import { AdminSeedButton } from '@/components/admin/AdminSeedButton';
import { LocationSeedButton } from '@/components/admin/LocationSeedButton';
import { useAuth } from '@/hooks/use-auth';
import { Loader2 } from 'lucide-react';
import PageHeader from '@/components/page-header';
import { LocalFocusOrgSeedButton } from '@/components/admin/LocalFocusOrgSeedButton';
import { CategorySeedButton } from '@/components/admin/CategorySeedButton';

export default function SeederPage() {
  const { isLoading, isSuperAdmin } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isSuperAdmin) {
      return (
          <main className="flex-1 p-6">
            <PageHeader 
                title="Database Seed"
                description="Access denied."
            />
            <p>You must be a SuperAdmin to access these tools.</p>
          </main>
      )
  }

  return (
    <main className="flex-1 p-6">
      <PageHeader 
        title="Database Seed"
        description="Run scripts to populate the database with core and location data. For initial setup and updates."
      />

      <div className="grid gap-6">
        <AdminSeedButton />
        <LocalFocusOrgSeedButton />
        <CategorySeedButton />
        <LocationSeedButton />
      </div>
    </main>
  );
}
