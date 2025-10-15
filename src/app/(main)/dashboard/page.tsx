
'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PlusCircle, ArrowRight, Loader2 } from 'lucide-react';
import { format, getMonth } from 'date-fns';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, Query, where, or } from 'firebase/firestore';
import type { Incident, IncidentStatus } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { IncidentDialog } from '@/components/incidents/incident-dialog';
import { useToast } from '@/hooks/use-toast';
import { collections } from '@/lib/paths';

export default function DashboardPage() {
  const { user, isEditor } = useAuth();
  const { toast } = useToast();

  const [stats, setStats] = useState({ total: 0, Live: 0, Approved: 0, Published: 0, Review: 0, Draft: 0, Closed: 0 });
  const [chartData, setChartData] = useState<any[]>([]);
  const [recentIncidents, setRecentIncidents] = useState<Incident[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardData = useCallback(() => {
    // Manual refetch placeholder if needed
  }, []);

  useEffect(() => {
    if (!user) return;
    setIsLoading(true);
    
    let incidentsQuery: Query;
    if (isEditor) { // isEditor includes Admins and SuperAdmins
        incidentsQuery = query(collection(db, collections.incidents), orderBy("createdAt", "desc"));
    } else {
        incidentsQuery = query(
            collection(db, collections.incidents), 
            or(
              where("createdBy", "==", user.uid),
              where("visibility", "==", "public")
            ),
            orderBy("createdAt", "desc")
        );
    }
    
    const unsubscribe = onSnapshot(incidentsQuery, (snapshot) => {
        const allIncidents = snapshot.docs.map(d => ({ id: d.id, ...d.data(), date: (d.data().createdAt as any)?.toDate() } as Incident));

        const statusCounts = allIncidents.reduce((acc, incident) => {
          const statusKey = incident.status || 'Draft';
          acc[statusKey] = (acc[statusKey] || 0) + 1;
          return acc;
        }, {} as Record<IncidentStatus, number>);

        setStats({ 
          total: allIncidents.length, 
          Draft: statusCounts.Draft || 0,
          Review: statusCounts.Review || 0,
          Approved: statusCounts.Approved || 0,
          Published: statusCounts.Published || 0,
          Live: statusCounts.Live || 0,
          Closed: statusCounts.Closed || 0,
        });

        const monthlyIncidents = allIncidents.reduce((acc, incident) => {
            if (incident.date) {
                const month = getMonth(new Date(incident.date));
                acc[month] = (acc[month] || 0) + 1;
            }
            return acc;
        }, new Array(12).fill(0));

        const newChartData = Array.from({ length: 12 }, (_, i) => ({
            name: format(new Date(0, i), 'MMM'),
            incidents: monthlyIncidents[i],
        }));
        setChartData(newChartData);

        setRecentIncidents(allIncidents.slice(0, 4));
        setIsLoading(false);
    }, (error) => {
        console.error("Error fetching dashboard data:", error);
        toast({ title: 'Error', description: 'Could not fetch dashboard data.', variant: 'destructive' });
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user, isEditor, toast]);


  const statsCards = [
    { title: 'Total Incidents', value: stats.total.toLocaleString(), key: 'total' },
    { title: 'Published / Live', value: (stats.Published + stats.Live).toLocaleString(), key: 'published' },
    { title: 'Awaiting Review', value: stats.Review.toLocaleString(), key: 'review' },
    { title: 'Drafts', value: stats.Draft.toLocaleString(), key: 'drafts' },
  ];

  if (isLoading && !user) {
    return (
       <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <main className="flex-1 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
            <h2 className="text-2xl font-bold">Dashboard</h2>
            <p className="text-muted-foreground">Welcome back, {user?.name}. Here's what's happening.</p>
        </div>
        <IncidentDialog 
            onIncidentCreated={fetchDashboardData}
            defaultStatus="Published"
            defaultVisibility="public"
        >
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            New Incident
          </Button>
        </IncidentDialog>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((card) => (
          <Card key={card.key}>
            <CardContent className="p-6">
                {isLoading ? (
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-8 w-1/2" />
                    </div>
                ) : (
                    <>
                    <p className="text-sm text-muted-foreground">{card.title}</p>
                    <p className="text-3xl font-bold">{card.value}</p>
                    </>
                )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Incident Trends</CardTitle>
            <CardDescription>Monthly incident report trends.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            {isLoading ? <Skeleton className="h-full w-full" /> : (
                <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                    <defs>
                    <linearGradient id="colorIncidents" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} allowDecimals={false} />
                    <Tooltip
                    contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        borderColor: 'hsl(var(--border))',
                    }}
                    />
                    <Area
                    type="monotone"
                    dataKey="incidents"
                    stroke="hsl(var(--primary))"
                    fill="url(#colorIncidents)"
                    strokeWidth={2}
                    dot={false}
                    />
                </AreaChart>
                </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Recent Incidents</CardTitle>
                    <CardDescription>Latest reported events.</CardDescription>
                </div>
                <Button asChild variant="link" className="text-primary">
                    <Link href="/incidents">View All <ArrowRight className="ml-2 h-4 w-4"/></Link>
                </Button>
            </CardHeader>
            <CardContent>
                <div className="grid gap-4">
                    {isLoading ? (
                        <div className="space-y-4">
                           <Skeleton className="h-10 w-full" />
                           <Skeleton className="h-10 w-full" />
                           <Skeleton className="h-10 w-full" />
                           <Skeleton className="h-10 w-full" />
                        </div>
                    ) : recentIncidents.map(incident => (
                         <Link key={incident.id} href={`/incidents/${incident.id}`} className="block p-3 rounded-lg hover:bg-muted -mx-3">
                            <p className="font-semibold truncate">{incident.title}</p>
                            <p className="text-sm text-muted-foreground">{incident.location}</p>
                        </Link>
                    ))}
                     {!isLoading && recentIncidents.length === 0 && (
                        <p className="text-sm text-center text-muted-foreground py-4">No incidents found.</p>
                     )}
                </div>
            </CardContent>
        </Card>
      </div>
    </main>
  );
}
