import { useState, useEffect } from 'react';
import { Trophy, Plus, Loader2, Calendar, Tag, Trash2, ExternalLink } from 'lucide-react';
import { FacultyLayout } from '@/components/layouts/FacultyLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

const categories = [
  { value: 'research', label: 'Research Paper' },
  { value: 'patent', label: 'Patent' },
  { value: 'conference', label: 'Conference' },
  { value: 'award', label: 'Award' },
  { value: 'workshop', label: 'Workshop/FDP' },
  { value: 'book', label: 'Book/Chapter' },
  { value: 'other', label: 'Other' },
];

const categoryColors: Record<string, string> = {
  research: 'bg-info/20 text-info border-info/30',
  patent: 'bg-warning/20 text-warning border-warning/30',
  conference: 'bg-neon-purple/20 text-neon-purple border-neon-purple/30',
  award: 'bg-secondary/20 text-secondary border-secondary/30',
  workshop: 'bg-neon-cyan/20 text-neon-cyan border-neon-cyan/30',
  book: 'bg-success/20 text-success border-success/30',
  other: 'bg-muted text-muted-foreground border-border',
};

export default function FacultyAchievements() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [facultyId, setFacultyId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '', category: 'research', description: '', date: '', certificate_url: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const { data: faculty } = await supabase.from('faculty').select('id').eq('user_id', authUser.id).single();
      if (!faculty) return;
      setFacultyId(faculty.id);

      const { data } = await supabase
        .from('faculty_achievements')
        .select('*')
        .eq('faculty_id', faculty.id)
        .order('date', { ascending: false });

      setAchievements(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!facultyId || !form.title || !form.date) {
      toast({ title: 'Error', description: 'Title and date are required', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from('faculty_achievements').insert({
        faculty_id: facultyId,
        title: form.title,
        category: form.category,
        description: form.description || null,
        date: form.date,
        certificate_url: form.certificate_url || null,
      });
      if (error) throw error;
      toast({ title: 'Achievement Added', description: 'Your achievement has been recorded.' });
      setForm({ title: '', category: 'research', description: '', date: '', certificate_url: '' });
      setDialogOpen(false);
      fetchData();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to add achievement', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('faculty_achievements').delete().eq('id', id);
    if (!error) {
      toast({ title: 'Deleted', description: 'Achievement removed.' });
      fetchData();
    }
  };

  if (loading) {
    return (
      <FacultyLayout>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </FacultyLayout>
    );
  }

  return (
    <FacultyLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold flex items-center gap-2">
              <Trophy className="h-7 w-7 text-secondary" />
              My Achievements
            </h1>
            <p className="text-muted-foreground text-sm">{achievements.length} achievements recorded</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" /> Add Achievement</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-display">Add Achievement</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Title *</Label>
                  <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Research paper title, award name..." />
                </div>
                <div>
                  <Label>Category</Label>
                  <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {categories.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Date *</Label>
                  <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Details about the achievement..." />
                </div>
                <div>
                  <Label>Certificate/Link URL</Label>
                  <Input value={form.certificate_url} onChange={e => setForm(f => ({ ...f, certificate_url: e.target.value }))} placeholder="https://..." />
                </div>
                <Button onClick={handleSubmit} disabled={submitting} className="w-full">
                  {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Add Achievement
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {achievements.length === 0 ? (
          <Card className="futuristic-card">
            <CardContent className="py-12 text-center text-muted-foreground">
              <Trophy className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No achievements recorded yet. Start adding your research, patents, and awards!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {achievements.map(a => (
              <Card key={a.id} className="futuristic-card">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={categoryColors[a.category] || categoryColors.other}>
                          {categories.find(c => c.value === a.category)?.label || a.category}
                        </Badge>
                        {a.verified && <Badge className="bg-success/20 text-success border-success/30">Verified</Badge>}
                      </div>
                      <h3 className="font-semibold text-sm mb-1 line-clamp-2">{a.title}</h3>
                      {a.description && <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{a.description}</p>}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{format(new Date(a.date), 'MMM dd, yyyy')}</span>
                        {a.certificate_url && (
                          <a href={a.certificate_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-info hover:underline">
                            <ExternalLink className="h-3 w-3" /> Link
                          </a>
                        )}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(a.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </FacultyLayout>
  );
}
