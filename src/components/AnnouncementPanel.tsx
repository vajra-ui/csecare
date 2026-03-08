import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Bell, AlertTriangle, Info, Megaphone, Sparkles } from 'lucide-react';
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
    borderColor: 'border-neon-cyan/20',
    bgColor: 'bg-neon-cyan/5',
    textClass: 'text-neon-cyan',
    dotColor: 'bg-neon-cyan',
  },
  important: {
    icon: Bell,
    borderColor: 'border-warning/20',
    bgColor: 'bg-warning/5',
    textClass: 'text-warning',
    dotColor: 'bg-warning',
  },
  urgent: {
    icon: AlertTriangle,
    borderColor: 'border-destructive/20',
    bgColor: 'bg-destructive/5',
    textClass: 'text-destructive',
    dotColor: 'bg-destructive',
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

  return (
    <div className="futuristic-card neon-border overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border/50" style={{ background: 'linear-gradient(135deg, hsl(var(--neon-cyan) / 0.05), hsl(var(--neon-purple) / 0.05))' }}>
        <div className="flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-neon-cyan" />
          <h3 className="font-display font-semibold text-sm tracking-wider">Announcements</h3>
          {announcements.length > 0 && (
            <Badge variant="outline" className="ml-auto border-neon-cyan/30 text-neon-cyan text-xs font-body">
              {announcements.length}
            </Badge>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-16 bg-muted/30 animate-pulse rounded-lg" />
            ))}
          </div>
        ) : announcements.length === 0 ? (
          <div className="text-center py-10">
            <Sparkles className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
            <p className="text-muted-foreground text-xs font-body">
              No announcements at this time.
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[300px] pr-2">
            <div className="space-y-2.5">
              {announcements.map((announcement, i) => {
                const config = priorityConfig[announcement.priority];
                const Icon = config.icon;

                return (
                  <div
                    key={announcement.id}
                    className={`p-3 rounded-lg border ${config.borderColor} ${config.bgColor} transition-all hover:shadow-sm animate-slide-up`}
                    style={{ animationDelay: `${i * 60}ms` }}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5 flex-shrink-0">
                        <div className={`h-2 w-2 rounded-full ${config.dotColor} animate-pulse-subtle`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h4 className="font-body font-medium text-sm truncate">
                            {announcement.title}
                          </h4>
                          {announcement.priority === 'urgent' && (
                            <Badge variant="destructive" className="text-[10px] px-1.5 py-0 font-body">
                              URGENT
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground font-body line-clamp-2 leading-relaxed">
                          {announcement.description}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}
