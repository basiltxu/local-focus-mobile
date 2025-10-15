
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { writeBatch, doc, serverTimestamp, collection, DocumentReference } from 'firebase/firestore';
import { useAuth } from '@/hooks/use-auth';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
    countries, 
    palestineRegions, 
    westBankGovernorates, 
    gazaGovernorates, 
    israeliDistricts,
    citiesAndVillages,
    refugeeCamps,
    westBankSettlements
} from '@/lib/locations-data';
import type { Location } from '@/lib/types';
import { collections } from '@/lib/paths';


const BATCH_LIMIT = 250;

export function LocationSeedButton() {
  const { toast } = useToast();
  const { user, isSuperAdmin } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  
  const log = (message: string) => {
    setLogs(prev => [...prev, message]);
    console.log(message);
  }

  const handleSeedLocations = async () => {
    if (!user) {
      toast({ title: "Not authenticated", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    setLogs([]);
    
    let batches: ReturnType<typeof writeBatch>[] = [writeBatch(db)];
    let currentBatchIndex = 0;
    let operationCount = 0;
    
    const addToBatch = (ref: DocumentReference, data: any) => {
        if (operationCount >= BATCH_LIMIT) {
            batches.push(writeBatch(db));
            currentBatchIndex++;
            operationCount = 0;
            log(`🆕 Created new batch #${currentBatchIndex + 1}`);
        }
        batches[currentBatchIndex].set(ref, data, { merge: true });
        operationCount++;
    };
    
    try {
        log('--- Starting Location Database Seeding ---');
        const locationsCollection = collection(db, collections.locations);

        const addLocation = (id: string, data: Partial<Location>) => {
            const docRef = doc(locationsCollection, id);
            const fullData = { ...data, createdAt: serverTimestamp(), createdBy: user.uid };
            addToBatch(docRef, fullData);
        };

        countries.forEach(c => addLocation(c.name.toLowerCase(), c as any));
        log(`✅ Staged ${countries.length} countries.`);

        palestineRegions.forEach(pr => addLocation(pr.name!.toLowerCase().replace(' ', '_'), pr as any));
        log(`✅ Staged ${palestineRegions.length} Palestine regions.`);
        
        westBankGovernorates.forEach(g => {
            const id = `wb_${g.name!.toLowerCase().replace(/ & /g, '_').replace(/ /g, '_')}`;
            addLocation(id, { ...g, country: 'Palestine', region: 'West Bank' } as any);
        });
        log(`✅ Staged ${westBankGovernorates.length} West Bank governorates.`);

        gazaGovernorates.forEach(g => {
             const id = `gz_${g.name!.toLowerCase().replace(/ /g, '_')}`;
             addLocation(id, { ...g, country: 'Palestine', region: 'Gaza Strip' } as any);
        });
        log(`✅ Staged ${gazaGovernorates.length} Gaza governorates.`);

        israeliDistricts.forEach(d => {
            const id = `il_${d.name!.toLowerCase()}`;
            addLocation(id, { ...d, country: 'Israel', region: d.name } as any);
        });
        log(`✅ Staged ${israeliDistricts.length} Israeli districts.`);

        citiesAndVillages.forEach(loc => {
            const id = `${loc.parentId}_${loc.name!.toLowerCase().replace(/ /g, '_')}`;
            addLocation(id, loc);
        });
        log(`✅ Staged ${citiesAndVillages.length} cities and villages.`);
        
        refugeeCamps.forEach(loc => {
            const id = `${loc.parentId}_${loc.name!.toLowerCase().replace(/ /g, '_')}`;
            addLocation(id, loc);
        });
        log(`✅ Staged ${refugeeCamps.length} refugee camps.`);

        westBankSettlements.forEach(loc => {
            const id = `settlement_${loc.name!.toLowerCase().replace(/ /g, '_')}`;
            addLocation(id, loc);
        });
        log(`✅ Staged ${westBankSettlements.length} West Bank settlements.`);

        log(`--- Committing ${batches.length} Batch(es) ---`);
        for (let i = 0; i < batches.length; i++) {
            log(`➡️ Committing batch #${i + 1}...`);
            await batches[i].commit();
            log(`✅ Batch #${i + 1} committed.`);
        }
        log('--- All Location Batches Committed Successfully ---');

        toast({
            title: 'Location Database Seeded!',
            description: 'The hierarchical location structure has been created.',
            duration: 7000
        });

    } catch (error: any) {
        console.error('Error seeding locations:', error);
        log(`❌ Seeding Failed: ${error.message}`);
        toast({
            title: 'Seeding Failed',
            description: error.message || 'An unexpected error occurred.',
            variant: 'destructive',
        });
    } finally {
        setIsLoading(false);
    }
  };
  
  if (!isSuperAdmin) {
      return null;
  }

  return (
      <Card>
        <CardHeader>
          <CardTitle>Seed Location Data</CardTitle>
          <CardDescription>
            Populate the database with the full hierarchical location structure for Palestine and Israel.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive" className="mb-6">
            <AlertTitle>Warning: Data Creation</AlertTitle>
            <AlertDescription>
              This will create a large number of documents in the 'locations' collection. Run this only once for initial setup. Rerunning will overwrite existing data.
            </AlertDescription>
          </Alert>
          <Button onClick={handleSeedLocations} disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isLoading ? 'Seeding Locations...' : 'Run Location Seeder'}
          </Button>
          {logs.length > 0 && (
            <div className="mt-4 p-4 bg-muted rounded-md text-xs font-mono max-h-48 overflow-y-auto">
              {logs.map((logMsg, index) => (
                <p key={index}>{logMsg}</p>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
  );
}
