
'use client';

import { useState, useEffect } from 'react';
import { TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { User, Organization } from '@/lib/types';
import { UserActions } from '@/components/admin/user-actions';
import { doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { organizationConverter, getDocCached } from '@/services/firestore';

interface UserRowProps {
  user: User;
  onUserUpdated: () => void;
  organizations: Organization[];
}

export function UserRow({ user, onUserUpdated, organizations }: UserRowProps) {
  const [orgName, setOrgName] = useState<string | null>(null);
  const [isLoadingOrg, setIsLoadingOrg] = useState(true);

  useEffect(() => {
    const fetchOrgName = async () => {
      if (!user.organizationId) {
        setOrgName('N/A');
        setIsLoadingOrg(false);
        return;
      }

      setIsLoadingOrg(true);
      const orgRef = doc(db, 'organizations', user.organizationId).withConverter(
        organizationConverter
      );
      const org = await getDocCached(orgRef);
      setOrgName(org?.name || 'Unknown Org');
      setIsLoadingOrg(false);
    };

    fetchOrgName();
  }, [user.organizationId]);
  
  const getRoleVariant = (role: User['role']) => {
    switch (role) {
      case 'SuperAdmin':
        return 'destructive';
      case 'Admin':
        return 'default';
      case 'Editor':
        return 'secondary';
      default:
        return 'outline';
    }
  }

  return (
    <TableRow key={user.id}>
      <TableCell className="font-medium">{user.name}</TableCell>
      <TableCell>{user.email}</TableCell>
      <TableCell>
        {isLoadingOrg ? <Skeleton className="h-4 w-24" /> : orgName}
      </TableCell>
      <TableCell>
        <Badge variant={getRoleVariant(user.role)}>
          {user.role}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        <UserActions
          user={user}
          onUserUpdated={onUserUpdated}
          organizations={organizations}
        />
      </TableCell>
    </TableRow>
  );
}
