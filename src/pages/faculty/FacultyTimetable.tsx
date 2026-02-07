import { useState, useEffect } from 'react';
import { Calendar, Loader2 } from 'lucide-react';
import { FacultyLayout } from '@/components/layouts/FacultyLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

interface TimetableEntry {
  id: string;
  day_of_week: number;
  hour_number: number;
  subject: string;
  section: string;
}

const dayNames = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const hours = [1, 2, 3, 4, 5, 6, 7, 8];

export default function FacultyTimetable() {
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTimetable();
  }, []);

  const fetchTimetable = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: faculty } = await supabase
        .from('faculty')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (faculty) {
        const { data, error } = await supabase
          .from('timetable')
          .select('*')
          .eq('faculty_id', faculty.id)
          .order('day_of_week')
          .order('hour_number');

        if (error) throw error;
        setEntries(data || []);
      }
    } catch (error) {
      console.error('Error fetching timetable:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEntry = (day: number, hour: number) => {
    return entries.find(e => e.day_of_week === day && e.hour_number === hour);
  };

  return (
    <FacultyLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold flex items-center gap-2">
            <Calendar className="h-8 w-8 text-primary" />
            Timetable
          </h1>
          <p className="text-muted-foreground">
            Your weekly class schedule
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Weekly Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : entries.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No timetable entries found. The admin will configure your schedule.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="border p-2 bg-muted text-sm font-medium">Day / Hour</th>
                      {hours.map(h => (
                        <th key={h} className="border p-2 bg-muted text-sm font-medium">
                          Hour {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[1, 2, 3, 4, 5, 6].map(day => (
                      <tr key={day}>
                        <td className="border p-2 font-medium text-sm bg-muted/50">
                          {dayNames[day]}
                        </td>
                        {hours.map(hour => {
                          const entry = getEntry(day, hour);
                          return (
                            <td key={hour} className="border p-2 text-center">
                              {entry ? (
                                <div className="space-y-1">
                                  <p className="text-sm font-medium">{entry.subject}</p>
                                  <Badge variant="outline" className="text-xs">
                                    {entry.section}
                                  </Badge>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">-</span>
                              )}
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
    </FacultyLayout>
  );
}
