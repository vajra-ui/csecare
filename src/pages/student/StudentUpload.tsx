import { useState, useEffect } from 'react';
import { Upload, Loader2, FileText } from 'lucide-react';
import { StudentLayout } from '@/components/layouts/StudentLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Assignment {
  id: string;
  title: string;
  subject: string;
  description: string | null;
  due_date: string;
  section: string;
}

interface Submission {
  id: string;
  assignment_id: string;
  file_url: string;
  grade: string | null;
  feedback: string | null;
  submitted_at: string;
}

export default function StudentUpload() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const { data: studentData } = await supabase
        .from('students')
        .select('id, section')
        .eq('user_id', authUser.id)
        .single();

      if (studentData) {
        const [assignmentsRes, submissionsRes] = await Promise.all([
          supabase
            .from('assignments')
            .select('*')
            .eq('section', studentData.section as any)
            .order('due_date', { ascending: false }),
          supabase
            .from('assignment_submissions')
            .select('*')
            .eq('student_id', studentData.id)
            .order('submitted_at', { ascending: false }),
        ]);

        setAssignments(assignmentsRes.data || []);
        setSubmissions(submissionsRes.data || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSubmission = (assignmentId: string) => {
    return submissions.find(s => s.assignment_id === assignmentId);
  };

  const isOverdue = (dueDate: string) => new Date(dueDate) < new Date();

  return (
    <StudentLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold flex items-center gap-2">
            <Upload className="h-8 w-8 text-info" />
            Assignments
          </h1>
          <p className="text-muted-foreground">
            View assignments and your submissions
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Your Assignments</CardTitle>
            <CardDescription>
              Assignments posted by your faculty. Contact your faculty for submission.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : assignments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No assignments posted yet.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Grade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignments.map((assignment) => {
                    const submission = getSubmission(assignment.id);
                    const overdue = isOverdue(assignment.due_date);

                    return (
                      <TableRow key={assignment.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{assignment.title}</p>
                            {assignment.description && (
                              <p className="text-xs text-muted-foreground truncate max-w-xs">
                                {assignment.description}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{assignment.subject}</TableCell>
                        <TableCell>
                          <span className={overdue && !submission ? 'text-destructive' : ''}>
                            {new Date(assignment.due_date).toLocaleDateString()}
                          </span>
                        </TableCell>
                        <TableCell>
                          {submission ? (
                            <Badge className="bg-success/20 text-success">Submitted</Badge>
                          ) : overdue ? (
                            <Badge variant="destructive">Overdue</Badge>
                          ) : (
                            <Badge variant="secondary">Pending</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {submission?.grade ? (
                            <Badge variant="outline">{submission.grade}</Badge>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Recent Submissions */}
        {submissions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Your Submissions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Submitted At</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Feedback</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submissions.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell>
                        {new Date(sub.submitted_at).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {sub.grade ? (
                          <Badge variant="outline">{sub.grade}</Badge>
                        ) : (
                          <span className="text-muted-foreground">Pending</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {sub.feedback || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </StudentLayout>
  );
}
