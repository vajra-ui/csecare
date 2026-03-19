import { useState, useEffect } from 'react';
import { StudentLayout } from '@/components/layouts/StudentLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Activity, Upload, CheckCircle, Clock, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { downloadCSV } from '@/lib/csvExport';

const categories = [
  { value: 'course', label: 'Course Completed' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'hackathon', label: 'Hackathon' },
  { value: 'seminar', label: 'Seminar' },
  { value: 'internship', label: 'Internship' },
  { value: 'project', label: 'Project' },
  { value: 'other', label: 'Other' },
];

const statusIcons: Record<string, any> = {
  pending: { icon: Clock, color: 'bg-warning/20 text-warning border-warning/30' },
  verified: { icon: CheckCircle, color: 'bg-success/20 text-success border-success/30' },
  rejected: { icon: XCircle, color: 'bg-destructive/20 text-destructive border-destructive/30' },
};

export default function StudentActivities() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<any[]>([]);
  const [studentId, setStudentId] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ title: '', category: 'course', description: '', event_date: '', proof_url: '', proof_file_name: '' });

  useEffect(() => { init(); }, []);

  const init = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;
    const { data: student } = await supabase.from('students').select('id').eq('user_id', authUser.id).single();
    if (!student) { setLoading(false); return; }
    setStudentId(student.id);
    fetchActivities(student.id);
  };

  const fetchActivities = async (sid: string) => {
    const { data } = await supabase.from('student_activities').select('*').eq('student_id', sid).order('created_at', { ascending: false });
    setActivities(data || []);
    setLoading(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const path = `activities/${studentId}/${Date.now()}_${file.name}`;
      const { error } = await supabase.storage.from('student-documents').upload(path, file);
      if (error) throw error;
      setForm(f => ({ ...f, proof_url: path, proof_file_name: file.name }));
      toast({ title: 'Uploaded', description: 'Proof file uploaded successfully.' });
    } catch (e: any) {
      toast({ title: 'Upload Failed', description: e.message, variant: 'destructive' });
    }
    setUploading(false);
  };

  const handleSubmit = async () => {
    if (!form.title || !form.event_date) {
      toast({ title: 'Error', description: 'Title and event date are required.', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from('student_activities').insert({
        student_id: studentId,
        title: form.title,
        category: form.category,
        description: form.description,
        event_date: form.event_date,
        proof_url: form.proof_url || null,
        proof_file_name: form.proof_file_name || null,
      });
      if (error) throw error;
      toast({ title: 'Activity Posted', description: 'Your activity has been submitted for review.' });
      setForm({ title: '', category: 'course', description: '', event_date: '', proof_url: '', proof_file_name: '' });
      setDialogOpen(false);
      fetchActivities(studentId);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
    setSubmitting(false);
  };

  const exportActivities = () => {
    downloadCSV(activities.map(a => ({
      Title: a.title, Category: a.category, Date: a.event_date,
      Description: a.description || '', Status: a.status,
    })), 'my_activities');
  };

  if (loading) return <StudentLayout><div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div></StudentLayout>;

  return (
    <StudentLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold flex items-center gap-2">
              <Activity className="h-7 w-7 text-primary" /> My Activities
            </h1>
            <p className="text-muted-foreground text-sm">Track courses, workshops, hackathons & more</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportActivities} disabled={activities.length === 0}>Export CSV</Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" /> Post Activity</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle className="font-display">Post New Activity</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <Input placeholder="Event / Activity Name *" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                  <div className="grid grid-cols-2 gap-4">
                    <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {categories.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input type="date" value={form.event_date} onChange={e => setForm(f => ({ ...f, event_date: e.target.value }))} />
                  </div>
                  <Textarea placeholder="Description..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                  <div>
                    <label className="text-sm font-medium mb-2 block">Proof Upload (Certificate/Screenshot)</label>
                    <Input type="file" accept="image/*,.pdf" onChange={handleFileUpload} disabled={uploading} />
                    {form.proof_file_name && <p className="text-xs text-success mt-1">✓ {form.proof_file_name}</p>}
                  </div>
                  <Button onClick={handleSubmit} disabled={submitting} className="w-full">
                    {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                    Submit Activity
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="futuristic-card"><CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold">{activities.length}</p>
            <p className="text-xs text-muted-foreground">Total Activities</p>
          </CardContent></Card>
          <Card className="futuristic-card"><CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold text-success">{activities.filter(a => a.status === 'verified').length}</p>
            <p className="text-xs text-muted-foreground">Verified</p>
          </CardContent></Card>
          <Card className="futuristic-card"><CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold text-warning">{activities.filter(a => a.status === 'pending').length}</p>
            <p className="text-xs text-muted-foreground">Pending Review</p>
          </CardContent></Card>
        </div>

        {/* Activities List */}
        {activities.length === 0 ? (
          <Card className="futuristic-card"><CardContent className="py-12 text-center text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No activities posted yet. Start by posting your first activity!</p>
          </CardContent></Card>
        ) : (
          <div className="space-y-3">
            {activities.map(a => {
              const si = statusIcons[a.status] || statusIcons.pending;
              const Icon = si.icon;
              return (
                <Card key={a.id} className="futuristic-card hover:shadow-lg transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <Badge className={si.color}><Icon className="h-3 w-3 mr-1" />{a.status}</Badge>
                          <Badge variant="outline" className="capitalize">{a.category}</Badge>
                          <span className="text-xs text-muted-foreground">{format(new Date(a.event_date), 'MMM dd, yyyy')}</span>
                        </div>
                        <h3 className="font-semibold">{a.title}</h3>
                        {a.description && <p className="text-sm text-muted-foreground mt-1">{a.description}</p>}
                        {a.proof_file_name && <p className="text-xs text-primary mt-2">📎 {a.proof_file_name}</p>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </StudentLayout>
  );
}
