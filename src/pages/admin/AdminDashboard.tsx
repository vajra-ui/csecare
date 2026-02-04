import { useEffect, useState } from 'react';
import { Users, GraduationCap, Megaphone, ClipboardList, TrendingUp, FileCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { supabase } from '@/integrations/supabase/client';

interface DashboardStats {
  totalStudents: number;
  totalFaculty: number;
  totalTutors: number;
  activeAnnouncements: number;
  pendingODRequests: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    totalFaculty: 0,
    totalTutors: 0,
    activeAnnouncements: 0,
    pendingODRequests: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [studentsRes, facultyRes, tutorsRes, announcementsRes, odRes] = await Promise.all([
        supabase.from('students').select('id', { count: 'exact', head: true }),
        supabase.from('faculty').select('id', { count: 'exact', head: true }),
        supabase.from('faculty').select('id', { count: 'exact', head: true }).eq('is_tutor', true),
        supabase
          .from('announcements')
          .select('id', { count: 'exact', head: true })
          .eq('is_active', true)
          .lte('start_date', new Date().toISOString())
          .gt('expiry_date', new Date().toISOString()),
        supabase
          .from('od_requests')
          .select('id', { count: 'exact', head: true })
          .in('status', ['submitted', 'tutor_verified']),
      ]);

      setStats({
        totalStudents: studentsRes.count || 0,
        totalFaculty: facultyRes.count || 0,
        totalTutors: tutorsRes.count || 0,
        activeAnnouncements: announcementsRes.count || 0,
        pendingODRequests: odRes.count || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Students',
      value: stats.totalStudents,
      icon: GraduationCap,
      color: 'text-info',
      bgColor: 'bg-info/10',
    },
    {
      title: 'Total Faculty',
      value: stats.totalFaculty,
      icon: Users,
      color: 'text-secondary-foreground',
      bgColor: 'bg-secondary/20',
    },
    {
      title: 'Tutors',
      value: stats.totalTutors,
      icon: FileCheck,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      title: 'Active Announcements',
      value: stats.activeAnnouncements,
      icon: Megaphone,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Pending OD Requests',
      value: stats.pendingODRequests,
      icon: ClipboardList,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Manage students, faculty, and system settings
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {statCards.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? (
                    <div className="h-8 w-16 bg-muted animate-pulse rounded" />
                  ) : (
                    stat.value
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Use the sidebar to navigate to different sections:
              </p>
              <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
                <li>Add students manually or via CSV upload</li>
                <li>Manage faculty and assign tutors</li>
                <li>Create and manage announcements</li>
                <li>Review and approve OD requests</li>
                <li>View audit logs for system activity</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-info" />
                System Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Database</span>
                  <span className="text-sm text-success font-medium">Connected</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Authentication</span>
                  <span className="text-sm text-success font-medium">Active</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Storage</span>
                  <span className="text-sm text-success font-medium">Ready</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
