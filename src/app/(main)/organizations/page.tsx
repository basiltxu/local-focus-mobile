
'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card';
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell,
} from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Loader2, Upload, Download } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Organization } from '@/lib/types';
import { collections } from '@/lib/paths';
import PageHeader from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { downloadTemplate, exportToCSV } from '@/utils/csv';
import { CSVImporter } from '@/components/CSVImporter';
import { z } from 'zod';

const orgValidationSchema = z.object({
  name: z.string().min(2, 'Organization name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().optional(),
  address: z.string().optional(),
  country: z.string().min(2, 'Country is required'),
});

export default function OrganizationsPage() {
  const { toast } = useToast();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [isImporterOpen, setIsImporterOpen] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    const orgsQuery = query(collection(db, collections.organizations), orderBy('name', 'asc'));
    
    const unsubscribe = onSnapshot(orgsQuery, (snapshot) => {
      const orgsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Organization));
      setOrganizations(orgsData);
      setIsLoading(false);
    }, (error) => {
        toast({ title: 'Error', description: 'Could not load organizations.', variant: 'destructive'});
        console.error("Error fetching organizations: ", error);
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);
  
  const filteredOrgs = useMemo(() => {
      return organizations.filter(org => 
          org.name.toLowerCase().includes(filter.toLowerCase()) ||
          (org.type && org.type.toLowerCase().includes(filter.toLowerCase()))
      );
  }, [organizations, filter]);

  const handleExport = () => {
    if (organizations.length === 0) {
        toast({ title: "No Data", description: "There are no organizations to export." });
        return;
    }
    exportToCSV(`organizations_export_${new Date().toISOString()}.csv`, organizations);
  };
  
  const orgColumns = ['name', 'email', 'phone', 'address', 'country'];

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <>
    <main className="flex-1 p-6 space-y-6">
      <PageHeader
        title="Organizations Dashboard"
        description="Monitor organization health, quotas, and status in real-time."
      >
        <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => downloadTemplate('organizations_template.csv', orgColumns)}>
                <Download className="mr-2 h-4 w-4" /> Template
            </Button>
            <Button variant="outline" onClick={() => setIsImporterOpen(true)}>
                <Upload className="mr-2 h-4 w-4" /> Import CSV
            </Button>
            <Button onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" /> Export All
            </Button>
        </div>
      </PageHeader>
      
       <Card>
            <CardHeader>
            <CardTitle>All Organizations</CardTitle>
            <CardDescription>A list of all client and internal organizations.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="mb-4">
                    <Input 
                        placeholder="Filter by name or type..."
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                    />
                </div>
                <div className="border rounded-lg">
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Users</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {filteredOrgs.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    No organizations found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredOrgs.map((org) => (
                                <TableRow key={org.id}>
                                    <TableCell className="font-medium">{org.name}</TableCell>
                                    <TableCell><Badge variant={org.type === 'core' ? 'default' : 'secondary'} className="capitalize">{org.type}</Badge></TableCell>
                                    <TableCell>{org.currentUsers || 0} / {org.maxUsers || 'N/A'}</TableCell>
                                    <TableCell>
                                        <Badge variant={org.isActive ? 'default' : 'outline'} className={org.isActive ? 'bg-green-500' : ''}>
                                            {org.isActive ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon"><MoreHorizontal /></Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent>
                                                <DropdownMenuItem>View Details</DropdownMenuItem>
                                                <DropdownMenuItem>Manage Users</DropdownMenuItem>
                                                <DropdownMenuItem className="text-red-500">Delete</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    </main>

    {isImporterOpen && (
        <CSVImporter
            isOpen={isImporterOpen}
            onClose={() => setIsImporterOpen(false)}
            collectionName="organizations"
            expectedColumns={orgColumns}
            validationSchema={orgValidationSchema}
            firestoreCollection={collection(db, 'organizations')}
            uniqueKeys={['name', 'email']}
            onImportComplete={() => { /* Data refreshes via snapshot */ }}
        />
    )}
    </>
  );
}
