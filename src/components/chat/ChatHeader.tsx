
'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { Chat } from '@/lib/types';
import { Users, MoreVertical } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '../ui/button';
// Assume these modals will be created
// import { ManageMembersModal } from './ManageMembersModal';
// import { RenameGroupModal } from './RenameGroupModal';
import { useState } from 'react';

interface ChatHeaderProps {
  chat: Chat;
}

export function ChatHeader({ chat }: ChatHeaderProps) {
    const { user, isSuperAdmin, isAdmin } = useAuth();
    const [isManagingMembers, setIsManagingMembers] = useState(false);
    const [isRenamingGroup, setIsRenamingGroup] = useState(false);

    const getChatDetails = () => {
        if (!user) return { name: "Chat", avatar: null, isOnline: false };
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
    
    const canManageGroup = chat.isGroup && user && (isSuperAdmin || isAdmin || chat.admins?.includes(user.uid));

    return (
        <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 relative">
                    {details.avatar ? <AvatarImage src={details.avatar} alt={details.name} /> : <Users className="h-5 w-5 m-auto"/>}
                    <AvatarFallback>{details.name?.[0]}</AvatarFallback>
                    {details.isOnline && <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-background" />}
                </Avatar>
                <div>
                    <h3 className="font-semibold text-lg">{details.name}</h3>
                    {chat.isGroup && <p className="text-xs text-muted-foreground">{chat.participants.length} members</p>}
                </div>
            </div>
            
            {canManageGroup && (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <MoreVertical className="h-5 w-5" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => setIsRenamingGroup(true)}>Rename Group</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setIsManagingMembers(true)}>Manage Members</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive">Delete Group</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            )}

            {/*
            {isRenamingGroup && <RenameGroupModal chat={chat} onOpenChange={setIsRenamingGroup} />}
            {isManagingMembers && <ManageMembersModal chat={chat} onOpenChange={setIsManagingMembers} />}
            */}
        </div>
    );
}
