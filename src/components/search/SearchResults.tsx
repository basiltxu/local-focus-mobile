
'use client';
import { SearchQuery, SearchResult, MessageSearchResult, User, Announcement } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { MessageSquare, User as UserIcon, Rss } from 'lucide-react';
import { Highlight } from './Highlight';

interface SearchResultsProps {
  results: SearchResult<any>[];
  query: SearchQuery;
  onSelectChat: (chatId: string) => void;
  onSelectUser: (user: User) => void;
}

export function SearchResults({ results, query, onSelectChat, onSelectUser }: SearchResultsProps) {
    const renderMessageResult = (item: MessageSearchResult) => (
        <div key={item.id} className="p-3 flex items-start gap-3 cursor-pointer hover:bg-muted" onClick={() => onSelectChat(item.chatId)}>
            <Avatar className="h-9 w-9"><AvatarFallback><MessageSquare className="h-5 w-5" /></AvatarFallback></Avatar>
            <div className="flex-1 overflow-hidden">
                <div className="flex justify-between items-baseline">
                    <p className="font-semibold truncate text-sm">{item.chatName}</p>
                    <p className="text-xs text-muted-foreground whitespace-nowrap">{formatDistanceToNow(item.createdAt.toDate(), { addSuffix: true })}</p>
                </div>
                <p className="text-xs text-muted-foreground truncate">{item.senderName}</p>
                <p className="text-sm text-muted-foreground mt-1"><Highlight text={item.snippet} highlight={query.term} /></p>
            </div>
        </div>
    );
    
    const renderUserResult = (item: User) => (
        <div key={item.uid} className="p-3 flex items-center gap-3 cursor-pointer hover:bg-muted" onClick={() => onSelectUser(item)}>
            <Avatar className="h-9 w-9"><AvatarImage src={item.avatar} /><AvatarFallback>{item.name?.[0]}</AvatarFallback></Avatar>
            <div className="flex-1 overflow-hidden">
                 <p className="font-semibold truncate text-sm"><Highlight text={item.name} highlight={query.term} /></p>
                 <p className="text-xs text-muted-foreground truncate"><Highlight text={item.email} highlight={query.term} /></p>
            </div>
            <Badge variant="outline">{item.role}</Badge>
        </div>
    );
    
    const renderAnnouncementResult = (item: Announcement) => (
        <div key={item.id} className="p-3 flex items-start gap-3 cursor-pointer hover:bg-muted">
            <Avatar className="h-9 w-9"><AvatarFallback><Rss className="h-5 w-5" /></AvatarFallback></Avatar>
            <div className="flex-1 overflow-hidden">
                <div className="flex justify-between items-baseline">
                    <p className="font-semibold truncate text-sm"><Highlight text={item.title} highlight={query.term} /></p>
                    <p className="text-xs text-muted-foreground whitespace-nowrap">{item.createdAt && formatDistanceToNow(item.createdAt.toDate(), { addSuffix: true })}</p>
                </div>
                <p className="text-xs text-muted-foreground truncate">by {item.createdByName}</p>
                <p className="text-sm text-muted-foreground mt-1"><Highlight text={item.content.substring(0, 100)} highlight={query.term} /></p>
            </div>
        </div>
    );

    const renderers = {
        messages: renderMessageResult,
        users: renderUserResult,
        announcements: renderAnnouncementResult,
    };

    return (
        <div className="py-2">
            {results.map(section => (
                <div key={section.scope}>
                    <h4 className="text-xs uppercase font-bold text-muted-foreground px-3 py-2">{section.scope}</h4>
                    <div>
                        {section.results.map(item => renderers[section.scope](item))}
                    </div>
                </div>
            ))}
        </div>
    );
}
