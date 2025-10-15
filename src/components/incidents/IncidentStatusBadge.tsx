
'use client';

import { Badge } from "@/components/ui/badge";
import { IncidentStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const getStatusColor = (status: IncidentStatus) => {
    switch (status) {
      case 'Live': return 'bg-teal-500 text-white';
      case 'Published': return 'bg-green-500 text-white';
      case 'Approved': return 'bg-blue-500 text-white';
      case 'Review': return 'bg-yellow-500 text-black';
      case 'Draft': return 'bg-gray-500 text-white';
      case 'Closed': return 'bg-red-500 text-white';
      default: return 'bg-gray-200 text-gray-800';
    }
};

interface IncidentStatusBadgeProps {
    status: IncidentStatus;
    className?: string;
}

export function IncidentStatusBadge({ status, className }: IncidentStatusBadgeProps) {
    return (
        <Badge className={cn('capitalize', getStatusColor(status), className)}>
            {status}
        </Badge>
    );
}
