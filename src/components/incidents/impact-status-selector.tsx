
'use client';

import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Incident, ImpactStatus } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { Loader2 } from 'lucide-react';

interface ImpactStatusSelectorProps {
  incident: Incident;
}

const statusOptions: ImpactStatus[] = ['low', 'medium', 'high', 'critical'];

export function ImpactStatusSelector({ incident }: ImpactStatusSelectorProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);

  const getStatusVariant = (status: ImpactStatus) => {
    switch (status) {
      case 'critical':
      case 'high':
        return 'destructive';
      case 'medium':
        return 'secondary';
      case 'low':
      default:
        return 'outline';
    }
  };

  const handleStatusChange = async (newStatus: ImpactStatus) => {
    if (!user || newStatus === incident.impactStatus) {
      return;
    }
    setIsUpdating(true);
    const incidentRef = doc(db, 'incidents', incident.id);
    const updateData = {
        impactStatus: newStatus,
        updatedAt: serverTimestamp(),
    };

    try {
      await updateDoc(incidentRef, updateData);
      toast({
          title: 'Impact Status Updated',
          description: `Incident impact changed to "${newStatus}".`,
      });
    } catch(e) {
      console.log("Firestore action allowed in dev mode. Error:", e);
      toast({
          title: 'Update Failed',
          description: 'Could not update the incident impact status.',
          variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {isUpdating && <Loader2 className="h-4 w-4 animate-spin" />}
      <Select
        value={incident.impactStatus}
        onValueChange={handleStatusChange}
        disabled={isUpdating}
      >
        <SelectTrigger className="h-8 w-auto border-none bg-transparent shadow-none focus:ring-0">
          <SelectValue>
            <Badge variant={getStatusVariant(incident.impactStatus)} className="capitalize">
              {incident.impactStatus}
            </Badge>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {statusOptions.map((status) => (
            <SelectItem key={status} value={status} className="capitalize">
              {status}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
