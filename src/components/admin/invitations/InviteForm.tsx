
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { Loader2, Mail, Shield, UserPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { functions } from '@/lib/firebase';
import { httpsCallable } from 'firebase/functions';
import type { Organization, Role } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAuth } from '@/hooks/use-auth';

const inviteFormSchema = z.object({
  email: z.string().email('Please enter a valid email address.'),
  displayName: z.string().min(2, 'Name must be at least 2 characters long.'),
  organizationId: z.string().nonempty('Please select an organization.'),
  role: z.enum(['SuperAdmin', 'Admin', 'Editor', 'User', 'orgAdmin']),
});

interface InviteFormProps {
  organizations: Organization[];
  onInviteSent: () => void;
}

export function InviteForm({ organizations, onInviteSent }: InviteFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof inviteFormSchema>>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: {
      email: '',
      displayName: '',
      organizationId: '',
      role: 'User',
    },
  });
  
  const selectedOrgId = form.watch('organizationId');
  const selectedOrg = organizations.find(org => org.id === selectedOrgId);

  useEffect(() => {
    // When the selected organization changes, reset the role to a valid default.
    if (selectedOrg) {
      form.setValue('role', selectedOrg.type === 'core' ? 'User' : 'User');
    }
  }, [selectedOrgId, selectedOrg, form]);

  const onSubmit = useCallback(async (values: z.infer<typeof inviteFormSchema>) => {
    if (!user) {
        toast({ title: "Not authenticated", variant: "destructive" });
        return;
    }
    setIsSubmitting(true);
    try {
      const sendInvite = httpsCallable(functions, 'sendOrganizationInvite');
      
      const payload = { 
          ...values,
      };

      await sendInvite(payload);

      toast({
        title: '✅ Invitation Sent',
        description: `An invitation email has been sent to ${values.email}.`,
      });
      form.reset();
      onInviteSent();
    } catch (error: any) {
      console.error('Error sending invitation:', error);
      toast({
        title: '❌ Invitation Failed',
        description: error.message || 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [form, onInviteSent, toast, user]);
  
  const getRoleOptions = () => {
    if (!selectedOrg) return [];
    if (selectedOrg.type === 'core') {
      return ['User', 'Editor', 'Admin', 'SuperAdmin'];
    } else { // external
        const roles = [{ value: 'User', label: 'User', disabled: false }];
        if (selectedOrg.hasOrgAdmin) {
            roles.push({ value: 'orgAdmin', label: 'Org Admin (Filled)', disabled: true });
        } else {
            roles.push({ value: 'orgAdmin', label: 'Org Admin', disabled: false });
        }
        return roles;
    }
  }
  
  const isQuotaReached = selectedOrg && selectedOrg.currentUsers >= selectedOrg.maxUsers;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <UserPlus />
            Invite New User
        </CardTitle>
        <CardDescription>
          The user will receive an email with a link to activate their account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="organizationId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Organization</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
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
            
            {isQuotaReached && (
                 <Alert variant="destructive">
                    <Shield className="h-4 w-4"/>
                    <AlertTitle>Quota Reached</AlertTitle>
                    <AlertDescription>
                        This organization cannot add more users. Please upgrade their quota.
                    </AlertDescription>
                 </Alert>
            )}

            <FormField
              control={form.control}
              name="displayName"
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
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="name@example.com" {...field} />
                  </FormControl>
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
                   <Select onValueChange={field.onChange} value={field.value} disabled={!selectedOrgId}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Array.isArray(getRoleOptions()) ? getRoleOptions().map((role: any) => (
                          typeof role === 'string' ? 
                          <SelectItem key={role} value={role}>{role}</SelectItem> :
                          <SelectItem key={role.value} value={role.value} disabled={role.disabled}>{role.label}</SelectItem>
                      )) : null}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button type="submit" className="w-full" disabled={isSubmitting || isQuotaReached || !selectedOrgId}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Mail className="mr-2 h-4 w-4" />
              Send Invitation
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
