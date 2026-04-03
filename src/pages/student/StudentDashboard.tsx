import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, BookOpen, TrendingUp, Calendar, Cake, AlertTriangle, Clock, Upload, FileText, Zap, Sparkles, Trophy, Calculator } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { StudentLayout } from '@/components/layouts/StudentLayout';
import { AnnouncementPanel } from '@/components/AnnouncementPanel';
import { MyFacultiesCard } from '@/components/student/MyFacultiesCard';
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

        const [attRes, cgpaRes, assignRes] = await Promise.all([
          supabase.rpc('get_attendance_percentage', { _student_id: data.id }),
          supabase.from('academic_records').select('cgpa').eq('student_id', data.id).order('semester', { ascending: false }).limit(1),
          supabase.from('assignments').select('id, title, due_date, subject').eq('section', data.section as any).gt('due_date', new Date().toISOString()).order('due_date').limit(5),
        ]);

        if (attRes.data !== null) setAttendancePercentage(Number(attRes.data));
        if (cgpaRes.data?.[0]?.cgpa) setLatestCGPA(cgpaRes.data[0].cgpa);
        if (assignRes.data) {
          setUpcomingDeadlines(assignRes.data);
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

  const quickActions = [
    { icon: Upload, label: 'Upload Documents', desc: 'Assignments, certificates, KYC', path: '/student/upload', color: 'text-neon-cyan' },
    { icon: TrendingUp, label: 'View Progress', desc: 'CGPA trends & scores', path: '/student/progress', color: 'text-neon-purple' },
    { icon: FileText, label: 'Submit OD Request', desc: 'On Duty application', path: '/student/od', color: 'text-neon-pink' },
    { icon: Calendar, label: 'View Timetable', desc: 'Weekly class schedule', path: '/student/timetable', color: 'text-neon-green' },
    { icon: Trophy, label: 'Achievements', desc: 'Portfolio & certificates', path: '/student/achievements', color: 'text-warning' },
    { icon: Calculator, label: 'GPA Calculator', desc: 'Calculate your CGPA', path: '/student/gpa-calculator', color: 'text-info' },
  ];

  return (
    <StudentLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-2xl gradient-hero p-6 md:p-8">
          <div className="grid-pattern absolute inset-0 opacity-20" />
          <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-neon-cyan animate-pulse-subtle" />
                <Badge variant="outline" className="border-neon-cyan/30 text-neon-cyan font-body text-xs tracking-wider uppercase">
                  Student Portal
                </Badge>
              </div>
              <h1 className="font-display text-2xl md:text-3xl font-bold text-primary-foreground tracking-wide">
                Welcome, {user?.name}!
              </h1>
              <p className="text-primary-foreground/60 font-body text-sm mt-1">
                CSE Department • {studentData?.section || '-'} • Year {studentData?.year || '-'}
              </p>
            </div>
            {studentData?.dob && isBirthday(studentData.dob) && (
              <Badge className="gap-1 bg-warning/20 text-warning border-warning/30 font-body animate-pulse-subtle">
                <Cake className="h-4 w-4" /> Happy Birthday! 🎉
              </Badge>
            )}
          </div>
          <div className="absolute -bottom-8 -right-8 opacity-5">
            <Zap className="h-44 w-44 text-neon-cyan" />
          </div>
        </div>

        {/* Attendance Alert */}
        {attendanceLow && (
          <div className="futuristic-card neon-border-pink p-4 flex items-center gap-4 animate-slide-up">
            <div className="p-2.5 rounded-lg bg-destructive/10">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <p className="font-display font-semibold text-destructive text-sm tracking-wide">Low Attendance Warning</p>
              <p className="text-sm text-muted-foreground font-body">
                Your attendance is <span className="text-destructive font-semibold">{attendancePercentage}%</span> — below the required 75%.
              </p>
            </div>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {/* Stat Cards */}
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                {
                  title: 'Attendance',
                  value: attendancePercentage !== null ? `${attendancePercentage}%` : '-',
                  icon: Calendar,
                  color: attendanceLow ? 'text-destructive' : 'text-neon-cyan',
                  border: 'neon-border',
                  extra: attendancePercentage !== null ? <Progress value={attendancePercentage} className="h-1.5 mt-2" /> : null,
                },
                {
                  title: 'Current CGPA',
                  value: latestCGPA !== null ? latestCGPA.toFixed(2) : '-',
                  icon: TrendingUp,
                  color: 'text-neon-purple',
                  border: 'neon-border-purple',
                  extra: <p className="text-xs text-muted-foreground font-body mt-1">Out of 10.00</p>,
                },
                {
                  title: 'Pending Work',
                  value: pendingAssignments,
                  icon: FileText,
                  color: 'text-neon-pink',
                  border: 'neon-border-pink',
                  extra: <p className="text-xs text-muted-foreground font-body mt-1">Assignments due</p>,
                },
              ].map((stat, i) => (
                <div
                  key={stat.title}
                  className={`futuristic-card stat-glow p-5 animate-slide-up ${stat.border}`}
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground font-body uppercase tracking-wider">{stat.title}</span>
                    <stat.icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                  <div className={`font-display text-3xl font-bold tracking-wide ${stat.color}`}>{stat.value}</div>
                  {stat.extra}
                </div>
              ))}
            </div>

            {/* Upcoming Deadlines */}
            {upcomingDeadlines.length > 0 && (
              <div className="futuristic-card p-5 animate-slide-up" style={{ animationDelay: '300ms' }}>
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="h-4 w-4 text-warning" />
                  <h3 className="font-display font-semibold tracking-wide text-sm">Upcoming Deadlines</h3>
                </div>
                <div className="space-y-2">
                  {upcomingDeadlines.map((a: any) => {
                    const daysLeft = Math.ceil((new Date(a.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                    return (
                      <div key={a.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50 hover:border-neon-cyan/20 transition-colors">
                        <div>
                          <p className="font-body font-medium text-sm">{a.title}</p>
                          <p className="text-xs text-muted-foreground font-body">{a.subject}</p>
                        </div>
                        <Badge variant={daysLeft <= 2 ? 'destructive' : 'secondary'} className="font-body">
                          {daysLeft <= 0 ? 'Due today' : `${daysLeft}d left`}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Zap className="h-4 w-4 text-neon-cyan" />
                <h3 className="font-display font-semibold tracking-wide text-sm">Quick Actions</h3>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {quickActions.map((action, i) => (
                  <div
                    key={action.label}
                    onClick={() => navigate(action.path)}
                    className="futuristic-card p-4 cursor-pointer group animate-slide-up"
                    style={{ animationDelay: `${(i + 4) * 60}ms` }}
                  >
                    <action.icon className={`h-5 w-5 ${action.color} mb-2 group-hover:animate-float`} />
                    <p className="font-body font-semibold text-sm">{action.label}</p>
                    <p className="text-xs text-muted-foreground font-body mt-0.5">{action.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <AnnouncementPanel />
          </div>
        </div>
      </div>
    </StudentLayout>
  );
}
