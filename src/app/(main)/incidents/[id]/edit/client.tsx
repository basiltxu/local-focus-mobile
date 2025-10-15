
'use client';

import PageHeader from "@/components/page-header";
import { IncidentForm } from "@/components/incidents/incident-form";
import { Card, CardContent } from "@/components/ui/card";
import { notFound, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Incident } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";

export default function EditIncidentPageClient({ id }: { id: string }) {
  const [incident, setIncident] = useState<Incident | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const docRef = doc(db, "incidents", id);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setIncident({
            id: docSnap.id,
            ...data,
            date: data.createdAt.toDate(),
          } as Incident);
        } else {
          notFound();
        }
        setIsLoading(false);
    }, (error) => {
        console.error("Error fetching incident:", error);
        setIsLoading(false);
        notFound();
    });

    return () => unsubscribe();
  }, [id]);

  const handleSuccess = () => {
    router.push(`/incidents/${id}`);
  };

  if (isLoading) {
    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            <PageHeader
                title="Edit Incident"
                description="Loading incident details..."
                showBackButton
            />
            <Card>
                <CardContent className="pt-6">
                    <div className="space-y-8">
                        <Skeleton className="h-10 w-1/2" />
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <div className="grid grid-cols-2 gap-8">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
  }

  if (!incident) {
    return null;
  }
  
  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Edit Incident"
        description={`Editing report #${incident.id}`}
        showBackButton
      />
      <Card>
        <CardContent className="pt-6">
          <IncidentForm incident={incident} onSuccess={handleSuccess} />
        </CardContent>
      </Card>
    </div>
  );
}
