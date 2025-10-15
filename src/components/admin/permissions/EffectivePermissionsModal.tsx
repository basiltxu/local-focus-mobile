
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { User, Organization, AppPermissions } from '@/lib/types';
import { ALL_PERMISSIONS, getEffectivePermissions } from '@/lib/permissions';
import { CheckCircle2, XCircle, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface EffectivePermissionsModalProps {
  user: User;
  organization: Organization;
  isOpen: boolean;
  onClose: () => void;
}

const formatPermissionName = (name: string) => {
    return name.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
};

export function EffectivePermissionsModal({ user, organization, isOpen, onClose }: EffectivePermissionsModalProps) {
  const effectivePerms = getEffectivePermissions(user, organization);
  const orgPerms = organization.permissions || {};
  const userPerms = user.permissions;

  const getPermissionSource = (key: keyof AppPermissions) => {
    if (userPerms && userPerms.inheritedFromOrg === false && userPerms[key] !== undefined) {
      return 'User Override';
    }
    return 'Organization Default';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Effective Permissions for {user.name}</DialogTitle>
          <DialogDescription>
            This shows the final combined permissions for the user, including overrides.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
            <div className="flex justify-between items-center bg-muted p-3 rounded-lg">
                <div>
                    <p className="font-semibold">{user.name}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
                <div className="text-right">
                    <p className="font-semibold">{organization.name}</p>
                    <p className="text-sm text-muted-foreground">Organization</p>
                </div>
            </div>
             <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Permission</TableHead>
                        <TableHead className="text-center">Effective Status</TableHead>
                        <TableHead>Source</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {ALL_PERMISSIONS.map(key => {
                        const isEnabled = effectivePerms[key] ?? false;
                        const source = getPermissionSource(key);
                        const isOverride = source === 'User Override';
                        return (
                             <TableRow key={key}>
                                <TableCell className="font-medium">{formatPermissionName(key)}</TableCell>
                                <TableCell className="text-center">
                                    {isEnabled ? <CheckCircle2 className="h-5 w-5 text-green-500 inline-block" /> : <XCircle className="h-5 w-5 text-red-500 inline-block" />}
                                </TableCell>
                                 <TableCell>
                                    <Badge variant={isOverride ? 'default' : 'outline'} className={cn(isOverride && "bg-blue-500 hover:bg-blue-600")}>
                                        {isOverride && <Settings className="mr-1 h-3 w-3" />}
                                        {source}
                                    </Badge>
                                 </TableCell>
                            </TableRow>
                        )
                    })}
                </TableBody>
             </Table>
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
