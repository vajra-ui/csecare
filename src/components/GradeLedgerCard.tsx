import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, ShieldCheck, History } from 'lucide-react';

interface Props { studentId?: string; limit?: number; showTitle?: boolean; }
interface Entry {
  id: string; subject: string | null; field: string;
  old_value: string | null; new_value: string | null;
  action: string; created_at: string; student_id: string | null;
}

export default function GradeLedgerCard({ studentId, limit = 25, showTitle = true }: Props) {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<Entry[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      let q = supabase.from('grade_audit').select('*').order('created_at', { ascending: false }).limit(limit);
      if (studentId) q = q.eq('student_id', studentId);
      const { data, error } = await q;
      if (!error) setEntries(data ?? []);
      setLoading(false);
    })();
  }, [studentId, limit]);

  return (
    <Card className="futuristic-card">
      {showTitle && (
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShieldCheck className="h-5 w-5 text-success" /> Immutable Grade Ledger
          </CardTitle>
          <p className="text-xs text-muted-foreground">Every marks/CGPA change is permanently logged. Cannot be edited or deleted.</p>
        </CardHeader>
      )}
      <CardContent>
        {loading ? (
          <div className="py-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : entries.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            <History className="h-8 w-8 mx-auto mb-2 opacity-40" />
            No grade changes recorded.
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {entries.map(e => (
              <div key={e.id} className="rounded-md border border-border/60 bg-card/30 p-2.5 text-xs">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-medium">{e.subject || '—'} · {e.field}</span>
                  <Badge variant="outline" className={
                    e.action === 'DELETE' ? 'bg-destructive/15 text-destructive border-destructive/30'
                      : e.action === 'UPDATE' ? 'bg-warning/15 text-warning border-warning/30'
                        : 'bg-success/15 text-success border-success/30'
                  }>{e.action}</Badge>
                </div>
                <div className="text-muted-foreground">
                  <span className="line-through opacity-70">{e.old_value ?? '∅'}</span>
                  <span className="mx-2">→</span>
                  <span className="text-foreground font-medium">{e.new_value ?? '∅'}</span>
                </div>
                <p className="text-[10px] text-muted-foreground/70 mt-1">{new Date(e.created_at).toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
