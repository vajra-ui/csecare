import { useState, useEffect } from 'react';
import { TrendingUp, Loader2 } from 'lucide-react';
import { StudentLayout } from '@/components/layouts/StudentLayout';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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
          supabase
            .from('academic_records')
            .select('*')
            .eq('student_id', studentData.id)
            .order('semester'),
          supabase
            .from('subject_scores')
            .select('*')
            .eq('student_id', studentData.id)
            .order('semester')
            .order('subject_name'),
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

  const latestCGPA = records.length > 0 
    ? records[records.length - 1]?.cgpa 
    : null;

  const latestGuidance = records.length > 0 
    ? records[records.length - 1]?.guidance_notes 
    : null;

  // Group scores by semester
  const scoresBySemester = scores.reduce((acc, score) => {
    if (!acc[score.semester]) {
      acc[score.semester] = [];
    }
    acc[score.semester].push(score);
    return acc;
  }, {} as Record<number, SubjectScore[]>);

  return (
    <StudentLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold flex items-center gap-2">
            <TrendingUp className="h-8 w-8 text-info" />
            Progress Check
          </h1>
          <p className="text-muted-foreground">
            View your academic progress and CGPA
          </p>
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
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Current CGPA
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-primary">
                    {latestCGPA !== null ? latestCGPA.toFixed(2) : '-'}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Out of 10.00
                  </p>
                </CardContent>
              </Card>

              {latestGuidance && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Tutor Guidance Notes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{latestGuidance}</p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* CGPA History */}
            {records.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Semester-wise CGPA</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4 overflow-x-auto pb-2">
                    {records.map((record) => (
                      <div
                        key={record.id}
                        className="flex-shrink-0 p-4 rounded-lg bg-muted text-center min-w-[100px]"
                      >
                        <p className="text-xs text-muted-foreground mb-1">Sem {record.semester}</p>
                        <p className="text-xl font-bold">
                          {record.cgpa !== null ? record.cgpa.toFixed(2) : '-'}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Subject Scores */}
            {Object.keys(scoresBySemester).length > 0 ? (
              Object.entries(scoresBySemester).map(([semester, semesterScores]) => (
                <Card key={semester}>
                  <CardHeader>
                    <CardTitle>Semester {semester} Scores</CardTitle>
                  </CardHeader>
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
                        {semesterScores.map((score) => (
                          <TableRow key={score.id}>
                            <TableCell className="font-medium">{score.subject_name}</TableCell>
                            <TableCell className="text-center">
                              {score.internal_marks ?? '-'}
                            </TableCell>
                            <TableCell className="text-center">
                              {score.external_marks ?? '-'}
                            </TableCell>
                            <TableCell className="text-center">
                              {score.total_marks ?? '-'}
                            </TableCell>
                            <TableCell className="text-center">
                              {score.grade ? (
                                <Badge variant="outline">{score.grade}</Badge>
                              ) : (
                                '-'
                              )}
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
