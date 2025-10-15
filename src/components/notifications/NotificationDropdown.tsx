
'use client';

import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, BellRing, BellOff } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { markAsRead, markAllAsRead } from '@/lib/notification-utils';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { Notification } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';

interface NotificationDropdownProps {
  notifications: Notification[];
  isLoading: boolean;
  error: Error | null;
}

export function NotificationDropdown({ notifications, isLoading, error }: NotificationDropdownProps) {
    const { user } = useAuth();
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (error) {
    return <p className="p-4 text-sm text-destructive">Error loading notifications.</p>;
  }

  const handleMarkAllRead = () => {
    if(user) {
        markAllAsRead(user.uid);
    }
  }

  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold">Notifications</CardTitle>
        <Button variant="link" size="sm" onClick={handleMarkAllRead} className="text-primary">
          Mark all as read
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <BellOff className="h-12 w-12 text-muted-foreground" />
              <p className="mt-4 text-muted-foreground">You have no new notifications.</p>
            </div>
          ) : (
            notifications.map(notif => (
              <div
                key={notif.id}
                className={cn('flex items-start gap-4 p-4 border-b', !notif.read && 'bg-muted/50')}
                onClick={() => markAsRead(notif.id)}
              >
                <div className="mt-1">
                  <BellRing className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium">{notif.title}</p>
                  <p className="text-sm text-muted-foreground">{notif.message}</p>
                   {notif.link && (
                    <Button variant="link" asChild className="p-0 h-auto">
                        <Link href={notif.link}>View Details</Link>
                    </Button>
                   )}
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(notif.createdAt.toDate(), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
      <CardFooter className="py-2">
        <Button variant="ghost" size="sm" className="w-full">
            View all notifications
        </Button>
      </CardFooter>
    </Card>
  );
}
