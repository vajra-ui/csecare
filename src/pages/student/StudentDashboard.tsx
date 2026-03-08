import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, BookOpen, TrendingUp, Calendar, Cake, AlertTriangle, Clock, Upload, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { StudentLayout } from '@/components/layouts/StudentLayout';
import { AnnouncementPanel } from '@/components/AnnouncementPanel';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { isBirthday } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';

export default function StudentDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [studentData, setStudentData] = useState<any>(null);
  const [attendancePercentage, setAttendancePercentage] = useState<number | null>(null);
  const [latestCGPA, setLatestCGPA] = useState<number | null>(null);
  const [pendingAssignments, setPendingAssignments] = useState(0);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<any[]>([]);

  useEffect(() => {
    if (user?.studentId) fetchStudentData();
  }, [user]);

  const fetchStudentData = async () => {
    try {
      const { data } = await supabase
        .from('students')
        .select('*')
        .eq('id', user?.studentId)
        .single();

      if (data) {
        setStudentData(data);

        if (isBirthday(data.dob)) {
          toast({ title: '🎂 Happy Birthday!', description: `Wishing you a wonderful birthday, ${data.name}!` });
        }

        // Parallel fetches
        const [attRes, cgpaRes, assignRes] = await Promise.all([
          supabase.rpc('get_attendance_percentage', { _student_id: data.id }),
          supabase.from('academic_records').select('cgpa').eq('student_id', data.id).order('semester', { ascending: false }).limit(1),
          supabase.from('assignments').select('id, title, due_date, subject').eq('section', data.section as any).gt('due_date', new Date().toISOString()).order('due_date').limit(5),
        ]);

        if (attRes.data !== null) setAttendancePercentage(Number(attRes.data));
        if (cgpaRes.data?.[0]?.cgpa) setLatestCGPA(cgpaRes.data[0].cgpa);
        if (assignRes.data) {
          setUpcomingDeadlines(assignRes.data);
          // Check submissions
          const { data: subs } = await supabase
            .from('assignment_submissions')
            .select('assignment_id')
            .eq('student_id', data.id);
          const submittedIds = new Set((subs || []).map((s: any) => s.assignment_id));
          const pending = (assignRes.data || []).filter((a: any) => !submittedIds.has(a.id));
          setPendingAssignments(pending.length);
        }
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const attendanceLow = attendancePercentage !== null && attendancePercentage < 75;

  return (
    <StudentLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold">Welcome, {user?.name}!</h1>
            <p className="text-muted-foreground text-sm">
              CSE Department • {studentData?.section || '-'} • Year {studentData?.year || '-'}
            </p>
          </div>
          {studentData?.dob && isBirthday(studentData.dob) && (
            <Badge variant="secondary" className="gap-1 bg-warning/20 text-warning-foreground">
              <Cake className="h-4 w-4" /> Happy Birthday! 🎉
            </Badge>
          )}
        </div>

        {/* Attendance Alert */}
        {attendanceLow && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="py-4 flex items-center gap-4">
              <AlertTriangle className="h-8 w-8 text-destructive flex-shrink-0" />
              <div>
                <p className="font-semibold text-destructive">Low Attendance Warning</p>
                <p className="text-sm text-muted-foreground">
                  Your attendance is {attendancePercentage}% — below the required 75%. Please attend classes regularly.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Stats */}
            <div className="grid gap-4 sm:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Attendance</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <span className={`text-2xl font-bold ${attendanceLow ? 'text-destructive' : ''}`}>
                      {attendancePercentage !== null ? `${attendancePercentage}%` : '-'}
                    </span>
                    {attendancePercentage !== null && <Progress value={attendancePercentage} className="h-2" />}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Current CGPA</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{latestCGPA !== null ? latestCGPA.toFixed(2) : '-'}</div>
                  <p className="text-xs text-muted-foreground">Out of 10.00</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Pending Work</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{pendingAssignments}</div>
                  <p className="text-xs text-muted-foreground">Assignments due</p>
                </CardContent>
              </Card>
            </div>

            {/* Upcoming Deadlines */}
            {upcomingDeadlines.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-warning" />
                    Upcoming Deadlines
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {upcomingDeadlines.map((a: any) => {
                      const daysLeft = Math.ceil((new Date(a.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                      return (
                        <div key={a.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                          <div>
                            <p className="font-medium text-sm">{a.title}</p>
                            <p className="text-xs text-muted-foreground">{a.subject}</p>
                          </div>
                          <Badge variant={daysLeft <= 2 ? 'destructive' : 'secondary'}>
                            {daysLeft <= 0 ? 'Due today' : `${daysLeft}d left`}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div onClick={() => navigate('/student/upload')} className="p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors">
                    <p className="font-medium text-sm flex items-center gap-2"><Upload className="h-4 w-4" /> Upload Documents</p>
                    <p className="text-xs text-muted-foreground">Assignments, certificates, KYC</p>
                  </div>
                  <div onClick={() => navigate('/student/progress')} className="p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors">
                    <p className="font-medium text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4" /> View Progress</p>
                    <p className="text-xs text-muted-foreground">CGPA trends & scores</p>
                  </div>
                  <div onClick={() => navigate('/student/od')} className="p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors">
                    <p className="font-medium text-sm flex items-center gap-2"><FileText className="h-4 w-4" /> Submit OD Request</p>
                    <p className="text-xs text-muted-foreground">On Duty application</p>
                  </div>
                  <div onClick={() => navigate('/student/timetable')} className="p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors">
                    <p className="font-medium text-sm flex items-center gap-2"><Calendar className="h-4 w-4" /> View Timetable</p>
                    <p className="text-xs text-muted-foreground">Weekly class schedule</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <AnnouncementPanel />
          </div>
        </div>
      </div>
    </StudentLayout>
  );
}
