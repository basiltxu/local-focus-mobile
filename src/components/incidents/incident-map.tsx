"use client";

import { useState } from "react";
import { Map, Pin, AdvancedMarker, InfoWindow } from "@vis.gl/react-google-maps";
import type { Incident } from "@/lib/types";
import Link from "next/link";
import { Button } from "../ui/button";

interface IncidentMapProps {
  incidents: Incident[];
}

export function IncidentMap({ incidents }: IncidentMapProps) {
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(
    null
  );

  const center = { lat: 31.5, lng: 34.75 };

  const selectedIncident = incidents.find(
    (incident) => incident.id === selectedIncidentId
  );

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return (
        <div className="flex items-center justify-center h-full bg-muted">
            <p className="text-center text-muted-foreground p-4">
                Google Maps API Key is missing.
                <br />
                Please add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to your .env file.
            </p>
        </div>
    )
  }

  return (
    <Map
      defaultCenter={center}
      defaultZoom={8}
      mapId="local_focus_map"
      gestureHandling={"greedy"}
      disableDefaultUI={true}
      className="w-full h-full"
    >
      {incidents.map((incident) => (
        <AdvancedMarker
          key={incident.id}
          position={incident.coordinates}
          onClick={() => setSelectedIncidentId(incident.id)}
        >
          <Pin
            background={"hsl(var(--primary))"}
            borderColor={"hsl(var(--primary))"}
            glyphColor={"hsl(var(--primary-foreground))"}
          />
        </AdvancedMarker>
      ))}
      {selectedIncident && (
        <InfoWindow
          position={selectedIncident.coordinates}
          onCloseClick={() => setSelectedIncidentId(null)}
        >
          <div className="p-2 max-w-xs">
            <h3 className="font-bold text-base mb-1">{selectedIncident.title}</h3>
            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{selectedIncident.description}</p>
            <Button asChild size="sm" variant="outline">
              <Link href={`/incidents/${selectedIncident.id}`}>View Details</Link>
            </Button>
          </div>
        </InfoWindow>
      )}
    </Map>
  );
}
