import { useState, useEffect } from 'react';
import { TrendingUp, Loader2 } from 'lucide-react';
import { StudentLayout } from '@/components/layouts/StudentLayout';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface AcademicRecord {
  id: string;
  semester: number;
  cgpa: number | null;
  guidance_notes: string | null;
}

interface SubjectScore {
  id: string;
  subject_name: string;
  semester: number;
  internal_marks: number | null;
  external_marks: number | null;
  total_marks: number | null;
  grade: string | null;
}

export default function StudentProgress() {
  const { user } = useAuth();
  const [records, setRecords] = useState<AcademicRecord[]>([]);
  const [scores, setScores] = useState<SubjectScore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProgress();
  }, [user]);

  const fetchProgress = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const { data: studentData } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', authUser.id)
        .single();

      if (studentData) {
        const [recordsRes, scoresRes] = await Promise.all([
          supabase.from('academic_records').select('*').eq('student_id', studentData.id).order('semester'),
          supabase.from('subject_scores').select('*').eq('student_id', studentData.id).order('semester').order('subject_name'),
        ]);
        setRecords(recordsRes.data || []);
        setScores(scoresRes.data || []);
      }
    } catch (error) {
      console.error('Error fetching progress:', error);
    } finally {
      setLoading(false);
    }
  };

  const latestCGPA = records.length > 0 ? records[records.length - 1]?.cgpa : null;
  const latestGuidance = records.length > 0 ? records[records.length - 1]?.guidance_notes : null;

  const cgpaChartData = records.map(r => ({
    semester: `Sem ${r.semester}`,
    cgpa: r.cgpa || 0,
  }));

  const scoresBySemester = scores.reduce((acc, score) => {
    if (!acc[score.semester]) acc[score.semester] = [];
    acc[score.semester].push(score);
    return acc;
  }, {} as Record<number, SubjectScore[]>);

  // Latest semester subject-wise chart
  const latestSemScores = Object.keys(scoresBySemester).length > 0
    ? scoresBySemester[Math.max(...Object.keys(scoresBySemester).map(Number))]
    : [];

  const subjectChartData = latestSemScores.map(s => ({
    subject: s.subject_name.length > 12 ? s.subject_name.substring(0, 12) + '…' : s.subject_name,
    internal: s.internal_marks || 0,
    external: s.external_marks || 0,
  }));

  return (
    <StudentLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold flex items-center gap-2">
            <TrendingUp className="h-7 w-7 text-info" />
            Progress Check
          </h1>
          <p className="text-muted-foreground text-sm">View your academic progress and CGPA</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* CGPA Summary */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-muted-foreground">Current CGPA</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-primary">
                    {latestCGPA !== null ? latestCGPA.toFixed(2) : '-'}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">Out of 10.00</p>
                </CardContent>
              </Card>
              {latestGuidance && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium text-muted-foreground">Tutor Guidance Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{latestGuidance}</p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* CGPA Trend Chart */}
            {cgpaChartData.length > 1 && (
              <Card>
                <CardHeader>
                  <CardTitle>CGPA Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={cgpaChartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="semester" className="text-xs" />
                      <YAxis domain={[0, 10]} className="text-xs" />
                      <Tooltip />
                      <Line type="monotone" dataKey="cgpa" stroke="hsl(348, 75%, 35%)" strokeWidth={2} dot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Subject-wise Performance Chart */}
            {subjectChartData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Latest Semester - Subject Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={subjectChartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="subject" className="text-xs" angle={-20} textAnchor="end" height={60} />
                      <YAxis className="text-xs" />
                      <Tooltip />
                      <Bar dataKey="internal" name="Internal" fill="hsl(210, 85%, 50%)" stackId="a" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="external" name="External" fill="hsl(142, 70%, 40%)" stackId="a" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* CGPA History Pills */}
            {records.length > 0 && (
              <Card>
                <CardHeader><CardTitle>Semester-wise CGPA</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex gap-4 overflow-x-auto pb-2">
                    {records.map(record => (
                      <div key={record.id} className="flex-shrink-0 p-4 rounded-lg bg-muted text-center min-w-[100px]">
                        <p className="text-xs text-muted-foreground mb-1">Sem {record.semester}</p>
                        <p className="text-xl font-bold">{record.cgpa !== null ? record.cgpa.toFixed(2) : '-'}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Subject Scores Tables */}
            {Object.keys(scoresBySemester).length > 0 ? (
              Object.entries(scoresBySemester).map(([semester, semesterScores]) => (
                <Card key={semester}>
                  <CardHeader><CardTitle>Semester {semester} Scores</CardTitle></CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Subject</TableHead>
                          <TableHead className="text-center">Internal</TableHead>
                          <TableHead className="text-center">External</TableHead>
                          <TableHead className="text-center">Total</TableHead>
                          <TableHead className="text-center">Grade</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {semesterScores.map(score => (
                          <TableRow key={score.id}>
                            <TableCell className="font-medium">{score.subject_name}</TableCell>
                            <TableCell className="text-center">{score.internal_marks ?? '-'}</TableCell>
                            <TableCell className="text-center">{score.external_marks ?? '-'}</TableCell>
                            <TableCell className="text-center">{score.total_marks ?? '-'}</TableCell>
                            <TableCell className="text-center">
                              {score.grade ? <Badge variant="outline">{score.grade}</Badge> : '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No academic records available yet. Your tutor will upload your scores.
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </StudentLayout>
  );
}
