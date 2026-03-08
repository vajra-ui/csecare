import { ReactNode, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Users, GraduationCap, Megaphone, Settings, LogOut, LayoutDashboard,
  FileSpreadsheet, ClipboardList, BarChart3, Moon, Sun, FileText, Brain,
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

interface AdminLayoutProps {
  children: ReactNode;
}

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
  { icon: BarChart3, label: 'Analytics', path: '/admin/analytics' },
  { icon: GraduationCap, label: 'Students', path: '/admin/students' },
  { icon: Users, label: 'Faculty', path: '/admin/faculty' },
  { icon: Megaphone, label: 'Announcements', path: '/admin/announcements' },
  { icon: ClipboardList, label: 'OD Requests', path: '/admin/od-requests' },
  { icon: FileSpreadsheet, label: 'Audit Logs', path: '/admin/audit-logs' },
  { icon: FileText, label: 'Reports', path: '/admin/reports' },
  { icon: Settings, label: 'Settings', path: '/admin/settings' },
];

export function AdminLayout({ children }: AdminLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const [adminRole, setAdminRole] = useState('Admin');

  useEffect(() => {
    const stored = localStorage.getItem('admin_view_role');
    if (stored) setAdminRole(stored);
  }, []);

  const handleLogout = async () => {
    localStorage.removeItem('admin_view_role');
    await logout();
    toast({ title: 'Logged out', description: 'You have been successfully logged out.' });
    navigate('/');
  };

  const sidebarContent = (
    <aside className="h-full gradient-dark text-sidebar-foreground flex flex-col">
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="bg-white p-1.5 rounded-lg">
            <PaavaiLogo size="sm" />
          </div>
          <div>
            <h2 className="font-display font-semibold text-sm">{adminRole} Portal</h2>
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
            <span className="text-sm font-medium text-sidebar-primary-foreground">{adminRole.charAt(0)}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{adminRole}</p>
            <p className="text-xs text-sidebar-foreground/70 truncate">{user?.email}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="text-sidebar-foreground/80 hover:text-sidebar-foreground"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>
          <Button
            variant="ghost"
            className="flex-1 justify-start gap-3 text-sidebar-foreground/80 hover:text-destructive hover:bg-destructive/10"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
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
        <div className="p-4 md:p-6">{children}</div>
      </main>
    </div>
  );
}
