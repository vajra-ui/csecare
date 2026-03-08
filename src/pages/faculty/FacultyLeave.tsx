import { useState, useEffect } from 'react';
import { FacultyLayout } from '@/components/layouts/FacultyLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Calendar } from 'lucide-react';

export default function FacultyLeave() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [facultyDbId, setFacultyDbId] = useState('');
  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ leave_type: 'casual', start_date: '', end_date: '', reason: '' });

  useEffect(() => {
    if (user?.facultyId) init();
  }, [user]);

  const init = async () => {
    const { data: faculty } = await supabase.from('faculty').select('id').eq('faculty_id', user?.facultyId).single();
    if (!faculty) return;
    setFacultyDbId(faculty.id);
    fetchLeaves(faculty.id);
  };

  const fetchLeaves = async (fid: string) => {
    const { data } = await supabase.from('faculty_leaves').select('*').eq('faculty_id', fid).order('created_at', { ascending: false });
    setLeaves(data || []);
  };

  const applyLeave = async () => {
    if (!form.start_date || !form.end_date || !form.reason) {
      toast({ title: 'Missing fields', variant: 'destructive' }); return;
    }
    setLoading(true);
    try {
      await supabase.from('faculty_leaves').insert({
        faculty_id: facultyDbId, leave_type: form.leave_type,
        start_date: form.start_date, end_date: form.end_date, reason: form.reason,
      });
      toast({ title: 'Applied', description: 'Leave application submitted.' });
      setOpen(false);
      setForm({ leave_type: 'casual', start_date: '', end_date: '', reason: '' });
      fetchLeaves(facultyDbId);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
    setLoading(false);
  };

  const statusColor = (s: string) => {
    if (s === 'approved') return 'bg-green-500/10 text-green-700 border-green-200';
    if (s === 'rejected') return 'bg-destructive/10 text-destructive border-destructive/20';
    return 'bg-warning/10 text-warning-foreground border-warning/20';
  };

  const leaveStats = {
    total: leaves.length,
    approved: leaves.filter(l => l.status === 'approved').length,
    pending: leaves.filter(l => l.status === 'pending').length,
    rejected: leaves.filter(l => l.status === 'rejected').length,
  };

  return (
    <FacultyLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl md:text-3xl font-bold">Leave Management</h1>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> Apply Leave</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Apply for Leave</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <Select value={form.leave_type} onValueChange={v => setForm({ ...form, leave_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="casual">Casual Leave</SelectItem>
                    <SelectItem value="sick">Sick Leave</SelectItem>
                    <SelectItem value="earned">Earned Leave</SelectItem>
                    <SelectItem value="duty">Duty Leave</SelectItem>
                  </SelectContent>
                </Select>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-muted-foreground">From</label>
                    <Input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">To</label>
                    <Input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} />
                  </div>
                </div>
                <Textarea placeholder="Reason for leave" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} />
                <Button onClick={applyLeave} disabled={loading} className="w-full">{loading ? 'Submitting...' : 'Submit Application'}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4 sm:grid-cols-4">
          {[
            { label: 'Total', value: leaveStats.total, color: 'text-foreground' },
            { label: 'Approved', value: leaveStats.approved, color: 'text-green-600' },
            { label: 'Pending', value: leaveStats.pending, color: 'text-warning-foreground' },
            { label: 'Rejected', value: leaveStats.rejected, color: 'text-destructive' },
          ].map(s => (
            <Card key={s.label}>
              <CardContent className="pt-6 text-center">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5" /> Leave History</CardTitle></CardHeader>
          <CardContent>
            {leaves.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No leave applications yet.</p>
            ) : (
              <div className="rounded-md border overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>From</TableHead>
                      <TableHead>To</TableHead>
                      <TableHead>Days</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Remarks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leaves.map(l => {
                      const days = Math.ceil((new Date(l.end_date).getTime() - new Date(l.start_date).getTime()) / (1000*60*60*24)) + 1;
                      return (
                        <TableRow key={l.id}>
                          <TableCell><Badge variant="outline" className="capitalize">{l.leave_type}</Badge></TableCell>
                          <TableCell>{new Date(l.start_date).toLocaleDateString('en-IN')}</TableCell>
                          <TableCell>{new Date(l.end_date).toLocaleDateString('en-IN')}</TableCell>
                          <TableCell>{days}</TableCell>
                          <TableCell className="max-w-48 truncate">{l.reason}</TableCell>
                          <TableCell><Badge className={statusColor(l.status)} variant="outline">{l.status}</Badge></TableCell>
                          <TableCell className="text-sm text-muted-foreground">{l.remarks || '-'}</TableCell>
                        </TableRow>
                      );
                    })}
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
