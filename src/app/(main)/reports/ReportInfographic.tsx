'use client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ReportData } from '@/lib/types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

export function ReportInfographic({ report }: { report: ReportData }) {
  const categoryData = Object.entries(report.categoryCounts).map(
    ([name, value]) => ({ name, value })
  );
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Executive Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{report.narrativeSummary}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-1">
        <Card>
          <CardHeader>
            <CardTitle>Key Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Killed</p>
                <p className="text-2xl font-bold">{report.metrics.killed}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Injured</p>
                <p className="text-2xl font-bold">{report.metrics.injured}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Arrested</p>
                <p className="text-2xl font-bold">{report.metrics.arrested}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Rockets</p>
                <p className="text-2xl font-bold">{report.metrics.rockets}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Accidents</p>
                <p className="text-2xl font-bold">
                  {report.metrics.accidents}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-3">
        <Card>
          <CardHeader>
            <CardTitle>Incidents by Category</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-3">
        <Card>
          <CardHeader>
            <CardTitle>Most Important Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {report.importantEvents.map((event) => (
                <div key={event.title}>
                  <h3 className="font-semibold">{event.title}</h3>
                  <p className="text-muted-foreground">{event.summary}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
