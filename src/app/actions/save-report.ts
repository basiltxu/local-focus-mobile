
'use server';

import { z } from 'zod';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Report } from '@/lib/types';
import { reportSchema } from '@/lib/schemas';
import { collections } from '@/lib/paths';

export async function saveReport(input: Omit<Report, 'id' | 'date' | 'generatedAt'>) {
    const validation = reportSchema.safeParse(input);

    if (!validation.success) {
        return {
        success: false,
        message: validation.error.errors.map((e) => e.message).join(', '),
        };
    }
    
    const { organizationId, ...reportData } = validation.data;
    
    const reportWithTimestamps = {
        ...reportData,
        date: serverTimestamp(),
        generatedAt: serverTimestamp(),
    };

    try {
        const reportRef = await addDoc(collection(db, collections.reports), reportWithTimestamps);
        return {
            success: true,
            message: 'Report saved successfully.',
            reportId: reportRef.id,
        };

    } catch (error: any) {
        console.error("Error saving report:", error);
        return {
            success: false,
            message: 'An error occurred while saving the report. Please check permissions.',
        };
  }
}
