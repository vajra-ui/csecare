import { useEffect, useState } from 'react';
import { FacultyLayout } from '@/components/layouts/FacultyLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Shield, CheckCircle2, Clock } from 'lucide-react';

export default function TutorComplaints() {
  const { toast } = useToast();
  const [complaints, setComplaints] = useState<any[]>([]);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    // Only fetch fields safe to show — deliberately omit student_id to reinforce anonymity in the UI
    const { data } = await supabase
      .from('anonymous_complaints')
      .select('id, section, category, message, status, tutor_response, resolved_at, created_at')
      .order('created_at', { ascending: false });
    setComplaints(data || []);
    setLoading(false);
  };

  const respond = async (id: string, resolve: boolean) => {
    const text = responses[id]?.trim();
    if (!text && resolve) { toast({ title: 'Please write a response before resolving.', variant: 'destructive' }); return; }
    const { error } = await supabase.from('anonymous_complaints').update({
      tutor_response: text || null,
      status: resolve ? 'resolved' : 'in_progress',
      resolved_at: resolve ? new Date().toISOString() : null,
    }).eq('id', id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: resolve ? 'Marked resolved' : 'Response saved' });
    setResponses(r => ({ ...r, [id]: '' }));
    load();
  };

  return (
    <FacultyLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Shield className="h-7 w-7 text-primary" /> Anonymous Complaints
          </h1>
          <p className="text-muted-foreground text-sm">From students in your section. Identities are never shown.</p>
        </div>

        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!loading && complaints.length === 0 && <p className="text-sm text-muted-foreground">No complaints yet.</p>}

        <div className="space-y-3">
          {complaints.map(c => (
            <Card key={c.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{c.category}</Badge>
                    <Badge variant="secondary">Section {c.section}</Badge>
                    <Badge className={c.status === 'resolved' ? 'bg-green-500/20 text-green-600' : c.status === 'in_progress' ? 'bg-blue-500/20 text-blue-600' : 'bg-yellow-500/20 text-yellow-600'}>
                      {c.status === 'resolved' ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <Clock className="h-3 w-3 mr-1" />}
                      {c.status}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleString()}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm bg-muted/50 p-3 rounded">{c.message}</p>
                {c.tutor_response && (
                  <div className="bg-primary/5 border-l-2 border-primary p-3 rounded">
                    <p className="text-xs font-semibold text-primary mb-1">Your Response</p>
                    <p className="text-sm">{c.tutor_response}</p>
                  </div>
                )}
                {c.status !== 'resolved' && (
                  <div className="space-y-2">
                    <Textarea rows={2} placeholder="Write a supportive response…" value={responses[c.id] || ''} onChange={e => setResponses(r => ({ ...r, [c.id]: e.target.value }))} />
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" size="sm" onClick={() => respond(c.id, false)}>Save Response</Button>
                      <Button size="sm" onClick={() => respond(c.id, true)}>Mark Resolved</Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </FacultyLayout>
  );
}
