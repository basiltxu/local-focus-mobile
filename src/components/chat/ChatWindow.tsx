
'use client';

import { useRef, useEffect, useMemo } from 'react';
import { ChatHeader } from './ChatHeader';
import { ChatInput } from './ChatInput';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2 } from 'lucide-react';
import type { Chat, Message } from '@/lib/types';
import { useTypingIndicator } from '@/hooks/use-typing-indicator';
import { TypingIndicator } from './TypingIndicator';
import { useAuth } from '@/hooks/use-auth';
import { SeenByAvatars } from './SeenByAvatars';

interface ChatWindowProps {
  chat: Chat;
  messages: Message[];
  isLoadingMessages: boolean;
}

export function ChatWindow({ chat, messages, isLoadingMessages }: ChatWindowProps) {
  const { user } = useAuth();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { typingUsers, indicateTyping } = useTypingIndicator(chat.id);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollAreaRef.current) {
      setTimeout(() => {
        if(scrollAreaRef.current) {
           scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
        }
      }, 100); // Small delay to allow images to render
    }
  }, [messages, typingUsers]);

  const renderedMessages = useMemo(() => {
    return messages.map((msg, index) => {
      const isSender = msg.senderId === user?.uid;
      const showAvatar = !isSender && (index === 0 || messages[index - 1]?.senderId !== msg.senderId);
      const senderDetails = chat.participantDetails?.find(p => p.uid === msg.senderId);

      return (
        <div key={msg.id} className={`flex items-start gap-3 ${isSender ? 'justify-end' : 'justify-start'}`}>
          {!isSender && (
            <div className="w-8 h-8">
            {showAvatar && senderDetails && (
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm">
                {senderDetails.name[0]}
              </div>
            )}
            </div>
          )}
          <div className={`max-w-xs lg:max-w-md p-3 rounded-lg ${isSender ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
            {!isSender && showAvatar && <p className="text-xs font-bold mb-1">{msg.senderName}</p>}
            
            {msg.attachments?.[0]?.type === 'image' && (
              <img src={msg.attachments[0].url} alt={msg.attachments[0].name} className="rounded-md max-w-full h-auto mb-2" />
            )}
            
            {msg.text && <p className="text-sm whitespace-pre-wrap">{msg.text}</p>}

            {msg.attachments?.[0]?.type === 'file' && (
                <a href={msg.attachments[0].url} target="_blank" rel="noopener noreferrer" className="text-sm underline mt-2 block">
                  {msg.attachments[0].name}
                </a>
             )}
            
            <div className="flex items-center justify-end gap-2 mt-1">
              <p className="text-xs opacity-70">{msg.createdAt?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
              {isSender && <SeenByAvatars seenByUids={msg.seenBy.filter(uid => uid !== user.uid)} participants={chat.participantDetails || []} />}
            </div>
          </div>
        </div>
      )
    });
  }, [messages, user, chat.participantDetails]);

  return (
    <div className="flex flex-col h-full">
      <ChatHeader chat={chat} />
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
            <div ref={scrollAreaRef} className="p-4 space-y-4">
            {isLoadingMessages ? (
                <div className="flex justify-center items-center h-full">
                <Loader2 className="h-8 w-8 animate-spin" />
                </div>
            ) : (
                renderedMessages
            )}
             <TypingIndicator typingUsers={typingUsers} />
            </div>
        </ScrollArea>
      </div>
      <ChatInput chatId={chat.id} onTyping={indicateTyping} />
    </div>
  );
}
