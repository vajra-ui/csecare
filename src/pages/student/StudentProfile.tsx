import { useState, useEffect } from 'react';
import { User, Loader2 } from 'lucide-react';
import { StudentLayout } from '@/components/layouts/StudentLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export default function StudentProfile() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [studentData, setStudentData] = useState<any>(null);
  const [attendancePercentage, setAttendancePercentage] = useState<number | null>(null);

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
        const { data: att } = await supabase.rpc('get_attendance_percentage', { _student_id: data.id });
        if (att !== null) setAttendancePercentage(Number(att));
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
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
