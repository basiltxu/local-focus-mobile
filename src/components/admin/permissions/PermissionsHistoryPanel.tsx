
'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { usePermissionHistory } from '@/hooks/usePermissionHistory';
import { format, formatDistanceToNow } from 'date-fns';
import { CalendarIcon, User, Building, Info, FileDown, Printer, X, Server } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ALL_PERMISSIONS } from '@/lib/permissions';
import { exportHistoryToCSV, openHistoryPrintView } from '@/utils/export-history';
import { useDebounce } from 'use-debounce';

interface PermissionsHistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  initialFilters?: { orgId?: string; userId?: string };
}

const getInitialState = (filters?: { orgId?: string; userId?: string }) => ({
  orgId: filters?.orgId || '',
  userId: filters?.userId || '',
  actorEmail: '',
  key: '',
  scope: '',
  from: undefined as Date | undefined,
  to: undefined as Date | undefined,
});

export function PermissionsHistoryPanel({ isOpen, onClose, initialFilters }: PermissionsHistoryPanelProps) {
  const [filters, setFilters] = useState(getInitialState(initialFilters));
  const [debouncedFilters] = useDebounce(filters, 500);

  const { logs, isLoading, error, hasMore, loadMore } = usePermissionHistory(debouncedFilters);
  
  useEffect(() => {
    setFilters(getInitialState(initialFilters));
  }, [initialFilters, isOpen]);

  const handleClearFilters = () => setFilters(getInitialState());

  const filterSummary = useMemo(() => {
      const parts = [];
      if (debouncedFilters.orgId) parts.push('Org');
      if (debouncedFilters.userId) parts.push('User');
      if (debouncedFilters.from || debouncedFilters.to) parts.push('Date Range');
      if (debouncedFilters.actorEmail) parts.push('Actor');
      if (debouncedFilters.key) parts.push('Permission Key');
      if (debouncedFilters.scope) parts.push('Scope');
      return parts.length > 0 ? parts.join(', ') : 'None';
  }, [debouncedFilters]);

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl p-0 flex flex-col">
        <SheetHeader className="p-6 pb-4 border-b">
          <SheetTitle>Permissions Audit Trail</SheetTitle>
          <SheetDescription>Track all permission changes across organizations and users.</SheetDescription>
        </SheetHeader>
        
        {/* Filters */}
        <div className="p-4 border-b">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Popover><PopoverTrigger asChild><Button variant="outline" className={cn("justify-start", !filters.from && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{filters.from ? format(filters.from, "PPP") : <span>From Date</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={filters.from} onSelect={(d) => setFilters(f => ({...f, from: d}))} /></PopoverContent></Popover>
                <Popover><PopoverTrigger asChild><Button variant="outline" className={cn("justify-start", !filters.to && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{filters.to ? format(filters.to, "PPP") : <span>To Date</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={filters.to} onSelect={(d) => setFilters(f => ({...f, to: d}))} /></PopoverContent></Popover>
                <Input placeholder="Actor email..." value={filters.actorEmail} onChange={e => setFilters(f => ({ ...f, actorEmail: e.target.value }))} />
                <Select value={filters.key} onValueChange={(v) => setFilters(f => ({...f, key: v}))}><SelectTrigger><SelectValue placeholder="All Permissions" /></SelectTrigger><SelectContent>{ALL_PERMISSIONS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select>
                <Select value={filters.scope} onValueChange={(v) => setFilters(f => ({...f, scope: v}))}><SelectTrigger><SelectValue placeholder="All Scopes" /></SelectTrigger><SelectContent><SelectItem value="organization">Organization</SelectItem><SelectItem value="user">User</SelectItem></SelectContent></Select>
            </div>
             <Button variant="link" size="sm" onClick={handleClearFilters} className="mt-2 px-0 h-auto"><X className="mr-1 h-3 w-3" />Clear Filters</Button>
        </div>

        {/* Timeline */}
        <ScrollArea className="flex-1">
          <div className="p-6 space-y-6">
            {isLoading && logs.length === 0 && Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
            {!isLoading && logs.length === 0 && <div className="text-center py-10"><Info className="mx-auto h-8 w-8 text-muted-foreground" /><p className="mt-2 text-sm text-muted-foreground">No history found for the selected filters.</p></div>}
            {error && <div className="text-destructive p-4">Error: {error.message}</div>}
            
            {logs.map(log => (
              <div key={log.id} className="flex gap-4">
                <Avatar><AvatarFallback>{log.actorEmail.slice(0,2).toUpperCase()}</AvatarFallback></Avatar>
                <div className="flex-1 space-y-2 border-b pb-4">
                    <p className="text-sm">
                        <span className="font-semibold">{log.actorEmail}</span> performed action <Badge variant="secondary">{log.action}</Badge>
                    </p>
                     <p className="text-xs text-muted-foreground flex items-center gap-2">
                        {log.scope === 'user' ? <User className="h-3 w-3" /> : <Building className="h-3 w-3" />}
                        Target: {log.scope === 'user' ? (log.userEmail || 'N/A') : log.orgName}
                    </p>
                    <div className="flex flex-wrap gap-1">
                        {log.changed.map(c => (
                             <Badge key={c.key} variant="outline">
                                {c.key}: {String(c.from)} → {String(c.to)}
                            </Badge>
                        ))}
                    </div>
                     <p className="text-xs text-muted-foreground">{formatDistanceToNow(log.createdAt.toDate(), { addSuffix: true })}</p>
                </div>
              </div>
            ))}
            {hasMore && (
                <div className="text-center">
                    <Button variant="outline" onClick={loadMore} disabled={isLoading}>
                        {isLoading ? 'Loading...' : 'Load More'}
                    </Button>
                </div>
            )}
          </div>
        </ScrollArea>
        
        <SheetFooter className="p-4 border-t gap-2">
            <Button variant="secondary" onClick={() => exportHistoryToCSV(logs)} disabled={logs.length === 0}>
                <FileDown className="mr-2 h-4 w-4" /> Export CSV
            </Button>
            <Button variant="secondary" onClick={() => openHistoryPrintView(logs, filterSummary)} disabled={logs.length === 0}>
                <Printer className="mr-2 h-4 w-4" /> Print
            </Button>
            <Button onClick={onClose}>Close</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
