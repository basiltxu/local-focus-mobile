
'use client';

import { useAnnouncements } from '@/hooks/use-announcements';
import { useAuth } from '@/hooks/use-auth';
import { Loader2, Rss } from 'lucide-react';
import { format } from 'date-fns';

export function AnnouncementsTab() {
  const { user } = useAuth();
  const { announcements, isLoading } = useAnnouncements(user);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {announcements.length === 0 ? (
        <p className="text-center text-muted-foreground">No announcements found.</p>
      ) : (
        announcements.map((announcement) => (
          <div key={announcement.id} className="p-4 bg-muted rounded-lg">
            <div className="flex items-center justify-between">
              <h4 className="font-bold flex items-center gap-2"><Rss className="h-4 w-4"/> {announcement.title}</h4>
              <p className="text-xs text-muted-foreground">
                {format(announcement.createdAt.toDate(), 'MMM d, yyyy')}
              </p>
            </div>
            <p className="text-sm mt-2">{announcement.content}</p>
          </div>
        ))
      )}
    </div>
  );
}
