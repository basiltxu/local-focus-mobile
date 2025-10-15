
import * as admin from 'firebase-admin';

// =================================================================================================
// CONFIGURATION
// =================================================================================================
// IMPORTANT: Place your Firebase service account JSON file in the 'scripts' directory
// and rename it to 'service-account.json'.
// DO NOT COMMIT THIS FILE TO YOUR VERSION CONTROL.
const serviceAccount = require('./service-account.json');

const ORGANIZATION_ID = 'LOCAL_FOCUS_ORG_ID';
const CREATED_BY = 'system_seed';

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

// =================================================================================================
// DATA TO SEED
// =================================================================================================

const categoriesToSeed = [
  {
    id: 'clashes',
    name: 'Clashes',
    subcategories: [
      { id: 'clashes_isf', name: 'Clashes between Palestinians and ISF' },
      { id: 'clashes_settlers', name: 'Clashes between Palestinians and Israeli settlers' },
    ],
  },
  {
    id: 'injured',
    name: 'Injured',
    subcategories: [
      { id: 'palestinian_civilians', name: 'Palestinian civilians' },
      { id: 'palestinian_militants', name: 'Palestinian militants' },
      { id: 'israeli_settlers', name: 'Israeli settlers' },
      { id: 'isf', name: 'ISF' },
    ],
  },
  {
    id: 'arrests',
    name: 'Arrests',
    subcategories: [
      { id: 'palestinian_civilians', name: 'Palestinian civilians' },
      { id: 'palestinian_militants', name: 'Palestinian militants' },
      { id: 'israeli_settlers', name: 'Israeli settlers' },
      { id: 'israeli_arabs', name: 'Israeli Arabs' },
    ],
  },
  {
    id: 'civil_unrest',
    name: 'Civil Unrest',
    subcategories: [
      { id: 'protests_palestinians', name: 'Protests by Palestinians' },
      { id: 'protests_israelis', name: 'Protests by Israelis' },
      { id: 'violent_protest', name: 'Violent protest including roadblocks' },
    ],
  },
  {
    id: 'armed_incidents',
    name: 'Armed incidents and attacks',
    subcategories: [
      { id: 'shooting_pal_isf', name: 'Shooting by Palestinians against ISF' },
      { id: 'shooting_pal_settlers', name: 'Shooting by Palestinians against Israeli settlers' },
      { id: 'shooting_pal_israelis', name: 'Shooting by Palestinians against Israelis' },
      { id: 'exchange_gunfire', name: 'Exchange of gunfire between Palestinian militants and ISF' },
      { id: 'shooting_settlers_pal', name: 'Shooting by Israeli settlers against Palestinians' },
      { id: 'shooting_isf_pal', name: 'Shooting by ISF at Palestinians' },
      { id: 'ied_isf', name: 'IED attacks targeting ISF' },
      { id: 'ied_settlers', name: 'IED attacks targeting Israeli settlers' },
      { id: 'ied_israelis', name: 'IED attacks targeting Israelis' },
      { id: 'pipe_bombs_settlers', name: 'Pipe Bombs targeting Israeli settlers' },
      { id: 'pipe_bombs_isf', name: 'Pipe Bombs targeting ISF' },
      { id: 'bombing_pal_isf', name: 'Bombing attacks by Palestinians targeting ISF' },
      { id: 'bombing_pal_settlers', name: 'Bombing attacks by Palestinians targeting Israeli settlers' },
      { id: 'bombing_pal_israelis', name: 'Bombing attacks by Palestinians targeting Israelis' },
      { id: 'ramming_pal_isf', name: 'Ramming attack by Palestinians targeting ISF' },
      { id: 'ramming_pal_settlers', name: 'Ramming attack by Palestinians targeting Israeli settlers' },
      { id: 'ramming_pal_israelis', name: 'Ramming attack by Palestinians targeting Israelis' },
      { id: 'stabbing_pal_isf', name: 'Stabbing attack by Palestinians targeting ISF' },
      { id: 'stabbing_pal_settlers', name: 'Stabbing attack by Palestinians targeting Israeli settlers' },
      { id: 'stabbing_pal_israelis', name: 'Stabbing attack by Palestinians targeting Israelis' },
      { id: 'stabbing_israelis_pal', name: 'Stabbing attack by Israelis targeting Palestinians' },
    ],
  },
  {
    id: 'stones_throwing',
    name: 'Stones throwing',
    subcategories: [
      { id: 'stones_pal_isf', name: 'Stones throwing by Palestinians at ISF' },
      { id: 'stones_pal_settlers', name: 'Stones throwing by Palestinians at Israeli settlers' },
      { id: 'stones_pal_israelis', name: 'Stones throwing by Palestinians at Israelis' },
      { id: 'stones_settlers_pal', name: 'Stones throwing by Israeli settlers at Palestinians' },
    ],
  },
  {
    id: 'molotov_cocktails',
    name: 'Molotov Cocktails',
    subcategories: [
      { id: 'molotov_pal_isf', name: 'Molotov cocktails by Palestinians at ISF' },
      { id: 'molotov_pal_settlers', name: 'Molotov cocktails by Palestinians at Israeli settlers' },
      { id: 'molotov_pal_israelis', name: 'Molotov cocktails by Palestinians at Israelis' },
      { id: 'molotov_settlers_pal', name: 'Molotov cocktails by Israeli settlers at Palestinians' },
    ],
  },
  {
    id: 'isf_operations',
    name: 'ISF operations',
    subcategories: [
      { id: 'isf_ops_wb', name: 'ISF operations in West Bank' },
      { id: 'isf_ops_jerusalem', name: 'ISF operations in Jerusalem' },
      { id: 'isf_ops_israel', name: 'ISF operations in Israel' },
    ],
  },
  {
    id: 'killing',
    name: 'Killing',
    subcategories: [
      { id: 'pal_civilians_killed', name: 'Palestinian civilians killed' },
      { id: 'pal_militants_killed', name: 'Palestinian militants killed' },
      { id: 'isf_killed', name: 'ISF killed by Palestinians' },
      { id: 'settlers_killed', name: 'Israeli settlers killed by Palestinians' },
      { id: 'israeli_arabs_killed', name: 'Israeli Arabs' },
    ],
  },
  {
    id: 'rockets_sirens',
    name: 'Rockets / Sirens',
    subcategories: [
      { id: 'rockets_lebanon', name: 'Rockets sirens from Lebanon' },
      { id: 'rockets_syria', name: 'Rockets sirens from Syria' },
      { id: 'rockets_gaza', name: 'Rockets sirens from Gaza' },
      { id: 'rockets_egypt', name: 'Rockets sirens from Egypt' },
      { id: 'rockets_yemen', name: 'Rockets sirens from Yemen' },
      { id: 'rockets_iraq', name: 'Rockets sirens from Iraq' },
    ],
  },
  {
    id: 'hazard',
    name: 'Hazard',
    subcategories: [
      { id: 'traffic_accidents', name: 'Traffic accidents' },
      { id: 'earthquakes', name: 'Earthquakes' },
      { id: 'fire', name: 'Fire' },
      { id: 'tsunami', name: 'Tsunami' },
      { id: 'flashfloods', name: 'Flashfloods' },
    ],
  },
];


// =================================================================================================
// SCRIPT LOGIC
// =================================================================================================

/**
 * Deletes all documents in a collection, including documents in any subcollections.
 * @param collectionRef The reference to the collection to delete.
 */
async function deleteCollection(collectionRef: admin.firestore.CollectionReference) {
  const snapshot = await collectionRef.limit(500).get();

  if (snapshot.size === 0) {
    return;
  }

  const batch = db.batch();
  snapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
  });

  await batch.commit();
  log(`🗑️  Deleted ${snapshot.size} documents from ${collectionRef.path}.`);

  // Recurse on the same collection to ensure everything is deleted
  return deleteCollection(collectionRef);
}

/**
 * Main seeding function.
 */
async function seedCategories() {
  log('--- Starting Local Focus Category Seeder ---');
  
  const categoriesRef = db.collection('categories');

  // 1. Delete all existing categories and their subcollections
  log('🔎 Finding existing categories to delete...');
  const existingCategories = await categoriesRef.get();
  for (const categoryDoc of existingCategories.docs) {
    log(`   - Found category: ${categoryDoc.id}. Deleting its subcategories...`);
    const subcategoriesRef = categoryDoc.ref.collection('subcategories');
    await deleteCollection(subcategoriesRef);
    log(`   - Deleting main category doc: ${categoryDoc.id}`);
    await categoryDoc.ref.delete();
  }
  log('✅ All existing categories and subcategories have been deleted.');

  // 2. Seed the new categories
  log('🌱 Starting to seed new categories...');
  for (const category of categoriesToSeed) {
    const categoryRef = categoriesRef.doc(category.id);
    const categoryData = {
      name: category.name,
      description: category.name,
      organizationId: ORGANIZATION_ID,
      type: 'core',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: CREATED_BY,
    };

    await categoryRef.set(categoryData);
    log(`   - Created category: ${category.name} (ID: ${category.id})`);

    if (category.subcategories && category.subcategories.length > 0) {
      const subcategoriesRef = categoryRef.collection('subcategories');
      for (const subcategory of category.subcategories) {
        const subcategoryRef = subcategoriesRef.doc(subcategory.id);
        const subcategoryData = {
          name: subcategory.name,
          description: subcategory.name,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          createdBy: CREATED_BY,
        };
        await subcategoryRef.set(subcategoryData);
        log(`     - Added subcategory: ${subcategory.name} (ID: ${subcategory.id})`);
      }
    }
  }

  log('✅ Local Focus categories seeded successfully');
}

// Execute the script
seedCategories()
  .then(() => {
    log('🎉 --- Seeding script finished successfully! ---');
    process.exit(0);
  })
  .catch((error) => {
    log('🔥 --- Seeding script failed. ---');
    console.error('Error details:', error);
    process.exit(1);
  });
