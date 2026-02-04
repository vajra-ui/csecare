import { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  ClipboardCheck,
  Users,
  FileText,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { PaavaiLogo } from '@/components/ui/PaavaiLogo';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface FacultyLayoutProps {
  children: ReactNode;
}

export function FacultyLayout({ children }: FacultyLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { toast } = useToast();

  const isTutor = user?.isTutor || false;

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/faculty' },
    { icon: Calendar, label: 'Timetable', path: '/faculty/timetable' },
    { icon: ClipboardCheck, label: 'Attendance', path: '/faculty/attendance' },
    ...(isTutor
      ? [
          { icon: Users, label: 'My Students', path: '/faculty/students' },
          { icon: FileText, label: 'OD Requests', path: '/faculty/od-requests' },
        ]
      : []),
  ];

  const handleLogout = async () => {
    await logout();
    toast({
      title: 'Logged out',
      description: 'You have been successfully logged out.',
    });
    navigate('/');
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center gap-3">
            <PaavaiLogo size="sm" />
            <div>
              <h2 className="font-display font-semibold text-sm">Faculty Portal</h2>
              <p className="text-xs text-muted-foreground">CSE Department</p>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1 py-4">
          <nav className="px-3 space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Button
                  key={item.path}
                  variant="ghost"
                  className={cn(
                    'w-full justify-start gap-3 font-normal',
                    isActive
                      ? 'bg-secondary/50 text-secondary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  )}
                  onClick={() => navigate(item.path)}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Button>
              );
            })}
          </nav>
        </ScrollArea>

        <div className="p-4 border-t">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center">
              <span className="text-sm font-medium text-secondary-foreground">
                {user?.name?.charAt(0) || 'F'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium truncate">{user?.name}</p>
                {isTutor && (
                  <Badge variant="secondary" className="text-xs">
                    Tutor
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">{user?.facultyId}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
