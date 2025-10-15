
'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { SearchQuery, SearchScope, User, Organization } from '@/lib/types';
import { FiltersSheet } from './FiltersSheet';

interface SearchBarProps {
  query: SearchQuery;
  setQuery: (query: SearchQuery) => void;
  allUsers: User[];
  organizations: Organization[];
}

export function SearchBar({ query, setQuery, allUsers, organizations }: SearchBarProps) {
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const handleClear = () => {
      setQuery({ ...query, term: '' });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search everything..."
          className="pl-8"
          value={query.term}
          onChange={(e) => setQuery({ ...query, term: e.target.value })}
        />
        {query.term && (
             <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={handleClear}>
                <X className="h-4 w-4" />
             </Button>
        )}
      </div>
      <div className="flex items-center justify-between gap-2">
        <ToggleGroup
          type="single"
          size="sm"
          variant="outline"
          value={query.scope}
          onValueChange={(scope: SearchScope) => scope && setQuery({ ...query, scope })}
          className="justify-start"
        >
          <ToggleGroupItem value="messages">Messages</ToggleGroupItem>
          <ToggleGroupItem value="users">Users</ToggleGroupItem>
          <ToggleGroupItem value="announcements">Announcements</ToggleGroupItem>
        </ToggleGroup>
        <Button variant="ghost" size="icon" onClick={() => setIsFiltersOpen(true)}>
          <SlidersHorizontal className="h-4 w-4" />
        </Button>
      </div>
      <FiltersSheet open={isFiltersOpen} onOpenChange={setIsFiltersOpen} query={query} setQuery={setQuery} allUsers={allUsers} organizations={organizations} />
    </div>
  );
}
