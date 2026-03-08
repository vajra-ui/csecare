import { useState, useEffect } from 'react';
import { User, Save, Loader2 } from 'lucide-react';
import { FacultyLayout } from '@/components/layouts/FacultyLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { ChangePasswordCard } from '@/components/ChangePasswordCard';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export default function FacultyProfile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [facultyData, setFacultyData] = useState<any>(null);
  const [form, setForm] = useState({
    qualification: '',
    years_of_experience: 0,
    current_subjects: '',
  });

  useEffect(() => {
    fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const { data } = await supabase
        .from('faculty')
        .select('*')
        .eq('user_id', authUser.id)
        .single();

      if (data) {
        setFacultyData(data);
        setForm({
          qualification: data.qualification || '',
          years_of_experience: data.years_of_experience || 0,
          current_subjects: data.current_subjects?.join(', ') || '',
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!facultyData) return;
    setSaving(true);
    try {
      const subjects = form.current_subjects
        .split(',')
        .map(s => s.trim())
        .filter(s => s);

      const { error } = await supabase
        .from('faculty')
        .update({
          qualification: form.qualification || null,
          years_of_experience: form.years_of_experience,
          current_subjects: subjects.length > 0 ? subjects : null,
        })
        .eq('id', facultyData.id);

      if (error) throw error;

      toast({ title: 'Profile Updated', description: 'Your profile has been saved.' });
      fetchProfile();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update profile', variant: 'destructive' });
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
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold flex items-center gap-2">
            <User className="h-7 w-7 text-primary" />
            My Profile
          </h1>
          <p className="text-muted-foreground text-sm">View and update your profile information</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Basic Information</CardTitle>
            <CardDescription>These details are managed by the admin</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="text-muted-foreground text-xs">Name</Label>
              <p className="font-medium">{facultyData?.name}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Faculty ID</Label>
              <p className="font-mono font-medium">{facultyData?.faculty_id}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Section</Label>
              <p className="font-medium">{facultyData?.section || 'Not assigned'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Role</Label>
              <Badge variant={facultyData?.is_tutor ? 'default' : 'secondary'}>
                {facultyData?.is_tutor ? 'Tutor' : 'Faculty'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Editable Details</CardTitle>
            <CardDescription>You can update these details yourself</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="qualification">Qualification</Label>
              <Input
                id="qualification"
                value={form.qualification}
                onChange={(e) => setForm(f => ({ ...f, qualification: e.target.value }))}
                placeholder="Ph.D, M.Tech, etc."
              />
            </div>
            <div>
              <Label htmlFor="experience">Years of Experience</Label>
              <Input
                id="experience"
                type="number"
                min={0}
                value={form.years_of_experience}
                onChange={(e) => setForm(f => ({ ...f, years_of_experience: parseInt(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <Label htmlFor="subjects">Current Subjects</Label>
              <Textarea
                id="subjects"
                value={form.current_subjects}
                onChange={(e) => setForm(f => ({ ...f, current_subjects: e.target.value }))}
                placeholder="Data Structures, Algorithms, DBMS (comma-separated)"
              />
            </div>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Changes
            </Button>
          </CardContent>
        </Card>

        <ChangePasswordCard />
      </div>
    </FacultyLayout>
  );
}
