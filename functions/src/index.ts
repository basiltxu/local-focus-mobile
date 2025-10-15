
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import sgMail from "@sendgrid/mail";
import "dotenv/config";

admin.initializeApp();
const db = admin.firestore();

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  console.log("[INIT] SendGrid API Key configured.");
} else {
  console.error("[INIT] ❌ SENDGRID_API_KEY environment variable not set. Emails will fail.");
}

const APP_BASE_URL = "https://testapp.localfocus.ps";

export const sendOrganizationInvite = functions
  .region("us-central1")
  .https.onCall(async (data, context) => {
    const { email, displayName, organizationId, role } = data;

    // 1. Authentication and Authorization
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "The function must be called while authenticated.");
    }
    const actorDoc = await db.collection("users").doc(context.auth.uid).get();
    const actor = actorDoc.data();
    if (!actor || (actor.organizationId !== "LOCAL_FOCUS_ORG_ID" && actor.role !== "orgAdmin")) {
        throw new functions.https.HttpsError("permission-denied", "You do not have permission to send invitations.");
    }
    if (actor.role === "orgAdmin" && data.organizationId !== actor.organizationId) {
        throw new functions.https.HttpsError("permission-denied", "You can only invite users to your own organization.");
    }
    
    if (!email || !displayName || !role || !organizationId) {
        throw new functions.https.HttpsError("invalid-argument", "Missing required fields: email, displayName, role, organizationId.");
    }

    // Step 1.5. Validate email domain matches organization domain
    const orgDoc = await db.collection("organizations").doc(organizationId).get();
    if (!orgDoc.exists) {
        throw new functions.https.HttpsError("not-found", "Organization not found.");
    }
    
    const orgData = orgDoc.data();
    if (orgData?.domain) {
        const emailDomain = email.split('@')[1];
        if (emailDomain !== orgData.domain) {
            throw new functions.https.HttpsError("invalid-argument", `Email domain ${emailDomain} does not match organization domain ${orgData.domain}.`);
        }
    }

    // Check if organization is expired
    if (orgData?.expiryDate) {
        const now = new Date();
        const expiryDate = orgData.expiryDate.toDate();
        if (now > expiryDate) {
            throw new functions.https.HttpsError("permission-denied", "Organization has expired and cannot invite new users.");
        }
    }
        
    console.log(`[INVITE] Initiating invite for ${email} by ${context.auth?.uid}`);

    try {
      // Step 2. Ensure the user exists in Firebase Auth
      let userRecord;
      let isNewUser = false;
      try {
        userRecord = await admin.auth().getUserByEmail(email);
        console.log(`[INVITE] 🔄 Resending invitation to existing user: ${email} (UID: ${userRecord.uid})`);
      } catch (error: any) {
         if (error.code === 'auth/user-not-found') {
            console.log(`[INVITE] Creating new Auth user for ${email}...`);
            userRecord = await admin.auth().createUser({
                email,
                displayName: displayName || "",
                disabled: false,
            });
            isNewUser = true;
            console.log(`[INVITE] ✅ New Auth user created: ${userRecord.uid}`);
         } else {
             throw error; // Rethrow other auth errors
         }
      }

      // Step 3. Generate the password setup link
      const actionCodeSettings = {
        url: `${APP_BASE_URL}/set-password`,
        handleCodeInApp: false,
      };
      const link = await admin.auth().generatePasswordResetLink(email, actionCodeSettings);
      console.log(`[INVITE] 🔗 Password link generated for ${email}`);

      // Step 4. Write or update user record in Firestore
      const userDocRef = db.collection("users").doc(userRecord.uid);
      const userData: any = {
        uid: userRecord.uid,
        email,
        displayName,
        name: displayName,
        role,
        organizationId,
        status: 'active',
        isActive: false, 
        invitedBy: context.auth.uid,
        invitedAt: admin.firestore.FieldValue.serverTimestamp(),
        authLink: link, // For debugging/manual retrieval
      };
       if (isNewUser) {
        userData.createdAt = admin.firestore.FieldValue.serverTimestamp();
      }

      await userDocRef.set(userData, { merge: true });
      console.log(`[INVITE] 🗄️ Firestore updated for ${email}`);

      // Step 4.5. Also store user under organization subcollection
      const orgUserDocRef = db.collection("organizations").doc(organizationId).collection("users").doc(userRecord.uid);
      const orgUserData = {
        email,
        organizationId,
        role,
        status: 'active',
        invitedAt: admin.firestore.FieldValue.serverTimestamp(),
        authUid: userRecord.uid,
        displayName,
        invitedBy: context.auth.uid,
      };
      await orgUserDocRef.set(orgUserData, { merge: true });
      console.log(`[INVITE] 🗄️ Organization user record created for ${email}`);

      // Step 4.6. Log invitation attempt
      const logRef = db.collection("logs").doc("invitations").collection("attempts").doc();
      await logRef.set({
        email,
        organizationId,
        role,
        invitedBy: context.auth.uid,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        status: 'success',
        message: `Invitation sent successfully to ${email}`,
        authUid: userRecord.uid,
      });
      console.log(`[INVITE] 📝 Invitation logged for ${email}`);

      // Step 5. Send the invitation email via SendGrid
      const msg = {
        to: email,
        from: {
            name: "Local Focus",
            email: "noreply@localfocus.ps",
        },
        subject: "You’ve been invited to Local Focus",
        html: `
          <div style="font-family:Arial,sans-serif;color:#333;line-height:1.6;">
            <h2 style="color:#FF7A00;">Welcome to Local Focus</h2>
            <p>Hello ${displayName || "there"},</p>
            <p>You’ve been invited to join the Local Focus platform. Click the button below to set your password and access your account:</p>
            <p style="text-align:center;margin:30px 0;">
                <a href="${link}" style="background-color:#FF7A00;color:white;padding:12px 24px;border-radius:5px;text-decoration:none;font-weight:bold;">Set Your Password</a>
            </p>
            <p style="font-size:12px;color:#999;">If you did not expect this invitation, you can safely ignore this email.</p>
          </div>
        `,
      };

      if (!process.env.SENDGRID_API_KEY) {
          console.error("[INVITE] ❌ SendGrid API key is not set. Cannot send email.");
          throw new functions.https.HttpsError("internal", "The server is not configured to send emails.");
      }

      await sgMail.send(msg);
      console.log(`[INVITE] ✉️  Invitation email sent to ${email}`);

      // Step 6. Return success
      return { success: true, message: `Invitation email sent to ${email}` };

    } catch (error: any) {
      console.error(`[INVITE] ❌ Error sending invite to ${email}:`, error);
      
      // Log the error
      try {
        const logRef = db.collection("logs").doc("invitations").collection("attempts").doc();
        await logRef.set({
          email,
          organizationId,
          role,
          invitedBy: context.auth?.uid,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          status: 'error',
          message: error?.message || "Unknown error while sending invite",
          error: error.toString(),
        });
        console.log(`[INVITE] 📝 Error logged for ${email}`);
      } catch (logError) {
        console.error(`[INVITE] ❌ Failed to log error for ${email}:`, logError);
      }
      
      throw new functions.https.HttpsError(
        "internal",
        error?.message || "Unknown error while sending invite."
      );
    }
  });


/**
 * Auth trigger that sets custom claims when a user is created or their doc changes.
 */
export const onUserCreate = functions.auth.user().onCreate(async (user) => {
    if (!user.email) {
        console.log(`User ${user.uid} has no email, cannot set claims.`);
        return;
    }

    try {
        // It might take a moment for the user document to be created after the auth event.
        // A small delay or a more robust retry mechanism could be used in production.
        const userDocRef = db.collection("users").doc(user.uid);
        const userDoc = await userDocRef.get();

        if (userDoc.exists) {
            const userData = userDoc.data();
            if (userData) {
                const { role, organizationId } = userData;
                const customClaims = {
                    role: role || 'User',
                    orgId: organizationId || null,
                };

                await admin.auth().setCustomUserClaims(user.uid, customClaims);
                console.log(`Custom claims for ${user.email} set to:`, customClaims);
                
                // Update Firestore doc to confirm claims are set
                await userDocRef.update({ claimsSet: true });
            }
        } else {
            console.warn(`No Firestore document found for new user: ${user.email} (UID: ${user.uid}). Claims not set on creation. This might be handled by an update trigger.`);
        }
    } catch (error) {
        console.error(`Failed to set custom claims for user ${user.uid}`, error);
    }
});


/**
 * Firestore trigger that runs when a new organization is created.
 * It iterates through a 'members' array on the org doc and invites them.
 */
export const onOrganizationCreate = functions.firestore
  .document("organizations/{orgId}")
  .onCreate(async (snap, context) => {
    const orgData = snap.data();
    const orgId = context.params.orgId;
    
    // Set expiry date
    const expiryDate = admin.firestore.Timestamp.fromDate(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000));
    await snap.ref.set({ expiryDate: expiryDate }, { merge: true });
    console.log(`[ORG-INIT] Set expiry date for ${orgData.name} to ${expiryDate.toDate().toISOString()}`);

    if (!orgData || !Array.isArray(orgData.members) || orgData.members.length === 0) {
      console.log(`[ORG-INIT] No members to invite for organization ${orgId}.`);
      return null;
    }
    
    console.log(`[ORG-INIT] New organization ${orgData.name} created. Inviting ${orgData.members.length} members.`);

    for (const member of orgData.members) {
      const { email, displayName, role } = member;
      if (!email) {
        console.warn(`[ORG-INIT] Skipping member with no email in org ${orgId}.`);
        continue;
      }

      try {
        // Step 1. Ensure Auth user exists
        let userRecord;
        try {
          userRecord = await admin.auth().getUserByEmail(email);
          console.log(`[ORG-INIT] Existing user found: ${email}`);
        } catch (error: any) {
          if (error.code === "auth/user-not-found") {
            console.log(`[ORG-INIT] 🔧 Creating Auth user for ${email}...`);
            userRecord = await admin.auth().createUser({
              email,
              displayName: displayName || "",
              disabled: false,
            });
            console.log(`[ORG-INIT] ✅ Created Auth user ${email}`);
          } else {
            throw error; // Rethrow other auth errors
          }
        }

        // Step 2. Generate password link
        const actionCodeSettings = {
          url: `${APP_BASE_URL}/set-password`,
          handleCodeInApp: false,
        };
        const link = await admin.auth().generatePasswordResetLink(email, actionCodeSettings);
        console.log(`[ORG-INIT] 🔗 Password link for ${email}`);

        // Step 3. Write Firestore user doc
        await db.doc(`users/${userRecord.uid}`).set({
          uid: userRecord.uid,
          email,
          displayName,
          name: displayName,
          role,
          organizationId: orgId,
          invitedAt: admin.firestore.FieldValue.serverTimestamp(),
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          status: "active",
          isActive: false,
          authLink: link, // For debugging
        }, { merge: true });

        // Step 3.5. Also store user under organization subcollection
        await db.doc(`organizations/${orgId}/users/${userRecord.uid}`).set({
          email,
          organizationId: orgId,
          role,
          status: 'active',
          invitedAt: admin.firestore.FieldValue.serverTimestamp(),
          authUid: userRecord.uid,
          displayName,
        }, { merge: true });

        // Step 4. Send invitation email
        const msg = {
          to: email,
          from: { name: "Local Focus", email: "noreply@localfocus.ps" },
          subject: "Welcome to Local Focus",
          html: `
            <div style="font-family:Arial,sans-serif;color:#333;line-height:1.6;">
              <h2 style="color:#FF7A00;">Welcome to Local Focus</h2>
              <p>Hello ${displayName || "there"},</p>
              <p>Your organization <strong>${orgData.name}</strong> has invited you to join Local Focus.</p>
              <p style="text-align:center;margin:20px 0;">
                <a href="${link}" style="background:#FF7A00;color:white;padding:12px 24px;border-radius:5px;text-decoration:none;font-weight:bold;">Set Your Password</a>
              </p>
              <p style="font-size:12px;color:#888;">If you didn’t expect this, you can ignore this email.</p>
            </div>`
        };
        await sgMail.send(msg);
        console.log(`[ORG-INIT] ✉️ Invitation sent to ${email}`);

      } catch (error: any) {
        console.error(`[ORG-INIT] ❌ Failed to invite member ${email} for org ${orgId}:`, error);
        // Continue to the next member
      }
    }
    console.log(`[ORG-INIT] Completed invites for organization ${orgId}`);
    return null;
  });

export const updateOrganizationDetails = functions
  .region("us-central1")
  .https.onCall(async (data, context) => {
    const { orgId, name, domain, expiryDate } = data;
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "User must be authenticated.");
    }
    // TODO: Add role validation to ensure only admins can call this.
    try {
        const orgRef = db.collection("organizations").doc(orgId);
        await orgRef.update({
            name,
            domain,
            expiryDate: admin.firestore.Timestamp.fromDate(new Date(expiryDate)),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return { success: true };
    } catch(e) {
        console.error("Failed to update org details", e);
        throw new functions.https.HttpsError("internal", "Could not update organization details.");
    }
  });
