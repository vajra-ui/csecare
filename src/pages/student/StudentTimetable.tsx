import { useState, useEffect } from 'react';
import { Calendar, Loader2, Clock } from 'lucide-react';
import { StudentLayout } from '@/components/layouts/StudentLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface TimetableEntry {
  id: string;
  day_of_week: number;
  hour_number: number;
  subject: string;
  section: string;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const HOURS = [1, 2, 3, 4, 5, 6, 7, 8];

export default function StudentTimetable() {
  const { user } = useAuth();
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTimetable();
  }, [user]);

  const fetchTimetable = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const { data: student } = await supabase
        .from('students')
        .select('section')
        .eq('user_id', authUser.id)
        .single();

      if (student) {
        const { data } = await supabase
          .from('timetable')
          .select('*')
          .eq('section', student.section as any)
          .order('day_of_week')
          .order('hour_number');

        setTimetable(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const today = new Date().getDay(); // 0=Sun, 1=Mon
  const currentHour = new Date().getHours();
  const currentPeriod = currentHour >= 9 && currentHour < 17 ? Math.min(Math.floor((currentHour - 9) / 1), 7) + 1 : null;

  const getEntry = (day: number, hour: number) => {
    return timetable.find(t => t.day_of_week === day && t.hour_number === hour);
  };

  const isCurrentSlot = (dayIdx: number, hour: number) => {
    return (dayIdx + 1) === today && currentPeriod === hour;
  };

  // Find next class
  const getNextClass = () => {
    if (today === 0 || today > 6) return null;
    for (let h = (currentPeriod || 0) + 1; h <= 8; h++) {
      const entry = getEntry(today, h);
      if (entry) return { ...entry, label: `Period ${h} today` };
    }
    for (let d = today + 1; d <= 6; d++) {
      for (let h = 1; h <= 8; h++) {
        const entry = getEntry(d, h);
        if (entry) return { ...entry, label: `Period ${h} on ${DAYS[d - 1]}` };
      }
    }
    return null;
  };

  const nextClass = getNextClass();

  return (
    <StudentLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Calendar className="h-7 w-7 text-info" />
            My Timetable
          </h1>
          <p className="text-muted-foreground text-sm">Your weekly class schedule</p>
        </div>

        {/* Next Class Indicator */}
        {nextClass && (
          <Card className="border-info/30 bg-info/5">
            <CardContent className="py-4 flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-info/20 flex items-center justify-center">
                <Clock className="h-6 w-6 text-info" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Next Class</p>
                <p className="font-semibold text-lg">{nextClass.subject}</p>
                <p className="text-xs text-muted-foreground">{nextClass.label}</p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Weekly Schedule</CardTitle>
            <CardDescription>Periods 1-8 for each day</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : timetable.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No timetable available for your section yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr>
                      <th className="p-2 border bg-muted text-left font-medium">Day</th>
                      {HOURS.map(h => (
                        <th key={h} className="p-2 border bg-muted text-center font-medium min-w-[80px]">
                          Hr {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {DAYS.map((day, dayIdx) => (
                      <tr key={day} className={(dayIdx + 1) === today ? 'bg-info/5' : ''}>
                        <td className="p-2 border font-medium whitespace-nowrap">
                          {day}
                          {(dayIdx + 1) === today && (
                            <Badge variant="secondary" className="ml-2 text-xs">Today</Badge>
                          )}
                        </td>
                        {HOURS.map(h => {
                          const entry = getEntry(dayIdx + 1, h);
                          const isCurrent = isCurrentSlot(dayIdx, h);
                          return (
                            <td
                              key={h}
                              className={`p-2 border text-center text-xs ${
                                isCurrent ? 'bg-info/20 ring-2 ring-info font-bold' : ''
                              }`}
                            >
                              {entry?.subject || '-'}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </StudentLayout>
  );
}
