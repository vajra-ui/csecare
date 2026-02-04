import { useEffect, useState } from 'react';
import { User, BookOpen, TrendingUp, Calendar, Cake } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { StudentLayout } from '@/components/layouts/StudentLayout';
import { AnnouncementPanel } from '@/components/AnnouncementPanel';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { isBirthday } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';

export default function StudentDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [studentData, setStudentData] = useState<any>(null);
  const [attendancePercentage, setAttendancePercentage] = useState<number | null>(null);

  useEffect(() => {
    if (user?.studentId) {
      fetchStudentData();
    }
  }, [user]);

  const fetchStudentData = async () => {
    try {
      const { data } = await supabase
        .from('students')
        .select('*')
        .eq('id', user?.studentId)
        .single();

      if (data) {
        setStudentData(data);
        
        // Check for birthday
        if (isBirthday(data.dob)) {
          toast({
            title: '🎂 Happy Birthday!',
            description: `Wishing you a wonderful birthday, ${data.name}!`,
          });
        }

        // Fetch attendance percentage
        const { data: attendanceData } = await supabase.rpc('get_attendance_percentage', {
          _student_id: data.id,
        });
        if (attendanceData !== null) {
          setAttendancePercentage(attendanceData);
        }
      }
    } catch (error) {
      console.error('Error fetching student data:', error);
    }
  };

  return (
    <StudentLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold">
              Welcome, {user?.name}!
            </h1>
            <p className="text-muted-foreground">
              CSE Department • {studentData?.section || '-'} • Year {studentData?.year || '-'}
            </p>
          </div>
          {studentData?.dob && isBirthday(studentData.dob) && (
            <Badge variant="secondary" className="gap-1 bg-warning/20 text-warning-foreground">
              <Cake className="h-4 w-4" />
              Happy Birthday! 🎉
            </Badge>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {/* Student Info Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-info" />
                  Personal Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Name</p>
                    <p className="font-medium">{studentData?.name || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Roll Number</p>
                    <p className="font-medium">{studentData?.roll_number || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Register Number</p>
                    <p className="font-medium">{studentData?.register_number || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Section</p>
                    <p className="font-medium">{studentData?.section || '-'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <div className="grid gap-4 sm:grid-cols-2">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Attendance
                  </CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold">
                        {attendancePercentage !== null ? `${attendancePercentage}%` : '-'}
                      </span>
                    </div>
                    {attendancePercentage !== null && (
                      <Progress
                        value={attendancePercentage}
                        className="h-2"
                      />
                    )}
                    <p className="text-xs text-muted-foreground">Overall attendance</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Current CGPA
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">-</div>
                  <p className="text-xs text-muted-foreground">Check progress for details</p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Links */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors">
                    <p className="font-medium text-sm">Upload Assignment</p>
                    <p className="text-xs text-muted-foreground">Submit your work</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors">
                    <p className="font-medium text-sm">View Progress</p>
                    <p className="text-xs text-muted-foreground">Check CGPA & scores</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors">
                    <p className="font-medium text-sm">Submit OD Request</p>
                    <p className="text-xs text-muted-foreground">On Duty application</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors">
                    <p className="font-medium text-sm">View Attendance</p>
                    <p className="text-xs text-muted-foreground">Check your records</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <AnnouncementPanel />
          </div>
        </div>
      </div>
    </StudentLayout>
  );
}
