
import { createContext, useContext } from 'react';
import type { User } from '@/lib/types';

const LOCAL_FOCUS_ORG_ID = "LOCAL_FOCUS_ORG_ID";
const SUPER_ADMIN_EMAIL = "basil.khoury14@gmail.com";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isLocalFocus: boolean;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isEditor: boolean;
  isOrgAdmin: boolean;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isLocalFocus: false,
  isSuperAdmin: false,
  isAdmin: false,
  isEditor: false,
  isOrgAdmin: false,
});

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }

    // Failsafe check directly in the hook
    const isSuperAdminByEmail = context.user?.email === SUPER_ADMIN_EMAIL;
    const isSuperAdmin = context.isSuperAdmin || isSuperAdminByEmail;

    return {
      ...context,
      isSuperAdmin,
      isAdmin: isSuperAdmin || context.isAdmin,
      isEditor: isSuperAdmin || context.isEditor,
    };
};
