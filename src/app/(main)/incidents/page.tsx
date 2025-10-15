

'use client';

import { useState } from 'react';
import PageHeader from '@/components/page-header';
import { IncidentCard } from '@/components/incidents/incident-card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/use-auth';
import type { Incident } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { IncidentDialog } from '@/components/incidents/incident-dialog';
import { PlusCircle } from 'lucide-react';
import { useIncidents } from '@/hooks/useIncidents';

export default function IncidentsPage() {
  const { user } = useAuth();
  const { incidents, isLoading, error } = useIncidents();

  const handleIncidentCreated = () => {
    // The useIncidents hook will automatically update the list
  };

  if (!user && !isLoading) {
    return (
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <PageHeader
          title="Incidents"
          description="You must be logged in to view incidents."
        />
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8" data-testid="incidents-page">
      <PageHeader
        title="Incidents"
        description="View all reported incidents."
      >
        <IncidentDialog onIncidentCreated={handleIncidentCreated}>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            New Incident
          </Button>
        </IncidentDialog>
      </PageHeader>
      
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-2">
                <Skeleton className="h-40 w-full" />
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-12 text-destructive border rounded-lg col-span-full">
            <p>Error loading incidents: {error.message}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {incidents.map((incident) => (
            <IncidentCard key={incident.id} incident={incident} />
          ))}
        </div>
      )}
       {!isLoading && incidents.length === 0 && (
          <div className="text-center py-12 text-muted-foreground border rounded-lg col-span-full">
              No incidents found.
          </div>
        )}
    </div>
  );
}
