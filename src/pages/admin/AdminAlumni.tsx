import { useState, useEffect } from 'react';
import { GraduationCap, Loader2, Plus, Pencil, Trash2, Search, Linkedin, MapPin, Building2 } from 'lucide-react';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Alumni {
  id: string;
  name: string;
  graduation_year: number;
  company: string | null;
  role: string | null;
  location: string | null;
  linkedin: string | null;
  email: string | null;
  created_at: string;
}

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 20 }, (_, i) => currentYear - i);

const emptyForm = { name: '', graduation_year: currentYear, company: '', role: '', location: '', linkedin: '', email: '' };

export default function AdminAlumni() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [alumni, setAlumni] = useState<Alumni[]>([]);
  const [search, setSearch] = useState('');
  const [filterYear, setFilterYear] = useState<string>('all');
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<Alumni | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => { fetchAlumni(); }, []);

  const fetchAlumni = async () => {
    const { data } = await supabase.from('alumni').select('*').order('graduation_year', { ascending: false });
    setAlumni((data as any as Alumni[]) || []);
    setLoading(false);
  };

  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowDialog(true); };
  const openEdit = (a: Alumni) => {
    setEditing(a);
    setForm({ name: a.name, graduation_year: a.graduation_year, company: a.company || '', role: a.role || '', location: a.location || '', linkedin: a.linkedin || '', email: a.email || '' });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.name) { toast({ title: 'Name required', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      const payload = { name: form.name, graduation_year: form.graduation_year, company: form.company || null, role: form.role || null, location: form.location || null, linkedin: form.linkedin || null, email: form.email || null };
      if (editing) {
        const { error } = await supabase.from('alumni').update(payload as any).eq('id', editing.id);
        if (error) throw error;
        toast({ title: 'Updated' });
      } else {
        const { error } = await supabase.from('alumni').insert(payload as any);
        if (error) throw error;
        toast({ title: 'Alumni added' });
      }
      setShowDialog(false);
      fetchAlumni();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('alumni').delete().eq('id', id);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Deleted' }); fetchAlumni(); }
  };

  const filtered = alumni.filter(a => {
    const matchSearch = !search || a.name.toLowerCase().includes(search.toLowerCase()) || (a.company || '').toLowerCase().includes(search.toLowerCase());
    const matchYear = filterYear === 'all' || a.graduation_year === parseInt(filterYear);
    return matchSearch && matchYear;
  });

  if (loading) return <AdminLayout><div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold flex items-center gap-2">
              <GraduationCap className="h-7 w-7 text-primary" /> Alumni Network
            </h1>
            <p className="text-muted-foreground text-sm">{alumni.length} alumni records</p>
          </div>
          <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" /> Add Alumni</Button>
        </div>

        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search by name or company..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={filterYear} onValueChange={setFilterYear}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Filter year" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              {YEARS.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {filtered.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">No alumni found.</CardContent></Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map(a => (
              <Card key={a.id} className="group hover:border-primary/50 transition-colors">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{a.name}</CardTitle>
                      <Badge variant="secondary" className="mt-1 text-xs">Batch {a.graduation_year}</Badge>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(a)}><Pencil className="h-3 w-3" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(a.id)}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-1.5 text-sm">
                  {a.role && a.company && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Building2 className="h-3.5 w-3.5 shrink-0" /> {a.role} at {a.company}
                    </div>
                  )}
                  {a.location && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 shrink-0" /> {a.location}
                    </div>
                  )}
                  {a.linkedin && (
                    <a href={a.linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary hover:underline">
                      <Linkedin className="h-3.5 w-3.5 shrink-0" /> LinkedIn
                    </a>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit Alumni' : 'Add Alumni'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div><Label>Graduation Year *</Label>
              <Select value={String(form.graduation_year)} onValueChange={v => setForm(f => ({ ...f, graduation_year: parseInt(v) }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{YEARS.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Company</Label><Input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} /></div>
              <div><Label>Role</Label><Input value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} /></div>
            </div>
            <div><Label>Location</Label><Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} /></div>
            <div><Label>LinkedIn URL</Label><Input value={form.linkedin} onChange={e => setForm(f => ({ ...f, linkedin: e.target.value }))} /></div>
            <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}{editing ? 'Update' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
