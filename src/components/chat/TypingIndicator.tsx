
'use client';

import { TypingUser } from '@/lib/types';

interface TypingIndicatorProps {
  typingUsers: TypingUser[];
}

export function TypingIndicator({ typingUsers }: TypingIndicatorProps) {
  if (typingUsers.length === 0) {
    return null;
  }

  const names = typingUsers.map(u => u.name).join(', ');
  const verb = typingUsers.length > 1 ? 'are' : 'is';

  return (
    <div className="text-xs text-muted-foreground italic px-2 py-1">
      {names} {verb} typing...
    </div>
  );
}
