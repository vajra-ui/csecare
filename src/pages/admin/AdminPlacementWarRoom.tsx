import { useEffect, useMemo, useState } from 'react';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Briefcase, Plus, Trash2, Trophy, DollarSign, Users, TrendingUp } from 'lucide-react';
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

interface Placement {
  id: string;
  student_id: string;
  company: string;
  role: string | null;
  package_lpa: number | null;
  offer_type: string;
  offer_date: string;
  status: string;
  notes: string | null;
  students?: { full_name: string; register_number: string; section: string };
}

const STATUSES = ['OFFERED', 'ACCEPTED', 'DECLINED', 'JOINED'];
const TYPES = ['FULL_TIME', 'INTERNSHIP', 'PPO'];

export default function AdminPlacementWarRoom() {
  const { toast } = useToast();
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ student_id: '', company: '', role: '', package_lpa: '', offer_type: 'FULL_TIME', status: 'OFFERED', offer_date: new Date().toISOString().slice(0, 10), notes: '' });

  const load = async () => {
    const { data } = await supabase.from('placements').select('*, students(full_name, register_number, section)').order('offer_date', { ascending: false });
    setPlacements((data as any) || []);
    const { data: st } = await supabase.from('students').select('id, full_name, register_number, section').order('full_name');
    setStudents(st || []);
  };
  useEffect(() => { load(); }, []);

  const stats = useMemo(() => {
    const uniquePlaced = new Set(placements.map((p) => p.student_id)).size;
    const packages = placements.map((p) => Number(p.package_lpa || 0)).filter((n) => n > 0);
    const highest = packages.length ? Math.max(...packages) : 0;
    const avg = packages.length ? packages.reduce((a, b) => a + b, 0) / packages.length : 0;
    return { total: placements.length, placed: uniquePlaced, highest, avg };
  }, [placements]);

  const byCompany = useMemo(() => {
    const m = new Map<string, number>();
    placements.forEach((p) => m.set(p.company, (m.get(p.company) || 0) + 1));
    return Array.from(m.entries()).map(([company, count]) => ({ company, count })).sort((a, b) => b.count - a.count).slice(0, 10);
  }, [placements]);

  const save = async () => {
    if (!form.student_id || !form.company) { toast({ title: 'Missing fields', variant: 'destructive' }); return; }
    const payload: any = {
      student_id: form.student_id, company: form.company, role: form.role || null,
      package_lpa: form.package_lpa ? Number(form.package_lpa) : null,
      offer_type: form.offer_type, status: form.status, offer_date: form.offer_date, notes: form.notes || null,
    };
    const { error } = await supabase.from('placements').insert(payload);
    if (error) { toast({ title: 'Failed', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Placement recorded' });
    setOpen(false);
    setForm({ student_id: '', company: '', role: '', package_lpa: '', offer_type: 'FULL_TIME', status: 'OFFERED', offer_date: new Date().toISOString().slice(0, 10), notes: '' });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this placement record?')) return;
    const { error } = await supabase.from('placements').delete().eq('id', id);
    if (error) return toast({ title: 'Failed', description: error.message, variant: 'destructive' });
    toast({ title: 'Deleted' });
    load();
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold flex items-center gap-2"><Briefcase className="w-8 h-8 text-primary" /> Placement War Room</h1>
            <p className="text-muted-foreground">Track offers, companies, and packages across the department.</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" /> Record Offer</Button></DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Record Placement Offer</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Student</Label>
                  <Select value={form.student_id} onValueChange={(v) => setForm({ ...form, student_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                    <SelectContent>{students.map((s) => <SelectItem key={s.id} value={s.id}>{s.full_name} ({s.register_number}) - {s.section}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Company</Label><Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></div>
                  <div><Label>Role</Label><Input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div><Label>Package (LPA)</Label><Input type="number" step="0.01" value={form.package_lpa} onChange={(e) => setForm({ ...form, package_lpa: e.target.value })} /></div>
                  <div><Label>Type</Label>
                    <Select value={form.offer_type} onValueChange={(v) => setForm({ ...form, offer_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Status</Label>
                    <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{STATUSES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div><Label>Offer Date</Label><Input type="date" value={form.offer_date} onChange={(e) => setForm({ ...form, offer_date: e.target.value })} /></div>
                <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
              </div>
              <DialogFooter><Button onClick={save}>Save</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-1"><Trophy className="w-4 h-4" />Total Offers</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{stats.total}</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-1"><Users className="w-4 h-4" />Students Placed</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{stats.placed}</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-1"><DollarSign className="w-4 h-4" />Highest (LPA)</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{stats.highest.toFixed(2)}</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-1"><TrendingUp className="w-4 h-4" />Average (LPA)</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{stats.avg.toFixed(2)}</div></CardContent></Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Top Recruiting Companies</CardTitle></CardHeader>
          <CardContent style={{ height: 260 }}>
            {byCompany.length === 0 ? <div className="text-sm text-muted-foreground">No offers yet.</div> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byCompany}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="company" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="count" fill="hsl(var(--primary))" /></BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>All Offers</CardTitle><CardDescription>{placements.length} records</CardDescription></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Company</TableHead><TableHead>Role</TableHead><TableHead>LPA</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead><TableHead></TableHead></TableRow></TableHeader>
                <TableBody>
                  {placements.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{p.students?.full_name} <span className="text-xs text-muted-foreground">{p.students?.register_number}</span></TableCell>
                      <TableCell className="font-medium">{p.company}</TableCell>
                      <TableCell>{p.role || '-'}</TableCell>
                      <TableCell>{p.package_lpa ?? '-'}</TableCell>
                      <TableCell><Badge variant="outline">{p.offer_type}</Badge></TableCell>
                      <TableCell><Badge>{p.status}</Badge></TableCell>
                      <TableCell>{new Date(p.offer_date).toLocaleDateString()}</TableCell>
                      <TableCell><Button size="icon" variant="ghost" onClick={() => remove(p.id)}><Trash2 className="w-4 h-4" /></Button></TableCell>
                    </TableRow>
                  ))}
                  {placements.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No placements recorded yet.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
