import { useState } from 'react';
import { StudentLayout } from '@/components/layouts/StudentLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Compass, Sparkles, Loader2 } from 'lucide-react';

interface Track {
  name: string;
  fitScore: number;
  rationale: string;
  skillGaps: string[];
  next90Days: string[];
  roles: string[];
}

export default function StudentCareerPath() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [tracks, setTracks] = useState<Track[]>([]);

  const analyze = async () => {
    setLoading(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error('Not signed in');
      const { data: s } = await supabase.from('students').select('*').eq('user_id', authUser.id).single();
      if (!s) throw new Error('Student profile not found');

      const [{ data: ar }, { data: ss }, { data: ach }, { data: act }] = await Promise.all([
        supabase.from('academic_records').select('semester, cgpa').eq('student_id', s.id).order('semester'),
        supabase.from('subject_scores').select('subject, internal_marks').eq('student_id', s.id),
        supabase.from('student_achievements').select('title, category').eq('student_id', s.id),
        supabase.from('student_activities').select('title, activity_type').eq('student_id', s.id),
      ]);

      const summary = `Name: ${s.full_name}
Year: ${s.year}, Section: ${s.section}
CGPA history: ${(ar || []).map((r: any) => `Sem${r.semester}:${r.cgpa}`).join(', ') || 'N/A'}
Subject internals: ${(ss || []).map((r: any) => `${r.subject}:${r.internal_marks}`).join(', ') || 'N/A'}
Achievements: ${(ach || []).map((r: any) => `${r.title} (${r.category || ''})`).join('; ') || 'None'}
Activities: ${(act || []).map((r: any) => `${r.title} (${r.activity_type || ''})`).join('; ') || 'None'}`;

      const { data, error } = await supabase.functions.invoke('career-path-simulator', { body: { studentSummary: summary } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setTracks(data?.tracks || []);
    } catch (e: any) {
      toast({ title: 'Analysis failed', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <StudentLayout>
      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold flex items-center gap-2"><Compass className="w-8 h-8 text-primary" /> Career Path Simulator</h1>
            <p className="text-muted-foreground">AI matches you to career tracks based on your academic profile.</p>
          </div>
          <Button onClick={analyze} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
            {loading ? 'Analyzing…' : tracks.length > 0 ? 'Re-analyze' : 'Analyze My Profile'}
          </Button>
        </div>

        {tracks.length === 0 && !loading && (
          <Card><CardContent className="p-8 text-center text-muted-foreground">
            Click "Analyze My Profile" to get personalized career track recommendations.
          </CardContent></Card>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tracks.map((t, i) => (
            <Card key={i} className="border-primary/20">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{t.name}</CardTitle>
                  <Badge className="bg-primary">{t.fitScore}% fit</Badge>
                </div>
                <Progress value={t.fitScore} className="mt-2" />
                <CardDescription className="pt-2">{t.rationale}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <div className="font-semibold mb-1">Roles</div>
                  <div className="flex flex-wrap gap-1">{t.roles?.map((r) => <Badge key={r} variant="secondary">{r}</Badge>)}</div>
                </div>
                <div>
                  <div className="font-semibold mb-1">Skill gaps</div>
                  <ul className="list-disc pl-5 text-muted-foreground">{t.skillGaps?.map((g) => <li key={g}>{g}</li>)}</ul>
                </div>
                <div>
                  <div className="font-semibold mb-1">Next 90 days</div>
                  <ul className="list-disc pl-5 text-muted-foreground">{t.next90Days?.map((n) => <li key={n}>{n}</li>)}</ul>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </StudentLayout>
  );
}
