
'use client';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SearchQuery, Organization, User } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';

interface FiltersSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  query: SearchQuery;
  setQuery: (query: SearchQuery) => void;
  allUsers: User[];
  organizations: Organization[];
}

export function FiltersSheet({ open, onOpenChange, query, setQuery, allUsers, organizations }: FiltersSheetProps) {
    const { user, isLFPrivileged } = useAuth();
    
    const handleReset = () => {
        setQuery({
            ...query,
            from: undefined,
            to: undefined,
            orgIds: [],
            hasAttachments: undefined,
            senders: [],
        });
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent>
            <SheetHeader>
            <SheetTitle>Advanced Search Filters</SheetTitle>
            <SheetDescription>
                Refine your search results across messages, users, and announcements.
            </SheetDescription>
            </SheetHeader>
            <div className="grid gap-6 py-6">
                <div className="space-y-2">
                    <Label>Date Range</Label>
                    <div className="grid grid-cols-2 gap-2">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className={cn(!query.from && "text-muted-foreground")}>
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {query.from ? format(query.from, "PPP") : <span>From Date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={query.from} onSelect={(d) => setQuery({...query, from: d})} /></PopoverContent>
                        </Popover>
                         <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className={cn(!query.to && "text-muted-foreground")}>
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {query.to ? format(query.to, "PPP") : <span>To Date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={query.to} onSelect={(d) => setQuery({...query, to: d})} /></PopoverContent>
                        </Popover>
                    </div>
                </div>

                {isLFPrivileged && (
                     <div className="space-y-2">
                        <Label>Organization</Label>
                        {/* A multi-select component would be ideal here */}
                        <Select onValueChange={(v) => setQuery({...query, orgIds: v ? [v] : [] })}>
                             <SelectTrigger><SelectValue placeholder="All Organizations" /></SelectTrigger>
                             <SelectContent>
                                <SelectItem value="">All Organizations</SelectItem>
                                {organizations.map(org => <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>)}
                             </SelectContent>
                        </Select>
                    </div>
                )}
                
                {query.scope === 'messages' && (
                     <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                            <Label>Has Attachments</Label>
                            <p className="text-xs text-muted-foreground">Only show messages with attachments.</p>
                        </div>
                        <Switch checked={query.hasAttachments} onCheckedChange={(c) => setQuery({...query, hasAttachments: c})} />
                    </div>
                )}

                {isLFPrivileged && query.scope === 'messages' && (
                     <div className="space-y-2">
                        <Label>Sender</Label>
                         {/* A multi-select component would be ideal here */}
                        <Select onValueChange={(v) => setQuery({...query, senders: v ? [v] : []})}>
                             <SelectTrigger><SelectValue placeholder="Any Sender" /></SelectTrigger>
                             <SelectContent>
                                <SelectItem value="">Any Sender</SelectItem>
                                {allUsers.map(u => <SelectItem key={u.uid} value={u.uid}>{u.name}</SelectItem>)}
                             </SelectContent>
                        </Select>
                    </div>
                )}
            </div>
            <SheetFooter>
                <Button variant="outline" onClick={handleReset}>Reset</Button>
                <Button onClick={() => onOpenChange(false)}>Done</Button>
            </SheetFooter>
        </SheetContent>
        </Sheet>
    );
}
