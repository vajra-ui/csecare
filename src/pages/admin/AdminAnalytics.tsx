import { useEffect, useState } from 'react';
import { BarChart3, Loader2, Users, GraduationCap, TrendingUp, PieChart } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RPieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts';

const COLORS = ['hsl(210, 85%, 50%)', 'hsl(142, 70%, 40%)', 'hsl(38, 92%, 50%)', 'hsl(348, 75%, 35%)'];

export default function AdminAnalytics() {
  const [loading, setLoading] = useState(true);
  const [sectionData, setSectionData] = useState<any[]>([]);
  const [yearData, setYearData] = useState<any[]>([]);
  const [odStatusData, setOdStatusData] = useState<any[]>([]);
  const [facultyWorkload, setFacultyWorkload] = useState<any[]>([]);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const [studentsRes, facultyRes, odRes, timetableRes] = await Promise.all([
        supabase.from('students').select('section, year'),
        supabase.from('faculty').select('name, is_tutor, section'),
        supabase.from('od_requests').select('status'),
        supabase.from('timetable').select('faculty_id, subject'),
      ]);

      // Section-wise student count
      const sectionMap: Record<string, number> = {};
      const yearMap: Record<string, number> = {};
      (studentsRes.data || []).forEach((s: any) => {
        sectionMap[s.section] = (sectionMap[s.section] || 0) + 1;
        yearMap[s.year] = (yearMap[s.year] || 0) + 1;
      });
      setSectionData(Object.entries(sectionMap).map(([name, count]) => ({ name, count })));
      setYearData(Object.entries(yearMap).map(([name, count]) => ({ name: `Year ${name}`, count })));

      // OD status distribution
      const odMap: Record<string, number> = {};
      (odRes.data || []).forEach((o: any) => {
        odMap[o.status] = (odMap[o.status] || 0) + 1;
      });
      setOdStatusData(Object.entries(odMap).map(([name, value]) => ({ name, value })));

      // Faculty workload (classes per faculty)
      const workloadMap: Record<string, number> = {};
      (timetableRes.data || []).forEach((t: any) => {
        workloadMap[t.faculty_id] = (workloadMap[t.faculty_id] || 0) + 1;
      });
      const facultyNames: Record<string, string> = {};
      (facultyRes.data || []).forEach((f: any) => {
        facultyNames[f.name] = f.name;
      });
      // We'll show top faculty by class count
      const workloadArr = Object.entries(workloadMap)
        .map(([id, classes]) => ({ name: id.substring(0, 8), classes }))
        .sort((a, b) => b.classes - a.classes)
        .slice(0, 10);
      setFacultyWorkload(workloadArr);
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
          <p className="text-muted-foreground text-sm">Overview of department metrics and trends</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Section-wise Students */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-info" />
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
                <p className="text-center text-muted-foreground py-8">No data available</p>
              )}
            </CardContent>
          </Card>

          {/* Year-wise Students */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-success" />
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
                <p className="text-center text-muted-foreground py-8">No data available</p>
              )}
            </CardContent>
          </Card>

          {/* OD Request Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <PieChart className="h-5 w-5 text-warning" />
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
                <p className="text-center text-muted-foreground py-8">No OD requests yet</p>
              )}
            </CardContent>
          </Card>

          {/* Faculty Workload */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Faculty Class Load
              </CardTitle>
            </CardHeader>
            <CardContent>
              {facultyWorkload.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={facultyWorkload} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis type="number" className="text-xs" />
                    <YAxis dataKey="name" type="category" width={80} className="text-xs" />
                    <Tooltip />
                    <Bar dataKey="classes" fill="hsl(348, 75%, 35%)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-muted-foreground py-8">No timetable data</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
