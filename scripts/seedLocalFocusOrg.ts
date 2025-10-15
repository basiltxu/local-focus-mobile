
import * as admin from 'firebase-admin';

// =================================================================================================
// CONFIGURATION
// =================================================================================================
// IMPORTANT: Place your Firebase service account JSON file in the 'scripts' directory
// and rename it to 'service-account.json'.
// DO NOT COMMIT THIS FILE TO YOUR VERSION CONTROL.
const serviceAccount = require('./service-account.json');

const ORGANIZATION_ID = 'LOCAL_FOCUS_ORG_ID';
const CREATED_BY_UID = 'pztbCKWypKfHhcCXtVrrb9R8fCw1'; // System or SuperAdmin UID

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

/**
 * Logs a message to the console with a timestamp.
 * @param message The message to log.
 */
function log(message: string) {
  console.log(`[${new Date().toLocaleTimeString()}] ${message}`);
}

/**
 * Main seeding function for the Local Focus organization.
 */
async function seedLocalFocusOrganization() {
  log(`🚀 Starting seeder for organization: ${ORGANIZATION_ID}...`);

  const orgRef = db.collection('organizations').doc(ORGANIZATION_ID);

  const organizationData = {
    name: 'Local Focus',
    domain: 'localfocus.ps',
    domainEmail: 'localfocus.ps',
    isActive: true,
    type: 'core',
    createdBy: CREATED_BY_UID,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    accessRights: {
      canViewAiReports: true,
      canViewMonthlyReports: true,
      canViewPublicIncidents: true,
      canViewWeeklyReports: true,
    },
  };

  try {
    // Use { merge: true } to update existing doc or create a new one without overwriting all fields.
    // This makes the script idempotent.
    await orgRef.set(organizationData, { merge: true });
    log(`✅ Local Focus organization seeded successfully in document: ${ORGANIZATION_ID}`);
  } catch (error: any) {
    console.error(`❌ Error seeding Local Focus organization: ${error.message}`);
    process.exit(1); // Exit with error code
  }
}

// Execute the script
seedLocalFocusOrganization()
  .then(() => {
    log('🎉 Seeding script finished.');
    process.exit(0);
  })
  .catch(() => {
    log('🔥 Seeding script failed.');
    process.exit(1);
  });
