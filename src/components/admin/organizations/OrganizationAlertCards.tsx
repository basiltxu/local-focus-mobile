
'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building, ShieldQuestion, UserX, UserCheck } from 'lucide-react';
import type { Organization } from '@/lib/types';

interface OrganizationAlertCardsProps {
  organizations: Organization[];
}

export function OrganizationAlertCards({ organizations }: OrganizationAlertCardsProps) {
  const stats = useMemo(() => {
    return {
      total: organizations.length,
      missingAdmin: organizations.filter(org => org.type === 'external' && !org.hasOrgAdmin).length,
      quotaReached: organizations.filter(org => org.currentUsers >= org.maxUsers).length,
      inactive: organizations.filter(org => !org.isActive).length,
    };
  }, [organizations]);

  const cards = [
    { title: 'Total Organizations', value: stats.total, icon: Building, color: 'text-blue-500' },
    { title: 'Missing Admins', value: stats.missingAdmin, icon: ShieldQuestion, color: 'text-yellow-500' },
    { title: 'Quota Reached', value: stats.quotaReached, icon: UserX, color: 'text-red-500' },
    { title: 'Inactive Orgs', value: stats.inactive, icon: UserCheck, color: 'text-gray-500' },
  ];

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <card.icon className={`h-4 w-4 ${card.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
