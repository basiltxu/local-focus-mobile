
'use client';

import { useState, useMemo, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, AlertTriangle, CheckCircle, FileWarning, RefreshCw, FileUp } from 'lucide-react';
import Papa from 'papaparse';
import { ZodSchema, ZodError } from 'zod';
import { CollectionReference, writeBatch, doc, serverTimestamp, query, where, getDocs, addDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { exportToCSV } from '@/utils/csv';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { useAuth } from '@/hooks/use-auth';
import { collections } from '@/lib/paths';

interface CSVImporterProps<T extends Record<string, any>> {
  isOpen: boolean;
  onClose: () => void;
  collectionName: string;
  expectedColumns: string[];
  validationSchema: ZodSchema<T>;
  firestoreCollection: CollectionReference;
  uniqueKeys: (keyof T)[];
  onImportComplete: () => void;
  organizationId?: string; // Optional Org ID for context
  organizationName?: string; // Optional Org Name for context
}

type RowStatus = 'valid' | 'invalid' | 'skipped' | 'duplicate' | 'update';

interface PreviewRow<T> {
  data: T;
  originalRow: number;
  status: RowStatus;
  errors?: string[];
  existingDocId?: string;
}

const BATCH_SIZE = 100;

export function CSVImporter<T extends Record<string, any>>({
  isOpen,
  onClose,
  collectionName,
  expectedColumns,
  validationSchema,
  firestoreCollection,
  uniqueKeys,
  onImportComplete,
  organizationId,
  organizationName,
}: CSVImporterProps<T>) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<PreviewRow<T>[]>([]);
  const [parsingError, setParsingError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [updateExisting, setUpdateExisting] = useState(false);
  
  const resetState = useCallback(() => {
    setFile(null);
    setPreviewData([]);
    setParsingError(null);
    setIsProcessing(false);
    setUpdateExisting(false);
  }, []);

  const handleClose = () => {
    resetState();
    onClose();
  };
  
  const logAdminAction = async (data: any) => {
    if (!user) return;
    try {
        await addDoc(collection(db, collections.adminAuditLogs), {
            ...data,
            performedBy: user.email,
            performedByRole: user.role,
            createdAt: serverTimestamp()
        });
    } catch (e) {
        console.error("Failed to log admin action", e);
    }
  }

  const processFile = useCallback(async (fileToProcess: File) => {
    setIsProcessing(true);
    setParsingError(null);
    setPreviewData([]);

    const parsedRows = await new Promise<any[]>((resolve, reject) => {
      Papa.parse(fileToProcess, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => resolve(results.data),
        error: (err) => reject(new Error(err.message)),
      });
    });

    const headers = Object.keys(parsedRows[0] || {});
    if (!expectedColumns.every(col => headers.includes(col))) {
      const missing = expectedColumns.filter(c => !headers.includes(c));
      setParsingError(`CSV is missing required columns: ${missing.join(', ')}.`);
      setIsProcessing(false);
      return;
    }

    const validatedRows: PreviewRow<T>[] = parsedRows.map((rowData, index) => {
      try {
        const validatedData = validationSchema.parse(rowData);
        return { data: validatedData, originalRow: index + 2, status: 'valid' };
      } catch (error) {
        return {
          data: rowData, originalRow: index + 2, status: 'invalid',
          errors: error instanceof ZodError ? error.errors.map(e => `${e.path.join('.')}: ${e.message}`) : ['Unknown validation error'],
        };
      }
    });

    const validRows = validatedRows.filter(r => r.status === 'valid');
    
    // Deduplication check
    const existingDocsQuery = query(firestoreCollection, where(uniqueKeys[0] as string, 'in', validRows.map(r => r.data[uniqueKeys[0]])));
    const existingDocsSnap = await getDocs(existingDocsQuery);
    const existingDocs = existingDocsSnap.docs.map(d => ({ id: d.id, ...d.data() as T }));

    const finalRows = validatedRows.map(row => {
        if (row.status !== 'valid') return row;
        
        const existingDoc = existingDocs.find(doc => uniqueKeys.some(key => doc[key] === row.data[key]));

        if(existingDoc) {
            return { ...row, status: updateExisting ? 'update' : 'duplicate', existingDocId: existingDoc.id, errors: updateExisting ? [] : ['Duplicate record found'] };
        }
        return row;
    });

    setPreviewData(finalRows);
    setIsProcessing(false);

  }, [expectedColumns, firestoreCollection, uniqueKeys, validationSchema, updateExisting]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    await processFile(selectedFile);
  };
  
  useEffect(() => {
    if (file) {
      processFile(file);
    }
  }, [updateExisting, file, processFile]);


  const handleImport = async () => {
    const rowsToProcess = previewData.filter(row => row.status === 'valid' || row.status === 'update');
    if (rowsToProcess.length === 0) {
      toast({ title: 'No valid data to import', variant: 'destructive' });
      return;
    }

    setIsProcessing(true);
    let successCount = 0;
    let updateCount = 0;

    for (let i = 0; i < rowsToProcess.length; i += BATCH_SIZE) {
      const batch = writeBatch(db);
      const chunk = rowsToProcess.slice(i, i + BATCH_SIZE);
      
      chunk.forEach(row => {
        const isUpdate = row.status === 'update' && row.existingDocId;
        const docRef = isUpdate ? doc(firestoreCollection, row.existingDocId) : doc(firestoreCollection);
        
        const dataWithTimestamp = {
          ...row.data,
          ...(isUpdate ? { updatedAt: serverTimestamp() } : { createdAt: serverTimestamp(), updatedAt: serverTimestamp() }),
        };

        if (isUpdate) {
            batch.update(docRef, dataWithTimestamp);
            updateCount++;
        } else {
            batch.set(docRef, dataWithTimestamp);
            successCount++;
        }
      });
      
      try {
        await batch.commit();
      } catch (error: any) {
          toast({ title: 'Batch Import Failed', description: `Error: ${error.message}`, variant: 'destructive' });
          setIsProcessing(false);
          return;
      }
    }
    
    toast({
        title: 'Import Complete',
        description: `${successCount} created, ${updateCount} updated, ${previewData.length - rowsToProcess.length} skipped.`,
    });
    
    // Log admin action
    if(organizationId) {
        await logAdminAction({
            actionType: 'IMPORT',
            targetOrgId: organizationId,
            targetOrgName: organizationName,
            details: {
                message: `Bulk import for ${organizationName}`,
                count: previewData.length,
                success: successCount + updateCount,
                failed: previewData.length - (successCount + updateCount),
            }
        });
    }

    setIsProcessing(false);
    onImportComplete();
    handleClose();
  };

  const downloadFailedRows = () => {
      const failed = previewData.filter(r => r.status === 'invalid' || r.status === 'duplicate');
      if (failed.length === 0) {
          toast({ title: 'No failed or duplicate rows to download.'});
          return;
      }
      const dataToExport = failed.map(r => ({
          ...r.data,
          _errors: r.errors?.join('; ')
      }));
      exportToCSV('failed_rows.csv', dataToExport);
  }

  const { validCount, invalidCount, duplicateCount, updateCount } = useMemo(() => {
    return previewData.reduce((acc, row) => {
      if (row.status === 'valid') acc.validCount++;
      if (row.status === 'invalid') acc.invalidCount++;
      if (row.status === 'duplicate') acc.duplicateCount++;
      if (row.status === 'update') acc.updateCount++;
      return acc;
    }, { validCount: 0, invalidCount: 0, duplicateCount: 0, updateCount: 0 });
  }, [previewData]);

  const getStatusBadge = (status: RowStatus) => {
    switch(status) {
        case 'valid': return <Badge variant="default" className="bg-green-500">Valid</Badge>
        case 'invalid': return <Badge variant="destructive">Invalid</Badge>
        case 'duplicate': return <Badge variant="secondary">Duplicate</Badge>
        case 'update': return <Badge variant="outline" className="text-blue-500 border-blue-500">Update</Badge>
        default: return <Badge variant="outline">Skipped</Badge>
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Import {collectionName} from CSV</DialogTitle>
          <DialogDescription>Upload, validate, and import data into Firestore.</DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
          <div className='flex justify-between items-center'>
            <Input type="file" accept=".csv" onChange={handleFileChange} disabled={isProcessing} className="max-w-xs" />
            <div className="flex items-center space-x-2">
                <Switch id="update-existing-switch" checked={updateExisting} onCheckedChange={setUpdateExisting} />
                <Label htmlFor="update-existing-switch">Update existing records</Label>
            </div>
          </div>


          {isProcessing && !previewData.length && <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>}

          {parsingError && <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>Parsing Error</AlertTitle><AlertDescription>{parsingError}</AlertDescription></Alert>}
          
          {previewData.length > 0 && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"><CheckCircle className="h-4 w-4 text-green-600" /><AlertTitle>{validCount} Valid</AlertTitle></Alert>
                <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"><RefreshCw className="h-4 w-4 text-blue-600" /><AlertTitle>{updateCount} to Update</AlertTitle></Alert>
                <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>{invalidCount} Invalid</AlertTitle></Alert>
                <Alert variant="secondary"><FileWarning className="h-4 w-4" /><AlertTitle>{duplicateCount} Duplicates</AlertTitle></Alert>
              </div>

              <ScrollArea className="border rounded-md flex-1">
                <Table>
                  <TableHeader className="sticky top-0 bg-muted z-10">
                    <TableRow>
                      <TableHead>Row</TableHead>
                      <TableHead>Status</TableHead>
                      {expectedColumns.map(col => <TableHead key={col}>{col}</TableHead>)}
                      <TableHead>Errors</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.map(row => (
                      <TableRow key={row.originalRow} className={row.status === 'invalid' || row.status === 'duplicate' ? 'bg-red-50 dark:bg-red-900/20' : ''}>
                        <TableCell>{row.originalRow}</TableCell>
                        <TableCell>{getStatusBadge(row.status)}</TableCell>
                        {expectedColumns.map(col => <TableCell key={col} className="max-w-[150px] truncate">{row.data[col]}</TableCell>)}
                        <TableCell className="text-red-600 text-xs max-w-[200px] truncate">{row.errors?.join('; ')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={downloadFailedRows} disabled={invalidCount + duplicateCount === 0}><FileUp className="mr-2 h-4 w-4" /> Export Failed Rows</Button>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleImport} disabled={isProcessing || (validCount + updateCount === 0)}>
            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Import {validCount + updateCount} rows
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
