
'use client';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import Link from "next/link";
import { auth } from "@/lib/firebase";
import { Skeleton } from "./ui/skeleton";
import { useRouter } from "next/navigation";

export function UserNav() {
  const { user, isAdmin, isLoading } = useAuth();
  const router = useRouter();

  if (isLoading) {
    return <Skeleton className="h-9 w-9 rounded-full" />;
  }
  
  if (!user) {
    return null; 
  }

  const handleLogout = async () => {
    await auth.signOut();
    router.push('/');
  }

  const fallback = user.name ? user.name.charAt(0) : user.email!.charAt(0);
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full" data-testid="user-nav-trigger">
          <Avatar className="h-9 w-9">
            {user.avatar && <AvatarImage src={user.avatar} alt={user.name || user.email!} />}
            <AvatarFallback>{fallback.toUpperCase()}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.name || 'User'}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild data-testid="user-nav-profile">
            <Link href="/admin/settings">Profile</Link>
          </DropdownMenuItem>
          {isAdmin && (
            <DropdownMenuItem asChild data-testid="user-nav-admin">
                <Link href="/admin">Admin</Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem asChild data-testid="user-nav-settings">
            <Link href="/admin/settings">Settings</Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} data-testid="user-nav-logout">
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
