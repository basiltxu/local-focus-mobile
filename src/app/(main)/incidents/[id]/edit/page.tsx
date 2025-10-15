
import EditIncidentPageClient from "./client";

// This is a server component that handles the params
export default function EditIncidentPage({ params }: { params: { id: string } }) {
  // We pass the id down to the client component
  return <EditIncidentPageClient id={params.id} />;
}
