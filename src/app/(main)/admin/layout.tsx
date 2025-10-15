
'use client';

import { useAuth } from '@/hooks/use-auth';
import { Loader2 } from 'lucide-react';

export default function AdminAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoading, isAdmin, isEditor } = useAuth();

  if(isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // This top-level check is simplified because the main layout
  // already prevents non-admin/editors from seeing the admin links.
  if (!isAdmin && !isEditor) {
     return (
      <main className="flex-1 p-6">
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p>You do not have permission to view this section.</p>
      </main>
    );
  }

  return <>{children}</>;
}
