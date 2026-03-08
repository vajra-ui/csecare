import { useState, useEffect, useRef } from 'react';
import { User, Loader2, Camera, Save } from 'lucide-react';
import { StudentLayout } from '@/components/layouts/StudentLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ChangePasswordCard } from '@/components/ChangePasswordCard';

export default function StudentProfile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [studentData, setStudentData] = useState<any>(null);
  const [attendancePercentage, setAttendancePercentage] = useState<number | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const { data } = await supabase
        .from('students')
        .select('*')
        .eq('user_id', authUser.id)
        .single();

      if (data) {
        setStudentData(data);
        if ((data as any).profile_photo_url) {
          setPhotoUrl((data as any).profile_photo_url);
        }
        const { data: att } = await supabase.rpc('get_attendance_percentage', { _student_id: data.id });
        if (att !== null) setAttendancePercentage(Number(att));
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
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
        .from('student-photos')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('student-photos')
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl + `?t=${Date.now()}`;

      await supabase
        .from('students')
        .update({ profile_photo_url: publicUrl } as any)
        .eq('user_id', authUser.id);

      setPhotoUrl(publicUrl);
      toast({ title: 'Photo updated', description: 'Your profile photo has been uploaded.' });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
    } finally {
      setUploading(false);
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
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold flex items-center gap-2">
            <User className="h-7 w-7 text-primary" />
            My Profile
          </h1>
          <p className="text-muted-foreground text-sm">Your personal and academic information</p>
        </div>

        {/* Profile Photo */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Profile Photo</CardTitle>
            <CardDescription>Upload your passport-size photo</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-6">
            <div className="relative group">
              <Avatar className="h-24 w-24 border-2 border-border">
                {photoUrl ? (
                  <AvatarImage src={photoUrl} alt={studentData?.name} />
                ) : null}
                <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                  {studentData?.name?.charAt(0) || 'S'}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                {uploading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-white" />
                ) : (
                  <Camera className="h-6 w-6 text-white" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
              />
            </div>
            <div>
              <p className="font-medium">{studentData?.name}</p>
              <p className="text-sm text-muted-foreground">{studentData?.roll_number}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Camera className="h-4 w-4 mr-2" />}
                {photoUrl ? 'Change Photo' : 'Upload Photo'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Personal Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Personal Information</CardTitle>
            <CardDescription>Your details as registered by the admin</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="text-muted-foreground text-xs">Name</Label>
              <p className="font-medium">{studentData?.name}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Roll Number</Label>
              <p className="font-mono font-medium">{studentData?.roll_number}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Register Number</Label>
              <p className="font-mono font-medium">{studentData?.register_number}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Date of Birth</Label>
              <p className="font-medium">{studentData?.dob ? new Date(studentData.dob).toLocaleDateString() : '-'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Section</Label>
              <Badge variant="outline">{studentData?.section}</Badge>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Year</Label>
              <Badge variant="secondary">{studentData?.year}</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Academic Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Academic Summary</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="text-muted-foreground text-xs">Overall Attendance</Label>
              <p className="text-2xl font-bold">
                {attendancePercentage !== null ? `${attendancePercentage}%` : 'N/A'}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Email</Label>
              <p className="font-medium text-sm">{user?.email || '-'}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </StudentLayout>
  );
}
