'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { User } from '@/lib/types';
import { Clock, Mail } from 'lucide-react';

interface InvitationsTableProps {
  invitations: User[];
}

export function InvitationsTable({ invitations }: InvitationsTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <Clock />
            Pending Invitations
        </CardTitle>
        <CardDescription>
          These users have been invited but have not yet activated their accounts.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Invited</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invitations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                  No pending invitations.
                </TableCell>
              </TableRow>
            ) : (
              invitations.map((invite) => (
                <TableRow key={invite.id}>
                  <TableCell>
                    <div className="font-medium">{invite.displayName}</div>
                    <div className="text-xs text-muted-foreground">{invite.email}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{invite.role}</Badge>
                  </TableCell>
                  <TableCell>
                     <Badge variant="outline" className="capitalize">
                        {invite.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {invite.invitedAt ? formatDistanceToNow(invite.invitedAt.toDate(), { addSuffix: true }) : 'N/A'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
