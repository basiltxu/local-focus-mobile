
import { NextResponse } from "next/server";
import { generateReportFlow } from "@/ai/flows/generate-report-flow";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import type { User } from "@/lib/types";
import { doc, getDoc } from "firebase/firestore";
import { collections } from "@/lib/paths";

export async function POST(req: Request) {
    try {
        const authorization = req.headers.get("Authorization");
        if (!authorization?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized: Missing token." }, { status: 401 });
        }
        const idToken = authorization.split("Bearer ")[1];
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        const uid = decodedToken.uid;
        
        const userDocRef = doc(adminDb, collections.users, uid);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
            return NextResponse.json({ error: "Forbidden: User not found." }, { status: 403 });
        }
        
        const user = userDoc.data() as User;
        const canGenerate = user?.organizationId === "LOCAL_FOCUS_ORG_ID" && ["Admin", "SuperAdmin"].includes(user.role);

        if (!canGenerate) {
            return NextResponse.json({ error: "Forbidden: You do not have permission to generate reports." }, { status: 403 });
        }

        const body = await req.json();
        const type = body.type || 'Weekly'; // Default to weekly if not specified

        const reportResult = await generateReportFlow({ type });
        
        // Return the full document, which now includes the ID from the flow.
        return NextResponse.json({ success: true, report: reportResult });

    } catch (e: any) {
        console.error("AI Report Generation API Error:", e);
        return NextResponse.json(
            { error: e.message || "An unexpected error occurred during AI report generation." },
            { status: 500 }
        );
    }
}

