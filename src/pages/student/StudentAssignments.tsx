import { useState, useEffect, useRef } from 'react';
import { BookOpen, Loader2, Upload, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { StudentLayout } from '@/components/layouts/StudentLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface Assignment {
  id: string;
  title: string;
  description: string | null;
  subject: string;
  due_date: string;
  section: string;
  faculty_id: string;
  created_at: string;
}

interface Submission {
  id: string;
  assignment_id: string;
  file_url: string;
  grade: string | null;
  feedback: string | null;
  submitted_at: string;
}

export default function StudentAssignments() {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => { fetchData(); }, [user]);

  const fetchData = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const { data: student } = await supabase
        .from('students')
        .select('id, section')
        .eq('user_id', authUser.id)
        .single();

      if (!student) return;
      setStudentId(student.id);

      const [assignRes, subRes] = await Promise.all([
        supabase.from('assignments').select('*').eq('section', student.section as any).order('due_date', { ascending: false }),
        supabase.from('assignment_submissions').select('*').eq('student_id', student.id),
      ]);

      setAssignments((assignRes.data as any as Assignment[]) || []);
      setSubmissions((subRes.data as any as Submission[]) || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getSubmission = (assignmentId: string) => submissions.find(s => s.assignment_id === assignmentId);

  const handleSubmit = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedAssignment || !studentId) return;

    if (file.size > 20 * 1024 * 1024) {
      toast({ title: 'Too large', description: 'Max 20MB', variant: 'destructive' });
      return;
    }

    const allowedExtensions = ['pdf', 'doc', 'docx', 'zip', 'ppt', 'pptx', 'txt'];
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    if (!fileExt || !allowedExtensions.includes(fileExt)) {
      toast({ title: 'Invalid file type', description: 'Only PDF, DOC, DOCX, ZIP, PPT, PPTX, TXT files are allowed.', variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const ext = file.name.split('.').pop();
      const path = `${authUser.id}/assignments/${selectedAssignment.id}/${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage.from('student-documents').upload(path, file);
      if (upErr) throw upErr;

      const { error: insErr } = await supabase.from('assignment_submissions').insert({
        assignment_id: selectedAssignment.id,
        student_id: studentId,
        file_url: path,
      } as any);
      if (insErr) throw insErr;

      // Notify the faculty who created this assignment
      const { data: facultyData } = await supabase
        .from('faculty')
        .select('user_id, name')
        .eq('id', selectedAssignment.faculty_id)
        .single();

      if (facultyData?.user_id) {
        const { data: studentInfo } = await supabase
          .from('students')
          .select('name, roll_number')
          .eq('id', studentId)
          .single();

        await supabase.from('notifications').insert({
          user_id: facultyData.user_id,
          title: 'New Assignment Submission',
          message: `${studentInfo?.name || 'A student'} (${studentInfo?.roll_number || ''}) submitted "${selectedAssignment.title}" — ${selectedAssignment.subject}`,
          type: 'assignment',
          link: '/faculty/assignments',
        });
      }

      toast({ title: 'Submitted!', description: `Assignment "${selectedAssignment.title}" submitted.` });
      setSelectedAssignment(null);
      fetchData();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const isPastDue = (date: string) => new Date(date) < new Date();

  if (loading) {
    return <StudentLayout><div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div></StudentLayout>;
  }

  return (
    <StudentLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold flex items-center gap-2">
            <BookOpen className="h-7 w-7 text-primary" />
            Assignments
          </h1>
          <p className="text-muted-foreground text-sm">View assignments and submit your work</p>
        </div>

        {assignments.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">No assignments posted yet.</CardContent></Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {assignments.map(a => {
              const sub = getSubmission(a.id);
              const pastDue = isPastDue(a.due_date);
              return (
                <Card key={a.id} className="relative overflow-hidden">
                  {sub?.grade && (
                    <div className="absolute top-3 right-3">
                      <Badge className="bg-green-500 text-white">{sub.grade}</Badge>
                    </div>
                  )}
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                      <Badge variant="outline" className="text-xs">{a.subject}</Badge>
                      <span className={`flex items-center gap-1 ${pastDue && !sub ? 'text-destructive' : ''}`}>
                        <Clock className="h-3 w-3" />
                        {new Date(a.due_date).toLocaleDateString()}
                      </span>
                    </div>
                    <CardTitle className="text-base">{a.title}</CardTitle>
                    {a.description && <CardDescription className="text-xs">{a.description}</CardDescription>}
                  </CardHeader>
                  <CardContent>
                    {sub ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                          <CheckCircle2 className="h-4 w-4" />
                          Submitted on {new Date(sub.submitted_at).toLocaleDateString()}
                        </div>
                        {sub.feedback && (
                          <div className="bg-muted rounded-lg p-3 text-sm">
                            <p className="font-medium text-xs text-muted-foreground mb-1">Faculty Feedback</p>
                            <p>{sub.feedback}</p>
                          </div>
                        )}
                      </div>
                    ) : pastDue ? (
                      <div className="flex items-center gap-2 text-sm text-destructive">
                        <AlertCircle className="h-4 w-4" />
                        Past due — not submitted
                      </div>
                    ) : (
                      <Button size="sm" onClick={() => setSelectedAssignment(a)}>
                        <Upload className="h-4 w-4 mr-2" />
                        Submit
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Upload Dialog */}
      <Dialog open={!!selectedAssignment} onOpenChange={() => setSelectedAssignment(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit: {selectedAssignment?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Upload your work</Label>
              <Input
                ref={fileRef}
                type="file"
                accept=".pdf,.doc,.docx,.zip,.ppt,.pptx,.txt"
                onChange={handleSubmit}
                disabled={uploading}
              />
            </div>
            {uploading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Uploading...
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </StudentLayout>
  );
}
