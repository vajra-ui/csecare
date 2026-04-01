import { useState, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  Upload, Download, FileSpreadsheet, AlertTriangle, CheckCircle2,
  XCircle, Loader2, ArrowRight, RotateCcw, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { downloadCSV } from '@/lib/csvExport';

// ── Types ───────────────────────────────────────────────────────────

export interface FieldDef {
  key: string;
  label: string;
  required: boolean;
  aliases: string[];           // smart-match keywords
  validate?: (v: string) => string | null; // returns error msg or null
}

export interface UploadResult {
  success: boolean;
  error?: string;
}

interface RowError {
  row: number;
  field: string;
  value: string;
  message: string;
}

interface MappedRow {
  rowIndex: number;
  data: Record<string, string>;
  errors: RowError[];
  isDuplicate: boolean;
}

type Step = 'upload' | 'mapping' | 'preview' | 'processing' | 'done';

interface Props {
  title: string;
  description: string;
  fields: FieldDef[];
  templateFileName: string;
  templateSampleRow: Record<string, string>;
  duplicateKeys: string[];                       // field keys to check dups
  onInsertRow: (row: Record<string, string>) => Promise<UploadResult>;
  existingKeys?: Set<string>;                    // pre-loaded dups from DB
}

// ── Smart column matcher ────────────────────────────────────────────

function normalize(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function autoMap(
  uploadedCols: string[],
  fields: FieldDef[],
): Record<string, string> {
  const mapping: Record<string, string> = {};
  const usedCols = new Set<string>();

  for (const field of fields) {
    const normKey = normalize(field.key);
    const normAliases = field.aliases.map(normalize);

    // exact match first
    let match = uploadedCols.find(
      c => !usedCols.has(c) && normalize(c) === normKey,
    );
    // alias match
    if (!match) {
      match = uploadedCols.find(
        c => !usedCols.has(c) && normAliases.some(a => normalize(c).includes(a) || a.includes(normalize(c))),
      );
    }
    if (match) {
      mapping[field.key] = match;
      usedCols.add(match);
    }
  }
  return mapping;
}

// ── Component ───────────────────────────────────────────────────────

export function BulkUpload({
  title, description, fields, templateFileName, templateSampleRow,
  duplicateKeys, onInsertRow, existingKeys = new Set(),
}: Props) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>('upload');
  const [rawData, setRawData] = useState<Record<string, string>[]>([]);
  const [uploadedCols, setUploadedCols] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [mappedRows, setMappedRows] = useState<MappedRow[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [dupMode, setDupMode] = useState<'skip' | 'update'>('skip');

  // processing state
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [failCount, setFailCount] = useState(0);
  const [failedRows, setFailedRows] = useState<{ row: number; reason: string }[]>([]);

  // ── Reset ──
  const reset = () => {
    setStep('upload');
    setRawData([]);
    setUploadedCols([]);
    setMapping({});
    setMappedRows([]);
    setProcessing(false);
    setProgress(0);
    setSuccessCount(0);
    setFailCount(0);
    setFailedRows([]);
    if (fileRef.current) fileRef.current.value = '';
  };

  // ── File parsing ──
  const parseFile = useCallback((file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext || '')) {
      toast({ title: 'Invalid File', description: 'Please upload .xlsx, .xls, or .csv files only.', variant: 'destructive' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array', cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json: Record<string, any>[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

        if (json.length === 0) {
          toast({ title: 'Empty File', description: 'The uploaded file contains no data rows.', variant: 'destructive' });
          return;
        }

        // Normalize all values to strings and handle dates
        const cols = Object.keys(json[0]);
        const rows = json.map(row => {
          const clean: Record<string, string> = {};
          for (const col of cols) {
            let val = row[col];
            if (val instanceof Date) {
              val = val.toISOString().split('T')[0]; // YYYY-MM-DD
            }
            clean[col] = String(val ?? '').trim();
          }
          return clean;
        });

        setUploadedCols(cols);
        setRawData(rows);
        setMapping(autoMap(cols, fields));
        setStep('mapping');

        toast({ title: 'File Loaded', description: `${rows.length} rows found with ${cols.length} columns.` });
      } catch {
        toast({ title: 'Parse Error', description: 'Could not parse the file. Please check the format.', variant: 'destructive' });
      }
    };
    reader.readAsArrayBuffer(file);
  }, [fields, toast]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) parseFile(file);
  };

  // ── Template download ──
  const downloadTemplate = () => {
    const headers = fields.map(f => f.key);
    const ws = XLSX.utils.json_to_sheet([templateSampleRow], { header: headers });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, `${templateFileName}.xlsx`);
  };

  // ── Mapping → Preview ──
  const proceedToPreview = () => {
    const missingRequired = fields.filter(f => f.required && !mapping[f.key]);
    if (missingRequired.length > 0) {
      toast({
        title: 'Missing Required Mappings',
        description: `Map these fields: ${missingRequired.map(f => f.label).join(', ')}`,
        variant: 'destructive',
      });
      return;
    }

    const rows: MappedRow[] = rawData.map((raw, idx) => {
      const data: Record<string, string> = {};
      const errors: RowError[] = [];

      for (const field of fields) {
        const colName = mapping[field.key];
        const val = colName ? (raw[colName] ?? '').trim() : '';
        data[field.key] = val;

        if (field.required && !val) {
          errors.push({ row: idx + 2, field: field.label, value: val, message: `${field.label} is required` });
        } else if (val && field.validate) {
          const err = field.validate(val);
          if (err) errors.push({ row: idx + 2, field: field.label, value: val, message: err });
        }
      }

      // duplicate check
      const dupKey = duplicateKeys.map(k => data[k]).join('|');
      const isDuplicate = existingKeys.has(dupKey);

      return { rowIndex: idx + 2, data, errors, isDuplicate };
    });

    setMappedRows(rows);
    setStep('preview');
  };

  // ── Process upload ──
  const processUpload = async () => {
    setStep('processing');
    setProcessing(true);

    const rowsToProcess = mappedRows.filter(r => {
      if (r.errors.length > 0) return false;
      if (r.isDuplicate && dupMode === 'skip') return false;
      return true;
    });

    let ok = 0, fail = 0;
    const failed: { row: number; reason: string }[] = [];

    // Also count skipped invalid/dup rows
    const skippedInvalid = mappedRows.filter(r => r.errors.length > 0);
    skippedInvalid.forEach(r => {
      failed.push({ row: r.rowIndex, reason: r.errors.map(e => e.message).join('; ') });
    });
    if (dupMode === 'skip') {
      mappedRows.filter(r => r.isDuplicate && r.errors.length === 0).forEach(r => {
        failed.push({ row: r.rowIndex, reason: 'Duplicate record — skipped' });
      });
    }

    for (let i = 0; i < rowsToProcess.length; i++) {
      const row = rowsToProcess[i];
      try {
        const result = await onInsertRow(row.data);
        if (result.success) ok++;
        else {
          fail++;
          failed.push({ row: row.rowIndex, reason: result.error || 'Unknown error' });
        }
      } catch (e) {
        fail++;
        failed.push({ row: row.rowIndex, reason: e instanceof Error ? e.message : 'Unknown error' });
      }
      setProgress(Math.round(((i + 1) / rowsToProcess.length) * 100));
    }

    setSuccessCount(ok);
    setFailCount(fail + failed.length - fail); // total failed including skipped
    setFailedRows(failed);
    setProcessing(false);
    setStep('done');
  };

  const downloadErrorReport = () => {
    downloadCSV(
      failedRows.map(r => ({ 'Excel Row': r.row, Reason: r.reason })),
      `${templateFileName}_errors`,
    );
  };

  // ── Stats ──
  const validCount = mappedRows.filter(r => r.errors.length === 0 && (!r.isDuplicate || dupMode === 'update')).length;
  const errorCount = mappedRows.filter(r => r.errors.length > 0).length;
  const dupCount = mappedRows.filter(r => r.isDuplicate).length;

  // ── Render ────────────────────────────────────────────────────────

  return (
    <Dialog open={step !== 'upload' || false} onOpenChange={(open) => { if (!open && !processing) reset(); }}>
      {/* Upload area — always visible */}
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer
              ${dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <p className="font-medium">Drag & drop your Excel/CSV file here</p>
            <p className="text-sm text-muted-foreground mt-1">Supports .xlsx, .xls, and .csv formats</p>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
          <div className="flex justify-between mt-4">
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="mr-2 h-4 w-4" />
              Download Template
            </Button>
            <p className="text-xs text-muted-foreground self-center">
              Any column names accepted — you'll map them next
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Multi-step dialog */}
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {step === 'mapping' && 'Step 1: Map Columns'}
            {step === 'preview' && 'Step 2: Preview & Validate'}
            {step === 'processing' && 'Step 3: Uploading...'}
            {step === 'done' && 'Upload Complete'}
          </DialogTitle>
          <DialogDescription>
            {step === 'mapping' && 'Match your file columns to the required system fields.'}
            {step === 'preview' && 'Review the data before saving. Invalid rows are highlighted.'}
            {step === 'processing' && 'Please wait while records are being processed.'}
            {step === 'done' && 'See the results below.'}
          </DialogDescription>
        </DialogHeader>

        {/* ── MAPPING STEP ── */}
        {step === 'mapping' && (
          <div className="flex-1 overflow-auto space-y-4">
            <div className="grid gap-3">
              {fields.map(field => (
                <div key={field.key} className="flex items-center gap-3">
                  <div className="w-40 flex items-center gap-1">
                    <span className="text-sm font-medium">{field.label}</span>
                    {field.required && <span className="text-destructive text-xs">*</span>}
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Select
                    value={mapping[field.key] || '__none__'}
                    onValueChange={(v) => setMapping(prev => ({ ...prev, [field.key]: v === '__none__' ? '' : v }))}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select column..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— Not mapped —</SelectItem>
                      {uploadedCols.map(col => (
                        <SelectItem key={col} value={col}>{col}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {mapping[field.key] && (
                    <Badge variant="outline" className="text-xs shrink-0">
                      ✓ Mapped
                    </Badge>
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={reset}>
                <RotateCcw className="mr-2 h-4 w-4" /> Start Over
              </Button>
              <Button onClick={proceedToPreview}>
                Preview Data <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ── PREVIEW STEP ── */}
        {step === 'preview' && (
          <div className="flex-1 overflow-hidden flex flex-col space-y-3">
            {/* Stats */}
            <div className="flex gap-3 flex-wrap">
              <Badge variant="secondary" className="text-sm">
                Total: {mappedRows.length}
              </Badge>
              <Badge className="bg-green-500/10 text-green-700 border-green-200 text-sm">
                <CheckCircle2 className="mr-1 h-3 w-3" /> Valid: {validCount}
              </Badge>
              {errorCount > 0 && (
                <Badge variant="destructive" className="text-sm">
                  <XCircle className="mr-1 h-3 w-3" /> Errors: {errorCount}
                </Badge>
              )}
              {dupCount > 0 && (
                <Badge className="bg-yellow-500/10 text-yellow-700 border-yellow-200 text-sm">
                  <AlertTriangle className="mr-1 h-3 w-3" /> Duplicates: {dupCount}
                </Badge>
              )}
            </div>

            {/* Duplicate handling */}
            {dupCount > 0 && (
              <div className="border rounded-lg p-3">
                <p className="text-sm font-medium mb-2">Duplicate Handling:</p>
                <RadioGroup value={dupMode} onValueChange={(v) => setDupMode(v as 'skip' | 'update')} className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="skip" id="skip" />
                    <Label htmlFor="skip" className="text-sm">Skip duplicates</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="update" id="update" />
                    <Label htmlFor="update" className="text-sm">Update existing</Label>
                  </div>
                </RadioGroup>
              </div>
            )}

            {/* Data table */}
            <ScrollArea className="flex-1 border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead className="w-20">Status</TableHead>
                    {fields.map(f => (
                      <TableHead key={f.key}>{f.label}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mappedRows.slice(0, 100).map((row) => (
                    <TableRow
                      key={row.rowIndex}
                      className={
                        row.errors.length > 0
                          ? 'bg-destructive/5'
                          : row.isDuplicate
                          ? 'bg-yellow-500/5'
                          : ''
                      }
                    >
                      <TableCell className="text-xs text-muted-foreground">{row.rowIndex}</TableCell>
                      <TableCell>
                        {row.errors.length > 0 ? (
                          <XCircle className="h-4 w-4 text-destructive" />
                        ) : row.isDuplicate ? (
                          <AlertTriangle className="h-4 w-4 text-yellow-600" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        )}
                      </TableCell>
                      {fields.map(f => {
                        const hasError = row.errors.some(e => e.field === f.label);
                        return (
                          <TableCell
                            key={f.key}
                            className={hasError ? 'text-destructive font-medium' : ''}
                            title={row.errors.find(e => e.field === f.label)?.message}
                          >
                            {row.data[f.key] || <span className="text-muted-foreground italic">empty</span>}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {mappedRows.length > 100 && (
                <p className="text-center py-2 text-sm text-muted-foreground">
                  Showing first 100 of {mappedRows.length} rows
                </p>
              )}
            </ScrollArea>

            <div className="flex justify-between pt-2 border-t">
              <Button variant="outline" onClick={() => setStep('mapping')}>
                ← Back to Mapping
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={reset}>Cancel</Button>
                <Button onClick={processUpload} disabled={validCount === 0}>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload {validCount} Records
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ── PROCESSING STEP ── */}
        {step === 'processing' && (
          <div className="flex-1 flex flex-col items-center justify-center space-y-6 py-8">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <div className="w-full max-w-md space-y-2">
              <Progress value={progress} className="h-3" />
              <p className="text-center text-sm text-muted-foreground">{progress}% complete</p>
            </div>
          </div>
        )}

        {/* ── DONE STEP ── */}
        {step === 'done' && (
          <div className="flex-1 space-y-6 py-4">
            <div className="text-center space-y-3">
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
              <h3 className="text-xl font-semibold">Upload Complete!</h3>
            </div>

            <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
              <Card className="text-center p-4">
                <p className="text-2xl font-bold text-green-600">{successCount}</p>
                <p className="text-sm text-muted-foreground">Uploaded</p>
              </Card>
              <Card className="text-center p-4">
                <p className="text-2xl font-bold text-destructive">{failedRows.length}</p>
                <p className="text-sm text-muted-foreground">Failed/Skipped</p>
              </Card>
            </div>

            {failedRows.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Failed Rows:</p>
                  <Button variant="outline" size="sm" onClick={downloadErrorReport}>
                    <Download className="mr-2 h-3 w-3" /> Download Error Report
                  </Button>
                </div>
                <ScrollArea className="max-h-40 border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Row</TableHead>
                        <TableHead>Reason</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {failedRows.slice(0, 50).map((r, i) => (
                        <TableRow key={i}>
                          <TableCell>{r.row}</TableCell>
                          <TableCell className="text-sm text-destructive">{r.reason}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            )}

            <div className="flex justify-center pt-2">
              <Button onClick={reset}>
                <RotateCcw className="mr-2 h-4 w-4" /> Upload Another File
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
