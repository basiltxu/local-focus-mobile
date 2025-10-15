
'use client';

import { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, Paperclip } from 'lucide-react';
import { sendMessage } from '@/lib/chat-utils';
import { useAuth } from '@/hooks/use-auth';
import { AttachmentInput } from './AttachmentInput';
import { useToast } from '@/hooks/use-toast';

interface ChatInputProps {
  chatId: string;
  onTyping: () => void;
}

export function ChatInput({ chatId, onTyping }: ChatInputProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [text, setText] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);

  const handleSend = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || (!text.trim() && !attachment)) return;

    try {
        await sendMessage({ chatId, text, sender: user, attachment });
        setText('');
        setAttachment(null);
    } catch(err: any) {
        toast({ title: "Error", description: `Could not send message: ${err.message}`, variant: "destructive" });
    }
  }, [chatId, text, user, attachment, toast]);
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          handleSend(e as any);
      } else {
          onTyping();
      }
  }

  return (
    <form onSubmit={handleSend} className="p-4 border-t bg-card">
       {attachment && (
            <div className="text-sm p-2 bg-muted rounded-md mb-2">
                Attachment: {attachment.name}
                <Button variant="ghost" size="sm" onClick={() => setAttachment(null)}>&times;</Button>
            </div>
        )}
      <div className="relative">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="pr-20"
        />
        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center">
            <AttachmentInput onFileSelect={setAttachment} />
          <Button type="submit" size="icon" variant="ghost">
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </form>
  );
}
