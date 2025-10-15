
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
  collectionGroup,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { collections } from '@/lib/paths';
import type { AdminAuditLog, Organization, Quote } from '@/lib/types';
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
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  BarChart,
  Bar,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { format, subDays, eachDayOfInterval } from 'date-fns';
import { Loader2, Building, UserPlus, Mail, UserX, Upload, ExternalLink, Send, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

// Helper to get last 30 days
const getLast30Days = () => {
    const endDate = new Date();
    const startDate = subDays(endDate, 29);
    return { startDate, endDate };
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export default function AdminOverviewPage() {
  const { user, isSuperAdmin, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [stats, setStats] = useState({
      orgCount: 0,
      newUsers: 0,
      invitesSent: 0,
      deactivations: 0,
      imports: 0,
      totalQuotes: 0,
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [actionBreakdown, setActionBreakdown] = useState<any[]>([]);
  const [importsByOrg, setImportsByOrg] = useState<any[]>([]);
  const [quotesByStatus, setQuotesByStatus] = useState<any[]>([]);
  const [recentLogs, setRecentLogs] = useState<AdminAuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSendingReport, setIsSendingReport] = useState(false);

  // Redirect if not SuperAdmin
  useEffect(() => {
    if (!isAuthLoading && !isSuperAdmin) {
      router.replace('/dashboard');
    }
  }, [isAuthLoading, isSuperAdmin, router]);

  // Data fetching
  useEffect(() => {
    if (!isSuperAdmin) return;

    setIsLoading(true);
    const { startDate } = getLast30Days();
    const startTimestamp = Timestamp.fromDate(startDate);
    
    // --- Combined listeners for multiple collections ---
    const listeners: (() => void)[] = [];

    // 1. Admin Audit Logs Listener
    const logsQuery = query(
      collection(db, collections.adminAuditLogs),
      where('createdAt', '>=', startTimestamp),
      orderBy('createdAt', 'desc')
    );
    const unsubLogs = onSnapshot(logsQuery, (snapshot) => {
        const logs = snapshot.docs.map(d => d.data() as AdminAuditLog);
        setRecentLogs(logs.slice(0, 10));

        const newStats = logs.reduce((acc, log) => {
            if (log.actionType === 'IMPORT') acc.imports++;
            if (log.actionType === 'INVITE_RESENT') acc.invitesSent++;
            if (log.actionType === 'USER_DEACTIVATED') acc.deactivations++;
            if (log.actionType === 'IMPORT' && log.details?.success) {
                acc.newUsers += log.details.success;
            }
            return acc;
        }, { imports: 0, invitesSent: 0, deactivations: 0, newUsers: 0 });
        
        const days = eachDayOfInterval({ start: startDate, end: new Date() });
        const dailyData = days.map(day => {
            const formattedDay = format(day, 'MMM d');
            const dayLogs = logs.filter(log => format(log.createdAt.toDate(), 'MMM d') === formattedDay);
            return {
                date: formattedDay,
                Imports: dayLogs.filter(l => l.actionType === 'IMPORT').length,
                Invites: dayLogs.filter(l => l.actionType === 'INVITE_RESENT').length,
                Deactivations: dayLogs.filter(l => l.actionType === 'USER_DEACTIVATED').length,
            };
        });
        setChartData(dailyData);
        
        const breakdown = logs.reduce((acc, log) => {
            acc[log.actionType] = (acc[log.actionType] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        setActionBreakdown(Object.entries(breakdown).map(([name, value]) => ({ name, value })));

        const orgImports = logs.filter(l => l.actionType === 'IMPORT' && l.details?.success).reduce((acc, log) => {
            const orgName = log.targetOrgName || 'Unknown Org';
            acc[orgName] = (acc[orgName] || 0) + log.details.success!;
            return acc;
        }, {} as Record<string, number>);
        setImportsByOrg(Object.entries(orgImports).map(([name, count]) => ({ name, count })));

        setStats(prev => ({...prev, ...newStats}));
    });
    listeners.push(unsubLogs);

    // 2. Organizations Listener
    const orgsQuery = query(collection(db, collections.organizations));
    const unsubOrgs = onSnapshot(orgsQuery, (snapshot) => {
      setStats(prev => ({ ...prev, orgCount: snapshot.size }));
    });
    listeners.push(unsubOrgs);

    // 3. Quotes Listener
    const quotesQuery = query(collectionGroup(db, 'quotes'));
    const unsubQuotes = onSnapshot(quotesQuery, (snapshot) => {
        const quotes = snapshot.docs.map(d => d.data() as Quote);
        setStats(prev => ({ ...prev, totalQuotes: quotes.length }));

        const statusCounts = quotes.reduce((acc, quote) => {
            acc[quote.status] = (acc[quote.status] || 0) + 1;
            return acc;
        }, { pending: 0, approved: 0, rejected: 0, in_progress: 0 } as Record<string, number>);
        
        setQuotesByStatus(Object.entries(statusCounts).map(([status, count]) => ({ status, count })));
    });
    listeners.push(unsubQuotes);
    
    setIsLoading(false);
    
    return () => {
        listeners.forEach(unsub => unsub());
    };

  }, [isSuperAdmin]);


  const getActionBadgeVariant = (actionType: AdminAuditLog['actionType']) => {
    switch (actionType) {
      case 'IMPORT': return 'default';
      case 'INVITE_RESENT': return 'secondary';
      case 'USER_DEACTIVATED': return 'destructive';
      default: return 'outline';
    }
  };
  
  const handleEmailReport = async () => {
    setIsSendingReport(true);
    // In a real app, this would call an API to generate and send the report.
    // For now, we'll simulate it with a delay and a toast message.
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    toast({
        title: "Report Sent",
        description: "The SuperAdmin overview report has been sent to your email.",
    });

    setIsSendingReport(false);
  };


  if (isAuthLoading || !isSuperAdmin) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const statCards = [
      { title: 'Total Orgs', value: stats.orgCount, icon: Building },
      { title: 'Total Quotes', value: stats.totalQuotes, icon: MessageSquare },
      { title: 'New Users Added', value: stats.newUsers, icon: UserPlus },
      { title: 'Invites Re-sent', value: stats.invitesSent, icon: Mail },
      { title: 'Imports This Month', value: stats.imports, icon: Upload },
      { title: 'Deactivations', value: stats.deactivations, icon: UserX, color: 'text-destructive' },
  ];
  

  return (
    <main className="flex-1 p-6 space-y-6">
      <PageHeader
        title="SuperAdmin Overview"
        description="System-wide activity and analytics for the last 30 days."
      >
        <Button variant="outline" onClick={handleEmailReport} disabled={isSendingReport}>
            {isSendingReport ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            {isSendingReport ? 'Sending...' : 'Email This Report Now'}
        </Button>
      </PageHeader>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map(card => (
            <Card key={card.title}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                    <card.icon className={`h-4 w-4 text-muted-foreground ${card.color || ''}`} />
                </CardHeader>
                <CardContent>
                    {isLoading ? <Loader2 className="h-6 w-6 animate-spin"/> : <div className="text-2xl font-bold">{card.value}</div>}
                </CardContent>
            </Card>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
            <CardHeader>
                <CardTitle>Activity Trends (Last 30 Days)</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
               {isLoading ? <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin"/></div> : (
                 <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false}/>
                        <YAxis fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}/>
                        <Legend />
                        <Area type="monotone" dataKey="Imports" stackId="1" stroke="#8884d8" fill="#8884d8" />
                        <Area type="monotone" dataKey="Invites" stackId="1" stroke="#82ca9d" fill="#82ca9d" />
                        <Area type="monotone" dataKey="Deactivations" stackId="1" stroke="#ffc658" fill="#ffc658" />
                    </AreaChart>
                </ResponsiveContainer>
               )}
            </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle>Quote Status</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
                {isLoading ? <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin"/></div> : (
                 <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={quotesByStatus} layout="vertical" margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" allowDecimals={false} />
                        <YAxis type="category" dataKey="status" fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}/>
                        <Bar dataKey="count" name="Quotes" fill="hsl(var(--primary))" />
                    </BarChart>
                </ResponsiveContainer>
               )}
            </CardContent>
        </Card>
         <Card className="lg:col-span-3">
            <CardHeader>
                <CardTitle>Users Imported per Organization (Last 30 Days)</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
                 {isLoading ? <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin"/></div> : (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={importsByOrg} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} interval={0} angle={-30} textAnchor="end" height={80} />
                            <YAxis fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                            <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}/>
                            <Bar dataKey="count" name="Imported Users" fill="hsl(var(--primary))" />
                        </BarChart>
                    </ResponsiveContainer>
                 )}
            </CardContent>
        </Card>
      </div>
      
       {/* Recent Activity Table */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
            <div>
                <CardTitle>Recent Admin Activity</CardTitle>
                <CardDescription>A log of the last 10 administrative actions.</CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
                <Link href="/admin/audit-logs"><ExternalLink className="mr-2 h-4 w-4"/> View Full Log</Link>
            </Button>
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
                    {isLoading ? (
                        <TableRow><TableCell colSpan={5} className="text-center py-10"><Loader2 className="h-6 w-6 animate-spin mx-auto"/></TableCell></TableRow>
                    ) : recentLogs.length === 0 ? (
                        <TableRow><TableCell colSpan={5} className="text-center py-10">No recent activity.</TableCell></TableRow>
                    ) : (
                        recentLogs.map(log => (
                            <TableRow key={log.id}>
                                <TableCell className="text-xs text-muted-foreground">{format(log.createdAt.toDate(), 'PP p')}</TableCell>
                                <TableCell><Badge variant={getActionBadgeVariant(log.actionType)}>{log.actionType.replace('_', ' ')}</Badge></TableCell>
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
        </CardContent>
      </Card>
    </main>
  );
}

    