
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PermissionLog } from '@/lib/types';
import { format } from 'date-fns';

interface HistoryEntryDialogProps {
  log: PermissionLog | null;
  isOpen: boolean;
  onClose: () => void;
}

export function HistoryEntryDialog({ log, isOpen, onClose }: HistoryEntryDialogProps) {
  if (!log) return null;

  const prettyJson = JSON.stringify({
      ...log,
      createdAt: log.createdAt.toDate().toISOString(),
  }, null, 2);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Log Entry Details</DialogTitle>
          <DialogDescription>
            Raw log data for entry ID: {log.id}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-96 bg-muted rounded-md p-4 my-4">
            <pre className="text-xs">{prettyJson}</pre>
        </ScrollArea>
        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
