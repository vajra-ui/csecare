import { useState, useEffect } from 'react';
import { StudentLayout } from '@/components/layouts/StudentLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Trophy, Award, Download, FileText, Sparkles } from 'lucide-react';
import { downloadCSV } from '@/lib/csvExport';
import { generatePortfolioPDF } from '@/lib/pdfReports';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';


export default function StudentAchievements() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [achievements, setAchievements] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', category: 'academic', description: '', date: '', file: null as File | null });

  useEffect(() => { if (user?.studentId) fetchAchievements(); }, [user]);

  const fetchAchievements = async () => {
    const { data } = await supabase.from('student_achievements').select('*').eq('student_id', user!.studentId!).order('date', { ascending: false });
    setAchievements(data || []);
  };

  const addAchievement = async () => {
    if (!form.title || !form.date) { toast({ title: 'Fill required fields', variant: 'destructive' }); return; }
    setLoading(true);
    try {
      let certUrl = null;
      if (form.file) {
        const ext = form.file.name.split('.').pop();
        const path = `achievements/${user!.studentId}/${Date.now()}.${ext}`;
        const { error } = await supabase.storage.from('student-documents').upload(path, form.file);
        if (error) throw error;
        certUrl = path;
      }
      const { error: insertError } = await supabase.from('student_achievements').insert({
        student_id: user!.studentId!, title: form.title, category: form.category,
        description: form.description || null, date: form.date, certificate_url: certUrl,
      });
      if (insertError) throw insertError;
      toast({ title: 'Added', description: 'Achievement recorded!' });
      setOpen(false);
      setForm({ title: '', category: 'academic', description: '', date: '', file: null });
      fetchAchievements();
    } catch (e: any) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
    setLoading(false);
  };

  const handleDownload = () => {
    downloadCSV(achievements.map(a => ({
      Title: a.title,
      Category: a.category,
      Date: new Date(a.date).toLocaleDateString(),
      Description: a.description || '',
      Verified: a.verified ? 'Yes' : 'No',
    })), 'my-achievements');
  };

  const handlePortfolioPDF = async () => {
    // Fetch student info + latest CGPA + activities in parallel
    const [{ data: s }, { data: cg }, { data: acts }] = await Promise.all([
      supabase.from('students').select('name, roll_number, register_number, section, year').eq('id', user!.studentId!).single(),
      supabase.from('academic_records').select('cgpa').eq('student_id', user!.studentId!).order('semester', { ascending: false }).limit(1),
      supabase.from('student_activities').select('title, category, event_date, status').eq('student_id', user!.studentId!).order('event_date', { ascending: false }),
    ]);
    if (!s) { toast({ title: 'Could not load profile', variant: 'destructive' }); return; }
    generatePortfolioPDF({
      studentName: s.name,
      rollNumber: s.roll_number,
      registerNumber: s.register_number,
      section: s.section,
      year: s.year,
      email: user?.email,
      cgpa: cg?.[0]?.cgpa ?? null,
      achievements: achievements.map(a => ({
        title: a.title, category: a.category, date: a.date, description: a.description, verified: !!a.verified,
      })),
      activities: (acts || []) as any,
    });
    toast({ title: '📄 Portfolio ready', description: 'Your resume-style PDF is downloading.' });
  };

  // Group achievements by year (from student admission → now) for timeline
  const timelineGroups = achievements.reduce((acc: Record<string, any[]>, a) => {
    const yr = new Date(a.date).getFullYear().toString();
    (acc[yr] = acc[yr] || []).push(a);
    return acc;
  }, {});
  const timelineYears = Object.keys(timelineGroups).sort();


  const categoryIcons: Record<string, string> = { academic: '📚', sports: '🏆', cultural: '🎭', technical: '💻', other: '⭐' };
  const categoryColors: Record<string, string> = {
    academic: 'bg-primary/10 text-primary', sports: 'bg-green-500/10 text-green-700',
    cultural: 'bg-purple-500/10 text-purple-700', technical: 'bg-blue-500/10 text-blue-700', other: 'bg-secondary text-secondary-foreground',
  };

  return (
    <StudentLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl md:text-3xl font-bold">Achievement Portfolio</h1>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={handleDownload} disabled={achievements.length === 0}>
              <Download className="h-4 w-4 mr-1" /> CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handlePortfolioPDF} disabled={achievements.length === 0}>
              <FileText className="h-4 w-4 mr-1" /> Portfolio PDF
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> Add</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Achievement</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <Input placeholder="Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                  <div className="grid grid-cols-2 gap-4">
                    <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="academic">Academic</SelectItem>
                        <SelectItem value="sports">Sports</SelectItem>
                        <SelectItem value="cultural">Cultural</SelectItem>
                        <SelectItem value="technical">Technical</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                  </div>
                  <Textarea placeholder="Description (optional)" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                  <div>
                    <label className="text-sm text-muted-foreground">Certificate (optional)</label>
                    <Input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => setForm({ ...form, file: e.target.files?.[0] || null })} />
                  </div>
                  <Button onClick={addAchievement} disabled={loading} className="w-full">{loading ? 'Saving...' : 'Save Achievement'}</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card><CardContent className="pt-6 text-center"><p className="text-2xl font-bold">{achievements.length}</p><p className="text-xs text-muted-foreground">Total</p></CardContent></Card>
          <Card><CardContent className="pt-6 text-center"><p className="text-2xl font-bold">{achievements.filter(a => a.verified).length}</p><p className="text-xs text-muted-foreground">Verified</p></CardContent></Card>
          <Card><CardContent className="pt-6 text-center"><p className="text-2xl font-bold">{new Set(achievements.map(a => a.category)).size}</p><p className="text-xs text-muted-foreground">Categories</p></CardContent></Card>
        </div>

        {achievements.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">
            <Trophy className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p>No achievements yet. Start building your portfolio!</p>
          </CardContent></Card>
        ) : (
          <Tabs defaultValue="grid" className="w-full">
            <TabsList>
              <TabsTrigger value="grid"><Trophy className="h-4 w-4 mr-1" /> Grid</TabsTrigger>
              <TabsTrigger value="timeline"><Sparkles className="h-4 w-4 mr-1" /> Growth Timeline</TabsTrigger>
            </TabsList>
            <TabsContent value="grid" className="mt-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {achievements.map(a => (
                  <Card key={a.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-3">
                        <span className="text-2xl">{categoryIcons[a.category] || '⭐'}</span>
                        <div className="flex gap-2">
                          <Badge className={categoryColors[a.category] || ''} variant="outline">{a.category}</Badge>
                          {a.verified && <Badge variant="secondary" className="text-green-700">✓ Verified</Badge>}
                        </div>
                      </div>
                      <h3 className="font-semibold mb-1">{a.title}</h3>
                      {a.description && <p className="text-sm text-muted-foreground mb-2">{a.description}</p>}
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-xs text-muted-foreground">{new Date(a.date).toLocaleDateString('en-IN')}</span>
                        {a.certificate_url && (
                          <Button variant="outline" size="sm" onClick={async () => {
                            const { data } = await supabase.storage.from('student-documents').createSignedUrl(a.certificate_url, 3600);
                            if (data?.signedUrl) window.open(data.signedUrl, '_blank');
                          }}>
                            <Award className="h-3 w-3 mr-1" /> View Cert
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
            <TabsContent value="timeline" className="mt-4">
              <div className="relative pl-8 border-l-2 border-primary/30 space-y-8">
                {timelineYears.map(yr => (
                  <div key={yr} className="relative">
                    <div className="absolute -left-[41px] top-0 w-6 h-6 rounded-full bg-primary flex items-center justify-center ring-4 ring-background">
                      <Sparkles className="h-3 w-3 text-primary-foreground" />
                    </div>
                    <h3 className="font-display text-xl font-bold text-primary mb-3">{yr}</h3>
                    <div className="space-y-3">
                      {timelineGroups[yr].map(a => (
                        <Card key={a.id} className="hover:shadow-md transition">
                          <CardContent className="pt-4 pb-4">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-3">
                                <span className="text-xl">{categoryIcons[a.category] || '⭐'}</span>
                                <div>
                                  <p className="font-semibold">{a.title}</p>
                                  {a.description && <p className="text-xs text-muted-foreground mt-1">{a.description}</p>}
                                  <p className="text-xs text-muted-foreground mt-1">{new Date(a.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</p>
                                </div>
                              </div>
                              {a.verified && <Badge variant="secondary" className="text-green-700">✓</Badge>}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        )}

      </div>
    </StudentLayout>
  );
}
