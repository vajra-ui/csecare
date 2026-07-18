import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { GraduationCap, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AlumniMentorshipInbox() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<any[]>([]);
  const [responses, setResponses] = useState<Record<string, string>>({});

  const load = async () => {
    const { data } = await supabase
      .from('mentorship_requests')
      .select('*, students(name, roll_number, section, year)')
      .order('created_at', { ascending: false });
    setRequests(data || []);
  };
  useEffect(() => { load(); }, []);

  const act = async (id: string, status: 'accepted' | 'declined' | 'completed') => {
    const patch: any = { status, responded_at: new Date().toISOString() };
    if (responses[id]) patch.alumni_response = responses[id];
    const { error } = await supabase.from('mentorship_requests').update(patch).eq('id', id);
    if (error) { toast({ title: 'Failed', description: error.message, variant: 'destructive' }); return; }
    toast({ title: `Request ${status}` });
    load();
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2"><GraduationCap /> Mentorship Inbox</h1>
            <p className="text-muted-foreground">Signed in as {user?.email}</p>
          </div>
          <Button variant="outline" onClick={async () => { await logout(); navigate('/'); }}><LogOut className="h-4 w-4 mr-2" /> Logout</Button>
        </div>

        {requests.length === 0 && <Card><CardContent className="p-6 text-muted-foreground">No mentorship requests yet.</CardContent></Card>}

        {requests.map(r => (
          <Card key={r.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <span>{r.students?.name} ({r.students?.roll_number}) — {r.topic}</span>
                <Badge variant={r.status === 'accepted' ? 'default' : r.status === 'declined' ? 'destructive' : 'secondary'}>{r.status}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm">{r.message}</p>
              <div className="text-xs text-muted-foreground">Section {r.students?.section} • Year {r.students?.year}</div>
              {r.status === 'pending' && (
                <>
                  <Textarea placeholder="Optional reply to student…" value={responses[r.id] || ''} onChange={e => setResponses(prev => ({ ...prev, [r.id]: e.target.value }))} />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => act(r.id, 'accepted')}>Accept</Button>
                    <Button size="sm" variant="destructive" onClick={() => act(r.id, 'declined')}>Decline</Button>
                  </div>
                </>
              )}
              {r.status === 'accepted' && (
                <Button size="sm" variant="outline" onClick={() => act(r.id, 'completed')}>Mark completed</Button>
              )}
              {r.alumni_response && <p className="text-sm p-2 bg-muted rounded">You replied: {r.alumni_response}</p>}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
