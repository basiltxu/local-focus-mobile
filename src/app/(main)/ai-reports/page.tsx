// This page has been deprecated and replaced by /src/app/(main)/reports/ai/page.tsx
// This file can be safely deleted.
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DeprecatedAIReportsPage() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/admin/reports/ai');
    }, [router]);

    return null;
}
