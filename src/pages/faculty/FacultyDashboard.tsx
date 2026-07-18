import { useEffect, useState } from 'react';
import { Calendar, Clock, Users, Cake, ClipboardCheck, Zap, Activity, BookOpen } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FacultyLayout } from '@/components/layouts/FacultyLayout';
import { AnnouncementPanel } from '@/components/AnnouncementPanel';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { isBirthday } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';

import { TodayTimetableCard } from '@/components/faculty/TodayTimetableCard';
import { QuickAttendanceCard } from '@/components/faculty/QuickAttendanceCard';
import { UpcomingAssignmentsCard } from '@/components/faculty/UpcomingAssignmentsCard';
import { RecentSubmissionsCard } from '@/components/faculty/RecentSubmissionsCard';
import { AtRiskStudentsCard } from '@/components/faculty/AtRiskStudentsCard';
import { StudentBirthdaysCard } from '@/components/faculty/StudentBirthdaysCard';
import { TeachingStatsCard } from '@/components/faculty/TeachingStatsCard';

export default function FacultyDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [facultyData, setFacultyData] = useState<any>(null);
  const [todayClasses, setTodayClasses] = useState<any[]>([]);
  const [studentCount, setStudentCount] = useState(0);
  const [pendingOD, setPendingOD] = useState(0);
  const [upcomingAssignments, setUpcomingAssignments] = useState<any[]>([]);
  const [recentSubmissions, setRecentSubmissions] = useState<any[]>([]);
  const [atRiskStudents, setAtRiskStudents] = useState<any[]>([]);
  const [birthdayStudents, setBirthdayStudents] = useState<any[]>([]);
  const [teachingStats, setTeachingStats] = useState({ classesThisMonth: 0, avgAttendance: 0, totalStudentsTaught: 0 });

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

      const dayOfWeek = new Date().getDay();

      const [timetableRes, studentsRes, odRes] = await Promise.all([
        supabase.from('timetable').select('id, subject, section, hour_number').eq('faculty_id', faculty.id).eq('day_of_week', dayOfWeek),
        faculty.section
          ? supabase.from('students').select('id, name, roll_number, dob, tutor_id').eq('section', faculty.section as any)
          : supabase.from('students').select('id, name, roll_number, dob, tutor_id').eq('tutor_id', faculty.id),
        user?.isTutor
          ? supabase.from('od_requests').select('id', { count: 'exact', head: true }).in('status', ['submitted'])
          : Promise.resolve({ count: 0 }),
      ]);

      setTodayClasses(timetableRes.data || []);
      setPendingOD((odRes as any).count || 0);

      const students = studentsRes.data || [];
      setStudentCount(students.length);

      const todayBirthdays = students.filter((s: any) => isBirthday(s.dob));
      setBirthdayStudents(todayBirthdays.map((s: any) => ({ id: s.id, name: s.name, roll_number: s.roll_number })));

      const now = new Date().toISOString();
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const [assignmentsRes, submissionsRes, monthAttRes] = await Promise.all([
        supabase.from('assignments').select('id, title, subject, section, due_date').eq('faculty_id', faculty.id).gte('due_date', now).order('due_date', { ascending: true }).limit(5),
        supabase.from('assignment_submissions')
          .select('id, grade, submitted_at, student_id, assignment_id, assignments!inner(title, faculty_id), students!inner(name)')
          .eq('assignments.faculty_id', faculty.id)
          .order('submitted_at', { ascending: false })
          .limit(5),
        supabase.from('attendance').select('is_present, student_id').eq('faculty_id', faculty.id).gte('date', monthStart.toISOString().split('T')[0]),
      ]);

      if (assignmentsRes.data && assignmentsRes.data.length > 0) {
        // Single query instead of N+1: fetch all submissions for these assignments,
        // then count client-side.
        const ids = assignmentsRes.data.map((a: any) => a.id);
        const { data: subRows } = await supabase
          .from('assignment_submissions')
          .select('assignment_id')
          .in('assignment_id', ids);
        const counts = new Map<string, number>();
        (subRows || []).forEach((r: any) => counts.set(r.assignment_id, (counts.get(r.assignment_id) || 0) + 1));
        setUpcomingAssignments(assignmentsRes.data.map((a: any) => ({ ...a, submission_count: counts.get(a.id) || 0 })));
      }


      if (submissionsRes.data) {
        setRecentSubmissions(submissionsRes.data.map((s: any) => ({
          id: s.id,
          student_name: (s.students as any)?.name || 'Unknown',
          assignment_title: (s.assignments as any)?.title || 'Unknown',
          submitted_at: s.submitted_at,
          grade: s.grade,
        })));
      }

      const attData = monthAttRes.data || [];
      const uniqueStudents = new Set(attData.map((a: any) => a.student_id));
      const presentCount = attData.filter((a: any) => a.is_present).length;
      const avgAtt = attData.length > 0 ? Math.round((presentCount / attData.length) * 100) : 0;
      const monthClassCount = attData.length > 0 ? Math.ceil(attData.length / Math.max(uniqueStudents.size, 1)) : 0;
      setTeachingStats({
        classesThisMonth: monthClassCount,
        avgAttendance: avgAtt,
        totalStudentsTaught: uniqueStudents.size,
      });

      if (user?.isTutor && students.length > 0) {
        const studentIds = students.map((s: any) => s.id);
        const [attRes, cgpaRes] = await Promise.all([
          supabase.from('attendance').select('student_id, is_present').in('student_id', studentIds),
          supabase.from('academic_records').select('student_id, cgpa, semester').in('student_id', studentIds),
        ]);

        const attByStudent: Record<string, { present: number; total: number }> = {};
        (attRes.data || []).forEach((a: any) => {
          if (!attByStudent[a.student_id]) attByStudent[a.student_id] = { present: 0, total: 0 };
          attByStudent[a.student_id].total++;
          if (a.is_present) attByStudent[a.student_id].present++;
        });

        const latestCgpa: Record<string, number> = {};
        (cgpaRes.data || []).forEach((r: any) => {
          if (!latestCgpa[r.student_id] || r.semester > (latestCgpa[r.student_id + '_sem'] || 0)) {
            latestCgpa[r.student_id] = r.cgpa;
            latestCgpa[r.student_id + '_sem'] = r.semester;
          }
        });

        const riskStudents = students
          .map((s: any) => {
            const att = attByStudent[s.id];
            const pct = att ? Math.round((att.present / att.total) * 100) : 100;
            const cgpa = latestCgpa[s.id] ?? null;
            return { id: s.id, name: s.name, roll_number: s.roll_number, attendance_pct: pct, cgpa };
          })
          .filter((s: any) => s.attendance_pct < 75 || (s.cgpa !== null && s.cgpa < 5.0))
          .sort((a: any, b: any) => a.attendance_pct - b.attendance_pct)
          .slice(0, 5);

        setAtRiskStudents(riskStudents);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const currentHour = new Date().getHours();
  const currentPeriod = currentHour >= 9 && currentHour < 17 ? Math.min(Math.floor(currentHour - 9), 7) + 1 : null;

  const currentClass = todayClasses.find((c: any) => c.hour_number === currentPeriod) || null;
  const nextClass = currentPeriod
    ? todayClasses.filter((c: any) => c.hour_number > currentPeriod).sort((a: any, b: any) => a.hour_number - b.hour_number)[0] || null
    : todayClasses.sort((a: any, b: any) => a.hour_number - b.hour_number)[0] || null;

  return (
    <FacultyLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-2xl gradient-hero p-6 md:p-8">
          <div className="grid-pattern absolute inset-0 opacity-20" />
          <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Activity className="h-4 w-4 text-neon-cyan" />
                <Badge variant="outline" className="border-neon-cyan/30 text-neon-cyan font-body text-xs tracking-wider uppercase">
                  {user?.isTutor ? 'Tutor Dashboard' : 'Faculty Dashboard'}
                </Badge>
              </div>
              <h1 className="font-display text-2xl md:text-3xl font-bold text-primary-foreground tracking-wide">
                Welcome, {user?.name}!
              </h1>
              <p className="text-primary-foreground/60 font-body text-sm mt-1">
                {user?.facultyId} • CSE Department
              </p>
            </div>
            <div className="flex items-center gap-2">
              {facultyData?.dob && isBirthday(facultyData.dob) && (
                <Badge className="gap-1 bg-warning/20 text-warning border-warning/30 font-body animate-pulse-subtle">
                  <Cake className="h-4 w-4" /> Happy Birthday! 🎉
                </Badge>
              )}
            </div>
          </div>
          <div className="absolute -bottom-6 -right-6 opacity-5">
            <BookOpen className="h-40 w-40 text-neon-cyan" />
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { title: "Today's Classes", value: todayClasses.length, icon: Calendar, sub: currentPeriod ? `Period ${currentPeriod}` : 'No active period', color: 'text-neon-cyan', border: 'neon-border' },
            { title: 'Students', value: studentCount, icon: Users, sub: user?.isTutor ? 'In your section' : 'You teach', color: 'text-neon-purple', border: 'neon-border-purple' },
            ...(user?.isTutor ? [{ title: 'Pending OD', value: pendingOD, icon: ClipboardCheck, sub: 'Awaiting review', color: 'text-warning', border: '' }] : []),
            { title: 'Ungraded', value: recentSubmissions.filter(s => !s.grade).length, icon: Clock, sub: 'Need grading', color: 'text-neon-pink', border: 'neon-border-pink' },
          ].map((stat, i) => (
            <div
              key={stat.title}
              className={`futuristic-card stat-glow p-5 animate-slide-up ${stat.border}`}
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-muted-foreground font-body uppercase tracking-wider">{stat.title}</span>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
              <div className={`font-display text-3xl font-bold tracking-wide ${stat.color}`}>{stat.value}</div>
              <p className="text-xs text-muted-foreground font-body mt-1">{stat.sub}</p>
            </div>
          ))}
        </div>

        {/* Main Content */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <QuickAttendanceCard currentClass={currentClass} nextClass={nextClass} />
              <TeachingStatsCard {...teachingStats} />
            </div>

            <TodayTimetableCard classes={todayClasses} currentPeriod={currentPeriod} />

            <div className="grid gap-4 sm:grid-cols-2">
              <UpcomingAssignmentsCard assignments={upcomingAssignments} />
              <RecentSubmissionsCard submissions={recentSubmissions} />
            </div>

            {user?.isTutor && <AtRiskStudentsCard students={atRiskStudents} />}
          </div>

          <div className="space-y-6">
            <StudentBirthdaysCard students={birthdayStudents} />
            <AnnouncementPanel />
          </div>
        </div>
      </div>
    </FacultyLayout>
  );
}
