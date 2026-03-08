import { useState, useEffect } from 'react';
import { FacultyLayout } from '@/components/layouts/FacultyLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Phone, Users as UsersIcon, AlertCircle } from 'lucide-react';

export default function FacultyParentComm() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [facultyDbId, setFacultyDbId] = useState('');
  const [records, setRecords] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ student_id: '', communication_type: 'call', date: '', summary: '', parent_name: '', parent_phone: '', follow_up_needed: false, follow_up_date: '' });

  useEffect(() => { if (user?.facultyId) init(); }, [user]);

  const init = async () => {
    const { data: faculty } = await supabase.from('faculty').select('id, section').eq('faculty_id', user?.facultyId).single();
    if (!faculty) return;
    setFacultyDbId(faculty.id);
    const { data: studs } = faculty.section
      ? await supabase.from('students').select('id, name, roll_number').eq('section', faculty.section as any).order('roll_number')
      : await supabase.from('students').select('id, name, roll_number').eq('tutor_id', faculty.id).order('roll_number');
    setStudents(studs || []);
    fetchRecords(faculty.id);
  };

  const fetchRecords = async (fid: string) => {
    const { data } = await supabase.from('parent_communications').select('*, students(name, roll_number)').eq('tutor_id', fid).order('date', { ascending: false });
    setRecords(data || []);
  };

  const addRecord = async () => {
    if (!form.student_id || !form.date || !form.summary) { toast({ title: 'Fill required fields', variant: 'destructive' }); return; }
    setLoading(true);
    try {
      await supabase.from('parent_communications').insert({
        tutor_id: facultyDbId, student_id: form.student_id, communication_type: form.communication_type,
        date: form.date, summary: form.summary, parent_name: form.parent_name || null,
        parent_phone: form.parent_phone || null, follow_up_needed: form.follow_up_needed,
        follow_up_date: form.follow_up_date || null,
      });
      toast({ title: 'Recorded', description: 'Parent communication logged.' });
      setOpen(false);
      setForm({ student_id: '', communication_type: 'call', date: '', summary: '', parent_name: '', parent_phone: '', follow_up_needed: false, follow_up_date: '' });
      fetchRecords(facultyDbId);
    } catch (e: any) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
    setLoading(false);
  };

  const pendingFollowUps = records.filter(r => r.follow_up_needed && r.follow_up_date && new Date(r.follow_up_date) <= new Date());

  return (
    <FacultyLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl md:text-3xl font-bold">Parent Communication Log</h1>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> Log Communication</Button></DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Record Parent Communication</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <Select value={form.student_id} onValueChange={v => setForm({ ...form, student_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select Student" /></SelectTrigger>
                  <SelectContent>{students.map(s => <SelectItem key={s.id} value={s.id}>{s.roll_number} - {s.name}</SelectItem>)}</SelectContent>
                </Select>
                <div className="grid grid-cols-2 gap-4">
                  <Select value={form.communication_type} onValueChange={v => setForm({ ...form, communication_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="call">Phone Call</SelectItem>
                      <SelectItem value="meeting">In-Person Meeting</SelectItem>
                      <SelectItem value="visit">Home Visit</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input placeholder="Parent Name" value={form.parent_name} onChange={e => setForm({ ...form, parent_name: e.target.value })} />
                  <Input placeholder="Phone Number" value={form.parent_phone} onChange={e => setForm({ ...form, parent_phone: e.target.value })} />
                </div>
                <Textarea placeholder="Summary of conversation..." value={form.summary} onChange={e => setForm({ ...form, summary: e.target.value })} />
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Checkbox checked={form.follow_up_needed} onCheckedChange={c => setForm({ ...form, follow_up_needed: !!c })} />
                    <span className="text-sm">Follow-up needed</span>
                  </div>
                  {form.follow_up_needed && <Input type="date" value={form.follow_up_date} onChange={e => setForm({ ...form, follow_up_date: e.target.value })} className="w-40" />}
                </div>
                <Button onClick={addRecord} disabled={loading} className="w-full">{loading ? 'Saving...' : 'Save Record'}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {pendingFollowUps.length > 0 && (
          <Card className="border-warning/30 bg-warning/5">
            <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><AlertCircle className="h-5 w-5 text-warning" /> Pending Follow-ups</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {pendingFollowUps.map(r => (
                  <div key={r.id} className="flex items-center justify-between p-2 rounded border bg-background">
                    <span className="text-sm">{(r.students as any)?.name} — {r.summary.slice(0, 60)}...</span>
                    <Badge variant="outline">{new Date(r.follow_up_date).toLocaleDateString('en-IN')}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <Card><CardContent className="pt-6 text-center"><p className="text-2xl font-bold">{records.length}</p><p className="text-xs text-muted-foreground">Total Records</p></CardContent></Card>
          <Card><CardContent className="pt-6 text-center"><p className="text-2xl font-bold">{records.filter(r => r.communication_type === 'call').length}</p><p className="text-xs text-muted-foreground">Phone Calls</p></CardContent></Card>
          <Card><CardContent className="pt-6 text-center"><p className="text-2xl font-bold">{records.filter(r => r.communication_type === 'meeting').length}</p><p className="text-xs text-muted-foreground">Meetings</p></CardContent></Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Phone className="h-5 w-5" /> Communication History</CardTitle></CardHeader>
          <CardContent>
            {records.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No communications logged yet.</p>
            ) : (
              <div className="rounded-md border overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Parent</TableHead>
                      <TableHead>Summary</TableHead>
                      <TableHead>Follow-up</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map(r => (
                      <TableRow key={r.id}>
                        <TableCell>{new Date(r.date).toLocaleDateString('en-IN')}</TableCell>
                        <TableCell>{(r.students as any)?.name}</TableCell>
                        <TableCell><Badge variant="outline" className="capitalize">{r.communication_type}</Badge></TableCell>
                        <TableCell>{r.parent_name || '-'}</TableCell>
                        <TableCell className="max-w-48 truncate">{r.summary}</TableCell>
                        <TableCell>{r.follow_up_needed ? <Badge variant="secondary">{r.follow_up_date ? new Date(r.follow_up_date).toLocaleDateString('en-IN') : 'Yes'}</Badge> : '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </FacultyLayout>
  );
}
