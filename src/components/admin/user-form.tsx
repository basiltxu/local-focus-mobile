
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, PlusCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { User, Organization, Role, AppRole, OrgRole } from '@/lib/types';
import { auth, db } from '@/lib/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ScrollArea } from '../ui/scroll-area';
import { userFormSchema } from '@/lib/schemas';
import { collections } from '@/lib/paths';

type UserFormProps = {
  user?: User;
  children?: React.ReactNode;
  onUserAdded: () => void;
  organizations?: Organization[];
};

export function UserForm({ user, children, onUserAdded, organizations = [] }: UserFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const isEditMode = !!user;

  const form = useForm<z.infer<typeof userFormSchema>>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      name: '',
      email: '',
      role: 'User',
    },
  });

  useEffect(() => {
    if (isEditMode && user) {
      form.reset({
        uid: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId || '',
        password: '',
      });
    } else {
      form.reset({
        uid: undefined,
        name: '',
        email: '',
        role: 'User',
        organizationId: undefined,
        password: '',
      });
    }
  }, [isOpen, user, isEditMode, form]);

  const mapRoleToAppAndOrgRoles = (role: Role): { appRole: AppRole, orgRole?: OrgRole } => {
      switch (role) {
          case 'SuperAdmin':
              return { appRole: 'Owner' };
          case 'Admin':
              return { appRole: 'Admin', orgRole: 'org_admin' };
          case 'Editor':
              return { appRole: 'User', orgRole: 'editor' };
          case 'User':
          default:
              return { appRole: 'User', orgRole: 'member' };
      }
  }


  const onSubmit = async (values: z.infer<typeof userFormSchema>) => {
    setIsSubmitting(true);
    
    const { appRole, orgRole } = mapRoleToAppAndOrgRoles(values.role);
    
    try {
      if (isEditMode && user) {
        const userRef = doc(db, collections.users, user.id);
        const updateData: Partial<User> = {
            name: values.name,
            role: values.role,
            appRole: appRole,
            orgRole: orgRole,
            organizationId: values.organizationId || null,
            updatedAt: serverTimestamp(),
        };
        await updateDoc(userRef, updateData);
        toast({
            title: 'User Updated',
            description: `Details for ${values.name} have been updated.`,
        });

      } else {
        const password = values.password || 'password';
        if(password.length < 6) {
            throw new Error("Password must be at least 6 characters long.");
        }
        
        const userCredential = await createUserWithEmailAndPassword(auth, values.email, password);
        const { uid } = userCredential.user;
        
        const userDocRef = doc(db, collections.users, uid);
        const userData: Omit<User, 'id'> = {
            uid: uid,
            name: values.name,
            email: values.email,
            role: values.role,
            appRole: appRole,
            orgRole: orgRole,
            organizationId: values.organizationId || null,
            status: 'active',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        };

        await setDoc(userDocRef, userData);
        
        toast({
          title: 'User Created',
          description: `User ${values.name} has been created.`,
        });
      }
      setIsOpen(false);
      onUserAdded();
    } catch (e: any) {
       console.error("Error submitting user form:", e);
       toast({
        title: isEditMode ? 'Update Failed' : 'Creation Failed',
        description: e.message || 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <>
      <div onClick={() => setIsOpen(true)}>
        {children || (
          <Button>
            <PlusCircle className="mr-2" />
            Add User
          </Button>
        )}
      </div>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md grid-rows-[auto_minmax(0,1fr)_auto] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{isEditMode ? 'Edit User' : 'Add New User'}</DialogTitle>
            <DialogDescription>
              {isEditMode 
                ? "Update the user's details below."
                : "Enter the user details below. This will create a new user account."
              }
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
              <ScrollArea className="h-full">
                <div className="space-y-4 pr-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="user@example.com" {...field} disabled={isEditMode} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {!isEditMode && (
                  <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                      <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                          <Input type="password" placeholder="Default: 'password' if empty" {...field} />
                          </FormControl>
                          <FormMessage />
                      </FormItem>
                      )}
                  />
                )}

                <FormField
                    control={form.control}
                    name="organizationId"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Organization</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select an organization" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                {organizations.map(org => (
                                    <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                                ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="SuperAdmin">Super Admin</SelectItem>
                          <SelectItem value="Admin">Admin</SelectItem>
                          <SelectItem value="Editor">Editor</SelectItem>
                          <SelectItem value="User">User</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                </div>
              </ScrollArea>
              <DialogFooter className="pt-4">
                <DialogClose asChild>
                  <Button type="button" variant="ghost">Cancel</Button>
                </DialogClose>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isEditMode ? 'Save Changes' : 'Create User'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
