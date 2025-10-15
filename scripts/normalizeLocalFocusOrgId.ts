
import * as admin from 'firebase-admin';

// =================================================================================================
// CONFIGURATION
// =================================================================================================
// IMPORTANT: Place your Firebase service account JSON file in the 'scripts' directory
// and rename it to 'service-account.json'.
// DO NOT COMMIT THIS FILE TO YOUR VERSION CONTROL.
const serviceAccount = require('./service-account.json');

const OLD_ORG_ID = 'lFf5qHluSGeVBzsFvwcu';
const NEW_ORG_ID = 'LOCAL_FOCUS_ORG_ID';
const BATCH_LIMIT = 500;

// Collections that have a direct 'organizationId' field to update.
// The 'organizations' collection is handled separately.
// Subcategories are handled within the 'categories' loop.
const COLLECTIONS_WITH_ORG_ID = [
  'users',
  'incidents',
  'reports',
  'categories',
  'permissions',
  'messages',
  'quotes',
];

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true });

// =================================================================================================
// HELPER FUNCTIONS
// =================================================================================================

/**
 * Logs a message to the console with a timestamp.
 * @param message The message to log.
 */
function log(message: string) {
  console.log(`[${new Date().toLocaleTimeString()}] ${message}`);
}

/**
 * Special handling for the 'organizations' collection.
 * It copies the old document to a new one with the correct ID and data, then deletes the old one.
 */
async function migrateOrganizationsCollection() {
  log('🚀 Migrating the organizations collection...');
  const oldOrgRef = db.collection('organizations').doc(OLD_ORG_ID);
  const newOrgRef = db.collection('organizations').doc(NEW_ORG_ID);

  const oldOrgDoc = await oldOrgRef.get();

  if (!oldOrgDoc.exists) {
    log(`✅ No organization document with ID "${OLD_ORG_ID}" found. Skipping.`);
    return;
  }

  const oldData = oldOrgDoc.data() || {};
  const newData = {
    ...oldData, // Carry over any other fields
    name: 'Local Focus',
    isLocalFocus: true,
    isActive: true,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    // Keep original createdAt if it exists, otherwise set it
    createdAt: oldData.createdAt || admin.firestore.FieldValue.serverTimestamp(),
  };

  try {
    // Create the new document and then delete the old one
    await newOrgRef.set(newData, { merge: true });
    log(`✅ Copied data to new organization document: ${NEW_ORG_ID}`);
    await oldOrgRef.delete();
    log(`🗑️  Deleted old organization document: ${OLD_ORG_ID}`);
  } catch (error: any) {
    log(`❌ Error migrating organizations collection: ${error.message}`);
    throw error;
  }
}

/**
 * Migrates documents in a specific collection by updating the organizationId.
 * @param collectionName The name of the collection to migrate.
 */
async function migrateCollection(collectionName: string) {
  log(`🔎 Starting migration for collection: ${collectionName}...`);
  const collectionRef = db.collection(collectionName);
  const query = collectionRef.where('organizationId', '==', OLD_ORG_ID);

  let totalUpdated = 0;

  try {
    const snapshot = await query.get();

    if (snapshot.empty) {
      log(`✅ No documents with old orgId found in '${collectionName}'.`);
      return;
    }

    log(`Found ${snapshot.size} documents to update in '${collectionName}'.`);
    let batch = db.batch();
    let batchCount = 0;

    for (let i = 0; i < snapshot.docs.length; i++) {
      const doc = snapshot.docs[i];
      batch.update(doc.ref, { organizationId: NEW_ORG_ID });
      batchCount++;
      totalUpdated++;

      if (batchCount === BATCH_LIMIT) {
        await batch.commit();
        log(`🔥 Committed batch of ${batchCount} updates for '${collectionName}'.`);
        batch = db.batch();
        batchCount = 0;
      }

      // Special handling for subcategories
      if (collectionName === 'categories') {
        await migrateSubcategories(doc.id);
      }
    }

    // Commit any remaining documents in the last batch
    if (batchCount > 0) {
      await batch.commit();
      log(`🔥 Committed final batch of ${batchCount} updates for '${collectionName}'.`);
    }

    log(`✅ Finished migrating '${collectionName}'. Total updated: ${totalUpdated}.`);
  } catch (error: any) {
    log(`❌ Error during migration of '${collectionName}': ${error.message}`);
    throw error; // Stop the script if any collection fails
  }
}

/**
 * Migrates subcategories nested under a specific category.
 * Note: Subcategories do not have an orgId, so this function is a placeholder
 * in case the schema changes. If they had an orgId, the logic would be similar
 * to migrateCollection.
 * @param categoryId The ID of the parent category.
 */
async function migrateSubcategories(categoryId: string) {
    // As per the schema, subcategories do not have an orgId.
    // If they did, we would query and update them here.
    // This function serves as a placeholder for that potential logic.
    // const subcategoriesRef = db.collection(`categories/${categoryId}/subcategories`);
    // const query = subcategoriesRef.where('organizationId', '==', OLD_ORG_ID);
    // ... similar batch update logic ...
}

// =================================================================================================
// EXECUTION
// =================================================================================================

async function runMigration() {
  log('--- Starting Firestore Organization ID Migration ---');
  try {
    // First, handle the special case of the organizations collection
    await migrateOrganizationsCollection();

    // Then, iterate through all other collections and update the orgId
    for (const collectionName of COLLECTIONS_WITH_ORG_ID) {
      await migrateCollection(collectionName);
    }

    log('🎉 --- Migration script finished successfully! ---');
    process.exit(0);
  } catch (error) {
    log('🔥 --- Migration script failed. ---');
    console.error('Error details:', error);
    process.exit(1);
  }
}

runMigration();
