
'use client';

import { Button } from '@/components/ui/button';
import { SearchX } from 'lucide-react';

interface EmptyStateProps {
    onClear: () => void;
}

export function EmptyState({ onClear }: EmptyStateProps) {
  return (
    <div className="py-10 px-4 text-center">
      <SearchX className="mx-auto h-12 w-12 text-muted-foreground" />
      <h3 className="mt-2 text-lg font-semibold">No Results Found</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Try adjusting your search or filter criteria.
      </p>
      <Button variant="link" onClick={onClear} className="mt-4">
        Clear Search
      </Button>
    </div>
  );
}
