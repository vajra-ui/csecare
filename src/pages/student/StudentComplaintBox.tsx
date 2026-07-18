import { useEffect, useState } from 'react';
import { StudentLayout } from '@/components/layouts/StudentLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Shield, Send, CheckCircle2, Clock } from 'lucide-react';

const CATEGORIES = ['Teaching Concern', 'Peer Issue', 'Facility', 'Mental Health', 'Harassment', 'Other'];

export default function StudentComplaintBox() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [category, setCategory] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [mine, setMine] = useState<any[]>([]);
  const [section, setSection] = useState('');

  useEffect(() => { if (user?.studentId) load(); }, [user]);

  const load = async () => {
    const { data: student } = await supabase.from('students').select('section').eq('id', user!.studentId!).single();
    if (student) setSection(student.section);
    const { data } = await supabase.from('anonymous_complaints').select('*').eq('student_id', user!.studentId!).order('created_at', { ascending: false });
    setMine(data || []);
  };

  const submit = async () => {
    if (!category || message.trim().length < 10) {
      toast({ title: 'Please choose a category and write at least 10 characters.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    const { error } = await supabase.from('anonymous_complaints').insert({
      student_id: user!.studentId!, section: section as any, category, message: message.trim(),
    });
    setLoading(false);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Submitted anonymously', description: 'Your tutor sees the message but never your identity.' });
    setMessage(''); setCategory('');
    load();
  };

  return (
    <StudentLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Shield className="h-7 w-7 text-primary" /> Anonymous Complaint Box
          </h1>
          <p className="text-muted-foreground text-sm">Speak up safely — your tutor receives the message, never your name.</p>
        </div>

        <Card>
          <CardHeader><CardTitle>New Complaint</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
            <Textarea rows={5} value={message} onChange={e => setMessage(e.target.value)} placeholder="Describe the situation. Your identity will not be shown to the tutor." maxLength={2000} />
            <div className="flex justify-between items-center">
              <p className="text-xs text-muted-foreground">🔒 Fully anonymous to your tutor.</p>
              <Button onClick={submit} disabled={loading}><Send className="h-4 w-4 mr-2" />{loading ? 'Sending…' : 'Send Anonymously'}</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">My Complaints & Responses</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {mine.length === 0 && <p className="text-sm text-muted-foreground">No complaints yet.</p>}
            {mine.map(c => (
              <div key={c.id} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{c.category}</Badge>
                    <Badge className={c.status === 'resolved' ? 'bg-green-500/20 text-green-600' : 'bg-yellow-500/20 text-yellow-600'}>
                      {c.status === 'resolved' ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <Clock className="h-3 w-3 mr-1" />}
                      {c.status}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</span>
                </div>
                <p className="text-sm">{c.message}</p>
                {c.tutor_response && (
                  <div className="bg-primary/5 border-l-2 border-primary p-3 rounded">
                    <p className="text-xs font-semibold text-primary mb-1">Tutor Response</p>
                    <p className="text-sm">{c.tutor_response}</p>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </StudentLayout>
  );
}
