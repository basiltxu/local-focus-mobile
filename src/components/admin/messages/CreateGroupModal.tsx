
'use client';

import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, UserPlus } from 'lucide-react';
import type { User } from '@/lib/types';
import { createGroupChat } from '@/lib/chat-utils';
import { useAuth } from '@/hooks/use-auth';

interface CreateGroupModalProps {
  allUsers: User[];
  onGroupCreated: (chatId: string) => void;
}

export function CreateGroupModal({ allUsers, onGroupCreated }: CreateGroupModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedUids, setSelectedUids] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredUsers = allUsers.filter(
    (u) => u.uid !== user?.uid && u.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleToggleUser = (uid: string) => {
    setSelectedUids((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(uid)) {
        newSet.delete(uid);
      } else {
        newSet.add(uid);
      }
      return newSet;
    });
  };

  const handleCreateGroup = useCallback(async () => {
    if (!groupName.trim() || selectedUids.size === 0 || !user) {
      toast({
        title: 'Missing Information',
        description: 'Group name and at least one other participant are required.',
        variant: 'destructive',
      });
      return;
    }
    setIsSubmitting(true);
    try {
      const newChatId = await createGroupChat(groupName, Array.from(selectedUids), user);
      toast({ title: 'Group Created', description: `Group "${groupName}" was successfully created.` });
      onGroupCreated(newChatId);
      setIsOpen(false);
      setGroupName('');
      setSelectedUids(new Set());
      setSearchTerm('');
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  }, [groupName, selectedUids, user, toast, onGroupCreated]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline"><UserPlus className="mr-2 h-4 w-4" /> New Group</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Group Chat</DialogTitle>
          <DialogDescription>Select participants and give your group a name.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <Input
            placeholder="Group Name"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
          />
          <Input
            placeholder="Search for users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <ScrollArea className="h-64 border rounded-md">
            <div className="p-4 space-y-2">
              {filteredUsers.map((u) => (
                <div key={u.uid} className="flex items-center justify-between">
                  <Label htmlFor={u.uid} className="flex-1 cursor-pointer p-2">
                    {u.name}
                  </Label>
                  <Checkbox
                    id={u.uid}
                    checked={selectedUids.has(u.uid)}
                    onCheckedChange={() => handleToggleUser(u.uid)}
                  />
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateGroup} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Group
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
