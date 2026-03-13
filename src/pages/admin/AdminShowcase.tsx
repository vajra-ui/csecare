import { useState, useEffect, useRef } from 'react';
import { Trophy, Loader2, Plus, Pencil, Trash2, Upload, Image as ImageIcon } from 'lucide-react';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ShowcaseAchievement {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  category: string;
  student_name: string | null;
  achievement_date: string;
  is_active: boolean;
  created_at: string;
}

const CATEGORIES = ['Hackathon', 'Placement', 'Sports', 'Competition', 'Research', 'Department', 'General'];
const emptyForm = { title: '', description: '', category: 'General', student_name: '', achievement_date: new Date().toISOString().split('T')[0], is_active: true };

export default function AdminShowcase() {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ShowcaseAchievement[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<ShowcaseAchievement | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => { fetchItems(); }, []);

  const fetchItems = async () => {
    const { data } = await supabase.from('showcase_achievements').select('*').order('achievement_date', { ascending: false });
    setItems((data as any as ShowcaseAchievement[]) || []);
    setLoading(false);
  };

  const openCreate = () => {
    setEditing(null); setForm(emptyForm); setImageFile(null); setImagePreview(null); setShowDialog(true);
  };

  const openEdit = (item: ShowcaseAchievement) => {
    setEditing(item);
    setForm({ title: item.title, description: item.description || '', category: item.category, student_name: item.student_name || '', achievement_date: item.achievement_date, is_active: item.is_active });
    setImageFile(null);
    setImagePreview(item.image_url ? `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/showcase-images/${item.image_url}` : null);
    setShowDialog(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast({ title: 'Max 5MB', variant: 'destructive' }); return; }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!form.title) { toast({ title: 'Title required', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      let image_url = editing?.image_url || null;

      if (imageFile) {
        const ext = imageFile.name.split('.').pop();
        const path = `${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from('showcase-images').upload(path, imageFile);
        if (upErr) throw upErr;
        image_url = path;
      }

      const payload = {
        title: form.title,
        description: form.description || null,
        category: form.category,
        student_name: form.student_name || null,
        achievement_date: form.achievement_date,
        is_active: form.is_active,
        image_url,
      };

      if (editing) {
        const { error } = await supabase.from('showcase_achievements').update(payload as any).eq('id', editing.id);
        if (error) throw error;
        toast({ title: 'Updated' });
      } else {
        const { error } = await supabase.from('showcase_achievements').insert(payload as any);
        if (error) throw error;
        toast({ title: 'Achievement posted' });
      }
      setShowDialog(false);
      fetchItems();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const handleDelete = async (item: ShowcaseAchievement) => {
    if (item.image_url) await supabase.storage.from('showcase-images').remove([item.image_url]);
    const { error } = await supabase.from('showcase_achievements').delete().eq('id', item.id);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Deleted' }); fetchItems(); }
  };

  const getImageUrl = (path: string | null) =>
    path ? `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/showcase-images/${path}` : null;

  if (loading) return <AdminLayout><div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold flex items-center gap-2">
              <Trophy className="h-7 w-7 text-primary" /> Achievement Showcase
            </h1>
            <p className="text-muted-foreground text-sm">Manage front page achievements</p>
          </div>
          <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" /> New Achievement</Button>
        </div>

        {items.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">No achievements posted yet.</CardContent></Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map(item => {
              const imgUrl = getImageUrl(item.image_url);
              return (
                <Card key={item.id} className="group overflow-hidden">
                  {imgUrl && (
                    <div className="aspect-video overflow-hidden bg-muted">
                      <img src={imgUrl} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    </div>
                  )}
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">{item.category}</Badge>
                          {!item.is_active && <Badge variant="destructive" className="text-xs">Hidden</Badge>}
                        </div>
                        <CardTitle className="text-base">{item.title}</CardTitle>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(item)}><Pencil className="h-3 w-3" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(item)}><Trash2 className="h-3 w-3" /></Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {item.description && <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>}
                    <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                      {item.student_name && <span>{item.student_name}</span>}
                      <span>{new Date(item.achievement_date).toLocaleDateString()}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? 'Edit Achievement' : 'Post Achievement'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Title *</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Date</Label><Input type="date" value={form.achievement_date} onChange={e => setForm(f => ({ ...f, achievement_date: e.target.value }))} /></div>
            </div>
            <div><Label>Student Name (optional)</Label><Input value={form.student_name} onChange={e => setForm(f => ({ ...f, student_name: e.target.value }))} /></div>
            <div>
              <Label>Image</Label>
              <div className="mt-1">
                {imagePreview ? (
                  <div className="relative rounded-lg overflow-hidden aspect-video bg-muted">
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    <Button variant="secondary" size="sm" className="absolute bottom-2 right-2" onClick={() => { setImageFile(null); setImagePreview(null); }}>Remove</Button>
                  </div>
                ) : (
                  <button onClick={() => fileRef.current?.click()} className="w-full border-2 border-dashed border-border rounded-lg p-8 flex flex-col items-center gap-2 text-muted-foreground hover:border-primary/50 transition-colors">
                    <ImageIcon className="h-8 w-8" />
                    <span className="text-sm">Click to upload image</span>
                  </button>
                )}
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
              <Label>Show on front page</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}{editing ? 'Update' : 'Post'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
