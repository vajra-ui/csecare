import { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Calendar, ClipboardCheck, Users, FileText, LogOut, User, Moon, Sun, BookOpen, PenLine, FileUp, CalendarOff, Phone, MessageSquare, Mail, Trophy, CalendarClock, Megaphone, AlertTriangle, BarChart3, Shield, Sparkles, QrCode,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { PaavaiLogo } from '@/components/ui/PaavaiLogo';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { MobileSidebar } from './MobileSidebar';
import { useTheme } from 'next-themes';
import { NotificationBell } from '@/components/notifications/NotificationBell';

interface FacultyLayoutProps {
  children: ReactNode;
}

export function FacultyLayout({ children }: FacultyLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const isTutor = user?.isTutor || false;

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/faculty' },
    { icon: User, label: 'Profile', path: '/faculty/profile' },
    { icon: Calendar, label: 'Timetable', path: '/faculty/timetable' },
    { icon: ClipboardCheck, label: 'Attendance', path: '/faculty/attendance' },
    { icon: QrCode, label: 'QR Beacon', path: '/faculty/qr-attendance' },
    { icon: BookOpen, label: 'Assignments', path: '/faculty/assignments' },
    { icon: PenLine, label: 'Internal Marks', path: '/faculty/marks' },
    { icon: FileUp, label: 'Class Notes', path: '/faculty/notes' },
    { icon: CalendarOff, label: 'Leave', path: '/faculty/leave' },
    { icon: CalendarClock, label: 'My OD Requests', path: '/faculty/my-od' },
    { icon: Trophy, label: 'Achievements', path: '/faculty/achievements' },
    { icon: Megaphone, label: 'Announcements', path: '/faculty/announcements' },
    ...(isTutor ? [
      { icon: Users, label: 'My Students', path: '/faculty/students' },
      { icon: FileText, label: 'Student OD', path: '/faculty/od-requests' },
      { icon: AlertTriangle, label: 'Absence Reports', path: '/faculty/absence-reports' },
      { icon: BarChart3, label: 'Weekly Reports', path: '/faculty/weekly-reports' },
      { icon: Phone, label: 'Parent Comms', path: '/faculty/parent-communication' },
      { icon: MessageSquare, label: 'Mentoring', path: '/faculty/mentoring' },
      { icon: Shield, label: 'Complaints', path: '/faculty/complaints' },
    ] : []),
    { icon: Sparkles, label: 'Study Buddies', path: '/faculty/study-buddies' },
    { icon: Mail, label: 'Messages', path: '/faculty/messages' },
  ];

  const handleLogout = async () => {
    await logout();
    toast({ title: 'Logged out', description: 'You have been successfully logged out.' });
    navigate('/');
  };

  const sidebarContent = (
    <aside className="h-full flex flex-col relative overflow-hidden" style={{ background: 'linear-gradient(180deg, hsl(35 30% 8%) 0%, hsl(30 25% 12%) 100%)' }}>
      {/* Ambient glow */}
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-secondary/10 to-transparent pointer-events-none" />

      <div className="p-4 border-b border-secondary/10 relative z-10">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 bg-secondary/20 rounded-lg blur-sm" />
            <div className="relative bg-card/90 p-1.5 rounded-lg border border-secondary/20">
              <PaavaiLogo size="sm" />
            </div>
          </div>
          <div>
            <h2 className="font-display font-semibold text-xs tracking-wider text-primary-foreground">Faculty Portal</h2>
            <p className="text-[10px] text-muted-foreground font-body tracking-wider">CSE Department</p>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 py-3 relative z-10">
        <nav className="px-3 space-y-0.5">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Button
                key={item.path}
                variant="ghost"
                className={cn(
                  'w-full justify-start gap-3 font-body text-sm h-9 rounded-lg transition-all duration-200',
                  isActive
                    ? 'bg-secondary/15 text-secondary border border-secondary/20 shadow-[0_0_10px_hsl(var(--secondary)/0.1)]'
                    : 'text-muted-foreground hover:text-primary-foreground hover:bg-primary-foreground/5 border border-transparent'
                )}
                onClick={() => navigate(item.path)}
              >
                <item.icon className={cn('h-4 w-4', isActive && 'text-secondary')} />
                {item.label}
              </Button>
            );
          })}
        </nav>
      </ScrollArea>

      <div className="p-4 border-t border-secondary/10 relative z-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-secondary to-warning flex items-center justify-center shadow-gold">
            <span className="text-sm font-bold text-secondary-foreground font-display">{user?.name?.charAt(0) || 'F'}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-body font-medium truncate text-primary-foreground">{user?.name}</p>
              {isTutor && <Badge className="text-[10px] px-1.5 py-0 bg-secondary/20 text-secondary border-secondary/30 font-body">Tutor</Badge>}
            </div>
            <p className="text-[10px] text-muted-foreground font-body truncate">{user?.facultyId}</p>
          </div>
        </div>
        <div className="flex gap-1.5">
          <NotificationBell />
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary-foreground hover:bg-primary-foreground/5" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            <Sun className="h-3.5 w-3.5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-3.5 w-3.5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>
          <Button variant="ghost" className="flex-1 justify-start gap-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 font-body" onClick={handleLogout}>
            <LogOut className="h-3.5 w-3.5" /> Sign Out
          </Button>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background">
      <MobileSidebar>{sidebarContent}</MobileSidebar>
      <div className="hidden md:block w-64 flex-shrink-0">{sidebarContent}</div>
      <main className="flex-1 overflow-auto">
        <div className="p-4 md:p-6 grid-pattern">{children}</div>
      </main>
    </div>
  );
}
