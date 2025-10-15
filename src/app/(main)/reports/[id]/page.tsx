
'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Report, ReportData } from '@/lib/types';
import PageHeader from '@/components/page-header';
import { notFound } from 'next/navigation';
import { ReportInfographic } from '../ReportInfographic';

export default function ReportPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { user } = useAuth();
  const [report, setReport] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchReport = async () => {
      if (!user) return;
      setIsLoading(true);
      const reportRef = doc(db, 'reports', id);
      
      try {
        const reportSnap = await getDoc(reportRef);
        if (!reportSnap.exists()) {
          return notFound();
        }
        const reportData = reportSnap.data() as Report;
        setReport(reportData.data);
      } catch(e) {
        console.log("Firestore action allowed in dev mode. Error:", e);
        notFound();
      } finally {
        setIsLoading(false);
      }
    };
    fetchReport();
  }, [id, user]);

  if (!user) {
    return null;
  }

  return (
    <main className="flex-1 p-6">
      <PageHeader
        title="AI Infographic Report"
        description="An AI-powered infographic report based on the latest incidents."
        showBackButton
      />
      <div className="mt-6">
        {report ? (
          <ReportInfographic report={report} />
        ) : isLoading ? (
          <Card>
            <CardHeader>
              <CardTitle>Loading Report</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin" />
                <p>Please wait while the report is being loaded...</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>No Report Data</CardTitle>
            </CardHeader>
            <CardContent>
              <p>The report data could not be loaded.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
