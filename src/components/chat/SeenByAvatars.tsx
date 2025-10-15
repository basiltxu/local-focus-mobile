
'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { User } from '@/lib/types';

interface SeenByAvatarsProps {
  seenByUids: string[];
  participants: User[]; // A list of all participants in the chat for lookup
}

export function SeenByAvatars({ seenByUids, participants }: SeenByAvatarsProps) {
  const seenByUsers = seenByUids.map(uid => participants.find(p => p.uid === uid)).filter(Boolean);

  if (seenByUsers.length === 0) {
    return null;
  }

  const maxVisible = 4;
  const visibleAvatars = seenByUsers.slice(0, maxVisible);
  const hiddenCount = seenByUsers.length - maxVisible;

  return (
    <TooltipProvider>
      <div className="flex items-center -space-x-2">
        {visibleAvatars.map(user => (
          <Tooltip key={user!.uid}>
            <TooltipTrigger asChild>
              <Avatar className="h-5 w-5 border-2 border-background">
                <AvatarImage src={user!.avatar} />
                <AvatarFallback>{user!.name[0]}</AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent>Seen by {user!.name}</TooltipContent>
          </Tooltip>
        ))}
        {hiddenCount > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Avatar className="h-5 w-5 border-2 border-background">
                <AvatarFallback>+{hiddenCount}</AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent>{hiddenCount} more</TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}
