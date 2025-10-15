
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  writeBatch,
  serverTimestamp,
  getDocs,
  deleteDoc,
  query
} from 'firebase/firestore';
import { useAuth } from '@/hooks/use-auth';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { collections } from '@/lib/paths';

const ORGANIZATION_ID = 'LOCAL_FOCUS_ORG_ID';
const CREATED_BY = 'system_seed';

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

export function CategorySeedButton() {
  const { toast } = useToast();
  const { isSuperAdmin } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const log = (message: string) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
    console.log(message);
  };
  
  async function deleteCollectionAndSubcollections(collectionRef: any) {
    const q = query(collectionRef);
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      log(`No documents found in ${collectionRef.path}. Skipping deletion.`);
      return;
    }

    const batch = writeBatch(db);
    let deletedCount = 0;

    for (const docSnap of snapshot.docs) {
      // Recursively delete subcollections
      const subcategoriesRef = collection(db, docSnap.ref.path, 'subcategories');
      const subcategoriesSnap = await getDocs(subcategoriesRef);
      if(!subcategoriesSnap.empty) {
          log(`   - Deleting ${subcategoriesSnap.size} subcategories from ${docSnap.id}...`);
          for (const subDoc of subcategoriesSnap.docs) {
              batch.delete(subDoc.ref);
          }
      }
      
      batch.delete(docSnap.ref);
      deletedCount++;
    }

    await batch.commit();
    log(`🗑️ Deleted ${deletedCount} documents from ${collectionRef.path}.`);
  }

  const handleSeed = async () => {
    if (!isSuperAdmin) {
      toast({ title: 'Unauthorized', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    setLogs([]);
    log('--- Starting Local Focus Category Seeder ---');

    try {
      // 1. Delete all existing categories and their subcollections
      const categoriesRef = collection(db, collections.categories);
      log('🔎 Finding existing categories to delete...');
      await deleteCollectionAndSubcollections(categoriesRef);
      log('✅ All existing categories and subcategories have been deleted.');
      
      // 2. Seed new categories and subcategories
      log('🌱 Starting to seed new categories...');
      const batch = writeBatch(db);

      for (const category of categoriesToSeed) {
        const categoryRef = doc(db, collections.categories, category.id);
        const categoryData = {
          name: category.name,
          description: category.name,
          organizationId: ORGANIZATION_ID,
          type: 'core',
          createdAt: serverTimestamp(),
          createdBy: CREATED_BY,
        };
        batch.set(categoryRef, categoryData);
        log(`   - Staged category: ${category.name} (ID: ${category.id})`);

        if (category.subcategories && category.subcategories.length > 0) {
          for (const subcategory of category.subcategories) {
            const subcategoryRef = doc(categoryRef, 'subcategories', subcategory.id);
            const subcategoryData = {
              name: subcategory.name,
              description: subcategory.name,
              createdAt: serverTimestamp(),
              createdBy: CREATED_BY,
            };
            batch.set(subcategoryRef, subcategoryData);
             log(`     - Staged subcategory: ${subcategory.name} (ID: ${subcategory.id})`);
          }
        }
      }
      
      await batch.commit();
      log('✅ Local Focus categories seeded successfully');
      toast({ title: 'Success!', description: 'Core categories have been seeded.' });

    } catch (error: any) {
      log(`🔥 Seeding script failed: ${error.message}`);
      console.error('Error details:', error);
      toast({ title: 'Seeding Failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Seed Core Categories</CardTitle>
        <CardDescription>
          Deletes and re-seeds the core Local Focus categories and subcategories.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Alert variant="destructive" className="mb-6">
            <AlertTitle>Warning: Destructive Operation</AlertTitle>
            <AlertDescription>
              This will delete ALL existing categories and subcategories before creating new ones. This cannot be undone.
            </AlertDescription>
        </Alert>
        <Button onClick={handleSeed} disabled={isLoading || !isSuperAdmin}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isLoading ? 'Seeding Categories...' : 'Run Category Seeder'}
        </Button>
         {logs.length > 0 && (
          <div className="mt-4 p-4 bg-muted rounded-md text-xs font-mono max-h-48 overflow-y-auto">
            {logs.map((logMsg, i) => (
              <p key={i}>{logMsg}</p>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
