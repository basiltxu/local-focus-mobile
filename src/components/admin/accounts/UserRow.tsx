
'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { User, Role } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { UserCheck, UserX, Mail, Loader2, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { addDoc, collection, doc, serverTimestamp, updateDoc, deleteDoc } from 'firebase/firestore';
import { collections } from '@/lib/paths';
import { db, functions } from '@/lib/firebase';
import { httpsCallable } from 'firebase/functions';

interface UserRowProps {
  user: User;
  onUpdateStatus: (userId: string, newStatus: boolean) => void;
  onUpdateRole: (userId: string, newRole: Role) => void;
  onDeleteUser: (userId: string) => void;
  organizationName?: string;
}

export function UserRow({ user: targetUser, onUpdateStatus, onUpdateRole, onDeleteUser, organizationName }: UserRowProps) {
  const { user: currentUser, isSuperAdmin } = useAuth();
  const { toast } = useToast();
  const [isResending, setIsResending] = useState(false);

  const canModify = isSuperAdmin && currentUser?.uid !== targetUser.uid;
  
  const logAdminAction = async (data: any) => {
    if (!currentUser) return;
    try {
        await addDoc(collection(db, collections.adminAuditLogs), {
            ...data,
            performedBy: currentUser.email,
            performedByRole: currentUser.role,
            createdAt: serverTimestamp()
        });
    } catch (e) {
        console.error("Failed to log admin action", e);
    }
  }

  const handleResendInvite = async () => {
    if (!targetUser.email || !currentUser) {
      toast({ title: "Error", description: "User has no email address or you are not authenticated.", variant: "destructive" });
      return;
    }
    setIsResending(true);
    try {
      const sendInvite = httpsCallable(functions, 'sendOrganizationInvite');
      const payload = {
          email: targetUser.email,
          displayName: targetUser.name,
          organizationId: targetUser.organizationId,
          role: targetUser.role,
      };

      await sendInvite(payload);
      
      toast({ title: "✅ Invitation Re-sent", description: `A new password setup link has been sent to ${targetUser.email}.` });
      
      await logAdminAction({
          actionType: 'INVITE_RESENT',
          targetOrgId: targetUser.organizationId,
          targetOrgName: organizationName,
          targetUserId: targetUser.id,
          targetUserEmail: targetUser.email,
          details: { message: `Invitation re-sent to ${targetUser.email}` },
      });
        
    } catch(e: any) {
      toast({ title: "Error", description: `Failed to re-send invite: ${e.message}`, variant: "destructive" });
    } finally {
      setIsResending(false);
    }
  }

  const handleRoleUpdate = async (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newRole = e.target.value as Role;
      const oldRole = targetUser.role;
      onUpdateRole(targetUser.id, newRole);
      
      await logAdminAction({
          actionType: 'ROLE_CHANGED',
          targetUserId: targetUser.id,
          targetUserEmail: targetUser.email,
          targetOrgId: targetUser.organizationId,
          targetOrgName: organizationName,
          details: { message: `Role changed`, from: oldRole, to: newRole }
      });
  }
  
  const handleDeleteUserClick = async () => {
      try {
        await onDeleteUser(targetUser.id);
        await logAdminAction({
            actionType: 'USER_DEACTIVATED',
            targetUserId: targetUser.id,
            targetUserEmail: targetUser.email,
            details: { message: 'User deleted' }
        });
      } catch (e) {
          console.error("Error deleting user:", e);
      }
  }


  return (
    <div className="flex items-center justify-between border rounded px-3 py-2 mb-2" data-testid={`user-row-${targetUser.id}`}>
        <div className="min-w-0">
          <div className="font-medium truncate">{targetUser.name} ({targetUser.displayName})</div>
          <div className="text-xs text-muted-foreground truncate">{targetUser.email}</div>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          {targetUser.status === 'invited' ? (
             <Button size="sm" variant="secondary" onClick={handleResendInvite} disabled={isResending}>
                {isResending ? <Loader2 className="h-4 w-4 animate-spin"/> : <Mail className="h-4 w-4" />}
                <span className="hidden sm:inline ml-2">Resend Invite</span>
            </Button>
          ) : (
            <>
                <select 
                    value={targetUser.role} 
                    onChange={handleRoleUpdate} 
                    className="border rounded px-2 py-1 text-xs"
                    disabled={!canModify}
                >
                    <option value="User">User</option>
                    <option value="Editor">Editor</option>
                    <option value="Admin">Admin</option>
                    <option value="SuperAdmin">SuperAdmin</option>
                    <option value="orgAdmin">Org Admin</option>
                </select>
                <Button size="icon" variant={targetUser.isActive ? 'outline' : 'destructive'} onClick={() => onUpdateStatus(targetUser.id, !targetUser.isActive)} disabled={!canModify}>
                    {targetUser.isActive ? <UserCheck className="h-4 w-4" /> : <UserX className="h-4 w-4" />}
                </Button>
            </>
          )}
          
          <AlertDialog>
              <AlertDialogTrigger asChild>
                  <Button size="icon" variant="ghost" disabled={!canModify}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                  <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                      This will permanently delete the user {targetUser.name}. This action cannot be undone.
                  </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteUserClick} className="bg-destructive hover:bg-destructive/80">Delete</AlertDialogAction>
                  </AlertDialogFooter>
              </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
  );
}
