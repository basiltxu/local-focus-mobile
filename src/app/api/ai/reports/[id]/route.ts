
import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { doc, getDoc, deleteDoc } from "firebase/firestore";
import { collections } from "@/lib/paths";
import type { User } from "@/lib/types";

// Helper to verify user permissions
async function verifyPermission(req: Request): Promise<boolean> {
    const authorization = req.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) return false;
    
    const idToken = authorization.split("Bearer ")[1];
    if (!adminAuth) {
        console.error("Admin SDK not initialized.");
        return false;
    }

    try {
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        if (!adminDb) {
            console.error("Admin DB not initialized.");
            return false;
        }
        const userDoc = await getDoc(doc(adminDb, collections.users, decodedToken.uid));
        if (!userDoc.exists()) return false;
        
        const user = userDoc.data() as User;
        return user?.organizationId === "LOCAL_FOCUS_ORG_ID" && ["Admin", "SuperAdmin"].includes(user.role);
    } catch (error) {
        console.error("Permission verification failed:", error);
        return false;
    }
}


// GET a specific report
export async function GET(req: Request, { params }: { params: { id: string } }) {
    if (!adminDb) {
        return NextResponse.json({ error: "Server not configured." }, { status: 500 });
    }
    try {
        const reportRef = doc(adminDb, "ai_reports", params.id);
        const reportSnap = await getDoc(reportRef);

        if (!reportSnap.exists()) {
            return NextResponse.json({ error: "Report not found." }, { status: 404 });
        }

        return NextResponse.json({ success: true, report: { id: reportSnap.id, ...reportSnap.data() } });
    } catch (error: any) {
        console.error(`Error fetching report ${params.id}:`, error);
        return NextResponse.json({ error: "Failed to fetch report." }, { status: 500 });
    }
}


// DELETE a specific report
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
    const hasPermission = await verifyPermission(req);
    if (!hasPermission) {
        return NextResponse.json({ error: "Forbidden: You do not have permission to delete reports." }, { status: 403 });
    }

    if (!adminDb) {
        return NextResponse.json({ error: "Server not configured." }, { status: 500 });
    }
    
    try {
        const reportRef = doc(adminDb, "ai_reports", params.id);
        await deleteDoc(reportRef);

        return NextResponse.json({ success: true, message: `Report ${params.id} deleted.` });
    } catch (error: any) {
        console.error(`Error deleting report ${params.id}:`, error);
        return NextResponse.json({ error: "Failed to delete report." }, { status: 500 });
    }
}
