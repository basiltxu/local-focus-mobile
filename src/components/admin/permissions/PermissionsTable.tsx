
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Organization, User, AppPermissions } from "@/lib/types";
import { ALL_PERMISSIONS, getEffectivePermissions } from "@/lib/permissions";
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from "@/lib/utils";
import { RotateCcw, Eye, Info, History } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface PermissionsTableProps {
    isLoading: boolean;
    selectedOrg: Organization | null;
    usersInOrg: User[];
    onUpdatePermission: (target: 'organization' | 'user', id: string, permission: keyof Omit<AppPermissions, 'lastUpdated' | 'inheritedFromOrg'>, value: boolean) => void;
    onResetUserPermissions: (user: User) => void;
    onApplyToAll: (org: Organization) => void;
    onViewEffective: (user: User) => void;
    onViewHistory: (orgId?: string, userId?: string) => void;
}

const formatPermissionName = (name: string) => {
    return name.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
};

export function PermissionsTable({ isLoading, selectedOrg, usersInOrg, onUpdatePermission, onResetUserPermissions, onApplyToAll, onViewEffective, onViewHistory }: PermissionsTableProps) {

    if (isLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-10 w-1/4" />
                <Skeleton className="h-64 w-full" />
            </div>
        )
    }
    
    if (!selectedOrg) {
        return (
            <div className="flex items-center justify-center h-full text-muted-foreground">
                <p>Select an organization to view and manage its permissions.</p>
            </div>
        )
    }
    
    const orgPermissions = selectedOrg.permissions;
    const isLocalFocusOrg = selectedOrg.id === 'LOCAL_FOCUS_ORG_ID';

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle>Permissions for {selectedOrg.name}</CardTitle>
                        <CardDescription>
                            Manage permissions for the entire organization or override for individual users.
                        </CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => onViewHistory(selectedOrg.id)}>
                            <History className="mr-2 h-4 w-4"/>
                            History
                        </Button>
                        {!isLocalFocusOrg && (
                            <Button onClick={() => onApplyToAll(selectedOrg)} size="sm">Apply to All Users</Button>
                        )}
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[200px] min-w-[200px]">Member</TableHead>
                            {ALL_PERMISSIONS.map(p => (
                                <TableHead key={p} className="text-center min-w-[120px]">{formatPermissionName(p)}</TableHead>
                            ))}
                            <TableHead className="text-right min-w-[120px]">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {/* Organization Row */}
                        <TableRow className="bg-muted/50 font-bold hover:bg-muted">
                            <TableCell>
                                Organization Defaults
                                {orgPermissions?.lastUpdated && (
                                    <p className="text-xs font-normal text-muted-foreground">
                                        Updated {formatDistanceToNow(orgPermissions.lastUpdated.toDate(), { addSuffix: true })}
                                    </p>
                                )}
                            </TableCell>
                            {ALL_PERMISSIONS.map(p => (
                                <TableCell key={p} className="text-center">
                                    <Switch
                                        checked={orgPermissions?.[p] ?? false}
                                        onCheckedChange={(value) => onUpdatePermission('organization', selectedOrg.id, p, value)}
                                        disabled={isLocalFocusOrg}
                                    />
                                </TableCell>
                            ))}
                            <TableCell className="text-right">
                                {isLocalFocusOrg && (
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger><Info className="h-4 w-4" /></TooltipTrigger>
                                            <TooltipContent><p>Local Focus permissions are code-defined.</p></TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                )}
                            </TableCell>
                        </TableRow>
                        
                        {/* User Rows */}
                        {usersInOrg.map(user => {
                            const effectivePerms = getEffectivePermissions(user, selectedOrg);
                            const hasOverride = user.permissions?.inheritedFromOrg === false;
                            
                            return (
                                <TableRow key={user.id} className={cn(!hasOverride && "text-muted-foreground")}>
                                    <TableCell>
                                        <p className="font-medium">{user.name}</p>
                                        <p className="text-xs">{user.email}</p>
                                    </TableCell>
                                    {ALL_PERMISSIONS.map(p => {
                                        const isOverridden = hasOverride && user.permissions?.[p] !== undefined;
                                        return (
                                            <TableCell key={p} className={cn("text-center", isOverridden && "bg-blue-50 dark:bg-blue-900/20")}>
                                                <Switch
                                                    checked={effectivePerms[p] ?? false}
                                                    onCheckedChange={(value) => onUpdatePermission('user', user.id, p, value)}
                                                />
                                            </TableCell>
                                        )
                                    })}
                                    <TableCell className="text-right">
                                         <TooltipProvider>
                                             <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button variant="ghost" size="icon" onClick={() => onViewHistory(selectedOrg.id, user.id)}>
                                                        <History className="h-4 w-4" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent><p>View User History</p></TooltipContent>
                                            </Tooltip>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button variant="ghost" size="icon" onClick={() => onViewEffective(user)}>
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent><p>View Effective Permissions</p></TooltipContent>
                                            </Tooltip>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                     <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        onClick={() => onResetUserPermissions(user)}
                                                        disabled={!hasOverride}
                                                    >
                                                        <RotateCcw className="h-4 w-4" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent><p>Reset to organization defaults</p></TooltipContent>
                                            </Tooltip>
                                         </TooltipProvider>
                                    </TableCell>
                                </TableRow>
                            )
                        })}
                    </TableBody>
                </Table>
                 {usersInOrg.length === 0 && (
                    <div className="text-center py-10 text-muted-foreground">
                        No users found in this organization.
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
