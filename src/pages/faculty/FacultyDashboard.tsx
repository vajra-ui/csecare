import { useEffect, useState } from 'react';
import { Calendar, Clock, Users, Cake, BarChart3, ClipboardCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FacultyLayout } from '@/components/layouts/FacultyLayout';
import { AnnouncementPanel } from '@/components/AnnouncementPanel';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { isBirthday } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function FacultyDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [facultyData, setFacultyData] = useState<any>(null);
  const [todayClasses, setTodayClasses] = useState(0);
  const [studentCount, setStudentCount] = useState(0);
  const [attendanceStats, setAttendanceStats] = useState<any[]>([]);
  const [pendingOD, setPendingOD] = useState(0);

  useEffect(() => {
    if (user?.facultyId) fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      const { data: faculty } = await supabase
        .from('faculty')
        .select('*')
        .eq('faculty_id', user?.facultyId)
        .single();

      if (!faculty) return;
      setFacultyData(faculty);

      if (isBirthday(faculty.dob)) {
        toast({ title: '🎂 Happy Birthday!', description: `Wishing you a wonderful birthday, ${faculty.name}!` });
      }

      const dayOfWeek = new Date().getDay(); // 0=Sun

      const [timetableRes, studentsRes, odRes] = await Promise.all([
        supabase.from('timetable').select('*').eq('faculty_id', faculty.id).eq('day_of_week', dayOfWeek),
        faculty.section
          ? supabase.from('students').select('id', { count: 'exact', head: true }).eq('section', faculty.section as any)
          : supabase.from('students').select('id', { count: 'exact', head: true }).eq('tutor_id', faculty.id),
        user?.isTutor
          ? supabase.from('od_requests').select('id', { count: 'exact', head: true }).in('status', ['submitted'])
          : Promise.resolve({ count: 0 }),
      ]);

      setTodayClasses(timetableRes.data?.length || 0);
      setStudentCount(studentsRes.count || 0);
      setPendingOD((odRes as any).count || 0);

      // Attendance stats for recent 5 days
      if (faculty.section) {
        const fiveDaysAgo = new Date();
        fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
        const { data: attData } = await supabase
          .from('attendance')
          .select('date, is_present')
          .eq('faculty_id', faculty.id)
          .gte('date', fiveDaysAgo.toISOString().split('T')[0]);

        if (attData && attData.length > 0) {
          const byDate: Record<string, { present: number; total: number }> = {};
          attData.forEach((a: any) => {
            if (!byDate[a.date]) byDate[a.date] = { present: 0, total: 0 };
            byDate[a.date].total++;
            if (a.is_present) byDate[a.date].present++;
          });
          setAttendanceStats(
            Object.entries(byDate).map(([date, v]) => ({
              date: new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
              percentage: Math.round((v.present / v.total) * 100),
            }))
          );
        }
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const currentHour = new Date().getHours();
  const currentPeriod = currentHour >= 9 && currentHour < 17 ? Math.min(Math.floor((currentHour - 9)), 7) + 1 : null;

  return (
    <FacultyLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold">Welcome, {user?.name}!</h1>
            <p className="text-muted-foreground text-sm">
              {user?.isTutor ? 'Tutor' : 'Faculty'} • {user?.facultyId}
            </p>
          </div>
          {facultyData?.dob && isBirthday(facultyData.dob) && (
            <Badge variant="secondary" className="gap-1 bg-warning/20 text-warning-foreground">
              <Cake className="h-4 w-4" /> Happy Birthday! 🎉
            </Badge>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {/* Stats Row */}
            <div className="grid gap-4 sm:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Today's Classes</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{todayClasses}</div>
                  {currentPeriod && <p className="text-xs text-muted-foreground">Current: Period {currentPeriod}</p>}
                </CardContent>
              </Card>

              {user?.isTutor && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Students</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{studentCount}</div>
                    <p className="text-xs text-muted-foreground">In your section</p>
                  </CardContent>
                </Card>
              )}

              {user?.isTutor && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Pending OD</CardTitle>
                    <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{pendingOD}</div>
                    <p className="text-xs text-muted-foreground">Awaiting review</p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Attendance Trend Chart */}
            {attendanceStats.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-info" />
                    Recent Attendance Trend
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={attendanceStats}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="date" className="text-xs" />
                      <YAxis domain={[0, 100]} className="text-xs" />
                      <Tooltip />
                      <Bar dataKey="percentage" name="Attendance %" fill="hsl(210, 85%, 50%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Profile Summary */}
            {facultyData && (
              <Card>
                <CardHeader><CardTitle>Your Profile</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Qualification</p>
                      <p className="font-medium">{facultyData.qualification || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Experience</p>
                      <p className="font-medium">{facultyData.years_of_experience || 0} years</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Section</p>
                      <p className="font-medium">{facultyData.section || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Current Subjects</p>
                      <p className="font-medium">{facultyData.current_subjects?.join(', ') || '-'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div>
            <AnnouncementPanel />
          </div>
        </div>
      </div>
    </FacultyLayout>
  );
}
