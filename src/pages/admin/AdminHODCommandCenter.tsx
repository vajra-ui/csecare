import { useEffect, useState, useMemo } from 'react';
import {
  Activity, Users, GraduationCap, Brain, TrendingUp, TrendingDown,
  AlertTriangle, Award, Zap, Eye, BookOpen, Clock, Shield, Target,
  BarChart3, Loader2, ChevronRight, Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RPieChart, Pie, Cell, Legend, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, AreaChart, Area, LineChart, Line,
} from 'recharts';

const NEON_COLORS = [
  'hsl(185, 100%, 50%)',
  'hsl(270, 100%, 65%)',
  'hsl(330, 100%, 60%)',
  'hsl(150, 100%, 50%)',
  'hsl(38, 92%, 50%)',
];

interface FacultyDetail {
  id: string;
  name: string;
  faculty_id: string;
  sections: string[];
  current_subjects: string[];
  is_tutor: boolean;
  totalClasses: number;
  studentsHandled: number;
  avgAttendance: number;
  section: string | null;
}

interface StudentRisk {
  name: string;
  roll_number: string;
  section: string;
  attendance: number;
  cgpa: number | null;
  riskLevel: 'HIGH' | 'MEDIUM' | 'LOW';
}

function GlowCard({ children, className = '', glowColor = 'neon-cyan' }: { children: React.ReactNode; className?: string; glowColor?: string }) {
  return (
    <div className={`relative group ${className}`}>
      <div className={`absolute -inset-0.5 bg-gradient-to-r from-${glowColor}/20 to-transparent rounded-xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
      <div className="relative futuristic-card p-5 h-full">
        {children}
      </div>
    </div>
  );
}

function AnimatedCounter({ value, suffix = '' }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const duration = 1200;
    const steps = 30;
    const increment = value / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplay(value);
        clearInterval(timer);
      } else {
        setDisplay(Math.round(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [value]);
  return <span>{display}{suffix}</span>;
}

export default function AdminHODCommandCenter() {
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<any[]>([]);
  const [faculty, setFaculty] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [academic, setAcademic] = useState<any[]>([]);
  const [timetable, setTimetable] = useState<any[]>([]);
  const [scores, setScores] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      const [s, f, a, ac, tt, sc, lv, sub] = await Promise.all([
        supabase.from('students').select('id, name, roll_number, section, year, status'),
        supabase.from('faculty').select('id, name, faculty_id, sections, current_subjects, is_tutor, section'),
        supabase.from('attendance').select('student_id, is_present, date, subject, faculty_id'),
        supabase.from('academic_records').select('student_id, semester, cgpa'),
        supabase.from('timetable').select('faculty_id, section, subject, day_of_week, hour_number'),
        supabase.from('subject_scores').select('student_id, semester, total_marks, grade, subject_name'),
        supabase.from('faculty_leaves').select('faculty_id, status, start_date, end_date'),
        supabase.from('assignment_submissions').select('student_id, submitted_at'),
      ]);
      setStudents(s.data || []);
      setFaculty(f.data || []);
      setAttendance(a.data || []);
      setAcademic(ac.data || []);
      setTimetable(tt.data || []);
      setScores(sc.data || []);
      setLeaves(lv.data || []);
      setSubmissions(sub.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // ========== COMPUTED METRICS ==========
  const studentSectionMap = useMemo(() => {
    const m: Record<string, string> = {};
    students.forEach(s => { m[s.id] = s.section; });
    return m;
  }, [students]);

  const overallAttendance = useMemo(() => {
    if (!attendance.length) return 0;
    const present = attendance.filter(a => a.is_present).length;
    return Math.round((present / attendance.length) * 100);
  }, [attendance]);

  const avgCGPA = useMemo(() => {
    const valid = academic.filter(a => a.cgpa != null);
    if (!valid.length) return 0;
    return Number((valid.reduce((s, a) => s + Number(a.cgpa), 0) / valid.length).toFixed(2));
  }, [academic]);

  const atRiskStudents = useMemo((): StudentRisk[] => {
    return students.map(s => {
      const att = attendance.filter(a => a.student_id === s.id);
      const present = att.filter(a => a.is_present).length;
      const pct = att.length > 0 ? Math.round((present / att.length) * 100) : 100;
      const records = academic.filter(a => a.student_id === s.id);
      const latestCgpa = records.length > 0
        ? records.sort((a: any, b: any) => b.semester - a.semester)[0].cgpa
        : null;
      const lowAtt = pct < 75;
      const lowCgpa = latestCgpa != null && Number(latestCgpa) < 5;
      const riskLevel: 'HIGH' | 'MEDIUM' | 'LOW' = lowAtt && lowCgpa ? 'HIGH' : (lowAtt || lowCgpa) ? 'MEDIUM' : 'LOW';
      return { name: s.name, roll_number: s.roll_number, section: s.section, attendance: pct, cgpa: latestCgpa ? Number(latestCgpa) : null, riskLevel };
    }).filter(s => s.riskLevel !== 'LOW').sort((a, b) => a.riskLevel === 'HIGH' ? -1 : 1);
  }, [students, attendance, academic]);

  const facultyDetails = useMemo((): FacultyDetail[] => {
    return faculty.map(f => {
      const fSections = f.sections?.length ? f.sections : (f.section ? [f.section] : []);
      const fSubjects = f.current_subjects || [];
      const ttEntries = timetable.filter(t => t.faculty_id === f.id);
      const sectionStudents = students.filter(s => fSections.includes(s.section));
      const fAtt = attendance.filter(a => a.faculty_id === f.id);
      const presentCount = fAtt.filter(a => a.is_present).length;
      const avgAtt = fAtt.length > 0 ? Math.round((presentCount / fAtt.length) * 100) : 0;
      return {
        id: f.id, name: f.name, faculty_id: f.faculty_id,
        sections: fSections, current_subjects: fSubjects,
        is_tutor: f.is_tutor, totalClasses: ttEntries.length,
        studentsHandled: sectionStudents.length, avgAttendance: avgAtt,
        section: f.section,
      };
    });
  }, [faculty, timetable, students, attendance]);

  const sectionMetrics = useMemo(() => {
    const sections = ['CSE A', 'CSE B', 'CSE C', 'CSE D'];
    return sections.map(sec => {
      const secStudents = students.filter(s => s.section === sec);
      const secAtt = attendance.filter(a => studentSectionMap[a.student_id] === sec);
      const presentCount = secAtt.filter(a => a.is_present).length;
      const attPct = secAtt.length > 0 ? Math.round((presentCount / secAtt.length) * 100) : 0;
      const secAcademic = academic.filter(a => studentSectionMap[a.student_id] === sec && a.cgpa != null);
      const secAvgCgpa = secAcademic.length > 0
        ? Number((secAcademic.reduce((s, a) => s + Number(a.cgpa), 0) / secAcademic.length).toFixed(2))
        : 0;
      const secFaculty = faculty.filter(f => {
        const fs = f.sections?.length ? f.sections : (f.section ? [f.section] : []);
        return fs.includes(sec);
      });
      const atRisk = secStudents.filter(s => {
        const sAtt = attendance.filter(a => a.student_id === s.id);
        const p = sAtt.filter(a => a.is_present).length;
        return sAtt.length > 0 && (p / sAtt.length) * 100 < 75;
      }).length;
      return { section: sec, students: secStudents.length, attendance: attPct, avgCGPA: secAvgCgpa, faculty: secFaculty.length, atRisk };
    });
  }, [students, attendance, academic, faculty, studentSectionMap]);

  const attendanceTrend = useMemo(() => {
    const monthly: Record<string, { present: number; total: number }> = {};
    attendance.forEach(a => {
      if (!a.date) return;
      const month = a.date.substring(0, 7);
      if (!monthly[month]) monthly[month] = { present: 0, total: 0 };
      monthly[month].total++;
      if (a.is_present) monthly[month].present++;
    });
    return Object.keys(monthly).sort().map(m => ({
      month: new Date(m + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      percentage: Number(((monthly[m].present / monthly[m].total) * 100).toFixed(1)),
    }));
  }, [attendance]);

  const pendingLeaves = useMemo(() => {
    return leaves.filter(l => l.status === 'pending').length;
  }, [leaves]);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-20">
          <div className="text-center space-y-4">
            <div className="relative">
              <div className="absolute inset-0 bg-neon-cyan/20 rounded-full blur-xl animate-pulse" />
              <Loader2 className="h-12 w-12 animate-spin text-neon-cyan relative" />
            </div>
            <p className="text-muted-foreground font-body text-sm tracking-wider uppercase animate-pulse">Loading Command Center...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in">
        {/* ====== HERO HEADER ====== */}
        <div className="relative overflow-hidden rounded-2xl p-6 md:p-8" style={{ background: 'linear-gradient(135deg, hsl(220 30% 8%) 0%, hsl(270 40% 12%) 40%, hsl(185 60% 10%) 100%)' }}>
          <div className="grid-pattern absolute inset-0 opacity-20" />
          <div className="absolute top-0 right-0 w-64 h-64 bg-neon-cyan/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-neon-purple/5 rounded-full blur-3xl" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-neon-cyan animate-pulse" />
              <Badge variant="outline" className="border-neon-cyan/30 text-neon-cyan font-body text-[10px] tracking-[0.2em] uppercase">
                HOD Command Center
              </Badge>
            </div>
            <h1 className="font-display text-2xl md:text-4xl font-bold text-white tracking-wide">
              Department Intelligence
            </h1>
            <p className="text-white/50 font-body mt-1 text-sm">
              Real-time analytics for faculty performance, student monitoring & department health
            </p>
          </div>
        </div>

        {/* ====== KEY METRICS STRIP ====== */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Total Students', value: students.length, icon: GraduationCap, color: 'text-neon-cyan', glow: 'from-neon-cyan/20' },
            { label: 'Total Faculty', value: faculty.length, icon: Users, color: 'text-neon-purple', glow: 'from-neon-purple/20' },
            { label: 'Avg Attendance', value: overallAttendance, icon: Target, color: overallAttendance >= 75 ? 'text-neon-green' : 'text-destructive', glow: 'from-neon-green/20', suffix: '%' },
            { label: 'Avg CGPA', value: avgCGPA, icon: Award, color: 'text-warning', glow: 'from-warning/20' },
            { label: 'At Risk', value: atRiskStudents.length, icon: AlertTriangle, color: atRiskStudents.length > 0 ? 'text-destructive' : 'text-neon-green', glow: 'from-destructive/20' },
            { label: 'Pending Leaves', value: pendingLeaves, icon: Clock, color: 'text-neon-pink', glow: 'from-neon-pink/20' },
          ].map((stat, i) => (
            <div
              key={stat.label}
              className="futuristic-card p-4 animate-slide-up hover:scale-[1.02] transition-transform"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className={`inline-flex p-2 rounded-lg bg-gradient-to-br ${stat.glow} to-transparent mb-2`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
              <div className={`font-display text-xl md:text-2xl font-bold ${stat.color}`}>
                <AnimatedCounter value={typeof stat.value === 'number' ? stat.value : 0} suffix={stat.suffix || ''} />
              </div>
              <p className="text-[10px] text-muted-foreground font-body uppercase tracking-wider mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* ====== MAIN ANALYTICS TABS ====== */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="bg-card/50 border border-border/50">
            <TabsTrigger value="overview" className="font-body text-xs">
              <Eye className="h-3.5 w-3.5 mr-1.5" />Overview
            </TabsTrigger>
            <TabsTrigger value="faculty" className="font-body text-xs">
              <Users className="h-3.5 w-3.5 mr-1.5" />Faculty
            </TabsTrigger>
            <TabsTrigger value="students" className="font-body text-xs">
              <GraduationCap className="h-3.5 w-3.5 mr-1.5" />Students
            </TabsTrigger>
            <TabsTrigger value="risk" className="font-body text-xs">
              <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />Risk Monitor
            </TabsTrigger>
            <TabsTrigger value="radar" className="font-body text-xs">
              <Zap className="h-3.5 w-3.5 mr-1.5" />Anomaly Radar
            </TabsTrigger>
            <TabsTrigger value="load" className="font-body text-xs">
              <Activity className="h-3.5 w-3.5 mr-1.5" />Load Balancer
            </TabsTrigger>
            <TabsTrigger value="ledger" className="font-body text-xs">
              <Shield className="h-3.5 w-3.5 mr-1.5" />Grade Ledger
            </TabsTrigger>
          </TabsList>

          {/* ======== OVERVIEW TAB ======== */}
          <TabsContent value="overview" className="space-y-4">
            {/* Section Comparison Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {sectionMetrics.map((sec, i) => (
                <div key={sec.section} className="futuristic-card p-4 neon-border animate-slide-up" style={{ animationDelay: `${i * 80}ms` }}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-display text-sm font-bold tracking-wider">{sec.section}</h3>
                    <Badge variant="outline" className="text-[10px] border-neon-cyan/30 text-neon-cyan">{sec.students} students</Badge>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground font-body">Attendance</span>
                      <span className={`font-bold ${sec.attendance >= 75 ? 'text-neon-green' : 'text-destructive'}`}>{sec.attendance}%</span>
                    </div>
                    <Progress value={sec.attendance} className="h-1.5" />
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground font-body">Avg CGPA</span>
                      <span className="font-bold text-warning">{sec.avgCGPA}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground font-body">Faculty</span>
                      <span className="font-bold text-neon-purple">{sec.faculty}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground font-body">At Risk</span>
                      <span className={`font-bold ${sec.atRisk > 0 ? 'text-destructive' : 'text-neon-green'}`}>{sec.atRisk}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Attendance Trend + Section Radar */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="futuristic-card neon-border animate-fade-in">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-display flex items-center gap-2 tracking-wider">
                    <Activity className="h-4 w-4 text-neon-cyan" />
                    Attendance Trend
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {attendanceTrend.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <AreaChart data={attendanceTrend}>
                        <defs>
                          <linearGradient id="hodAttGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(185, 100%, 50%)" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="hsl(185, 100%, 50%)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="month" className="text-xs" />
                        <YAxis domain={[0, 100]} className="text-xs" />
                        <Tooltip formatter={(v: any) => `${v}%`} />
                        <Area type="monotone" dataKey="percentage" stroke="hsl(185, 100%, 50%)" strokeWidth={2} fill="url(#hodAttGrad)" animationDuration={2000} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-center text-muted-foreground py-8 text-sm">No attendance data yet</p>
                  )}
                </CardContent>
              </Card>

              <Card className="futuristic-card neon-border-purple animate-fade-in" style={{ animationDelay: '0.1s' }}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-display flex items-center gap-2 tracking-wider">
                    <BarChart3 className="h-4 w-4 text-neon-purple" />
                    Section Performance Radar
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {sectionMetrics.some(s => s.students > 0) ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <RadarChart data={sectionMetrics}>
                        <PolarGrid stroke="hsl(220, 15%, 25%)" />
                        <PolarAngleAxis dataKey="section" className="text-xs" />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} />
                        <Radar name="Attendance %" dataKey="attendance" stroke="hsl(185, 100%, 50%)" fill="hsl(185, 100%, 50%)" fillOpacity={0.2} animationDuration={1500} />
                        <Radar name="CGPA ×10" dataKey="avgCGPA" stroke="hsl(270, 100%, 65%)" fill="hsl(270, 100%, 65%)" fillOpacity={0.2} animationDuration={2000} />
                        <Legend />
                        <Tooltip />
                      </RadarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-center text-muted-foreground py-8 text-sm">No data to display</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ======== FACULTY TAB ======== */}
          <TabsContent value="faculty" className="space-y-4">
            <div className="grid gap-3">
              {facultyDetails.length > 0 ? facultyDetails.map((f, i) => (
                <div key={f.id} className="futuristic-card p-4 animate-slide-up" style={{ animationDelay: `${i * 40}ms` }}>
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-neon-purple to-neon-cyan flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-display text-sm font-bold">{f.name.charAt(0)}</span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-body font-semibold text-sm truncate">{f.name}</p>
                          {f.is_tutor && (
                            <Badge variant="outline" className="text-[9px] border-neon-green/30 text-neon-green">TUTOR</Badge>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground font-body">{f.faculty_id}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {f.sections.map(s => (
                        <Badge key={s} variant="outline" className="text-[9px] border-neon-cyan/30 text-neon-cyan">{s}</Badge>
                      ))}
                    </div>

                    <div className="flex flex-wrap gap-1.5 max-w-xs">
                      {f.current_subjects.map(s => (
                        <Badge key={s} className="text-[9px] bg-neon-purple/10 text-neon-purple border border-neon-purple/20">{s}</Badge>
                      ))}
                      {f.current_subjects.length === 0 && <span className="text-[10px] text-muted-foreground">No subjects</span>}
                    </div>

                    <div className="flex gap-4 text-center">
                      <div>
                        <p className="font-display text-lg font-bold text-neon-cyan">{f.totalClasses}</p>
                        <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Classes</p>
                      </div>
                      <div>
                        <p className="font-display text-lg font-bold text-neon-green">{f.studentsHandled}</p>
                        <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Students</p>
                      </div>
                      <div>
                        <p className={`font-display text-lg font-bold ${f.avgAttendance >= 75 ? 'text-neon-green' : 'text-destructive'}`}>{f.avgAttendance}%</p>
                        <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Avg Att.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )) : (
                <Card><CardContent className="py-12 text-center text-muted-foreground">No faculty data available</CardContent></Card>
              )}
            </div>

            {/* Faculty Workload Chart */}
            {facultyDetails.length > 0 && (
              <Card className="futuristic-card neon-border animate-fade-in">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-display flex items-center gap-2 tracking-wider">
                    <BarChart3 className="h-4 w-4 text-neon-cyan" />
                    Faculty Workload Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={Math.max(200, facultyDetails.length * 35)}>
                    <BarChart data={facultyDetails.sort((a, b) => b.totalClasses - a.totalClasses).slice(0, 15)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis type="number" className="text-xs" />
                      <YAxis dataKey="name" type="category" width={120} className="text-xs" />
                      <Tooltip />
                      <Bar dataKey="totalClasses" fill="hsl(185, 100%, 50%)" radius={[0, 4, 4, 0]} animationDuration={1500} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ======== STUDENTS TAB ======== */}
          <TabsContent value="students" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Section Distribution Pie */}
              <Card className="futuristic-card neon-border animate-fade-in">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-display flex items-center gap-2 tracking-wider">
                    <GraduationCap className="h-4 w-4 text-neon-cyan" />
                    Student Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {sectionMetrics.some(s => s.students > 0) ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <RPieChart>
                        <Pie
                          data={sectionMetrics.filter(s => s.students > 0).map(s => ({ name: s.section, value: s.students }))}
                          cx="50%" cy="50%" outerRadius={90} innerRadius={50} dataKey="value"
                          label={({ name, value }) => `${name}: ${value}`}
                          animationDuration={1500}
                        >
                          {sectionMetrics.map((_, i) => (
                            <Cell key={i} fill={NEON_COLORS[i % NEON_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </RPieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-center text-muted-foreground py-8 text-sm">No students</p>
                  )}
                </CardContent>
              </Card>

              {/* CGPA by Section Bar */}
              <Card className="futuristic-card neon-border-purple animate-fade-in" style={{ animationDelay: '0.1s' }}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-display flex items-center gap-2 tracking-wider">
                    <Award className="h-4 w-4 text-warning" />
                    Section-wise CGPA
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {sectionMetrics.some(s => s.avgCGPA > 0) ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={sectionMetrics}>
                        <defs>
                          <linearGradient id="hodCgpaGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="hsl(38, 92%, 50%)" stopOpacity={1} />
                            <stop offset="100%" stopColor="hsl(38, 92%, 50%)" stopOpacity={0.4} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="section" className="text-xs" />
                        <YAxis domain={[0, 10]} className="text-xs" />
                        <Tooltip />
                        <Bar dataKey="avgCGPA" fill="url(#hodCgpaGrad)" radius={[6, 6, 0, 0]} animationDuration={1500} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-center text-muted-foreground py-8 text-sm">No CGPA data</p>
                  )}
                </CardContent>
              </Card>

              {/* Section Attendance Comparison */}
              <Card className="md:col-span-2 futuristic-card neon-border animate-fade-in" style={{ animationDelay: '0.2s' }}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-display flex items-center gap-2 tracking-wider">
                    <Target className="h-4 w-4 text-neon-green" />
                    Section Attendance Comparison
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {sectionMetrics.some(s => s.attendance > 0) ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={sectionMetrics}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="section" className="text-xs" />
                        <YAxis domain={[0, 100]} className="text-xs" />
                        <Tooltip formatter={(v: any) => `${v}%`} />
                        <Bar dataKey="attendance" radius={[6, 6, 0, 0]} animationDuration={1500}>
                          {sectionMetrics.map((s, i) => (
                            <Cell key={i} fill={s.attendance >= 75 ? 'hsl(150, 100%, 50%)' : 'hsl(0, 84%, 60%)'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-center text-muted-foreground py-8 text-sm">No attendance data</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ======== RISK MONITOR TAB ======== */}
          <TabsContent value="risk" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              <div className="futuristic-card p-4 border-l-4 border-destructive">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <span className="font-display text-xl font-bold text-destructive">
                    {atRiskStudents.filter(s => s.riskLevel === 'HIGH').length}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">High Risk Students</p>
              </div>
              <div className="futuristic-card p-4 border-l-4 border-warning">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingDown className="h-4 w-4 text-warning" />
                  <span className="font-display text-xl font-bold text-warning">
                    {atRiskStudents.filter(s => s.riskLevel === 'MEDIUM').length}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Medium Risk Students</p>
              </div>
              <div className="futuristic-card p-4 border-l-4 border-neon-green">
                <div className="flex items-center gap-2 mb-1">
                  <Shield className="h-4 w-4 text-neon-green" />
                  <span className="font-display text-xl font-bold text-neon-green">
                    {students.length - atRiskStudents.length}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Safe Students</p>
              </div>
            </div>

            {atRiskStudents.length > 0 ? (
              <div className="space-y-2">
                {atRiskStudents.slice(0, 20).map((s, i) => (
                  <div key={i} className="futuristic-card p-3 flex items-center gap-4 animate-slide-up" style={{ animationDelay: `${i * 30}ms` }}>
                    <div className={`h-2 w-2 rounded-full flex-shrink-0 ${s.riskLevel === 'HIGH' ? 'bg-destructive animate-pulse' : 'bg-warning'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-body font-medium text-sm truncate">{s.name}</p>
                        <Badge variant={s.riskLevel === 'HIGH' ? 'destructive' : 'secondary'} className="text-[9px]">{s.riskLevel}</Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground">{s.roll_number} · {s.section}</p>
                    </div>
                    <div className="flex gap-4 text-right flex-shrink-0">
                      <div>
                        <p className={`text-sm font-bold ${s.attendance < 75 ? 'text-destructive' : 'text-neon-green'}`}>{s.attendance}%</p>
                        <p className="text-[9px] text-muted-foreground">Attendance</p>
                      </div>
                      {s.cgpa !== null && (
                        <div>
                          <p className={`text-sm font-bold ${s.cgpa < 5 ? 'text-destructive' : 'text-neon-green'}`}>{s.cgpa}</p>
                          <p className="text-[9px] text-muted-foreground">CGPA</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {atRiskStudents.length > 20 && (
                  <p className="text-center text-xs text-muted-foreground py-2">
                    + {atRiskStudents.length - 20} more at-risk students
                  </p>
                )}
              </div>
            ) : (
              <Card className="futuristic-card">
                <CardContent className="py-12 text-center">
                  <Shield className="h-12 w-12 mx-auto text-neon-green/30 mb-3" />
                  <p className="font-display text-lg font-bold text-neon-green">All Clear</p>
                  <p className="text-sm text-muted-foreground">No students are currently at risk</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
