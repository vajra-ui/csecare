import { useEffect, useState } from 'react';
import { BarChart3, Loader2, Users, GraduationCap, TrendingUp, PieChart, Award, Target, Activity, BookOpen } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RPieChart, Pie, Cell, Legend, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, ComposedChart, Area, Line,
  AreaChart, LineChart,
} from 'recharts';

const COLORS = ['hsl(210, 85%, 50%)', 'hsl(142, 70%, 40%)', 'hsl(38, 92%, 50%)', 'hsl(348, 75%, 35%)', 'hsl(270, 60%, 50%)'];
const GRADIENT_COLORS = [
  { start: 'hsl(210, 85%, 50%)', end: 'hsl(210, 85%, 70%)' },
  { start: 'hsl(142, 70%, 40%)', end: 'hsl(142, 70%, 60%)' },
  { start: 'hsl(38, 92%, 50%)', end: 'hsl(38, 92%, 70%)' },
  { start: 'hsl(348, 75%, 35%)', end: 'hsl(348, 75%, 55%)' },
];

export default function AdminAnalytics() {
  const [loading, setLoading] = useState(true);
  const [sectionData, setSectionData] = useState<any[]>([]);
  const [yearData, setYearData] = useState<any[]>([]);
  const [odStatusData, setOdStatusData] = useState<any[]>([]);
  const [facultyWorkload, setFacultyWorkload] = useState<any[]>([]);
  const [sectionPerformance, setSectionPerformance] = useState<any[]>([]);
  const [attendanceBySection, setAttendanceBySection] = useState<any[]>([]);
  const [tutorStats, setTutorStats] = useState<any[]>([]);
  const [attendanceTrends, setAttendanceTrends] = useState<any[]>([]);
  const [cgpaDistribution, setCgpaDistribution] = useState<any[]>([]);
  const [monthlySubmissions, setMonthlySubmissions] = useState<any[]>([]);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const [studentsRes, facultyRes, odRes, timetableRes, scoresRes, attendanceRes, academicRes, submissionsRes] = await Promise.all([
        supabase.from('students').select('id, section, year'),
        supabase.from('faculty').select('id, name, is_tutor, section'),
        supabase.from('od_requests').select('status'),
        supabase.from('timetable').select('faculty_id, subject'),
        supabase.from('subject_scores').select('student_id, semester, total_marks, grade'),
        supabase.from('attendance').select('student_id, is_present, subject, date'),
        supabase.from('academic_records').select('student_id, semester, cgpa'),
        supabase.from('assignment_submissions').select('submitted_at'),
      ]);

      const students = studentsRes.data || [];
      const faculty = facultyRes.data || [];
      const scores = scoresRes.data || [];
      const attendance = attendanceRes.data || [];
      const academic = academicRes.data || [];
      const submissions = submissionsRes.data || [];

      // Section & Year distribution
      const sectionMap: Record<string, number> = {};
      const yearMap: Record<string, number> = {};
      const studentSectionMap: Record<string, string> = {};
      students.forEach((s: any) => {
        sectionMap[s.section] = (sectionMap[s.section] || 0) + 1;
        yearMap[s.year] = (yearMap[s.year] || 0) + 1;
        studentSectionMap[s.id] = s.section;
      });
      setSectionData(Object.entries(sectionMap).map(([name, count]) => ({ name, count })));
      setYearData(Object.entries(yearMap).map(([name, count]) => ({ name: `Year ${name}`, count })));

      // OD status
      const odMap: Record<string, number> = {};
      (odRes.data || []).forEach((o: any) => { odMap[o.status] = (odMap[o.status] || 0) + 1; });
      setOdStatusData(Object.entries(odMap).map(([name, value]) => ({ name, value })));

      // Faculty workload
      const workloadMap: Record<string, number> = {};
      (timetableRes.data || []).forEach((t: any) => { workloadMap[t.faculty_id] = (workloadMap[t.faculty_id] || 0) + 1; });
      const facultyNameMap: Record<string, string> = {};
      faculty.forEach((f: any) => { facultyNameMap[f.id] = f.name; });
      setFacultyWorkload(
        Object.entries(workloadMap)
          .map(([id, classes]) => ({ name: facultyNameMap[id] || id.substring(0, 8), classes }))
          .sort((a, b) => b.classes - a.classes)
          .slice(0, 10)
      );

      // Section-wise average CGPA
      const sectionCgpa: Record<string, { total: number; count: number }> = {};
      academic.forEach((a: any) => {
        const sec = studentSectionMap[a.student_id];
        if (sec && a.cgpa) {
          if (!sectionCgpa[sec]) sectionCgpa[sec] = { total: 0, count: 0 };
          sectionCgpa[sec].total += Number(a.cgpa);
          sectionCgpa[sec].count += 1;
        }
      });
      setSectionPerformance(
        Object.entries(sectionCgpa).map(([section, v]) => ({
          section,
          avgCGPA: Number((v.total / v.count).toFixed(2)),
        }))
      );

      // Section-wise attendance
      const sectionAtt: Record<string, { present: number; total: number }> = {};
      attendance.forEach((a: any) => {
        const sec = studentSectionMap[a.student_id];
        if (sec) {
          if (!sectionAtt[sec]) sectionAtt[sec] = { present: 0, total: 0 };
          sectionAtt[sec].total += 1;
          if (a.is_present) sectionAtt[sec].present += 1;
        }
      });
      setAttendanceBySection(
        Object.entries(sectionAtt).map(([section, v]) => ({
          section,
          percentage: Number(((v.present / v.total) * 100).toFixed(1)),
          present: v.present,
          total: v.total,
        }))
      );

      // Tutor stats
      const tutors = faculty.filter((f: any) => f.is_tutor);
      setTutorStats(tutors.map((t: any) => {
        const sectionStudents = students.filter((s: any) => s.section === t.section);
        return { name: t.name, section: t.section || '-', students: sectionStudents.length };
      }));

      // === NEW: Attendance Trends by Month ===
      const monthlyAtt: Record<string, { present: number; total: number }> = {};
      attendance.forEach((a: any) => {
        if (!a.date) return;
        const month = a.date.substring(0, 7); // YYYY-MM
        if (!monthlyAtt[month]) monthlyAtt[month] = { present: 0, total: 0 };
        monthlyAtt[month].total += 1;
        if (a.is_present) monthlyAtt[month].present += 1;
      });
      const sortedMonths = Object.keys(monthlyAtt).sort();
      setAttendanceTrends(sortedMonths.map(month => ({
        month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        percentage: Number(((monthlyAtt[month].present / monthlyAtt[month].total) * 100).toFixed(1)),
        present: monthlyAtt[month].present,
        absent: monthlyAtt[month].total - monthlyAtt[month].present,
      })));

      // === NEW: CGPA Distribution ===
      const cgpaBuckets: Record<string, number> = {
        '0-4': 0, '4-5': 0, '5-6': 0, '6-7': 0, '7-8': 0, '8-9': 0, '9-10': 0,
      };
      academic.forEach((a: any) => {
        if (a.cgpa == null) return;
        const c = Number(a.cgpa);
        if (c < 4) cgpaBuckets['0-4']++;
        else if (c < 5) cgpaBuckets['4-5']++;
        else if (c < 6) cgpaBuckets['5-6']++;
        else if (c < 7) cgpaBuckets['6-7']++;
        else if (c < 8) cgpaBuckets['7-8']++;
        else if (c < 9) cgpaBuckets['8-9']++;
        else cgpaBuckets['9-10']++;
      });
      setCgpaDistribution(Object.entries(cgpaBuckets).map(([range, count]) => ({ range, count })));

      // === NEW: Monthly Submissions ===
      const monthSub: Record<string, number> = {};
      submissions.forEach((s: any) => {
        if (!s.submitted_at) return;
        const month = s.submitted_at.substring(0, 7);
        monthSub[month] = (monthSub[month] || 0) + 1;
      });
      const sortedSubMonths = Object.keys(monthSub).sort();
      setMonthlySubmissions(sortedSubMonths.map(month => ({
        month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        submissions: monthSub[month],
      })));

    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="h-7 w-7 text-primary" />
            Analytics Dashboard
          </h1>
          <p className="text-muted-foreground text-sm">Department metrics, trends, and comparisons</p>
        </div>

        <Tabs defaultValue="trends" className="space-y-4">
          <TabsList>
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="comparative">Comparative</TabsTrigger>
            <TabsTrigger value="faculty">Faculty</TabsTrigger>
          </TabsList>

          {/* TRENDS TAB — NEW */}
          <TabsContent value="trends" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Attendance Trends */}
              <Card className="md:col-span-2 animate-fade-in">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary" />
                    Attendance Trends
                  </CardTitle>
                  <CardDescription>Monthly attendance percentage over time</CardDescription>
                </CardHeader>
                <CardContent>
                  {attendanceTrends.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={attendanceTrends}>
                        <defs>
                          <linearGradient id="attendanceGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(210, 85%, 50%)" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="hsl(210, 85%, 50%)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="month" className="text-xs" />
                        <YAxis domain={[0, 100]} className="text-xs" />
                        <Tooltip formatter={(value: any) => `${value}%`} />
                        <Area
                          type="monotone"
                          dataKey="percentage"
                          stroke="hsl(210, 85%, 50%)"
                          strokeWidth={3}
                          fill="url(#attendanceGrad)"
                          animationDuration={2000}
                          animationEasing="ease-out"
                        />
                        <Line
                          type="monotone"
                          dataKey="percentage"
                          stroke="hsl(348, 75%, 50%)"
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          dot={false}
                          animationDuration={2500}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">No attendance data yet</p>
                  )}
                </CardContent>
              </Card>

              {/* CGPA Distribution */}
              <Card className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Award className="h-5 w-5 text-purple-500" />
                    CGPA Distribution
                  </CardTitle>
                  <CardDescription>Student count by CGPA range</CardDescription>
                </CardHeader>
                <CardContent>
                  {cgpaDistribution.some(d => d.count > 0) ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={cgpaDistribution}>
                        <defs>
                          <linearGradient id="cgpaGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="hsl(270, 60%, 50%)" stopOpacity={1} />
                            <stop offset="100%" stopColor="hsl(270, 60%, 70%)" stopOpacity={0.6} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="range" className="text-xs" />
                        <YAxis className="text-xs" />
                        <Tooltip />
                        <Bar
                          dataKey="count"
                          fill="url(#cgpaGrad)"
                          radius={[6, 6, 0, 0]}
                          animationDuration={1500}
                          animationEasing="ease-out"
                        >
                          {cgpaDistribution.map((entry, i) => (
                            <Cell
                              key={i}
                              fill={entry.range === '9-10' ? 'hsl(142, 70%, 40%)' : entry.range === '0-4' ? 'hsl(0, 70%, 50%)' : `hsl(${210 + i * 20}, 60%, 50%)`}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">No CGPA data yet</p>
                  )}
                </CardContent>
              </Card>

              {/* Monthly Submissions */}
              <Card className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-green-500" />
                    Assignment Submissions
                  </CardTitle>
                  <CardDescription>Monthly submission count</CardDescription>
                </CardHeader>
                <CardContent>
                  {monthlySubmissions.length > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <LineChart data={monthlySubmissions}>
                        <defs>
                          <linearGradient id="subGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(142, 70%, 40%)" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="hsl(142, 70%, 40%)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="month" className="text-xs" />
                        <YAxis className="text-xs" />
                        <Tooltip />
                        <Line
                          type="monotone"
                          dataKey="submissions"
                          stroke="hsl(142, 70%, 40%)"
                          strokeWidth={3}
                          dot={{ r: 5, fill: 'hsl(142, 70%, 40%)' }}
                          activeDot={{ r: 8, strokeWidth: 2 }}
                          animationDuration={2000}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">No submissions yet</p>
                  )}
                </CardContent>
              </Card>

              {/* Attendance: Present vs Absent stacked */}
              <Card className="md:col-span-2 animate-fade-in" style={{ animationDelay: '0.3s' }}>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Target className="h-5 w-5 text-amber-500" />
                    Present vs Absent by Month
                  </CardTitle>
                  <CardDescription>Stacked view of monthly attendance</CardDescription>
                </CardHeader>
                <CardContent>
                  {attendanceTrends.length > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={attendanceTrends}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="month" className="text-xs" />
                        <YAxis className="text-xs" />
                        <Tooltip />
                        <Legend />
                        <Bar
                          dataKey="present"
                          stackId="a"
                          fill="hsl(142, 70%, 40%)"
                          radius={[0, 0, 0, 0]}
                          animationDuration={1500}
                        />
                        <Bar
                          dataKey="absent"
                          stackId="a"
                          fill="hsl(0, 70%, 50%)"
                          radius={[4, 4, 0, 0]}
                          animationDuration={1500}
                          animationBegin={300}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">No data</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* OVERVIEW TAB */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="animate-fade-in">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-blue-500" />
                    Students by Section
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {sectionData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={sectionData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="name" className="text-xs" />
                        <YAxis className="text-xs" />
                        <Tooltip />
                        <Bar dataKey="count" fill="hsl(210, 85%, 50%)" radius={[4, 4, 0, 0]} animationDuration={1500} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">No data</p>
                  )}
                </CardContent>
              </Card>

              <Card className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-500" />
                    Students by Year
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {yearData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={yearData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="name" className="text-xs" />
                        <YAxis className="text-xs" />
                        <Tooltip />
                        <Bar dataKey="count" fill="hsl(142, 70%, 40%)" radius={[4, 4, 0, 0]} animationDuration={1500} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">No data</p>
                  )}
                </CardContent>
              </Card>

              <Card className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <PieChart className="h-5 w-5 text-amber-500" />
                    OD Request Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {odStatusData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <RPieChart>
                        <Pie data={odStatusData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label animationDuration={1500}>
                          {odStatusData.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </RPieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">No OD data</p>
                  )}
                </CardContent>
              </Card>

              <Card className="animate-fade-in" style={{ animationDelay: '0.3s' }}>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Tutor Assignments
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {tutorStats.length > 0 ? (
                    <div className="space-y-3">
                      {tutorStats.map((t, i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 animate-fade-in" style={{ animationDelay: `${i * 0.1}s` }}>
                          <div>
                            <p className="font-medium text-sm">{t.name}</p>
                            <p className="text-xs text-muted-foreground">{t.section}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold">{t.students}</p>
                            <p className="text-xs text-muted-foreground">students</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">No tutor data</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* COMPARATIVE TAB */}
          <TabsContent value="comparative" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="animate-fade-in">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Award className="h-5 w-5 text-purple-500" />
                    Section-wise Average CGPA
                  </CardTitle>
                  <CardDescription>Compare academic performance across sections</CardDescription>
                </CardHeader>
                <CardContent>
                  {sectionPerformance.length > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <ComposedChart data={sectionPerformance}>
                        <defs>
                          <linearGradient id="cgpaSectionGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="hsl(270, 60%, 50%)" stopOpacity={0.9} />
                            <stop offset="100%" stopColor="hsl(270, 60%, 70%)" stopOpacity={0.4} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="section" className="text-xs" />
                        <YAxis domain={[0, 10]} className="text-xs" />
                        <Tooltip />
                        <Bar dataKey="avgCGPA" fill="url(#cgpaSectionGrad)" radius={[6, 6, 0, 0]} barSize={40} animationDuration={1500} />
                        <Line type="monotone" dataKey="avgCGPA" stroke="hsl(348, 75%, 50%)" strokeWidth={2} dot={{ r: 5 }} animationDuration={2000} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">No academic records to compare</p>
                  )}
                </CardContent>
              </Card>

              <Card className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Target className="h-5 w-5 text-red-500" />
                    Section-wise Attendance
                  </CardTitle>
                  <CardDescription>Compare attendance percentages across sections</CardDescription>
                </CardHeader>
                <CardContent>
                  {attendanceBySection.length > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={attendanceBySection}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="section" className="text-xs" />
                        <YAxis domain={[0, 100]} className="text-xs" />
                        <Tooltip formatter={(value: any) => `${value}%`} />
                        <Bar dataKey="percentage" radius={[6, 6, 0, 0]} barSize={40} animationDuration={1500}>
                          {attendanceBySection.map((entry, i) => (
                            <Cell key={i} fill={entry.percentage >= 75 ? 'hsl(142, 70%, 40%)' : 'hsl(0, 70%, 50%)'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">No attendance data to compare</p>
                  )}
                </CardContent>
              </Card>

              {/* Radar chart */}
              <Card className="md:col-span-2 animate-fade-in" style={{ animationDelay: '0.2s' }}>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-blue-500" />
                    Section Performance Radar
                  </CardTitle>
                  <CardDescription>Holistic comparison of section metrics</CardDescription>
                </CardHeader>
                <CardContent>
                  {(sectionPerformance.length > 0 || attendanceBySection.length > 0) ? (
                    <ResponsiveContainer width="100%" height={320}>
                      <RadarChart
                        data={sectionData.map((s) => {
                          const perf = sectionPerformance.find((p) => p.section === s.name);
                          const att = attendanceBySection.find((a) => a.section === s.name);
                          return {
                            section: s.name,
                            students: s.count * 10,
                            cgpa: (perf?.avgCGPA || 0) * 10,
                            attendance: att?.percentage || 0,
                          };
                        })}
                      >
                        <PolarGrid />
                        <PolarAngleAxis dataKey="section" className="text-xs" />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} />
                        <Radar name="Attendance %" dataKey="attendance" stroke="hsl(210, 85%, 50%)" fill="hsl(210, 85%, 50%)" fillOpacity={0.3} animationDuration={1500} />
                        <Radar name="CGPA (×10)" dataKey="cgpa" stroke="hsl(142, 70%, 40%)" fill="hsl(142, 70%, 40%)" fillOpacity={0.3} animationDuration={2000} />
                        <Legend />
                        <Tooltip />
                      </RadarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">Not enough data for radar comparison</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* FACULTY TAB */}
          <TabsContent value="faculty" className="space-y-4">
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Faculty Class Load
                </CardTitle>
                <CardDescription>Number of timetable slots per faculty member</CardDescription>
              </CardHeader>
              <CardContent>
                {facultyWorkload.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={facultyWorkload} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis type="number" className="text-xs" />
                      <YAxis dataKey="name" type="category" width={100} className="text-xs" />
                      <Tooltip />
                      <Bar dataKey="classes" fill="hsl(348, 75%, 45%)" radius={[0, 4, 4, 0]} animationDuration={1500} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-muted-foreground py-8">No timetable data</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
