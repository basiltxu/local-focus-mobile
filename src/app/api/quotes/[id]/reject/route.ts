
import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { collections } from '@/lib/paths';
import type { User } from '@/lib/types';

// Helper to verify user is an admin
async function verifyAdmin(req: Request): Promise<boolean> {
    const authorization = req.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) return false;
    
    const idToken = authorization.split("Bearer ")[1];
    if (!adminAuth || !adminDb) return false;

    try {
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        const userDoc = await getDoc(doc(adminDb, collections.users, decodedToken.uid));
        if (!userDoc.exists()) return false;
        
        const user = userDoc.data() as User;
        return user.organizationId === 'LOCAL_FOCUS_ORG_ID' && ['Admin', 'SuperAdmin', 'Editor'].includes(user.role);
    } catch (error) {
        console.error("Permission verification failed:", error);
        return false;
    }
}


export async function POST(req: Request, { params }: { params: { id: string } }) {
    const isAuthorized = await verifyAdmin(req);
    if (!isAuthorized) {
        return NextResponse.json({ error: "Forbidden: Insufficient permissions." }, { status: 403 });
    }

    if (!adminDb) {
        return NextResponse.json({ error: 'Server not configured.' }, { status: 500 });
    }

    const { id: quoteId } = params;
    const quoteRef = doc(adminDb, collections.quotes, quoteId);

    try {
        await updateDoc(quoteRef, {
            status: 'rejected',
            updatedAt: serverTimestamp(),
        });
        return NextResponse.json({ success: true, message: 'Quote has been rejected.' });
    } catch (e: any) {
        console.error('Quote Rejection API Error:', e);
        return NextResponse.json({ error: e.message || 'An unexpected error occurred.' }, { status: 500 });
    }
}
