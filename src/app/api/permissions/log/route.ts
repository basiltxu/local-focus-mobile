
import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { collections } from '@/lib/paths';
import { PermissionLog, User } from '@/lib/types';
import { doc, getDoc, serverTimestamp, addDoc, collection } from 'firebase/firestore';

export async function POST(req: Request) {
  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized: Missing token." }, { status: 401 });
    }
    const idToken = authorization.split("Bearer ")[1];
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    
    // Verify actor's permissions
    const actorDocRef = doc(adminDb, collections.users, decodedToken.uid);
    const actorDoc = await getDoc(actorDocRef);
    if (!actorDoc.exists()) {
        return NextResponse.json({ error: "Forbidden: Actor not found." }, { status: 403 });
    }
    const actor = actorDoc.data() as User;
    const isSuperAdmin = actor.email === 'basil.khoury14@gmail.com' || actor.role === 'SuperAdmin';
    const isAdmin = actor.role === 'Admin' && actor.organizationId === 'LOCAL_FOCUS_ORG_ID';

    if (!isSuperAdmin && !isAdmin) {
        return NextResponse.json({ error: "Forbidden: You do not have permission to log permission changes." }, { status: 403 });
    }
    
    const body = await req.json();
    const { orgId, orgName, userId, userEmail, scope, action, changed, notes } = body;

    if (!orgId || !scope || !action || !changed) {
        return NextResponse.json({ error: "Bad Request: Missing required log data." }, { status: 400 });
    }

    const logEntry: Omit<PermissionLog, 'id'> = {
        orgId,
        orgName,
        userId: userId || null,
        userEmail: userEmail || null,
        scope,
        action,
        actorId: actor.uid,
        actorEmail: actor.email,
        changed,
        keys: changed.map((c: any) => c.key),
        notes: notes || null,
        createdAt: serverTimestamp() as any, // Cast for server-side
    };

    await addDoc(collection(adminDb, collections.permissionLogs), logEntry);
    
    return NextResponse.json({ success: true, message: 'Log created successfully.' });

  } catch (error: any) {
    console.error("Permissions Log API Error:", error);
    if (error.code === 'auth/id-token-expired') {
        return NextResponse.json({ error: "Unauthorized: Token expired." }, { status: 401 });
    }
    return NextResponse.json(
      { error: "An unexpected error occurred while logging permission changes." },
      { status: 500 }
    );
  }
}
