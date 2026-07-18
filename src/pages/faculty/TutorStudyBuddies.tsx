import { useEffect, useState } from 'react';
import { FacultyLayout } from '@/components/layouts/FacultyLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Users, Sparkles, ArrowRight } from 'lucide-react';

export default function TutorStudyBuddies() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [pairs, setPairs] = useState<any[]>([]);
  const [studentsMap, setStudentsMap] = useState<Record<string, any>>({});
  const [sections, setSections] = useState<string[]>([]);
  const [section, setSection] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { init(); }, [user]);

  const init = async () => {
    if (!user) return;
    const { data: fac } = await supabase.from('faculty').select('section, sections, is_tutor').eq('user_id', user.id).single();
    if (!fac) return;
    const all = new Set<string>();
    if (fac.section) all.add(fac.section);
    (fac.sections || []).forEach((s: string) => all.add(s));
    const arr = Array.from(all);
    setSections(arr);
    if (arr[0]) { setSection(arr[0]); loadPairs(arr[0]); }
  };

  const loadPairs = async (sec: string) => {
    setLoading(true);
    const { data } = await supabase.from('study_buddy_pairs').select('*').eq('section', sec as any).order('match_score', { ascending: false });
    setPairs(data || []);
    const ids = [...new Set((data || []).flatMap((p: any) => [p.student_a, p.student_b]))];
    if (ids.length) {
      const { data: sts } = await supabase.from('students').select('id, name, roll_number').in('id', ids);
      const m: Record<string, any> = {};
      (sts || []).forEach((s: any) => { m[s.id] = s; });
      setStudentsMap(m);
    }
    setLoading(false);
  };

  const generate = async () => {
    if (!section) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('study-buddy-matcher', { body: { section } });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      toast({ title: 'Pairs generated', description: `${data.pairs} pair(s) created for ${section}` });
      loadPairs(section);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
    setLoading(false);
  };

  return (
    <FacultyLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold flex items-center gap-2">
              <Users className="h-7 w-7 text-primary" /> Study Buddy Matcher
            </h1>
            <p className="text-muted-foreground text-sm">AI-paired students with complementary strengths.</p>
          </div>
          <div className="flex gap-2">
            {sections.map(s => (
              <Button key={s} size="sm" variant={s === section ? 'default' : 'outline'} onClick={() => { setSection(s); loadPairs(s); }}>{s}</Button>
            ))}
            <Button onClick={generate} disabled={loading || !section}>
              <Sparkles className="h-4 w-4 mr-2" />{loading ? 'Generating…' : 'Regenerate'}
            </Button>
          </div>
        </div>

        {pairs.length === 0 && !loading && (
          <Card><CardContent className="py-12 text-center text-muted-foreground">No pairs yet. Click Regenerate to create AI-matched study buddies.</CardContent></Card>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          {pairs.map(p => {
            const a = studentsMap[p.student_a]; const b = studentsMap[p.student_b];
            return (
              <Card key={p.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      {a?.name || '—'} <ArrowRight className="h-4 w-4 text-muted-foreground" /> {b?.name || '—'}
                    </CardTitle>
                    <Badge>{p.match_score}% match</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{a?.roll_number} & {b?.roll_number}</p>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm text-muted-foreground">{p.reasoning}</p>
                  {Array.isArray(p.complementary_subjects) && p.complementary_subjects.length > 0 && (
                    <div className="space-y-1">
                      {p.complementary_subjects.slice(0, 4).map((c: any, i: number) => (
                        <div key={i} className="text-xs flex items-center gap-2 bg-muted/50 rounded p-2">
                          <Badge variant="outline" className="text-[10px]">{c.subject}</Badge>
                          <span className="text-green-600">{c.stronger} helps</span>
                          <ArrowRight className="h-3 w-3" />
                          <span className="text-orange-600">{c.weaker}</span>
                          <span className="ml-auto text-muted-foreground">gap {c.gap}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </FacultyLayout>
  );
}
