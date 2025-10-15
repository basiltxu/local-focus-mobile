
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useDebounce } from 'use-debounce';
import {
  collection,
  query,
  orderBy,
  limit,
  startAfter,
  getDocs,
  where,
  Query,
  DocumentData,
  QueryDocumentSnapshot,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import type { AdminAuditLog, Organization } from '@/lib/types';
import PageHeader from '@/components/page-header';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Loader2, CalendarIcon, Download, SlidersHorizontal, Info, X } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { exportToCSV } from '@/utils/csv';
import { useRouter } from 'next/navigation';
import { collections } from '@/lib/paths';
import { useToast } from '@/hooks/use-toast';

const PAGE_SIZE = 25;

export default function AdminAuditLogsPage() {
  const { user, isSuperAdmin, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [logs, setLogs] = useState<AdminAuditLog[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const [filters, setFilters] = useState({
    actionType: '',
    orgId: '',
    from: undefined as Date | undefined,
    to: undefined as Date | undefined,
  });
  const [debouncedFilters] = useDebounce(filters, 500);

  useEffect(() => {
    if (!isAuthLoading && !isSuperAdmin) {
      router.push('/dashboard');
    }
  }, [isSuperAdmin, isAuthLoading, router]);

  useEffect(() => {
    if (!isSuperAdmin) return;

    const orgsQuery = query(collection(db, 'organizations'), orderBy('name'));
    const unsub = onSnapshot(orgsQuery, (snap) => {
      setOrganizations(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Organization)));
    });
    return () => unsub();
  }, [isSuperAdmin]);

  const fetchLogs = async (loadMore = false) => {
      if (!isSuperAdmin) return;
      setIsLoading(true);

      let q: Query<DocumentData> = collection(db, collections.adminAuditLogs);

      if (debouncedFilters.actionType) q = query(q, where('actionType', '==', debouncedFilters.actionType));
      if (debouncedFilters.orgId) q = query(q, where('targetOrgId', '==', debouncedFilters.orgId));
      if (debouncedFilters.from) q = query(q, where('createdAt', '>=', debouncedFilters.from));
      if (debouncedFilters.to) q = query(q, where('createdAt', '<=', debouncedFilters.to));

      q = query(q, orderBy('createdAt', 'desc'), limit(PAGE_SIZE));

      if (loadMore && lastDoc) {
        q = query(q, startAfter(lastDoc));
      }

      try {
        const snapshot = await getDocs(q);
        const newLogs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as AdminAuditLog));
        
        setLogs(prev => loadMore ? [...prev, ...newLogs] : newLogs);
        setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
        setHasMore(snapshot.docs.length === PAGE_SIZE);
      } catch (error) {
        console.error("Error fetching audit logs:", error);
      } finally {
        setIsLoading(false);
      }
    };

  useEffect(() => {
    fetchLogs();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperAdmin, debouncedFilters]);
  
  const handleResetFilters = () => {
    setFilters({ actionType: '', orgId: '', from: undefined, to: undefined });
  };
  
  const handleExport = () => {
    if (logs.length === 0) {
      toast({
        title: "No Data to Export",
        description: "There are no logs matching the current filters.",
        variant: "destructive",
      });
      return;
    }
    const dataToExport = logs.map(log => ({
        date: log.createdAt ? format(log.createdAt.toDate(), 'yyyy-MM-dd HH:mm:ss') : '',
        action: log.actionType,
        performed_by: log.performedBy,
        target_organization: log.targetOrgName,
        target_user: log.targetUserEmail,
        details: JSON.stringify(log.details)
    }));
    exportToCSV(`audit_log_export_${new Date().toISOString()}.csv`, dataToExport);
  };

  const getActionBadgeVariant = (actionType: AdminAuditLog['actionType']) => {
    switch (actionType) {
      case 'IMPORT': return 'default';
      case 'INVITE_RESENT': return 'secondary';
      case 'USER_DEACTIVATED': return 'destructive';
      default: return 'outline';
    }
  };

  if (isAuthLoading || !isSuperAdmin) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <main className="flex-1 p-6 space-y-6">
      <PageHeader title="Admin Audit Log" description="Track key administrative actions across the platform." />
      <Card>
        <CardHeader>
          <CardTitle>Filter Logs</CardTitle>
          <CardDescription>
            Use the filters below to narrow down the audit trail.
          </CardDescription>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
             <Select value={filters.actionType} onValueChange={(v) => setFilters(f => ({ ...f, actionType: v === 'all_actions' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="All Actions" /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="all_actions">All Actions</SelectItem>
                    <SelectItem value="IMPORT">Import</SelectItem>
                    <SelectItem value="INVITE_RESENT">Invite Resent</SelectItem>
                    <SelectItem value="USER_DEACTIVATED">User Deactivated</SelectItem>
                    <SelectItem value="USER_ACTIVATED">User Activated</SelectItem>
                    <SelectItem value="USER_EDITED">User Edited</SelectItem>
                    <SelectItem value="ROLE_CHANGED">Role Changed</SelectItem>
                </SelectContent>
             </Select>
             <Select value={filters.orgId} onValueChange={(v) => setFilters(f => ({...f, orgId: v === 'all_orgs' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="All Organizations" /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="all_orgs">All Organizations</SelectItem>
                    {organizations.map(org => <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>)}
                </SelectContent>
             </Select>
             <Popover><PopoverTrigger asChild><Button variant="outline"><CalendarIcon className="mr-2 h-4 w-4" />{filters.from ? format(filters.from, "PPP") : <span>From Date</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={filters.from} onSelect={(d) => setFilters(f => ({...f, from: d}))} /></PopoverContent></Popover>
             <Popover><PopoverTrigger asChild><Button variant="outline"><CalendarIcon className="mr-2 h-4 w-4" />{filters.to ? format(filters.to, "PPP") : <span>To Date</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={filters.to} onSelect={(d) => setFilters(f => ({...f, to: d}))} /></PopoverContent></Popover>
          </div>
           <div className="flex gap-2 pt-2">
                <Button variant="ghost" size="sm" onClick={handleResetFilters}><X className="mr-2 h-4 w-4" />Reset</Button>
                <Button variant="outline" size="sm" onClick={handleExport} disabled={logs.length === 0}><Download className="mr-2 h-4 w-4" />Export to CSV</Button>
           </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Performed By</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && logs.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="h-24 text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin" /></TableCell></TableRow>
              ) : logs.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground"><Info className="mx-auto h-6 w-6 mb-2"/>No logs found for the selected filters.</TableCell></TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap" title={log.createdAt?.toDate ? format(log.createdAt.toDate(), 'PPpp') : 'No date'}>
                      {log.createdAt?.toDate ? formatDistanceToNow(log.createdAt.toDate(), { addSuffix: true }) : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getActionBadgeVariant(log.actionType)}>{log.actionType.replace('_', ' ')}</Badge>
                    </TableCell>
                    <TableCell>{log.performedBy}</TableCell>
                    <TableCell>
                        {log.targetOrgName && <div className="text-sm font-medium">{log.targetOrgName}</div>}
                        {log.targetUserEmail && <div className="text-xs text-muted-foreground">{log.targetUserEmail}</div>}
                    </TableCell>
                    <TableCell className="text-xs">{log.details.message || JSON.stringify(log.details)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          {hasMore && (
            <div className="text-center mt-4">
                <Button onClick={() => fetchLogs(true)} disabled={isLoading} variant="outline">
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                    Load More
                </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
