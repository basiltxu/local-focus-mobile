
'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import type { Organization } from '@/lib/types';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';

interface UpgradeQuotaDialogProps {
  organization: Organization;
  onOpenChange: (open: boolean) => void;
  onQuotaUpdated: () => void;
}

export function UpgradeQuotaDialog({ organization, onOpenChange, onQuotaUpdated }: UpgradeQuotaDialogProps) {
  const { toast } = useToast();
  const [newQuota, setNewQuota] = useState(organization.maxUsers + 10);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleUpgrade = async () => {
    if (newQuota <= organization.maxUsers) {
      toast({
        title: 'Invalid Quota',
        description: 'New quota must be greater than the current quota.',
        variant: 'destructive',
      });
      return;
    }
    
    setIsSubmitting(true);
    try {
      const upgradeQuota = httpsCallable(functions, 'updateOrganizationQuota');
      await upgradeQuota({ organizationId: organization.id, newMaxUsers: newQuota });

      toast({
        title: '✅ Quota Upgraded',
        description: `${organization.name}'s user limit is now ${newQuota}.`,
      });
      onQuotaUpdated();
    } catch (error: any) {
      console.error('Error upgrading quota:', error);
      toast({
        title: '❌ Upgrade Failed',
        description: error.message || 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upgrade Quota for {organization.name}</DialogTitle>
          <DialogDescription>
            Increase the maximum number of users for this organization.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
            <div className="space-y-2">
                <Label>Current User Count</Label>
                <Input value={`${organization.currentUsers} users`} disabled />
            </div>
             <div className="space-y-2">
                <Label>Current Max Quota</Label>
                <Input value={`${organization.maxUsers} users`} disabled />
            </div>
            <div className="space-y-2">
                <Label htmlFor="new-quota">New Maximum Quota</Label>
                <Input
                    id="new-quota"
                    type="number"
                    value={newQuota}
                    onChange={(e) => setNewQuota(parseInt(e.target.value, 10))}
                    min={organization.currentUsers > organization.maxUsers ? organization.currentUsers : organization.maxUsers + 1}
                />
            </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleUpgrade} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm Upgrade
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
