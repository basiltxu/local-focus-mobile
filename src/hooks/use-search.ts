
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useDebounce } from 'use-debounce';
import { SearchQuery, SearchScope, SearchResult } from '@/lib/types';
import * as searchService from '@/lib/search/searchService';
import { useAuth } from './use-auth';

const initialQuery: SearchQuery = {
  term: '',
  scope: 'messages',
};

export function useSearch() {
  const { user } = useAuth();
  const [query, setQuery] = useState<SearchQuery>(initialQuery);
  const [debouncedQuery] = useDebounce(query, 300);
  const [results, setResults] = useState<SearchResult<any>[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const executeSearch = useCallback(async (currentQuery: SearchQuery) => {
    if (!user || !currentQuery.term.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
        let searchResults: any[] = [];
        if (currentQuery.scope === 'messages') {
            const res = await searchService.searchMessages(currentQuery, user);
            if (res.length > 0) searchResults.push({ scope: 'messages', results: res });
        } else if (currentQuery.scope === 'users') {
            const res = await searchService.searchUsers(currentQuery, user);
            if (res.length > 0) searchResults.push({ scope: 'users', results: res });
        } else if (currentQuery.scope === 'announcements') {
            const res = await searchService.searchAnnouncements(currentQuery, user);
            if (res.length > 0) searchResults.push({ scope: 'announcements', results: res });
        }
        // In a multi-scope search, you would call all and combine them
        setResults(searchResults);
    } catch (e: any) {
      console.error("Search failed:", e);
      setError(e);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    executeSearch(debouncedQuery);
  }, [debouncedQuery, executeSearch]);

  const clear = () => {
    setQuery(initialQuery);
    setResults([]);
    setLoading(false);
  };

  return { query, setQuery, results, loading, error, clear };
}
