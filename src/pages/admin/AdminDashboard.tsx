import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, GraduationCap, Megaphone, ClipboardList, TrendingUp, FileCheck, Activity, Shield, Zap, Server } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { useCallback } from 'react';

interface HealthStatus {
  label: string;
  status: 'Operational' | 'Degraded' | 'Down' | 'Checking';
  color: string;
}

function SystemHealthCard() {
  const [healthChecks, setHealthChecks] = useState<HealthStatus[]>([
    { label: 'Database', status: 'Checking', color: 'text-muted-foreground' },
    { label: 'Authentication', status: 'Checking', color: 'text-muted-foreground' },
    { label: 'File Storage', status: 'Checking', color: 'text-muted-foreground' },
  ]);

  const runChecks = useCallback(async () => {
    const checks: HealthStatus[] = [];

    // DB check
    try {
      const { error } = await supabase.from('announcements').select('id', { count: 'exact', head: true });
      checks.push(error
        ? { label: 'Database', status: 'Degraded', color: 'text-warning' }
        : { label: 'Database', status: 'Operational', color: 'text-neon-green' }
      );
    } catch {
      checks.push({ label: 'Database', status: 'Down', color: 'text-destructive' });
    }

    // Auth check
    try {
      const { data } = await supabase.auth.getSession();
      checks.push(data.session
        ? { label: 'Authentication', status: 'Operational', color: 'text-neon-green' }
        : { label: 'Authentication', status: 'Degraded', color: 'text-warning' }
      );
    } catch {
      checks.push({ label: 'Authentication', status: 'Down', color: 'text-destructive' });
    }

    // Storage check
    try {
      const { error } = await supabase.storage.listBuckets();
      checks.push(error
        ? { label: 'File Storage', status: 'Degraded', color: 'text-warning' }
        : { label: 'File Storage', status: 'Operational', color: 'text-neon-green' }
      );
    } catch {
      checks.push({ label: 'File Storage', status: 'Down', color: 'text-destructive' });
    }

    setHealthChecks(checks);
  }, []);

  useEffect(() => { runChecks(); }, [runChecks]);

  const statusDotColor = (status: string) => {
    if (status === 'Operational') return 'bg-neon-green';
    if (status === 'Degraded') return 'bg-warning';
    if (status === 'Down') return 'bg-destructive';
    return 'bg-muted-foreground';
  };

  return (
    <div className="futuristic-card p-5 neon-border">
      <div className="space-y-4">
        {healthChecks.map((item) => (
          <div key={item.label} className="flex items-center justify-between">
            <span className="text-sm font-body text-muted-foreground">{item.label}</span>
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${statusDotColor(item.status)} ${item.status === 'Checking' ? 'animate-pulse' : 'animate-pulse-subtle'}`} />
              <span className={`text-xs font-body font-medium ${item.color}`}>{item.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface DashboardStats {
  totalStudents: number;
  totalFaculty: number;
  totalTutors: number;
  activeAnnouncements: number;
  pendingODRequests: number;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
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
    { title: 'Students', value: stats.totalStudents, icon: GraduationCap, gradient: 'from-neon-cyan/20 to-info/20', iconColor: 'text-neon-cyan', borderClass: 'neon-border' },
    { title: 'Faculty', value: stats.totalFaculty, icon: Users, gradient: 'from-neon-purple/20 to-primary/20', iconColor: 'text-neon-purple', borderClass: 'neon-border-purple' },
    { title: 'Tutors', value: stats.totalTutors, icon: FileCheck, gradient: 'from-neon-green/20 to-success/20', iconColor: 'text-neon-green', borderClass: '' },
    { title: 'Announcements', value: stats.activeAnnouncements, icon: Megaphone, gradient: 'from-neon-pink/20 to-primary/20', iconColor: 'text-neon-pink', borderClass: 'neon-border-pink' },
    { title: 'Pending OD', value: stats.pendingODRequests, icon: ClipboardList, gradient: 'from-warning/20 to-secondary/20', iconColor: 'text-warning', borderClass: '' },
  ];

  const quickActions = [
    { label: 'Manage Students', desc: 'Add, edit, or import students', icon: GraduationCap, path: '/admin/students' },
    { label: 'Manage Faculty', desc: 'Faculty & tutor assignments', icon: Users, path: '/admin/faculty' },
    { label: 'Announcements', desc: 'Create broadcast messages', icon: Megaphone, path: '/admin/announcements' },
    { label: 'OD Requests', desc: 'Review pending requests', icon: ClipboardList, path: '/admin/od-requests' },
    { label: 'Analytics', desc: 'Department insights', icon: TrendingUp, path: '/admin/analytics' },
    { label: 'Audit Logs', desc: 'System activity trail', icon: Activity, path: '/admin/audit-logs' },
  ];

  return (
    <AdminLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-2xl gradient-hero p-6 md:p-8">
          <div className="grid-pattern absolute inset-0 opacity-30" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-5 w-5 text-neon-cyan" />
              <Badge variant="outline" className="border-neon-cyan/30 text-neon-cyan font-body text-xs tracking-wider uppercase">
                Admin Control Center
              </Badge>
            </div>
            <h1 className="font-display text-2xl md:text-4xl font-bold text-primary-foreground tracking-wide">
              System Dashboard
            </h1>
            <p className="text-primary-foreground/70 font-body mt-1">
              Real-time overview of the CSE Department infrastructure
            </p>
          </div>
          <div className="absolute top-4 right-4 opacity-10">
            <Zap className="h-32 w-32 text-neon-cyan" />
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
          {statCards.map((stat, i) => (
            <div
              key={stat.title}
              className={`futuristic-card stat-glow p-5 animate-slide-up ${stat.borderClass}`}
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className={`inline-flex p-2.5 rounded-lg bg-gradient-to-br ${stat.gradient} mb-3`}>
                <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
              </div>
              <div className="font-display text-2xl md:text-3xl font-bold tracking-wide">
                {loading ? (
                  <div className="h-8 w-16 bg-muted animate-pulse rounded" />
                ) : (
                  <span className={stat.iconColor}>{stat.value}</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground font-body mt-1 uppercase tracking-wider">{stat.title}</p>
            </div>
          ))}
        </div>

        {/* Quick Actions + System Status */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="h-4 w-4 text-neon-cyan" />
              <h2 className="font-display text-lg font-semibold tracking-wide">Quick Actions</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {quickActions.map((action, i) => (
                <div
                  key={action.label}
                  onClick={() => navigate(action.path)}
                  className="futuristic-card p-4 cursor-pointer group animate-slide-up"
                  style={{ animationDelay: `${(i + 5) * 60}ms` }}
                >
                  <action.icon className="h-5 w-5 text-neon-cyan mb-2 group-hover:animate-float" />
                  <p className="font-body font-semibold text-sm">{action.label}</p>
                  <p className="text-xs text-muted-foreground font-body mt-0.5">{action.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* System Status */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Server className="h-4 w-4 text-neon-green" />
              <h2 className="font-display text-lg font-semibold tracking-wide">System Status</h2>
            </div>
            <SystemHealthCard />
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
