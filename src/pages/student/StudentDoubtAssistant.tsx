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
import { Sparkles, Send, BookOpen } from 'lucide-react';

export default function StudentDoubtAssistant() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [subject, setSubject] = useState('');
  const [subjects, setSubjects] = useState<string[]>([]);
  const [section, setSection] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [notesUsed, setNotesUsed] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (user?.studentId) init(); }, [user]);

  const init = async () => {
    const { data: student } = await supabase.from('students').select('section').eq('id', user!.studentId!).single();
    if (!student) return;
    setSection(student.section);
    const { data: tt } = await supabase.from('timetable').select('subject').eq('section', student.section as any);
    setSubjects([...new Set((tt || []).map((t: any) => t.subject))]);
  };

  const ask = async () => {
    if (!question.trim() || !subject) { toast({ title: 'Pick a subject and enter your doubt.', variant: 'destructive' }); return; }
    setLoading(true); setAnswer('');
    try {
      const { data, error } = await supabase.functions.invoke('ai-doubt-assistant', {
        body: { question, subject, section },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      setAnswer(data.answer); setNotesUsed(data.notesUsed || 0);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
    setLoading(false);
  };

  return (
    <StudentLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Sparkles className="h-7 w-7 text-primary" /> AI Doubt Assistant
          </h1>
          <p className="text-muted-foreground text-sm">Ask any subject doubt — answers grounded in your faculty's class notes.</p>
        </div>

        <Card>
          <CardHeader><CardTitle>Ask a Doubt</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Select value={subject} onValueChange={setSubject}>
              <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
              <SelectContent>{subjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
            <Textarea rows={4} value={question} onChange={e => setQuestion(e.target.value)} placeholder="e.g. Explain hashing collisions with an example" />
            <Button onClick={ask} disabled={loading} className="w-full">
              <Send className="h-4 w-4 mr-2" />{loading ? 'Thinking…' : 'Ask AI'}
            </Button>
          </CardContent>
        </Card>

        {answer && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                Answer
                <Badge variant="outline" className="ml-auto"><BookOpen className="h-3 w-3 mr-1" /> {notesUsed} notes referenced</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">{answer}</div>
            </CardContent>
          </Card>
        )}
      </div>
    </StudentLayout>
  );
}
