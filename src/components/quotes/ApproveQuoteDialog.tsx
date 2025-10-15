
'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Building, Check, ExternalLink, ShieldAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { Quote, Organization } from '@/lib/types';
import { findExistingOrg } from '@/lib/org-dedupe';
import { useAuth } from '@/hooks/use-auth';

interface ApproveQuoteDialogProps {
  quote: Quote;
  isOpen: boolean;
  onClose: () => void;
}

export function ApproveQuoteDialog({ quote, isOpen, onClose }: ApproveQuoteDialogProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [potentialMatch, setPotentialMatch] = useState<Organization | null>(null);

  // Approval options
  const [createInvite, setCreateInvite] = useState(true);
  const [overwritePermissions, setOverwritePermissions] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const checkForDuplicates = async () => {
      setIsLoading(true);
      const match = await findExistingOrg({
        orgName: quote.orgName,
        contactEmail: quote.contactEmail,
      });
      setPotentialMatch(match);
      setIsLoading(false);
    };

    checkForDuplicates();
  }, [quote, isOpen]);

  const handleApprove = async () => {
    if (!user) {
        toast({ title: "Authentication Error", variant: "destructive" });
        return;
    }
    setIsSubmitting(true);
    try {
        const idToken = await user.getIdToken();
        const res = await fetch(`/api/quotes/${quote.id}/approve`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`,
            },
            body: JSON.stringify({
                createInvite,
                overwritePermissions,
            }),
        });

        const result = await res.json();
        if (!res.ok) {
            throw new Error(result.error || 'Failed to approve quote.');
        }

        toast({
            title: '✅ Quote Approved!',
            description: `Organization "${quote.orgName}" has been created/updated.`,
            action: (
              <div className="flex flex-col gap-2">
                <Button size="sm" onClick={() => router.push(`/admin/organizations?orgId=${result.orgId}`)}>
                  <ExternalLink className="mr-2 h-4 w-4" /> View Organization
                </Button>
                 <Button size="sm" variant="secondary" onClick={() => router.push(`/admin/permissions?orgId=${result.orgId}`)}>
                  <ExternalLink className="mr-2 h-4 w-4" /> Manage Permissions
                </Button>
              </div>
            ),
        });

        onClose();

    } catch (error: any) {
        toast({
            title: 'Approval Failed',
            description: error.message,
            variant: 'destructive',
        });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Approve Quote & Create Organization</DialogTitle>
          <DialogDescription>
            Confirm approval for "{quote.orgName}". This will create or update an organization.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 flex justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
        ) : (
          <div className="py-4 space-y-6">
            {potentialMatch && (
              <Alert variant="destructive">
                <ShieldAlert className="h-4 w-4" />
                <AlertTitle>Potential Duplicate Found!</AlertTitle>
                <AlertDescription>
                  An organization named <span className="font-bold">"{potentialMatch.name}"</span> already exists. Approving will <span className="font-bold">update</span> this existing organization.
                   <Button variant="link" size="sm" className="p-0 h-auto ml-2" onClick={() => router.push(`/admin/organizations?orgId=${potentialMatch.id}`)}>
                        View Existing
                   </Button>
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-4 rounded-md border p-4">
               <div className="flex items-center justify-between">
                <Label htmlFor="create-invite" className="flex flex-col gap-1">
                    <span>Create Org Admin Invite</span>
                    <span className="text-xs text-muted-foreground">Send an invite to {quote.contactEmail}.</span>
                </Label>
                <Switch id="create-invite" checked={createInvite} onCheckedChange={setCreateInvite} />
              </div>

               <div className="flex items-center justify-between">
                <Label htmlFor="overwrite-perms" className="flex flex-col gap-1">
                    <span>Overwrite Permissions</span>
                     <span className="text-xs text-muted-foreground">Reset permissions based on this quote.</span>
                </Label>
                <Switch id="overwrite-perms" checked={overwritePermissions} onCheckedChange={setOverwritePermissions} />
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleApprove} disabled={isLoading || isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
            {potentialMatch ? 'Approve and Update' : 'Approve and Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

