'use client';

import { useMemo } from 'react';
import { useAuth } from './use-auth';
import { User } from '@/lib/types';

export function useCanViewAIReports(user: User | null): boolean {
  return useMemo(() => {
    if (!user) return false;
    return (
      user.role === "SuperAdmin" ||
      user.role === "Admin" ||
      user.role === "Editor" ||
      user.canViewAiReports === true
    );
  }, [user]);
}
