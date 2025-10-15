
'use client';

import Papa from 'papaparse';
import { getDocs, query, where, CollectionReference } from 'firebase/firestore';

/**
 * Generates a CSV template file and triggers a download.
 * @param filename The name of the file to download.
 * @param columns An array of column headers.
 */
export function downloadTemplate(filename: string, columns: string[]) {
  const csvContent = columns.join(',');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');

  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Parses a CSV file using PapaParse.
 * @param file The CSV file to parse.
 * @returns A promise that resolves with an array of parsed row objects.
 */
export function parseCSV(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        resolve(results.data);
      },
      error: (error) => {
        reject(error);
      },
    });
  });
}

/**
 * Converts an array of objects to a CSV string and triggers a download.
 * @param filename The name for the downloaded file.
 * @param data The array of objects to export.
 */
export function exportToCSV(filename: string, data: any[]) {
    if (!data || data.length === 0) {
        console.error("No data provided to export.");
        return;
    }
    
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');

    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}


/**
 * Checks for duplicate records in Firestore based on unique keys from CSV rows.
 * @param rows The parsed CSV rows to check.
 * @param collectionRef The Firestore collection to query.
 * @param uniqueKeys The keys to check for uniqueness.
 * @returns A map where keys are a concatenation of unique values and values are the existing document IDs.
 */
export async function findExistingDocs<T extends Record<string, any>>(
  rows: T[],
  collectionRef: CollectionReference,
  uniqueKeys: (keyof T)[]
): Promise<Map<string, string>> {
  const existingDocsMap = new Map<string, string>();
  if (rows.length === 0 || uniqueKeys.length === 0) {
    return existingDocsMap;
  }
  
  // This approach queries for each unique key separately.
  // For multiple unique keys (e.g., name OR email), this can be optimized further
  // if Firestore supported OR queries on different fields more broadly,
  // or by fetching all docs and filtering client-side (for smaller collections).

  for (const key of uniqueKeys) {
    const uniqueValues = [...new Set(rows.map(row => row[key]).filter(Boolean))];
    
    // Firestore 'in' query is limited to 30 values per query.
    for (let i = 0; i < uniqueValues.length; i += 30) {
        const chunk = uniqueValues.slice(i, i + 30);
        const q = query(collectionRef, where(key as string, 'in', chunk));
        const snapshot = await getDocs(q);
        snapshot.forEach(doc => {
            const data = doc.data() as T;
            const mapKey = uniqueKeys.map(k => data[k]).join('|');
            if (!existingDocsMap.has(mapKey)) {
                existingDocsMap.set(mapKey, doc.id);
            }
        });
    }
  }

  return existingDocsMap;
}
