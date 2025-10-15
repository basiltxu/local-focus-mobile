'use client';

import Papa from 'papaparse';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { collections } from '@/lib/paths';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';

interface CsvImporterProps {
  organizationId: string;
  onComplete?: () => void;
  disabled?: boolean;
}

/**
 * CsvImporter
 * - Validates, previews, and uploads users from a CSV file.
 * - Calls a Cloud Function to create Auth + Firestore users and trigger emails.
 */
export function CsvImporter({ organizationId, onComplete, disabled }: CsvImporterProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<any[]>([]);
  const [fileName, setFileName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { user } = useAuth();
  
  const requiredHeaders = ['fullName', 'email', 'role'];

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const resetState = () => {
    setOpen(false);
    setPreview([]);
    setFileName('');
    setValidationErrors([]);
    setIsUploading(false);
    setUploadProgress(0);
  };


  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setValidationErrors([]);
    setPreview([]);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data as any[];

        if (!rows.length) {
          setValidationErrors(['The CSV file is empty.']);
          return;
        }

        const headers = Object.keys(rows[0]);
        const missingHeaders = requiredHeaders.filter((h) => !headers.includes(h));
        if (missingHeaders.length) {
          setValidationErrors([`Missing required columns: ${missingHeaders.join(', ')}`]);
          return;
        }

        const cleaned = rows.map((r, i) => ({
          _row: i + 2, // +2 for header row and 0-indexing
          fullName: (r.fullName || '').trim(),
          email: (r.email || '').trim(),
          role: (r.role || 'User').trim(),
        }));

        const errors: string[] = [];
        const emails = cleaned.map((r) => r.email).filter(Boolean);
        const uniqueEmails = new Set(emails);
        if (emails.length !== uniqueEmails.size) {
          const duplicates = emails.filter((item, index) => emails.indexOf(item) !== index);
          errors.push(`Duplicate emails found in CSV: ${[...new Set(duplicates)].join(', ')}`);
        }

        cleaned.forEach((r) => {
          if (!r.fullName) errors.push(`Row ${r._row}: Missing fullName`);
          if (!r.email) errors.push(`Row ${r._row}: Missing email`);
          if (r.email && !validateEmail(r.email)) errors.push(`Row ${r._row}: Invalid email format (${r.email})`);
          if (!['User', 'orgAdmin'].includes(r.role)) errors.push(`Row ${r._row}: Invalid role '${r.role}'. Must be 'User' or 'orgAdmin'.`);
        });

        if (errors.length) {
          setValidationErrors(errors);
        } else {
          setPreview(cleaned);
          setValidationErrors([]);
        }
      },
      error: (err) => {
        setValidationErrors([`Parsing error: ${err.message}`]);
      },
    });
  };

  const handleUpload = async () => {
    if (!user) {
      toast({ title: `Authentication error`, variant: 'destructive' });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    const createUserBatch = httpsCallable(functions, 'createUserBatch');

    try {
        const result = await createUserBatch({
            users: preview,
            organizationId,
            importedBy: {
              uid: user.uid,
              email: user.email,
            }
        });

        const { successCount, errorCount, failedRows } = result.data as any;

        toast({
            title: '✅ Import Completed',
            description: `${successCount} users created, ${errorCount} failed.`,
        });

        if (failedRows && failedRows.length > 0) {
            console.error('Failed Rows:', failedRows);
            // Optionally, trigger a download of failed rows here.
        }
        
        resetState();
        onComplete?.();

    } catch (err: any) {
        console.error("Error calling 'createUserBatch' function:", err);
        toast({ title: `Import Failed`, description: err.message, variant: 'destructive' });
        setIsUploading(false);
    }
  };

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)} disabled={disabled}>
        <Upload className="mr-2 h-4 w-4" /> Import CSV
      </Button>

      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && resetState()}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Import Users from CSV</DialogTitle>
          </DialogHeader>

          <input
            type="file"
            accept=".csv"
            className="block my-3 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
            onChange={handleFileChange}
          />

          {fileName && (
            <p className="text-sm text-muted-foreground mb-2">
              File: {fileName}
            </p>
          )}

          {validationErrors.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Validation Errors</AlertTitle>
              <AlertDescription>
                <ul className="list-disc pl-5 max-h-40 overflow-y-auto">
                  {validationErrors.map((err, i) => <li key={i}>{err}</li>)}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {preview.length > 0 && validationErrors.length === 0 && (
            <div className="border rounded-md overflow-x-auto max-h-80 mb-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    {requiredHeaders.map((header) => (
                      <TableHead key={header}>{header}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.map((row, i) => (
                    <TableRow key={i}>
                      <TableCell>{row.fullName}</TableCell>
                      <TableCell>{row.email}</TableCell>
                      <TableCell>{row.role}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={resetState}>
              Cancel
            </Button>
            <Button
              disabled={preview.length === 0 || validationErrors.length > 0 || isUploading}
              onClick={handleUpload}
            >
              {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isUploading ? `Uploading...` : 'Upload Users'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
