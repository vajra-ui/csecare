import { useState, useEffect } from 'react';
import { Upload, FileCheck, GraduationCap, BarChart3, Loader2 } from 'lucide-react';
import { COELayout } from '@/components/layouts/COELayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

export default function COEDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ total: 0, published: 0, unpublished: 0, students: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ count: total }, { count: published }, { count: students }] = await Promise.all([
        supabase.from('results').select('*', { count: 'exact', head: true }),
        supabase.from('results').select('*', { count: 'exact', head: true }).eq('is_published', true),
        supabase.from('students').select('*', { count: 'exact', head: true }),
      ]);
      setStats({
        total: total || 0,
        published: published || 0,
        unpublished: (total || 0) - (published || 0),
        students: students || 0,
      });
      setLoading(false);
    })();
  }, []);

  const cards = [
    { label: 'Total Results', value: stats.total, icon: BarChart3, color: 'text-neon-cyan' },
    { label: 'Published', value: stats.published, icon: FileCheck, color: 'text-green-500' },
    { label: 'Unpublished', value: stats.unpublished, icon: Upload, color: 'text-amber-500' },
    { label: 'Students', value: stats.students, icon: GraduationCap, color: 'text-neon-purple' },
  ];

  return (
    <COELayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold">COE Dashboard</h1>
          <p className="text-muted-foreground text-sm">Controller of Examinations — Result Management</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {cards.map((c) => (
                <Card key={c.label} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-muted ${c.color}`}><c.icon className="h-5 w-5" /></div>
                    <div>
                      <p className="text-2xl font-bold font-display">{c.value}</p>
                      <p className="text-xs text-muted-foreground">{c.label}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => navigate('/coe/upload')}>
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-primary/10"><Upload className="h-6 w-6 text-primary" /></div>
                  <div>
                    <h3 className="font-semibold">Upload Results</h3>
                    <p className="text-sm text-muted-foreground">Upload semester results for students</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => navigate('/coe/published')}>
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-green-500/10"><FileCheck className="h-6 w-6 text-green-500" /></div>
                  <div>
                    <h3 className="font-semibold">Published Results</h3>
                    <p className="text-sm text-muted-foreground">View and manage published results</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </COELayout>
  );
}
