
'use client';

import { useAuth } from './use-auth';

/**
 * A hook to centralize the logic for determining the current user's role and privileges.
 * This makes role checks in components cleaner and more consistent.
 */
export const useCurrentUserRole = () => {
  const { user, isLocalFocus, isSuperAdmin, isAdmin, isEditor, isLoading } = useAuth();

  const isLFPrivileged = isLocalFocus && (isSuperAdmin || isAdmin || isEditor);

  return {
    isReady: !isLoading,
    user,
    uid: user?.uid,
    organizationId: user?.organizationId,
    isLFPrivileged,
    isLFSuperAdmin: isSuperAdmin,
    isLFAdmin: isAdmin,
    isLFEditor: isEditor,
  };
};
