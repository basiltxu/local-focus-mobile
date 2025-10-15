'use client';

import { useState } from 'react';
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
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertTriangle, CheckCircle2, XCircle, Users, ArrowUpCircle } from 'lucide-react';
import type { Organization } from '@/lib/types';
import { UpgradeQuotaDialog } from './UpgradeQuotaDialog';
import { useRouter } from 'next/navigation';

interface OrganizationsTableProps {
  organizations: Organization[];
  onUpdate: () => void;
}

export function OrganizationsTable({ organizations, onUpdate }: OrganizationsTableProps) {
    const router = useRouter();
    const [orgToUpgrade, setOrgToUpgrade] = useState<Organization | null>(null);

    const getAlert = (org: Organization) => {
        if (!org.isActive) return { icon: XCircle, text: 'Inactive', color: 'text-gray-500' };
        if (org.currentUsers >= org.maxUsers) return { icon: AlertTriangle, text: 'Quota Reached', color: 'text-red-500' };
        if (org.type === 'external' && !org.hasOrgAdmin) return { icon: ShieldQuestion, text: 'Missing Admin', color: 'text-yellow-500' };
        return { icon: CheckCircle2, text: 'Healthy', color: 'text-green-500' };
    };

    return (
        <>
        <Card>
            <CardHeader>
            <CardTitle>All Organizations</CardTitle>
            <CardDescription>
                A list of all client and internal organizations.
            </CardDescription>
            </CardHeader>
            <CardContent>
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Users</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Alerts</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {organizations.length === 0 ? (
                    <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                        No organizations found.
                    </TableCell>
                    </TableRow>
                ) : (
                    organizations.map((org) => {
                        const alert = getAlert(org);
                        return (
                        <TableRow key={org.id}>
                            <TableCell className="font-medium">{org.name}</TableCell>
                            <TableCell><Badge variant={org.type === 'core' ? 'default' : 'secondary'} className="capitalize">{org.type}</Badge></TableCell>
                            <TableCell>{org.currentUsers} / {org.maxUsers}</TableCell>
                            <TableCell>
                                <Badge variant={org.isActive ? 'default' : 'outline'} className={org.isActive ? 'bg-green-500' : ''}>
                                    {org.isActive ? 'Active' : 'Inactive'}
                                </Badge>
                            </TableCell>
                            <TableCell>
                                <TooltipProvider>
                                    <Tooltip>
                                    <TooltipTrigger>
                                        <alert.icon className={`h-5 w-5 ${alert.color}`} />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>{alert.text}</p>
                                    </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </TableCell>
                            <TableCell className="text-right space-x-2">
                                <Button variant="outline" size="sm" onClick={() => router.push(`/admin/accounts?orgId=${org.id}`)}>
                                    <Users className="mr-2 h-4 w-4" /> View Users
                                </Button>
                                <Button variant="secondary" size="sm" onClick={() => setOrgToUpgrade(org)}>
                                    <ArrowUpCircle className="mr-2 h-4 w-4" /> Upgrade
                                </Button>
                            </TableCell>
                        </TableRow>
                        )
                    })
                )}
                </TableBody>
            </Table>
            </CardContent>
        </Card>
        
        {orgToUpgrade && (
            <UpgradeQuotaDialog
                organization={orgToUpgrade}
                onOpenChange={(isOpen) => !isOpen && setOrgToUpgrade(null)}
                onQuotaUpdated={() => {
                    setOrgToUpgrade(null);
                    onUpdate();
                }}
            />
        )}
        </>
    );
}

// Adding a placeholder for the missing ShieldQuestion icon.
const ShieldQuestion = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
        <line x1="12" y1="17" x2="12.01" y2="17"></line>
    </svg>
);
