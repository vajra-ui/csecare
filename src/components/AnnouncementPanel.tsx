import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Bell, AlertTriangle, Info, Megaphone } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Announcement {
  id: string;
  title: string;
  description: string;
  priority: 'info' | 'important' | 'urgent';
  target_audience: 'all' | 'faculty' | 'students';
  start_date: string;
  expiry_date: string;
}

const priorityConfig = {
  info: {
    icon: Info,
    bgClass: 'bg-info/10 border-info/20',
    textClass: 'text-info',
    badgeVariant: 'secondary' as const,
  },
  important: {
    icon: Bell,
    bgClass: 'bg-warning/10 border-warning/20',
    textClass: 'text-warning',
    badgeVariant: 'secondary' as const,
  },
  urgent: {
    icon: AlertTriangle,
    bgClass: 'bg-destructive/10 border-destructive/20',
    textClass: 'text-destructive',
    badgeVariant: 'destructive' as const,
  },
};

export function AnnouncementPanel() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('is_active', true)
        .lte('start_date', new Date().toISOString())
        .gt('expiry_date', new Date().toISOString())
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Sort to put urgent first
      const sorted = (data || []).sort((a, b) => {
        const priorityOrder = { urgent: 0, important: 1, info: 2 };
        return priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder];
      });
      
      setAnnouncements(sorted as Announcement[]);
    } catch (error) {
      console.error('Error fetching announcements:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-lg border bg-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Megaphone className="h-5 w-5 text-primary" />
          <h3 className="font-display font-semibold text-lg">Announcements</h3>
        </div>
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (announcements.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Megaphone className="h-5 w-5 text-primary" />
          <h3 className="font-display font-semibold text-lg">Announcements</h3>
        </div>
        <p className="text-muted-foreground text-sm text-center py-8">
          No announcements at this time.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="flex items-center gap-2 mb-4">
        <Megaphone className="h-5 w-5 text-primary" />
        <h3 className="font-display font-semibold text-lg">Announcements</h3>
        <Badge variant="outline" className="ml-auto">
          {announcements.length}
        </Badge>
      </div>
      <ScrollArea className="h-[300px] pr-4">
        <div className="space-y-3">
          {announcements.map((announcement) => {
            const config = priorityConfig[announcement.priority];
            const Icon = config.icon;

            return (
              <div
                key={announcement.id}
                className={`p-4 rounded-lg border ${config.bgClass} transition-all hover:shadow-sm`}
              >
                <div className="flex items-start gap-3">
                  <Icon className={`h-5 w-5 mt-0.5 ${config.textClass}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-sm truncate">
                        {announcement.title}
                      </h4>
                      {announcement.priority === 'urgent' && (
                        <Badge variant={config.badgeVariant} className="text-xs">
                          URGENT
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {announcement.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
