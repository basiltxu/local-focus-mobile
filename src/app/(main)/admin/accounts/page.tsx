'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card';
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from '@/components/ui/tabs';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import {
  PlusCircle, Trash2, Loader2, Filter, Upload, AlertTriangle, Download,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import {
  collection, doc, writeBatch, setDoc, deleteDoc, query, where, serverTimestamp, onSnapshot, getDocs, addDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import PageHeader from '@/components/page-header';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { CSVImporter } from '@/components/CSVImporter';
import type { Role, Organization, User } from '@/lib/types';
import { CreateUserModal } from '@/components/admin/create-user-modal';
import { collections } from '@/lib/paths';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { exportToCSV } from '@/utils/csv';
import { z } from 'zod';
import { UserRow } from '@/components/admin/accounts/UserRow';


const LOCAL_FOCUS_ORG_ID = 'LOCAL_FOCUS_ORG_ID';
const PAGE_SIZE = 10;
const userValidationSchema = z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email address"),
    role: z.enum(['Admin', 'Editor', 'User', 'orgAdmin'], { errorMap: () => ({ message: "Role must be one of: Admin, Editor, User, orgAdmin" }) }),
    organizationId: z.string().min(1, "Organization ID is required"),
    isActive: z.preprocess((val) => String(val).toLowerCase() === 'true', z.boolean()).optional().default(true),
});

// =========== Inline Reusable UI Blocks ===========

function ConfirmDeleteDialog({
  open,
  organization,
  onConfirm,
  onCancel,
  isProcessing,
}: {
  open: boolean;
  organization: Organization | null;
  onConfirm: () => void;
  onCancel: () => void;
  isProcessing?: boolean;
}) {
  const [input, setInput] = useState('');
  const canDelete = input.trim().toLowerCase() === 'delete';
  if (!organization) return null;

  return (
    <Dialog open={open} onOpenChange={onCancel}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {organization.name}?</DialogTitle>
          <p className="text-sm text-muted-foreground mt-2">
            This will permanently delete the organization and all of its users. Type <strong>delete</strong> to confirm.
          </p>
        </DialogHeader>
        <Input
          placeholder="Type 'delete' to confirm"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="mt-3"
          data-testid="delete-confirm-input"
        />
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button
            variant="destructive"
            disabled={!canDelete || !!isProcessing}
            onClick={onConfirm}
            data-testid="delete-confirm-button"
          >
            {isProcessing ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =========== MAIN PAGE ===========

export default function AdminAccountsPage() {
  const { toast } = useToast();
  const { user, isSuperAdmin } = useAuth();
  const [isImporterOpen, setIsImporterOpen] = useState(false);
  const [importerOrg, setImporterOrg] = useState<{id: string, name: string} | null>(null);

  const [organizations, setOrganizations] = useState<(Organization & { users: User[] })[]>([]);
  const [localFocusUsers, setLocalFocusUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  // new org form
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgDomain, setNewOrgDomain] = useState('');

  // filter + pagination for Local Focus
  const [filterRole, setFilterRole] = useState('all');
  const [page, setPage] = useState(1);
  const paginatedLocalFocusUsers = useMemo(() => {
    const filtered = localFocusUsers.filter((u) => filterRole === 'all' || u.role === filterRole);
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [localFocusUsers, filterRole, page]);
  const totalPages = useMemo(() => {
    const filtered = localFocusUsers.filter((u) => filterRole === 'all' || u.role === filterRole);
    return Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  }, [localFocusUsers, filterRole]);

  // delete org state
  const [deleteOrg, setDeleteOrg] = useState<Organization | null>(null);

  const fetchAllData = useCallback(() => {
    // This function can be called to manually refresh data if needed
  }, []);
  
  const logAdminAction = async (data: any) => {
    if (!user) return;
    try {
        await addDoc(collection(db, collections.adminAuditLogs), {
            ...data,
            performedBy: user.email,
            performedByRole: user.role,
            createdAt: serverTimestamp()
        });
    } catch (e) {
        console.error("Failed to log admin action", e);
    }
  }

  useEffect(() => {
    setIsLoading(true);
    const usersQuery = query(collection(db, collections.users));
    const orgsQuery = query(collection(db, collections.organizations));

    const unsubUsers = onSnapshot(usersQuery, (usersSnap) => {
      const allUsers = usersSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as User[];
      
      const unsubOrgs = onSnapshot(orgsQuery, (orgsSnap) => {
        const allOrgs = orgsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Organization[];
        
        setLocalFocusUsers(allUsers.filter((u) => u.organizationId === LOCAL_FOCUS_ORG_ID));
        
        const externalOrgs = allOrgs.filter((o) => o.id !== LOCAL_FOCUS_ORG_ID);
        
        setOrganizations(
          externalOrgs.map((org) => ({
            ...org,
            users: allUsers.filter((u) => u.organizationId === org.id),
          })),
        );
        setIsLoading(false);
      }, (error) => {
        console.error("Error fetching organizations:", error);
        toast({ title: 'Error', description: 'Could not fetch organization data.', variant: 'destructive' });
        setIsLoading(false);
      });

      return () => unsubOrgs();
    }, (error) => {
      console.error("Error fetching users:", error);
      toast({ title: 'Error', description: 'Could not fetch user data.', variant: 'destructive' });
      setIsLoading(false);
    });

    return () => {
        unsubUsers();
    };
  }, [toast]);


  const handleCreateOrganization = useCallback(async () => {
    if (!newOrgName.trim()) {
      toast({ title: 'Missing name', description: 'Organization name is required.' });
      return;
    }
    try {
      setIsUpdating('new-org');
      const orgRef = doc(collection(db, collections.organizations));
      await setDoc(orgRef, {
        name: newOrgName.trim(),
        domain: newOrgDomain.trim() || '',
        type: 'external',
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      toast({ title: '✅ Organization Created', description: `${newOrgName} added successfully. Users will be invited automatically.` });
      setNewOrgName(''); setNewOrgDomain('');
    } catch (e: any) {
      console.error("Error creating organization:", e);
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setIsUpdating(null);
    }
  }, [newOrgName, newOrgDomain, toast]);

  const handleDeleteOrganization = useCallback(async () => {
    if (!deleteOrg) return;
    try {
      setIsUpdating(deleteOrg.id);
      
      const batch = writeBatch(db);
      
      // Delete users in the organization
      const usersQuery = query(collection(db, collections.users), where('organizationId', '==', deleteOrg.id));
      const usersSnap = await getDocs(usersQuery);
      usersSnap.forEach(userDoc => {
        batch.delete(userDoc.ref);
      });

      // Delete the organization
      batch.delete(doc(db, collections.organizations, deleteOrg.id));
      
      await batch.commit();

      toast({ title: '🗑️ Deleted', description: `${deleteOrg.name} and its users removed. Note: Auth users must be deleted manually from the Firebase Console.` });
      setDeleteOrg(null);
    } catch (e: any)      {
      console.error("Error deleting organization:", e);
      toast({ title: 'Deletion Failed', description: e.message, variant: 'destructive' });
    } finally {
      setIsUpdating(null);
    }
  }, [deleteOrg, toast]);
  
  const handleUpdateUserStatus = useCallback(async (userId: string, newStatus: boolean) => {
    try {
      await updateDoc(doc(db, collections.users, userId), { isActive: newStatus });
      toast({ title: 'Status Updated', description: `User status has been changed.` });
      
      const targetUser = organizations.flatMap(o => o.users).concat(localFocusUsers).find(u => u.id === userId);
      if(targetUser) {
        await logAdminAction({
            actionType: newStatus ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
            targetUserId: targetUser.id,
            targetUserEmail: targetUser.email,
            targetOrgId: targetUser.organizationId,
            details: { message: `User ${newStatus ? 'activated' : 'deactivated'}` }
        });
      }
    } catch (e: any) {
      toast({ title: 'Error', description: `Could not update user status: ${e.message}`, variant: 'destructive' });
    }
  }, [toast, organizations, localFocusUsers]);
  
  const handleUpdateUserRole = useCallback(async (userId: string, newRole: Role) => {
     try {
      await updateDoc(doc(db, collections.users, userId), { role: newRole });
      toast({ title: 'Role Updated', description: "User's role has been changed." });
    } catch (e: any) {
      toast({ title: 'Error', description: `Could not update user role: ${e.message}`, variant: 'destructive' });
    }
  }, [toast]);

  const handleDeleteUser = useCallback(async (userId: string) => {
    try {
        await deleteDoc(doc(db, 'users', userId));
        toast({ title: 'User Deleted', variant: 'destructive' });
    } catch (e: any) {
        toast({ title: 'Error', description: `Failed to delete user: ${e.message}`, variant: 'destructive' });
    }
  }, [toast]);
  
  const handleOpenImporter = (org: Organization) => {
    setImporterOrg({ id: org.id, name: org.name });
    setIsImporterOpen(true);
  }

  const userColumns = ['name', 'email', 'role', 'organizationId', 'isActive'];

  if (isLoading) {
    return (
      <main className="flex-1 p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </main>
    );
  }

  return (
    <>
      <main className="flex-1 p-6 space-y-6">
        <PageHeader title="Manage Accounts">
          <div className="flex gap-2">
            <CreateUserModal
              organizations={[{ id: LOCAL_FOCUS_ORG_ID, name: 'Local Focus' } as Organization, ...organizations]}
              defaultOrgId={LOCAL_FOCUS_ORG_ID}
              onUserAdded={fetchAllData}
            />
          </div>
        </PageHeader>

        <Tabs defaultValue="local" data-testid="accounts-tabs">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="local" data-testid="accounts-tab-local">Local Focus</TabsTrigger>
            <TabsTrigger value="orgs" data-testid="accounts-tab-orgs">Organizations</TabsTrigger>
          </TabsList>

          {/* LOCAL FOCUS */}
          <TabsContent value="local">
            <Card>
              <CardHeader>
                <CardTitle>Local Focus Team</CardTitle>
                <CardDescription>SuperAdmins, Admins & Editors</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 mb-4">
                  <Filter className="h-4 w-4" />
                  <Label>Filter by Role:</Label>
                  <select
                    className="border rounded px-2 py-1 text-sm"
                    value={filterRole}
                    onChange={(e) => { setFilterRole(e.target.value); setPage(1); }}
                    data-testid="local-user-role-filter"
                  >
                    <option value="all">All</option>
                    <option value="SuperAdmin">SuperAdmin</option>
                    <option value="Admin">Admin</option>
                    <option value="Editor">Editor</option>
                    <option value="User">User</option>
                  </select>
                </div>

                {paginatedLocalFocusUsers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No users found.</p>
                ) : (
                  paginatedLocalFocusUsers.map((u) => (
                    <UserRow key={u.id} user={u} onUpdateStatus={handleUpdateUserStatus} onUpdateRole={handleUpdateUserRole} onDeleteUser={handleDeleteUser} />
                  ))
                )}

                <div className="flex justify-between items-center mt-4">
                  <Button variant="outline" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                    Previous
                  </Button>
                  <span className="text-sm">Page {page} of {totalPages}</span>
                  <Button variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                    Next
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ORGANIZATIONS */}
          <TabsContent value="orgs">
            <Card>
              <CardHeader>
                <CardTitle>Organizations</CardTitle>
                <CardDescription>Manage partners, users, rights & onboarding</CardDescription>
              </CardHeader>
              <CardContent>
                {isSuperAdmin && (
                    <div className="flex flex-col md:flex-row gap-2 mb-6" data-testid="create-org-form">
                    <Input
                        placeholder="Organization name"
                        value={newOrgName}
                        onChange={(e) => setNewOrgName(e.target.value)}
                        data-testid="new-org-name-input"
                    />
                    <Input
                        placeholder="Domain (e.g. example.org)"
                        value={newOrgDomain}
                        onChange={(e) => setNewOrgDomain(e.target.value)}
                        data-testid="new-org-domain-input"
                    />
                    <Button onClick={handleCreateOrganization} disabled={isUpdating === 'new-org'} data-testid="create-org-button">
                        {isUpdating === 'new-org' && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Create
                    </Button>
                    </div>
                )}

                {organizations.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No external organizations yet.</p>
                ) : (
                  <Accordion type="single" collapsible className="w-full">
                    {organizations.map((org) => (
                      <AccordionItem value={org.id} key={org.id} data-testid={`org-item-${org.id}`}>
                        <div className="flex items-center border-b">
                          <AccordionTrigger className="flex-grow">
                            <div className="flex justify-between items-center w-full pr-4">
                              <div>
                                <p className="font-semibold">{org.name}</p>
                                <p className="text-sm text-muted-foreground">{org.currentUsers || 0}/{org.maxUsers} users</p>
                              </div>
                              <div className="flex gap-2 items-center">
                                  {(org.currentUsers || 0) >= (org.maxUsers || Infinity) && <Badge variant="destructive">Quota Reached</Badge>}
                                  {!org.hasOrgAdmin && <Badge variant="outline">No Admin</Badge>}
                                  <Badge variant={org.isActive ? 'default' : 'outline'}>
                                  {org.isActive ? 'Active' : 'Inactive'}
                                  </Badge>
                              </div>
                            </div>
                          </AccordionTrigger>
                          {isSuperAdmin && (
                            <div className="flex items-center gap-1 pr-2">
                                <Button
                                size="icon"
                                variant="destructive"
                                onClick={(e) => { e.stopPropagation(); setDeleteOrg(org); }}
                                title="Delete organization"
                                data-testid={`delete-org-button-${org.id}`}
                                >
                                <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                          )}
                        </div>
                        <AccordionContent>
                          <div className="p-4 bg-muted/50 rounded-lg space-y-4">
                             {(org.currentUsers || 0) >= (org.maxUsers || Infinity) && (
                                  <Alert variant="destructive">
                                      <AlertTriangle className="h-4 w-4" />
                                      <AlertTitle>User Quota Reached</AlertTitle>
                                      <AlertDescription>
                                          This organization cannot add more users. Increase the quota to invite more.
                                      </AlertDescription>
                                  </Alert>
                              )}

                            {/* Onboarding actions */}
                            <div className="flex flex-wrap items-center gap-2">
                               <CreateUserModal
                                organizations={[org]}
                                defaultOrgId={org.id}
                                onUserAdded={fetchAllData}
                                disabled={(org.currentUsers || 0) >= (org.maxUsers || Infinity)}
                                hasOrgAdmin={org.hasOrgAdmin}
                              />
                               <Button variant="secondary" onClick={() => handleOpenImporter(org)}>
                                <Upload className="mr-2 h-4 w-4"/> Import CSV
                              </Button>
                               <Button variant="secondary" onClick={() => exportToCSV('user_import_template.csv', [{fullName: '', email: '', role: ''}])}>
                                <Download className="mr-2 h-4 w-4"/>
                                Download Template
                              </Button>
                            </div>

                            {/* Users list */}
                            <div>
                              <h4 className="font-semibold mb-3">Users</h4>
                              {org.users.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No users yet.</p>
                              ) : (
                                <div className="grid">
                                  {org.users.map((u) => (
                                     <UserRow key={u.id} user={u} onUpdateStatus={handleUpdateUserStatus} onUpdateRole={handleUpdateUserRole} onDeleteUser={handleDeleteUser} organizationName={org.name} />
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Verify delete dialog */}
        <ConfirmDeleteDialog
          open={!!deleteOrg}
          organization={deleteOrg}
          onConfirm={handleDeleteOrganization}
          onCancel={() => setDeleteOrg(null)}
          isProcessing={!!deleteOrg && isUpdating === deleteOrg.id}
        />
      </main>

      {isImporterOpen && importerOrg && (
         <CSVImporter
            isOpen={isImporterOpen}
            onClose={() => setIsImporterOpen(false)}
            collectionName="users"
            expectedColumns={userColumns}
            validationSchema={userValidationSchema}
            firestoreCollection={collection(db, 'users')}
            uniqueKeys={['email']}
            onImportComplete={fetchAllData}
            organizationId={importerOrg.id}
            organizationName={importerOrg.name}
        />
      )}
    </>
  );
}
