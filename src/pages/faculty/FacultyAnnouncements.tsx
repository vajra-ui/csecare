import { useState, useEffect } from 'react';
import { FacultyLayout } from '@/components/layouts/FacultyLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Megaphone, Plus, Calendar } from 'lucide-react';
import { format } from 'date-fns';

export default function FacultyAnnouncements() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', priority: 'info' as const,
    target_audience: 'students' as const,
    start_date: new Date().toISOString().split('T')[0],
    expiry_date: '',
  });

  useEffect(() => { fetchAnnouncements(); }, []);

  const fetchAnnouncements = async () => {
    const { data } = await supabase.from('announcements').select('*').order('created_at', { ascending: false }).limit(50);
    setAnnouncements(data || []);
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!form.title || !form.description || !form.expiry_date) {
      toast({ title: 'Missing fields', description: 'Title, description, and expiry date are required.', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from('announcements').insert({
        title: form.title,
        description: form.description,
        priority: form.priority,
        target_audience: form.target_audience,
        start_date: new Date(form.start_date).toISOString(),
        expiry_date: new Date(form.expiry_date).toISOString(),
      });
      if (error) throw error;
      toast({ title: 'Posted!', description: 'Announcement published successfully.' });
      setDialogOpen(false);
      setForm({ title: '', description: '', priority: 'info', target_audience: 'students', start_date: new Date().toISOString().split('T')[0], expiry_date: '' });
      fetchAnnouncements();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
    setSubmitting(false);
  };

  const priorityColor = (p: string) => {
    if (p === 'urgent') return 'bg-destructive/20 text-destructive border-destructive/30';
    if (p === 'important') return 'bg-warning/20 text-warning border-warning/30';
    return 'bg-primary/20 text-primary border-primary/30';
  };

  if (loading) return <FacultyLayout><div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div></FacultyLayout>;

  return (
    <FacultyLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold flex items-center gap-2">
              <Megaphone className="h-7 w-7 text-primary" /> Announcements
            </h1>
            <p className="text-muted-foreground text-sm">Post hackathons, workshops & events</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" /> Post Announcement</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle className="font-display">New Announcement</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <Input placeholder="Title *" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                <Textarea placeholder="Description *" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={4} />
                <div className="grid grid-cols-2 gap-4">
                  <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v as any }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">Info</SelectItem>
                      <SelectItem value="important">Important</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={form.target_audience} onValueChange={v => setForm(f => ({ ...f, target_audience: v as any }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="students">Students</SelectItem>
                      <SelectItem value="faculty">Faculty</SelectItem>
                      <SelectItem value="all">All</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="text-sm text-muted-foreground">Start Date</label>
                    <Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
                  </div>
                  <div><label className="text-sm text-muted-foreground">Expiry Date *</label>
                    <Input type="date" value={form.expiry_date} onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))} />
                  </div>
                </div>
                <Button onClick={handleSubmit} disabled={submitting} className="w-full">
                  {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Publish Announcement
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {announcements.length === 0 ? (
          <Card className="futuristic-card"><CardContent className="py-12 text-center text-muted-foreground">
            <Megaphone className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No announcements yet.</p>
          </CardContent></Card>
        ) : (
          <div className="space-y-3">
            {announcements.map(a => (
              <Card key={a.id} className="futuristic-card">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <Badge className={priorityColor(a.priority)} variant="outline">{a.priority}</Badge>
                        <Badge variant="outline" className="capitalize">{a.target_audience}</Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(a.start_date), 'MMM dd')} - {format(new Date(a.expiry_date), 'MMM dd, yyyy')}
                        </span>
                      </div>
                      <h3 className="font-semibold">{a.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{a.description}</p>
                    </div>
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
