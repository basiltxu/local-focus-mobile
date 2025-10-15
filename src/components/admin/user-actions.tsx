
'use client';

import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { User, Organization } from '@/lib/types';
import { UserForm } from './user-form';
import { doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import { useAuth } from '@/hooks/use-auth';
import dynamic from 'next/dynamic';

const DynamicUserForm = dynamic(() => import('./user-form').then(m => m.UserForm));

type UserActionsProps = {
  user: User;
  onUserUpdated: () => void;
  organizations: Organization[];
};

const PROTECTED_USER_EMAIL = "basil.khoury14@gmail.com";

export function UserActions({ user: targetUser, onUserUpdated, organizations }: UserActionsProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const { toast } = useToast();
  const { user: currentUser, isSuperAdmin } = useAuth();
  
  const isSelf = currentUser?.uid === targetUser.uid;
  const isProtectedUser = targetUser.email === PROTECTED_USER_EMAIL;
  const canModify = isSuperAdmin && !isSelf;

  const handleDelete = async () => {
    if (!canModify || isProtectedUser) {
        toast({ title: "Action Forbidden", description: "This user account cannot be deleted.", variant: 'destructive'});
        setIsDeleteDialogOpen(false);
        return;
    }
    const userRef = doc(db, 'users', targetUser.id);
    try {
        await deleteDoc(userRef);
        toast({
            title: 'User Deleted',
            description: `${targetUser.name}'s data has been removed. The authentication record must be deleted separately from the Firebase Console.`,
            variant: 'destructive',
        });
        setIsDeleteDialogOpen(false);
        onUserUpdated();
    } catch(e: any) {
      toast({
        title: 'Error',
        description: `Failed to delete user: ${e.message}`,
        variant: 'destructive'
      })
    }
  };

  const handleDeactivate = async () => {
    if (isProtectedUser) {
        toast({ title: "Action Forbidden", description: "Super Admin accounts cannot be deactivated.", variant: 'destructive'});
        return;
    }
    const userRef = doc(db, 'users', targetUser.id);
    const newStatus = targetUser.status === 'active' ? 'pending' : 'active';
    const action = newStatus === 'active' ? 'Reactivated' : 'Deactivated';

    try {
      await updateDoc(userRef, { status: newStatus, isActive: newStatus === 'active' });
      toast({
          title: `User ${action}`,
          description: `${targetUser.name} has been ${action.toLowerCase()}.`,
      });
      onUserUpdated();
    } catch(e: any) {
      toast({
        title: 'Error',
        description: `Failed to update user status: ${e.message}`,
        variant: 'destructive'
      })
    }
  };

  const handleResetPassword = async () => {
    if (!targetUser.email) {
      toast({ title: "Error", description: "No email address found for this user.", variant: "destructive"});
      return;
    }
    setIsSendingReset(true);
    try {
      await sendPasswordResetEmail(auth, targetUser.email);
      toast({
        title: "Password Reset Email Sent",
        description: `A reset link has been sent to ${targetUser.email}.`,
      });
    } catch (error: any) {
      toast({
        title: "Error Sending Reset Email",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSendingReset(false);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DynamicUserForm user={targetUser} onUserAdded={onUserUpdated} organizations={organizations}>
            <DropdownMenuItem onSelect={(e) => e.preventDefault()} disabled={!canModify}>
              Edit Profile
            </DropdownMenuItem>
          </DynamicUserForm>

          <DropdownMenuItem onClick={handleDeactivate} disabled={!canModify || isProtectedUser}>
            {targetUser.status === 'active' ? 'Deactivate' : 'Reactivate'}
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={handleResetPassword}>
            {isSendingReset && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Send Password Reset
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />

          <DropdownMenuItem
            className="text-destructive focus:text-destructive focus:bg-destructive/10"
            onClick={() => setIsDeleteDialogOpen(true)}
            disabled={!canModify || isProtectedUser}
          >
            Delete User
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the user
              account for <span className="font-bold">{targetUser.name}</span> and remove their data from our servers. The associated Firebase Auth user must be deleted separately from the Firebase Console.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
