import { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Users,
  GraduationCap,
  Megaphone,
  Settings,
  LogOut,
  LayoutDashboard,
  FileSpreadsheet,
  ClipboardList,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PaavaiLogo } from '@/components/ui/PaavaiLogo';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface AdminLayoutProps {
  children: ReactNode;
}

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
  { icon: GraduationCap, label: 'Students', path: '/admin/students' },
  { icon: Users, label: 'Faculty', path: '/admin/faculty' },
  { icon: Megaphone, label: 'Announcements', path: '/admin/announcements' },
  { icon: ClipboardList, label: 'OD Requests', path: '/admin/od-requests' },
  { icon: FileSpreadsheet, label: 'Audit Logs', path: '/admin/audit-logs' },
  { icon: Settings, label: 'Settings', path: '/admin/settings' },
];

export function AdminLayout({ children }: AdminLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { toast } = useToast();

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
      <aside className="w-64 gradient-dark text-sidebar-foreground flex flex-col">
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="bg-white p-1.5 rounded-lg">
              <PaavaiLogo size="sm" />
            </div>
            <div>
              <h2 className="font-display font-semibold text-sm">Admin Portal</h2>
              <p className="text-xs text-sidebar-foreground/70">CSE Department</p>
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
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
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

        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-9 w-9 rounded-full bg-sidebar-primary flex items-center justify-center">
              <span className="text-sm font-medium text-sidebar-primary-foreground">A</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name || 'Administrator'}</p>
              <p className="text-xs text-sidebar-foreground/70 truncate">{user?.email}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-sidebar-foreground/80 hover:text-destructive hover:bg-destructive/10"
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
