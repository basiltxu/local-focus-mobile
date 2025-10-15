
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
import { Incident, Visibility } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VisibilitySelectorProps {
  incident: Incident;
}

const visibilityOptions: Visibility[] = ['public', 'private'];

export function VisibilitySelector({ incident }: VisibilitySelectorProps) {
  const { user, isEditor } = useAuth();
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);

  const getVariant = (visibility: Visibility) => {
    switch (visibility) {
      case 'public':
        return 'default';
      case 'private':
      default:
        return 'secondary';
    }
  };

  const handleVisibilityChange = async (newVisibility: Visibility) => {
    if (!user || newVisibility === incident.visibility || !isEditor) {
      return;
    }

    setIsUpdating(true);

    const incidentRef = doc(db, 'incidents', incident.id);
    const updateData = {
        visibility: newVisibility,
        updatedBy: user.uid,
        updatedAt: serverTimestamp(),
    };

    try {
      await updateDoc(incidentRef, updateData);
      toast({
          title: 'Visibility Updated',
          description: `Incident visibility changed to "${newVisibility}".`,
      });
    } catch(e: any) {
      console.error("Error updating incident visibility:", e);
      toast({
          title: 'Update Failed',
          description: e.message || 'Could not update the incident visibility.',
          variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  if (!isEditor) {
    return <Badge variant={getVariant(incident.visibility)} className="capitalize">{incident.visibility}</Badge>;
  }

  return (
    <div className="flex items-center gap-2">
      {isUpdating && <Loader2 className="h-4 w-4 animate-spin" />}
      <Select
        value={incident.visibility}
        onValueChange={handleVisibilityChange}
        disabled={isUpdating || incident.status === 'Closed'}
      >
        <SelectTrigger className="h-8 w-auto border-none bg-transparent shadow-none focus:ring-0">
          <SelectValue>
            <Badge variant={getVariant(incident.visibility)} className="capitalize">
              {incident.visibility}
            </Badge>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {visibilityOptions.map((vis) => (
            <SelectItem key={vis} value={vis} className="capitalize">
              {vis}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

