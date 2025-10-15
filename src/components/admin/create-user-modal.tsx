
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
import { useToast } from '@/hooks/use-toast';
import type { Role, Organization } from '@/lib/types';
import { PlusCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { sendInvite } from '@/app/actions/send-invite';

export function CreateUserModal({
  organizations,
  defaultOrgId,
  onUserAdded,
  disabled,
  hasOrgAdmin,
}: {
  organizations: (Pick<Organization, 'id' | 'name' | 'type' >)[];
  defaultOrgId?: string;
  onUserAdded: () => void;
  disabled?: boolean;
  hasOrgAdmin?: boolean;
}) {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [orgId, setOrgId] = useState(defaultOrgId || '');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('User');
  const [isLoading, setIsLoading] = useState(false);
  
  const resetForm = () => {
    setOrgId(defaultOrgId || organizations[0]?.id || '');
    setDisplayName('');
    setEmail('');
    setRole(organizations.find(o => o.id === (defaultOrgId || organizations[0]?.id))?.type === 'core' ? 'User' : 'User');
  };

  const handleOpen = () => {
    resetForm();
    setOpen(true);
  }

  const handleCreate = async () => {
    if (!orgId || !displayName || !email || !currentUser) {
      toast({
        title: 'Missing Fields',
        description: 'Organization, name and email are required.',
        variant: 'destructive',
      });
      return;
    }
    setIsLoading(true);

    const result = await sendInvite({
      email,
      displayName,
      organizationId: orgId,
      role,
    });
    
    if (result.success) {
        const orgName = organizations.find(o => o.id === orgId)?.name || 'the organization';
        toast({
            title: '✅ Invite Sent',
            description: result.message || `An invitation email has been sent to ${email} for ${orgName}.`,
        });
        setOpen(false);
        onUserAdded();
    } else {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }

    setIsLoading(false);
  };

  const selectedOrg = organizations.find(o => o.id === orgId);
  const isExternalOrg = selectedOrg?.type === 'external';

  const availableRoles = () => {
      if (isExternalOrg) {
          const roles: {value: Role, label: string, disabled?: boolean}[] = [
              { value: 'User', label: 'User' },
              { value: 'orgAdmin', label: 'Org Admin', disabled: hasOrgAdmin },
          ];
          return roles;
      }
      return [
          { value: 'User', label: 'User' },
          { value: 'Editor', label: 'Editor' },
          { value: 'Admin', label: 'Admin' },
          { value: 'SuperAdmin', label: 'Super Admin' },
      ];
  }

  return (
    <>
      <Button onClick={handleOpen} disabled={disabled}>
        <PlusCircle className="mr-2 h-4 w-4" /> Invite User
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite New User</DialogTitle>
             <DialogDescription>
                An invitation email with a link to set their password will be sent.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <label className="text-sm font-medium">Organization</label>
            <select
              className="border rounded px-2 py-2 w-full bg-background"
              value={orgId}
              onChange={(e) => {
                setOrgId(e.target.value);
                // Reset role when org changes
                const newOrg = organizations.find(o => o.id === e.target.value);
                setRole(newOrg?.type === 'external' ? 'User' : 'User');
              }}
            >
              <option value="" disabled>Select Organization</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
            
            <label className="text-sm font-medium">Full Name</label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="User's full name"
            />
            
            <label className="text-sm font-medium">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@email.com"
            />
            
            <label className="text-sm font-medium">Role</label>
            <select
              className="border rounded px-2 py-2 w-full bg-background"
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              disabled={!orgId}
            >
              {availableRoles().map(r => (
                  <option key={r.value} value={r.value} disabled={r.disabled}>
                      {r.label} {r.disabled && '(already assigned)'}
                  </option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
              Send Invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
