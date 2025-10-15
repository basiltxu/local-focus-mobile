
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import Link from 'next/link';
import { UserCog, ListTree, BarChart, Loader2 } from 'lucide-react';

export default function AdminToolsSettingsPage() {
  const { isLoading } = useAuth();

  if(isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  
  // This page is protected by the /admin layout, no need for an extra role check here.

  return (
    <main className="flex-1 p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Admin Settings</h2>
        <p className="text-muted-foreground">
          Manage system-wide settings and data.
        </p>
      </div>

      <div className="grid gap-6">
         <Card>
            <CardHeader>
                <CardTitle>Administration</CardTitle>
                <CardDescription>
                Manage system-wide settings and data.
                </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">User Management</CardTitle>
                        <CardDescription>Invite, edit, or deactivate user accounts.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild>
                            <Link href="/admin/accounts">
                                <UserCog className="mr-2 h-4 w-4" />
                                Manage Users
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Category Management</CardTitle>
                        <CardDescription>Add, edit, or delete incident categories.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild>
                        <Link href="/admin/categories">
                                <ListTree className="mr-2 h-4 w-4" />
                                Manage Categories
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="text-lg">System Logs & Analytics</CardTitle>
                        <CardDescription>View system logs and performance analytics.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button>
                        <BarChart className="mr-2 h-4 w-4" />
                        View Logs & Analytics
                        </Button>
                    </CardContent>
                </Card>
            </CardContent>
        </Card>
      </div>
    </main>
  );
}
