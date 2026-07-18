import { useEffect, useState } from 'react';
import { StudentLayout } from '@/components/layouts/StudentLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { GraduationCap, Send, Search } from 'lucide-react';

export default function StudentMentorship() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [alumni, setAlumni] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<any | null>(null);
  const [topic, setTopic] = useState('');
  const [message, setMessage] = useState('');

  const load = async () => {
    const { data: al } = await supabase.from('alumni').select('*').order('graduation_year', { ascending: false });
    setAlumni(al || []);
    if (user?.studentId) {
      const { data: reqs } = await supabase.from('mentorship_requests').select('*, alumni(name, company, role)').eq('student_id', user.studentId).order('created_at', { ascending: false });
      setRequests(reqs || []);
    }
  };

  useEffect(() => { load(); }, [user]);

  const send = async () => {
    if (!selected || !topic || !message || !user?.studentId) return;
    const { error } = await supabase.from('mentorship_requests').insert({
      student_id: user.studentId, alumni_id: selected.id, topic, message,
    });
    if (error) { toast({ title: 'Failed', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Request sent', description: `${selected.name} will be notified.` });
    setSelected(null); setTopic(''); setMessage('');
    load();
  };

  const filtered = alumni.filter(a =>
    !q || `${a.name} ${a.company} ${a.role}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <StudentLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><GraduationCap className="text-neon-purple" /> Alumni Mentorship</h1>
          <p className="text-muted-foreground">Connect with alumni for career guidance, interview prep, and domain advice.</p>
        </div>

        {requests.length > 0 && (
          <Card>
            <CardHeader><CardTitle>Your Requests</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {requests.map(r => (
                <div key={r.id} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{r.alumni?.name} — {r.topic}</div>
                    <Badge variant={r.status === 'accepted' ? 'default' : r.status === 'declined' ? 'destructive' : 'secondary'}>{r.status}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">{r.alumni?.role} @ {r.alumni?.company}</div>
                  {r.alumni_response && <p className="text-sm mt-2 p-2 bg-muted rounded">{r.alumni_response}</p>}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Find a Mentor</CardTitle>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-8" placeholder="Search by name, company, role…" value={q} onChange={e => setQ(e.target.value)} />
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map(a => (
              <div key={a.id} className="border rounded-lg p-4 space-y-2">
                <div className="font-semibold">{a.name}</div>
                <div className="text-sm text-muted-foreground">{a.role || 'Alumni'} @ {a.company || '—'}</div>
                <div className="text-xs text-muted-foreground">Batch {a.graduation_year}</div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" className="w-full" onClick={() => setSelected(a)}>Request Mentorship</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Request {a.name}</DialogTitle></DialogHeader>
                    <div className="space-y-3">
                      <Input placeholder="Topic (e.g. Interview at Google)" value={topic} onChange={e => setTopic(e.target.value)} />
                      <Textarea placeholder="Your message" rows={5} value={message} onChange={e => setMessage(e.target.value)} />
                      <Button onClick={send} className="w-full"><Send className="mr-2 h-4 w-4" /> Send Request</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            ))}
            {filtered.length === 0 && <p className="text-muted-foreground text-sm">No alumni found.</p>}
          </CardContent>
        </Card>
      </div>
    </StudentLayout>
  );
}
