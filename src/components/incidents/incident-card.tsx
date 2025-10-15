

import Link from "next/link";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import type { Incident } from "@/lib/types";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "../ui/button";
import { Edit, Trash2 } from "lucide-react";
import { IncidentStatusSelector } from "./incident-status-selector";
import { cn } from "@/lib/utils";
import { IncidentStatusBadge } from "./IncidentStatusBadge";

interface IncidentCardProps {
  incident: Incident;
  showAdminActions?: boolean;
  onDelete?: (id: string) => void;
  onEdit?: (incident: Incident) => void;
}

export function IncidentCard({ incident, showAdminActions = false, onDelete, onEdit }: IncidentCardProps) {
  const placeholderImage = PlaceHolderImages.find(p => p.id === incident.imageId);
  const date = incident.updatedAt?.toDate ? incident.updatedAt.toDate() : new Date();
  
  return (
    <Card className="flex flex-col overflow-hidden transition-all hover:shadow-md">
        <div className="relative aspect-video w-full">
          <Link href={`/incidents/${incident.id}`} className="block h-full w-full group">
              {placeholderImage ? (
                <Image
                  src={placeholderImage.imageUrl}
                  alt={incident.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  data-ai-hint={placeholderImage.imageHint}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-muted">
                  <span className="text-muted-foreground">No image</span>
                </div>
              )}
              <div className="absolute top-2 right-2 flex gap-1">
                  <Badge variant={incident.visibility === 'public' ? 'secondary' : 'outline'} className="capitalize">{incident.visibility}</Badge>
              </div>
          </Link>
        </div>
        <CardHeader>
          <Link href={`/incidents/${incident.id}`} className="group">
            <CardTitle className="font-headline text-lg leading-tight group-hover:text-primary transition-colors">
              {incident.title}
            </CardTitle>
          </Link>
        </CardHeader>
        <CardContent className="flex-grow">
           <p className="text-sm text-muted-foreground line-clamp-2">{incident.description}</p>
        </CardContent>
        <CardFooter className="flex justify-between items-center text-xs text-muted-foreground">
          <span>
            {formatDistanceToNow(date, { addSuffix: true })}
          </span>
           {showAdminActions && onDelete ? (
             <div className="flex items-center gap-1 z-10">
                <IncidentStatusSelector incident={incident} />
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit?.(incident)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDelete(incident.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
             </div>
           ) : <IncidentStatusBadge status={incident.status} />}
        </CardFooter>
    </Card>
  );
}
    