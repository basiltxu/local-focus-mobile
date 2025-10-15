

'use client';

import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { IncidentStatusBadge } from '@/components/incidents/IncidentStatusBadge';
import { doc, updateDoc, serverTimestamp, arrayUnion, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Incident, IncidentStatus } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCurrentUserRole } from '@/hooks/useCurrentUserRole';

interface IncidentStatusSelectorProps {
  incident: Incident;
}

const statusOptions: IncidentStatus[] = ['Draft', 'Review', 'Approved', 'Published', 'Live', 'Closed'];

export function IncidentStatusSelector({ incident }: IncidentStatusSelectorProps) {
  const { user } = useAuth();
  const { isLFPrivileged } = useCurrentUserRole();
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);

  const handleStatusChange = async (newStatus: IncidentStatus) => {
    if (!user || newStatus === incident.status || !isLFPrivileged) {
      return;
    }
    setIsUpdating(true);
    // In a real app, this should call the `transitionIncidentStatus` Cloud Function
    // For now, we simulate the client-side part of this action.
    const incidentRef = doc(db, 'incidents', incident.id);

    const statusHistoryEntry = {
      previousStatus: incident.status,
      newStatus: newStatus,
      changedBy: user.uid,
      changedByName: user.name || user.email,
      changedAt: Timestamp.now(),
    };

    const updateData: any = {
        status: newStatus,
        updatedBy: user.uid,
        updatedAt: serverTimestamp(),
        statusHistory: arrayUnion(statusHistoryEntry),
    };
    
    if (newStatus === 'Published' || newStatus === 'Live') {
        updateData.visibility = 'public';
        if (incident.status !== 'Published' && incident.status !== 'Live') {
            updateData.publishedBy = user.uid;
            updateData.publishedAt = serverTimestamp();
        }
    } else if (newStatus === 'Approved' && incident.status !== 'Approved') {
        updateData.approvedBy = user.uid;
        updateData.approvedAt = serverTimestamp();
    }


    try {
      await updateDoc(incidentRef, updateData);
      toast({
        title: 'Status Updated',
        description: `Incident status changed to "${newStatus}".`,
      });
    } catch (e: any) {
      console.error("Error updating incident status:", e);
      toast({
        title: 'Update Failed',
        description: e.message || 'Could not update the incident status.',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  if (!isLFPrivileged) {
    return <IncidentStatusBadge status={incident.status} />;
  }

  return (
    <div className="flex items-center gap-2">
      {isUpdating && <Loader2 className="h-4 w-4 animate-spin" />}
      <Select
        value={incident.status}
        onValueChange={handleStatusChange}
        disabled={isUpdating || incident.status === 'Closed'}
      >
        <SelectTrigger className="h-8 w-auto border-none bg-transparent shadow-none focus:ring-0">
          <SelectValue>
             <IncidentStatusBadge status={incident.status} />
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {statusOptions.map((status) => (
            <SelectItem key={status} value={status} className="capitalize" disabled={
                // No one can edit a closed incident
                incident.status === 'Closed'
            }>
              {status}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
