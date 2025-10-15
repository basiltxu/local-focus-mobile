
'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import PageHeader from '@/components/page-header';
import { usePermissions } from '@/hooks/usePermissions';
import { Skeleton } from '@/components/ui/skeleton';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Building, History } from 'lucide-react';
import type { Organization, User } from '@/lib/types';
import { PermissionsTable } from '@/components/admin/permissions/PermissionsTable';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useDebounce } from 'use-debounce';
import { EffectivePermissionsModal } from '@/components/admin/permissions/EffectivePermissionsModal';
import { PermissionsHistoryPanel } from '@/components/admin/permissions/PermissionsHistoryPanel';
import { usePermissionHistory } from '@/hooks/usePermissionHistory';

export default function AdminPermissionsPage() {
    const router = useRouter();
    const { user, isSuperAdmin, isAdmin } = useAuth();
    const { organizations, users, isLoading, updatePermission, applyOrgPermissionsToAllUsers, resetUserToOrgDefaults } = usePermissions();
    const { logPermissionChange } = usePermissionHistory();

    const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
    const [selectedUserForModal, setSelectedUserForModal] = useState<User | null>(null);
    const [isHistoryPanelOpen, setIsHistoryPanelOpen] = useState(false);
    const [historyPanelFilters, setHistoryPanelFilters] = useState<{orgId?: string, userId?: string}>({});
    
    const [search, setSearch] = useState('');
    const [debouncedSearch] = useDebounce(search, 300);

    const canAccess = isSuperAdmin || isAdmin;

    useEffect(() => {
        if (!isLoading && !canAccess) {
            router.push('/dashboard');
        }
    }, [isLoading, canAccess, router]);

    const filteredOrganizations = useMemo(() => {
        return organizations.filter(org => org.name.toLowerCase().includes(debouncedSearch.toLowerCase()));
    }, [organizations, debouncedSearch]);

    const selectedOrg = useMemo(() => {
        if (!selectedOrgId && organizations.length > 0) {
            return organizations[0];
        }
        return organizations.find(org => org.id === selectedOrgId) ?? null;
    }, [selectedOrgId, organizations]);

    const usersInOrg = useMemo(() => {
        if (!selectedOrg) return [];
        return users.filter(u => u.organizationId === selectedOrg.id);
    }, [selectedOrg, users]);

    useEffect(() => {
        if (!selectedOrgId && organizations.length > 0) {
            setSelectedOrgId(organizations[0].id);
        }
    }, [organizations, selectedOrgId]);

    const handleViewEffective = useCallback((userToShow: User) => {
        setSelectedUserForModal(userToShow);
    }, []);

    const openHistory = (orgId?: string, userId?: string) => {
        setHistoryPanelFilters({ orgId, userId });
        setIsHistoryPanelOpen(true);
    }

    if (isLoading || !canAccess) {
        return (
            <div className="flex-1 p-6 space-y-4">
                <Skeleton className="h-10 w-1/3" />
                <Skeleton className="h-8 w-1/4" />
                <div className="flex gap-4 h-[600px]">
                    <Skeleton className="w-1/4 h-full" />
                    <Skeleton className="w-3/4 h-full" />
                </div>
            </div>
        );
    }
    
  return (
    <>
    <main className="flex flex-col h-[calc(100vh_-_theme(space.16))]">
      <div className="p-6">
        <PageHeader 
            title="Permissions Management"
            description="Manage access rights for organizations and individual users."
        >
            <Button variant="outline" onClick={() => openHistory()}>
                <History className="mr-2 h-4 w-4"/>
                View Full History
            </Button>
        </PageHeader>
      </div>
      <ResizablePanelGroup direction="horizontal" className="flex-1 border-t">
        <ResizablePanel defaultSize={25} minSize={20} maxSize={35}>
            <div className="flex flex-col h-full">
                <div className="p-4 border-b">
                    <Input placeholder="Search organizations..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <ScrollArea>
                    {filteredOrganizations.map(org => (
                         <Button
                            key={org.id}
                            variant="ghost"
                            onClick={() => setSelectedOrgId(org.id)}
                            className={cn(
                                "w-full justify-start p-4 h-auto",
                                selectedOrg?.id === org.id && "bg-muted"
                            )}
                        >
                            <div className="flex items-center gap-3">
                                <Building className="h-4 w-4" />
                                <span>{org.name}</span>
                            </div>
                        </Button>
                    ))}
                </ScrollArea>
            </div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={75}>
            <ScrollArea className="h-full p-6">
                <PermissionsTable 
                    isLoading={isLoading}
                    selectedOrg={selectedOrg}
                    usersInOrg={usersInOrg}
                    onUpdatePermission={updatePermission}
                    onResetUserPermissions={resetUserToOrgDefaults}
                    onApplyToAll={applyOrgPermissionsToAllUsers}
                    onViewEffective={handleViewEffective}
                    onViewHistory={openHistory}
                />
            </ScrollArea>
        </ResizablePanel>
      </ResizablePanelGroup>
    </main>

    {selectedUserForModal && selectedOrg && (
        <EffectivePermissionsModal
            user={selectedUserForModal}
            organization={selectedOrg}
            isOpen={!!selectedUserForModal}
            onClose={() => setSelectedUserForModal(null)}
        />
    )}
    <PermissionsHistoryPanel 
        isOpen={isHistoryPanelOpen}
        onClose={() => setIsHistoryPanelOpen(false)}
        initialFilters={historyPanelFilters}
    />
    </>
  );
}
