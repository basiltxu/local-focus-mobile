
'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import {
  collection,
  collectionGroup,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, MessageSquare, Check, MoreHorizontal, Trash2, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Quote, QuoteStatus } from '@/lib/types';
import PageHeader from '@/components/page-header';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { ApproveQuoteDialog } from '@/components/quotes/ApproveQuoteDialog';
import { collections } from '@/lib/paths';

export default function AdminQuotesPage() {
  const { user, isEditor, isSuperAdmin, isAdmin } = useAuth();
  const { toast } = useToast();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [dialogAction, setDialogAction] = useState<'view' | 'approve' | 'create' | null>(null);

  const canManage = isEditor || isAdmin || isSuperAdmin;

  useEffect(() => {
    if (!user) return;

    setIsLoading(true);
    let q;

    try {
      if (user.role === 'SuperAdmin' || user.role === 'Admin') {
        q = query(collectionGroup(db, collections.quotes), orderBy('createdAt', 'desc'));
      } else if (user.organizationId) {
        q = query(
          collection(db, `organizations/${user.organizationId}/${collections.quotes}`),
          orderBy('createdAt', 'desc')
        );
      } else {
        setIsLoading(false);
        setQuotes([]);
        return;
      }
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
          const quotesData = snapshot.docs.map(d => ({
            id: d.id,
            _path: d.ref.path, 
            ...d.data(),
          } as Quote));
          setQuotes(quotesData);
          setIsLoading(false);
      }, (error) => {
          console.error("Error fetching quotes:", error);
          toast({ title: 'Error fetching quotes', description: error.message, variant: 'destructive' });
          setIsLoading(false);
      });

      return () => unsubscribe();

    } catch (err: any) {
        console.error(err);
        toast({ title: 'Error', description: 'Unable to load quotes.', variant: 'destructive' });
        setIsLoading(false);
    }
  }, [user, toast]);

  const handleStatusChange = async (quote: Quote, status: QuoteStatus) => {
    if (!quote._path) {
        toast({ title: 'Error', description: 'Quote path is missing.', variant: 'destructive'});
        return;
    }
    const quoteRef = doc(db, quote._path);
    const updateData = { status, updatedAt: serverTimestamp() };
    
    try {
      await updateDoc(quoteRef, updateData);
      toast({ title: 'Status Updated', description: `Quote status set to ${status}.` });
    } catch (e: any) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: quote._path,
          operation: 'update',
          requestResourceData: updateData,
      }));
    }
  };

  const openDialog = (quote: Quote, action: 'view' | 'approve') => {
    setSelectedQuote(quote);
    setDialogAction(action);
  };
  
  const handleDeleteQuote = async (quote: Quote) => {
      if (!quote._path || !window.confirm("Are you sure you want to delete this quote request?")) return;
      try {
          await deleteDoc(doc(db, quote._path));
          toast({ title: "Quote Deleted", variant: "destructive"});
      } catch (e: any) {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
              path: quote._path,
              operation: 'delete',
          }));
      }
  };

  const getStatusVariant = (status: QuoteStatus) => {
    switch (status) {
      case 'approved':
        return 'default';
      case 'rejected':
        return 'destructive';
      case 'in_progress':
        return 'secondary';
      case 'pending':
      default:
        return 'outline';
    }
  };

  return (
    <main className="flex-1 p-6">
      <PageHeader
        title="Manage Quote Requests"
        description="Review and respond to service requests from organizations."
      />
      <Card>
        <CardHeader>
          <CardTitle>All Quote Requests</CardTitle>
          <CardDescription>
            There are {quotes.length} quote requests in total.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-64 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : quotes.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              No quote requests found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Organization / Contact</TableHead>
                  <TableHead>Services</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotes.map((quote) => (
                  <TableRow key={quote.id}>
                    <TableCell className="text-muted-foreground">
                        {quote.createdAt?.toDate ? format(quote.createdAt.toDate(), 'MMM d, yyyy') : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{quote.organizationName}</div>
                      <div className="text-sm text-muted-foreground">{quote.createdByName} ({quote.createdBy})</div>
                    </TableCell>
                    <TableCell className="max-w-xs">
                        <div className="flex flex-wrap gap-1">
                            {quote.services && quote.services.map((service: string) => (
                                <Badge key={service} variant="secondary" className="capitalize text-xs">
                                    {service}
                                </Badge>
                            ))}
                        </div>
                    </TableCell>
                    <TableCell>
                       <Select
                          value={quote.status}
                          onValueChange={(value: QuoteStatus) => handleStatusChange(quote, value)}
                          disabled={!canManage || quote.status === 'approved'}
                        >
                          <SelectTrigger className="w-[130px] h-8 text-xs">
                            <SelectValue>
                                 <Badge variant={getStatusVariant(quote.status)} className="capitalize">{quote.status.replace('_', ' ')}</Badge>
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="approved" disabled>Approved</SelectItem>
                            <SelectItem value="rejected">Rejected</SelectItem>
                          </SelectContent>
                        </Select>
                    </TableCell>
                    <TableCell className="text-right">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon"><MoreHorizontal /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                {quote.status === 'pending' && canManage && (
                                    <DropdownMenuItem onSelect={() => openDialog(quote, 'approve')}>
                                        <Check className="mr-2 h-4 w-4" /> Approve & Create Org
                                    </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onSelect={() => openDialog(quote, 'view')}>
                                    <MessageSquare className="mr-2 h-4 w-4" /> View Details
                                </DropdownMenuItem>
                                {quote.orgId && (
                                    <DropdownMenuItem asChild>
                                        <a href={`/admin/organizations?orgId=${quote.orgId}`} target="_blank" rel="noopener noreferrer">
                                            <ExternalLink className="mr-2 h-4 w-4" /> View Organization
                                        </a>
                                    </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                {canManage && (
                                    <DropdownMenuItem onSelect={() => handleDeleteQuote(quote)} className="text-destructive focus:text-destructive">
                                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                                    </DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      
      {dialogAction === 'approve' && selectedQuote && (
        <ApproveQuoteDialog
          quote={selectedQuote}
          isOpen={true}
          onClose={() => setDialogAction(null)}
        />
      )}
    </main>
  );
}
