import { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Upload, TrendingUp, FileText, CalendarCheck, LogOut, User, Calendar, Moon, Sun, BookOpen, Trophy, Calculator, ClipboardList, Star, Mail,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PaavaiLogo } from '@/components/ui/PaavaiLogo';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { MobileSidebar } from './MobileSidebar';
import { useTheme } from 'next-themes';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { StudentAIAssistant } from '@/components/ai/StudentAIAssistant';

interface StudentLayoutProps {
  children: ReactNode;
}

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/student' },
  { icon: User, label: 'Profile', path: '/student/profile' },
  { icon: Calendar, label: 'Timetable', path: '/student/timetable' },
  { icon: BookOpen, label: 'Assignments', path: '/student/assignments' },
  { icon: Upload, label: 'Uploads', path: '/student/upload' },
  { icon: TrendingUp, label: 'Progress', path: '/student/progress' },
  { icon: FileText, label: 'OD Submission', path: '/student/od' },
  { icon: CalendarCheck, label: 'Attendance', path: '/student/attendance' },
  { icon: Trophy, label: 'Achievements', path: '/student/achievements' },
  { icon: Calculator, label: 'GPA Calculator', path: '/student/gpa-calculator' },
  { icon: ClipboardList, label: 'Exam Timetable', path: '/student/exam-timetable' },
  { icon: Star, label: 'Feedback', path: '/student/feedback' },
  { icon: Mail, label: 'Messages', path: '/student/messages' },
];

export function StudentLayout({ children }: StudentLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();

  const handleLogout = async () => {
    await logout();
    toast({ title: 'Logged out', description: 'You have been successfully logged out.' });
    navigate('/');
  };

  const sidebarContent = (
    <aside className="h-full flex flex-col relative overflow-hidden" style={{ background: 'linear-gradient(180deg, hsl(220 30% 6%) 0%, hsl(250 25% 10%) 100%)' }}>
      {/* Ambient glow */}
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-neon-cyan/8 to-transparent pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-neon-purple/5 to-transparent pointer-events-none" />

      <div className="p-4 border-b border-neon-cyan/10 relative z-10">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 bg-neon-cyan/15 rounded-lg blur-sm" />
            <div className="relative bg-card/90 p-1.5 rounded-lg border border-neon-cyan/20">
              <PaavaiLogo size="sm" />
            </div>
          </div>
          <div>
            <h2 className="font-display font-semibold text-xs tracking-wider text-primary-foreground">Student Portal</h2>
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
                    ? 'bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20 shadow-[0_0_10px_hsl(var(--neon-cyan)/0.1)]'
                    : 'text-muted-foreground hover:text-primary-foreground hover:bg-primary-foreground/5 border border-transparent'
                )}
                onClick={() => navigate(item.path)}
              >
                <item.icon className={cn('h-4 w-4', isActive && 'text-neon-cyan')} />
                {item.label}
              </Button>
            );
          })}
        </nav>
      </ScrollArea>

      <div className="p-4 border-t border-neon-cyan/10 relative z-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-neon-cyan to-neon-purple flex items-center justify-center shadow-neon">
            <span className="text-sm font-bold text-background font-display">{user?.name?.charAt(0) || 'S'}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-body font-medium truncate text-primary-foreground">{user?.name}</p>
            <p className="text-[10px] text-muted-foreground font-body truncate">Student</p>
          </div>
        </div>
        <div className="flex gap-1.5">
          <NotificationBell />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-primary-foreground hover:bg-primary-foreground/5"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            <Sun className="h-3.5 w-3.5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-3.5 w-3.5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>
          <Button
            variant="ghost"
            className="flex-1 justify-start gap-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 font-body"
            onClick={handleLogout}
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign Out
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
      <StudentAIAssistant />
    </div>
  );
}
