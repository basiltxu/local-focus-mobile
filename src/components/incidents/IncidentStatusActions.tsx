
'use client';

import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Incident, IncidentStatus } from '@/lib/types';
import { useCurrentUserRole } from '@/hooks/useCurrentUserRole';
import { functions } from '@/lib/firebase';
import { httpsCallable } from 'firebase/functions';
import { useAuth } from '@/hooks/use-auth';

interface IncidentStatusActionsProps {
  incident: Incident;
}

const allStatuses: IncidentStatus[] = ['Draft', 'Review', 'Approved', 'Published', 'Live', 'Closed'];

export function IncidentStatusActions({ incident }: IncidentStatusActionsProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { isLFPrivileged, uid } = useCurrentUserRole();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const transitionIncidentStatus = httpsCallable(functions, 'transitionIncidentStatus');

  const handleStatusChange = async (newStatus: IncidentStatus) => {
    if (newStatus === incident.status || !user) return;

    setIsSubmitting(true);
    try {
      await transitionIncidentStatus({
        incidentId: incident.id,
        newStatus: newStatus,
        changedByName: user.name || user.email,
      });

      toast({
        title: 'Status Updated',
        description: `Incident status successfully changed to ${newStatus}.`,
      });
    } catch (error: any) {
      console.error('Failed to transition incident status:', error);
      toast({
        title: 'Update Failed',
        description: error.message || 'An error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isCreator = incident.createdBy === uid;
  const canSubmitForReview = isCreator && incident.status === 'Draft';
  const isClosed = incident.status === 'Closed';

  if (!isLFPrivileged && !canSubmitForReview) {
    return null; // Don't show the menu if there are no actions to take
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="animate-spin" /> : <MoreHorizontal />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Change Status</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {isLFPrivileged ? (
          // Admin/Editor/SuperAdmin can see all statuses
          allStatuses.map(status => (
            <DropdownMenuItem
              key={status}
              disabled={isSubmitting || isClosed || incident.status === status}
              onClick={() => handleStatusChange(status)}
            >
              {status}
            </DropdownMenuItem>
          ))
        ) : canSubmitForReview ? (
          // Creator can only move from Draft to Review
          <DropdownMenuItem
            disabled={isSubmitting}
            onClick={() => handleStatusChange('Review')}
          >
            Submit for Review
          </DropdownMenuItem>
        ) : null}

      </DropdownMenuContent>
    </DropdownMenu>
  );
}
