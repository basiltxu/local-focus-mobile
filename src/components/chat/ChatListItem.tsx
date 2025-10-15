
'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { Chat } from '@/lib/types';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { Users } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

interface ChatListItemProps {
  chat: Chat;
  isActive: boolean;
  onSelect: () => void;
}

export function ChatListItem({ chat, isActive, onSelect }: ChatListItemProps) {
    const { user } = useAuth();
    if(!user) return null;

    const unreadCount = chat.unreadCount?.[user.uid] || 0;

    const getChatDetails = () => {
        if (chat.isGroup) {
            return { name: chat.name || "Group Chat", avatar: null, isOnline: false };
        }
        const peer = chat.participantDetails?.find(p => p.uid !== user.uid);
        return { 
            name: peer?.name || "Direct Message",
            avatar: peer?.avatar,
            isOnline: peer?.presence?.state === 'online',
        };
    };

    const details = getChatDetails();

    return (
        <div
            onClick={onSelect}
            className={cn(
                "flex items-start gap-4 p-4 cursor-pointer hover:bg-muted/50",
                isActive && "bg-muted"
            )}
        >
            <Avatar className="h-12 w-12 relative">
                {details.avatar ? <AvatarImage src={details.avatar} alt={details.name} /> : <Users className="h-6 w-6 m-auto"/>}
                <AvatarFallback>{details.name?.[0]}</AvatarFallback>
                {details.isOnline && <span className="absolute bottom-0 right-0 block h-3 w-3 rounded-full bg-green-500 ring-2 ring-background" />}
            </Avatar>
            <div className="flex-1 overflow-hidden">
                <div className="flex justify-between items-baseline">
                    <p className="font-semibold truncate">{details.name}</p>
                    {chat.lastMessageAt && <p className="text-xs text-muted-foreground whitespace-nowrap">{formatDistanceToNow(chat.lastMessageAt.toDate(), { addSuffix: true })}</p>}
                </div>
                <div className="flex justify-between items-start mt-1">
                    <p className={cn("text-sm text-muted-foreground truncate", unreadCount > 0 && "font-bold text-foreground")}>
                        {chat.lastMessageText || 'No messages yet'}
                    </p>
                    {unreadCount > 0 && <Badge>{unreadCount}</Badge>}
                </div>
            </div>
        </div>
    );
}
