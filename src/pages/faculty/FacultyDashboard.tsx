import { useEffect, useState } from 'react';
import { Calendar, Clock, Users, Megaphone, Cake } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FacultyLayout } from '@/components/layouts/FacultyLayout';
import { AnnouncementPanel } from '@/components/AnnouncementPanel';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { isBirthday } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';

export default function FacultyDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [facultyData, setFacultyData] = useState<any>(null);

  useEffect(() => {
    if (user?.facultyId) {
      fetchFacultyData();
    }
  }, [user]);

  const fetchFacultyData = async () => {
    try {
      const { data } = await supabase
        .from('faculty')
        .select('*')
        .eq('faculty_id', user?.facultyId)
        .single();

      if (data) {
        setFacultyData(data);
        
        // Check for birthday
        if (isBirthday(data.dob)) {
          toast({
            title: '🎂 Happy Birthday!',
            description: `Wishing you a wonderful birthday, ${data.name}!`,
          });
        }
      }
    } catch (error) {
      console.error('Error fetching faculty data:', error);
    }
  };

  // Mock current time for class indicator
  const currentHour = new Date().getHours();
  const currentPeriod = currentHour >= 9 && currentHour < 17 ? Math.min(Math.floor((currentHour - 9) / 1), 7) + 1 : null;

  return (
    <FacultyLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold">
              Welcome, {user?.name}!
            </h1>
            <p className="text-muted-foreground">
              {user?.isTutor ? 'Tutor' : 'Faculty'} • {user?.facultyId}
            </p>
          </div>
          {facultyData?.dob && isBirthday(facultyData.dob) && (
            <Badge variant="secondary" className="gap-1 bg-warning/20 text-warning-foreground">
              <Cake className="h-4 w-4" />
              Happy Birthday! 🎉
            </Badge>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {/* Current Period */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Current Period
                </CardTitle>
              </CardHeader>
              <CardContent>
                {currentPeriod ? (
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-2xl gradient-primary flex items-center justify-center">
                      <span className="text-2xl font-bold text-white">{currentPeriod}</span>
                    </div>
                    <div>
                      <p className="font-medium">Period {currentPeriod}</p>
                      <p className="text-sm text-muted-foreground">
                        Check your timetable for class details
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">No active class period</p>
                )}
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <div className="grid gap-4 sm:grid-cols-2">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Today's Classes
                  </CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">-</div>
                  <p className="text-xs text-muted-foreground">View timetable for details</p>
                </CardContent>
              </Card>

              {user?.isTutor && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Assigned Students
                    </CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">-</div>
                    <p className="text-xs text-muted-foreground">In your section</p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Faculty Info */}
            {facultyData && (
              <Card>
                <CardHeader>
                  <CardTitle>Your Profile</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Qualification</p>
                      <p className="font-medium">{facultyData.qualification || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Experience</p>
                      <p className="font-medium">{facultyData.years_of_experience || 0} years</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Section</p>
                      <p className="font-medium">{facultyData.section || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Current Subjects</p>
                      <p className="font-medium">
                        {facultyData.current_subjects?.join(', ') || '-'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div>
            <AnnouncementPanel />
          </div>
        </div>
      </div>
    </FacultyLayout>
  );
}
