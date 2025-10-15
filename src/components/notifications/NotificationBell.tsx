
'use client';

import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useNotifications } from '@/hooks/use-notifications';
import { NotificationDropdown } from './NotificationDropdown';
import { useUnreadCount } from '@/hooks/use-unread-count';

export function NotificationBell() {
  const { notifications, isLoading, error } = useNotifications();
  const { totalUnreadCount } = useUnreadCount();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {totalUnreadCount > 0 && (
            <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-xs text-destructive-foreground">
              {totalUnreadCount > 9 ? '9+' : totalUnreadCount}
            </span>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <NotificationDropdown notifications={notifications} isLoading={isLoading} error={error} />
      </PopoverContent>
    </Popover>
  );
}
