import { useState, useEffect } from 'react';
import { FacultyLayout } from '@/components/layouts/FacultyLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Plus, MessageSquare, CalendarDays } from 'lucide-react';

export default function FacultyMentoring() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [facultyDbId, setFacultyDbId] = useState('');
  const [sessions, setSessions] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ student_id: '', session_date: '', session_type: 'general', notes: '', action_items: '', next_session_date: '' });

  useEffect(() => { if (user?.facultyId) init(); }, [user]);

  const init = async () => {
    const { data: faculty } = await supabase.from('faculty').select('id, section').eq('faculty_id', user?.facultyId).single();
    if (!faculty) return;
    setFacultyDbId(faculty.id);
    const { data: studs } = faculty.section
      ? await supabase.from('students').select('id, name, roll_number').eq('section', faculty.section as any).order('roll_number')
      : await supabase.from('students').select('id, name, roll_number').eq('tutor_id', faculty.id).order('roll_number');
    setStudents(studs || []);
    fetchSessions(faculty.id);
  };

  const fetchSessions = async (fid: string) => {
    const { data } = await supabase.from('mentoring_sessions').select('*, students(name, roll_number)').eq('tutor_id', fid).order('session_date', { ascending: false });
    setSessions(data || []);
  };

  const addSession = async () => {
    if (!form.student_id || !form.session_date || !form.notes) { toast({ title: 'Fill required fields', variant: 'destructive' }); return; }
    setLoading(true);
    try {
      await supabase.from('mentoring_sessions').insert({
        tutor_id: facultyDbId, student_id: form.student_id, session_date: form.session_date,
        session_type: form.session_type, notes: form.notes, action_items: form.action_items || null,
        next_session_date: form.next_session_date || null,
      });
      toast({ title: 'Recorded', description: 'Mentoring session logged.' });
      setOpen(false);
      setForm({ student_id: '', session_date: '', session_type: 'general', notes: '', action_items: '', next_session_date: '' });
      fetchSessions(facultyDbId);
    } catch (e: any) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
    setLoading(false);
  };

  const typeColors: Record<string, string> = {
    general: 'bg-secondary text-secondary-foreground',
    academic: 'bg-primary/10 text-primary',
    personal: 'bg-warning/10 text-warning-foreground',
    career: 'bg-green-500/10 text-green-700',
  };

  const upcomingSessions = sessions.filter(s => s.next_session_date && new Date(s.next_session_date) >= new Date()).slice(0, 5);

  return (
    <FacultyLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl md:text-3xl font-bold">Mentoring Sessions</h1>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> New Session</Button></DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Record Mentoring Session</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <Select value={form.student_id} onValueChange={v => setForm({ ...form, student_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select Student" /></SelectTrigger>
                  <SelectContent>{students.map(s => <SelectItem key={s.id} value={s.id}>{s.roll_number} - {s.name}</SelectItem>)}</SelectContent>
                </Select>
                <div className="grid grid-cols-2 gap-4">
                  <Input type="date" value={form.session_date} onChange={e => setForm({ ...form, session_date: e.target.value })} />
                  <Select value={form.session_type} onValueChange={v => setForm({ ...form, session_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="academic">Academic</SelectItem>
                      <SelectItem value="personal">Personal</SelectItem>
                      <SelectItem value="career">Career Guidance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Textarea placeholder="Session notes..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={4} />
                <Textarea placeholder="Action items (optional)" value={form.action_items} onChange={e => setForm({ ...form, action_items: e.target.value })} rows={2} />
                <div>
                  <label className="text-sm text-muted-foreground">Next Session Date (optional)</label>
                  <Input type="date" value={form.next_session_date} onChange={e => setForm({ ...form, next_session_date: e.target.value })} />
                </div>
                <Button onClick={addSession} disabled={loading} className="w-full">{loading ? 'Saving...' : 'Save Session'}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card><CardContent className="pt-6 text-center"><p className="text-2xl font-bold">{sessions.length}</p><p className="text-xs text-muted-foreground">Total Sessions</p></CardContent></Card>
          <Card><CardContent className="pt-6 text-center"><p className="text-2xl font-bold">{new Set(sessions.map(s => s.student_id)).size}</p><p className="text-xs text-muted-foreground">Students Mentored</p></CardContent></Card>
          <Card><CardContent className="pt-6 text-center"><p className="text-2xl font-bold">{sessions.filter(s => s.session_type === 'academic').length}</p><p className="text-xs text-muted-foreground">Academic Sessions</p></CardContent></Card>
          <Card><CardContent className="pt-6 text-center"><p className="text-2xl font-bold">{upcomingSessions.length}</p><p className="text-xs text-muted-foreground">Upcoming</p></CardContent></Card>
        </div>

        {upcomingSessions.length > 0 && (
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><CalendarDays className="h-5 w-5 text-primary" /> Upcoming Sessions</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {upcomingSessions.map(s => (
                  <div key={s.id} className="flex items-center justify-between p-2 rounded border bg-background">
                    <span className="text-sm">{(s.students as any)?.name}</span>
                    <Badge variant="outline">{new Date(s.next_session_date).toLocaleDateString('en-IN')}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          {sessions.map(s => (
            <Card key={s.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center">
                      <MessageSquare className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">{(s.students as any)?.name}</p>
                      <p className="text-xs text-muted-foreground">{(s.students as any)?.roll_number} • {new Date(s.session_date).toLocaleDateString('en-IN')}</p>
                    </div>
                  </div>
                  <Badge className={typeColors[s.session_type] || ''} variant="outline">{s.session_type}</Badge>
                </div>
                <p className="text-sm mb-2">{s.notes}</p>
                {s.action_items && (
                  <div className="bg-muted/50 rounded p-2 mt-2">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Action Items:</p>
                    <p className="text-sm">{s.action_items}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          {sessions.length === 0 && <Card><CardContent className="py-12 text-center text-muted-foreground">No mentoring sessions recorded yet.</CardContent></Card>}
        </div>
      </div>
    </FacultyLayout>
  );
}
