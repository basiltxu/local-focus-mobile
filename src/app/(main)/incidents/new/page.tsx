
'use client';
import PageHeader from "@/components/page-header";
import { IncidentForm } from "@/components/incidents/incident-form";
import { Card, CardContent } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";

export default function NewIncidentPage() {
  const router = useRouter();
  const { isLocalFocus, isAdmin, isEditor } = useAuth();

  const handleSuccess = (incidentId?: string) => {
    // Redirect to a confirmation page or the main incidents page after submission
    if (incidentId) {
      router.push(`/incidents/${incidentId}`);
    } else {
      router.push('/incidents');
    }
  };

  const isReviewer = isLocalFocus && (isAdmin || isEditor);

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Report New Incident"
        description="Fill out the details below to submit a new incident."
        showBackButton
      />
      {!isReviewer && (
        <Alert className="mb-6">
          <Info className="h-4 w-4" />
          <AlertTitle>Review Process</AlertTitle>
          <AlertDescription>
            This incident will be submitted for review by Local Focus editors before publication.
          </AlertDescription>
        </Alert>
      )}
      <Card>
        <CardContent className="pt-6">
          <IncidentForm onSuccess={handleSuccess} />
        </CardContent>
      </Card>
    </div>
  );
}
