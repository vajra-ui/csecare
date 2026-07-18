import { useState, useEffect, useRef } from 'react';
import { User, Save, Loader2, Camera, Phone, Mail, MapPin, Linkedin, Plus, X, GraduationCap, Briefcase } from 'lucide-react';
import { z } from 'zod';
import { FacultyLayout } from '@/components/layouts/FacultyLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { ChangePasswordCard } from '@/components/ChangePasswordCard';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const facultySchema = z.object({
  phone: z.string().trim().max(20).regex(/^[0-9+\-\s()]*$/, 'Invalid phone').or(z.literal('')),
  personal_email: z.string().trim().max(255).email('Invalid email').or(z.literal('')),
  address: z.string().trim().max(500).or(z.literal('')),
  qualification: z.string().trim().max(150).or(z.literal('')),
  years_of_experience: z.number().int().min(0).max(80),
  specialization: z.string().trim().max(150).or(z.literal('')),
  bio: z.string().trim().max(500).or(z.literal('')),
  linkedin_url: z.string().trim().max(255).url('Invalid URL').or(z.literal('')),
});

export default function FacultyProfile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [facultyData, setFacultyData] = useState<any>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [form, setForm] = useState({
    phone: '', personal_email: '', address: '',
    qualification: '', years_of_experience: 0,
    specialization: '', bio: '', linkedin_url: '',
  });
  const [subjects, setSubjects] = useState<string[]>([]);
  const [research, setResearch] = useState<string[]>([]);
  const [subjectInput, setSubjectInput] = useState('');
  const [researchInput, setResearchInput] = useState('');

  useEffect(() => { fetchProfile(); }, [user]);

  const fetchProfile = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;
      const { data } = await supabase.from('faculty').select('*').eq('user_id', authUser.id).single();
      if (data) {
        const d = data as any;
        setFacultyData(d);
        setForm({
          phone: d.phone || '',
          personal_email: d.personal_email || '',
          address: d.address || '',
          qualification: d.qualification || '',
          years_of_experience: d.years_of_experience || 0,
          specialization: d.specialization || '',
          bio: d.bio || '',
          linkedin_url: d.linkedin_url || '',
        });
        setSubjects(d.current_subjects || []);
        setResearch(d.research_interests || []);
        if (d.profile_photo_url) {
          // Sign the storage URL (private bucket)
          try {
            const path = d.profile_photo_url;
            const { data: signed } = await supabase.storage.from('faculty-photos').createSignedUrl(path, 60 * 60);
            if (signed?.signedUrl) setPhotoUrl(signed.signedUrl);
          } catch {/* ignore */}
        }
      }
    } catch (err) {
      console.error('Fetch profile error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid file', description: 'Please select an image file.', variant: 'destructive' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Photo must be under 5MB.', variant: 'destructive' });
      return;
    }
    setUploading(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;
      const ext = file.name.split('.').pop();
      const filePath = `${authUser.id}/profile.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('faculty-photos').upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      await supabase.from('faculty').update({ profile_photo_url: filePath } as any).eq('user_id', authUser.id);
      const { data: signed } = await supabase.storage.from('faculty-photos').createSignedUrl(filePath, 60 * 60);
      if (signed?.signedUrl) setPhotoUrl(signed.signedUrl);
      toast({ title: 'Photo updated', description: 'Profile photo uploaded successfully.' });
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const addTag = (list: string[], setList: (v: string[]) => void, value: string, setInput: (v: string) => void) => {
    const trimmed = value.trim();
    if (!trimmed || list.includes(trimmed) || list.length >= 20 || trimmed.length > 60) return;
    setList([...list, trimmed]);
    setInput('');
  };

  const removeTag = (list: string[], setList: (v: string[]) => void, idx: number) => {
    setList(list.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    const parsed = facultySchema.safeParse(form);
    if (!parsed.success) {
      const first = Object.values(parsed.error.flatten().fieldErrors)[0]?.[0];
      toast({ title: 'Validation error', description: first || 'Check your inputs', variant: 'destructive' });
      return;
    }
    if (!facultyData) return;
    setSaving(true);
    try {
      const payload: any = {
        phone: form.phone || null,
        personal_email: form.personal_email || null,
        address: form.address || null,
        qualification: form.qualification || null,
        years_of_experience: form.years_of_experience,
        specialization: form.specialization || null,
        bio: form.bio || null,
        linkedin_url: form.linkedin_url || null,
        current_subjects: subjects.length ? subjects : null,
        research_interests: research.length ? research : null,
      };
      const { error } = await supabase.from('faculty').update(payload).eq('id', facultyData.id);
      if (error) throw error;
      toast({ title: 'Profile saved', description: 'Your profile has been updated.' });
      fetchProfile();
    } catch (err: any) {
      toast({ title: 'Save failed', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
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
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold flex items-center gap-2">
            <User className="h-7 w-7 text-primary" />
            My Profile
          </h1>
          <p className="text-muted-foreground text-sm">Keep your teaching and contact details up to date</p>
        </div>

        {/* Photo + identity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Profile Photo</CardTitle>
            <CardDescription>Upload a professional headshot (max 5MB)</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <div className="relative group shrink-0">
              <Avatar className="h-28 w-28 border-2 border-primary/30">
                {photoUrl ? <AvatarImage src={photoUrl} alt={facultyData?.name} /> : null}
                <AvatarFallback className="text-3xl bg-primary/10 text-primary">
                  {facultyData?.name?.charAt(0) || 'F'}
                </AvatarFallback>
              </Avatar>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                {uploading ? <Loader2 className="h-6 w-6 animate-spin text-white" /> : <Camera className="h-6 w-6 text-white" />}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            </div>
            <div className="text-center sm:text-left flex-1">
              <p className="text-xl font-semibold">{facultyData?.name}</p>
              <p className="text-sm text-muted-foreground font-mono">{facultyData?.faculty_id}</p>
              <div className="flex flex-wrap gap-2 mt-2 justify-center sm:justify-start">
                <Badge variant={facultyData?.is_tutor ? 'default' : 'secondary'}>
                  {facultyData?.is_tutor ? 'Tutor' : 'Faculty'}
                </Badge>
                {(facultyData?.sections || (facultyData?.section ? [facultyData.section] : [])).map((s: string) => (
                  <Badge key={s} variant="outline">Section {s}</Badge>
                ))}
              </div>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Camera className="h-4 w-4 mr-2" />}
                {photoUrl ? 'Change Photo' : 'Upload Photo'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Locked info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><GraduationCap className="h-5 w-5" /> Department Details</CardTitle>
            <CardDescription>Managed by the admin — contact admin to correct</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            <div><Label className="text-muted-foreground text-xs">Name</Label><p className="font-medium">{facultyData?.name}</p></div>
            <div><Label className="text-muted-foreground text-xs">Faculty ID</Label><p className="font-mono font-medium">{facultyData?.faculty_id}</p></div>
            <div><Label className="text-muted-foreground text-xs">College Email</Label><p className="font-medium text-sm break-all">{user?.email || '-'}</p></div>
            <div><Label className="text-muted-foreground text-xs">Date of Birth</Label><p className="font-medium">{facultyData?.dob ? new Date(facultyData.dob).toLocaleDateString() : '-'}</p></div>
          </CardContent>
        </Card>

        {/* Contact */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="phone" className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> Phone</Label>
              <Input id="phone" value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+91 98765 43210" maxLength={20} />
            </div>
            <div>
              <Label htmlFor="personal_email" className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> Personal Email</Label>
              <Input id="personal_email" type="email" value={form.personal_email} onChange={(e) => setForm(f => ({ ...f, personal_email: e.target.value }))} placeholder="you@gmail.com" maxLength={255} />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="address" className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> Address</Label>
              <Textarea id="address" value={form.address} onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))} maxLength={500} rows={2} />
            </div>
          </CardContent>
        </Card>

        {/* Professional */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><Briefcase className="h-5 w-5" /> Professional Details</CardTitle>
            <CardDescription>Shown on the department faculty page</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="qualification">Qualification</Label>
                <Input id="qualification" value={form.qualification} onChange={(e) => setForm(f => ({ ...f, qualification: e.target.value }))} placeholder="Ph.D, M.Tech, etc." maxLength={150} />
              </div>
              <div>
                <Label htmlFor="experience">Years of Experience</Label>
                <Input id="experience" type="number" min={0} max={80} value={form.years_of_experience}
                  onChange={(e) => setForm(f => ({ ...f, years_of_experience: parseInt(e.target.value) || 0 }))} />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="specialization">Specialization</Label>
                <Input id="specialization" value={form.specialization} onChange={(e) => setForm(f => ({ ...f, specialization: e.target.value }))} placeholder="e.g. Artificial Intelligence, Networks" maxLength={150} />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="bio">Short Bio</Label>
                <Textarea id="bio" value={form.bio} onChange={(e) => setForm(f => ({ ...f, bio: e.target.value }))} maxLength={500} rows={3} />
                <p className="text-xs text-muted-foreground mt-1">{form.bio.length}/500</p>
              </div>
            </div>

            <div>
              <Label>Subjects You Teach</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={subjectInput}
                  onChange={(e) => setSubjectInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(subjects, setSubjects, subjectInput, setSubjectInput); } }}
                  placeholder="e.g. Data Structures"
                  maxLength={60}
                />
                <Button type="button" variant="outline" size="icon" onClick={() => addTag(subjects, setSubjects, subjectInput, setSubjectInput)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {subjects.map((s, i) => (
                  <Badge key={s} variant="secondary" className="pl-2 pr-1 py-1 gap-1">
                    {s}
                    <button type="button" onClick={() => removeTag(subjects, setSubjects, i)} className="hover:bg-destructive/20 rounded p-0.5"><X className="h-3 w-3" /></button>
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <Label>Research Interests</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={researchInput}
                  onChange={(e) => setResearchInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(research, setResearch, researchInput, setResearchInput); } }}
                  placeholder="e.g. Deep Learning, Computer Vision"
                  maxLength={60}
                />
                <Button type="button" variant="outline" size="icon" onClick={() => addTag(research, setResearch, researchInput, setResearchInput)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {research.map((s, i) => (
                  <Badge key={s} variant="outline" className="pl-2 pr-1 py-1 gap-1">
                    {s}
                    <button type="button" onClick={() => removeTag(research, setResearch, i)} className="hover:bg-destructive/20 rounded p-0.5"><X className="h-3 w-3" /></button>
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Links */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Professional Links</CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <Label htmlFor="linkedin" className="flex items-center gap-1"><Linkedin className="h-3.5 w-3.5" /> LinkedIn</Label>
              <Input id="linkedin" value={form.linkedin_url} onChange={(e) => setForm(f => ({ ...f, linkedin_url: e.target.value }))} placeholder="https://linkedin.com/in/…" />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end sticky bottom-4 z-10">
          <Button onClick={handleSave} disabled={saving} size="lg" className="shadow-lg">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save Profile
          </Button>
        </div>

        <ChangePasswordCard />
      </div>
    </FacultyLayout>
  );
}
