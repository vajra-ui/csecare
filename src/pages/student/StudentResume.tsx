import { useEffect, useState } from 'react';
import { StudentLayout } from '@/components/layouts/StudentLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Download, FileText, Printer } from 'lucide-react';

export default function StudentResume() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [cgpa, setCgpa] = useState<number | null>(null);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;
      const { data: s } = await supabase.from('students').select('*').eq('user_id', authUser.id).single();
      if (!s) { setLoading(false); return; }
      setProfile(s);
      const [{ data: ar }, { data: ach }, { data: act }] = await Promise.all([
        supabase.from('academic_records').select('semester, cgpa').eq('student_id', s.id).order('semester', { ascending: false }).limit(1),
        supabase.from('student_achievements').select('*').eq('student_id', s.id).order('achieved_on', { ascending: false }),
        supabase.from('student_activities').select('*').eq('student_id', s.id).order('created_at', { ascending: false }),
      ]);
      if (ar && ar[0]) setCgpa(Number(ar[0].cgpa));
      setAchievements(ach || []);
      setActivities(act || []);
      setLoading(false);
    })();
  }, [user]);

  const handlePrint = () => window.print();

  if (loading) return <StudentLayout><div className="p-6">Loading…</div></StudentLayout>;
  if (!profile) return <StudentLayout><div className="p-6">No profile found.</div></StudentLayout>;

  return (
    <StudentLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between print:hidden">
          <div>
            <h1 className="text-3xl font-display font-bold flex items-center gap-2"><FileText className="w-8 h-8 text-primary" /> Auto Resume</h1>
            <p className="text-muted-foreground">Auto-built from your profile, marks, achievements & activities.</p>
          </div>
          <Button onClick={handlePrint}><Printer className="w-4 h-4 mr-2" /> Print / Save PDF</Button>
        </div>

        <Card className="print:shadow-none print:border-none">
          <CardContent className="p-8 space-y-6" id="resume-body">
            <header className="border-b pb-4">
              <h2 className="text-3xl font-bold">{profile.name}</h2>
              <p className="text-sm text-muted-foreground">
                {profile.register_number} · CSE · Year {profile.year} · Section {profile.section}
              </p>
              <p className="text-sm">Roll No: {profile.roll_number}</p>
            </header>

            <section>
              <h3 className="text-lg font-semibold mb-2">Objective</h3>
              <p className="text-sm">
                Motivated Computer Science undergraduate at Paavai Engineering College seeking opportunities to apply strong academic
                foundations{cgpa ? ` (CGPA ${cgpa.toFixed(2)})` : ''} and hands-on project experience in a challenging engineering role.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-2">Education</h3>
              <div className="text-sm">
                <div className="font-medium">B.E. Computer Science and Engineering</div>
                <div>Paavai Engineering College · {profile.admission_year || ''}</div>
                {cgpa && <div>CGPA: <span className="font-semibold">{cgpa.toFixed(2)}</span> / 10</div>}
              </div>
            </section>

            {achievements.length > 0 && (
              <section>
                <h3 className="text-lg font-semibold mb-2">Achievements</h3>
                <ul className="list-disc pl-5 text-sm space-y-1">
                  {achievements.map((a) => (
                    <li key={a.id}>
                      <span className="font-medium">{a.title}</span>
                      {a.category ? ` — ${a.category}` : ''}{a.achieved_on ? ` (${new Date(a.achieved_on).toLocaleDateString()})` : ''}
                      {a.description ? <div className="text-muted-foreground">{a.description}</div> : null}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {activities.length > 0 && (
              <section>
                <h3 className="text-lg font-semibold mb-2">Activities & Participation</h3>
                <ul className="list-disc pl-5 text-sm space-y-1">
                  {activities.map((a) => (
                    <li key={a.id}>
                      <span className="font-medium">{a.title}</span>
                      {a.activity_type ? ` — ${a.activity_type}` : ''}
                      {a.description ? <div className="text-muted-foreground">{a.description}</div> : null}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section>
              <h3 className="text-lg font-semibold mb-2">Core Skills</h3>
              <div className="flex flex-wrap gap-2">
                {['Data Structures', 'Algorithms', 'DBMS', 'OS', 'Computer Networks', 'OOP', 'Web Development'].map((s) => (
                  <Badge key={s} variant="secondary">{s}</Badge>
                ))}
              </div>
            </section>
          </CardContent>
        </Card>
      </div>
      <style>{`@media print { body { background: white; } @page { margin: 12mm; } }`}</style>
    </StudentLayout>
  );
}
