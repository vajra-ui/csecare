import { useState, useEffect } from 'react';
import { BookOpen, Loader2, Plus, MessageSquare, Star } from 'lucide-react';
import { FacultyLayout } from '@/components/layouts/FacultyLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Assignment {
  id: string;
  title: string;
  description: string | null;
  subject: string;
  due_date: string;
  section: string;
  created_at: string;
}

interface SubmissionWithStudent {
  id: string;
  assignment_id: string;
  student_id: string;
  file_url: string;
  grade: string | null;
  feedback: string | null;
  submitted_at: string;
  students?: { name: string; roll_number: string } | null;
}

const SECTIONS = ['CSE A', 'CSE B', 'CSE C', 'CSE D'];
const GRADES = ['O', 'A+', 'A', 'B+', 'B', 'C', 'F'];

export default function FacultyAssignments() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [facultyId, setFacultyId] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionWithStudent[]>([]);
  const [subsLoading, setSubsLoading] = useState(false);
  const [gradingId, setGradingId] = useState<string | null>(null);
  const [gradeForm, setGradeForm] = useState({ grade: '', feedback: '' });
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: '', description: '', subject: '', section: 'CSE A', due_date: '',
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: faculty } = await supabase
        .from('faculty')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!faculty) return;
      setFacultyId(faculty.id);

      const { data } = await supabase
        .from('assignments')
        .select('*')
        .eq('faculty_id', faculty.id)
        .order('created_at', { ascending: false });

      setAssignments((data as any as Assignment[]) || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!facultyId || !form.title || !form.subject || !form.due_date) {
      toast({ title: 'Missing fields', description: 'Fill all required fields.', variant: 'destructive' });
      return;
    }
    setCreating(true);
    try {
      const { error } = await supabase.from('assignments').insert({
        faculty_id: facultyId,
        title: form.title,
        description: form.description || null,
        subject: form.subject,
        section: form.section as any,
        due_date: new Date(form.due_date).toISOString(),
      } as any);
      if (error) throw error;
      toast({ title: 'Created', description: 'Assignment posted successfully.' });
      setShowCreate(false);
      setForm({ title: '', description: '', subject: '', section: 'CSE A', due_date: '' });
      fetchData();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const viewSubmissions = async (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    setSubsLoading(true);
    try {
      const { data } = await supabase
        .from('assignment_submissions')
        .select('*, students(name, roll_number)')
        .eq('assignment_id', assignment.id)
        .order('submitted_at', { ascending: false });
      setSubmissions((data as any as SubmissionWithStudent[]) || []);
    } catch (e) {
      console.error(e);
    } finally {
      setSubsLoading(false);
    }
  };

  const handleGrade = async () => {
    if (!gradingId) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('assignment_submissions')
        .update({ grade: gradeForm.grade || null, feedback: gradeForm.feedback || null } as any)
        .eq('id', gradingId);
      if (error) throw error;
      toast({ title: 'Graded', description: 'Feedback saved.' });
      setGradingId(null);
      setGradeForm({ grade: '', feedback: '' });
      if (selectedAssignment) viewSubmissions(selectedAssignment);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const openFile = async (path: string) => {
    const { data } = await supabase.storage.from('student-documents').createSignedUrl(path, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  };

  if (loading) {
    return <FacultyLayout><div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div></FacultyLayout>;
  }

  return (
    <FacultyLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold flex items-center gap-2">
              <BookOpen className="h-7 w-7 text-primary" />
              Assignments
            </h1>
            <p className="text-muted-foreground text-sm">Create assignments and grade submissions</p>
          </div>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-2" /> New Assignment
          </Button>
        </div>

        {assignments.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">No assignments created yet.</CardContent></Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {assignments.map(a => (
              <Card key={a.id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => viewSubmissions(a)}>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <Badge variant="outline">{a.subject}</Badge>
                    <Badge variant="secondary">{a.section}</Badge>
                  </div>
                  <CardTitle className="text-base">{a.title}</CardTitle>
                  {a.description && <CardDescription className="text-xs">{a.description}</CardDescription>}
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">Due: {new Date(a.due_date).toLocaleDateString()}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create New Assignment</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title *</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Assignment title" />
            </div>
            <div>
              <Label>Subject *</Label>
              <Input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="e.g. Data Structures" />
            </div>
            <div>
              <Label>Section *</Label>
              <Select value={form.section} onValueChange={v => setForm(f => ({ ...f, section: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SECTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Due Date *</Label>
              <Input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional details..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Submissions Dialog */}
      <Dialog open={!!selectedAssignment} onOpenChange={() => { setSelectedAssignment(null); setGradingId(null); }}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedAssignment?.title} — Submissions</DialogTitle>
          </DialogHeader>
          {subsLoading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : submissions.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No submissions yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Roll No</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>File</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissions.map(sub => (
                  <TableRow key={sub.id}>
                    <TableCell className="font-medium">{sub.students?.name || '-'}</TableCell>
                    <TableCell className="font-mono text-sm">{sub.students?.roll_number || '-'}</TableCell>
                    <TableCell className="text-sm">{new Date(sub.submitted_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Button variant="link" size="sm" className="p-0 h-auto" onClick={() => openFile(sub.file_url)}>View</Button>
                    </TableCell>
                    <TableCell>
                      {sub.grade ? <Badge className="bg-green-500 text-white">{sub.grade}</Badge> : <span className="text-muted-foreground text-xs">—</span>}
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" onClick={() => {
                        setGradingId(sub.id);
                        setGradeForm({ grade: sub.grade || '', feedback: sub.feedback || '' });
                      }}>
                        <MessageSquare className="h-3 w-3 mr-1" /> Grade
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>

      {/* Grade Dialog */}
      <Dialog open={!!gradingId} onOpenChange={() => setGradingId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Grade Submission</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Grade</Label>
              <Select value={gradeForm.grade} onValueChange={v => setGradeForm(f => ({ ...f, grade: v }))}>
                <SelectTrigger><SelectValue placeholder="Select grade" /></SelectTrigger>
                <SelectContent>{GRADES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Feedback</Label>
              <Textarea value={gradeForm.feedback} onChange={e => setGradeForm(f => ({ ...f, feedback: e.target.value }))} placeholder="Write your feedback..." rows={4} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGradingId(null)}>Cancel</Button>
            <Button onClick={handleGrade} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Star className="h-4 w-4 mr-2" />}
              Save Grade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </FacultyLayout>
  );
}
