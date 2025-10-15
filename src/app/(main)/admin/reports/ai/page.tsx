
"use client";

import { useEffect, useState, useMemo } from "react";
import { db, auth } from "@/lib/firebase";
import { collection, query, onSnapshot, orderBy, where, limit, deleteDoc, doc } from "firebase/firestore";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Loader2, Bot, Trash2, RefreshCcw, MoreHorizontal, Download, AlertTriangle, Lightbulb, ShieldCheck, BarChart } from "lucide-react";
import PageHeader from "@/components/page-header";
import { useToast } from "@/hooks/use-toast";
import { collections } from "@/lib/paths";
import { format, formatDistanceToNow } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import jsPDF from 'jspdf';
import 'jspdf-autotable';


type Report = {
  id: string;
  title: string;
  type: 'Weekly' | 'Monthly' | 'Custom';
  summary: string;
  createdAt: any;
  riskLevel?: string;
  recommendations?: string[];
  charts?: any;
  geo?: any;
  [key: string]: any;
};

export default function AiReportsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [latestReport, setLatestReport] = useState<Report | null>(null);
  const [pastReports, setPastReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const canManage = user?.organizationId === "LOCAL_FOCUS_ORG_ID" && ["Admin", "SuperAdmin"].includes(user.role);

  useEffect(() => {
    if (!user) {
        setLoading(false);
        return;
    }
    const q = query(
        collection(db, "ai_reports"), 
        where("organizationId", "==", user.organizationId),
        orderBy("createdAt", "desc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const fetchedReports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Report));
        setLatestReport(fetchedReports[0] || null);
        setPastReports(fetchedReports.slice(1));
        setLoading(false);
    }, (err) => {
        console.error("Error fetching reports:", err);
        setError("Failed to subscribe to AI reports.");
        setLoading(false);
    });
    
    return () => unsubscribe();
  }, [user]);

  const handleGenerate = async (type: 'Weekly' | 'Monthly' = 'Weekly') => {
    if (!auth.currentUser) {
        toast({ title: "Unauthorized", description: "You must be logged in.", variant: "destructive" });
        return;
    }
    setIsGenerating(true);
    setError(null);
    try {
        const idToken = await auth.currentUser.getIdToken();
        const res = await fetch("/api/ai/reports", {
            method: "POST",
            headers: { 'Authorization': `Bearer ${idToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ type })
        });
        
        if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.error || `Failed to generate report. Status: ${res.status}`);
        }
        
        const { report: newReport } = await res.json();
        toast({ title: "✅ Success", description: `${newReport.type} report generated.`});
    } catch (e: any) {
        setError(e.message);
        toast({ title: "❌ Generation Failed", description: e.message, variant: "destructive" });
    } finally {
        setIsGenerating(false);
    }
  };
  
  const handleDelete = async (reportId: string) => {
      if (!auth.currentUser || !window.confirm("Are you sure you want to delete this report?")) return;
      
      try {
        const idToken = await auth.currentUser.getIdToken();
        const res = await fetch(`/api/ai/reports/${reportId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${idToken}` }
        });
        if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.error || 'Failed to delete report.');
        }
        toast({ title: "Report Deleted", variant: "destructive" });
      } catch(e: any) {
          toast({ title: "Error", description: e.message, variant: "destructive"});
      }
  };

  const downloadPDF = (report: Report) => {
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text(report.title, 14, 22);
      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.text(`Generated on: ${format(report.createdAt.toDate(), 'PPP p')}`, 14, 30);
      
      const summaryLines = doc.splitTextToSize(report.summary, 180);
      (doc as any).autoTable({
          startY: 40,
          head: [['Executive Summary']],
          body: [[summaryLines.join('\n')]],
      });

      if (report.recommendations && report.recommendations.length > 0) {
        (doc as any).autoTable({
            head: [['Recommendations']],
            body: report.recommendations.map(rec => [rec]),
        });
      }
      
      doc.save(`${report.title.replace(/\s/g, '_')}.pdf`);
  };

  const getRiskColor = (level?: string) => {
      switch(level?.toLowerCase()) {
          case 'high': return 'text-red-500';
          case 'medium': return 'text-yellow-500';
          case 'low': return 'text-green-500';
          default: return 'text-muted-foreground';
      }
  };

  return (
    <main className="flex-1 p-6 space-y-6">
      <PageHeader title="AI-Generated Reports" description="Review automated summaries and insights from incident data.">
        {canManage && (
            <div className="flex gap-2">
                <Button onClick={() => handleGenerate('Weekly')} disabled={isGenerating}>
                    {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
                    New Weekly
                </Button>
                 <Button onClick={() => handleGenerate('Monthly')} disabled={isGenerating} variant="secondary">
                    {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
                    New Monthly
                </Button>
            </div>
        )}
      </PageHeader>
      
      {loading && (
          <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div>
      )}

      {!loading && error && (
          <Card className="border-destructive"><CardContent className="pt-6"><Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></CardContent></Card>
      )}

      {!loading && !error && !latestReport && (
          <Card><CardContent className="pt-6 text-center text-muted-foreground">No AI Reports found for your organization.</CardContent></Card>
      )}

      {latestReport && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <span className="flex items-center gap-2"><Bot className="h-6 w-6 text-primary" /> {latestReport.title}</span>
                        <Button variant="outline" size="sm" onClick={() => downloadPDF(latestReport)}><Download className="mr-2 h-4 w-4" /> Download PDF</Button>
                    </CardTitle>
                    <CardDescription>
                        Last generated: {formatDistanceToNow(latestReport.createdAt.toDate(), { addSuffix: true })}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <section>
                        <h3 className="font-semibold mb-2">Executive Summary</h3>
                        <p className="text-muted-foreground whitespace-pre-wrap">{latestReport.summary}</p>
                    </section>
                </CardContent>
            </Card>
             <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><AlertTriangle /> Risk Level</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className={`text-2xl font-bold ${getRiskColor(latestReport.riskLevel)}`}>{latestReport.riskLevel || 'Not Assessed'}</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Lightbulb /> Recommendations</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {latestReport.recommendations?.length > 0 ? (
                             <ul className="space-y-2 list-disc pl-5 text-muted-foreground">
                                {latestReport.recommendations.map((rec, i) => <li key={i}>{rec}</li>)}
                            </ul>
                        ) : <p className="text-sm text-muted-foreground">No specific recommendations.</p>}
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><BarChart /> Trends</CardTitle>
                    </CardHeader>
                    <CardContent>
                       <p className="text-sm text-muted-foreground">Detailed charts for categories and locations are in development.</p>
                    </CardContent>
                </Card>
            </div>
        </div>
      )}

      {pastReports.length > 0 && (
        <Card>
            <CardHeader>
                <CardTitle>Historical Reports</CardTitle>
                <CardDescription>Browse all previously generated AI reports.</CardDescription>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-64">
                    <Table>
                        <TableHeader><TableRow>
                            <TableHead>Title</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Generated At</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow></TableHeader>
                        <TableBody>
                            {pastReports.map((report) => (
                            <TableRow key={report.id}>
                                <TableCell className="font-medium">{report.title}</TableCell>
                                <TableCell>{report.type}</TableCell>
                                <TableCell>{report.createdAt?.toDate ? format(report.createdAt.toDate(), 'MMM d, yyyy p') : 'N/A'}</TableCell>
                                <TableCell className="text-right">
                                    {canManage && (
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal /></Button></DropdownMenuTrigger>
                                            <DropdownMenuContent>
                                                <DropdownMenuItem onClick={() => handleDelete(report.id)} className="text-destructive focus:text-destructive">
                                                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    )}
                                </TableCell>
                            </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </ScrollArea>
            </CardContent>
        </Card>
      )}
    </main>
  );
}
