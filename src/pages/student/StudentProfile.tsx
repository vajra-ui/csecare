import { useState, useEffect, useRef } from 'react';
import { User, Loader2, Camera, Save, X, Plus, Phone, Mail, MapPin, Heart, Linkedin, Github, GraduationCap } from 'lucide-react';
import { z } from 'zod';
import { StudentLayout } from '@/components/layouts/StudentLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ChangePasswordCard } from '@/components/ChangePasswordCard';

const profileSchema = z.object({
  phone: z.string().trim().max(20).regex(/^[0-9+\-\s()]*$/, 'Invalid phone').or(z.literal('')),
  personal_email: z.string().trim().max(255).email('Invalid email').or(z.literal('')),
  address: z.string().trim().max(500).or(z.literal('')),
  blood_group: z.string().max(5).or(z.literal('')),
  parent_name: z.string().trim().max(120).or(z.literal('')),
  parent_phone: z.string().trim().max(20).regex(/^[0-9+\-\s()]*$/, 'Invalid phone').or(z.literal('')),
  bio: z.string().trim().max(500).or(z.literal('')),
  linkedin_url: z.string().trim().max(255).url('Invalid URL').or(z.literal('')),
  github_url: z.string().trim().max(255).url('Invalid URL').or(z.literal('')),
});

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export default function StudentProfile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [studentData, setStudentData] = useState<any>(null);
  const [attendancePercentage, setAttendancePercentage] = useState<number | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [form, setForm] = useState({
    phone: '', personal_email: '', address: '', blood_group: '',
    parent_name: '', parent_phone: '', bio: '',
    linkedin_url: '', github_url: '',
  });
  const [skills, setSkills] = useState<string[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [interestInput, setInterestInput] = useState('');

  useEffect(() => { fetchProfile(); }, [user]);

  const fetchProfile = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;
      const { data } = await supabase.from('students').select('*').eq('user_id', authUser.id).single();
      if (data) {
        const d = data as any;
        setStudentData(d);
        if (d.profile_photo_url) setPhotoUrl(d.profile_photo_url);
        setForm({
          phone: d.phone || '',
          personal_email: d.personal_email || '',
          address: d.address || '',
          blood_group: d.blood_group || '',
          parent_name: d.parent_name || '',
          parent_phone: d.parent_phone || '',
          bio: d.bio || '',
          linkedin_url: d.linkedin_url || '',
          github_url: d.github_url || '',
        });
        setSkills(d.skills || []);
        setInterests(d.interests || []);
        const { data: att } = await supabase.rpc('get_attendance_percentage', { _student_id: d.id });
        if (att !== null) setAttendancePercentage(Number(att));
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
        .from('student-photos').upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('student-photos').getPublicUrl(filePath);
      const publicUrl = urlData.publicUrl + `?t=${Date.now()}`;
      await supabase.from('students').update({ profile_photo_url: publicUrl } as any).eq('user_id', authUser.id);
      setPhotoUrl(publicUrl);
      toast({ title: 'Photo updated', description: 'Profile photo uploaded successfully.' });
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const addTag = (list: string[], setList: (v: string[]) => void, value: string, setInput: (v: string) => void) => {
    const trimmed = value.trim();
    if (!trimmed || list.includes(trimmed) || list.length >= 20 || trimmed.length > 40) return;
    setList([...list, trimmed]);
    setInput('');
  };

  const removeTag = (list: string[], setList: (v: string[]) => void, idx: number) => {
    setList(list.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    const parsed = profileSchema.safeParse(form);
    if (!parsed.success) {
      const first = Object.values(parsed.error.flatten().fieldErrors)[0]?.[0];
      toast({ title: 'Validation error', description: first || 'Check your inputs', variant: 'destructive' });
      return;
    }
    if (!studentData) return;
    setSaving(true);
    try {
      const payload: any = {
        phone: form.phone || null,
        personal_email: form.personal_email || null,
        address: form.address || null,
        blood_group: form.blood_group || null,
        parent_name: form.parent_name || null,
        parent_phone: form.parent_phone || null,
        bio: form.bio || null,
        linkedin_url: form.linkedin_url || null,
        github_url: form.github_url || null,
        skills: skills.length ? skills : null,
        interests: interests.length ? interests : null,
      };
      const { error } = await supabase.from('students').update(payload).eq('id', studentData.id);
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
      <StudentLayout>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold flex items-center gap-2">
            <User className="h-7 w-7 text-primary" />
            My Profile
          </h1>
          <p className="text-muted-foreground text-sm">Keep your personal and academic details up to date</p>
        </div>

        {/* Photo + identity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Profile Photo</CardTitle>
            <CardDescription>Upload a clear passport-size photo (max 5MB)</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <div className="relative group shrink-0">
              <Avatar className="h-28 w-28 border-2 border-primary/30">
                {photoUrl ? <AvatarImage src={photoUrl} alt={studentData?.name} /> : null}
                <AvatarFallback className="text-3xl bg-primary/10 text-primary">
                  {studentData?.name?.charAt(0) || 'S'}
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
              <p className="text-xl font-semibold">{studentData?.name}</p>
              <p className="text-sm text-muted-foreground font-mono">{studentData?.roll_number}</p>
              <div className="flex flex-wrap gap-2 mt-2 justify-center sm:justify-start">
                <Badge variant="outline">{studentData?.section}</Badge>
                <Badge variant="secondary">{studentData?.year}</Badge>
                {attendancePercentage !== null && (
                  <Badge variant={attendancePercentage >= 75 ? 'default' : 'destructive'}>
                    {attendancePercentage}% Attendance
                  </Badge>
                )}
              </div>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Camera className="h-4 w-4 mr-2" />}
                {photoUrl ? 'Change Photo' : 'Upload Photo'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Locked academic info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><GraduationCap className="h-5 w-5" /> Academic Details</CardTitle>
            <CardDescription>Managed by the department — contact admin to correct</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            <div><Label className="text-muted-foreground text-xs">Register Number</Label><p className="font-mono font-medium">{studentData?.register_number}</p></div>
            <div><Label className="text-muted-foreground text-xs">Date of Birth</Label><p className="font-medium">{studentData?.dob ? new Date(studentData.dob).toLocaleDateString() : '-'}</p></div>
            <div><Label className="text-muted-foreground text-xs">College Email</Label><p className="font-medium text-sm break-all">{user?.email || '-'}</p></div>
          </CardContent>
        </Card>

        {/* Editable contact */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Contact Information</CardTitle>
            <CardDescription>How we can reach you</CardDescription>
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
              <Textarea id="address" value={form.address} onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))} placeholder="House / Street / City / State / PIN" maxLength={500} rows={2} />
            </div>
            <div>
              <Label className="flex items-center gap-1"><Heart className="h-3.5 w-3.5" /> Blood Group</Label>
              <Select value={form.blood_group} onValueChange={(v) => setForm(f => ({ ...f, blood_group: v }))}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{BLOOD_GROUPS.map(bg => <SelectItem key={bg} value={bg}>{bg}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Parent/Guardian */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Parent / Guardian</CardTitle>
            <CardDescription>Used for emergency contact and communication</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="parent_name">Parent Name</Label>
              <Input id="parent_name" value={form.parent_name} onChange={(e) => setForm(f => ({ ...f, parent_name: e.target.value }))} maxLength={120} />
            </div>
            <div>
              <Label htmlFor="parent_phone">Parent Phone</Label>
              <Input id="parent_phone" value={form.parent_phone} onChange={(e) => setForm(f => ({ ...f, parent_phone: e.target.value }))} maxLength={20} placeholder="+91 …" />
            </div>
          </CardContent>
        </Card>

        {/* About + tags */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">About You</CardTitle>
            <CardDescription>Tell the department who you are and what you love building</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="bio">Short Bio</Label>
              <Textarea id="bio" value={form.bio} onChange={(e) => setForm(f => ({ ...f, bio: e.target.value }))} placeholder="A line or two about yourself…" maxLength={500} rows={3} />
              <p className="text-xs text-muted-foreground mt-1">{form.bio.length}/500</p>
            </div>

            <div>
              <Label>Skills</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(skills, setSkills, skillInput, setSkillInput); } }}
                  placeholder="e.g. React, Python, Machine Learning"
                  maxLength={40}
                />
                <Button type="button" variant="outline" size="icon" onClick={() => addTag(skills, setSkills, skillInput, setSkillInput)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {skills.map((s, i) => (
                  <Badge key={s} variant="secondary" className="pl-2 pr-1 py-1 gap-1">
                    {s}
                    <button type="button" onClick={() => removeTag(skills, setSkills, i)} className="hover:bg-destructive/20 rounded p-0.5"><X className="h-3 w-3" /></button>
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <Label>Interests</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={interestInput}
                  onChange={(e) => setInterestInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(interests, setInterests, interestInput, setInterestInput); } }}
                  placeholder="e.g. Robotics, Cricket, UI Design"
                  maxLength={40}
                />
                <Button type="button" variant="outline" size="icon" onClick={() => addTag(interests, setInterests, interestInput, setInterestInput)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {interests.map((s, i) => (
                  <Badge key={s} variant="outline" className="pl-2 pr-1 py-1 gap-1">
                    {s}
                    <button type="button" onClick={() => removeTag(interests, setInterests, i)} className="hover:bg-destructive/20 rounded p-0.5"><X className="h-3 w-3" /></button>
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
            <CardDescription>Optional — shown on your digital portfolio</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="linkedin" className="flex items-center gap-1"><Linkedin className="h-3.5 w-3.5" /> LinkedIn</Label>
              <Input id="linkedin" value={form.linkedin_url} onChange={(e) => setForm(f => ({ ...f, linkedin_url: e.target.value }))} placeholder="https://linkedin.com/in/…" />
            </div>
            <div>
              <Label htmlFor="github" className="flex items-center gap-1"><Github className="h-3.5 w-3.5" /> GitHub</Label>
              <Input id="github" value={form.github_url} onChange={(e) => setForm(f => ({ ...f, github_url: e.target.value }))} placeholder="https://github.com/…" />
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
    </StudentLayout>
  );
}
