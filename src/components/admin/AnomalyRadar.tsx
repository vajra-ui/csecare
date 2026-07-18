import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Radar, RefreshCw, Loader2, ShieldCheck } from 'lucide-react';

interface Anomaly {
  id: string; severity: 'HIGH' | 'MEDIUM' | 'LOW';
  category: string; title: string; detail: string;
  entity?: string; metric?: string;
}

const sevStyle = (s: string) =>
  s === 'HIGH' ? 'bg-destructive/20 text-destructive border-destructive/40'
    : s === 'MEDIUM' ? 'bg-warning/20 text-warning border-warning/40'
      : 'bg-muted/40 text-muted-foreground border-border';

export default function AnomalyRadar() {
  const [loading, setLoading] = useState(false);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [counts, setCounts] = useState({ high: 0, medium: 0, low: 0 });
  const [scannedAt, setScannedAt] = useState<string | null>(null);

  const scan = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('anomaly-radar', { body: {} });
      if (error) throw error;
      setAnomalies(data.anomalies || []);
      setCounts(data.counts || { high: 0, medium: 0, low: 0 });
      setScannedAt(data.generated_at);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { scan(); }, []);

  return (
    <div className="space-y-4">
      <Card className="futuristic-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Radar className="h-5 w-5 text-primary animate-pulse" /> Anomaly Radar
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              AI-assisted pattern detection across attendance, marks & audit trail
              {scannedAt && ` · scanned ${new Date(scannedAt).toLocaleTimeString()}`}
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={scan} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {(['HIGH','MEDIUM','LOW'] as const).map((s) => (
              <div key={s} className={`rounded-lg border p-3 text-center ${sevStyle(s)}`}>
                <p className="text-2xl font-bold">{counts[s.toLowerCase() as keyof typeof counts]}</p>
                <p className="text-[10px] uppercase tracking-wider">{s}</p>
              </div>
            ))}
          </div>
          {loading ? (
            <div className="py-10 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : anomalies.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">
              <ShieldCheck className="h-10 w-10 mx-auto mb-2 text-success opacity-60" />
              <p className="text-sm">All clear. No anomalies detected.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {anomalies.map((a) => (
                <div key={a.id} className="rounded-lg border border-border/60 bg-card/40 p-3 flex items-start gap-3">
                  <AlertTriangle className={`h-5 w-5 mt-0.5 ${a.severity === 'HIGH' ? 'text-destructive' : a.severity === 'MEDIUM' ? 'text-warning' : 'text-muted-foreground'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm">{a.title}</p>
                      <Badge variant="outline" className={sevStyle(a.severity)}>{a.severity}</Badge>
                      <Badge variant="outline" className="text-[10px]">{a.category}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{a.detail}</p>
                    {(a.entity || a.metric) && (
                      <p className="text-[11px] mt-1.5 text-muted-foreground/80">
                        {a.entity && <span className="mr-3">🎯 {a.entity}</span>}
                        {a.metric && <span>📊 {a.metric}</span>}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
