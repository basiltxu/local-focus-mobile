
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useChats } from '@/hooks/use-chats';
import { useOrgUsers } from '@/hooks/use-org-users';
import { ChatListItem } from '@/components/chat/ChatListItem';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { EmptyState } from '@/components/chat/EmptyState';
import { CreateGroupModal } from '@/components/admin/messages/CreateGroupModal';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Loader2, MessageSquare, Users } from 'lucide-react';
import type { Chat, User } from '@/lib/types';
import { AnnouncementsTab } from '@/components/admin/messages/AnnouncementsTab';
import { useChatMessages } from '@/hooks/use-chat-messages';
import { useToast } from '@/hooks/use-toast';
import { useRouter, useSearchParams } from 'next/navigation';
import { OrganizationTree } from '@/components/admin/organizations/OrganizationTree';

export default function MessagesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  const { chats, isLoading: isLoadingChats, startOrOpenDM } = useChats();
  const { messages, isLoading: isLoadingMessages } = useChatMessages(activeChatId);
  const { allUsers, organizations, isLoading: isLoadingUsers } = useOrgUsers();
  
  const handleSelectChat = useCallback((chatId: string) => {
    router.push('/admin/messages');
    setActiveChatId(chatId);
  }, [router]);
  
  const handleStartDM = useCallback(async (peerUser: User) => {
      if (!user || !peerUser) return;
      try {
          const chatId = await startOrOpenDM(peerUser);
          setActiveChatId(chatId);
      } catch (error: any) {
          toast({ title: "Error", description: `Could not start direct message: ${error.message}`, variant: "destructive" });
          console.error(error);
      }
  }, [user, startOrOpenDM, toast]);

  useEffect(() => {
    const chatIdFromQuery = searchParams.get('chatId');
    if (chatIdFromQuery && chatIdFromQuery !== activeChatId) {
      setActiveChatId(chatIdFromQuery);
    }
  }, [searchParams, activeChatId]);

  const activeChat = useMemo(() => chats.find((c) => c.id === activeChatId), [chats, activeChatId]);

  const { groupChats, dms } = useMemo(() => {
    const groupChats: Chat[] = [];
    const dms: Chat[] = [];
    chats.forEach(c => c.isGroup ? groupChats.push(c) : dms.push(c));
    return { groupChats, dms };
  }, [chats]);

  if (isLoadingChats || isLoadingUsers || !user) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-full bg-background">
      <ResizablePanelGroup direction="horizontal" className="h-full items-stretch">
        <ResizablePanel defaultSize={30} minSize={20} maxSize={40} className="flex flex-col">
          <div className="p-4 border-b">
            <h2 className="text-xl font-bold">Messages</h2>
          </div>
          <Tabs defaultValue="chats" className="flex-1 flex flex-col">
            <TabsList className="mx-4 mt-4">
              <TabsTrigger value="chats">Chats</TabsTrigger>
              <TabsTrigger value="orgs">Directory</TabsTrigger>
              <TabsTrigger value="announcements">Announcements</TabsTrigger>
            </TabsList>
            <TabsContent value="chats" className="flex-1 overflow-y-auto">
              <div className="p-4 flex justify-end">
                <CreateGroupModal allUsers={allUsers} onGroupCreated={setActiveChatId} />
              </div>
              <ScrollArea className="h-full">
                <Accordion type="multiple" defaultValue={['groups', 'dms']} className="w-full">
                    <AccordionItem value="groups">
                      <AccordionTrigger className="px-4"><div className="flex items-center gap-2"><Users className="h-4 w-4"/> Groups</div></AccordionTrigger>
                      <AccordionContent>
                        {groupChats.length === 0 ? <p className="px-4 text-sm text-muted-foreground">No groups yet.</p> :
                          groupChats.map((chat) => (
                            <ChatListItem key={chat.id} chat={chat} isActive={chat.id === activeChatId} onSelect={() => handleSelectChat(chat.id)} />
                          ))
                        }
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="dms">
                      <AccordionTrigger className="px-4"><div className="flex items-center gap-2"><MessageSquare className="h-4 w-4"/> Direct Messages</div></AccordionTrigger>
                      <AccordionContent>
                        {dms.length === 0 ? <p className="px-4 text-sm text-muted-foreground">No direct messages yet.</p> :
                          dms.map((chat) => (
                            <ChatListItem key={chat.id} chat={chat} isActive={chat.id === activeChatId} onSelect={() => handleSelectChat(chat.id)} />
                          ))
                        }
                      </AccordionContent>
                    </AccordionItem>
                </Accordion>
              </ScrollArea>
            </TabsContent>
            <TabsContent value="orgs" className="flex-1 overflow-y-auto">
                <OrganizationTree 
                    organizations={organizations}
                    users={allUsers}
                    onSelectUser={handleStartDM}
                />
            </TabsContent>
            <TabsContent value="announcements" className="flex-1 overflow-y-auto">
              <AnnouncementsTab />
            </TabsContent>
          </Tabs>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={70} minSize={30}>
          {activeChat ? (
            <ChatWindow
              key={activeChat.id} // Re-mount when chat changes
              chat={activeChat}
              messages={messages}
              isLoadingMessages={isLoadingMessages}
            />
          ) : (
            <EmptyState />
          )}
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
