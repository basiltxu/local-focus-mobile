
'use client';

import { MessageSquare } from 'lucide-react';

export function EmptyState() {
  return (
    <div className="flex flex-col h-full items-center justify-center bg-muted/50 p-8 text-center">
      <MessageSquare className="h-16 w-16 text-muted-foreground" />
      <h3 className="mt-4 text-xl font-semibold">Select a chat to start messaging</h3>
      <p className="mt-2 text-muted-foreground">
        Choose a conversation from the left panel or start a new one from the directory.
      </p>
    </div>
  );
}
