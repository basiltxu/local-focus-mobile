
'use client';

import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Logo2 } from '@/components/logo2';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Settings,
  LogOut,
  Search,
  ClipboardList,
  ListTree,
  ShieldAlert,
  Home,
  Quote,
  MessageSquare,
  Database,
  ShieldCheck,
  Building,
  Mail,
  Bot,
  History,
} from 'lucide-react';
import { UserNav } from '@/components/user-nav';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/use-auth';
import { auth } from '@/lib/firebase';
import { useEffect, useMemo } from 'react';
import type { Role } from '@/lib/types';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { NotificationPermissionManager } from '@/components/auth/NotificationPermissionManager';
import { useCanViewAIReports } from '@/hooks/useRole';

const allNavItems = [
  // General User
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['SuperAdmin', 'Admin', 'Editor', 'User', 'orgAdmin'] as Role[], testId: 'nav-dashboard' },
  { name: 'Incidents', href: '/incidents', icon: ShieldAlert, roles: ['SuperAdmin', 'Admin', 'Editor', 'User', 'orgAdmin'] as Role[], testId: 'nav-incidents' },
  { name: 'AI Reports', href: '/admin/reports/ai', icon: Bot, roles: ['SuperAdmin', 'Admin', 'Editor', 'User', 'orgAdmin'] as Role[], specialCondition: 'canViewAIReports', testId: 'nav-ai-reports' },
  { name: 'Messages', href: '/admin/messages', icon: MessageSquare, roles: ['SuperAdmin', 'Admin', 'Editor', 'User', 'orgAdmin'] as Role[], testId: 'nav-messages' },
  
  // Admin Section
  { name: 'Admin', isSection: true, roles: ['SuperAdmin', 'Admin', 'Editor', 'orgAdmin'] as Role[] },
  { name: 'Overview', href: '/admin/overview', icon: Home, roles: ['SuperAdmin'] as Role[], testId: 'nav-admin-overview' },
  { name: 'Accounts', href: '/admin/accounts', icon: Users, roles: ['SuperAdmin', 'Admin', 'orgAdmin'] as Role[], testId: 'nav-admin-accounts' },
  { name: 'Organizations', href: '/admin/organizations', icon: Building, roles: ['SuperAdmin', 'Admin'], testId: 'nav-admin-organizations' },
  { name: 'Manage Incidents', href: '/admin/incidents', icon: ClipboardList, roles: ['SuperAdmin', 'Admin', 'Editor'] as Role[], testId: 'nav-admin-incidents' },
  { name: 'Categories', href: '/admin/categories', icon: ListTree, roles: ['SuperAdmin', 'Admin', 'Editor'] as Role[], testId: 'nav-admin-categories' },
  { name: 'Manage Quotes', href: '/admin/quotes', icon: Quote, roles: ['SuperAdmin', 'Admin', 'Editor'] as Role[], testId: 'nav-admin-quotes' },
  { name: 'Permissions', href: '/admin/permissions', icon: ShieldCheck, roles: ['SuperAdmin', 'Admin'], localFocusOnly: true, testId: 'nav-admin-permissions' },
  
  // SuperAdmin Tools
  { name: 'Tools', isSection: true, roles: ['SuperAdmin'] as Role[] },
  { name: 'Database Seed', href: '/admin/tools/seeder', icon: Database, roles: ['SuperAdmin'] as Role[], testId: 'nav-admin-tools-seeder' },
  { name: 'Audit Log', href: '/admin/audit-logs', icon: History, roles: ['SuperAdmin'] as Role[], testId: 'nav-admin-audit-logs' },
  
  // Settings for all roles
  { name: 'Settings', href: '/admin/settings', icon: Settings, roles: ['SuperAdmin', 'Admin', 'Editor', 'User', 'orgAdmin'] as Role[], testId: 'nav-settings' },
];

export default function MainAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, isLocalFocus, isSuperAdmin } = useAuth();
  const canViewAIReports = useCanViewAIReports(user);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/');
    }
  }, [user, isLoading, router]);

  const handleLogout = async () => {
    await auth.signOut();
  };
  
  const visibleNavItems = useMemo(() => {
    if (!user) return [];
    
    const userRole = user.role;

    const items = allNavItems.filter(item => {
      if (item.href === '/admin/accounts' && !isSuperAdmin && userRole !== 'Admin' && userRole !== 'orgAdmin') {
          return false;
      }

      if (!item.roles.includes(userRole)) {
        return false;
      }
      if (item.localFocusOnly && !isLocalFocus) {
          return false;
      }
      if (item.specialCondition === 'canViewAIReports' && !canViewAIReports) {
        return false;
      }
      
      return true;
    });

    // Remove section headers if there are no items following them in that section
    return items.filter((item, index, arr) => {
        if (!item.isSection) return true;
        const nextItem = arr[index + 1];
        return nextItem && !nextItem.isSection;
    });
  }, [user, isLocalFocus, canViewAIReports, isSuperAdmin]);

  const getHeaderTitle = () => {
    const activeItem = [...visibleNavItems]
        .filter(item => item.href)
        .sort((a,b) => (b.href!.length) - (a.href!.length))
        .find(item => pathname.startsWith(item.href!));
    
    if (activeItem) return activeItem.name;

    if (pathname.startsWith('/incidents/')) return 'Incidents';
    if (pathname.startsWith('/reports/')) return 'Reports';
    if (pathname.startsWith('/admin/reports/ai')) return 'AI Reports';
    if (pathname.startsWith('/admin/')) return 'Admin';
    
    return 'Dashboard';
  }

  const headerTitle = getHeaderTitle();

  return (
    <SidebarProvider>
      <NotificationPermissionManager />
      <div className="flex min-h-screen bg-secondary/50">
        <Sidebar collapsible="icon" side="left">
          <SidebarHeader>
            <div className="flex h-14 items-center justify-center p-3">
              <Logo2 className="h-8 w-auto" />
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              {visibleNavItems.map((item) => (
                item.isSection ? (
                   <SidebarMenuItem key={item.name}>
                      <SidebarMenuButton
                        asChild
                        variant='ghost'
                        className="w-full justify-start border-none text-base font-normal text-muted-foreground hover:bg-transparent pointer-events-none mt-4 text-xs uppercase"
                        tooltip={item.name}
                      >
                         <Link href={'#'}>
                          {item.icon && <item.icon className="mr-2 h-5 w-5" />}
                          <span className="group-data-[collapsible=icon]:hidden">{item.name}</span>
                        </Link>
                      </SidebarMenuButton>
                   </SidebarMenuItem>
                ) : (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href || '___'))}
                      tooltip={item.name}
                      data-testid={item.testId}
                    >
                      <Link href={item.href || '#'}>
                        {item.icon && <item.icon className="mr-2 h-5 w-5" />}
                        <span>{item.name}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              ))}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  variant="ghost"
                  className="w-full justify-start border-none text-base font-normal"
                  onClick={handleLogout}
                  tooltip="Logout"
                  data-testid="logout-button"
                >
                    <LogOut className="mr-2 h-5 w-5" />
                    <span>Logout</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>

        <div className="flex flex-1 flex-col">
          <header className="flex h-16 items-center justify-between border-b bg-card px-6">
             <div className="flex items-center gap-4">
                <SidebarTrigger className="md:hidden" data-testid="sidebar-trigger-mobile" />
                <h1 className="text-xl font-semibold" data-testid="page-header-title">{headerTitle}</h1>
             </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search..." className="pl-9" data-testid="search-input" />
              </div>
              <NotificationBell />
              <UserNav />
            </div>
          </header>
          <SidebarInset>{children}</SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  );
}
