
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminRootPage() {
  const router = useRouter();
  useEffect(() => {
    // Redirect from the base /admin to the overview page
    router.replace('/admin/overview');
  }, [router]);

  // Return null or a loader while the redirect is happening
  return null;
}
