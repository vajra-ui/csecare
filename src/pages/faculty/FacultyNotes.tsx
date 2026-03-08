import { useState, useEffect } from 'react';
import { FacultyLayout } from '@/components/layouts/FacultyLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Upload, FileText, Trash2, Plus, Download } from 'lucide-react';

export default function FacultyNotes() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [facultyDbId, setFacultyDbId] = useState('');
  const [notes, setNotes] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', subject: '', section: '', file: null as File | null });

  useEffect(() => {
    if (user?.facultyId) init();
  }, [user]);

  const init = async () => {
    const { data: faculty } = await supabase.from('faculty').select('id, current_subjects').eq('faculty_id', user?.facultyId).single();
    if (!faculty) return;
    setFacultyDbId(faculty.id);
    setSubjects(faculty.current_subjects || []);
    fetchNotes(faculty.id);
  };

  const fetchNotes = async (fid: string) => {
    const { data } = await supabase.from('class_notes').select('*').eq('faculty_id', fid).order('created_at', { ascending: false });
    setNotes(data || []);
  };

  const handleUpload = async () => {
    if (!form.title || !form.subject || !form.section || !form.file) {
      toast({ title: 'Missing fields', description: 'Please fill all required fields.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const ext = form.file.name.split('.').pop();
      const path = `notes/${facultyDbId}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('student-documents').upload(path, form.file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('student-documents').getPublicUrl(path);
      await supabase.from('class_notes').insert({
        faculty_id: facultyDbId, title: form.title, description: form.description,
        subject: form.subject, section: form.section as any, file_url: publicUrl, file_name: form.file.name,
      });
      toast({ title: 'Uploaded', description: 'Class notes shared successfully.' });
      setOpen(false);
      setForm({ title: '', description: '', subject: '', section: '', file: null });
      fetchNotes(facultyDbId);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
    setLoading(false);
  };

  const deleteNote = async (id: string) => {
    await supabase.from('class_notes').delete().eq('id', id);
    toast({ title: 'Deleted' });
    fetchNotes(facultyDbId);
  };

  return (
    <FacultyLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl md:text-3xl font-bold">Class Notes & Materials</h1>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> Share Notes</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Upload Class Notes</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <Input placeholder="Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                <Textarea placeholder="Description (optional)" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                <div className="grid grid-cols-2 gap-4">
                  <Select value={form.subject} onValueChange={v => setForm({ ...form, subject: v })}>
                    <SelectTrigger><SelectValue placeholder="Subject" /></SelectTrigger>
                    <SelectContent>{subjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={form.section} onValueChange={v => setForm({ ...form, section: v })}>
                    <SelectTrigger><SelectValue placeholder="Section" /></SelectTrigger>
                    <SelectContent>{['CSE A','CSE B','CSE C','CSE D'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <Input type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.zip" onChange={e => setForm({ ...form, file: e.target.files?.[0] || null })} />
                <Button onClick={handleUpload} disabled={loading} className="w-full">
                  <Upload className="h-4 w-4 mr-2" /> {loading ? 'Uploading...' : 'Upload'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {notes.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">No notes shared yet. Click "Share Notes" to upload study materials.</CardContent></Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {notes.map(note => (
              <Card key={note.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{note.title}</CardTitle>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteNote(note.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {note.description && <p className="text-sm text-muted-foreground mb-3">{note.description}</p>}
                  <div className="flex flex-wrap gap-2 mb-3">
                    <Badge variant="secondary">{note.subject}</Badge>
                    <Badge variant="outline">{note.section}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{new Date(note.created_at).toLocaleDateString('en-IN')}</span>
                    <Button variant="outline" size="sm" asChild>
                      <a href={note.file_url} target="_blank" rel="noreferrer"><Download className="h-3 w-3 mr-1" /> {note.file_name}</a>
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
