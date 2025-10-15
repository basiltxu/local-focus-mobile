
'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import { IncidentForm } from './incident-form';
import { ScrollArea } from '../ui/scroll-area';
import { useAuth } from '@/hooks/use-auth';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Info } from 'lucide-react';
import { IncidentStatus, Visibility } from '@/lib/types';

type IncidentDialogProps = {
  children: React.ReactNode;
  onIncidentCreated: () => void;
  defaultStatus?: IncidentStatus;
  defaultVisibility?: Visibility;
};

export function IncidentDialog({
  children,
  onIncidentCreated,
  defaultStatus,
  defaultVisibility,
}: IncidentDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { isLocalFocus, isAdmin, isEditor } = useAuth();

  const handleSuccess = () => {
    onIncidentCreated();
    setIsOpen(false);
  };
  
  const isReviewer = isLocalFocus && (isAdmin || isEditor);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl grid-rows-[auto_minmax(0,1fr)_auto] p-0 max-h-[90vh]">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>Report New Incident</DialogTitle>
          <DialogDescription>
            Fill out the details below to submit an incident.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-full">
          <div className="px-6 pb-6">
             {!isReviewer && !defaultStatus && (
              <Alert className="mb-6">
                <Info className="h-4 w-4" />
                <AlertTitle>Review Process</AlertTitle>
                <AlertDescription>
                  Your submission will be sent for review by Local Focus editors.
                </AlertDescription>
              </Alert>
            )}
            <IncidentForm 
              onSuccess={handleSuccess} 
              defaultStatus={defaultStatus}
              defaultVisibility={defaultVisibility}
            />
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
