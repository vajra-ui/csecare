import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Gauge, Loader2, Scale } from 'lucide-react';

interface FacultyLoad {
  id: string; name: string; faculty_id: string; is_tutor: boolean;
  weeklyHours: number; substitutions: number; mentees: number;
  pendingCorrections: number; loadScore: number; level: 'LOW'|'BALANCED'|'HIGH'|'OVERLOAD';
}

const levelColor = (l: string) =>
  l === 'OVERLOAD' ? 'bg-destructive/20 text-destructive border-destructive/40'
    : l === 'HIGH' ? 'bg-warning/20 text-warning border-warning/40'
      : l === 'BALANCED' ? 'bg-success/20 text-success border-success/40'
        : 'bg-muted/30 text-muted-foreground border-border';

const barColor = (l: string) =>
  l === 'OVERLOAD' ? 'bg-destructive' : l === 'HIGH' ? 'bg-warning' : l === 'BALANCED' ? 'bg-success' : 'bg-muted-foreground';

export default function FacultyLoadBalancer() {
  const [loading, setLoading] = useState(true);
  const [loads, setLoads] = useState<FacultyLoad[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
        const facRes: any = await supabase.from('faculty').select('id, name, faculty_id, is_tutor, section');
        const ttRes: any = await supabase.from('timetable').select('faculty_id');
        const subRes: any = await supabase.from('substitute_allocations').select('substitute_faculty_id, date').gte('date', weekAgo);
        const menRes: any = await supabase.from('students').select('tutor_id');
        const assignRes: any = await supabase.from('assignments').select('id, faculty_id');
        const submRes: any = await supabase.from('assignment_submissions').select('assignment_id, status').eq('status', 'submitted');
        const faculty = facRes.data ?? [];
        const tt = ttRes.data ?? [];
        const subs = subRes.data ?? [];
        const mentees = menRes.data ?? [];
        const assignmentMap = new Map((assignRes.data ?? []).map((a: any) => [a.id, a.faculty_id]));
        const pending = submRes.data ?? [];

        const rows: FacultyLoad[] = faculty.map((f: any) => {
          const hours = tt.filter((t: any) => t.faculty_id === f.id).length;
          const substitutions = subs.filter((s: any) => s.substitute_faculty_id === f.id).length;
          const menteeCount = mentees.filter((m: any) => m.tutor_id === f.id).length;
          const pendingCorr = pending.filter((p: any) => assignmentMap.get(p.assignment_id) === f.id).length;
          const loadScore = hours * 1.0 + substitutions * 1.5 + Math.min(menteeCount, 40) * 0.2 + pendingCorr * 0.3;
          let level: FacultyLoad['level'] = 'LOW';
          if (loadScore >= 30) level = 'OVERLOAD';
          else if (loadScore >= 20) level = 'HIGH';
          else if (loadScore >= 8) level = 'BALANCED';
          return {
            id: f.id, name: f.name, faculty_id: f.faculty_id, is_tutor: f.is_tutor,
            weeklyHours: hours, substitutions, mentees: menteeCount,
            pendingCorrections: pendingCorr, loadScore: Math.round(loadScore * 10) / 10, level,
          };
        }).sort((a, b) => b.loadScore - a.loadScore);
        setLoads(rows);
      } catch (e) { console.error(e); }
      setLoading(false);
    })();
  }, []);

  const max = useMemo(() => Math.max(1, ...loads.map(l => l.loadScore)), [loads]);
  const summary = useMemo(() => ({
    overload: loads.filter(l => l.level === 'OVERLOAD').length,
    high: loads.filter(l => l.level === 'HIGH').length,
    balanced: loads.filter(l => l.level === 'BALANCED').length,
    low: loads.filter(l => l.level === 'LOW').length,
  }), [loads]);

  return (
    <Card className="futuristic-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Scale className="h-5 w-5 text-primary" /> Faculty Load Balancer
        </CardTitle>
        <p className="text-xs text-muted-foreground">Weekly workload heatmap · hours + substitutions + mentees + pending corrections</p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="py-10 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : (
          <>
            <div className="grid grid-cols-4 gap-2 mb-4">
              {[['Overload', summary.overload, 'OVERLOAD'], ['High', summary.high, 'HIGH'], ['Balanced', summary.balanced, 'BALANCED'], ['Low', summary.low, 'LOW']].map(([label, val, lv]: any) => (
                <div key={label} className={`rounded-lg border p-2 text-center ${levelColor(lv)}`}>
                  <p className="text-xl font-bold">{val}</p>
                  <p className="text-[10px] uppercase tracking-wider">{label}</p>
                </div>
              ))}
            </div>
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {loads.map(l => (
                <div key={l.id} className="rounded-lg border border-border/60 bg-card/30 p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <Gauge className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <p className="font-medium text-sm truncate">{l.name}</p>
                      <span className="text-[11px] text-muted-foreground">{l.faculty_id}</span>
                      {l.is_tutor && <Badge variant="outline" className="text-[10px]">Tutor</Badge>}
                    </div>
                    <Badge variant="outline" className={levelColor(l.level)}>{l.level} · {l.loadScore}</Badge>
                  </div>
                  <div className="h-1.5 w-full rounded bg-muted/40 overflow-hidden">
                    <div className={`h-full ${barColor(l.level)}`} style={{ width: `${(l.loadScore / max) * 100}%` }} />
                  </div>
                  <div className="flex gap-4 mt-1.5 text-[11px] text-muted-foreground">
                    <span>🕒 {l.weeklyHours}h/wk</span>
                    <span>🔁 {l.substitutions} subs</span>
                    <span>👥 {l.mentees} mentees</span>
                    <span>📝 {l.pendingCorrections} pending</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
