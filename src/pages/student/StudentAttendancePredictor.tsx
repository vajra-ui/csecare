import { useEffect, useMemo, useState } from 'react';
import { StudentLayout } from '@/components/layouts/StudentLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, TrendingDown, Target } from 'lucide-react';

export default function StudentAttendancePredictor() {
  const { user } = useAuth();
  const [present, setPresent] = useState(0);
  const [total, setTotal] = useState(0);
  const [upcoming, setUpcoming] = useState(20);
  const [willAttend, setWillAttend] = useState(20);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;
      const { data: student } = await supabase.from('students').select('id').eq('user_id', authUser.id).single();
      if (!student) { setLoading(false); return; }
      const { data: att } = await supabase.from('attendance').select('is_present').eq('student_id', student.id);
      const rows = att || [];
      setTotal(rows.length);
      setPresent(rows.filter((r: any) => r.is_present).length);
      setLoading(false);
    })();
  }, [user]);

  const current = total > 0 ? (present / total) * 100 : 0;
  const predicted = useMemo(() => {
    const newTotal = total + upcoming;
    if (newTotal === 0) return 0;
    return ((present + willAttend) / newTotal) * 100;
  }, [present, total, upcoming, willAttend]);

  const need75 = useMemo(() => {
    // classes needed to attend consecutively to hit 75%
    if (current >= 75) return 0;
    // (present + x) / (total + x) >= 0.75  => x >= (0.75*total - present) / 0.25
    const x = Math.ceil((0.75 * total - present) / 0.25);
    return Math.max(0, x);
  }, [present, total, current]);

  const delta = predicted - current;
  const status = predicted >= 75 ? 'SAFE' : predicted >= 65 ? 'WARNING' : 'CRITICAL';
  const statusColor = status === 'SAFE' ? 'bg-emerald-500' : status === 'WARNING' ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <StudentLayout>
      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        <div>
          <h1 className="text-3xl font-display font-bold flex items-center gap-2"><Target className="w-8 h-8 text-primary" /> Attendance Predictor</h1>
          <p className="text-muted-foreground">Simulate future classes and see where you'll land.</p>
        </div>

        {loading ? (
          <Card><CardContent className="p-6">Loading attendance data…</CardContent></Card>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Current</CardTitle></CardHeader>
                <CardContent><div className="text-3xl font-bold">{current.toFixed(2)}%</div><div className="text-xs text-muted-foreground">{present} / {total} classes</div></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Predicted</CardTitle></CardHeader>
                <CardContent><div className="text-3xl font-bold">{predicted.toFixed(2)}%</div>
                  <div className="flex items-center gap-1 text-xs">
                    {delta >= 0 ? <TrendingUp className="w-3 h-3 text-emerald-500" /> : <TrendingDown className="w-3 h-3 text-red-500" />}
                    <span className={delta >= 0 ? 'text-emerald-500' : 'text-red-500'}>{delta >= 0 ? '+' : ''}{delta.toFixed(2)}%</span>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Status</CardTitle></CardHeader>
                <CardContent><Badge className={`${statusColor} text-white`}>{status}</Badge>
                  {need75 > 0 && <div className="text-xs mt-2 text-muted-foreground">Attend next {need75} classes to hit 75%</div>}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>What-If Simulator</CardTitle>
                <CardDescription>Adjust upcoming classes and how many you'll attend.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <div className="flex justify-between mb-2"><span className="text-sm">Upcoming classes</span><span className="text-sm font-semibold">{upcoming}</span></div>
                  <Slider value={[upcoming]} onValueChange={(v) => { setUpcoming(v[0]); setWillAttend(Math.min(willAttend, v[0])); }} min={0} max={100} step={1} />
                </div>
                <div>
                  <div className="flex justify-between mb-2"><span className="text-sm">Classes you will attend</span><span className="text-sm font-semibold">{willAttend} / {upcoming}</span></div>
                  <Slider value={[willAttend]} onValueChange={(v) => setWillAttend(v[0])} min={0} max={upcoming} step={1} />
                </div>
                <div>
                  <div className="flex justify-between mb-2"><span className="text-sm">Predicted attendance</span><span className="text-sm font-semibold">{predicted.toFixed(2)}%</span></div>
                  <Progress value={predicted} />
                  <div className="text-xs text-muted-foreground mt-2">Target: 75% for exam eligibility</div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </StudentLayout>
  );
}
