import { useState, useEffect } from 'react';
import { GraduationCap, Loader2, Plus, Pencil, Trash2, Search, MapPin, Building2, Users, ExternalLink } from 'lucide-react';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
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
  phone: string | null;
  profile_image_url: string | null;
  created_at: string;
}

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 20 }, (_, i) => currentYear - i);
const ITEMS_PER_PAGE = 12;

const emptyForm = { name: '', graduation_year: currentYear, company: '', role: '', location: '', linkedin: '', email: '', phone: '' };

const getInitials = (name: string) => {
  const parts = name.split(' ');
  return parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}`.toUpperCase() : name.slice(0, 2).toUpperCase();
};

const AVATAR_COLORS = [
  'from-blue-500 to-indigo-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
  'from-violet-500 to-purple-600',
  'from-cyan-500 to-sky-600',
];

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
  const [page, setPage] = useState(1);

  useEffect(() => { fetchAlumni(); }, []);

  const fetchAlumni = async () => {
    const { data } = await supabase.from('alumni').select('*').order('graduation_year', { ascending: false });
    setAlumni((data as any as Alumni[]) || []);
    setLoading(false);
  };

  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowDialog(true); };
  const openEdit = (a: Alumni) => {
    setEditing(a);
    setForm({ name: a.name, graduation_year: a.graduation_year, company: a.company || '', role: a.role || '', location: a.location || '', linkedin: a.linkedin || '', email: a.email || '', phone: (a as any).phone || '' });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.name) { toast({ title: 'Name required', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      const payload = { name: form.name, graduation_year: form.graduation_year, company: form.company || null, role: form.role || null, location: form.location || null, linkedin: form.linkedin || null, email: form.email || null, phone: form.phone || null };
      if (editing) {
        const { error } = await supabase.from('alumni').update(payload as any).eq('id', editing.id);
        if (error) throw error;
        toast({ title: 'Alumni updated' });
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
    const matchSearch = !search || a.name.toLowerCase().includes(search.toLowerCase()) || (a.company || '').toLowerCase().includes(search.toLowerCase()) || (a.role || '').toLowerCase().includes(search.toLowerCase());
    const matchYear = filterYear === 'all' || a.graduation_year === parseInt(filterYear);
    return matchSearch && matchYear;
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  useEffect(() => { setPage(1); }, [search, filterYear]);

  if (loading) return <AdminLayout><div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight">Alumni Network</h1>
              <p className="text-muted-foreground text-sm">{alumni.length} alumni • {[...new Set(alumni.map(a => a.company).filter(Boolean))].length} companies</p>
            </div>
          </div>
          <Button onClick={openCreate} className="shadow-md">
            <Plus className="h-4 w-4 mr-2" /> Add Alumni
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9 h-10" placeholder="Search by name, company, or role..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={filterYear} onValueChange={setFilterYear}>
            <SelectTrigger className="w-[150px] h-10"><SelectValue placeholder="Filter year" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Batches</SelectItem>
              {YEARS.map(y => <SelectItem key={y} value={String(y)}>Batch {y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Cards Grid */}
        {filtered.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <GraduationCap className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-lg mb-1">No alumni records found</h3>
              <p className="text-muted-foreground text-sm mb-4">Try adjusting your search or filter criteria</p>
              <Button variant="outline" onClick={openCreate}><Plus className="h-4 w-4 mr-2" /> Add First Alumni</Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {paginated.map((a, i) => {
                const colorClass = AVATAR_COLORS[i % AVATAR_COLORS.length];
                return (
                  <Card key={a.id} className="group relative overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 border-border/60 hover:border-primary/30">
                    {/* Subtle gradient accent at top */}
                    <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${colorClass} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                    
                    <CardContent className="p-5">
                      <div className="flex items-start gap-4">
                        {/* Avatar */}
                        <Avatar className="h-12 w-12 shadow-md ring-2 ring-background">
                          <AvatarFallback className={`bg-gradient-to-br ${colorClass} text-white font-semibold text-sm`}>
                            {getInitials(a.name)}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h3 className="font-semibold text-base truncate">{a.name}</h3>
                              <Badge variant="secondary" className="mt-1 text-[10px] font-medium px-2 py-0">
                                Batch {a.graduation_year}
                              </Badge>
                            </div>
                            <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 shrink-0">
                              <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-primary/10" onClick={() => openEdit(a)}>
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(a.id)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>

                          <div className="mt-3 space-y-1.5">
                            {a.role && a.company && (
                              <div className="flex items-center gap-2 text-sm">
                                <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                <span className="truncate"><span className="font-medium">{a.role}</span> <span className="text-muted-foreground">at</span> {a.company}</span>
                              </div>
                            )}
                            {!a.role && a.company && (
                              <div className="flex items-center gap-2 text-sm">
                                <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                <span className="truncate">{a.company}</span>
                              </div>
                            )}
                            {a.location && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <MapPin className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">{a.location}</span>
                              </div>
                            )}
                          </div>

                          {/* LinkedIn button */}
                          {a.linkedin && (
                            <div className="mt-3">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <a
                                    href={a.linkedin}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-[#0077B5]/10 text-[#0077B5] hover:bg-[#0077B5]/20 transition-colors"
                                  >
                                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                                    </svg>
                                    LinkedIn
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                </TooltipTrigger>
                                <TooltipContent>View LinkedIn Profile</TooltipContent>
                              </Tooltip>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground px-2">
                  Page {page} of {totalPages}
                </span>
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
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
            <div><Label>LinkedIn URL</Label><Input value={form.linkedin} onChange={e => setForm(f => ({ ...f, linkedin: e.target.value }))} placeholder="https://linkedin.com/in/..." /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
              <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}{editing ? 'Update' : 'Add Alumni'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
