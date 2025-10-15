
'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import type { Organization, User } from '@/lib/types';
import { Building, User as UserIcon } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

interface OrganizationTreeProps {
  organizations: Organization[];
  users: User[];
  onSelectUser: (user: User) => void;
}

export function OrganizationTree({ organizations, users, onSelectUser }: OrganizationTreeProps) {
  const { user: currentUser } = useAuth();
  
  return (
    <Accordion type="multiple" className="w-full p-4" defaultValue={currentUser?.organizationId ? [currentUser.organizationId] : []}>
      {organizations.map((org) => (
        <AccordionItem value={org.id} key={org.id}>
          <AccordionTrigger>
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4" />
              <span>{org.name}</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="pl-4">
              {users
                .filter((u) => u.organizationId === org.id && u.uid !== currentUser?.uid)
                .map((user) => (
                  <Button
                    key={user.uid}
                    variant="ghost"
                    className="w-full justify-start gap-2"
                    onClick={() => onSelectUser(user)}
                  >
                    <Avatar className="h-6 w-6">
                        <AvatarImage src={user.avatar} />
                        <AvatarFallback><UserIcon className="h-4 w-4"/></AvatarFallback>
                    </Avatar>
                    {user.name}
                  </Button>
                ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
