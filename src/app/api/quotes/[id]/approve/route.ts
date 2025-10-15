
import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { doc, getDoc, writeBatch, serverTimestamp, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { collections } from '@/lib/paths';
import type { User, Quote, Organization, AppPermissions } from '@/lib/types';
import { mapServicesToPermissions } from '@/lib/service-permission-map';
import { normalizeOrgName, deriveEmailDomain } from '@/lib/org-dedupe';

// Helper to verify user is an admin
async function verifyAdmin(req: Request): Promise<{ authorized: boolean; user: User | null; error?: string }> {
    const authorization = req.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) {
        return { authorized: false, user: null, error: "Unauthorized: Missing token." };
    }
    
    const idToken = authorization.split("Bearer ")[1];
    if (!adminAuth || !adminDb) {
        return { authorized: false, user: null, error: "Server not configured." };
    }

    try {
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        const userDocRef = doc(adminDb, collections.users, decodedToken.uid);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
            return { authorized: false, user: null, error: "Forbidden: User not found." };
        }
        
        const user = userDoc.data() as User;
        const isAuthorized = user.organizationId === 'LOCAL_FOCUS_ORG_ID' && ['Admin', 'SuperAdmin'].includes(user.role);

        if (!isAuthorized) {
            return { authorized: false, user: null, error: "Forbidden: Insufficient permissions." };
        }
        
        return { authorized: true, user };

    } catch (error) {
        console.error("Permission verification failed:", error);
        return { authorized: false, user: null, error: "Forbidden: Invalid token." };
    }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
    const { authorized, user: adminUser, error: authError } = await verifyAdmin(req);
    if (!authorized || !adminUser) {
        return NextResponse.json({ error: authError }, { status: 403 });
    }

    const { id: quoteId } = params;
    const body = await req.json();
    const { createInvite = true, overwritePermissions = false } = body;

    if (!adminDb) {
        return NextResponse.json({ error: 'Server not configured.' }, { status: 500 });
    }

    const quoteRef = doc(adminDb, collections.quotes, quoteId);
    
    try {
        const quoteSnap = await getDoc(quoteRef);
        if (!quoteSnap.exists()) {
            return NextResponse.json({ error: 'Quote not found.' }, { status: 404 });
        }

        const quote = quoteSnap.data() as Quote;
        if (quote.status === 'approved') {
            return NextResponse.json({ error: 'This quote has already been approved.' }, { status: 400 });
        }

        const batch = writeBatch(adminDb);
        let orgId: string;
        let orgRef: any;

        // Deduplication Logic
        const orgsRef = collection(adminDb, collections.organizations);
        const normalizedName = normalizeOrgName(quote.orgName);
        const emailDomain = deriveEmailDomain(quote.contactEmail);

        const nameQuery = query(orgsRef, where('name_normalized', '==', normalizedName), limit(1));
        const domainQuery = query(orgsRef, where('emailDomain', '==', emailDomain), limit(1));

        const [nameMatch, domainMatch] = await Promise.all([getDocs(nameQuery), getDocs(domainQuery)]);
        const existingOrgDoc = nameMatch.docs[0] || domainMatch.docs[0];

        // Seed Permissions from Services
        const newPermissions = mapServicesToPermissions(quote.services);

        if (existingOrgDoc) {
            // --- Update Existing Organization ---
            orgId = existingOrgDoc.id;
            orgRef = existingOrgDoc.ref;
            const existingOrgData = existingOrgDoc.data() as Organization;

            const updatedServices = { ...existingOrgData.services, ...quote.services };
            
            let finalPermissions: Partial<AppPermissions> = { ...existingOrgData.permissions };
            if (overwritePermissions) {
                finalPermissions = newPermissions; // Replace completely
            } else {
                // Merge, keeping existing true values
                Object.keys(newPermissions).forEach(key => {
                    if (newPermissions[key as keyof AppPermissions] === true) {
                        finalPermissions[key as keyof AppPermissions] = true;
                    }
                });
            }

            batch.update(orgRef, {
                services: updatedServices,
                permissions: { ...finalPermissions, lastUpdated: serverTimestamp() },
                contactPerson: quote.contactPerson,
                contactEmail: quote.contactEmail,
                phone: quote.contactPhone,
                updatedAt: serverTimestamp(),
            });

        } else {
            // --- Create New Organization ---
            orgRef = doc(collection(adminDb, collections.organizations));
            orgId = orgRef.id;

            const newOrgData: Partial<Organization> = {
                name: quote.orgName,
                name_normalized: normalizedName,
                emailDomain: emailDomain,
                contactPerson: quote.contactPerson,
                contactEmail: quote.contactEmail,
                phone: quote.contactPhone,
                services: quote.services,
                permissions: { ...newPermissions, lastUpdated: serverTimestamp() },
                type: 'external',
                isActive: true,
                hasOrgAdmin: false, // Will be updated if invite is created and accepted
                currentUsers: 0,
                maxUsers: 10, // Default quota
                createdBy: adminUser.uid,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };
            batch.set(orgRef, newOrgData);
        }

        // Update the quote document
        batch.update(quoteRef, {
            status: 'approved',
            orgId: orgId,
            approvedBy: adminUser.uid,
            approvedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
        
        // TODO: Optionally create an orgAdmin invite here.
        // This would typically involve another callable function or service.
        // For now, we'll just log the intent.
        if (createInvite) {
            console.log(`[Approval] Intent to create orgAdmin invite for ${quote.contactEmail} in org ${orgId}.`);
            // You would call your `sendOrganizationInvite` function here.
            // Example: await sendOrganizationInvite({ email: quote.contactEmail, role: 'orgAdmin', organizationId: orgId });
        }
        
        await batch.commit();

        return NextResponse.json({ success: true, orgId });

    } catch (e: any) {
        console.error('Quote Approval API Error:', e);
        return NextResponse.json({ error: e.message || 'An unexpected error occurred.' }, { status: 500 });
    }
}
