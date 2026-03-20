import { useState, useEffect } from 'react';
import { Upload, Loader2, Plus, Trash2, Send, FileSpreadsheet } from 'lucide-react';
import { COELayout } from '@/components/layouts/COELayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface ResultRow {
  register_number: string;
  subject_code: string;
  subject_name: string;
  marks: string;
  grade: string;
}

export default function COEUpload() {
  const { toast } = useToast();
  const { session } = useAuth();
  const [semester, setSemester] = useState('1');
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState<ResultRow[]>([{ register_number: '', subject_code: '', subject_name: '', marks: '', grade: '' }]);
  const [bulkText, setBulkText] = useState('');

  const addRow = () => setRows([...rows, { register_number: '', subject_code: '', subject_name: '', marks: '', grade: '' }]);
  const removeRow = (i: number) => setRows(rows.filter((_, idx) => idx !== i));
  const updateRow = (i: number, field: keyof ResultRow, value: string) => {
    const updated = [...rows];
    updated[i][field] = value;
    setRows(updated);
  };

  const handleSubmit = async (data: ResultRow[]) => {
    if (data.length === 0) { toast({ title: 'No data', variant: 'destructive' }); return; }
    setSaving(true);

    try {
      // Get register numbers
      const regNums = [...new Set(data.map(r => r.register_number.trim().toUpperCase()))];
      const { data: students } = await supabase.from('students').select('id, register_number').in('register_number', regNums);

      if (!students || students.length === 0) {
        toast({ title: 'No matching students found', variant: 'destructive' });
        setSaving(false);
        return;
      }

      const studentMap = new Map(students.map(s => [s.register_number.toUpperCase(), s.id]));
      const userId = session?.user?.id;

      const inserts = data
        .filter(r => studentMap.has(r.register_number.trim().toUpperCase()))
        .map(r => ({
          student_id: studentMap.get(r.register_number.trim().toUpperCase())!,
          semester: parseInt(semester),
          subject_code: r.subject_code.trim(),
          subject_name: r.subject_name.trim(),
          marks: r.marks ? parseFloat(r.marks) : null,
          grade: r.grade.trim() || null,
          published_by: userId,
          is_published: false,
        }));

      if (inserts.length === 0) {
        toast({ title: 'No valid records to insert', variant: 'destructive' });
        setSaving(false);
        return;
      }

      const { error } = await supabase.from('results').insert(inserts as any);
      if (error) throw error;

      toast({ title: `${inserts.length} results uploaded successfully` });
      setRows([{ register_number: '', subject_code: '', subject_name: '', marks: '', grade: '' }]);
      setBulkText('');
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleManualSubmit = () => {
    const valid = rows.filter(r => r.register_number && r.subject_code && r.subject_name);
    handleSubmit(valid);
  };

  const handleBulkSubmit = () => {
    const lines = bulkText.trim().split('\n').filter(l => l.trim());
    const parsed: ResultRow[] = lines.map(line => {
      const parts = line.split(',').map(p => p.trim());
      return {
        register_number: parts[0] || '',
        subject_code: parts[1] || '',
        subject_name: parts[2] || '',
        marks: parts[3] || '',
        grade: parts[4] || '',
      };
    }).filter(r => r.register_number && r.subject_code);
    handleSubmit(parsed);
  };

  return (
    <COELayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Upload className="h-7 w-7 text-primary" /> Upload Results
          </h1>
          <p className="text-muted-foreground text-sm">Upload semester examination results</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Semester</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={semester} onValueChange={setSemester}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[1,2,3,4,5,6,7,8].map(s => <SelectItem key={s} value={String(s)}>Semester {s}</SelectItem>)}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Tabs defaultValue="manual">
          <TabsList>
            <TabsTrigger value="manual">Manual Entry</TabsTrigger>
            <TabsTrigger value="bulk">Bulk Paste (CSV)</TabsTrigger>
          </TabsList>

          <TabsContent value="manual" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Enter Results</CardTitle>
                <CardDescription>Add individual result records</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {rows.map((row, i) => (
                  <div key={i} className="grid grid-cols-2 md:grid-cols-6 gap-2 items-end">
                    <div>
                      <Label className="text-xs">Register No.</Label>
                      <Input value={row.register_number} onChange={e => updateRow(i, 'register_number', e.target.value)} placeholder="REG001" />
                    </div>
                    <div>
                      <Label className="text-xs">Subject Code</Label>
                      <Input value={row.subject_code} onChange={e => updateRow(i, 'subject_code', e.target.value)} placeholder="CS301" />
                    </div>
                    <div>
                      <Label className="text-xs">Subject Name</Label>
                      <Input value={row.subject_name} onChange={e => updateRow(i, 'subject_name', e.target.value)} placeholder="Data Structures" />
                    </div>
                    <div>
                      <Label className="text-xs">Marks</Label>
                      <Input type="number" value={row.marks} onChange={e => updateRow(i, 'marks', e.target.value)} placeholder="85" />
                    </div>
                    <div>
                      <Label className="text-xs">Grade</Label>
                      <Input value={row.grade} onChange={e => updateRow(i, 'grade', e.target.value)} placeholder="A" />
                    </div>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => removeRow(i)} disabled={rows.length === 1}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={addRow}><Plus className="h-4 w-4 mr-1" /> Add Row</Button>
                  <Button size="sm" onClick={handleManualSubmit} disabled={saving}>
                    {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Upload
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bulk">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2"><FileSpreadsheet className="h-5 w-5" /> Bulk CSV Upload</CardTitle>
                <CardDescription>Paste CSV: register_number, subject_code, subject_name, marks, grade</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea rows={10} value={bulkText} onChange={e => setBulkText(e.target.value)}
                  placeholder={"REG001, CS301, Data Structures, 85, A\nREG002, CS301, Data Structures, 72, B+"} />
                <Button onClick={handleBulkSubmit} disabled={saving || !bulkText.trim()}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Upload Bulk Results
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </COELayout>
  );
}
