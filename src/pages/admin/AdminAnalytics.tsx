import { useEffect, useState } from 'react';
import { BarChart3, Loader2, Users, GraduationCap, TrendingUp, PieChart, Award, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RPieChart, Pie, Cell, Legend, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, ComposedChart, Area, Line,
} from 'recharts';

const COLORS = ['hsl(210, 85%, 50%)', 'hsl(142, 70%, 40%)', 'hsl(38, 92%, 50%)', 'hsl(348, 75%, 35%)', 'hsl(270, 60%, 50%)'];

export default function AdminAnalytics() {
  const [loading, setLoading] = useState(true);
  const [sectionData, setSectionData] = useState<any[]>([]);
  const [yearData, setYearData] = useState<any[]>([]);
  const [odStatusData, setOdStatusData] = useState<any[]>([]);
  const [facultyWorkload, setFacultyWorkload] = useState<any[]>([]);
  const [sectionPerformance, setSectionPerformance] = useState<any[]>([]);
  const [attendanceBySection, setAttendanceBySection] = useState<any[]>([]);
  const [tutorStats, setTutorStats] = useState<any[]>([]);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const [studentsRes, facultyRes, odRes, timetableRes, scoresRes, attendanceRes, academicRes] = await Promise.all([
        supabase.from('students').select('id, section, year'),
        supabase.from('faculty').select('id, name, is_tutor, section'),
        supabase.from('od_requests').select('status'),
        supabase.from('timetable').select('faculty_id, subject'),
        supabase.from('subject_scores').select('student_id, semester, total_marks, grade'),
        supabase.from('attendance').select('student_id, is_present, subject'),
        supabase.from('academic_records').select('student_id, semester, cgpa'),
      ]);

      const students = studentsRes.data || [];
      const faculty = facultyRes.data || [];
      const scores = scoresRes.data || [];
      const attendance = attendanceRes.data || [];
      const academic = academicRes.data || [];

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

      // Comparative: Section-wise average CGPA
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

      // Comparative: Section-wise attendance
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
      const tutorData = tutors.map((t: any) => {
        const sectionStudents = students.filter((s: any) => s.section === t.section);
        return {
          name: t.name,
          section: t.section || '-',
          students: sectionStudents.length,
        };
      });
      setTutorStats(tutorData);
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
          <p className="text-muted-foreground text-sm">Department metrics, comparisons, and trends</p>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="comparative">Comparative</TabsTrigger>
            <TabsTrigger value="faculty">Faculty</TabsTrigger>
          </TabsList>

          {/* OVERVIEW TAB */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
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
                        <Bar dataKey="count" fill="hsl(210, 85%, 50%)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">No data</p>
                  )}
                </CardContent>
              </Card>

              <Card>
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
                        <Bar dataKey="count" fill="hsl(142, 70%, 40%)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">No data</p>
                  )}
                </CardContent>
              </Card>

              <Card>
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
                        <Pie data={odStatusData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label>
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

              <Card>
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
                        <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
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
              <Card>
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
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="section" className="text-xs" />
                        <YAxis domain={[0, 10]} className="text-xs" />
                        <Tooltip />
                        <Bar dataKey="avgCGPA" fill="hsl(270, 60%, 50%)" radius={[4, 4, 0, 0]} barSize={40} />
                        <Line type="monotone" dataKey="avgCGPA" stroke="hsl(348, 75%, 50%)" strokeWidth={2} dot={{ r: 5 }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">No academic records to compare</p>
                  )}
                </CardContent>
              </Card>

              <Card>
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
                        <Bar dataKey="percentage" radius={[4, 4, 0, 0]} barSize={40}>
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

              {/* Radar chart combining both metrics */}
              <Card className="md:col-span-2">
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
                            students: s.count * 10, // scale for visibility
                            cgpa: (perf?.avgCGPA || 0) * 10,
                            attendance: att?.percentage || 0,
                          };
                        })}
                      >
                        <PolarGrid />
                        <PolarAngleAxis dataKey="section" className="text-xs" />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} />
                        <Radar name="Attendance %" dataKey="attendance" stroke="hsl(210, 85%, 50%)" fill="hsl(210, 85%, 50%)" fillOpacity={0.3} />
                        <Radar name="CGPA (×10)" dataKey="cgpa" stroke="hsl(142, 70%, 40%)" fill="hsl(142, 70%, 40%)" fillOpacity={0.3} />
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
            <Card>
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
                      <Bar dataKey="classes" fill="hsl(348, 75%, 45%)" radius={[0, 4, 4, 0]} />
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
