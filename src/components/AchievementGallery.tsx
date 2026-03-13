import { useState, useEffect } from 'react';
import { Trophy, Calendar, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

interface ShowcaseAchievement {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  category: string;
  student_name: string | null;
  achievement_date: string;
}

export function AchievementGallery() {
  const [achievements, setAchievements] = useState<ShowcaseAchievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('showcase_achievements')
      .select('*')
      .eq('is_active', true)
      .order('achievement_date', { ascending: false })
      .limit(6)
      .then(({ data }) => {
        setAchievements((data as any as ShowcaseAchievement[]) || []);
        setLoading(false);
      });
  }, []);

  if (loading || achievements.length === 0) return null;

  const getImageUrl = (path: string | null) =>
    path ? `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/showcase-images/${path}` : null;

  const categoryColors: Record<string, string> = {
    Hackathon: 'bg-neon-cyan/20 text-neon-cyan border-neon-cyan/30',
    Placement: 'bg-green-500/20 text-green-400 border-green-500/30',
    Sports: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    Competition: 'bg-neon-purple/20 text-neon-purple border-neon-purple/30',
    Research: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    Department: 'bg-neon-pink/20 text-neon-pink border-neon-pink/30',
  };

  return (
    <section className="animate-slide-up" style={{ animationDelay: '400ms' }}>
      <div className="flex items-center gap-3 mb-5">
        <div className="h-8 w-1 rounded-full bg-gradient-to-b from-yellow-400 to-orange-500" />
        <Trophy className="h-5 w-5 text-yellow-400" />
        <h2 className="font-display text-xl font-semibold tracking-wider">Achievements</h2>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {achievements.map(a => {
          const imgUrl = getImageUrl(a.image_url);
          const colorClass = categoryColors[a.category] || 'bg-muted text-muted-foreground border-border';
          return (
            <div
              key={a.id}
              className="group relative rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden hover:border-primary/40 hover:shadow-[0_0_20px_hsl(var(--neon-cyan)/0.1)] transition-all duration-300"
            >
              {imgUrl ? (
                <div className="aspect-video overflow-hidden">
                  <img src={imgUrl} alt={a.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                </div>
              ) : (
                <div className="aspect-video bg-gradient-to-br from-primary/10 to-neon-purple/10 flex items-center justify-center">
                  <Trophy className="h-12 w-12 text-primary/30" />
                </div>
              )}
              <div className="p-4 space-y-2">
                <Badge variant="outline" className={`text-[10px] ${colorClass}`}>{a.category}</Badge>
                <h3 className="font-display text-sm font-semibold leading-tight line-clamp-2">{a.title}</h3>
                {a.description && <p className="text-xs text-muted-foreground line-clamp-2">{a.description}</p>}
                <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1">
                  {a.student_name && (
                    <span className="flex items-center gap-1"><User className="h-3 w-3" />{a.student_name}</span>
                  )}
                  <span className="flex items-center gap-1 ml-auto"><Calendar className="h-3 w-3" />{new Date(a.achievement_date).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
