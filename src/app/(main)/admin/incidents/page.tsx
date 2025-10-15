
'use client';

import { useState } from 'react';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, PlusCircle, LayoutGrid, List, Eye } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Incident } from '@/lib/types';
import { db } from '@/lib/firebase';
import { doc, deleteDoc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/use-auth';
import PageHeader from '@/components/page-header';
import { IncidentCard } from '@/components/incidents/incident-card';
import { ImpactStatusSelector } from '@/components/incidents/impact-status-selector';
import { VisibilitySelector } from '@/components/incidents/visibility-selector';
import { useIncidents } from '@/hooks/useIncidents';
import { IncidentStatusActions } from '@/components/incidents/IncidentStatusActions';
import { IncidentStatusBadge } from '@/components/incidents/IncidentStatusBadge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { IncidentForm } from '@/components/incidents/incident-form';
import { IncidentStatusSelector } from '@/components/incidents/incident-status-selector';

type ViewMode = 'list' | 'grid';

export default function AdminIncidentsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { incidents, isLoading, error } = useIncidents();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editingIncident, setEditingIncident] = useState<Incident | null>(null);

  const handleDelete = async (incidentId: string) => {
    if (!window.confirm('Are you sure you want to delete this incident?')) {
      return;
    }
    const incidentRef = doc(db, "incidents", incidentId);
    try {
      await deleteDoc(incidentRef);
      toast({
          title: "Incident Deleted",
          description: "The incident has been removed.",
          variant: "destructive"
      });
    } catch (e) {
      console.error("Error deleting incident:", e);
       toast({
          title: 'Deletion Failed',
          description: 'Could not delete the incident.',
          variant: 'destructive',
      });
    }
  }
  
  const handleEditClick = (incident: Incident) => {
    setEditingIncident(incident);
  }

  if (!user) {
    return null;
  }

  return (
    <main className="flex-1 p-6">
       <PageHeader
        title="Manage Incidents"
        description="Review, edit, and publish all reported incidents."
      >
        <div className="flex items-center gap-2">
           <Button variant="outline" size="icon" onClick={() => setViewMode('list')} className={viewMode === 'list' ? 'bg-muted' : ''}>
              <List className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => setViewMode('grid')} className={viewMode === 'grid' ? 'bg-muted' : ''}>
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button asChild>
                <Link href="/incidents/new">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  New Incident
                </Link>
            </Button>
        </div>
      </PageHeader>
      
        {isLoading ? (
            viewMode === 'list' ? (
                <div className="border rounded-lg"><Skeleton className="h-48 w-full" /></div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="space-y-2 border rounded-lg p-4"><Skeleton className="h-40 w-full" /><Skeleton className="h-6 w-3/4" /><Skeleton className="h-4 w-1/2" /></div>
                  ))}
                </div>
            )
        ) : error ? (
            <div className="text-center py-12 text-destructive border rounded-lg col-span-full">
                <p>Error loading incidents: {error.message}</p>
            </div>
        ) : viewMode === 'list' ? (
            <div className="border rounded-lg">
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Workflow</TableHead>
                    <TableHead>Impact</TableHead>
                    <TableHead>Visibility</TableHead>
                    <TableHead>Views</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {incidents.map((incident) => (
                        <TableRow key={incident.id}>
                        <TableCell>
                            <Link href={`/incidents/${incident.id}`} className="font-medium text-primary hover:underline">
                            {incident.title}
                            </Link>
                        </TableCell>
                        <TableCell>
                            <IncidentStatusSelector incident={incident} />
                        </TableCell>
                         <TableCell>
                            <ImpactStatusSelector incident={incident} />
                        </TableCell>
                        <TableCell>
                            <VisibilitySelector incident={incident} />
                        </TableCell>
                        <TableCell>
                            {incident.visibility === 'public' ? (
                                <span className='flex items-center gap-1.5 text-sm text-muted-foreground'>
                                    <Eye className='h-4 w-4' />
                                    {incident.views || 0}
                                </span>
                             ) : (
                                 <span className='text-sm text-muted-foreground/50'>-</span>
                             )}
                        </TableCell>
                        <TableCell>
                            {incident.updatedAt ? format(incident.updatedAt.toDate(), "yyyy-MM-dd, h:mm a") : 'N/A'}
                        </TableCell>
                        <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                                <IncidentStatusActions incident={incident} />
                                <Button variant="ghost" size="icon" onClick={() => handleEditClick(incident)}>
                                  <Edit className="h-4 w-4" />
                                  <span className="sr-only">Edit</span>
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDelete(incident.id)}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                    <span className="sr-only">Delete</span>
                                </Button>
                            </div>
                        </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
                </Table>
            </div>
        ) : (
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {incidents.map((incident) => (
                <IncidentCard key={incident.id} incident={incident} showAdminActions onDelete={handleDelete} onEdit={handleEditClick}/>
              ))}
            </div>
        )}
        {!isLoading && incidents.length === 0 && (
            <div className="text-center py-12 text-muted-foreground border rounded-lg col-span-full">
                No incidents found.
            </div>
        )}
        
        {editingIncident && (
          <Sheet open={!!editingIncident} onOpenChange={(open) => !open && setEditingIncident(null)}>
            <SheetContent side="right" className="w-full sm:max-w-2xl p-0">
                <div className="flex flex-col h-full">
                    <SheetHeader className="p-6">
                      <SheetTitle>Edit Incident</SheetTitle>
                      <SheetDescription>Editing report #{editingIncident.id}</SheetDescription>
                    </SheetHeader>
                    <div className="flex-1 overflow-y-auto">
                        <div className="p-6">
                            <IncidentForm
                                incident={editingIncident}
                                onSuccess={() => {
                                setEditingIncident(null);
                                toast({ title: "✅ Incident updated successfully." });
                                }}
                            />
                        </div>
                    </div>
                </div>
            </SheetContent>
          </Sheet>
        )}
    </main>
  );
}
